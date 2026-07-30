#!/usr/bin/env python3
"""Validate the systems-thinking-strategist skill package.

This intentionally uses only the Python standard library so it can run in a
bare Codex environment without PyYAML or a Node toolchain.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


MAX_SKILL_LINES = 500
MAX_DESCRIPTION_CHARS = 1024
REQUIRED_PATHS = [
    "SKILL.md",
    "agents/openai.yaml",
    "references/intake-interview.md",
    "references/meadows-framework.md",
    "templates/intervention-brief.jsx",
    "scripts/validate_skill.py",
]
STALE_PATHS = [
    ".DS_Store",
    "__pycache__",
    "resources",
    "code",
    "scripts/__pycache__",
]


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError(f"{path} is not valid UTF-8: {exc}") from exc


def parse_frontmatter(skill_md: str) -> dict[str, str]:
    match = re.match(r"^---\n(.*?)\n---\n", skill_md, re.DOTALL)
    if not match:
        raise ValueError("SKILL.md must start with YAML frontmatter")

    frontmatter: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if not line or line.startswith(" "):
            continue
        field = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if not field:
            continue
        key, value = field.groups()
        frontmatter[key] = value.strip().strip('"').strip("'")
    return frontmatter


def validate(root: Path) -> list[str]:
    errors: list[str] = []

    for rel_path in REQUIRED_PATHS:
        if not (root / rel_path).exists():
            errors.append(f"missing required path: {rel_path}")

    for rel_path in STALE_PATHS:
        if (root / rel_path).exists():
            errors.append(f"stale package artifact should not be present: {rel_path}")

    skill_path = root / "SKILL.md"
    if not skill_path.exists():
        return errors

    skill_md = read_text(skill_path)
    try:
        frontmatter = parse_frontmatter(skill_md)
    except ValueError as exc:
        errors.append(str(exc))
        frontmatter = {}

    name = frontmatter.get("name", "")
    description = frontmatter.get("description", "")
    if name != "systems-thinking-strategist":
        errors.append("frontmatter name must be systems-thinking-strategist")
    if not re.fullmatch(r"[a-z0-9-]+", name):
        errors.append("frontmatter name must be lowercase hyphen-case")
    if not description:
        errors.append("frontmatter description is required")
    if len(description) > MAX_DESCRIPTION_CHARS:
        errors.append(f"frontmatter description exceeds {MAX_DESCRIPTION_CHARS} chars")
    if "<" in description or ">" in description:
        errors.append("frontmatter description must not contain angle brackets")

    line_count = len(skill_md.splitlines())
    if line_count > MAX_SKILL_LINES:
        errors.append(f"SKILL.md has {line_count} lines; keep it under {MAX_SKILL_LINES}")

    stale_tokens = ["resources/", "code/intervention-brief-preview.jsx"]
    for token in stale_tokens:
        if token in skill_md:
            errors.append(f"SKILL.md still references stale token: {token}")

    path_refs = sorted(set(re.findall(r"`((?:agents|references|scripts|templates)/[^`]+)`", skill_md)))
    for rel_path in path_refs:
        if not (root / rel_path).exists():
            errors.append(f"SKILL.md references missing path: {rel_path}")

    openai_yaml_path = root / "agents/openai.yaml"
    if openai_yaml_path.exists():
        openai_yaml = read_text(openai_yaml_path)
        if 'display_name: "Systems Thinking Strategist"' not in openai_yaml:
            errors.append("agents/openai.yaml display_name is missing or stale")
        if "$systems-thinking-strategist" not in openai_yaml:
            errors.append("agents/openai.yaml default_prompt must mention $systems-thinking-strategist")

    template_path = root / "templates/intervention-brief.jsx"
    if template_path.exists():
        template = read_text(template_path)
        for token in ["const ANALYSIS_DATA", "export default function SystemsInterventionBrief"]:
            if token not in template:
                errors.append(f"template missing expected token: {token}")
        if "/mnt/user-data/outputs" in template:
            errors.append("template should not hard-code /mnt/user-data/outputs")

    return errors


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    errors = validate(root)
    if errors:
        print("Skill validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Skill validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
