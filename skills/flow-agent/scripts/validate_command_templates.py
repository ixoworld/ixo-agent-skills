#!/usr/bin/env python3
"""
Validate Flow Agent command template examples.

Usage: python3 validate_command_templates.py <agent-command-examples.json>
"""

import json
import sys
from pathlib import Path


EXPECTED_CAPABILITIES = {
    "diagnose_blocker": "flow/observe",
    "assign_actor": "flow/node/assign",
    "notify_actor": "flow/notify",
    "execute_action": "flow/node/execute",
    "validate_external_state": "flow/mutation/execute",
    "submit_claim": "flow/claim/submit",
    "watch_udid": "flow/observe",
    "archive_flow": "flow/archive",
    "propose_config_change": "flow/config/propose",
}

COMMON_REQUIRED_FIELDS = [
    "type",
    "flowId",
    "flowUri",
    "nodeId",
    "actorDid",
    "capability",
    "idempotencyKey",
    "reason",
    "payload",
]


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def validate_command(command, index):
    errors = []
    for field in COMMON_REQUIRED_FIELDS:
        if field not in command:
            errors.append(f"commands[{index}] missing {field}")

    command_type = command.get("type")
    if command_type not in EXPECTED_CAPABILITIES:
        errors.append(f"commands[{index}] has unsupported type {command_type!r}")
        return errors

    expected_capability = EXPECTED_CAPABILITIES[command_type]
    if command.get("capability") != expected_capability:
        errors.append(
            f"commands[{index}] {command_type} capability must be {expected_capability}, got {command.get('capability')}"
        )

    payload = command.get("payload")
    if not isinstance(payload, dict):
        errors.append(f"commands[{index}] payload must be an object")
        return errors

    if not command.get("idempotencyKey"):
        errors.append(f"commands[{index}] idempotencyKey is required")

    if command_type == "validate_external_state" and "validator" not in payload:
        errors.append("validate_external_state command must include payload.validator")

    if command_type == "propose_config_change":
        if "proposal" not in payload:
            errors.append("propose_config_change command must include payload.proposal")
        forbidden_terms = ["directMutation", "applyPatch", "editTemplate", "setup_flow"]
        serialized = json.dumps(payload, sort_keys=True)
        for term in forbidden_terms:
            if term in serialized:
                errors.append(f"propose_config_change payload must not include direct mutation term {term}")

    if command_type in {"execute_action", "validate_external_state", "submit_claim"}:
        serialized = json.dumps(command, sort_keys=True).lower()
        if "idempotency" not in serialized:
            errors.append(f"{command_type} command must include idempotency details")

    return errors


def main(template_file=None, **kwargs):
    path = Path(template_file or "").resolve()
    errors = []

    if not path.is_file():
        return {"ok": False, "errors": [f"Template file does not exist: {path}"]}

    try:
        data = load_json(path)
    except json.JSONDecodeError as exc:
        return {"ok": False, "errors": [f"Invalid JSON: {exc}"]}

    commands = data.get("commands")
    if not isinstance(commands, list):
        return {"ok": False, "errors": ["Top-level commands must be a list"]}

    seen_types = set()
    for index, command in enumerate(commands):
        if not isinstance(command, dict):
            errors.append(f"commands[{index}] must be an object")
            continue
        seen_types.add(command.get("type"))
        errors.extend(validate_command(command, index))

    missing = sorted(set(EXPECTED_CAPABILITIES) - seen_types)
    if missing:
        errors.append(f"Missing command examples for: {', '.join(missing)}")

    extra = sorted(seen_types - set(EXPECTED_CAPABILITIES))
    if extra:
        errors.append(f"Unsupported command examples found: {', '.join(str(value) for value in extra)}")

    return {"ok": not errors, "errors": errors}


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 validate_command_templates.py <agent-command-examples.json>")
        sys.exit(1)

    result = main(template_file=sys.argv[1])
    if result["ok"]:
        print("Flow Agent command template validation PASSED")
        sys.exit(0)

    print("Flow Agent command template validation FAILED")
    for error in result["errors"]:
        print(f"- {error}")
    sys.exit(1)

