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
import tarfile
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLANNER = ROOT / "software-review-scenario-planning"
spec = importlib.util.spec_from_file_location(
    "check_ask", PLANNER / "scripts/check_ask.py"
)
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
CASES = json.loads((PLANNER / "evals/asks.json").read_text())["cases"]


def replace(data, dotted, value):
    keys = dotted.split(".")
    for key in keys[:-1]:
        data = data[int(key)] if isinstance(data, list) else data[key]
    if isinstance(data, list):
        data[int(keys[-1])] = value
    else:
        data[keys[-1]] = value


class AskContractTests(unittest.TestCase):
    def test_complete_candidates_and_cli(self):
        for case in CASES:
            with self.subTest(case=case["id"]), tempfile.TemporaryDirectory() as tmp:
                provenance = ROOT / case["skill"] / "PROVENANCE.json"
                ask_file = Path(tmp) / "ask.json"
                ask_file.write_text(json.dumps(case["candidate_ask"]))
                result = checker.main(input_file=ask_file, provenance_file=provenance)
                self.assertEqual(
                    result, {"status": case["expected_status"], "errors": []}
                )
                cli = subprocess.run(
                    [
                        "python3",
                        str(PLANNER / "scripts/check_ask.py"),
                        str(ask_file),
                        "--provenance",
                        str(provenance),
                    ],
                    capture_output=True,
                    text=True,
                )
                self.assertEqual(cli.returncode, 0, cli.stderr + cli.stdout)
                self.assertEqual(json.loads(cli.stdout), result)

    def test_insufficient_unsafe_or_misattributed_candidates_are_rejected(self):
        negatives = json.loads((PLANNER / "evals/negative-cases.json").read_text())
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
            cli = subprocess.run(
                ["python3", str(PLANNER / "scripts/check_ask.py"), str(path)],
                capture_output=True,
                text=True,
            )
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

    def test_self_contained_links_and_identical_contracts(self):
        contracts = set()
        for skill in self.skills():
            folder = skill.parent
            contracts.add((folder / "references/ask-contract.md").read_bytes())
            for md in folder.rglob("*.md"):
                for link in re.findall(r"\]\(([^)]+)\)", md.read_text()):
                    if "://" in link or link.startswith("#"):
                        continue
                    target = (md.parent / link.split("#")[0]).resolve()
                    self.assertTrue(target.is_relative_to(folder.resolve()), (md, link))
                    self.assertTrue(target.exists(), (md, link))
        self.assertEqual(
            len(contracts),
            1,
            "Keep the contract copies in sync for independent capsules",
        )

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
        # Test tar content directly. This is a local smoke test, not a second
        # namespace discovery or publishing pipeline.
        for skill in self.skills():
            folder = skill.parent
            with self.subTest(skill=folder.name), tempfile.TemporaryDirectory() as tmp:
                archive = Path(tmp) / (folder.name + ".tar.gz")
                with tarfile.open(archive, "w:gz") as tar:
                    for path in sorted(folder.rglob("*")):
                        if path.is_file() and "__pycache__" not in path.parts:
                            tar.add(
                                path,
                                arcname=folder.name
                                + "/"
                                + str(path.relative_to(folder)),
                                recursive=False,
                            )
                with tarfile.open(archive) as tar:
                    names = tar.getnames()
                    self.assertIn(folder.name + "/SKILL.md", names)
                    self.assertIn(folder.name + "/LICENSE", names)
                    self.assertIn(folder.name + "/PROVENANCE.json", names)
                    self.assertTrue(
                        all(
                            n.startswith(folder.name + "/")
                            and ".." not in Path(n).parts
                            for n in names
                        )
                    )
                    self.assertEqual(sum(n.endswith("/SKILL.md") for n in names), 1)
                    self.assertFalse(
                        any(n.startswith("software-review/") for n in names)
                    )


if __name__ == "__main__":
    unittest.main()
