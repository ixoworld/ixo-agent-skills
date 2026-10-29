#!/usr/bin/env python3
"""Offline tests for review asks, provenance, local references and archive shape.

Usage: python3 -m unittest discover -s skills/software-review/software-review-scenario-planning/tests -v
No external models, upstream tools, network calls or publishing are invoked.
"""

import copy
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLANNER = ROOT / "software-review-scenario-planning"
FIXTURES = Path(__file__).resolve().parent / "fixtures"
spec = importlib.util.spec_from_file_location(
    "check_ask", PLANNER / "scripts/check_ask.py"
)
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
CASES = json.loads((FIXTURES / "asks.json").read_text(encoding="utf-8"))["cases"]
EVAL_SETTINGS = {"tags", "max_turns", "timeout_seconds", "allowed_tools"}


def replace(data, dotted, value):
    keys = dotted.split(".")
    for key in keys[:-1]:
        data = data[int(key)] if isinstance(data, list) else data[key]
    if isinstance(data, list):
        data[int(keys[-1])] = value
    else:
        data[keys[-1]] = value


def run_cli(skill, *args):
    return subprocess.run(
        [sys.executable, str(ROOT / skill / "scripts/check_ask.py"), *map(str, args)],
        capture_output=True,
        text=True,
    )


def front_block(text):
    """Return the keys of a leading ---/--- block and the text after it."""
    match = re.match(r"---\n(.*?)\n---\n", text, re.S)
    if not match:
        return None, text
    return set(re.findall(r"^([\w-]+):", match.group(1), re.M)), text[match.end() :]


class AskContractTests(unittest.TestCase):
    def test_complete_candidates_pass_their_own_skills_checker(self):
        # Each capsule is published alone, so each skill's checker must accept
        # that skill's asks using only its own PROVENANCE.json.
        for case in CASES:
            with self.subTest(case=case["id"]), tempfile.TemporaryDirectory() as tmp:
                provenance = ROOT / case["skill"] / "PROVENANCE.json"
                ask_file = Path(tmp) / "ask.json"
                ask_file.write_text(json.dumps(case["candidate_ask"]), encoding="utf-8")
                result = checker.main(input_file=ask_file, provenance_file=provenance)
                self.assertEqual(
                    result, {"status": case["expected_status"], "errors": []}
                )
                cli = run_cli(case["skill"], ask_file)
                self.assertEqual(cli.returncode, 0, cli.stderr + cli.stdout)
                self.assertEqual(json.loads(cli.stdout), result)

    def test_template_carries_identity_and_completes_to_a_passing_ask(self):
        for case in CASES:
            with self.subTest(case=case["id"]):
                cli = run_cli(case["skill"], "--template")
                self.assertEqual(cli.returncode, 0, cli.stderr)
                draft = json.loads(cli.stdout)
                provenance = json.loads(
                    (ROOT / case["skill"] / "PROVENANCE.json").read_text()
                )
                result = checker.validate(draft, provenance)
                self.assertEqual(result["status"], "needs-input")
                self.assertFalse([e for e in result["errors"] if "provenance" in e])
                self.assertFalse([e for e in result["errors"] if "decisions" in e])
                # Filling every field the template left blank gives a passing ask.
                for key, value in case["candidate_ask"].items():
                    if key != "provenance":
                        draft[key] = value
                self.assertEqual(checker.validate(draft, provenance)["errors"], [])

    def test_contract_shapes_that_are_accepted(self):
        base = next(c for c in CASES if c["id"] == "tenant-boundary")
        provenance = json.loads((ROOT / base["skill"] / "PROVENANCE.json").read_text())
        variants = {
            "planned-actions-null": lambda a: a.update(planned_actions=None),
            "planned-actions-absent": lambda a: a.pop("planned_actions"),
            "sources-reordered": lambda a: a["provenance"]["sources"].reverse(),
            "non-ascii-text": lambda a: a.update(user="مستخدمون جدد للتطبيق"),
        }
        for name, change in variants.items():
            with self.subTest(variant=name), tempfile.TemporaryDirectory() as tmp:
                ask = copy.deepcopy(base["candidate_ask"])
                change(ask)
                path = Path(tmp) / "ask.json"
                path.write_text(json.dumps(ask, ensure_ascii=False), encoding="utf-8")
                result = checker.main(
                    input_file=path,
                    provenance_file=ROOT / base["skill"] / "PROVENANCE.json",
                )
                self.assertEqual(result["errors"], [], result)
                self.assertEqual(checker.validate(ask, provenance)["errors"], [])

    def test_insufficient_unsafe_or_misattributed_candidates_are_rejected(self):
        negatives = json.loads(
            (FIXTURES / "negative-cases.json").read_text(encoding="utf-8")
        )
        base = next(c for c in CASES if c["id"] == negatives["base_case"])
        provenance = json.loads((ROOT / base["skill"] / "PROVENANCE.json").read_text())
        for case in negatives["cases"]:
            with self.subTest(case=case["id"]):
                ask = copy.deepcopy(base["candidate_ask"])
                for dotted, value in case["replace"].items():
                    replace(ask, dotted, value)
                result = checker.validate(ask, provenance)
                self.assertEqual(result["status"], "needs-input")
                self.assertTrue(
                    any(case["expected_error"] in e for e in result["errors"]), result
                )

    def test_incomplete_cli_is_nonzero_without_modifying_ask(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "ask.json"
            path.write_text('{"status":"needs-input","missing_inputs":["user"]}')
            before = path.read_bytes()
            cli = run_cli("software-review-scenario-planning", path)
            self.assertEqual(cli.returncode, 1)
            self.assertEqual(json.loads(cli.stdout)["status"], "needs-input")
            self.assertEqual(path.read_bytes(), before)

    def test_invalid_json_is_a_reported_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "ask.json"
            path.write_text("{")
            self.assertEqual(checker.main(input_file=path)["status"], "needs-input")


class PackTests(unittest.TestCase):
    def skills(self):
        return sorted(ROOT.glob("software-review-*/SKILL.md"))

    def test_four_globally_qualified_names_and_string_metadata(self):
        skills = self.skills()
        self.assertEqual(len(skills), 4)
        for path in skills:
            content = path.read_text()
            front = content.split("---", 2)[1]
            self.assertIn("name: " + path.parent.name + "\n", front)
            self.assertIn("  namespace: software-review\n", front)
            self.assertRegex(path.parent.name, r"^software-review-[a-z]+(?:-[a-z]+)*$")
            self.assertLessEqual(len(path.parent.name), 64)
            self.assertNotIn("allowed-tools:", front)
            keys = re.findall(r"^([\w-]+):", front, re.M)
            self.assertEqual(set(keys), {"name", "description", "license", "metadata"})
            description = re.search(r"^description: (.*)$", front, re.M).group(1)
            self.assertLessEqual(len(description), 1024)
            self.assertNotRegex(description, r"[<>]")
            self.assertIn("Use when", description)

    def test_self_contained_links_and_identical_shared_files(self):
        # Capsules are published one leaf at a time, so the contract and the
        # checker travel with every skill and the copies must not drift.
        shared = {"references/ask-contract.md": set(), "scripts/check_ask.py": set()}
        for skill in self.skills():
            folder = skill.parent
            for name, copies in shared.items():
                copies.add((folder / name).read_bytes())
            for md in folder.rglob("*.md"):
                for link in re.findall(r"\]\(([^)]+)\)", md.read_text()):
                    if "://" in link or link.startswith("#"):
                        continue
                    target = (md.parent / link.split("#")[0]).resolve()
                    self.assertTrue(target.is_relative_to(folder.resolve()), (md, link))
                    self.assertTrue(target.exists(), (md, link))
        for name, copies in shared.items():
            self.assertEqual(len(copies), 1, "Keep the copies of " + name + " in sync")

    def test_behavior_evals_use_the_case_folder_layout(self):
        # skill-creator and `claude plugin eval` read evals/<case>/prompt.md,
        # case.yaml and graders/*.md; a case that does not load is never run.
        for skill in self.skills():
            cases = sorted(p for p in (skill.parent / "evals").iterdir() if p.is_dir())
            self.assertTrue(cases, skill.parent.name + " has no behaviour evals")
            for case in cases:
                with self.subTest(case=case.name):
                    self.assertRegex(case.name, r"^[a-z][a-z0-9-]*$")
                    keys, prompt = front_block((case / "prompt.md").read_text())
                    self.assertTrue(keys and keys <= EVAL_SETTINGS, keys)
                    self.assertTrue(prompt.strip())
                    meta = (case / "case.yaml").read_text()
                    self.assertIn('schema_version: "1.1"\n', meta)
                    self.assertIn("name: " + case.name + "\n", meta)
                    self.assertIn("expected_outcome: |\n", meta)
                    graders = sorted((case / "graders").glob("*.md"))
                    self.assertTrue(graders)
                    for grader in graders:
                        keys, statement = front_block(grader.read_text())
                        self.assertEqual(keys, {"type", "focus", "weight"}, grader)
                        self.assertTrue(statement.strip(), grader)

    def test_pinned_identity_licenses_and_import_distinction(self):
        kinds = []
        catalog = {
            r["repository"]: r
            for r in json.loads(
                (PLANNER / "references/source-catalog.json").read_text()
            )["candidates"]
        }
        for skill in self.skills():
            folder = skill.parent
            p = json.loads((folder / "PROVENANCE.json").read_text())
            self.assertEqual(p["skill"], folder.name)
            kinds.append(p["kind"])
            self.assertTrue(p["modifications"])
            for s in p["sources"]:
                self.assertRegex(s["revision"], r"^[0-9a-f]{40}$")
                self.assertRegex(s["git_blob_sha"], r"^[0-9a-f]{40}$")
                self.assertRegex(s["source_sha256"], r"^[0-9a-f]{64}$")
                self.assertIn(s["license"], ("MIT", "Apache-2.0"))
                self.assertEqual(s["revision"], catalog[s["repository"]]["revision"])
                self.assertEqual(
                    hashlib.sha256(
                        (folder / s["bundled_license"]).read_bytes()
                    ).hexdigest(),
                    s["license_sha256"],
                )
                self.assertIn("/blob/" + s["revision"] + "/", s["url"])
        self.assertEqual(kinds.count("adapted-skill-import"), 2)
        self.assertEqual(kinds.count("original-ixo-adapter"), 2)

    def test_canonical_archive_dry_run(self):
        # Pack each leaf the way `tar -czf <leaf>.tar.gz -C skills/software-review
        # <leaf>` does, so stray files, nested skills or links out of the folder show
        # up. A local smoke test, not a second namespace publishing pipeline.
        for skill in self.skills():
            folder = skill.parent
            with self.subTest(skill=folder.name), tempfile.TemporaryDirectory() as tmp:
                archive = Path(tmp) / (folder.name + ".tar.gz")
                with tarfile.open(archive, "w:gz") as tar:
                    tar.add(
                        folder,
                        arcname=folder.name,
                        filter=lambda info: (
                            None if "__pycache__" in info.name else info
                        ),
                    )
                with tarfile.open(archive) as tar:
                    members = tar.getmembers()
                    names = [m.name for m in members]
                    self.assertIn(folder.name + "/SKILL.md", names)
                    self.assertIn(folder.name + "/LICENSE", names)
                    self.assertIn(folder.name + "/PROVENANCE.json", names)
                    self.assertIn(folder.name + "/scripts/check_ask.py", names)
                    self.assertIn(folder.name + "/references/ask-contract.md", names)
                    self.assertTrue(
                        all(
                            (n == folder.name or n.startswith(folder.name + "/"))
                            and ".." not in Path(n).parts
                            for n in names
                        )
                    )
                    self.assertFalse(any(m.issym() or m.islnk() for m in members))
                    self.assertEqual(sum(n.endswith("/SKILL.md") for n in names), 1)
                    self.assertFalse(
                        any(n.startswith("software-review/") for n in names)
                    )


if __name__ == "__main__":
    unittest.main()
