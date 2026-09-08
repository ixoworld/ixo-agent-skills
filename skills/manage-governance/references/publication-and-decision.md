# Deliberation, publication, voting and decision

First apply [DAO DAO compatibility](daodao-v271.md). The sequence below describes the single-choice path; multiple-choice publication requires independently pinned ordered choices and per-option messages/resolutions. An approval queue is an intermediate stage before a real voting proposal exists.

## Freeze the artifact graph

1. Resolve any direct chain actions into the exact ordered JSON array that will populate DAO DAO `msgs`. Pin it separately in the entity's `/governance` directory through VFS and obtain its CID. An action form or intermediate description is insufficient. When there are no direct messages, record that fact explicitly and verify the submitted message list is empty.
2. For delegated actions, pin immutable inputs, manifests/evidence policies, Flow plan and machine resolution in dependency order under GRS-001. Bind every effect and condition. Reference the resolution and direct-message payload CIDs in the proposal with a readable explanation.
3. Freeze and store the final human proposal, then record its returned CID externally in the Topic and submission worksheet. Never insert the document's own CID inside itself. Preserve source visibility and retrieval context.
4. Verify bytes and eligible-voter access separately. Resolve unavailable material evidence or arrange an authorised disclosure process before submission. Possession of a CID is not a substitute for access.
5. Prepare the exact Portal submission: title, summary/description with the proposal-document CID, matching ordered messages, and the real DAO/module/network. Check the actual module's proposal schema, proposer eligibility, deposits, voting rules and timing. Present the concrete version if a wallet/review confirmation is required. Reuse any existing scoped authorisation.
6. Submit only through the declared, authorised path. Read back the proposal record and transaction; verify document reference, full JSON values and message order, including decoding and comparing embedded encoded payloads. Do not normalise away meaningful numeric/string differences. Tool success or a transaction hash alone does not prove a matching proposal.
7. Link chain ID, DAO core, proposal module, proposal ID, transaction hash/height and finality evidence to the Topic/VFS submission record. If read-back mismatches, flag the discrepancy and follow the group's remedy; never silently “repair” the voted document or allow execution against a mismatched binding.

Pinning may create files before a later step fails. Preserve those artifact receipts, report the unfinished stage, and resume without duplicating successful writes. A missing `msgs` pin blocks only submissions with direct messages. No direct messages does not mean no eventual delegated or off-chain effects.

## Deliberate and revise

Summarise arguments with supporting references and dissent. Show what changed and why. Keep one stable proposal reference across versions and a distinct record for each submission. A changed proposal receives a new document CID and a new submission under the group's rules; changed actions also receive new payload/Flow/resolution CIDs as appropriate. Retain old artifacts and links.

If a revision is still only a draft, say so. After submission, separate explanatory commentary from a changed resolution. Handle withdrawal, cancellation or supersession using the actual module and mandate; do not assume they exist. Duplicate submissions are not a recovery strategy for a timeout: reconcile by transaction, proposer, module and exact artifact/message binding first.

## Vote and observe

Explain eligibility and the real voting rules; offer a sourced recommendation if asked. Never record a model preference as a vote. A user's voting request requires that voter's explicit instruction and the permitted wallet/transaction path, including a supported explicitly requested vote-on-submission; prior authorisation to draft or submit is not a voting instruction. Do not solicit proxy rights or vote for other members.

Query the authoritative chain/module for live status and finality, using indexed results only with their provenance and lag visible. Record observation time and source. Preserve the module's raw status and a separate human interpretation; module states differ. Distinguish pending, voting, rejected, passed, closed/expired where applicable, executed and execution failure using actual evidence.

Approval is not execution. Some mandates activate delegation on final `passed`, others require `executed`; use the exact approved policy and trusted decision binding. A topic marked complete or a majority-looking comment thread is not an activation event. No execution/issuance may rely on a rejected, expired, cancelled, mismatched or insufficiently final decision.

## Follow-through

For rejection, preserve the result and reasons where evidenced, close or revisit the proposal through the actual process, and offer a revision or process review. For approval, load execution guidance before requesting issuance or starting a Flow. For a policy with no executable actions, record the approved policy/effective event and support the accountable person's adoption evidence and later outcome claims.

Set a watch only when the user or a valid mandate requests monitoring and an available scheduler returns durable evidence. Define what changes matter, scope, end condition and recipient permissions; sending messages to others requires explicit authority. Otherwise provide the current observation and a resumable next check without claiming to monitor in the background.
