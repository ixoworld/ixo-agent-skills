---
name: capsule-creator
description: >
  Create AI skill capsules for the IXO Skills Server. Guides you through
  writing SKILL.md files with valid frontmatter, organizing skill resources,
  packaging capsules as tar.gz archives, validating structure, and uploading
  to the skills API at capsules.skills.ixo.earth.
metadata:
  author: ixoworld
  version: "1.0.0"
  category: developer-tools
---

# Capsule Creator

Create and publish AI skill capsules to the IXO Skills Server.

A **capsule** is a gzip-compressed tar archive (`.tar.gz`) containing a skill directory with a `SKILL.md` file and optional supporting resources. Capsules are uploaded to `https://capsules.skills.ixo.earth/` where they receive a content-addressed identifier (CID).

## Capsule Structure

```
skill-name/
├── SKILL.md          # REQUIRED - Skill definition with YAML frontmatter + instructions
├── scripts/          # Optional - Helper scripts (Python, TypeScript, Bash)
├── prompts/          # Optional - Additional prompt files
├── examples/         # Optional - Usage examples
├── templates/        # Optional - Template files
└── LICENSE.txt       # Optional - Skill-specific license
```

The only required file is `SKILL.md`. Everything else is optional.

## SKILL.md Format

Every `SKILL.md` must begin with YAML frontmatter between `---` delimiters, followed by markdown instructions for the AI agent.

### Frontmatter Schema

    ---
    name: skill-name          # REQUIRED. 1-64 chars. Must match folder name.
                              # Pattern: ^[a-z0-9]+(?:-[a-z0-9]+)*$
                              # Lowercase alphanumeric with single hyphens only.
                              # No leading/trailing hyphens, no consecutive hyphens.

    description: >            # REQUIRED. 1-1024 chars.
      A clear description of what this skill does and when to use it.

    license: Apache-2.0       # OPTIONAL. String.

    compatibility:            # OPTIONAL. String or list.
      - claude

    allowed-tools:            # OPTIONAL. List of tool names the skill needs.
      - Bash
      - Read
      - Write
      - Edit

    metadata:                 # OPTIONAL. Key-value pairs (max 20 pairs).
      author: Your Name       # Keys: max 64 chars. Values: max 1024 chars.
      version: "1.0.0"        # All values must be strings.
      category: productivity
    ---

### Required Fields

| Field | Rules |
|-------|-------|
| `name` | 1-64 chars, lowercase kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`), must match directory name |
| `description` | 1-1024 chars, describes what the skill does and when to trigger it |

### Optional Fields

| Field | Rules |
|-------|-------|
| `license` | Any string (e.g., `MIT`, `Apache-2.0`) |
| `compatibility` | String or list, max 500 chars |
| `allowed-tools` | List of tool name strings |
| `metadata` | Object with max 20 key-value pairs, string values only |

### Markdown Body

After the closing `---`, write markdown instructions that tell the AI agent how to use the skill. This is what gets loaded when the skill is activated. Include:

- Overview of what the skill does
- Step-by-step usage instructions
- Script invocation commands (if scripts are included)
- Examples and templates

## Validation

Before packaging, validate your skill:

```bash
./scripts/validate-skill.sh skills/your-skill-name
```

This checks:
1. Folder name matches the required pattern
2. Folder name is 1-64 characters
3. `SKILL.md` exists and is valid UTF-8
4. YAML frontmatter is present and valid
5. `name` field matches folder name
6. `description` is present and under 1024 characters

## Packaging a Capsule

Package your skill directory into a tar.gz archive:

```bash
# From the repository root
tar -czf skill-name.tar.gz -C skills skill-name
```

This creates a gzip-compressed tar archive with the skill directory at the root.

### Verify the archive contents

```bash
tar -tzf skill-name.tar.gz
```

Expected output:
```
skill-name/
skill-name/SKILL.md
skill-name/scripts/
skill-name/scripts/helper.py
...
```

## Uploading to the Skills Server

Upload the capsule to the IXO Skills Server API:

```bash
curl -X POST https://capsules.skills.ixo.earth/capsules \
  -H "Authorization: Bearer $SKILLS_API_KEY" \
  -H "Content-Type: application/gzip" \
  --data-binary @skill-name.tar.gz
```

### Response

On success (HTTP 200 or 201), the API returns a JSON response with a content-addressed identifier:

```json
{
  "cid": "bafyrei..."
}
```

### Retrieving a Published Capsule

```bash
curl https://capsules.skills.ixo.earth/capsules/{cid} --output skill.tar.gz
```

## Complete Example

Here is a complete example of creating and publishing a skill:

### 1. Create the skill directory

```bash
mkdir -p skills/my-helper/scripts
```

### 2. Write SKILL.md

```markdown
 ---
name: my-helper
description: >
  A helper skill that demonstrates the capsule creation process.
  Use this when you need an example of skill packaging.
license: MIT
metadata:
  author: Your Name
  version: "1.0.0"
 ---

# My Helper Skill

Instructions for the AI agent go here.

## Usage

Run the helper script:

\`\`\`bash
python scripts/helper.py <input>
\`\`\`
```

### 3. Add scripts (optional)

```python
#!/usr/bin/env python3
"""Helper script. Usage: python helper.py <input>"""
import sys

def main(input_text=None, **kwargs):
    return f"Processed: {input_text}"

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python helper.py <input>")
        sys.exit(1)
    print(main(input_text=sys.argv[1]))
```

### 4. Validate

```bash
./scripts/validate-skill.sh skills/my-helper
```

### 5. Package

```bash
tar -czf my-helper.tar.gz -C skills my-helper
```

### 6. Upload

```bash
curl -X POST https://capsules.skills.ixo.earth/capsules \
  -H "Authorization: Bearer $SKILLS_API_KEY" \
  -H "Content-Type: application/gzip" \
  --data-binary @my-helper.tar.gz
```

## Publishing via Pull Request

Alternatively, submit skills to the `ixoworld/ixo-agent-skills` repository via pull request:

1. Fork the repository
2. Add your skill directory under `skills/`
3. Run validation: `./scripts/validate-skill.sh skills/your-skill-name`
4. Submit a PR targeting `main`
5. On merge, the CI pipeline automatically packages and uploads your skill
