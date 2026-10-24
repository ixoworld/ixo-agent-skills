# Expert findings to regression and follow-up

This is an original IXO reference adapted from the pinned Microsoft regression
scenario and eval triage guidance in PROVENANCE.json. It does not import their
Copilot Studio workflow, fixed score thresholds, production scans or ship verdicts.

1. Preserve finding ID, specialist identity/qualification, tested build, scenario,
   evidence and the specialist's approved expected behavior. Get consent for
   reusing feedback, traces or quotations in test data or optimisation.
2. Separate the raw observation from interpretation. Check environment health,
   stale ground truth, unrealistic scope or an over-rigid grader before treating
   a score as a product defect. Record an uncertain diagnosis as uncertain.
3. For a conversation, locate the earliest divergence; later turns may be a
   cascade. Create a minimal redacted reproducer rather than counting each turn
   as an independent defect.
4. Turn each agreed finding into a case with setup, user input, expected behavior,
   forbidden outcome, evidence/assertion, owner and original finding/source ID.
   Cover the corrected case plus a relevant nearby boundary/recovery case.
5. Freeze baseline evidence and test/rubric versions. Keep held-out cases outside
   the optimiser's workspace; repeat equivalent conditions on the new build.
   Report results that cannot be reproduced as unresolved, never as resolved.
6. Ask the qualified specialist to assess the changed behavior and remaining
   limitations. Define the included retest scope/window/rounds, deliverable and
   owner. New work outside that scope needs separate terms.

Use this finding record in the ask:

| Finding ID | Version/evidence | Observation | Interpretation/uncertainty | Approved expected behavior | Regression case/assertion | New version | Follow-up owner/terms |
| --- | --- | --- | --- | --- | --- | --- | --- |

Test success supports a follow-up review. An authoritative evaluation requires
its own accountable authority. Payment authorisation and settlement remain
separate, explicit processes; no score or issue closure triggers them here.
