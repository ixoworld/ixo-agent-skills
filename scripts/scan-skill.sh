#!/bin/bash

# Security-scan a skill folder with NVIDIA SkillSpector before submitting.
# Mirrors the automated check in .github/workflows/scan-skill.yml.
# Usage: ./scripts/scan-skill.sh skills/my-skill-name [--no-llm]

set -e

SKILL_DIR="$1"
shift || true

if [ -z "$SKILL_DIR" ]; then
    echo "Usage: $0 <skill-directory> [extra skillspector args]"
    echo "Example: $0 skills/my-skill-name"
    echo "Example: $0 skills/my-skill-name --no-llm   # static-only, no API key needed"
    exit 1
fi

if [ ! -d "$SKILL_DIR" ]; then
    echo "Error: Directory '$SKILL_DIR' does not exist"
    exit 1
fi

if ! command -v skillspector >/dev/null 2>&1; then
    echo "Error: 'skillspector' is not installed."
    echo ""
    echo "Install it (requires Python 3.12+):"
    echo "  pip install \"git+https://github.com/NVIDIA/SkillSpector.git@2eb844780ab163f01468ecf142c40a2ec0fcaec0\""
    echo ""
    echo "LLM analysis (optional) needs a provider key, e.g.:"
    echo "  export SKILLSPECTOR_PROVIDER=anthropic"
    echo "  export ANTHROPIC_API_KEY=sk-..."
    echo "Or run static-only with: $0 $SKILL_DIR --no-llm"
    exit 1
fi

echo "Scanning skill: $(basename "$SKILL_DIR")"
echo "================================"

# SkillSpector exits non-zero (1) when the risk score exceeds its threshold.
skillspector scan "$SKILL_DIR" "$@"
