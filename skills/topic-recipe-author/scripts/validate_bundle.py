#!/usr/bin/env python3
"""Check offline release integrity and bindings. Usage: python3 validate_bundle.py <directory>."""
import argparse
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
BASES = {"project": "project", "task": "project", "agent_task": "flow", "question": "research",
         "proposal": "proposal", "evaluation": "evaluation", "claims": "claims",
         "discussion": "discussion", "incident": "incident"}
DID = r"did:[a-z0-9]+:[^/?#\s]+"


def digest(data):
    return "sha256:" + hashlib.sha256(data).hexdigest()


def load_object(path):
    value = json.loads(path.read_bytes())
    if not isinstance(value, dict):
        raise ValueError("expected JSON object")
    return value


def https(value):
    if not isinstance(value, str):
        return False
    parsed = urlsplit(value)
    return parsed.scheme == "https" and bool(parsed.netloc) and not parsed.username and not parsed.password


def check_profile(card, check):
    lock = load_object(ROOT / "references/source-lock.json")
    for item in lock["bundled"]:
        path = ROOT / item["path"]
        check(digest(path.read_bytes()) == "sha256:" + item["sha256"], "Bundled profile source-lock mismatch")
    schema = load_object(ROOT / "references/topic-recipe-domain-card.schema.json")
    check(card.get("@context") == schema["properties"]["@context"]["const"], "Card context was changed or lost")
    declared = card.get("credentialSchema", {})
    check(declared.get("id") == schema["$id"] and declared.get("type") == "JsonSchema", "Wrong card profile schema")
    check({"VerifiableCredential", "ixo:DomainCard"}.issubset(card.get("type", [])), "Domain Card types missing")


def check_identity(card, release, ledger, check):
    did = release["entityDid"]
    rid = release["resourceId"]
    check(isinstance(did, str) and re.fullmatch(DID, did) is not None, "Invalid entity DID")
    check(isinstance(rid, str) and re.fullmatch(re.escape(did) + r"#top-(?:0[1-9]|[1-9][0-9]+)", rid) is not None,
          "Shape fragment must belong to the recipe DID and start at top-01")
    subject = card["credentialSubject"]
    check(card["id"] == did + "#dmn" and subject["id"] == did, "Card/entity identity mismatch")
    check("ixo:protocol/topic" in subject["type"], "Subject type must include ixo:protocol/topic")
    check(ledger["entity"]["id"] == did and ledger["entity"]["type"] == "protocol/topic", "Wrong ledger entity/type")
    docs = [d for d in subject["relatedDocument"] if d.get("id") == rid]
    check(len(docs) == 1 and docs[0].get("mediaType") == "application/json", "Expected one matching relatedDocument")


def check_recipe(card, recipe, release, shape, shape_bytes, recipe_bytes, check):
    meta = card["credentialSubject"]["topicRecipe"]
    check(meta["profileVersion"] == "1.1.0-proposed", "Unsupported card profile")
    check(meta["entityType"] == "protocol/topic", "Wrong recipe entity type")
    check(meta["baseKind"] in BASES and BASES[meta["baseKind"]] == meta["baseRecipe"], "Incompatible Kind/Base Recipe")
    for key in ("baseKind", "baseRecipe", "protocolVersion"):
        check(meta[key] == release[key], "Release/card mismatch: " + key)
    check(meta["version"] == release["recipeVersion"] == recipe["recipeVersion"], "Recipe version mismatch")
    check(meta["baseRecipe"] == recipe["baseRecipe"], "Manifest Base Recipe mismatch")
    check(meta["instantiation"] == "reviewable-draft" and recipe["creates"] == "draft", "Recipe must create a reviewable Draft")
    check(recipe["shape"] == shape, "Manifest substituted the Shape")
    ref = meta["shapeResource"]
    check(ref["id"] == release["resourceId"], "Card/release resource mismatch")
    check(ref["version"] == release["recipeVersion"], "Shape release version mismatch")
    check(ref["mediaType"] == "application/json", "Shape MIME must be JSON")
    check(ref["digest"] == release["shapeDigest"] == digest(shape_bytes), "Shape byte digest mismatch")
    check(release["recipeDigest"] == digest(recipe_bytes), "Recipe byte digest mismatch")
    check(ref["vfs"] == release["vfs"], "VFS identity mismatch")
    check(ref["vfs"].get("resource") != "ixo:filesystem", "Personal Files is not a domain namespace")
    check(all(isinstance(ref["vfs"].get(k), str) and ref["vfs"][k].strip()
              for k in ("provider", "resource", "fileId", "version")), "Incomplete VFS identity")
    return ref


def check_access(ref, linked, check):
    access = ref["access"]
    if access["mode"] == "public":
        check(access.get("paywall") is None, "Public access cannot require payment")
        check(not linked.get("right"), "Public resource cannot require a right")
    elif access["mode"] == "ucan":
        grant = access.get("delegation", {})
        check(re.fullmatch(DID, grant.get("authority", "")) is not None, "Private delegation authority missing")
        check(https(grant.get("requestEndpoint")), "Private delegation endpoint missing")
        check(re.fullmatch(DID + r"#[^\s#]+", linked.get("right", "")) is not None, "Private policy right missing")
        check(access.get("paywall") in (None, {"protocol": "x402", "status": "planned"}), "Unsupported paywall state")
        check("/public/" not in linked.get("serviceEndpoint", ""), "Private resource points at public endpoint")
    else:
        check(False, "Unsupported access mode")


def check_linked(ref, ledger, check):
    resources = [r for r in ledger["linkedResource"] if r.get("id") == ref["id"]]
    check(len(resources) == 1, "Expected exactly one matching linkedResource")
    if len(resources) != 1:
        return
    linked = resources[0]
    check(linked.get("type") == "topicShape" and linked.get("mediaType") == "application/json", "Wrong linked-resource type/MIME")
    check(linked.get("proof") == ref["digest"].removeprefix("sha256:"), "Ledger proof/card digest mismatch")
    check(linked.get("encrypted") == "false", "Application-encrypted Shape requires another profile")
    check(https(linked.get("serviceEndpoint")), "Missing HTTPS resource endpoint")
    check_access(ref, linked, check)


def main(bundle_dir=None, **kwargs):
    """Return offline check results. No evidence here certifies live publication."""
    result = {"ok": False, "scope": "offline-integrity-and-bindings", "liveReadinessVerified": False,
              "checks": 0, "errors": []}

    def check(condition, message):
        result["checks"] += 1
        if not condition:
            result["errors"].append(message)

    try:
        directory = Path(bundle_dir)
        card, release, ledger, recipe, shape = [load_object(directory / name) for name in
                                              ("card.json", "release.json", "ledger.json", "recipe.json", "shape.json")]
        check_profile(card, check)
        check_identity(card, release, ledger, check)
        ref = check_recipe(card, recipe, release, shape, (directory / "shape.json").read_bytes(),
                           (directory / "recipe.json").read_bytes(), check)
        check_linked(ref, ledger, check)
    except (OSError, ValueError, KeyError, TypeError, AttributeError, IndexError):
        result["errors"].append("Missing, malformed, or unsupported bundle/profile data; validate required file structures")
    result["ok"] = not result["errors"]
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle_dir")
    report = main(bundle_dir=parser.parse_args().bundle_dir)
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if report["ok"] else 1)
