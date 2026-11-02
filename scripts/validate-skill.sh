#!/bin/bash
# Validate a flat or namespaced skill using the shared catalog rules.
set -euo pipefail
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <skill-directory>" >&2
  exit 1
fi
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
exec python3 "$SCRIPT_DIR/skill_catalog.py" --repo "$SCRIPT_DIR/.." validate-skill "$1"
