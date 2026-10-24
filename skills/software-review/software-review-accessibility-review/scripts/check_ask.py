#!/usr/bin/env python3
"""Check a draft review ask offline; never executes tests or authorises actions.

Usage: python3 scripts/check_ask.py ask.json [--provenance PROVENANCE.json]
       python3 scripts/check_ask.py --template > ask.json
Exit 0 means structurally ready for human approval; exit 1 lists missing/invalid
inputs. --template prints a blank draft carrying this skill's provenance.
main(input_file=..., provenance_file=..., template=..., **kwargs) returns the result.
"""

import argparse
import copy
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
BROAD_TARGETS = ("all", "any", "every", "everything", "prod", "production")


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


def pinned_sources(provenance):
    return [{k: s[k] for k in SOURCE_FIELDS} for s in provenance["sources"]]


def blank_ask(provenance):
    """Return a blank needs-input draft with this skill's identity filled in."""
    ask = {"status": "needs-input"}
    for dotted in TEXT_FIELDS + LIST_FIELDS:
        *parents, leaf = dotted.split(".")
        node = ask
        for key in parents:
            node = node.setdefault(key, {})
        node[leaf] = [] if dotted in LIST_FIELDS else None
    ask["provenance"] = {
        "skill": provenance["skill"],
        "kind": provenance["kind"],
        "upstream_skill_name": provenance["upstream_skill_name"],
        "sources": pinned_sources(provenance),
    }
    ask["scenarios"] = []
    ask["planned_actions"] = None
    ask["missing_inputs"] = []
    ask["decisions"] = copy.deepcopy(DECISIONS)
    return ask


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
    expected_sources = pinned_sources(provenance)
    if not isinstance(sources, list) or len(sources) != len(expected_sources):
        errors.append("provenance.sources")
    else:
        # Compare the pinned identity fields only, in any order.
        actual = [
            {k: s.get(k) for k in SOURCE_FIELDS} if isinstance(s, dict) else s
            for s in sources
        ]
        if any(s not in actual for s in expected_sources):
            errors.append("provenance.sources must preserve pinned source identity")
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
        "*" in x or x.strip().lower() in BROAD_TARGETS for x in targets
    ):
        errors.append("permissions.targets must be exact and bounded")
    planned = ask.get("planned_actions")
    if planned is None:
        planned = []
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


def main(input_file=None, provenance_file=None, template=False, **kwargs):
    """Return a deterministic completeness check, without modifying the ask."""
    path = (
        Path(provenance_file)
        if provenance_file
        else Path(__file__).resolve().parents[1] / "PROVENANCE.json"
    )
    try:
        provenance = json.loads(path.read_text(encoding="utf-8"))
        if template:
            return blank_ask(provenance)
        ask = json.loads(Path(input_file).read_text(encoding="utf-8"))
        return validate(ask, provenance)
    except (OSError, ValueError, TypeError, KeyError) as exc:
        return {"status": "needs-input", "errors": [str(exc)]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_file", nargs="?")
    parser.add_argument("--provenance", dest="provenance_file")
    parser.add_argument(
        "--template", action="store_true", help="print a blank draft and exit"
    )
    args = parser.parse_args()
    if not args.template and not args.input_file:
        parser.error("an ask file is required unless --template is given")
    result = main(**vars(args))
    print(json.dumps(result, indent=2))
    if args.template:
        raise SystemExit(1 if "errors" in result else 0)
    raise SystemExit(0 if result["status"] == "ready-for-approval" else 1)
