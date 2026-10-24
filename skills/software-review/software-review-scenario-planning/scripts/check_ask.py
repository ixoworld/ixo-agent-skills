#!/usr/bin/env python3
"""Check a draft review ask offline; never executes tests or authorises actions.

Usage: python3 scripts/check_ask.py ask.json [--provenance PROVENANCE.json]
Exit 0 means structurally ready for human approval; exit 1 lists missing/invalid
inputs. main(input_file=..., provenance_file=..., **kwargs) returns the result.
"""

import argparse
import json
from pathlib import Path

TEXT_FIELDS = (
    "user",
    "task",
    "target.version",
    "target.environment",
    "evidence.handling",
    "permissions.authorisation_evidence",
    "terms.payment",
    "terms.follow_up",
)
LIST_FIELDS = (
    "scope.include",
    "scope.exclude",
    "criteria.success",
    "criteria.failure",
    "evidence.required",
    "reviewer.qualifications",
    "permissions.targets",
    "permissions.actions",
    "permissions.prohibited",
    "permissions.stop_conditions",
)
DECISIONS = {
    "observed_result": [],
    "interpretation": [],
    "authoritative_evaluation": "pending",
    "payment_authorisation": "pending",
    "settlement": "not-requested",
}
SOURCE_FIELDS = ("repository", "path", "revision", "license", "source_sha256", "role")


def get(data, dotted):
    """Return a nested value, treating an absent or malformed parent as missing."""
    for key in dotted.split("."):
        if not isinstance(data, dict):
            return None
        data = data.get(key)
    return data


def text(value):
    return isinstance(value, str) and bool(value.strip())


def texts(value):
    return isinstance(value, list) and bool(value) and all(text(x) for x in value)


def validate(ask, provenance):
    """Validate structure/identity only; the reviewer must verify truth/authority."""
    errors = []
    if not isinstance(ask, dict):
        return {"status": "needs-input", "errors": ["ask must be an object"]}
    for field in TEXT_FIELDS:
        if not text(get(ask, field)):
            errors.append(field)
    for field in LIST_FIELDS:
        if not texts(get(ask, field)):
            errors.append(field)
    if ask.get("status") not in ("needs-input", "ready-for-approval"):
        errors.append("status")
    missing = ask.get("missing_inputs")
    if not isinstance(missing, list) or any(not text(x) for x in missing):
        errors.append("missing_inputs")
    elif missing:
        errors.extend("unresolved: " + x for x in missing)
    elif ask.get("status") == "needs-input":
        errors.append("needs-input requires missing_inputs")
    for key, expected in DECISIONS.items():
        if get(ask, "decisions." + key) != expected:
            errors.append("decisions." + key + " must retain draft-only state")
    for key, expected in (
        ("skill", provenance["skill"]),
        ("kind", provenance["kind"]),
        ("upstream_skill_name", provenance["upstream_skill_name"]),
    ):
        if get(ask, "provenance." + key) != expected:
            errors.append("provenance." + key)
    sources = get(ask, "provenance.sources")
    expected_sources = [{k: s[k] for k in SOURCE_FIELDS} for s in provenance["sources"]]
    if not isinstance(sources, list) or len(sources) != len(expected_sources):
        errors.append("provenance.sources")
    else:
        for actual, expected in zip(sources, expected_sources):
            if not isinstance(actual, dict) or any(
                actual.get(k) != v for k, v in expected.items()
            ):
                errors.append("provenance.sources must preserve pinned source identity")
                break
    scenarios = ask.get("scenarios")
    if not isinstance(scenarios, list) or not scenarios:
        errors.append("scenarios")
    else:
        ids = set()
        for i, case in enumerate(scenarios):
            if not isinstance(case, dict):
                errors.append(f"scenarios[{i}]")
                continue
            for key in ("id", "user_task", "setup", "success", "failure", "source"):
                if not text(case.get(key)):
                    errors.append(f"scenarios[{i}].{key}")
            for key in ("steps", "evidence"):
                if not texts(case.get(key)):
                    errors.append(f"scenarios[{i}].{key}")
            case_id = case.get("id")
            if text(case_id):
                if case_id in ids:
                    errors.append("scenario IDs must be unique")
                ids.add(case_id)
            identity = case.get("source")
            allowed = ["IXO-original"] + [
                f"{s['repository']}:{s['path']}@{s['revision']}"
                for s in provenance["sources"]
            ]
            if not isinstance(identity, str) or not any(
                identity == x or (x != "IXO-original" and identity.startswith(x + "#"))
                for x in allowed
            ):
                errors.append(f"scenarios[{i}].source")
    # Planned probes must stay inside the explicitly supplied exact grants.
    targets, actions = get(ask, "permissions.targets"), get(ask, "permissions.actions")
    if texts(targets) and any(
        "*" in x or x.strip().lower() in ("all", "any") for x in targets
    ):
        errors.append("permissions.targets must be exact and bounded")
    planned = ask.get("planned_actions", [])
    if not isinstance(planned, list):
        errors.append("planned_actions")
    else:
        for item in planned:
            if (
                not isinstance(item, dict)
                or not texts(targets)
                or not texts(actions)
                or (
                    item.get("target") not in targets
                    or item.get("action") not in actions
                )
            ):
                errors.append("planned_actions exceed explicit permissions")
    comparison = ask.get("comparison")
    if comparison is not None and (
        not isinstance(comparison, dict)
        or not texts(comparison.get("alternatives"))
        or not text(comparison.get("equivalent_conditions"))
    ):
        errors.append(
            "comparison requires identified alternatives and equivalent_conditions"
        )
    return {
        "status": "needs-input" if errors else "ready-for-approval",
        "errors": errors,
    }


def main(input_file=None, provenance_file=None, **kwargs):
    """Return a deterministic completeness check, without modifying the ask."""
    path = (
        Path(provenance_file)
        if provenance_file
        else Path(__file__).resolve().parents[1] / "PROVENANCE.json"
    )
    try:
        ask = json.loads(Path(input_file).read_text())
        provenance = json.loads(path.read_text())
        return validate(ask, provenance)
    except (OSError, ValueError, TypeError, KeyError) as exc:
        return {"status": "needs-input", "errors": [str(exc)]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_file")
    parser.add_argument("--provenance", dest="provenance_file")
    result = main(**vars(parser.parse_args()))
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["status"] == "ready-for-approval" else 1)
