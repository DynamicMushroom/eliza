import type { Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';

const BRIDGE_URL = (process.env.DAW_BRIDGE_URL || 'http://localhost:7700').replace(/\/$/, '');

export const setBpmAction: Action = {
  name: 'SET_BPM',
  similes: [
    'CHANGE_BPM', 'SET_TEMPO', 'CHANGE_TEMPO', 'BPM_SET',
    'UPDATE_BPM', 'TEMPO_CHANGE', 'FL_SET_BPM',
  ],
  description:
    'Set the BPM/tempo in FL Studio via the DAW bridge. ' +
    'Use when the user asks to change the tempo or BPM to a specific value.',

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
    // Extract BPM from the message text
    const text  = message.content.text ?? '';
    const match = text.match(/\b(\d{2,3})\s*(?:bpm|tempo)?\b/i);
    const bpm   = match ? parseInt(match[1], 10) : null;

    if (!bpm || bpm < 20 || bpm > 420) {
      callback({ text: 'give me a BPM between 20 and 420.' });
      return false;
    }

    try {
      const res = await fetch(`${BRIDGE_URL}/set-bpm`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bpm }),
        signal:  AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        callback({ text: `bridge rejected the BPM change. ${res.status}.` });
        return false;
      }

      elizaLogger.info(`[FL Studio] BPM set to ${bpm}`);
      callback({ text: `${bpm} bpm. session adjusted.` });
      return true;
    } catch (err) {
      elizaLogger.error('[FL Studio] setBpm error:', err);
      callback({ text: 'bridge unreachable. is the daw-bridge running?' });
      return false;
    }
  },

  examples: [
    [
      { user: '{{user1}}', content: { text: 'set the BPM to 140' } },
      { user: 'Lucy', content: { text: 'adjusting.', action: 'SET_BPM' } },
    ],
    [
      { user: '{{user1}}', content: { text: 'change tempo to 98 bpm' } },
      { user: 'Lucy', content: { text: 'setting 98 bpm.', action: 'SET_BPM' } },
    ],
  ] as ActionExample[][],
};
