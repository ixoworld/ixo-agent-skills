#!/usr/bin/env python3
"""
Validate the Flow Agent skill package layout and documentation.

Usage: python3 validate_flow_agent_package.py <skill_dir>
"""

import re
import sys
from pathlib import Path


REQUIRED_FILES = [
    "SKILL.md",
    "agents/openai.yaml",
    "references/flow-agent-runtime-contract.md",
    "references/ralph-loop-runbook.md",
    "references/ucan-guardrails.md",
    "references/command-payloads.md",
    "references/observability-and-replay.md",
    "templates/agent-command-examples.json",
    "templates/ralph-loop-checklist.json",
    "templates/skill-routing-smoke-tests.json",
    "scripts/validate_flow_agent_package.py",
    "scripts/validate_command_templates.py",
]

REQUIRED_SKILL_TERMS = [
    "$manage-flow",
    "propose_config_change",
    "FlowAgentService",
    "agentOutbox",
    "agentLeases",
    "auditTrail",
    "UCAN",
    "lease",
    "idempotency",
]


def read_text(path):
    return path.read_text(encoding="utf-8")


def parse_frontmatter(skill_md):
    text = read_text(skill_md)
    match = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    if not match:
        return None, text
    fields = {}
    for line in match.group(1).splitlines():
        if ":" in line and not line.startswith(" "):
            key, value = line.split(":", 1)
            fields[key.strip()] = value.strip().strip("'\"")
    return fields, text


def script_has_main(path):
    text = read_text(path)
    return "def main(" in text and "**kwargs" in text and "if __name__ == \"__main__\"" in text


def main(skill_dir=None, **kwargs):
    root = Path(skill_dir or ".").resolve()
    errors = []

    if not root.exists():
        return {"ok": False, "errors": [f"Skill directory does not exist: {root}"]}

    if root.name != "flow-agent":
        errors.append(f"Skill folder must be named flow-agent, got {root.name}")

    for rel_path in REQUIRED_FILES:
        if not (root / rel_path).is_file():
            errors.append(f"Missing required file: {rel_path}")

    for clutter in ["README.md", "INSTALLATION_GUIDE.md", "CHANGELOG.md", "QUICK_REFERENCE.md"]:
        if (root / clutter).exists():
            errors.append(f"Remove non-skill documentation clutter: {clutter}")

    skill_md = root / "SKILL.md"
    if skill_md.exists():
        frontmatter, body = parse_frontmatter(skill_md)
        if not frontmatter:
            errors.append("SKILL.md is missing YAML frontmatter")
        else:
            if frontmatter.get("name") != "flow-agent":
                errors.append("SKILL.md frontmatter name must be flow-agent")
            description = frontmatter.get("description", "")
            if not description:
                errors.append("SKILL.md frontmatter description is required")
            if len(description) > 1024:
                errors.append("SKILL.md frontmatter description exceeds 1024 characters")
        for term in REQUIRED_SKILL_TERMS:
            if term not in body:
                errors.append(f"SKILL.md must mention {term}")
        for rel_path in REQUIRED_FILES[1:]:
            if rel_path.startswith(("references/", "templates/", "scripts/")) and rel_path not in body:
                if rel_path.startswith("references/"):
                    errors.append(f"SKILL.md load order must reference {rel_path}")

    openai_yaml = root / "agents/openai.yaml"
    if openai_yaml.exists():
        text = read_text(openai_yaml)
        if 'display_name: "Flow Agent"' not in text:
            errors.append("agents/openai.yaml must set display_name to Flow Agent")
        if "$flow-agent" not in text:
            errors.append("agents/openai.yaml default_prompt must mention $flow-agent")

    for script in ["scripts/validate_flow_agent_package.py", "scripts/validate_command_templates.py"]:
        path = root / script
        if path.exists() and not script_has_main(path):
            errors.append(f"{script} must define main(..., **kwargs) and CLI handler")

    return {"ok": not errors, "errors": errors}


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 validate_flow_agent_package.py <skill_dir>")
        sys.exit(1)

    result = main(skill_dir=sys.argv[1])
    if result["ok"]:
        print("Flow Agent skill package validation PASSED")
        sys.exit(0)

    print("Flow Agent skill package validation FAILED")
    for error in result["errors"]:
        print(f"- {error}")
    sys.exit(1)
