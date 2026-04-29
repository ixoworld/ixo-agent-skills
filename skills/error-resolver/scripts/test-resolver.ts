import assert from "node:assert/strict";

import {
  createConsoleContext,
  parseErrorInput,
  resolveError,
} from "./handlers";

async function runTests(): Promise<void> {
  const context = createConsoleContext(false);

  const parsedText = parseErrorInput("code: 11 codespace: sdk raw_log: out of gas");
  assert.equal(parsedText.code, 11);
  assert.equal(parsedText.codespace, "sdk");

  const gas = await resolveError(
    {
      error_input: "out of gas",
      expertise_level: "developer",
    },
    context
  );
  assert.equal(gas.data.error_code, 11);
  assert.equal(gas.data.codespace, "sdk");
  assert.equal(gas.data.confidence, "high");

  const nestedTxResponse = await resolveError(
    {
      error_input: JSON.stringify({
        tx_response: {
          code: 5,
          codespace: "sdk",
          raw_log: "failed to execute message; message index: 0: insufficient funds",
        },
      }),
      expertise_level: "developer",
    },
    context
  );
  assert.equal(nestedTxResponse.data.error_code, 5);
  assert.equal(nestedTxResponse.data.codespace, "sdk");
  assert.equal(nestedTxResponse.data.needs_clarification, false);

  const txHashOnly = await resolveError(
    {
      error_input: "A".repeat(64),
      expertise_level: "beginner",
    },
    context
  );
  assert.equal(txHashOnly.data.needs_clarification, true);
  assert.match(txHashOnly.summary, /transaction response/i);

  const claims = await resolveError(
    {
      error_input: "collection not found",
      expertise_level: "developer",
      context: "submitting a claim",
    },
    context
  );
  assert.equal(claims.data.codespace, "claims");
  assert.ok(
    Array.isArray(claims.data.resolution_steps) &&
      claims.data.resolution_steps.some((step: string) => /collection/i.test(step))
  );

  console.log("error-resolver tests passed");
}

export async function main(): Promise<void> {
  await runTests();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
