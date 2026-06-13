#!/usr/bin/env python3
"""Validate the IXO Portal app skill package without third-party dependencies."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


REQUIRED_FILES = [
    "SKILL.md",
    "AGENTS.md",
    "DESIGN.md",
    "agents/openai.yaml",
    "references/portal-contract.md",
    "references/review-checklist.md",
    "templates/index.html",
    "templates/styles.css",
    "templates/portal-bridge.js",
    "templates/manifest.json",
]

FORBIDDEN_NAMES = {".DS_Store", "__pycache__"}


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def parse_frontmatter(skill_md: str) -> dict[str, str]:
    match = re.match(r"^---\n(.*?)\n---\n", skill_md, re.DOTALL)
    require(match is not None, "SKILL.md must start with YAML frontmatter")
    fields: dict[str, str] = {}
    for raw_line in match.group(1).splitlines():
        if not raw_line.strip() or raw_line.strip().startswith("#"):
            continue
        key, sep, value = raw_line.partition(":")
        require(bool(sep), f"frontmatter line is missing ':' separator: {raw_line}")
        fields[key.strip()] = value.strip().strip('"').strip("'")
    return fields


def validate_manifest_template(path: Path) -> None:
    manifest = json.loads(read(path))
    require(manifest.get("protocol") == "ixo.portal.iframe.v1", "manifest protocol must be ixo.portal.iframe.v1")
    require(manifest.get("appId") == "{{APP_ID}}", "manifest appId should remain a placeholder")
    require(manifest.get("iframe", {}).get("src") == "{{IFRAME_URL}}", "manifest iframe.src should remain a placeholder")
    features = manifest.get("features", {})
    require(features.get("resize") is True, "template should enable resize support")
    require(features.get("navigate") is True, "template should enable navigate support")


def validate_bridge_template(path: Path) -> None:
    bridge = read(path)
    required_snippets = [
        'const PROTOCOL = "ixo.portal.iframe.v1"',
        'const VERSION = "1.0"',
        'type: "READY"',
        'message.type === "INIT"',
        'message.type === "NAVIGATE"',
        'message.type === "ACTION"',
        'event.origin !== nextPortalOrigin',
        'window.parent.postMessage',
        'window.IxoPortalBridge',
        'ACK_TIMEOUT_MS',
        'autoResize',
        'onNavigate',
        'onAction',
        'reportAnalytics',
        'reportError',
    ]
    for snippet in required_snippets:
        require(snippet in bridge, f"portal-bridge.js is missing required snippet: {snippet}")
    require('postMessage(' in bridge and 'portalOrigin' in bridge, "bridge must post to the stored Portal origin after INIT")


def validate_styles_template(path: Path) -> None:
    styles = read(path)
    require("#0885ff" in styles, "styles.css must use the DESIGN.md accent token #0885ff")
    require("data-portal-theme" in styles, "styles.css must honor the data-portal-theme attribute set by the bridge")
    forbidden = ["#00d2ff", "glassmorphism", "linear-gradient"]
    for token in forbidden:
        require(token not in styles, f"styles.css contains off-design value: {token}")


def validate_package(root: Path) -> None:
    for rel in REQUIRED_FILES:
        require((root / rel).is_file(), f"missing required file: {rel}")

    for path in root.rglob("*"):
        require(path.name not in FORBIDDEN_NAMES, f"forbidden generated artifact present: {path.relative_to(root)}")

    skill_md = read(root / "SKILL.md")
    fields = parse_frontmatter(skill_md)
    require(fields.get("name") == "ixo-portal-app", "frontmatter name must be ixo-portal-app")
    require("IXO Portal" in fields.get("description", ""), "frontmatter description must mention IXO Portal")
    require(".claude/" not in skill_md, "SKILL.md must not reference Claude-local paths")
    require("references/portal-contract.md" in skill_md, "SKILL.md must point to the Portal contract reference")
    require("references/review-checklist.md" in skill_md, "SKILL.md must point to the review checklist")
    require("DESIGN.md" in skill_md, "SKILL.md must point to the DESIGN.md design system")

    agents_md = read(root / "AGENTS.md")
    require("DESIGN.md" in agents_md, "AGENTS.md must point to DESIGN.md as the design source of truth")
    require("One Accent Rule" in agents_md, "AGENTS.md must carry the DESIGN.md color rules")
    require("SKILL.md" in agents_md, "AGENTS.md must point agents at SKILL.md for the workflow")
    require("validate_skill.py" in agents_md, "AGENTS.md must tell agents to run the package validator")

    openai_yaml = read(root / "agents/openai.yaml")
    require('$ixo-portal-app' in openai_yaml, "agents/openai.yaml default_prompt must mention $ixo-portal-app")

    contract = read(root / "references/portal-contract.md")
    require("ixo.portal.iframe.v1" in contract, "portal contract must define the protocol")
    require("host.origin" in contract, "portal contract must cover host origin handling")
    require("signxTransaction" in contract, "portal contract must document transaction event handling")

    checklist = read(root / "references/review-checklist.md")
    require("Missing origin validation" in checklist, "review checklist must include origin-validation blockers")
    require("Wildcard iframe origins" in checklist, "review checklist must include wildcard-origin blockers")
    require("ALLOWED_PORTAL_ORIGINS" in checklist, "review checklist must cover the production bridge allowlist")
    require("ALLOWED_PORTAL_ORIGINS" in skill_md, "SKILL.md must require stripping development origins for production")

    validate_manifest_template(root / "templates/manifest.json")
    validate_bridge_template(root / "templates/portal-bridge.js")
    validate_styles_template(root / "templates/styles.css")


def main() -> None:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    require(root.is_dir(), f"skill root does not exist: {root}")
    validate_package(root)
    print(f"OK: {root}")


if __name__ == "__main__":
    main()
