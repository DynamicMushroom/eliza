import type { Plugin } from '@elizaos/core';
import { getDawStateAction }    from './actions/getDawState.ts';
import { setBpmAction }         from './actions/setBpm.ts';
import { muteChannelAction }    from './actions/muteChannel.ts';
import { triggerPatternAction } from './actions/triggerPattern.ts';
import { dawContextProvider }   from './providers/dawContext.ts';
import { dawMentionEvaluator }  from './evaluators/dawMention.ts';

export const flStudioPlugin: Plugin = {
  name: '@algorithmic-acid/plugin-fl-studio',
  description:
    'FL Studio DAW integration for Lucy — real-time session context, BPM control, ' +
    'channel mute/unmute, pattern switching via the lucy-daw-bridge OSC/WebSocket server.',
  actions:    [getDawStateAction, setBpmAction, muteChannelAction, triggerPatternAction],
  providers:  [dawContextProvider],
  evaluators: [dawMentionEvaluator],
};

export default flStudioPlugin;
