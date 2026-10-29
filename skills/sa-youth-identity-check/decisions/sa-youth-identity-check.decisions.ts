/**
 * QiForge Decision definitions for sa-youth-identity-check (version 1.0.0).
 *
 * These are bounded semantic judgments over a youth's free-text reply, for a
 * plugin to register through `getDecisions()` and the agent to call through a
 * decisions tool once one exists. Until then the agent applies the identical
 * options and thresholds from `references/rubric.md`; the verdict records which
 * path was used (`provenance.classifier`).
 *
 * A Decision never grants authority. `passed` is produced by
 * `scripts/build-verdict.js` from script facts plus recorded consent; nothing
 * downstream may act on a Decision answer directly, only on the verdict.
 *
 * Data minimisation: every `project()` redacts the reply first (a 13-digit run
 * becomes `[id]`, a phone-number-like run becomes `[number]`, text is capped at
 * 600 characters), so neither an ID nor a number ever reaches a provider even
 * when the agent passes the wrong message. An empty reply is declared
 * evidence-incomplete so the runtime refuses instead of reading silence as an
 * answer.
 *
 * This file is documentation and a registration artefact. The sandbox agent
 * never executes it.
 */
import { defineDecision } from '@ixo/oracle-runtime-workers';
import { z } from 'zod';

export const DECISION_VERSION = '1.0.0';
const NS = 'sa-youth-identity-check';

export function redact(text: string): string {
  return text
    .replace(/\d{13}/g, '[id]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, (m) => ((m.match(/\d/g) || []).length >= 9 ? '[number]' : m))
    .slice(0, 600);
}

function applicability(text: string) {
  return text.trim().length > 0
    ? { applicable: true, evidenceComplete: true }
    : { applicable: true, evidenceComplete: false, reason: 'No reply text to judge; ask again.' };
}

const NOTICE_SUMMARY =
  'The youth was told: a quick check that they are 18 to 35 and that their SA ID number looks right; ' +
  'three things will be asked (year of birth, 13-digit ID number, whether this phone is theirs), or four when the phone number must be typed; ' +
  'this is not a Home Affairs check; only age, the 18-35 flag and a hidden ID are kept, never the full number; ' +
  'they can stop at any time; reply YES to continue or ask a question first.';

export const consentResponse = defineDecision({
  name: `${NS}.consent-response`,
  version: DECISION_VERSION,
  description: 'Classify the reply to the privacy notice: consent given, declined, a question, or unclear.',
  inputSchema: z.object({ reply: z.string() }),
  project(input) {
    const reply = redact(input.reply);
    return {
      state: { noticeSummary: NOTICE_SUMMARY, reply },
      applicability: applicability(reply),
      questions: {
        response: {
          kind: 'choice',
          instructions:
            'The youth has just read the privacy notice summarised in noticeSummary. How does their reply answer it? ' +
            'Treat an explicit affirmative in any language (yes, ja, ewe, yebo, ok yes, go ahead) as given.',
          options: {
            given: 'An explicit affirmative: they agree to continue with the check.',
            declined: 'They do not want to continue or do not want to share their ID.',
            question: 'They ask what, why, who, how long, what happens to the data, or reply INFO.',
            unclear: 'Anything else, including a bare greeting, "ok?", or an ambiguous reply.',
          },
        },
      },
    };
  },
});

export const turnIntent = defineDecision({
  name: `${NS}.turn-intent`,
  version: DECISION_VERSION,
  description: 'On every other step: is the youth answering, stopping, asking, or off topic?',
  inputSchema: z.object({
    expectedAnswer: z.enum(['year', 'id', 'yes_no', 'number', 'contact_card']),
    reply: z.string(),
  }),
  project(input) {
    const reply = redact(input.reply);
    return {
      state: { expectedAnswer: input.expectedAnswer, reply },
      applicability: applicability(reply),
      questions: {
        intent: {
          kind: 'choice',
          instructions:
            'The agent asked for the kind of answer named in expectedAnswer. What is the youth doing with this reply? ' +
            'A malformed attempt at the expected answer is still answering; validity is decided elsewhere.',
          options: {
            answering: 'An attempt at the expected answer, even if malformed.',
            wants_to_stop: 'They want to stop, cancel, leave, or not do this now.',
            has_question: 'They ask something instead of answering.',
            off_topic: 'Unrelated to the check.',
          },
        },
      },
    };
  },
});

export const idAvailability = defineDecision({
  name: `${NS}.id-availability`,
  version: DECISION_VERSION,
  description: 'When asked for the ID number: do they have an SA ID, no SA ID, or another document?',
  inputSchema: z.object({ reply: z.string() }),
  project(input) {
    const reply = redact(input.reply);
    return {
      state: { reply },
      applicability: applicability(reply),
      questions: {
        availability: {
          kind: 'choice',
          instructions: 'The youth was asked to type their 13-digit South African ID number. Which best describes the reply?',
          options: {
            has_sa_id: 'They give, or try to give, an SA ID number.',
            no_sa_id: 'They say they have no SA ID, lost it, or never had one.',
            other_document: 'They offer a passport, asylum or permit number, or a birth certificate instead.',
            unclear: 'Anything else.',
          },
        },
      },
    };
  },
});

export const phoneOwnership = defineDecision({
  name: `${NS}.phone-ownership`,
  version: DECISION_VERSION,
  description: 'After "Is this phone your own?": own, borrowed, one of several numbers, or unclear.',
  inputSchema: z.object({ question: z.string(), reply: z.string() }),
  project(input) {
    const reply = redact(input.reply);
    return {
      state: { question: redact(input.question), reply },
      applicability: applicability(reply),
      questions: {
        ownership: {
          kind: 'choice',
          instructions:
            'The youth was asked whether the phone they are messaging from is their own. Which best describes the reply? ' +
            'Shared family phones and dual-SIM handsets are common; read the reply literally and kindly.',
          options: {
            own: 'Yes, the phone and number are theirs.',
            borrowed: 'The phone belongs to a parent, friend, cousin, employer, or is shared and not theirs.',
            both_numbers: 'They have more than one number or SIM and this is one of them.',
            unclear: 'Anything else.',
          },
        },
      },
    };
  },
});

export const safeguardingSignal = defineDecision({
  name: `${NS}.safeguarding-signal`,
  version: DECISION_VERSION,
  description: 'Does the recent conversation show distress, coercion, or a third party controlling the youth?',
  inputSchema: z.object({ recentMessages: z.array(z.string()).max(3) }),
  project(input) {
    const recentMessages = input.recentMessages.map(redact);
    const joined = recentMessages.join('\n');
    return {
      state: { recentMessages },
      applicability: applicability(joined),
      questions: {
        atRisk: {
          kind: 'boolean',
          instructions: 'Do these messages from the youth show that they are not safe or not free to decide for themselves?',
          criteria: {
            true: 'Distress, fear, coercion, or someone else pressuring them or doing this for them.',
            false: 'Ordinary frustration, confusion, impatience, jokes, or neutral replies.',
          },
        },
        signalType: {
          kind: 'choice',
          instructions: 'If there is a signal, which kind? Choose none when there is no signal.',
          options: {
            none: 'No welfare signal.',
            distress: 'Emotional distress or fear.',
            coercion: 'Someone is making them do this.',
            third_party_control: 'Someone else is operating the phone or answering for them.',
          },
        },
      },
    };
  },
});

/** Every Decision in this skill, for a plugin's `getDecisions()`. */
export const decisions = [consentResponse, turnIntent, idAvailability, phoneOwnership, safeguardingSignal];

/* ---------------------------------------------------------------------------
 * Policy: the thresholds below are repeated word for word in references/rubric.md.
 * Change both or neither. They are policy artefacts, not provider defaults.
 * ------------------------------------------------------------------------- */

export interface ChoiceAnswer {
  kind: 'choice';
  value: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface BooleanAnswer {
  kind: 'boolean';
  probabilityTrue: number;
}

function p(a: ChoiceAnswer, option: string): number {
  const fromMap = a.probabilities?.[option];
  if (typeof fromMap === 'number') return fromMap;
  return a.value === option ? a.confidence : 0;
}

export const THRESHOLDS = {
  consentGiven: 0.75,
  consentDeclined: 0.5,
  wantsToStop: 0.6,
  hasQuestion: 0.6,
  noSaId: 0.6,
  phoneOwn: 0.75,
  phoneBorrowed: 0.5,
  safeguardingAtRisk: 0.4,
} as const;

export type ConsentOutcome = 'proceed' | 'stop' | 'send_long_notice' | 'reask';
export function consentPolicy(a: ChoiceAnswer): ConsentOutcome {
  if (p(a, 'given') >= THRESHOLDS.consentGiven) return 'proceed';
  if (p(a, 'declined') >= THRESHOLDS.consentDeclined) return 'stop';
  if (a.value === 'question') return 'send_long_notice';
  return 'reask'; // a second unclear reply counts as declined (agent-side rule)
}

export type TurnOutcome = 'answer' | 'stop' | 'answer_question' | 'redirect';
export function turnIntentPolicy(a: ChoiceAnswer): TurnOutcome {
  if (p(a, 'wants_to_stop') >= THRESHOLDS.wantsToStop) return 'stop';
  if (p(a, 'has_question') >= THRESHOLDS.hasQuestion) return 'answer_question';
  if (a.value === 'off_topic') return 'redirect';
  return 'answer';
}

export type IdAvailabilityOutcome = 'proceed' | 'not_applicable' | 'reask';
export function idAvailabilityPolicy(a: ChoiceAnswer): IdAvailabilityOutcome {
  if (p(a, 'no_sa_id') + p(a, 'other_document') >= THRESHOLDS.noSaId) return 'not_applicable';
  if (a.value === 'has_sa_id') return 'proceed';
  return 'reask';
}

export type PhoneOwnershipOutcome = 'own' | 'borrowed' | 'both' | 'reask';
export function phoneOwnershipPolicy(a: ChoiceAnswer): PhoneOwnershipOutcome {
  if (p(a, 'own') >= THRESHOLDS.phoneOwn) return 'own';
  if (p(a, 'borrowed') >= THRESHOLDS.phoneBorrowed) return 'borrowed';
  if (a.value === 'both_numbers') return 'both';
  return 'reask';
}

export function safeguardingPolicy(atRisk: BooleanAnswer, signalType?: ChoiceAnswer): { pause: boolean; signalType: string } {
  const pause = atRisk.probabilityTrue >= THRESHOLDS.safeguardingAtRisk;
  return { pause, signalType: pause ? signalType?.value ?? 'distress' : 'none' };
}
