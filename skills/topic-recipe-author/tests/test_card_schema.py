"""Validate public/private authoring profiles and reject incompatible configurations."""
import copy
import json
from pathlib import Path
import unittest

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = json.loads((ROOT / "references/topic-recipe-domain-card.schema.json").read_text())
Draft202012Validator.check_schema(SCHEMA)
VALIDATE = Draft202012Validator(SCHEMA, format_checker=FormatChecker())
PUBLIC = json.loads((ROOT / "assets/public-card.example.json").read_text())
PRIVATE = json.loads((ROOT / "assets/private-card.example.json").read_text())


class CardSchemaTests(unittest.TestCase):
    def test_authoring_examples(self):
        for card in (PUBLIC, PRIVATE):
            VALIDATE.validate(card)

    def test_all_kind_base_pairs(self):
        pairs = {"project": "project", "task": "project", "agent_task": "flow", "question": "research",
                 "proposal": "proposal", "evaluation": "evaluation", "claims": "claims",
                 "discussion": "discussion", "incident": "incident"}
        for kind, base in pairs.items():
            with self.subTest(kind=kind):
                card = copy.deepcopy(PUBLIC)
                card["credentialSubject"]["topicRecipe"].update(baseKind=kind, baseRecipe=base)
                VALIDATE.validate(card)
                card["credentialSubject"]["topicRecipe"]["baseRecipe"] = "flow" if base != "flow" else "project"
                self.assertFalse(VALIDATE.is_valid(card))

    def test_paid_access_cannot_be_active(self):
        card = copy.deepcopy(PRIVATE)
        card["credentialSubject"]["topicRecipe"]["shapeResource"]["access"]["paywall"]["status"] = "active"
        self.assertFalse(VALIDATE.is_valid(card))

    def test_ucan_requires_delegation_metadata(self):
        card = copy.deepcopy(PRIVATE)
        del card["credentialSubject"]["topicRecipe"]["shapeResource"]["access"]["delegation"]
        self.assertFalse(VALIDATE.is_valid(card))

    def test_standard_domain_fields_remain_allowed(self):
        card = copy.deepcopy(PUBLIC)
        card["credentialSubject"]["logo"] = {"type": "schema:ImageObject", "contentUrl": "https://example.org/cover.webp"}
        card["credentialSubject"]["contactPoint"] = [{"type": "schema:ContactPoint", "email": "author@example.org"}]
        VALIDATE.validate(card)

    def test_invalid_fragment_sequence(self):
        for suffix in ("top-00", "top-1", "top-0001", "top-one"):
            card = copy.deepcopy(PUBLIC)
            card["credentialSubject"]["topicRecipe"]["shapeResource"]["id"] = "did:ixo:entity:test#" + suffix
            self.assertFalse(VALIDATE.is_valid(card))

    def test_unknown_extension_fields_rejected(self):
        card = copy.deepcopy(PRIVATE)
        card["credentialSubject"]["topicRecipe"]["shapeResource"]["access"]["token"] = "never-publish-a-token"
        self.assertFalse(VALIDATE.is_valid(card))


if __name__ == "__main__":
    unittest.main()
