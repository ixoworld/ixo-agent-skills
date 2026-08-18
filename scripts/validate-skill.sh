#!/bin/bash

# Validate a skill folder structure and SKILL.md content
# Usage: ./scripts/validate-skill.sh skills/my-skill-name

set -e

SKILL_DIR="$1"

if [ -z "$SKILL_DIR" ]; then
    echo "Usage: $0 <skill-directory>"
    echo "Example: $0 skills/my-skill-name"
    exit 1
fi

if [ ! -d "$SKILL_DIR" ]; then
    echo "Error: Directory '$SKILL_DIR' does not exist"
    exit 1
fi

SKILL_NAME=$(basename "$SKILL_DIR")
ERRORS=0

echo "Validating skill: $SKILL_NAME"
echo "================================"

# Check folder name format
echo -n "Checking folder name format... "
if echo "$SKILL_NAME" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*$'; then
    echo "OK"
else
    echo "FAILED"
    echo "  Error: Folder name must be lowercase alphanumeric with single hyphens"
    echo "  Got: $SKILL_NAME"
    ERRORS=$((ERRORS + 1))
fi

# Check folder name length
echo -n "Checking folder name length... "
if [ ${#SKILL_NAME} -le 64 ]; then
    echo "OK (${#SKILL_NAME} chars)"
else
    echo "FAILED"
    echo "  Error: Folder name must be 64 characters or less"
    echo "  Got: ${#SKILL_NAME} characters"
    ERRORS=$((ERRORS + 1))
fi

# Check SKILL.md exists
echo -n "Checking SKILL.md exists... "
if [ -f "$SKILL_DIR/SKILL.md" ]; then
    echo "OK"
else
    echo "FAILED"
    echo "  Error: SKILL.md not found in $SKILL_DIR"
    ERRORS=$((ERRORS + 1))
    echo ""
    echo "Validation failed with $ERRORS error(s)"
    exit 1
fi

# Extract frontmatter
FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$SKILL_DIR/SKILL.md" | sed '1d;$d')

echo -n "Checking YAML frontmatter... "
if [ -n "$FRONTMATTER" ]; then
    echo "OK"
else
    echo "FAILED"
    echo "  Error: No YAML frontmatter found (must be between --- delimiters)"
    ERRORS=$((ERRORS + 1))
    echo ""
    echo "Validation failed with $ERRORS error(s)"
    exit 1
fi

# Check 'name' field
echo -n "Checking 'name' field... "
NAME_VALUE=$(echo "$FRONTMATTER" | grep -E '^name:' | sed 's/name:[[:space:]]*//' | tr -d '"' | tr -d "'")
if [ -n "$NAME_VALUE" ]; then
    echo "OK ($NAME_VALUE)"
else
    echo "FAILED"
    echo "  Error: Missing required 'name' field in frontmatter"
    ERRORS=$((ERRORS + 1))
fi

# Check name matches folder
echo -n "Checking name matches folder... "
if [ "$NAME_VALUE" = "$SKILL_NAME" ]; then
    echo "OK"
else
    echo "FAILED"
    echo "  Error: Folder name '$SKILL_NAME' does not match frontmatter name '$NAME_VALUE'"
    ERRORS=$((ERRORS + 1))
fi

# Check 'description' field
echo -n "Checking 'description' field... "
DESC_VALUE=$(echo "$FRONTMATTER" | grep -E '^description:' | sed 's/description:[[:space:]]*//')
if [ -n "$DESC_VALUE" ]; then
    # Check description length (rough estimate, may include quotes)
    DESC_LEN=${#DESC_VALUE}
    if [ $DESC_LEN -le 1024 ]; then
        echo "OK ($DESC_LEN chars)"
    else
        echo "FAILED"
        echo "  Error: Description exceeds 1024 characters ($DESC_LEN chars)"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "FAILED"
    echo "  Error: Missing required 'description' field in frontmatter"
    ERRORS=$((ERRORS + 1))
fi

# Check for optional fields (informational)
echo ""
echo "Optional fields:"
echo -n "  license: "
LICENSE=$(echo "$FRONTMATTER" | grep -E '^license:' | sed 's/license:[[:space:]]*//')
if [ -n "$LICENSE" ]; then
    echo "$LICENSE"
else
    echo "(not set)"
fi

echo -n "  compatibility: "
COMPAT=$(echo "$FRONTMATTER" | grep -E '^compatibility:' | sed 's/compatibility:[[:space:]]*//')
if [ -n "$COMPAT" ]; then
    echo "$COMPAT"
else
    echo "(not set)"
fi

# allowed-tools must be an inline string ("shell", "write, shell"). The capsule server
# rejects any YAML sequence with "expected string, received array", and it does so on
# upload — which happens on merge to main, so the first sign of a bad value is a red
# publish workflow on a branch that already landed. Checking it here is the difference
# between a failed local run and a second PR.
#
# Reporting it needs more than the value: with the block-sequence form there is nothing
# after the colon, so the old `grep | sed` printed "(not set)" — indistinguishable from
# the field being omitted, and the run still said PASSED.
echo -n "  allowed-tools: "
TOOLS_STATE=$(echo "$FRONTMATTER" | awk '
    function clean(v) {
        gsub(/["\x27]/, "", v)
        sub(/^[ \t]+/, "", v); sub(/[ \t]+$/, "", v)
        return v
    }
    /^allowed-tools:/ {
        value = $0
        sub(/^allowed-tools:[ \t]*/, "", value)
        value = clean(value)

        # Flow sequence: allowed-tools: [shell] — an array to YAML, same rejection.
        if (value ~ /^\[/) {
            gsub(/^\[|\]$/, "", value)
            gsub(/[ \t]*,[ \t]*/, ", ", value)
            print "flow\t" clean(value)
            exit
        }
        if (value != "") { print "inline\t" value; exit }

        # Block sequence: collect every item, so the suggested fix keeps all of them.
        if ((getline line) > 0 && line ~ /^[ \t]*-[ \t]/) {
            do {
                item = line
                sub(/^[ \t]*-[ \t]*/, "", item)
                item = clean(item)
                items = (items == "" ? item : items ", " item)
            } while ((getline line) > 0 && line ~ /^[ \t]*-[ \t]/)
            print "block\t" items
            exit
        }
        print "empty\t"
        exit
    }
')
TOOLS_KIND=${TOOLS_STATE%%$'\t'*}
TOOLS_VALUE=${TOOLS_STATE#*$'\t'}

case "$TOOLS_KIND" in
    inline)
        echo "$TOOLS_VALUE"
        ;;
    block|flow)
        echo "INVALID (a YAML list)"
        echo "    Error: 'allowed-tools' must be a string, not a list."
        echo "           The skills server rejects a list on upload:"
        echo "             Validation failed: allowed-tools: expected string, received array"
        if [ "$TOOLS_KIND" = "block" ]; then
            echo "           Found:  allowed-tools:"
            OLD_IFS=$IFS; IFS=','
            for item in $TOOLS_VALUE; do
                echo "                     - ${item# }"
            done
            IFS=$OLD_IFS
        else
            echo "           Found:  allowed-tools: [$TOOLS_VALUE]"
        fi
        echo "           Use:    allowed-tools: $TOOLS_VALUE"
        echo "           Several tools go on the one line (see CONTRIBUTING.md)."
        ERRORS=$((ERRORS + 1))
        ;;
    empty)
        echo "INVALID (no value)"
        echo "    Error: 'allowed-tools' is declared but empty. Give it a value"
        echo "           (allowed-tools: shell) or remove the field entirely."
        ERRORS=$((ERRORS + 1))
        ;;
    *)
        echo "(not set)"
        ;;
esac

# Summary
echo ""
echo "================================"
if [ $ERRORS -eq 0 ]; then
    echo "Validation PASSED"
    echo ""
    echo "Your skill is ready to submit!"
    echo "Create a pull request to add it to the repository."
    exit 0
else
    echo "Validation FAILED with $ERRORS error(s)"
    echo ""
    echo "Please fix the errors above before submitting."
    exit 1
fi
