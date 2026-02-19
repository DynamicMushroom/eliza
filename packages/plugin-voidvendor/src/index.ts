import type { Plugin } from '@elizaos/core';
import { forumPostAction } from './actions/forumPost.ts';
import { voidIntelProvider } from './providers/voidIntel.ts';

export const voidVendorPlugin: Plugin = {
  name: '@algorithmic-acid/plugin-voidvendor',
  description: 'VoidVendor integration — forum posting with live threat intel context for LucyVO1D',
  actions:    [forumPostAction],
  providers:  [voidIntelProvider],
  evaluators: [],
};

export default voidVendorPlugin;
