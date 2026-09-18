---
name: chatgpt-memory-import
description: Import a user's ChatGPT data export into the IXO Memory Engine as curated, searchable thoughts. Use when the user provides or references a ChatGPT export zip, extracted export folder, conversations.json, or asks to migrate/import ChatGPT history, conversations, memories, or AI chat history into the memory engine. Produces thought JSONL artifacts and uses the Memory Engine MCP add_memory tool for import; never stores raw transcripts.
license: Apache-2.0
compatibility: Python 3.10+
allowed-tools: shell
---

# ChatGPT Memory Import

Use this skill to turn a ChatGPT export into Memory Engine memories. The importer creates curated thoughts, not transcripts. It does not call the Memory Engine directly; after review, call the configured MCP `add_memory` tool once per approved thought.

## Workflow

1. Find the ChatGPT export zip or extracted directory. It must contain `conversations.json` or sharded `conversations-000.json` files.
2. Run a dry run first:

```bash
python3 skills/chatgpt-memory-import/scripts/extract_chatgpt_thoughts.py /path/to/export.zip --out-dir /path/to/output --dry-run --limit 20
```

3. Review `/path/to/output/chatgpt-memory-import.jsonl` and `/path/to/output/chatgpt-memory-import-report.md`. Confirm the records are standalone thoughts and do not contain raw transcript text.
4. Run the full extraction without `--dry-run`:

```bash
python3 skills/chatgpt-memory-import/scripts/extract_chatgpt_thoughts.py /path/to/export.zip --out-dir /path/to/output
```

5. For each JSONL record with `import_status: "pending_mcp_import"`, call MCP `add_memory`:
   - `name`: record `name`
   - `content`: record `content`
   - `source`: `text`
   - `source_description`: record `source_description`
6. After successful MCP calls, update the uploadable state file:

```bash
python3 skills/chatgpt-memory-import/scripts/update_import_status.py \
  --jsonl /path/to/output/chatgpt-memory-import.jsonl \
  --state /path/to/output/chatgpt-memory-import-state.json \
  --all-pending \
  --status imported
```

Use individual `--thought-id` values instead of `--all-pending` when only some thoughts imported successfully.

## Import Rules

- Do not import raw conversations, long message excerpts, model reasoning, or system messages.
- Do not use REST or service-key ingestion for v1.
- If the Memory Engine MCP tool is unavailable, stop after producing the reviewed JSONL artifact.
- If `COMPLETION_OPENAI_API_KEY` is missing, ask the user to configure it before extraction.
- Treat `chatgpt-memory-import-state.json` as user-portable metadata that can be uploaded through the IXO Portal Personal Agent.

## Environment

The extraction script uses the same OpenAI-compatible variables as the memory engine:

- `COMPLETION_OPENAI_API_KEY`
- `COMPLETION_OPENAI_BASE_URL`
- `COMPLETION_MODEL_NAME`

`COMPLETION_OPENAI_BASE_URL` defaults to `https://api.openai.com/v1` and `COMPLETION_MODEL_NAME` defaults to `gpt-4o-mini` when unset.
