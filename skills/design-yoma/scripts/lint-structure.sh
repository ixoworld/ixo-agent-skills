#!/usr/bin/env bash
#
# lint-structure.sh — structural check on the design-yoma skill itself.
#
# Verifies that:
#   1. the SKILL.md frontmatter meets the agent-skills registry contract
#   2. every file referenced from SKILL.md exists, and nothing is orphaned
#   3. the five phase references are present, correctly named
#   4. every control in internal-controls.md resolves to exactly one phase reference
#   5. no gate-era vocabulary survives outside genuine rubric-schema contexts
#
# Usage:  ./scripts/lint-structure.sh
# Exit:   0 clean, 1 on any failure.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL="$ROOT/SKILL.md"
CONTROLS="$ROOT/references/internal-controls.md"
FAILURES=0

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
dim()   { printf '\033[2m%s\033[0m\n' "$*"; }

fail() { red "  FAIL  $*"; FAILURES=$((FAILURES + 1)); }
pass() { green "  ok    $*"; }

[ -f "$SKILL" ] || { red "SKILL.md not found at $SKILL"; exit 1; }

# ── 1. Frontmatter contract ──────────────────────────────────────────────────
echo
echo "Frontmatter"

if [ "$(head -n1 "$SKILL")" != "---" ]; then
  fail "SKILL.md does not open with YAML frontmatter"
else
  FM="$(awk 'NR>1 && /^---$/{exit} NR>1' "$SKILL")"

  NAME="$(printf '%s\n' "$FM" | grep -E '^name:' | head -1 | sed 's/^name:[[:space:]]*//')"
  FOLDER="$(basename "$ROOT")"

  if [ -z "$NAME" ]; then
    fail "no 'name' field"
  elif [ "$NAME" != "$FOLDER" ]; then
    fail "name '$NAME' does not match folder '$FOLDER' (registry requires an exact match)"
  elif ! printf '%s' "$NAME" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*$'; then
    fail "name '$NAME' is not lowercase-alphanumeric-with-hyphens"
  else
    pass "name '$NAME' matches folder and naming rules"
  fi

  DESC="$(printf '%s\n' "$FM" | awk '/^description:/{f=1;next} /^[a-z-]+:/{f=0} f' | tr -d '\n')"
  DESC_LEN=${#DESC}
  if [ "$DESC_LEN" -eq 0 ]; then
    fail "no 'description' field"
  elif [ "$DESC_LEN" -gt 1024 ]; then
    fail "description is $DESC_LEN chars (registry limit is 1024)"
  else
    pass "description is $DESC_LEN chars (limit 1024)"
  fi
fi

# ── 2. Referenced files exist ────────────────────────────────────────────────
echo
echo "Referenced files"

REFS="$(grep -oE '(references|templates|scripts)/[A-Za-z0-9._-]+' "$SKILL" | sort -u)"
MISSING=0
while IFS= read -r ref; do
  [ -z "$ref" ] && continue
  [ -f "$ROOT/$ref" ] || { fail "$ref referenced in SKILL.md but not found"; MISSING=$((MISSING + 1)); }
done <<< "$REFS"
[ "$MISSING" -eq 0 ] && pass "$(printf '%s\n' "$REFS" | grep -c .) referenced files all exist"

echo
echo "Orphans"
ORPHANS=0
for f in "$ROOT"/references/*.md "$ROOT"/templates/* "$ROOT"/scripts/*; do
  [ -f "$f" ] || continue
  rel="${f#"$ROOT"/}"
  grep -qF "$rel" "$SKILL" || { dim "  note  $rel is not referenced from SKILL.md"; ORPHANS=$((ORPHANS + 1)); }
done
[ "$ORPHANS" -eq 0 ] && pass "no orphaned files"

# ── 3. Phase references ──────────────────────────────────────────────────────
echo
echo "Phases"

EXPECTED_PHASES="1-discovery 2-design 3-validation 4-testing 5-deployment"
PHASE_OK=1
for p in $EXPECTED_PHASES; do
  if [ ! -f "$ROOT/references/phase-$p.md" ]; then
    fail "references/phase-$p.md missing"
    PHASE_OK=0
  fi
done
# no stale phase files from the gate-era naming.
# Only phase-<digit>-*.md are phase files; phase-commitments.md is a mechanism reference.
for f in "$ROOT"/references/phase-[0-9]-*.md; do
  [ -f "$f" ] || continue
  base="$(basename "$f" .md)"
  stem="${base#phase-}"
  case " $EXPECTED_PHASES " in
    *" $stem "*) ;;
    *) fail "unexpected phase file: $(basename "$f")"; PHASE_OK=0 ;;
  esac
done
[ "$PHASE_OK" -eq 1 ] && pass "phases 1-discovery … 5-deployment all present, none stale"

# ── 4. Control coverage ──────────────────────────────────────────────────────
echo
echo "Control coverage"

if [ ! -f "$CONTROLS" ]; then
  fail "references/internal-controls.md not found"
else
  # Control ids from the internal-controls tables: rows like  | C11 | `claim_and_rubric` | …
  IDS="$(grep -oE '^\| C[0-9]+ \| `[a-z_]+`' "$CONTROLS" | grep -oE 'C[0-9]+|`[a-z_]+`' | paste - - | tr -d '`')"
  COUNT="$(printf '%s\n' "$IDS" | grep -c .)"

  if [ "$COUNT" -eq 0 ]; then
    fail "no controls parsed from internal-controls.md"
  else
    BAD=0
    while IFS=$'\t' read -r id name; do
      [ -z "$id" ] && continue
      hits=0
      for phase in "$ROOT"/references/phase-[0-9]-*.md; do
        [ -f "$phase" ] || continue
        grep -qE "^## $id · \`$name\`" "$phase" && hits=$((hits + 1))
      done
      if [ "$hits" -eq 0 ]; then
        fail "$id \`$name\` has no '## $id · \`$name\`' heading in any phase reference"
        BAD=$((BAD + 1))
      elif [ "$hits" -gt 1 ]; then
        fail "$id \`$name\` appears in $hits phase references (must be exactly one)"
        BAD=$((BAD + 1))
      fi
    done <<< "$IDS"
    [ "$BAD" -eq 0 ] && pass "all $COUNT controls resolve to exactly one phase reference"
  fi
fi

# ── 5. No gate-era vocabulary ────────────────────────────────────────────────
echo
echo "Vocabulary"

# `gates:` / `"@type": Gate` / RubricGate are legitimate — they are the rubric schema.
STALE="$(grep -rniE '\bgates? [0-9]+' "$ROOT/references" "$ROOT/templates" "$SKILL" 2>/dev/null \
         | grep -viE 'rubric|"@type": Gate|onFail|GATES —' || true)"
if [ -n "$STALE" ]; then
  fail "gate-era numbering survives:"
  printf '%s\n' "$STALE" | sed 's/^/          /'
else
  pass "no gate-era numbering outside rubric-schema contexts"
fi

# ── Result ───────────────────────────────────────────────────────────────────
echo
if [ "$FAILURES" -eq 0 ]; then
  green "PASS — design-yoma structure is consistent."
  exit 0
else
  red "FAIL — $FAILURES problem(s) found."
  exit 1
fi
