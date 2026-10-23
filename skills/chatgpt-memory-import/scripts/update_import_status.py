#!/usr/bin/env python3
"""Update ChatGPT memory import JSONL/state status after MCP insertion."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

VALID_STATUSES = {'pending_mcp_import', 'imported', 'failed', 'skipped'}


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    records = []
    with path.open('r', encoding='utf-8') as handle:
        for line in handle:
            if line.strip():
                records.append(json.loads(line))
    return records


def write_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    with path.open('w', encoding='utf-8') as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False, sort_keys=True))
            handle.write('\n')


def load_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {
            'version': 1,
            'source': 'chatgpt-memory-import',
            'conversations': {},
            'thoughts': {},
        }
    with path.open('r', encoding='utf-8') as handle:
        state = json.load(handle)
    state.setdefault('conversations', {})
    state.setdefault('thoughts', {})
    return state


def save_state(path: Path, state: dict[str, Any]) -> None:
    state['updated_at'] = datetime.now(timezone.utc).isoformat()
    with path.open('w', encoding='utf-8') as handle:
        json.dump(state, handle, indent=2, sort_keys=True)
        handle.write('\n')


def update_status(args: argparse.Namespace) -> int:
    status = args.status
    if status not in VALID_STATUSES:
        raise ValueError(f'Invalid status: {status}')

    jsonl_path = Path(args.jsonl).expanduser()
    state_path = Path(args.state).expanduser()
    ids = set(args.thought_id or [])
    records = read_jsonl(jsonl_path)
    if args.all_pending:
        ids.update(
            record['thought_id']
            for record in records
            if record.get('import_status') == 'pending_mcp_import'
        )
    if not ids:
        raise ValueError('Provide --thought-id or --all-pending')

    updated = 0
    for record in records:
        if record.get('thought_id') in ids:
            record['import_status'] = status
            updated += 1
    write_jsonl(jsonl_path, records)

    state = load_state(state_path)
    for thought_id in ids:
        if thought_id in state.get('thoughts', {}):
            state['thoughts'][thought_id]['import_status'] = status

    for conversation in state.get('conversations', {}).values():
        thought_ids = conversation.get('thought_ids') or []
        thought_statuses = [
            state.get('thoughts', {}).get(thought_id, {}).get('import_status')
            for thought_id in thought_ids
        ]
        if thought_statuses and all(item == 'imported' for item in thought_statuses):
            conversation['import_status'] = 'imported'
        elif any(item == 'failed' for item in thought_statuses):
            conversation['import_status'] = 'partial_failed'
        elif any(item == 'imported' for item in thought_statuses):
            conversation['import_status'] = 'partial_imported'

    save_state(state_path, state)
    print(f'Updated {updated} JSONL record(s) and {len(ids)} state thought(s) to {status}')
    return 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Update ChatGPT memory import statuses.')
    parser.add_argument('--jsonl', required=True, help='chatgpt-memory-import.jsonl path')
    parser.add_argument('--state', required=True, help='chatgpt-memory-import-state.json path')
    parser.add_argument('--status', required=True, choices=sorted(VALID_STATUSES))
    parser.add_argument('--thought-id', action='append', default=[])
    parser.add_argument('--all-pending', action='store_true')
    return parser.parse_args(argv)


if __name__ == '__main__':
    raise SystemExit(update_status(parse_args()))
