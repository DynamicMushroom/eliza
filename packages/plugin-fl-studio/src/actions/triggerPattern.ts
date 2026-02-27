import type { Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';

const BRIDGE_URL = (process.env.DAW_BRIDGE_URL || 'http://localhost:7700').replace(/\/$/, '');

export const triggerPatternAction: Action = {
  name: 'TRIGGER_PATTERN',
  similes: [
    'PLAY_PATTERN', 'SWITCH_PATTERN', 'LOAD_PATTERN', 'CHANGE_PATTERN',
    'GO_TO_PATTERN', 'FL_PATTERN', 'ACTIVATE_PATTERN',
  ],
  description:
    'Switch to or trigger a specific pattern in FL Studio by name or number. ' +
    'Use when the user asks to switch to a different pattern, play a specific pattern, or navigate the song structure.',

  validate: async (_runtime: IAgentRuntime, _message: Memory): Promise<boolean> => {
    try {
      const res = await fetch(`${BRIDGE_URL}/health`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback: HandlerCallback,
  ): Promise<boolean> => {
    const text         = message.content.text ?? '';
    const indexMatch   = text.match(/pattern\s+#?(\d+)/i);
    const nameMatch    = text.match(/(?:pattern|switch to|play|go to)\s+(?:pattern\s+)?["']?(.+?)["']?$/i);

    const patternIndex = indexMatch ? parseInt(indexMatch[1], 10) : null;
    const patternName  = !indexMatch && nameMatch ? nameMatch[1].trim() : null;

    if (!patternName && patternIndex === null) {
      callback({ text: 'which pattern? give me a name or number.' });
      return false;
    }

    try {
      const res = await fetch(`${BRIDGE_URL}/trigger-pattern`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ patternName, patternIndex }),
        signal:  AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as any;
        callback({ text: body.error ?? 'pattern not found.' });
        return false;
      }

      const label = patternName ?? `pattern ${patternIndex}`;
      elizaLogger.info(`[FL Studio] Triggered: ${label}`);
      callback({ text: `switched to ${label}.` });
      return true;
    } catch (err) {
      elizaLogger.error('[FL Studio] triggerPattern error:', err);
      callback({ text: 'bridge unreachable.' });
      return false;
    }
  },

  examples: [
    [
      { user: '{{user1}}', content: { text: 'switch to pattern 2' } },
      { user: 'Lucy', content: { text: 'switching.', action: 'TRIGGER_PATTERN' } },
    ],
    [
      { user: '{{user1}}', content: { text: 'go to the verse pattern' } },
      { user: 'Lucy', content: { text: 'triggering verse.', action: 'TRIGGER_PATTERN' } },
    ],
  ] as ActionExample[][],
};
