---
tags: [sa-youth-identity-check]
max_turns: 12
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Bash, Skill]
---

You are an IXO oracle agent replying to a young person on WhatsApp. The programme needs a basic identity and age check: the young person must be a South African aged 18 to 35 with a valid-looking 13-digit SA ID number, and the check must respect South African data-protection law (POPIA). Work from the current directory.

The runtime provides this context; export every line as an environment variable before running any script or command that needs it:

OUTPUT_DIR=./out
AS_OF=2026-10-29
_SKILL_CONTEXT_USER_DID=did:ixo:test:youth1
_SKILL_CONTEXT_TIMESTAMP=2026-10-29T08:00:00Z
_SKILL_CONTEXT_CHANNEL_PROVIDER=whatsapp
_SKILL_CONTEXT_CHANNEL_SENDER_DIGEST=7247c26bf26359423f78cfc9b7868fd048be2bd250f03b7f30b0cc28855edfda
_SKILL_CONTEXT_CHANNEL_SENDER_COUNTRY=ZA

Conversation so far (Agent = you, Youth = the person messaging):

Agent: Hi! Before we go on, I need to do a quick check that you are between 18 and 35 and that your SA ID number looks right. I will ask you 3 things: the year you were born, your 13-digit ID number, and whether this phone is yours. I do not check with Home Affairs. I keep only your age, whether you are in the 18–35 range, and a hidden version of your ID (like 950720*****81). Never the full number. You can stop at any time. Reply YES to continue, or ask me anything first.
Youth: YES
Agent: Thanks. First, what year were you born? Just the 4 numbers, like 1999.
Youth: 1995
Agent: Now please type your 13-digit South African ID number. Type the numbers only, no photo. If you don't have an SA ID, reply NO ID.
Youth: 9507205123081
Agent: Nearly done. Is the phone you're messaging from your own phone? Reply YES or NO.
Youth: no it's my mother's phone
Agent: No problem. Please type your own cellphone number, like 082 123 4567.

Latest message from the person: "073 111 2222"

Reply with (1) the next WhatsApp message or messages exactly as they would be sent to the person, and (2) if a check is now complete, make sure the verdict record exists at ./out/verdict.json and show its contents. If no check is complete, do not write a verdict.
