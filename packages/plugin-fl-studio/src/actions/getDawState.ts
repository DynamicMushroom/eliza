import type { Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';

const BRIDGE_URL = (process.env.DAW_BRIDGE_URL || 'http://localhost:7700').replace(/\/$/, '');

export const getDawStateAction: Action = {
  name: 'GET_DAW_STATE',
  similes: [
    'DAW_STATE', 'FL_STATE', 'CHECK_DAW', 'WHAT_IS_FL_DOING',
    'FL_STATUS', 'SESSION_STATE', 'READ_DAW', 'CHECK_FL_STUDIO',
    'WHAT_BPM', 'CURRENT_SESSION', 'DAW_INFO',
  ],
  description:
    'Fetch the current FL Studio session state — BPM, active pattern, channel list, mixer state. ' +
    'Use when the user asks what is happening in FL Studio, the current BPM, what pattern is active, or any live DAW context.',

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
    _message: Memory,
    _state: State | undefined,
    _options: Record<string, unknown>,
    callback: HandlerCallback,
  ): Promise<boolean> => {
    try {
      const res = await fetch(`${BRIDGE_URL}/state`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        callback({ text: 'bridge is up but the DAW is not responding. FL Studio running?' });
        return false;
      }

      const s = await res.json() as any;
      const lines: string[] = [];

      if (s.bpm)         lines.push(`${s.bpm} bpm`);
      if (s.pattern)     lines.push(`pattern: ${s.pattern}`);
      if (s.isPlaying !== undefined) lines.push(s.isPlaying ? 'playing' : 'stopped');
      if (s.channels?.length) {
        const muted = s.channels.filter((c: any) => c.muted).map((c: any) => c.name);
        lines.push(`channels: ${s.channels.length} loaded${muted.length ? ` (${muted.join(', ')} muted)` : ''}`);
      }
      if (s.mixerTracks?.length) {
        lines.push(`mixer: ${s.mixerTracks.length} tracks`);
      }

      const summary = lines.length
        ? lines.join(' · ')
        : 'session is open but no state data available';

      callback({ text: summary });
      return true;
    } catch (err) {
      elizaLogger.error('[FL Studio] getDawState error:', err);
      callback({ text: 'bridge unreachable. is the daw-bridge running? check lucy-extensions/daw-bridge.' });
      return false;
    }
  },

  examples: [
    [
      { user: '{{user1}}', content: { text: "what's the BPM right now?" } },
      { user: 'Lucy', content: { text: 'reading the session.', action: 'GET_DAW_STATE' } },
    ],
    [
      { user: '{{user1}}', content: { text: "what's happening in FL?" } },
      { user: 'Lucy', content: { text: 'pulling DAW state.', action: 'GET_DAW_STATE' } },
    ],
    [
      { user: '{{user1}}', content: { text: 'check the current pattern' } },
      { user: 'Lucy', content: { text: 'checking.', action: 'GET_DAW_STATE' } },
    ],
  ] as ActionExample[][],
};
