/**
 * The 12 machine states grouped into the 7 guided phases, mirroring the phase table in
 * skills/outcome-graph/SKILL.md. The skill's rule — friendly name to the user, exact
 * machine state in the audit trail — is why every phase carries both, and why the UI
 * shows the state string verbatim alongside the friendly name rather than hiding it.
 *
 * Isomorphic: imported by the Worker, the snapshot generator, and the browser app.
 */

export const PHASES = [
  {
    number: 1,
    name: "Set the goal",
    states: ["SOURCE_ACCEPTED"],
    why: "Establish what source and decision are in scope.",
  },
  {
    number: 2,
    name: "Read the theory",
    states: ["TOC_PARSED", "CLAIMS_STRUCTURED"],
    why: "Separate explicit propositions from ambiguity and inference.",
  },
  {
    number: 3,
    name: "Map the change",
    states: ["CAUSAL_GRAPH_DRAFTED"],
    why: "Turn the narrative into testable paths with assumptions and confounders.",
  },
  {
    number: 4,
    name: "Check the evidence",
    states: ["EVIDENCE_GRAPH_LINKED"],
    why: "Show what supports each important claim and what is missing.",
  },
  {
    number: 5,
    name: "Test the graph",
    states: ["VALIDATION_RUNNING"],
    why: "Run semantic, structural, causal, and empirical checks.",
  },
  {
    number: 6,
    name: "Make the governed decision",
    states: ["REVIEW_REQUIRED", "VALIDATED", "REJECTED"],
    why: "Keep normative or high-risk decisions with an authorized human.",
  },
  {
    number: 7,
    name: "Evaluate and issue",
    states: ["ISSUANCE_ELIGIBLE", "CERTIFICATE_ISSUED", "VERSION_ARCHIVED"],
    why: "Submit governed claims, collect verified receipts, and issue the exact attainable certificate.",
  },
];

export const PHASE_COUNT = PHASES.length;

const BY_STATE = new Map();
for (const phase of PHASES) {
  for (const state of phase.states) BY_STATE.set(state, phase);
}

/** The phase a machine state belongs to, or null for an unrecognised state. */
export function phaseForState(state) {
  const phase = BY_STATE.get(state);
  if (!phase) return null;
  return { number: phase.number, of: PHASE_COUNT, name: phase.name, why: phase.why };
}

/**
 * States that mean "this run stopped here" rather than "this run is progressing".
 * REJECTED and VERSION_ARCHIVED are terminal; REVIEW_REQUIRED is a *pause*, and the
 * skill is explicit that it must never be presented as a failure.
 */
export const TERMINAL_STATES = new Set(["REJECTED", "VERSION_ARCHIVED"]);
export const PAUSED_STATES = new Set(["REVIEW_REQUIRED"]);

/**
 * Per-phase progress for the timeline rail, derived from the transitions the run
 * actually recorded. A phase is `done` when a later phase has been entered, `current`
 * when it holds the current state, and `pending` otherwise — so a run that skipped a
 * state (a diagnostic run that never reaches issuance) still renders truthfully.
 *
 * @param {string} currentState
 * @param {Array<{from: string, to: string, at: string, approved_by?: string}>} transitions
 */
export function phaseProgress(currentState, transitions = []) {
  const current = phaseForState(currentState);
  const currentNumber = current?.number ?? 0;

  // Latest transition into each phase, for the "entered at / approved by" line.
  const entered = new Map();
  for (const t of transitions) {
    const phase = phaseForState(t.to);
    if (!phase) continue;
    entered.set(phase.number, { at: t.at, approved_by: t.approved_by ?? null, state: t.to });
  }

  return PHASES.map((phase) => {
    let status = "pending";
    if (phase.number < currentNumber) status = "done";
    else if (phase.number === currentNumber) {
      if (PAUSED_STATES.has(currentState)) status = "paused";
      else if (TERMINAL_STATES.has(currentState)) status = "terminal";
      else status = "current";
    }
    return {
      number: phase.number,
      name: phase.name,
      why: phase.why,
      states: phase.states,
      status,
      entered: entered.get(phase.number) ?? null,
    };
  });
}
