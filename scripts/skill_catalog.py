#!/usr/bin/env python3
"""Discover, validate, plan and package skill capsules. See docs/namespaces.md."""

import argparse
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import tarfile
import urllib.error
import urllib.request

import yaml


class CatalogError(ValueError):
    """An invalid catalog or an unusable publication range."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """Keep the upload credential bound to the configured registry endpoint."""

    def redirect_request(self, request, response, code, message, headers, new_url):
        return None


class UniqueLoader(yaml.SafeLoader):
    """Reject duplicate YAML keys rather than silently choosing an identity."""


def unique_mapping(loader, node):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node)
        if not isinstance(key, str) or key in result:
            raise CatalogError("Frontmatter keys must be unique strings")
        result[key] = loader.construct_object(value_node)
    return result


UniqueLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping
)
NAME = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
DOC_SUFFIXES = {".md", ".txt"}


def git(repo, *args):
    result = subprocess.run(["git", "-C", str(repo), *args], capture_output=True)
    if result.returncode:
        raise CatalogError(
            "git "
            + args[0]
            + " failed: "
            + result.stderr.decode(errors="replace").strip()
        )
    return result.stdout


def frontmatter(text, path):
    match = re.match(r"\A---\r?\n(.*?)\r?\n---(?:\r?\n|$)", text, re.S)
    if not match:
        raise CatalogError(f"{path}: missing or unclosed YAML frontmatter")
    try:
        data = yaml.load(match[1], Loader=UniqueLoader)
    except yaml.YAMLError as exc:
        raise CatalogError(f"{path}: invalid YAML: {exc}") from exc
    if not isinstance(data, dict):
        raise CatalogError(f"{path}: frontmatter must be a mapping")
    return data, match.end()


def roots_from_paths(paths):
    candidates = sorted(
        {str(PurePosixPath(p).parent) for p in paths if p.endswith("/SKILL.md")}
    )
    roots = []
    for candidate in candidates:
        parent = owner(candidate + "/SKILL.md", roots)
        if parent:
            # Existing bundled subskills belong to their parent capsule. A namespace
            # container, in contrast, has no SKILL.md of its own.
            relative = candidate[len(parent) + 1 :]
            if relative.startswith("subskills/"):
                continue
            raise CatalogError(
                f"Ambiguous skill roots: {parent} contains {candidate}; use a container without SKILL.md"
            )
        if candidate == "skills":
            raise CatalogError(
                "skills/SKILL.md cannot turn the whole catalog into one capsule"
            )
        roots.append(candidate)
    return roots


def owner(path, roots):
    return next((root for root in roots if path.startswith(root + "/")), None)


def working_paths(repo):
    # Include tracked resources and new, non-ignored files; never bundle local
    # node_modules, caches or secrets just because they exist in a contributor's tree.
    paths = git(
        repo,
        "ls-files",
        "-z",
        "--cached",
        "--others",
        "--exclude-standard",
        "--",
        "skills/",
    )
    result = []
    for path in sorted(set(paths.decode().split("\0")) - {""}):
        full = repo / path
        if any(
            (repo / p).is_symlink()
            for p in [PurePosixPath(path), *PurePosixPath(path).parents]
        ):
            raise CatalogError(f"{path}: symlinks are not supported in capsules")
        if full.is_file():
            result.append(path)
    return result


def skill_record(path, text, validate=True, content=True, bundled=False):
    data, _ = frontmatter(text, path + "/SKILL.md")
    parts = PurePosixPath(path).parts[1:]
    if bundled:
        parts = parts[-1:]
    namespace = "/".join(parts[:-1])
    name = data.get("name")
    metadata = data.get("metadata", {})
    if not isinstance(metadata, dict):
        raise CatalogError(f"{path}: metadata must be a mapping")
    if validate:
        if not isinstance(name, str) or not NAME.fullmatch(name) or len(name) > 64:
            raise CatalogError(
                f"{path}: name must be 1-64 lowercase alphanumeric/hyphen characters"
            )
        if name != parts[-1]:
            raise CatalogError(
                f"{path}: canonical name {name!r} must match the leaf folder"
            )
        for segment in parts[:-1]:
            if not NAME.fullmatch(segment) or len(segment) > 64:
                raise CatalogError(f"{path}: invalid namespace segment {segment!r}")
        if namespace and not name.startswith("-".join(parts[:-1]) + "-"):
            raise CatalogError(
                f"{path}: canonical name must include the namespace prefix"
            )
        if "namespace" in metadata and metadata["namespace"] != namespace:
            raise CatalogError(f"{path}: metadata.namespace must equal {namespace!r}")
        if namespace and "namespace" not in metadata and len(metadata) >= 20:
            raise CatalogError(
                f"{path}: reserve one of the 20 metadata pairs for namespace"
            )
    if validate and content:
        description = data.get("description")
        if (
            not isinstance(description, str)
            or not description.strip()
            or len(description) > 1024
        ):
            raise CatalogError(
                f"{path}: description must be a nonempty string of at most 1024 characters"
            )
        if "allowed-tools" in data and (
            not isinstance(data["allowed-tools"], str)
            or not data["allowed-tools"].strip()
        ):
            raise CatalogError(
                f"{path}: allowed-tools must be a nonempty string, not a list"
            )
    return {
        "source_path": path,
        "namespace": namespace or None,
        "canonical_name": name,
        "version": str(metadata["version"]) if "version" in metadata else None,
    }


def catalog(repo, content=True):
    paths = working_paths(repo)
    roots = roots_from_paths(paths)
    records = [
        skill_record(root, (repo / root / "SKILL.md").read_text(), content=content)
        for root in roots
    ]
    names = {}
    for record in records:
        name = record["canonical_name"]
        if name in names:
            raise CatalogError(
                f"Duplicate canonical name {name!r}: {names[name]} and {record['source_path']}"
            )
        names[name] = record["source_path"]
    for path in paths:
        if (
            not owner(path, roots)
            and PurePosixPath(path).suffix.lower() not in DOC_SUFFIXES
            and PurePosixPath(path).name != ".gitkeep"
        ):
            raise CatalogError(
                f"{path}: resource has no owning SKILL.md; namespace containers may only contain documentation"
            )
    return records


def plan(repo, base, head):
    # A zero/missing push base cannot safely mean 'publish everything'. Do not guess
    # HEAD~1: that silently misses earlier commits in a multi-commit push.
    for label, revision in (("base", base), ("head", head)):
        if not revision or set(revision) == {"0"}:
            raise CatalogError(
                f"Missing {label} SHA (including an initial push); supply an explicit available comparison commit"
            )
        git(repo, "rev-parse", "--verify", revision + "^{commit}")
    current = catalog(repo, content=False)
    old_paths = (
        git(repo, "ls-tree", "-r", "--name-only", "-z", base, "--", "skills/")
        .decode()
        .split("\0")
    )
    old_roots = roots_from_paths(old_paths)
    current_roots = [r["source_path"] for r in current]
    # --no-renames deliberately gives both sides of moves: map old resources using
    # the base tree and new resources using the working/head catalog.
    changed = (
        git(
            repo,
            "diff",
            "--no-renames",
            "--name-only",
            "-z",
            base,
            head,
            "--",
            "skills/",
        )
        .decode()
        .split("\0")
    )
    affected = set()
    previous = set()
    documentation = []
    for path in filter(None, changed):
        new_owner, old_owner = owner(path, current_roots), owner(path, old_roots)
        if new_owner:
            affected.add(new_owner)
        if old_owner:
            previous.add(old_owner)
            if old_owner in current_roots:
                affected.add(old_owner)
        if not new_owner and not old_owner:
            documentation.append(path)
    removed = []
    for root in sorted(previous - set(current_roots)):
        text = git(repo, "show", base + ":" + root + "/SKILL.md").decode()
        record = skill_record(root, text, validate=False)
        record["action"] = (
            "source-removed; registry retirement requires a separate explicit action"
        )
        removed.append(record)
    selected = [r for r in current if r["source_path"] in affected]
    for record in selected:
        skill_record(
            record["source_path"],
            (repo / record["source_path"] / "SKILL.md").read_text(),
        )
    return {
        "base": base,
        "head": head,
        "skills": selected,
        "removed": removed,
        "namespace_documents": sorted(documentation),
    }


def package(repo, record, output):
    # Resolve from a newly validated catalog; never trust an edited plan to choose a
    # filesystem path or to bundle a namespace directory (and all its siblings).
    output.mkdir(parents=True, exist_ok=True)
    name, source = record["canonical_name"], record["source_path"]
    target = output / (name + ".tar.gz")
    with tarfile.open(target, "w:gz") as archive:
        for path in working_paths(repo):
            if not path.startswith(source + "/"):
                continue
            relative = path[len(source) + 1 :]
            arcname = name + "/" + relative
            if relative == "SKILL.md" and record["namespace"]:
                text = (repo / path).read_text()
                data, end = frontmatter(text, path)
                data.setdefault("metadata", {})["namespace"] = record["namespace"]
                raw = (
                    "---\n"
                    + yaml.safe_dump(data, sort_keys=False, allow_unicode=True)
                    + "---\n"
                    + text[end:]
                ).encode()
                info = tarfile.TarInfo(arcname)
                info.size, info.mode = len(raw), 0o644
                archive.addfile(info, io.BytesIO(raw))
            else:
                archive.add(repo / path, arcname=arcname, recursive=False)
    return {**record, "archive": str(target), "cid": None, "status": "packaged"}


def save_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def publish(manifest, results_path):
    """Explicit upload only. Packaging and planning never need credentials/network."""
    if not manifest["skills"]:
        save_json(results_path, manifest)
        return manifest
    key, server = (
        os.environ.get("SKILLS_API_KEY"),
        os.environ.get("SKILLS_SERVER_URL", ""),
    )
    if not key or not server.startswith("https://"):
        raise CatalogError(
            "Publishing requires SKILLS_API_KEY and an HTTPS SKILLS_SERVER_URL"
        )
    save_json(results_path, manifest)
    for record in manifest["skills"]:
        request = urllib.request.Request(
            server.rstrip("/") + "/capsules",
            data=Path(record["archive"]).read_bytes(),
            headers={
                "Authorization": "Bearer " + key,
                "Content-Type": "application/gzip",
            },
            method="POST",
        )
        record["status"] = "upload-started"
        save_json(results_path, manifest)
        try:
            opener = urllib.request.build_opener(NoRedirect)
            with opener.open(request, timeout=120) as response:
                if response.status not in (200, 201):
                    raise CatalogError(f"Upload returned HTTP {response.status}")
                result = json.load(response)
            if not isinstance(result, dict):
                raise CatalogError("Upload response must contain a CID object")
            cid = result.get("cid")
            if not isinstance(cid, str) or not cid.strip():
                raise CatalogError(
                    "Upload accepted without a CID; check server before retrying"
                )
            record.update(cid=cid, status="published")
        except (urllib.error.URLError, ValueError, OSError) as exc:
            record["status"] = "failed-or-uncertain; inspect server before retrying"
            save_json(results_path, manifest)
            # Do not log server bodies, headers or authentication material.
            raise CatalogError(
                f"Upload failed for {record['canonical_name']}; inspect publication results before retrying"
            ) from exc
        save_json(results_path, manifest)
    return manifest


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    sub = parser.add_subparsers(dest="command", required=True)
    validate = sub.add_parser("validate")
    validate.add_argument(
        "--all-content",
        action="store_true",
        help="Also audit unchanged descriptions/tool fields",
    )
    single = sub.add_parser("validate-skill")
    single.add_argument("path", type=Path)
    changed = sub.add_parser("plan")
    changed.add_argument("--base", required=True)
    changed.add_argument("--head", default="HEAD")
    changed.add_argument("--output", required=True)
    pack = sub.add_parser("package")
    pack.add_argument("--plan", required=True)
    pack.add_argument("--output-dir", required=True, type=Path)
    pack.add_argument("--manifest", required=True)
    upload = sub.add_parser("publish")
    upload.add_argument("--manifest", required=True)
    upload.add_argument("--results", required=True)
    args = parser.parse_args(argv)
    repo = args.repo.resolve()
    try:
        if args.command == "validate":
            result = catalog(repo, content=args.all_content)
            print(f"Validated {len(result)} skills (including global name uniqueness)")
        elif args.command == "validate-skill":
            path = args.path.resolve()
            relative = (
                str(path.relative_to(repo)) if path.is_relative_to(repo) else str(path)
            )
            validation_path = "skills/" + path.name
            bundled = False
            if (repo / "skills").exists() and path.is_relative_to(repo / "skills"):
                validation_path = relative
                records = catalog(repo, content=False)
                parent = owner(
                    relative + "/SKILL.md", [r["source_path"] for r in records]
                )
                bundled = bool(
                    parent
                    and parent != relative
                    and relative[len(parent) + 1 :].startswith("subskills/")
                )
            record = skill_record(
                validation_path, (path / "SKILL.md").read_text(), bundled=bundled
            )
            print(f"Validated {relative}")
        elif args.command == "plan":
            head = git(repo, "rev-parse", args.head + "^{commit}").decode().strip()
            if head != git(repo, "rev-parse", "HEAD").decode().strip():
                raise CatalogError(
                    "Check out the requested head before planning publication"
                )
            result = plan(repo, args.base, head)
            save_json(args.output, result)
            print(json.dumps(result, indent=2))
        elif args.command == "package":
            result = json.loads(Path(args.plan).read_text())
            current = {r["source_path"]: r for r in catalog(repo, content=False)}
            for record in result["skills"]:
                if current.get(record["source_path"]) != record:
                    raise CatalogError(
                        "Plan no longer matches the catalog; regenerate it"
                    )
                skill_record(
                    record["source_path"],
                    (repo / record["source_path"] / "SKILL.md").read_text(),
                )
            result["skills"] = [
                package(repo, r, args.output_dir) for r in result["skills"]
            ]
            save_json(args.manifest, result)
            print(f"Packaged {len(result['skills'])} independent capsules")
        else:
            publish(json.loads(Path(args.manifest).read_text()), args.results)
        return 0
    except (ValueError, OSError, KeyError, TypeError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
