#!/usr/bin/env python3
"""
Validate Flow Improvement Agent templates.

Usage: python3 validate_meta_skill_templates.py <templates_dir>
"""

import json
import sys
from pathlib import Path


REQUIRED_JOB_FIELDS = [
    "jobId",
    "cadence",
    "inputScope",
    "evaluationGoal",
    "requiredEvidence",
    "outputTemplate",
    "handoffTarget",
]

REQUIRED_REPORT_FIELDS = [
    "flowId",
    "cohortWindow",
    "udidCount",
    "successPatterns",
    "failurePatterns",
    "blockedOverduePatterns",
    "actorCapabilityPatterns",
    "recommendedProposals",
]

REQUIRED_PROPOSAL_FIELDS = [
    "proposalId",
    "proposalType",
    "proposalOnly",
    "affectedSurface",
    "evidenceSummary",
    "supportingEvidence",
    "proposedChange",
    "expectedBenefit",
    "risk",
    "approvalRequirement",
    "handoffTarget",
    "regressionWatchMetric",
]

FORBIDDEN_DIRECT_ACTION_TERMS = [
    "call setup_flow",
    "execute AgentCommand",
    "directly patch runtime code",
    "git apply",
    "merge this patch",
]


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def require_fields(obj, fields, label):
    errors = []
    for field in fields:
        if field not in obj:
            errors.append(f"{label} missing {field}")
    return errors


def validate_cron_jobs(path):
    errors = []
    data = load_json(path)
    jobs = data.get("jobs")
    if not isinstance(jobs, list) or not jobs:
        return ["cron-evaluation-jobs.json must contain a non-empty jobs list"]
    seen = set()
    for index, job in enumerate(jobs):
        label = f"jobs[{index}]"
        errors.extend(require_fields(job, REQUIRED_JOB_FIELDS, label))
        job_id = job.get("jobId")
        if job_id in seen:
            errors.append(f"{label} duplicate jobId {job_id}")
        seen.add(job_id)
        if not isinstance(job.get("requiredEvidence"), list) or not job.get("requiredEvidence"):
            errors.append(f"{label} requiredEvidence must be a non-empty list")
    return errors


def validate_report(path):
    data = load_json(path)
    errors = require_fields(data, REQUIRED_REPORT_FIELDS, "udid-evaluation-report.json")
    if data.get("udidCount", 0) < 1:
        errors.append("udid-evaluation-report.json udidCount should be a positive example")
    if not isinstance(data.get("recommendedProposals"), list):
        errors.append("udid-evaluation-report.json recommendedProposals must be a list")
    return errors


def validate_proposal(path, expected_type):
    data = load_json(path)
    errors = require_fields(data, REQUIRED_PROPOSAL_FIELDS, path.name)
    if data.get("proposalType") != expected_type:
        errors.append(f"{path.name} proposalType must be {expected_type}")
    if data.get("proposalOnly") is not True:
        errors.append(f"{path.name} proposalOnly must be true")
    serialized = json.dumps(data, sort_keys=True)
    for term in FORBIDDEN_DIRECT_ACTION_TERMS:
        if term in serialized:
            errors.append(f"{path.name} includes forbidden direct-action term: {term}")
    if "approval" not in json.dumps(data.get("approvalRequirement", "")).lower():
        errors.append(f"{path.name} approvalRequirement must mention approval")
    return errors


def validate_routing(path):
    data = load_json(path)
    errors = []
    cases = data.get("cases")
    if not isinstance(cases, list) or len(cases) < 5:
        errors.append("skill-routing-smoke-tests.json must include at least five cases")
    expected = {"flow-improvement-agent", "flow-agent", "manage-flow"}
    seen = {case.get("expectedSkill") for case in cases or []}
    missing = expected - seen
    if missing:
        errors.append(f"skill-routing-smoke-tests.json missing expected skills: {', '.join(sorted(missing))}")
    negative_checks = data.get("negativeChecks")
    if not isinstance(negative_checks, list) or len(negative_checks) < 5:
        errors.append("skill-routing-smoke-tests.json must include negative checks")
    return errors


def main(templates_dir=None, **kwargs):
    root = Path(templates_dir or "").resolve()
    errors = []

    if not root.is_dir():
        return {"ok": False, "errors": [f"Templates directory does not exist: {root}"]}

    files = {
        "cron": root / "cron-evaluation-jobs.json",
        "report": root / "udid-evaluation-report.json",
        "flow": root / "flow-design-patch-proposal.json",
        "runtime": root / "runtime-engine-patch-proposal.json",
        "routing": root / "skill-routing-smoke-tests.json",
    }

    for label, path in files.items():
        if not path.is_file():
            errors.append(f"Missing template: {path.name}")

    if errors:
        return {"ok": False, "errors": errors}

    try:
        errors.extend(validate_cron_jobs(files["cron"]))
        errors.extend(validate_report(files["report"]))
        errors.extend(validate_proposal(files["flow"], "flow-design"))
        errors.extend(validate_proposal(files["runtime"], "runtime-engine"))
        errors.extend(validate_routing(files["routing"]))
    except json.JSONDecodeError as exc:
        errors.append(f"Invalid JSON: {exc}")

    return {"ok": not errors, "errors": errors}


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 validate_meta_skill_templates.py <templates_dir>")
        sys.exit(1)

    result = main(templates_dir=sys.argv[1])
    if result["ok"]:
        print("Flow Improvement Agent template validation PASSED")
        sys.exit(0)

    print("Flow Improvement Agent template validation FAILED")
    for error in result["errors"]:
        print(f"- {error}")
    sys.exit(1)

