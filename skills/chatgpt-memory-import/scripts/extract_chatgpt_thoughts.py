#!/usr/bin/env python3
"""Extract curated Memory Engine thoughts from a ChatGPT data export.

This script intentionally does not call the Memory Engine. It produces a
reviewable JSONL file for an agent to import through MCP `add_memory`.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import textwrap
import urllib.error
import urllib.request
import zipfile
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_BASE_URL = 'https://api.openai.com/v1'
DEFAULT_MODEL = 'gpt-4o-mini'
DEFAULT_OUTPUT_NAME = 'chatgpt-memory-import.jsonl'
DEFAULT_STATE_NAME = 'chatgpt-memory-import-state.json'
DEFAULT_REPORT_NAME = 'chatgpt-memory-import-report.md'

SESSION_GAP_HOURS = 4
MIN_MESSAGES_SKIP = 2
MIN_MESSAGES_ALWAYS = 10
MIN_WORDS_BORDERLINE = 50
MAX_SESSION_CHARS = 18000

SKIP_CONTENT_TYPES = {
    'model_editable_context',
    'reasoning_recap',
    'system_error',
    'thoughts',
    'user_editable_context',
}

ALLOWED_THOUGHT_TYPES = {
    'decision',
    'preference',
    'learning',
    'context',
    'brainstorm',
    'reference',
}
ALLOWED_CONFIDENCE = {'firm', 'tentative', 'exploring'}


@dataclass(frozen=True)
class DialogueMessage:
    role: str
    content: str
    timestamp: float | None


@dataclass(frozen=True)
class ConversationMeta:
    conversation_key: str
    conversation_id: str
    title: str
    conversation_url: str
    created_at: str
    updated_at: str
    update_time: float


def utc_iso_from_timestamp(timestamp: float | int | None) -> str:
    if not timestamp:
        return ''
    return datetime.fromtimestamp(float(timestamp), tz=timezone.utc).isoformat()


def normalize_space(value: str) -> str:
    return re.sub(r'\s+', ' ', value).strip()


def stable_hash(value: str) -> str:
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def read_json_file(path: Path) -> Any:
    with path.open('r', encoding='utf-8') as handle:
        return json.load(handle)


def extract_conversations(source_path: str | Path) -> list[dict[str, Any]]:
    """Load ChatGPT conversations from a zip file or extracted export directory."""
    source = Path(source_path).expanduser()
    if source.is_dir():
        return _load_conversations_from_directory(source)
    if source.is_file() and source.suffix.lower() == '.zip':
        return _load_conversations_from_zip(source)
    if source.is_file() and source.name.startswith('conversations') and source.suffix == '.json':
        loaded = read_json_file(source)
        if isinstance(loaded, list):
            return loaded
    raise FileNotFoundError(
        f'Expected a ChatGPT export zip, directory, or conversations JSON file: {source}'
    )


def _conversation_file_sort_key(path: str | Path) -> str:
    return str(path)


def _load_conversations_from_directory(directory: Path) -> list[dict[str, Any]]:
    pattern = re.compile(r'^conversations(?:-\d+)?\.json$')
    candidates = sorted(
        [path for path in directory.iterdir() if pattern.match(path.name)],
        key=_conversation_file_sort_key,
    )
    if not candidates:
        raise FileNotFoundError(
            f'No conversations JSON files found in {directory}; expected conversations.json'
        )

    conversations: list[dict[str, Any]] = []
    for candidate in candidates:
        loaded = read_json_file(candidate)
        if isinstance(loaded, list):
            conversations.extend(loaded)
    return conversations


def _load_conversations_from_zip(zip_path: Path) -> list[dict[str, Any]]:
    pattern = re.compile(r'(?:^|/)conversations(?:-\d+)?\.json$')
    conversations: list[dict[str, Any]] = []
    with zipfile.ZipFile(zip_path) as archive:
        names = sorted(
            [name for name in archive.namelist() if pattern.search(name)],
            key=_conversation_file_sort_key,
        )
        if not names:
            raise FileNotFoundError(
                f'No conversations JSON files found in {zip_path}; expected conversations.json'
            )
        for name in names:
            with archive.open(name) as raw:
                loaded = json.loads(raw.read().decode('utf-8'))
            if isinstance(loaded, list):
                conversations.extend(loaded)
    return conversations


def conversation_hash(conversation: dict[str, Any]) -> str:
    conversation_id = str(conversation.get('id') or '')
    if conversation_id:
        return stable_hash(f'id:{conversation_id}')
    raw = '|'.join(
        [
            str(conversation.get('title') or ''),
            str(conversation.get('create_time') or ''),
            str(conversation.get('update_time') or ''),
        ]
    )
    return stable_hash(raw)


def conversation_metadata(conversation: dict[str, Any]) -> ConversationMeta:
    conversation_id = str(conversation.get('id') or conversation_hash(conversation)[:16])
    title = normalize_space(str(conversation.get('title') or 'Untitled ChatGPT conversation'))
    create_time = conversation.get('create_time')
    update_time = float(conversation.get('update_time') or create_time or 0)
    return ConversationMeta(
        conversation_key=conversation_hash(conversation),
        conversation_id=conversation_id,
        title=title,
        conversation_url=f'https://chatgpt.com/c/{conversation_id}',
        created_at=utc_iso_from_timestamp(create_time),
        updated_at=utc_iso_from_timestamp(update_time),
        update_time=update_time,
    )


def resolve_canonical_path(
    mapping: dict[str, Any], current_node: str | None = None
) -> list[dict[str, Any]]:
    """Resolve the canonical ChatGPT branch into ordered message objects."""
    if not mapping:
        return []

    if current_node and current_node in mapping:
        ordered: list[dict[str, Any]] = []
        seen: set[str] = set()
        node_id: str | None = current_node
        while node_id and node_id in mapping and node_id not in seen:
            seen.add(node_id)
            node = mapping[node_id]
            message = node.get('message')
            if message and message.get('content'):
                ordered.append(message)
            node_id = node.get('parent')
        return list(reversed(ordered))

    roots = [
        node_id
        for node_id, node in mapping.items()
        if node.get('parent') is None or node.get('parent') not in mapping
    ]
    if not roots:
        roots = list(mapping.keys())

    size_cache: dict[str, int] = {}

    def subtree_size(node_id: str) -> int:
        if node_id in size_cache:
            return size_cache[node_id]
        node = mapping.get(node_id, {})
        size = 1
        for child_id in node.get('children') or []:
            if child_id in mapping:
                size += subtree_size(child_id)
        size_cache[node_id] = size
        return size

    def walk_largest_branch(node_id: str, output: list[dict[str, Any]]) -> None:
        node = mapping.get(node_id, {})
        message = node.get('message')
        if message and message.get('content'):
            output.append(message)
        children = [child for child in node.get('children') or [] if child in mapping]
        if not children:
            return
        next_child = max(children, key=subtree_size)
        walk_largest_branch(next_child, output)

    root = max(roots, key=subtree_size)
    messages: list[dict[str, Any]] = []
    walk_largest_branch(root, messages)
    return messages


def _part_text(part: Any) -> str:
    if isinstance(part, str):
        return part
    if not isinstance(part, dict):
        return ''
    for key in (
        'text',
        'transcript',
        'transcription',
        'audio_transcription',
        'content',
        'snippet',
    ):
        value = part.get(key)
        if isinstance(value, str):
            return value
        if isinstance(value, dict):
            nested = _part_text(value)
            if nested:
                return nested
    return ''


def extract_text_from_content(content: dict[str, Any]) -> str:
    content_type = content.get('content_type', 'text')
    if content_type in SKIP_CONTENT_TYPES:
        return ''

    if content_type == 'sonic_webpage':
        title = content.get('title') or ''
        snippet = content.get('snippet') or ''
        url = content.get('url') or ''
        return normalize_space(' '.join(str(part) for part in (title, snippet, url) if part))

    parts = content.get('parts')
    if isinstance(parts, list):
        return '\n'.join(text for text in (_part_text(part).strip() for part in parts) if text)

    if isinstance(content.get('text'), str):
        return content['text'].strip()
    if isinstance(content.get('result'), str):
        return content['result'].strip()
    return ''


def extract_dialogue_messages(messages: Iterable[dict[str, Any]]) -> list[DialogueMessage]:
    dialogue: list[DialogueMessage] = []
    for message in messages:
        author = message.get('author') or {}
        role = author.get('role') or ''
        if role not in {'user', 'assistant', 'tool'}:
            continue
        content = message.get('content') or {}
        if not isinstance(content, dict):
            continue
        text = extract_text_from_content(content)
        if not text:
            continue
        dialogue.append(
            DialogueMessage(
                role='assistant' if role == 'tool' else role,
                content=normalize_space(text),
                timestamp=message.get('create_time'),
            )
        )
    return dialogue


def dialogue_to_text(messages: Iterable[DialogueMessage]) -> str:
    return '\n\n'.join(f'{message.role}: {message.content}' for message in messages)


def word_count(text: str) -> int:
    return len(re.findall(r'\w+', text))


def load_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {
            'version': 1,
            'source': 'chatgpt-memory-import',
            'updated_at': '',
            'conversations': {},
            'thoughts': {},
        }
    with path.open('r', encoding='utf-8') as handle:
        loaded = json.load(handle)
    loaded.setdefault('version', 1)
    loaded.setdefault('source', 'chatgpt-memory-import')
    loaded.setdefault('conversations', {})
    loaded.setdefault('thoughts', {})
    return loaded


def save_state(path: Path, state: dict[str, Any]) -> None:
    state['updated_at'] = datetime.now(timezone.utc).isoformat()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as handle:
        json.dump(state, handle, indent=2, sort_keys=True)
        handle.write('\n')


def should_skip_conversation(
    meta: ConversationMeta,
    dialogue_text: str,
    message_count: int,
    state: dict[str, Any],
    args: argparse.Namespace,
) -> str | None:
    if not args.force:
        existing = state.get('conversations', {}).get(meta.conversation_key)
        existing_status = existing.get('import_status') if existing else ''
        if (
            existing
            and meta.update_time <= float(existing.get('update_time') or 0)
            and existing_status in {'imported', 'no_thoughts', 'skipped'}
        ):
            return 'already_processed'

    min_messages = args.min_messages or MIN_MESSAGES_SKIP
    if message_count < min_messages:
        return 'too_few_messages'

    if message_count >= MIN_MESSAGES_ALWAYS:
        return None

    if word_count(dialogue_text) < (args.min_words or MIN_WORDS_BORDERLINE):
        return 'too_few_words'

    if meta.title.lower().startswith('untitled') and message_count <= 5:
        return 'untitled_short'

    return None


def split_sessions(
    messages: list[DialogueMessage], gap_hours: int = SESSION_GAP_HOURS
) -> list[list[DialogueMessage]]:
    if not messages:
        return []
    sessions: list[list[DialogueMessage]] = [[]]
    previous_timestamp: float | None = None
    for message in messages:
        if (
            previous_timestamp is not None
            and message.timestamp is not None
            and (float(message.timestamp) - previous_timestamp) / 3600 >= gap_hours
        ):
            sessions.append([])
        sessions[-1].append(message)
        if message.timestamp is not None:
            previous_timestamp = float(message.timestamp)
    return [session for session in sessions if session]


def chunk_session_text(
    session: list[DialogueMessage], max_chars: int = MAX_SESSION_CHARS
) -> list[str]:
    chunks: list[str] = []
    current: list[DialogueMessage] = []
    current_size = 0
    for message in session:
        rendered_size = len(message.role) + len(message.content) + 4
        if current and current_size + rendered_size > max_chars:
            chunks.append(dialogue_to_text(current))
            current = []
            current_size = 0
        current.append(message)
        current_size += rendered_size
    if current:
        chunks.append(dialogue_to_text(current))
    return chunks


def build_extraction_units(
    messages: list[DialogueMessage], max_chars: int = MAX_SESSION_CHARS
) -> list[str]:
    units: list[str] = []
    for session in split_sessions(messages):
        units.extend(chunk_session_text(session, max_chars=max_chars))
    return units


def strip_json_fence(value: str) -> str:
    text = value.strip()
    fence = re.match(r'^```(?:json)?\s*(.*?)\s*```$', text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    if not text.startswith('{'):
        start = text.find('{')
        end = text.rfind('}')
        if start >= 0 and end > start:
            text = text[start : end + 1]
    return text


def clean_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    cleaned = []
    for item in value:
        if isinstance(item, str):
            normalized = normalize_space(item)
            if normalized:
                cleaned.append(normalized)
    return cleaned[:12]


def parse_extraction_response(raw_content: str) -> dict[str, Any]:
    try:
        parsed = json.loads(strip_json_fence(raw_content))
    except json.JSONDecodeError:
        return {'thoughts': [], 'conversation_type': '', 'skip_reason': 'parse_error'}

    thoughts = []
    for item in parsed.get('thoughts') or []:
        if not isinstance(item, dict):
            continue
        content = normalize_space(str(item.get('content') or ''))
        if not content:
            continue
        thought_type = str(item.get('type') or 'context').lower()
        if thought_type not in ALLOWED_THOUGHT_TYPES:
            thought_type = 'context'
        confidence = str(item.get('confidence') or 'tentative').lower()
        if confidence not in ALLOWED_CONFIDENCE:
            confidence = 'tentative'
        thoughts.append(
            {
                'content': content[:2400],
                'type': thought_type,
                'topics': clean_string_list(item.get('topics')),
                'people': clean_string_list(item.get('people')),
                'confidence': confidence,
            }
        )

    return {
        'thoughts': thoughts[:5],
        'conversation_type': normalize_space(str(parsed.get('conversation_type') or '')),
        'skip_reason': normalize_space(str(parsed.get('skip_reason') or '')),
    }


def build_extraction_prompt(
    meta: ConversationMeta,
    dialogue_text: str,
    message_count: int,
    focus: str = '',
) -> list[dict[str, str]]:
    focus_instruction = ''
    if focus:
        focus_instruction = (
            f'\nOnly extract thoughts directly relevant to this focus: {focus}. '
            'Return an empty thoughts array for off-topic conversations.'
        )

    system = textwrap.dedent(
        f"""
        You curate durable personal memory for a graph memory engine.

        Extract 0-5 standalone thoughts from the ChatGPT conversation. Store only
        durable knowledge, not raw transcript text. A thought must make sense
        without seeing the original conversation.

        Valid thought types: decision, preference, learning, context, brainstorm, reference.
        Valid confidence values: firm, tentative, exploring.

        Rules:
        - Capture user decisions, preferences, goals, project context, reusable procedures,
          meaningful brainstorms, and accepted insights.
        - Do not store generic Q&A, throwaway lookups, raw code dumps, assistant reasoning,
          or long quotes from the conversation.
        - Assistant suggestions count only when the user accepted, refined, or acted on them.
        - Prefer concrete names, dates, projects, tools, and relationships when present.
        - Return JSON only: {{"thoughts": [...], "conversation_type": "...", "skip_reason": "..."}}.
        {focus_instruction}
        """
    ).strip()

    user = textwrap.dedent(
        f"""
        Conversation title: {meta.title}
        Conversation date: {meta.created_at}
        Message count: {message_count}

        Dialogue for analysis only. Do not quote it in the output:

        {dialogue_text}
        """
    ).strip()

    return [{'role': 'system', 'content': system}, {'role': 'user', 'content': user}]


def call_openai_compatible_chat(
    messages: list[dict[str, str]],
    model: str,
    api_key: str,
    base_url: str,
) -> str:
    endpoint = base_url.rstrip('/') + '/chat/completions'
    payload = {
        'model': model,
        'messages': messages,
        'temperature': 0.1,
        'response_format': {'type': 'json_object'},
    }
    body = json.dumps(payload).encode('utf-8')
    request = urllib.request.Request(
        endpoint,
        data=body,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://memory-engine.ixo.earth',
            'X-Title': 'Memory Engine ChatGPT Import',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:  # nosec B310
            response_body = response.read().decode('utf-8')
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'LLM request failed with HTTP {exc.code}: {error_body[:500]}') from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f'LLM request failed: {exc}') from exc

    parsed = json.loads(response_body)
    choices = parsed.get('choices') or []
    if not choices:
        raise RuntimeError('LLM response did not include choices')
    content = choices[0].get('message', {}).get('content')
    if not isinstance(content, str):
        raise RuntimeError('LLM response did not include message content')
    return content


def extract_thoughts_with_llm(
    meta: ConversationMeta,
    dialogue_text: str,
    message_count: int,
    args: argparse.Namespace,
) -> dict[str, Any]:
    api_key = os.getenv('COMPLETION_OPENAI_API_KEY')
    if not api_key:
        raise RuntimeError('COMPLETION_OPENAI_API_KEY is required for thought extraction')

    base_url = os.getenv('COMPLETION_OPENAI_BASE_URL') or DEFAULT_BASE_URL
    model = args.model or os.getenv('COMPLETION_MODEL_NAME') or DEFAULT_MODEL
    messages = build_extraction_prompt(meta, dialogue_text, message_count, focus=args.focus)
    raw = call_openai_compatible_chat(messages, model=model, api_key=api_key, base_url=base_url)
    parsed = parse_extraction_response(raw)
    parsed['model'] = model
    return parsed


def thought_name(meta: ConversationMeta, thought: dict[str, Any]) -> str:
    base = f'ChatGPT {thought["type"].title()} - {meta.title}'
    return base[:120]


def source_description(meta: ConversationMeta, extraction: dict[str, Any]) -> str:
    parts = [
        'Curated from ChatGPT export',
        f'title="{meta.title}"',
        f'conversation_url={meta.conversation_url}',
    ]
    conversation_type = extraction.get('conversation_type')
    if conversation_type:
        parts.append(f'conversation_type={conversation_type}')
    return '; '.join(parts)


def memory_content(meta: ConversationMeta, thought: dict[str, Any]) -> str:
    topics = ', '.join(thought.get('topics') or [])
    people = ', '.join(thought.get('people') or [])
    context_bits = [
        f'Curated ChatGPT thought type: {thought["type"]}.',
        f'Confidence: {thought["confidence"]}.',
        f'Source conversation: {meta.title}.',
    ]
    if meta.created_at:
        context_bits.append(f'Conversation date: {meta.created_at}.')
    if topics:
        context_bits.append(f'Topics: {topics}.')
    if people:
        context_bits.append(f'People mentioned: {people}.')
    return f'{thought["content"]}\n\n' + ' '.join(context_bits)


def build_thought_record(
    meta: ConversationMeta,
    thought: dict[str, Any],
    extraction: dict[str, Any],
    session_index: int,
    dry_run: bool,
) -> dict[str, Any]:
    normalized_content = normalize_space(thought['content']).lower()
    dedupe_key = stable_hash(f'{meta.conversation_key}:{session_index}:{normalized_content}')
    thought_id = f'chatgpt-{dedupe_key[:24]}'
    return {
        'thought_id': thought_id,
        'name': thought_name(meta, thought),
        'content': memory_content(meta, thought),
        'source_description': source_description(meta, extraction),
        'type': thought['type'],
        'confidence': thought['confidence'],
        'topics': thought.get('topics') or [],
        'people': thought.get('people') or [],
        'conversation_title': meta.title,
        'conversation_url': meta.conversation_url,
        'created_at': meta.created_at,
        'updated_at': meta.updated_at,
        'dedupe_key': dedupe_key,
        'import_status': 'dry_run' if dry_run else 'pending_mcp_import',
    }


def update_state_for_records(
    state: dict[str, Any],
    meta: ConversationMeta,
    records: list[dict[str, Any]],
    status: str,
) -> None:
    state['conversations'][meta.conversation_key] = {
        'conversation_id': meta.conversation_id,
        'conversation_title': meta.title,
        'conversation_url': meta.conversation_url,
        'created_at': meta.created_at,
        'updated_at': meta.updated_at,
        'update_time': meta.update_time,
        'thought_ids': [record['thought_id'] for record in records],
        'import_status': status,
    }
    for record in records:
        state['thoughts'][record['thought_id']] = {
            'dedupe_key': record['dedupe_key'],
            'name': record['name'],
            'type': record['type'],
            'confidence': record['confidence'],
            'conversation_title': record['conversation_title'],
            'conversation_url': record['conversation_url'],
            'import_status': record['import_status'],
        }


def write_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False, sort_keys=True))
            handle.write('\n')


def write_report(path: Path, stats: dict[str, Any], records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as handle:
        handle.write('# ChatGPT Memory Import Report\n\n')
        handle.write(f'- Mode: {stats["mode"]}\n')
        handle.write(f'- Conversations loaded: {stats["loaded"]}\n')
        handle.write(f'- Conversations considered: {stats["considered"]}\n')
        handle.write(f'- Conversations processed: {stats["processed"]}\n')
        handle.write(f'- Conversations skipped: {stats["skipped"]}\n')
        handle.write(f'- Thoughts generated: {len(records)}\n\n')
        if stats.get('skip_reasons'):
            handle.write('## Skip Reasons\n\n')
            for reason, count in sorted(stats['skip_reasons'].items()):
                handle.write(f'- {reason}: {count}\n')
            handle.write('\n')
        handle.write('## Thought Preview\n\n')
        for record in records[:50]:
            handle.write(f'- `{record["type"]}` {record["name"]}: ')
            handle.write(record['content'].split('\n', maxsplit=1)[0][:240])
            handle.write('\n')


def output_paths(args: argparse.Namespace) -> tuple[Path, Path, Path]:
    out_dir = Path(args.out_dir).expanduser()
    state_path = (
        Path(args.state_path).expanduser() if args.state_path else out_dir / DEFAULT_STATE_NAME
    )
    return out_dir / DEFAULT_OUTPUT_NAME, state_path, out_dir / DEFAULT_REPORT_NAME


def run_import(args: argparse.Namespace) -> int:
    output_path, state_path, report_path = output_paths(args)
    conversations = extract_conversations(args.export_path)
    state = load_state(state_path)
    records: list[dict[str, Any]] = []
    stats: dict[str, Any] = {
        'mode': 'dry_run' if args.dry_run else 'pending_mcp_import',
        'loaded': len(conversations),
        'considered': 0,
        'processed': 0,
        'skipped': 0,
        'skip_reasons': {},
    }

    for conversation in conversations:
        if args.limit and stats['considered'] >= args.limit:
            break
        stats['considered'] += 1
        meta = conversation_metadata(conversation)
        mapping = conversation.get('mapping') or {}
        messages = resolve_canonical_path(mapping, conversation.get('current_node'))
        dialogue_messages = extract_dialogue_messages(messages)
        dialogue_text = dialogue_to_text(dialogue_messages)
        skip_reason = should_skip_conversation(
            meta, dialogue_text, len(dialogue_messages), state, args
        )
        if skip_reason:
            stats['skipped'] += 1
            stats['skip_reasons'][skip_reason] = stats['skip_reasons'].get(skip_reason, 0) + 1
            continue

        conversation_records: list[dict[str, Any]] = []
        extraction_units = build_extraction_units(
            dialogue_messages, max_chars=args.max_session_chars
        )
        for index, unit_text in enumerate(extraction_units, start=1):
            extraction = extract_thoughts_with_llm(meta, unit_text, len(dialogue_messages), args)
            for thought in extraction.get('thoughts') or []:
                record = build_thought_record(meta, thought, extraction, index, args.dry_run)
                existing_thought = state.get('thoughts', {}).get(record['thought_id'])
                if (
                    not args.force
                    and existing_thought
                    and existing_thought.get('import_status') == 'imported'
                ):
                    continue
                records.append(record)
                conversation_records.append(record)

        stats['processed'] += 1
        if not args.dry_run:
            status = 'pending_mcp_import' if conversation_records else 'no_thoughts'
            update_state_for_records(state, meta, conversation_records, status=status)

        if args.verbose:
            print(
                f'{meta.title}: {len(conversation_records)} thought(s)',
                file=sys.stderr,
            )

    write_jsonl(output_path, records)
    write_report(report_path, stats, records)
    if not args.dry_run:
        save_state(state_path, state)

    print(f'Wrote {len(records)} thought record(s) to {output_path}')
    print(f'Wrote report to {report_path}')
    if args.dry_run:
        print('Dry run complete; state file was not updated.')
    else:
        print(f'Wrote uploadable state to {state_path}')
    return 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Extract curated Memory Engine thoughts from a ChatGPT export.'
    )
    parser.add_argument('export_path', help='ChatGPT export zip, directory, or conversations JSON')
    parser.add_argument(
        '--out-dir', default='.', help='Directory for JSONL, report, and state files'
    )
    parser.add_argument('--state-path', default='', help='Override state file path')
    parser.add_argument('--limit', type=int, default=0, help='Limit conversations considered')
    parser.add_argument('--focus', default='', help='Optional extraction focus area')
    parser.add_argument('--model', default='', help='Override COMPLETION_MODEL_NAME')
    parser.add_argument('--dry-run', action='store_true', help='Write review artifacts only')
    parser.add_argument('--force', action='store_true', help='Ignore existing state and reprocess')
    parser.add_argument('--verbose', action='store_true', help='Print per-conversation progress')
    parser.add_argument('--min-messages', type=int, default=MIN_MESSAGES_SKIP)
    parser.add_argument('--min-words', type=int, default=MIN_WORDS_BORDERLINE)
    parser.add_argument('--max-session-chars', type=int, default=MAX_SESSION_CHARS)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    return run_import(parse_args(argv))


if __name__ == '__main__':
    raise SystemExit(main())
