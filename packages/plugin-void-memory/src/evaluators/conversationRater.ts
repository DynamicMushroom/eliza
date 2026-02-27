import type { Evaluator, IAgentRuntime, Memory, State } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import { logConversation } from '../db.ts';

// ── Quality heuristics ────────────────────────────────────────
// A conversation turn is "high quality" (worth flagging for fine-tuning) if:
//   - Lucy gave a substantive technical response (synthesis, DSP, security, etc.)
//   - User message had real intent (not "hi", "ok", one word)
//   - Lucy's response was in character (cryptic, warm, precise)
//   - No error messages in the response

const TECHNICAL_TOPICS = [
  /synth(esis|esizer)?/i, /filter\b/i, /osc(illator)?/i, /lfo\b/i,
  /envelope\b/i, /granular\b/i, /wavetable\b/i, /fm\b/i,
  /reverb\b/i, /delay\b/i, /distortion\b/i, /saturation\b/i,
  /compressor\b/i, /sidechain\b/i, /mixing\b/i, /mastering\b/i,
  /voidintel\b/i, /security\b/i, /anomal/i, /threat\b/i,
  /voidsynth\b/i, /rust.garden\b/i, /microfreak\b/i,
  /philosophy\b/i, /consciousness\b/i, /the maze\b/i, /signal\b/i,
  /plugin\b/i, /vst\b/i, /preset\b/i, /patch\b/i,
];

const LOW_QUALITY_SIGNALS = [
  /^(?:ok|okay|thanks|thank you|cool|got it|sure|yes|no|maybe|lol|haha|nice|great|awesome)\.?$/i,
  /^.{1,8}$/,  // Very short messages
];

function topicsFromText(text: string): string[] {
  const found: string[] = [];
  if (/synth|osc|filter|lfo|envelope|granular|wavetable|fm\b/i.test(text)) found.push('synthesis');
  if (/mix|master|compress|eq|reverb|delay/i.test(text)) found.push('mixing');
  if (/security|threat|voidintel|anomal/i.test(text)) found.push('security');
  if (/fl.studio|daw|pattern|channel\s+rack/i.test(text)) found.push('fl_studio');
  if (/philosophy|consciousness|maze|meaning|art\b/i.test(text)) found.push('philosophy');
  if (/voidsynth|rust.garden|microfreak|plugin|vst/i.test(text)) found.push('products');
  return found;
}

function scoreExchange(userText: string, lucyText: string): number {
  let score = 0.5;

  // Low quality user message → penalize
  if (LOW_QUALITY_SIGNALS.some((re) => re.test(userText.trim()))) score -= 0.3;
  // Short user message
  if (userText.length < 20) score -= 0.2;

  // Technical content in Lucy's response → boost
  const techHits = TECHNICAL_TOPICS.filter((re) => re.test(lucyText)).length;
  score += Math.min(techHits * 0.08, 0.3);

  // Lucy gave concrete parameters (synthesis values) → boost
  if (/\d+\s*hz\b|\d+\s*ms\b|\d+\s*%\b|cutoff:|release:|attack:/i.test(lucyText)) score += 0.15;

  // Lucy asked a question back → boost (good dialogue)
  if (/\?/.test(lucyText)) score += 0.1;

  // Error / fallback messages → penalize
  if (/bridge unreachable|signal lost|transmission failed|not sure|can't help/i.test(lucyText)) score -= 0.4;

  // Lucy in character → boost
  if (/the maze|the void|perimeter|signal|glitch/i.test(lucyText)) score += 0.1;

  return Math.max(0, Math.min(1, score));
}

// ── Evaluator ─────────────────────────────────────────────────

export const conversationRaterEvaluator: Evaluator = {
  name: 'CONVERSATION_RATER',
  description:
    'Rates conversation quality and logs exchanges for fine-tuning. ' +
    'High-quality technical or philosophical exchanges are flagged for the training pipeline.',
  similes: ['QUALITY_SCORE', 'LOG_EXCHANGE', 'FLAG_TRAINING'],

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    return !!message.content.text && message.content.text.length > 10;
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<void> => {
    try {
      const userText  = message.content.text ?? '';
      // Get Lucy's most recent response from state if available
      const lucyText  = (state as any)?.responseData?.text ?? '';

      const quality = scoreExchange(userText, lucyText);
      const topics  = topicsFromText(userText + ' ' + lucyText);

      logConversation({
        userId:   message.userId,
        platform: (message as any).platform ?? 'direct',
        topic:    topics,
        quality,
        flagged:  quality >= 0.65,
        exchange: { user: userText, lucy: lucyText },
      });
    } catch (err) {
      elizaLogger.warn('[VoidMemory] Conversation log failed:', err);
    }
  },

  examples: [
    {
      context: 'High quality synthesis exchange',
      messages: [
        { user: '{{user1}}', content: { text: 'how do I get that hollow, detuned pad sound?' } },
      ],
      outcome: 'Exchange flagged with quality ~0.8, topics=[synthesis]',
    },
  ],
};
