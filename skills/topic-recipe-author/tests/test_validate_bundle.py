"""Offline release checks; fixtures never constitute live publication evidence."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("validate_bundle", ROOT / "scripts/validate_bundle.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def digest(data):
    return "sha256:" + hashlib.sha256(data).hexdigest()


def fixture(directory):
    did = "did:ixo:entity:test-recipe"
    shape = {"version": 1, "code": "fixture-only"}
    shape_bytes = (json.dumps(shape) + "\n").encode()
    recipe = {"recipeVersion": "1.0.0", "baseRecipe": "project", "creates": "draft", "shape": shape}
    recipe_bytes = (json.dumps(recipe) + "\n").encode()
    vfs = {"provider": "ixo-vfs", "resource": did, "fileId": "test-file", "version": "1"}
    schema = json.loads((ROOT / "references/topic-recipe-domain-card.schema.json").read_text())
    shape_ref = {"id": did + "#top-01", "version": "1.0.0", "digest": digest(shape_bytes),
                 "mediaType": "application/json", "vfs": vfs, "access": {"mode": "public", "paywall": None}}
    card = {"@context": schema["properties"]["@context"]["const"], "id": did + "#dmn",
            "type": ["VerifiableCredential", "ixo:DomainCard"],
            "credentialSchema": {"id": schema["$id"], "type": "JsonSchema"},
            "credentialSubject": {"id": did, "type": ["ixo:protocol/topic"],
                "relatedDocument": [{"id": shape_ref["id"], "mediaType": "application/json"}],
                "topicRecipe": {"profileVersion": "1.1.0-proposed", "entityType": "protocol/topic",
                    "version": "1.0.0", "protocolVersion": "test-protocol", "baseKind": "task",
                    "baseRecipe": "project", "instantiation": "reviewable-draft", "shapeResource": shape_ref}}}
    ledger = {"entity": {"id": did, "type": "protocol/topic"}, "linkedResource": [
        {"id": shape_ref["id"], "type": "topicShape", "mediaType": "application/json",
         "serviceEndpoint": "https://vfs.example.org/public/id/test-file", "proof": shape_ref["digest"][7:],
         "encrypted": "false", "right": ""}]}
    release = {"entityDid": did, "resourceId": shape_ref["id"], "recipeVersion": "1.0.0",
               "protocolVersion": "test-protocol", "baseKind": "task", "baseRecipe": "project",
               "shapeDigest": digest(shape_bytes), "recipeDigest": digest(recipe_bytes), "vfs": vfs}
    files = {"card.json": card, "ledger.json": ledger, "release.json": release}
    for name, value in files.items():
        (directory / name).write_text(json.dumps(value))
    (directory / "shape.json").write_bytes(shape_bytes)
    (directory / "recipe.json").write_bytes(recipe_bytes)


class BundleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name)
        fixture(self.path)

    def edit(self, name, mutate):
        path = self.path / name
        data = json.loads(path.read_text())
        mutate(data)
        path.write_text(json.dumps(data))

    def check(self):
        return MODULE.main(bundle_dir=str(self.path))

    def test_valid_bindings_have_no_live_certification(self):
        result = self.check()
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["scope"], "offline-integrity-and-bindings")
        self.assertFalse(result["liveReadinessVerified"])

    def test_changed_bytes_rejected_even_when_json_equal(self):
        with (self.path / "shape.json").open("a") as file:
            file.write(" ")
        self.assertFalse(self.check()["ok"])

    def test_wrong_entity_fragment_rejected(self):
        self.edit("release.json", lambda d: d.update(resourceId="did:ixo:other#top-01"))
        self.assertFalse(self.check()["ok"])

    def test_duplicate_ledger_binding_rejected(self):
        self.edit("ledger.json", lambda d: d["linkedResource"].append(copy.deepcopy(d["linkedResource"][0])))
        self.assertFalse(self.check()["ok"])

    def test_wrong_base_recipe_rejected(self):
        self.edit("card.json", lambda d: d["credentialSubject"]["topicRecipe"].update(baseRecipe="task"))
        self.assertFalse(self.check()["ok"])

    def test_namespace_mismatch_rejected(self):
        self.edit("release.json", lambda d: d["vfs"].update(resource="ixo:filesystem"))
        self.assertFalse(self.check()["ok"])

    def test_matching_personal_namespace_still_rejected(self):
        self.edit("release.json", lambda d: d["vfs"].update(resource="ixo:filesystem"))
        self.edit("card.json", lambda d: d["credentialSubject"]["topicRecipe"]["shapeResource"]["vfs"].update(resource="ixo:filesystem"))
        self.assertFalse(self.check()["ok"])

    def test_private_without_policy_rejected(self):
        self.edit("card.json", lambda d: d["credentialSubject"]["topicRecipe"]["shapeResource"].update(
            access={"mode": "ucan", "paywall": None}))
        self.assertFalse(self.check()["ok"])

    def test_private_binding_accepts_planned_paywall(self):
        self.edit("card.json", lambda d: d["credentialSubject"]["topicRecipe"]["shapeResource"].update(
            access={"mode": "ucan", "delegation": {"authority": "did:ixo:entity:test-recipe",
                    "requestEndpoint": "https://access.example.org/request"},
                    "paywall": {"protocol": "x402", "status": "planned"}}))
        self.edit("ledger.json", lambda d: d["linkedResource"][0].update(
            serviceEndpoint="https://vfs.example.org/protected/test-file", right="did:ixo:entity:test-recipe#read"))
        self.assertTrue(self.check()["ok"], self.check())

    def test_active_paywall_rejected(self):
        self.edit("card.json", lambda d: d["credentialSubject"]["topicRecipe"]["shapeResource"]["access"].update(
            paywall={"protocol": "x402", "status": "active"}))
        self.assertFalse(self.check()["ok"])

    def test_signer_dropping_context_rejected(self):
        self.edit("card.json", lambda d: d.update({"@context": ["https://www.w3.org/ns/credentials/v2"]}))
        self.assertFalse(self.check()["ok"])

    def test_manifest_shape_substitution_rejected(self):
        self.edit("recipe.json", lambda d: d.update(shape={"version": 1, "code": "different"}))
        new_hash = digest((self.path / "recipe.json").read_bytes())
        self.edit("release.json", lambda d: d.update(recipeDigest=new_hash))
        self.assertFalse(self.check()["ok"])

    def test_encrypted_transport_profile_rejected(self):
        self.edit("ledger.json", lambda d: d["linkedResource"][0].update(encrypted="true"))
        self.assertFalse(self.check()["ok"])

    def test_missing_file_reports_invalid(self):
        (self.path / "shape.json").unlink()
        self.assertFalse(self.check()["ok"])

    def test_invalid_json_cli_fails_without_traceback(self):
        (self.path / "card.json").write_text("{")
        result = subprocess.run([sys.executable, str(ROOT / "scripts/validate_bundle.py"), str(self.path)],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertFalse(json.loads(result.stdout)["ok"])
        self.assertNotIn("Traceback", result.stderr)


if __name__ == "__main__":
    unittest.main()
