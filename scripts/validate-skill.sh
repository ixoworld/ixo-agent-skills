#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <skill-directory>" >&2
  exit 1
fi
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
exec node --import "$SCRIPT_DIR/../node_modules/tsx/dist/loader.mjs" "$SCRIPT_DIR/capsules.ts" validate --directory "$1"
