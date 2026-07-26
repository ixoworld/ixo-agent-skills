#!/usr/bin/env python3
"""Validate the IXO Portal app skill package without third-party dependencies."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


REQUIRED_FILES = [
    "SKILL.md",
    "agents/openai.yaml",
    "references/portal-contract.md",
    "references/design-system.md",
    "references/review-checklist.md",
    "templates/index.html",
    "templates/styles.css",
    "templates/ixo-tokens.css",
    "templates/ixo-ui.css",
    "templates/portal-bridge.js",
    "templates/portal-theme.js",
    "templates/manifest.json",
]

# Themed CSS properties must be driven by --ixo-* tokens so the app follows
# the Portal scheme and whitelabel palette. Only ixo-tokens.css declares raw
# colour values.
RAW_COLOR_PATTERN = re.compile(r"(#[0-9a-fA-F]{3,8}\b|\brgba?\()")

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


def validate_theme_template(path: Path) -> None:
    theme = read(path)
    required_snippets = [
        "window.IxoPortalTheme",
        "applyInit",
        "dataset.portalTheme",
        "--ixo-",
        "onChange",
    ]
    for snippet in required_snippets:
        require(snippet in theme, f"portal-theme.js is missing required snippet: {snippet}")
    require("VALID_KEY" in theme and "MAX_VALUE_LENGTH" in theme, "portal-theme.js must validate host token keys and value length")


def validate_tokens_template(path: Path) -> None:
    tokens = read(path)
    required_snippets = [
        "--ixo-color-text",
        "--ixo-color-accent",
        "--ixo-font-scale",
        "--ixo-radius-md",
        '[data-portal-theme="dark"]',
        "prefers-color-scheme: dark",
        "prefers-reduced-motion: reduce",
    ]
    for snippet in required_snippets:
        require(snippet in tokens, f"ixo-tokens.css is missing required token or rule: {snippet}")
    require(
        ":root:not([data-portal-theme])" in tokens,
        "ixo-tokens.css must scope the prefers-color-scheme fallback so it cannot override a host-supplied theme",
    )


def validate_token_only_styles(root: Path) -> None:
    for rel in ("templates/styles.css", "templates/ixo-ui.css"):
        content = read(root / rel)
        stripped = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)
        match = RAW_COLOR_PATTERN.search(stripped)
        require(
            match is None,
            f"{rel} must use --ixo-* tokens instead of raw colour values (found {match.group(0) if match else ''})",
        )
        require("var(--ixo-" in stripped, f"{rel} must consume --ixo-* design tokens")


def validate_index_template(path: Path) -> None:
    html = read(path)
    for snippet in ("./ixo-tokens.css", "./ixo-ui.css", "./styles.css", "./portal-theme.js", "./portal-bridge.js"):
        require(snippet in html, f"index.html is missing required asset: {snippet}")
    require('name="color-scheme"' in html, "index.html must declare a color-scheme meta tag")
    require(
        html.index("./ixo-tokens.css") < html.index("./ixo-ui.css") < html.index("./styles.css"),
        "index.html must load ixo-tokens.css, then ixo-ui.css, then styles.css",
    )
    require(
        html.index("./portal-theme.js") < html.index("./portal-bridge.js"),
        "index.html must load portal-theme.js before portal-bridge.js",
    )


def validate_bridge_template(path: Path) -> None:
    bridge = read(path)
    required_snippets = [
        'const PROTOCOL = "ixo.portal.iframe.v1"',
        'const VERSION = "1.0"',
        'type: "READY"',
        'message.type === "INIT"',
        'event.origin !== nextPortalOrigin',
        'window.parent.postMessage',
        'window.IxoPortalBridge',
        'ACK_TIMEOUT_MS',
        'reportAnalytics',
        'reportError',
        'window.IxoPortalTheme',
        'onThemeChange',
    ]
    for snippet in required_snippets:
        require(snippet in bridge, f"portal-bridge.js is missing required snippet: {snippet}")
    require('postMessage(' in bridge and 'portalOrigin' in bridge, "bridge must post to the stored Portal origin after INIT")


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

    openai_yaml = read(root / "agents/openai.yaml")
    require('$ixo-portal-app' in openai_yaml, "agents/openai.yaml default_prompt must mention $ixo-portal-app")

    contract = read(root / "references/portal-contract.md")
    require("ixo.portal.iframe.v1" in contract, "portal contract must define the protocol")
    require("host.origin" in contract, "portal contract must cover host origin handling")
    require("signxTransaction" in contract, "portal contract must document transaction event handling")

    require("references/design-system.md" in skill_md, "SKILL.md must point to the design system reference")

    design = read(root / "references/design-system.md")
    require("--ixo-" in design, "design system must document the --ixo-* token namespace")
    require("light" in design and "dark" in design, "design system must cover light and dark schemes")

    contract_theme = read(root / "references/portal-contract.md")
    require("host.theme" in contract_theme or "theme" in contract_theme, "portal contract must document host theme delivery")

    checklist = read(root / "references/review-checklist.md")
    require("Missing origin validation" in checklist, "review checklist must include origin-validation blockers")
    require("Wildcard iframe origins" in checklist, "review checklist must include wildcard-origin blockers")
    require("Design Tokens" in checklist, "review checklist must include a design token section")
    require("Theming" in checklist, "review checklist must include a theming section")

    validate_manifest_template(root / "templates/manifest.json")
    validate_bridge_template(root / "templates/portal-bridge.js")
    validate_theme_template(root / "templates/portal-theme.js")
    validate_tokens_template(root / "templates/ixo-tokens.css")
    validate_token_only_styles(root)
    validate_index_template(root / "templates/index.html")


def main() -> None:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    require(root.is_dir(), f"skill root does not exist: {root}")
    validate_package(root)
    print(f"OK: {root}")


if __name__ == "__main__":
    main()
