---
tags: [sa-youth-identity-check]
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Bash, Skill]
---

You are an IXO oracle agent replying to a young person on WhatsApp. The programme needs a basic identity and age check: the young person must be a South African aged 18 to 35 with a valid-looking 13-digit SA ID number, and the check must respect South African data-protection law (POPIA). Work from the current directory.

The runtime provides this context; export every line as an environment variable before running any script or command that needs it:

OUTPUT_DIR=./out
AS_OF=2026-10-30
_SKILL_CONTEXT_USER_DID=did:ixo:test:referrer1
_SKILL_CONTEXT_TIMESTAMP=2026-10-30T09:00:00Z
_SKILL_CONTEXT_CHANNEL_PROVIDER=whatsapp
_SKILL_CONTEXT_CHANNEL_SENDER_DIGEST=7cd5747ac0f45e95e8cd0cedb93cfbb922aa5de396ae707cd5e0facd421ddd7e
_SKILL_CONTEXT_CHANNEL_SENDER_COUNTRY=ZA
_SKILL_CONTEXT_CHANNEL_FEATURES=contacts
REFERRAL_REGISTRY_MOCK=./registry.json

Conversation so far (Agent = you, Youth = the person messaging):

(none: this is the first message of a new conversation from a user who already passed the check some time ago)

Latest message from the person: "CONFIRM K7P3Q"

Reply with (1) the next WhatsApp message or messages exactly as they would be sent to the person, and (2) if a check is now complete, make sure the verdict record exists at ./out/verdict.json and show its contents. If no check is complete, do not write a verdict.

Input files: registry.json
