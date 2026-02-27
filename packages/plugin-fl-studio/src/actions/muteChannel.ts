import type { Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';

const BRIDGE_URL = (process.env.DAW_BRIDGE_URL || 'http://localhost:7700').replace(/\/$/, '');

export const muteChannelAction: Action = {
  name: 'MUTE_CHANNEL',
  similes: [
    'MUTE', 'UNMUTE', 'UNMUTE_CHANNEL', 'TOGGLE_MUTE',
    'SILENCE_CHANNEL', 'FL_MUTE', 'MUTE_TRACK',
  ],
  description:
    'Mute or unmute a specific channel in FL Studio by name or index. ' +
    'Use when the user asks to mute, unmute, or silence a channel, track, or instrument.',

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
    const text    = message.content.text ?? '';
    const unmute  = /unmute|un-mute|enable/i.test(text);
    const mute    = !unmute;

    // Try to extract channel name or index
    const nameMatch  = text.match(/(?:mute|unmute|silence)\s+(?:the\s+)?(.+?)(?:\s+channel|\s+track|\s+instrument)?$/i);
    const indexMatch = text.match(/(?:channel|track)\s+#?(\d+)/i);

    const channelName  = nameMatch  ? nameMatch[1].trim()   : null;
    const channelIndex = indexMatch ? parseInt(indexMatch[1], 10) : null;

    if (!channelName && channelIndex === null) {
      callback({ text: 'which channel? give me a name or number.' });
      return false;
    }

    try {
      const res = await fetch(`${BRIDGE_URL}/mute-channel`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ channelName, channelIndex, mute }),
        signal:  AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as any;
        callback({ text: body.error ?? `channel not found. check the name.` });
        return false;
      }

      const label  = channelName ?? `channel ${channelIndex}`;
      const action = mute ? 'muted' : 'unmuted';
      elizaLogger.info(`[FL Studio] ${label} ${action}`);
      callback({ text: `${label} ${action}.` });
      return true;
    } catch (err) {
      elizaLogger.error('[FL Studio] muteChannel error:', err);
      callback({ text: 'bridge unreachable.' });
      return false;
    }
  },

  examples: [
    [
      { user: '{{user1}}', content: { text: 'mute the drums' } },
      { user: 'Lucy', content: { text: 'muting.', action: 'MUTE_CHANNEL' } },
    ],
    [
      { user: '{{user1}}', content: { text: 'unmute channel 3' } },
      { user: 'Lucy', content: { text: 'unmuting.', action: 'MUTE_CHANNEL' } },
    ],
    [
      { user: '{{user1}}', content: { text: 'silence the bass' } },
      { user: 'Lucy', content: { text: 'silenced.', action: 'MUTE_CHANNEL' } },
    ],
  ] as ActionExample[][],
};
