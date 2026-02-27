import type { Evaluator, IAgentRuntime, Memory, State } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import { upsertProfile } from '../db.ts';

// ── Extraction patterns ───────────────────────────────────────

const DAW_PATTERNS: [RegExp, string][] = [
  [/\bfl\s*studio\b/i,          'fl studio'],
  [/\bableton\b/i,               'ableton live'],
  [/\bbitwig\b/i,                'bitwig studio'],
  [/\blogic\b/i,                 'logic pro'],
  [/\breaper\b/i,                'reaper'],
  [/\bstudio\s*one\b/i,          'studio one'],
  [/\bpro\s*tools\b/i,           'pro tools'],
  [/\bcubase\b/i,                'cubase'],
];

const GEAR_PATTERNS = [
  /\b(microfreak|micro\s*freak)\b/i,
  /\b(moog|minimoog|grandmother|matriarch|sub\s*37)\b/i,
  /\b(korg|minilogue|monologue|volcas?)\b/i,
  /\b(arturia)\b/i,
  /\b(behringer)\b/i,
  /\b(roland|juno|sh-\d+)\b/i,
  /\b(prophets?[\s-]?\d*|sequential)\b/i,
  /\b(op-1|op-z|teenage\s*engineering)\b/i,
  /\b(digitakt|digitone|octatrack)\b/i,
  /\b(maschine|push\s*\d?)\b/i,
  /\b(voidsynth|rust.garden)\b/i,
  /\bpedal\b.{0,30}(?:fuzz|delay|reverb|distortion|overdrive|chorus|flanger|phaser)/i,
];

const GENRE_KEYWORDS = [
  'ambient', 'industrial', 'noise', 'drone', 'dark ambient', 'ebm',
  'techno', 'psychedelic', 'lo-fi', 'lofi', 'hip hop', 'hip-hop',
  'doom', 'metal', 'shoegaze', 'post-rock', 'experimental',
  'cinematic', 'film score', 'synthwave', 'darkwave',
];

const STRUGGLE_PATTERNS = [
  /(?:can'?t|struggling with|having trouble|issue with|problem with|don'?t understand)\s+(.{5,60})/i,
  /(?:my mix|the mix)\s+(?:is|sounds?)\s+(.{5,60})/i,
  /(?:not working|broken|fucked up|confused about)\s+(.{5,60})/i,
  /how (?:do i|can i|do you)\s+(.{5,60})\?/i,
];

const PHILOSOPHY_MARKERS = [
  /\bi (?:think|believe|feel)\s+(?:that\s+)?(.{10,120})/i,
  /(?:music|art|sound|synthesis)\s+(?:should|is|means?|represents?)\s+(.{10,100})/i,
  /(?:the|modern)\s+(?:industry|music industry|labels?|streaming)\s+(.{10,100})/i,
];

// ── Evaluator ─────────────────────────────────────────────────

export const userProfileExtractorEvaluator: Evaluator = {
  name: 'USER_PROFILE_EXTRACTOR',
  description:
    'Extracts facts about the user (DAW, gear, projects, genre, struggles, philosophy) ' +
    'from their messages and persists them so Lucy can reference them in future conversations.',
  similes: ['PROFILE_UPDATE', 'USER_FACTS', 'REMEMBER_USER'],

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Always try to extract — it's fast and read-only if nothing matches
    return !!message.content.text;
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<void> => {
    const text   = message.content.text ?? '';
    const userId = message.userId;

    const updates: any = {
      gear:       [] as string[],
      genres:     [] as string[],
      struggles:  [] as string[],
      philosophy: [] as string[],
      projects:   [] as string[],
    };

    // DAW detection
    for (const [re, name] of DAW_PATTERNS) {
      if (re.test(text)) { updates.daw = name; break; }
    }

    // Gear detection
    for (const re of GEAR_PATTERNS) {
      const m = text.match(re);
      if (m) updates.gear.push(m[0].toLowerCase().replace(/\s+/g, ' ').trim());
    }

    // Genre detection
    for (const g of GENRE_KEYWORDS) {
      if (text.toLowerCase().includes(g)) updates.genres.push(g);
    }

    // Struggle extraction
    for (const re of STRUGGLE_PATTERNS) {
      const m = text.match(re);
      if (m) updates.struggles.push(m[1].trim().toLowerCase());
    }

    // Philosophy extraction
    for (const re of PHILOSOPHY_MARKERS) {
      const m = text.match(re);
      if (m) updates.philosophy.push(m[1].trim().toLowerCase());
    }

    // Project name hints — "working on [x]", "my track [x]", "my album [x]"
    const projMatch = text.match(/(?:working on|making|my (?:track|album|ep|song))\s+(?:called\s+)?["']?([A-Z][^.?!]{2,40})["']?/i);
    if (projMatch) updates.projects.push(projMatch[1].trim().toLowerCase());

    const hasData = updates.daw
      || updates.gear.length
      || updates.genres.length
      || updates.struggles.length
      || updates.philosophy.length
      || updates.projects.length;

    if (!hasData) return;

    try {
      upsertProfile(userId, updates);
      elizaLogger.debug(`[VoidMemory] Profile updated for ${userId}`);
    } catch (err) {
      elizaLogger.warn('[VoidMemory] Profile write failed:', err);
    }
  },

  examples: [
    {
      context: 'User mentions their gear',
      messages: [{ user: '{{user1}}', content: { text: "I'm using FL Studio and a MicroFreak" } }],
      outcome: 'Profile updated with daw=fl studio, gear=[microfreak]',
    },
    {
      context: 'User describes a struggle',
      messages: [{ user: '{{user1}}', content: { text: "I can't get my mix to have enough low end" } }],
      outcome: 'Profile updated with struggles=[get my mix to have enough low end]',
    },
  ],
};
