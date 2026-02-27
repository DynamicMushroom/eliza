import type { Evaluator, IAgentRuntime, Memory, State } from '@elizaos/core';

// Keywords that indicate the user is talking about FL Studio or the DAW session
const DAW_PATTERNS = [
  /\bfl\s*studio\b/i,
  /\bfl\b(?:\s+studio)?/i,
  /\bdaw\b/i,
  /\bpattern\s*\d+/i,
  /\bpiano\s*roll\b/i,
  /\bplaylist\b/i,
  /\bmixer\b/i,
  /\bchannel\s*rack\b/i,
  /\bstep\s*sequencer\b/i,
  /\btransport\b/i,
  /\b(?:set|change|what.?s?\s+(?:the\s+)?)\s*bpm\b/i,
  /\btempo\b/i,
  /\bsession\b/i,
  /\bautomation\s*clip\b/i,
  /\bfruity\b/i,
];

export const dawMentionEvaluator: Evaluator = {
  name: 'DAW_MENTION',
  description:
    'Detects when the user is talking about FL Studio or the current DAW session, ' +
    'so Lucy can use the DAW_CONTEXT provider for real-time session data.',
  similes: ['FL_MENTION', 'STUDIO_MENTION', 'DAW_CONTEXT_TRIGGER'],

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text ?? '';
    return DAW_PATTERNS.some((re) => re.test(text));
  },

  handler: async (_runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<void> => {
    // No side effects needed — this evaluator's job is just to signal
    // that DAW_CONTEXT should be injected. The provider handles that.
  },

  examples: [
    {
      context: 'User is asking about their FL Studio session',
      messages: [
        { user: '{{user1}}', content: { text: "what's the BPM in FL Studio?" } },
      ],
      outcome: 'DAW_MENTION evaluator fires, DAW_CONTEXT provider injects session data',
    },
    {
      context: 'User is asking to change the tempo',
      messages: [
        { user: '{{user1}}', content: { text: 'set the tempo to 120' } },
      ],
      outcome: 'DAW_MENTION evaluator fires',
    },
  ],
};
