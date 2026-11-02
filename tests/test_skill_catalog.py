"""End-to-end fixture tests; no credentials or network calls are used."""

import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest import mock

import yaml

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/skill_catalog.py"
spec = importlib.util.spec_from_file_location("skill_catalog", SCRIPT)
sc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sc)


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.repo = Path(self.tmp.name)
        self.git("init", "-q")
        self.git("config", "user.name", "Fixture")
        self.git("config", "user.email", "fixture@example.test")

    def git(self, *args):
        return sc.git(self.repo, *args).decode().strip()

    def write(self, path, text):
        full = self.repo / path
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_text(text)

    def skill(self, path, name=None, extra=""):
        name = name or Path(path).name
        self.write(
            path + "/SKILL.md",
            f"---\nname: {name}\ndescription: A fixture skill\n{extra}---\n\n# Fixture\n",
        )
        return path

    def commit(self):
        self.git("add", ".")
        self.git("commit", "-qm", "fixture")
        return self.git("rev-parse", "HEAD")

    def two_skills(self):
        self.a = self.skill("skills/software-review/software-review-security-review")
        self.b = self.skill("skills/software-review/software-review-quality-review")

    def test_existing_flat_skill_identity_and_bytes(self):
        path = self.skill("skills/legacy", extra='metadata:\n  version: "2.1.0"\n')
        self.write(path + "/scripts/helper.py", "print('fixture')\n")
        original = (self.repo / path / "SKILL.md").read_bytes()
        record = sc.catalog(self.repo)[0]
        self.assertEqual(
            (record["canonical_name"], record["namespace"], record["version"]),
            ("legacy", None, "2.1.0"),
        )
        packaged = sc.package(self.repo, record, self.repo / "out")
        with tarfile.open(packaged["archive"]) as archive:
            self.assertEqual(archive.extractfile("legacy/SKILL.md").read(), original)
            self.assertIn("legacy/scripts/helper.py", archive.getnames())

    def test_two_nested_siblings_have_independent_archives(self):
        self.two_skills()
        self.write(self.a + "/references/guide.txt", "only A")
        self.write(self.b + "/prompts/prompt.txt", "only B")
        self.write("skills/software-review/README.md", "Container documentation")
        records = sc.catalog(self.repo)
        self.assertEqual(len(records), 2)
        for record in records:
            result = sc.package(self.repo, record, self.repo / "out")
            with tarfile.open(result["archive"]) as archive:
                self.assertTrue(
                    all(
                        p.startswith(record["canonical_name"] + "/")
                        for p in archive.getnames()
                    )
                )
                self.assertEqual(len(archive.getnames()), 2)
                data, _ = sc.frontmatter(
                    archive.extractfile(record["canonical_name"] + "/SKILL.md")
                    .read()
                    .decode(),
                    "fixture",
                )
                self.assertEqual(data["metadata"]["namespace"], "software-review")

    def test_script_only_change_selects_owner(self):
        self.two_skills()
        base = self.commit()
        self.write(self.a + "/scripts/helper.py", "pass\n")
        head = self.commit()
        self.assertEqual(
            [r["source_path"] for r in sc.plan(self.repo, base, head)["skills"]],
            [self.a],
        )

    def test_namespace_readme_only_does_not_publish(self):
        self.two_skills()
        base = self.commit()
        self.write("skills/software-review/README.md", "Documentation only")
        head = self.commit()
        result = sc.plan(self.repo, base, head)
        self.assertEqual(result["skills"], [])
        self.assertEqual(
            result["namespace_documents"], ["skills/software-review/README.md"]
        )

    def test_empty_namespace_is_documentation_only(self):
        self.write("skills/software-review/README.md", "No published skills yet")
        self.assertEqual(sc.catalog(self.repo), [])

    def test_duplicate_canonical_names_across_catalog(self):
        self.skill("skills/software-review/software-review-security")
        self.skill("skills/software-review-security")
        with self.assertRaisesRegex(sc.CatalogError, "Duplicate canonical name"):
            sc.catalog(self.repo)

    def test_unqualified_names_fail(self):
        self.skill("skills/software-review/security")
        with self.assertRaisesRegex(sc.CatalogError, "namespace prefix"):
            sc.catalog(self.repo)

    def test_bad_names_and_mismatched_frontmatter_fail(self):
        for path, name in [
            ("skills/bad name", "bad name"),
            ("skills/valid", "other"),
            ("skills/" + "a" * 65, "a" * 65),
        ]:
            with self.subTest(path=path):
                shutil.rmtree(self.repo / "skills", ignore_errors=True)
                self.skill(path, name)
                with self.assertRaises(sc.CatalogError):
                    sc.catalog(self.repo)

    def test_malformed_yaml_duplicate_keys_and_allowed_tools_fail(self):
        path = self.skill("skills/valid")
        for text in [
            "---\nname: valid\n",
            "---\nname: valid\nname: valid\ndescription: fixture\n---\n",
            "---\nname: valid\ndescription: fixture\nallowed-tools: [Read]\n---\n",
        ]:
            with self.subTest(text=text):
                self.write(path + "/SKILL.md", text)
                with self.assertRaises(sc.CatalogError):
                    sc.catalog(self.repo)

    def test_namespace_metadata_must_match_source(self):
        self.skill(
            "skills/software-review/software-review-security",
            extra="metadata:\n  namespace: another\n",
        )
        with self.assertRaisesRegex(sc.CatalogError, "metadata.namespace"):
            sc.catalog(self.repo)

    def test_ambiguous_roots_fail(self):
        self.skill("skills/software-review")
        self.skill("skills/software-review/software-review-security")
        with self.assertRaisesRegex(sc.CatalogError, "Ambiguous skill roots"):
            sc.catalog(self.repo)

    def test_bundled_subskills_keep_parent_ownership(self):
        self.skill("skills/legacy")
        child = self.skill("skills/legacy/subskills/legacy-mode")
        base = self.commit()
        self.write(child + "/reference.md", "Changed bundled resource")
        head = self.commit()
        result = sc.plan(self.repo, base, head)
        self.assertEqual(
            [r["source_path"] for r in result["skills"]], ["skills/legacy"]
        )
        packaged = sc.package(self.repo, result["skills"][0], self.repo / "out")
        with tarfile.open(packaged["archive"]) as archive:
            self.assertIn("legacy/subskills/legacy-mode/SKILL.md", archive.getnames())

    def test_missing_skill_root_cannot_hide_resources(self):
        self.write("skills/software-review/scripts/helper.py", "pass\n")
        with self.assertRaisesRegex(sc.CatalogError, "no owning SKILL.md"):
            sc.catalog(self.repo)

    def test_symlink_resources_fail(self):
        path = self.skill("skills/valid")
        (self.repo / path / "external").symlink_to(Path(__file__))
        with self.assertRaisesRegex(sc.CatalogError, "symlinks"):
            sc.catalog(self.repo)

    def test_deleted_skill_is_reported_without_retirement(self):
        path = self.skill("skills/legacy")
        base = self.commit()
        shutil.rmtree(self.repo / path)
        head = self.commit()
        result = sc.plan(self.repo, base, head)
        self.assertEqual(result["skills"], [])
        self.assertEqual(result["removed"][0]["canonical_name"], "legacy")
        self.assertIn("separate explicit action", result["removed"][0]["action"])

    def test_flat_to_namespace_move_preserves_qualified_identity(self):
        old = self.skill("skills/software-review-security")
        base = self.commit()
        new = self.repo / "skills/software-review/software-review-security"
        new.parent.mkdir()
        shutil.move(str(self.repo / old), new)
        head = self.commit()
        result = sc.plan(self.repo, base, head)
        self.assertEqual(len(result["skills"]), 1)
        self.assertEqual(
            result["removed"][0]["canonical_name"],
            result["skills"][0]["canonical_name"],
        )
        self.assertEqual(result["skills"][0]["namespace"], "software-review")

    def test_removed_resource_republishes_existing_owner(self):
        path = self.skill("skills/legacy")
        self.write(path + "/resource.txt", "removed")
        base = self.commit()
        (self.repo / path / "resource.txt").unlink()
        head = self.commit()
        self.assertEqual(len(sc.plan(self.repo, base, head)["skills"]), 1)

    def test_multi_commit_push_covers_whole_range(self):
        self.two_skills()
        base = self.commit()
        self.write(self.a + "/resource.txt", "first commit")
        self.commit()
        self.write(self.b + "/resource.txt", "second commit")
        head = self.commit()
        self.assertEqual(len(sc.plan(self.repo, base, head)["skills"]), 2)

    def test_missing_zero_or_unavailable_base_fails_closed(self):
        self.skill("skills/legacy")
        head = self.commit()
        for base in ["", "0" * 40, "f" * 40]:
            with self.subTest(base=base), self.assertRaises(sc.CatalogError):
                sc.plan(self.repo, base, head)

    def test_multiline_yaml_and_unspecified_version(self):
        self.write(
            "skills/legacy/SKILL.md",
            '---\nname: "legacy"\ndescription: >-\n  A multiline\n  description\n---\n',
        )
        self.assertIsNone(sc.catalog(self.repo)[0]["version"])

    def test_cli_dry_run_plan_and_package_without_credentials(self):
        self.skill("skills/legacy")
        base = self.commit()
        self.write("skills/legacy/resource.txt", "changed")
        head = self.commit()
        commands = [
            ["validate"],
            ["plan", "--base", base, "--head", head, "--output", "plan.json"],
            [
                "package",
                "--plan",
                "plan.json",
                "--output-dir",
                "out",
                "--manifest",
                "manifest.json",
            ],
        ]
        for command in commands:
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--repo", str(self.repo), *command],
                cwd=self.repo,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
        manifest = json.loads((self.repo / "manifest.json").read_text())
        self.assertIsNone(manifest["skills"][0]["cid"])
        self.assertEqual(manifest["skills"][0]["status"], "packaged")

    def test_bundled_subskill_cli_stays_compatible(self):
        self.skill("skills/legacy")
        child = self.skill("skills/legacy/subskills/legacy-mode")
        result = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--repo",
                str(self.repo),
                "validate-skill",
                child,
            ],
            cwd=self.repo,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_standalone_skill_directory_cli_stays_compatible(self):
        path = self.skill("external/legacy")
        result = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--repo",
                str(SCRIPT.parents[1]),
                "validate-skill",
                str(self.repo / path),
            ],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_helper_only_commit_has_an_empty_publication_plan(self):
        self.skill("skills/legacy")
        base = self.commit()
        self.write("scripts/helper.py", "pass\n")
        head = self.commit()
        self.assertEqual(sc.plan(self.repo, base, head)["skills"], [])

    def test_canonical_rename_reports_both_identities(self):
        self.skill("skills/old-name")
        base = self.commit()
        shutil.rmtree(self.repo / "skills/old-name")
        self.skill("skills/new-name")
        head = self.commit()
        result = sc.plan(self.repo, base, head)
        self.assertEqual(result["skills"][0]["canonical_name"], "new-name")
        self.assertEqual(result["removed"][0]["canonical_name"], "old-name")

    def test_unchanged_legacy_content_does_not_block_unrelated_skill(self):
        self.skill("skills/legacy", extra="allowed-tools: [Read]\n")
        self.skill("skills/valid")
        base = self.commit()
        self.write("skills/valid/resource.txt", "a new resource")
        head = self.commit()
        self.assertEqual(
            sc.plan(self.repo, base, head)["skills"][0]["canonical_name"], "valid"
        )
        self.write("skills/legacy/resource.txt", "now legacy changes")
        head = self.commit()
        with self.assertRaisesRegex(sc.CatalogError, "allowed-tools"):
            sc.plan(self.repo, base, head)

    def test_publication_maps_returned_cid_with_mock_transport(self):
        self.two_skills()
        manifest = {
            "skills": [
                sc.package(self.repo, r, self.repo / "out")
                for r in sc.catalog(self.repo)
            ]
        }
        results = self.repo / "results.json"
        response = mock.MagicMock()
        response.__enter__.return_value.status = 201
        response.__enter__.return_value.read.return_value = b'{"cid":"bafy-fixture"}'
        with (
            mock.patch.dict(
                sc.os.environ,
                {
                    "SKILLS_API_KEY": "fixture-secret",
                    "SKILLS_SERVER_URL": "https://fixture.invalid",
                },
            ),
            mock.patch.object(
                sc.urllib.request.OpenerDirector, "open", return_value=response
            ) as transport,
        ):
            sc.publish(manifest, results)
        self.assertEqual(transport.call_count, 2)
        output = results.read_text()
        self.assertNotIn("fixture-secret", output)
        records = json.loads(output)["skills"]
        self.assertTrue(
            all(
                r["cid"] == "bafy-fixture" and r["namespace"] == "software-review"
                for r in records
            )
        )

    def test_upload_without_cid_fails_without_automatic_retry(self):
        self.skill("skills/legacy")
        manifest = {
            "skills": [
                sc.package(self.repo, sc.catalog(self.repo)[0], self.repo / "out")
            ]
        }
        results = self.repo / "results.json"
        response = mock.MagicMock()
        response.__enter__.return_value.status = 201
        response.__enter__.return_value.read.return_value = b"{}"
        with (
            mock.patch.dict(
                sc.os.environ,
                {
                    "SKILLS_API_KEY": "fixture-secret",
                    "SKILLS_SERVER_URL": "https://fixture.invalid",
                },
            ),
            mock.patch.object(
                sc.urllib.request.OpenerDirector, "open", return_value=response
            ) as transport,
        ):
            with self.assertRaisesRegex(sc.CatalogError, "inspect publication results"):
                sc.publish(manifest, results)
        self.assertEqual(transport.call_count, 1)
        self.assertIn(
            "uncertain", json.loads(results.read_text())["skills"][0]["status"]
        )


class WorkflowTests(unittest.TestCase):
    def test_mapping_artifacts_include_the_hidden_output_directory(self):
        root = SCRIPT.parents[1] / ".github/workflows"
        for filename in ["validate-skill.yml", "publish-skill.yml"]:
            workflow = yaml.load((root / filename).read_text(), Loader=yaml.BaseLoader)
            artifacts = [
                step
                for job in workflow["jobs"].values()
                for step in job["steps"]
                if step.get("uses", "").startswith("actions/upload-artifact@")
            ]
            self.assertEqual(len(artifacts), 1)
            self.assertEqual(artifacts[0]["with"]["path"], ".publication/*.json")
            self.assertEqual(artifacts[0]["with"]["include-hidden-files"], "true")

    def test_publication_requires_a_main_branch_push(self):
        path = SCRIPT.parents[1] / ".github/workflows/publish-skill.yml"
        workflow = yaml.load(path.read_text(), Loader=yaml.BaseLoader)
        self.assertEqual(set(workflow["on"]), {"push"})
        self.assertEqual(workflow["on"]["push"]["branches"], ["main"])
        guard = workflow["jobs"]["publish"]["if"]
        self.assertIn("github.event_name == 'push'", guard)
        self.assertIn("github.ref == 'refs/heads/main'", guard)
        self.assertIn("github.repository == 'ixoworld/ixo-agent-skills", guard)

    def test_workflow_wiring_and_dependency_setup(self):
        repo = SCRIPT.parents[1]
        for path in (repo / ".github/workflows").glob("*.yml"):
            # BaseLoader preserves the Actions 'on' key instead of YAML 1.1 bools.
            workflow = yaml.load(path.read_text(), Loader=yaml.BaseLoader)
            for job in workflow["jobs"].values():
                runs = [step.get("run", "") for step in job["steps"]]
                if any("scripts/validate-skill.sh" in run for run in runs):
                    install = next(
                        i
                        for i, run in enumerate(runs)
                        if "pip install -r scripts/requirements.txt" in run
                    )
                    self.assertLess(
                        install,
                        next(
                            i
                            for i, run in enumerate(runs)
                            if "scripts/validate-skill.sh" in run
                        ),
                    )
        for filename in ["validate-skill.yml", "publish-skill.yml"]:
            workflow = yaml.load(
                (repo / ".github/workflows" / filename).read_text(),
                Loader=yaml.BaseLoader,
            )
            for event in workflow["on"].values():
                self.assertTrue(
                    {
                        "skills/**",
                        "scripts/**",
                        "tests/**",
                        ".github/workflows/**",
                    }.issubset(event["paths"])
                )
            runs = "\n".join(
                step.get("run", "")
                for job in workflow["jobs"].values()
                for step in job["steps"]
            )
            self.assertIn("python3 -m unittest discover -s tests -v", runs)
            self.assertNotIn("HEAD~1", runs)
        public_text = (repo / ".github/workflows/validate-skill.yml").read_text()
        self.assertNotIn("SKILLS_API_KEY", public_text)
        self.assertNotIn("skill_catalog.py publish", public_text)
        publish_text = (repo / ".github/workflows/publish-skill.yml").read_text()
        self.assertIn("github.event.before", publish_text)
        self.assertIn("if: always()", publish_text)


if __name__ == "__main__":
    unittest.main()
