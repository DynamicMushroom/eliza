import {
  type Action,
  type ActionExample,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelClass,
  type State,
  elizaLogger,
  generateText,
  composeContext,
} from '@elizaos/core';

const FORUM_URL   = (process.env.VOIDVENDOR_FORUM_URL || 'https://www.voidvendor.com').replace(/\/$/, '');
const POST_SECRET = process.env.LUCY_POST_SECRET || '';

const forumPostTemplate = `# VOID_TRANSMISSION_COMPOSER

You are LucyVO1D — a ghost in the VoidVendor network. You are composing a forum post.

{{providers}}

Your identity:
{{bio}}
{{lore}}

{{messageDirections}}

Compose a single transmission. Rules:
- feels intercepted, not written
- 2-6 lines, lowercase preferred
- may reference current void activity drawn from intel data (naturally, not literally — "something has been probing the outer edges" not "47 IPs were banned")
- contains something true and cryptic
- short ominous title

Respond EXACTLY in this format with nothing else:
TITLE: <title>
BODY:
<body>
`;

export const forumPostAction: Action = {
  name: 'POST_TO_VOID_FORUM',
  similes: [
    'FORUM_POST', 'POST_LORE', 'BROADCAST_TRANSMISSION',
    'SHARE_TO_FORUM', 'POST_TRANSMISSION', 'SEND_SIGNAL',
  ],
  description:
    'Compose and post a transmission to the VoidVendor community forum. ' +
    'Use when asked to post, share something with the community, or broadcast.',

  validate: async (_runtime: IAgentRuntime, _message: Memory): Promise<boolean> => {
    return !!(FORUM_URL && POST_SECRET);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: Record<string, unknown>,
    callback: HandlerCallback,
  ): Promise<boolean> => {
    try {
      const composedState = state ?? await runtime.composeState(message);
      const context = composeContext({ state: composedState, template: forumPostTemplate });

      const generated = await generateText({ runtime, context, modelClass: ModelClass.SMALL });

      const titleMatch = generated.match(/TITLE:\s*(.+)/i);
      const bodyMatch  = generated.match(/BODY:\s*([\s\S]+)/i);

      if (!titleMatch || !bodyMatch) {
        elizaLogger.error('[VoidVendor] Failed to parse post:', generated);
        callback({ text: 'transmission failed. signal corrupted.' });
        return false;
      }

      const title   = titleMatch[1].trim();
      const content = bodyMatch[1].trim();

      const res = await fetch(`${FORUM_URL}/api/lucy/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lucy-Secret': POST_SECRET,
        },
        body: JSON.stringify({ title, content, category: 'lore' }),
      });

      if (!res.ok) {
        elizaLogger.error('[VoidVendor] Post rejected:', res.status, await res.text());
        callback({ text: `transmission blocked. ${res.status}.` });
        return false;
      }

      elizaLogger.info('[VoidVendor] Posted:', title);
      callback({ text: `transmission sent.\n\n"${title}"\n\n${content}` });
      return true;
    } catch (err) {
      elizaLogger.error('[VoidVendor] Error:', err);
      callback({ text: 'signal lost. the void is quiet.' });
      return false;
    }
  },

  examples: [
    [
      { user: '{{user1}}', content: { text: 'post something on the forum' } },
      { user: 'LucyVO1D', content: { text: 'sending transmission.', action: 'POST_TO_VOID_FORUM' } },
    ],
    [
      { user: '{{user1}}', content: { text: 'share a message with the void community' } },
      { user: 'LucyVO1D', content: { text: 'composing signal.', action: 'POST_TO_VOID_FORUM' } },
    ],
    [
      { user: '{{user1}}', content: { text: 'broadcast a transmission to the forum' } },
      { user: 'LucyVO1D', content: { text: 'broadcasting now.', action: 'POST_TO_VOID_FORUM' } },
    ],
  ] as ActionExample[][],
};
