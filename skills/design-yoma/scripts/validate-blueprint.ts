#!/usr/bin/env npx tsx
/**
 * validate-blueprint.ts — validate a Deed blueprint.
 *
 * Checks, in order of how much they matter to a young person:
 *   1. BLOCKERS    — the closed list; any one forces `block` whatever the score
 *   2. STRUCTURE   — required phases and controls present
 *   3. COMMITMENTS — one per phase, in order, no blocker committed past
 *   4. REVIEW      — a pass must bind to the current blueprint hash
 *   5. COHERENCE   — cross-control consistency
 *
 * Usage:   npx tsx scripts/validate-blueprint.ts <path-to-blueprint.yaml|.json>
 * Exit:    0 clean, 1 on any blocker or structural failure, 2 on bad input.
 *
 * Programmatic:
 *   import { main } from './validate-blueprint';
 *   const result = main('blueprint.yaml');   // → ValidationResult
 *
 * No dependencies. Parses the YAML subset the blueprint template uses:
 * nested maps, inline maps, lists of scalars, lists of maps, block scalars.
 */

import { readFileSync } from 'node:fs';

// ─── Types ───────────────────────────────────────────────────────────────────

type Node = Record<string, unknown>;

export interface Finding {
  severity: 'blocker' | 'error' | 'warning';
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  file: string;
  findings: Finding[];
  counts: { blocker: number; error: number; warning: number };
}

// ─── Minimal YAML subset parser ──────────────────────────────────────────────

function stripComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === '#' && !inSingle && !inDouble) {
      if (i === 0 || /\s/.test(line[i - 1])) return line.slice(0, i);
    }
  }
  return line;
}

function parseInline(v: string): unknown | undefined {
  // { a: 1, b: x } — one level, which is all the template uses
  if (!(v.startsWith('{') && v.endsWith('}'))) return undefined;
  const inner = v.slice(1, -1).trim();
  if (inner === '') return {};
  const out: Node = {};
  for (const part of inner.split(',')) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim().replace(/^["']|["']$/g, '');
    if (k) out[k] = coerce(part.slice(idx + 1));
  }
  return out;
}

function coerce(raw: string): unknown {
  const v = raw.trim();
  if (v === '' || v === '~' || v === 'null') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  if (/^-?\d*\.\d+$/.test(v)) return Number(v);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (v === '[]') return [];
  const inline = parseInline(v);
  if (inline !== undefined) return inline;
  return v;
}

interface Line { indent: number; text: string; no: number }

function parseYaml(src: string): Node {
  const lines: Line[] = [];
  const raw = src.split(/\r?\n/);
  for (let i = 0; i < raw.length; i++) {
    const noComment = stripComment(raw[i]);
    if (noComment.trim() === '') continue;
    lines.push({
      indent: noComment.length - noComment.trimStart().length,
      text: noComment.trim(),
      no: i + 1,
    });
  }

  let pos = 0;

  function parseBlock(minIndent: number): unknown {
    if (pos >= lines.length) return null;
    const first = lines[pos];
    if (first.indent < minIndent) return null;
    return first.text.startsWith('- ') || first.text === '-'
      ? parseList(first.indent)
      : parseMap(first.indent);
  }

  function parseList(indent: number): unknown[] {
    const out: unknown[] = [];
    while (pos < lines.length) {
      const line = lines[pos];
      if (line.indent !== indent || !(line.text.startsWith('- ') || line.text === '-')) break;
      pos++;
      const rest = line.text === '-' ? '' : line.text.slice(2).trim();

      if (rest === '') {
        out.push(pos < lines.length && lines[pos].indent > indent ? parseBlock(lines[pos].indent) : null);
        continue;
      }

      const kv = rest.match(/^([A-Za-z_@$"][^:]*):\s*(.*)$/);
      if (kv) {
        const item: Node = {};
        const key = kv[1].trim().replace(/^["']|["']$/g, '');
        const val = kv[2].trim();
        item[key] = val === ''
          ? (pos < lines.length && lines[pos].indent > indent ? parseBlock(lines[pos].indent) : null)
          : coerce(val);
        while (pos < lines.length && lines[pos].indent > indent && !lines[pos].text.startsWith('- ')) {
          Object.assign(item, parseMap(lines[pos].indent));
        }
        out.push(item);
      } else {
        out.push(coerce(rest));
      }
    }
    return out;
  }

  function parseMap(indent: number): Node {
    const out: Node = {};
    while (pos < lines.length) {
      const line = lines[pos];
      if (line.indent < indent) break;
      if (line.indent > indent) { pos++; continue; }
      if (line.text.startsWith('- ')) break;

      const m = line.text.match(/^([A-Za-z_@$"][^:]*):\s*(.*)$/);
      if (!m) { pos++; continue; }

      const key = m[1].trim().replace(/^["']|["']$/g, '');
      const val = m[2].trim();
      pos++;

      if (['|', '>', '>-', '|-', '>+'].includes(val)) {
        const parts: string[] = [];
        while (pos < lines.length && lines[pos].indent > indent) { parts.push(lines[pos].text); pos++; }
        out[key] = parts.join(' ').trim();
        continue;
      }

      if (val === '') {
        out[key] = pos < lines.length && lines[pos].indent > indent ? parseBlock(lines[pos].indent) : null;
        continue;
      }

      out[key] = coerce(val);
    }
    return out;
  }

  const result = parseBlock(lines.length ? lines[0].indent : 0);
  return (result && typeof result === 'object' && !Array.isArray(result) ? result : {}) as Node;
}

// ─── Access helpers ──────────────────────────────────────────────────────────

function get(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const key of path.split('.')) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    cur = (cur as Node)[key];
  }
  return cur;
}

const isBlank = (v: unknown): boolean =>
  v === undefined || v === null || v === '' ||
  (typeof v === 'string' && /^<<<.*>>>$/.test(v.trim())) ||
  (Array.isArray(v) && v.length === 0);

const isTrue = (v: unknown): boolean => v === true || v === 'true';

// ─── The closed blocker list ─────────────────────────────────────────────────
// Mirrors references/readiness-progression.md. Keep the two in step; this list
// is closed, and nothing else may be promoted to a blocker.

interface Rule { path: string; check: (v: unknown, bp: unknown) => boolean; message: string }

const BLOCKERS: Rule[] = [
  // ── Safety and safeguarding ──
  {
    path: 'discovery.safeguarding.tier',
    check: (v) => isBlank(v),
    message: 'No safeguarding tier assigned. It parameterises accessibility, bids, consent, reward and determination — nothing downstream is valid without it.',
  },
  {
    path: 'discovery.safeguarding.signoff',
    check: (v) => {
      const s = v as Node | null;
      return !!s && isTrue(s.required) && isBlank(s.by);
    },
    message: 'Safeguarding sign-off is required by the tier but no named person has given it. Self-attestation does not substitute.',
  },
  {
    path: 'design.rights.consent.capacity_model',
    check: (v) => isBlank(v),
    message: 'Consent capacity unresolved for the target age band.',
  },
  {
    path: 'design.rights.consent.guardian_verification_method',
    check: (v, bp) => isTrue(get(bp, 'design.rights.consent.guardian_required')) && isBlank(v),
    message: 'Guardian consent is required but there is no verification method. Unverified guardian consent is not consent.',
  },
  {
    path: 'design.rights.retention.deletion_date',
    check: (v) => isBlank(v),
    message: 'Youth data retained with no deletion date.',
  },
  {
    path: 'design.rights.retention.owner',
    check: (v) => isBlank(v),
    message: 'Retention has no owner — nobody is accountable for deleting youth data.',
  },

  // ── Correctness ──
  {
    path: 'design.claim.rubric.all_paths_resolve',
    check: (v) => v !== undefined && !isTrue(v),
    message: 'A rubric field path does not resolve against the live #vct. Publication will fail with schema drift.',
  },
  {
    path: 'design.claim.rubric.opened_from_published',
    check: (v) => v === false,
    message: 'The rubric draft does not descend from the published #rub. Publishing replaces it outright — this would wipe live rules.',
  },
  {
    path: 'design.instructions.rejection_reasons_disclosed',
    check: (v) => v !== undefined && !isTrue(v),
    message: 'Rejection reasons were not disclosed before the work begins. A youth cannot avoid a rule they were never told.',
  },
  {
    path: 'design.cross_checks.rules_disclosed_in_instructions',
    check: (v) => v !== undefined && !isTrue(v),
    message: 'A rubric rule can reject a claim but does not appear in the instructions.',
  },
  {
    path: 'design.flow.unterminated_branches',
    check: (v) => Array.isArray(v) && v.length > 0,
    message: 'A flow branch does not terminate. A branch that silently ends is a young person left waiting.',
  },
  {
    path: 'deployment.listing.rejection_reasons_present',
    check: (v) => v !== undefined && !isTrue(v),
    message: 'The listing does not say what gets a claim rejected. That is mandatory listing content.',
  },
  {
    path: 'deployment.listing.rejection_reasons_localised',
    check: (v) => v !== undefined && !isTrue(v),
    message: 'Rejection reasons are not in the youth\'s languages. A reason they cannot read is no reason at all.',
  },

  // ── Authority ──
  {
    path: 'design.flow.bid_edge_verified',
    check: (v) => v !== undefined && !isTrue(v),
    message: 'claim/submit is reachable without an approved bid. Bid approval is what grants SubmitClaimAuthorization — youth would work with no authority to claim.',
  },
  {
    path: 'validation.agents.all_propose_only',
    check: (v, bp) => {
      if (v === undefined || isTrue(v)) return false;
      const esc = get(bp, 'validation.agents.escalations');
      return !Array.isArray(esc) || esc.length === 0;
    },
    message: 'An agent holds authority beyond propose-only with no recorded escalation and owner.',
  },
  {
    path: 'design.bid.evaluator.in_controller_set',
    check: (v) => v !== undefined && !isTrue(v),
    message: 'The bid evaluator is not in the controller set. Their approvals would fail.',
  },

  // ── Genuine readiness ──
  {
    path: 'validation.reward.funding_position',
    check: (v) => isBlank(v),
    message: 'No funding position stated. A young person is entitled to know whether the money is there.',
  },
  {
    path: 'validation.reward.disclosed_to_youth',
    check: (v) => v !== undefined && !isTrue(v),
    message: 'Funding position is not disclosed to youth. Listing is not gated on escrow, but disclosure is mandatory.',
  },
  {
    path: 'deployment.listing.funding_position_present',
    check: (v) => v !== undefined && !isTrue(v),
    message: 'The listing does not state the funding position.',
  },
  {
    path: 'design.access.data_cost.resolution',
    check: (v, bp) => {
      const share = get(bp, 'design.access.data_cost.share_of_reward');
      if (isBlank(share)) return false;
      const n = typeof share === 'number' ? share : parseFloat(String(share));
      if (Number.isNaN(n)) return false;
      const material = n > 1 ? n >= 10 : n >= 0.1; // accept percent or fraction
      return material && (isBlank(v) || v === 'none');
    },
    message: 'Data cost is a material share of the reward and is unresolved. Youth must not bear a net cost to participate.',
  },
  {
    path: 'validation.verification.dispute_path',
    check: (v) => isBlank(v),
    message: 'No dispute path. A youth cannot contest a rejection.',
  },
  {
    path: 'validation.verification.max_time_to_determination',
    check: (v) => isBlank(v),
    message: 'No time limit on determination. Youth would wait unpaid indefinitely.',
  },
  {
    path: 'validation.verification.human_capacity_checked',
    check: (v, bp) => {
      const manual = get(bp, 'design.claim.rubric.manual_nodes_count');
      const tier = get(bp, 'discovery.safeguarding.tier');
      const needsHuman = tier === 'high' || (typeof manual === 'number' && manual > 0);
      return needsHuman && v !== undefined && !isTrue(v);
    },
    message: 'Human determination is required but evaluator capacity has not been checked against claim volume. Youth would queue behind someone who cannot keep up.',
  },
  {
    path: 'testing.pilot.rejection_proven',
    check: (v, bp) => isTrue(get(bp, 'testing.pilot.completed')) && !isTrue(v),
    message: 'The pilot did not exercise a rejection path. Most of what goes wrong for young people happens there.',
  },
  {
    path: 'testing.pilot.participants_paid',
    check: (v, bp) =>
      isTrue(get(bp, 'testing.pilot.completed')) &&
      get(bp, 'testing.pilot.data') === 'real_with_consent' &&
      !isTrue(v),
    message: 'Real participants performed work in the pilot and were not paid. A pilot is not an unpaid trial.',
  },
];

// ─── Structure ───────────────────────────────────────────────────────────────

const PHASES = ['discovery', 'design', 'validation', 'testing', 'deployment'] as const;

/** Control id → the blueprint path that carries its document. */
const CONTROLS: Record<string, string> = {
  C1: 'discovery.provider', C2: 'discovery.pod', C3: 'discovery.intent',
  C4: 'discovery.safeguarding', C5: 'discovery.impact',
  C6: 'design.task', C7: 'design.access', C8: 'design.instructions',
  C9: 'design.evidence', C10: 'design.bid', C11: 'design.claim',
  C12: 'design.rights', C13: 'design.flow',
  C14: 'validation.fraud', C15: 'validation.agents', C16: 'validation.reward',
  C17: 'validation.verification', C18: 'validation.governance',
  C19: 'testing.pilot', C20: 'testing.integrated_check',
  C21: 'deployment.rubric_publication', C22: 'deployment.domain_documentation',
  C23: 'deployment.listing', C24: 'deployment.readiness', C25: 'deployment.operate',
};

/**
 * The consumes-map, from references/semantic-dependencies.md.
 * Read as: this control depends on these. A control may never depend on one
 * that comes later in id order.
 */
const CONSUMES: Record<string, string[]> = {
  C2: ['C1'], C5: ['C3'],
  C6: ['C3'], C7: ['C4'], C8: ['C6', 'C7'], C9: ['C5', 'C6', 'C7'],
  C10: ['C1', 'C2', 'C4', 'C7'], C11: ['C5', 'C7', 'C8', 'C9'],
  C12: ['C1', 'C4', 'C10'], C13: ['C1', 'C2', 'C10', 'C11', 'C12'],
  C14: ['C9', 'C10', 'C11'], C15: ['C2', 'C12'], C16: ['C2', 'C3', 'C4', 'C6', 'C10'],
  C17: ['C1', 'C4', 'C11', 'C15', 'C16'], C18: ['C14', 'C15', 'C16'],
  C19: ['C4', 'C13', 'C17'], C20: ['C11', 'C12', 'C13', 'C14', 'C19'],
  C21: ['C2', 'C11', 'C13', 'C20'], C22: ['C2'],
  C23: ['C7', 'C8', 'C16'], C24: ['C17', 'C18', 'C19', 'C20', 'C21'],
  C25: ['C5', 'C14', 'C17'],
};

const idNum = (c: string) => parseInt(c.slice(1), 10);

// ─── Validate ────────────────────────────────────────────────────────────────

export function validate(blueprint: unknown, file = '<inline>'): ValidationResult {
  const findings: Finding[] = [];
  const bp = get(blueprint, 'deed_blueprint') ?? blueprint;

  // 1. Blockers
  for (const rule of BLOCKERS) {
    if (rule.check(get(bp, rule.path), bp)) {
      findings.push({ severity: 'blocker', path: rule.path, message: rule.message });
    }
  }

  // 2. Structure
  for (const phase of PHASES) {
    if (get(bp, phase) === undefined) {
      findings.push({ severity: 'error', path: phase, message: `Required phase '${phase}' is missing.` });
    }
  }

  const filled = (path: string): boolean => {
    const v = get(bp, path);
    if (v === undefined || v === null) return false;
    if (typeof v !== 'object') return !isBlank(v);
    return Object.values(v as Node).some((x) => !isBlank(x));
  };

  for (const [id, path] of Object.entries(CONTROLS)) {
    if (get(bp, path) === undefined) {
      findings.push({ severity: 'error', path, message: `Control ${id} has no document at '${path}'.` });
    }
  }

  // 3. Dependency ordering — a control with content must not rest on an empty one
  for (const [id, deps] of Object.entries(CONSUMES)) {
    const path = CONTROLS[id];
    if (!path || !filled(path)) continue;
    for (const dep of deps) {
      if (idNum(dep) > idNum(id)) {
        findings.push({
          severity: 'error',
          path,
          message: `Dependency ordering violated: ${id} consumes ${dep}, which comes later.`,
        });
      } else if (!filled(CONTROLS[dep])) {
        findings.push({
          severity: 'warning',
          path,
          message: `${id} has content but consumes ${dep} (${CONTROLS[dep]}), which is empty — it may be resting on a draft.`,
        });
      }
    }
  }

  // 4. Phase commitments
  const commitments = get(bp, 'commitments');
  if (Array.isArray(commitments) && commitments.length > 0) {
    const seen: string[] = [];
    for (const c of commitments as Node[]) {
      const phase = String(c?.phase ?? '');
      seen.push(phase);
      if (!isTrue(c?.playback_shown)) {
        findings.push({
          severity: 'error',
          path: `commitments.${phase}`,
          message: `Phase '${phase}' was committed without a playback. A commitment taken without playback is a rubber stamp.`,
        });
      }
      const cb = get(c, 'checklist.blockers');
      if (Array.isArray(cb) && cb.length > 0) {
        findings.push({
          severity: 'blocker',
          path: `commitments.${phase}`,
          message: `Phase '${phase}' was committed with ${cb.length} blocker(s) open. Blockers cannot be committed past.`,
        });
      }
      if (isBlank(c?.committed_by)) {
        findings.push({
          severity: 'error',
          path: `commitments.${phase}`,
          message: `Phase '${phase}' commitment has no named person.`,
        });
      }
    }
    // order
    const expected = PHASES.filter((p) => seen.includes(p));
    if (seen.join(',') !== expected.join(',')) {
      findings.push({
        severity: 'error',
        path: 'commitments',
        message: `Phases committed out of order: ${seen.join(' → ')}. Expected ${expected.join(' → ')}.`,
      });
    }
  }

  // 5. Review freshness — a pass binds to the hash it reviewed
  const reviewStatus = get(bp, 'review.status');
  if (reviewStatus === 'passed') {
    const reviewedHash = get(bp, 'review.passed_at_blueprint_hash');
    const currentHash = get(bp, 'meta.blueprint_hash');
    if (!isBlank(reviewedHash) && !isBlank(currentHash) && reviewedHash !== currentHash) {
      findings.push({
        severity: 'blocker',
        path: 'review.passed_at_blueprint_hash',
        message: 'The review passed against a different blueprint hash. A blueprint that changed after review has not been reviewed.',
      });
    }
  }

  // 6. Coherence
  const effort = get(bp, 'design.task.effort.active_hours');
  if (!isBlank(effort) && isBlank(get(bp, 'validation.reward.implied_hourly_rate'))) {
    findings.push({
      severity: 'warning',
      path: 'validation.reward.implied_hourly_rate',
      message: 'Effort is stated but the implied hourly rate is not computed. It is the number the provider has to be willing to defend.',
    });
  }

  const capacity = get(bp, 'design.bid.capacity.max_approved');
  const runway = get(bp, 'validation.reward.runway_completions');
  if (typeof capacity === 'number' && typeof runway === 'number' && capacity > runway) {
    findings.push({
      severity: 'warning',
      path: 'design.bid.capacity.max_approved',
      message: `Capacity (${capacity}) exceeds funded runway (${runway}). Youth could be approved into unfunded work — confirm the exhaustion behaviour is communicated.`,
    });
  }

  if (get(bp, 'design.evidence.minimality_checked') === false) {
    findings.push({
      severity: 'warning',
      path: 'design.evidence.minimality_checked',
      message: 'Evidence minimality is not confirmed — youth data may be collected that no rule consumes.',
    });
  }

  const accepted = get(bp, 'accepted_for_later');
  if (Array.isArray(accepted)) {
    for (const item of accepted as Node[]) {
      if (isBlank(item?.owner)) {
        findings.push({
          severity: 'warning',
          path: 'accepted_for_later',
          message: `Deferred item "${item?.item ?? 'unnamed'}" has no owner. An item with no owner is not deferred, it is dropped.`,
        });
      }
    }
  }

  const counts = {
    blocker: findings.filter((f) => f.severity === 'blocker').length,
    error: findings.filter((f) => f.severity === 'error').length,
    warning: findings.filter((f) => f.severity === 'warning').length,
  };

  return { ok: counts.blocker === 0 && counts.error === 0, file, findings, counts };
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function main(path: string): ValidationResult {
  const src = readFileSync(path, 'utf8');
  const parsed: unknown = src.trimStart().startsWith('{') ? JSON.parse(src) : parseYaml(src);
  return validate(parsed, path);
}

function report(result: ValidationResult): void {
  const icon = { blocker: '⛔', error: '✗ ', warning: '! ' };
  const order = { blocker: 0, error: 1, warning: 2 } as const;

  console.log(`\ndesign-yoma · validate-blueprint\n${result.file}\n`);

  if (result.findings.length === 0) {
    console.log('  No findings. Blueprint is structurally sound and carries no blockers.\n');
    return;
  }

  for (const f of [...result.findings].sort((a, b) => order[a.severity] - order[b.severity])) {
    console.log(`  ${icon[f.severity]} ${f.path}`);
    console.log(`     ${f.message}\n`);
  }

  const { blocker, error, warning } = result.counts;
  console.log(`  ${blocker} blocker(s), ${error} error(s), ${warning} warning(s)`);
  console.log(blocker > 0
    ? '\n  Blockers override the readiness score. This Deed cannot be published.\n'
    : '');
}

const invoked = process.argv[1] && /validate-blueprint\.(ts|js)$/.test(process.argv[1]);
if (invoked) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: npx tsx scripts/validate-blueprint.ts <path-to-blueprint.yaml|.json>');
    process.exit(2);
  }
  try {
    const result = main(target);
    report(result);
    process.exit(result.ok ? 0 : 1);
  } catch (err) {
    console.error(`Could not validate ${target}: ${(err as Error).message}`);
    process.exit(2);
  }
}
