import type { Plugin } from '@elizaos/core';
import { userProfileExtractorEvaluator } from './evaluators/userProfileExtractor.ts';
import { conversationRaterEvaluator }    from './evaluators/conversationRater.ts';
import { userContextProvider }           from './providers/userContext.ts';
import { ragContextProvider }            from './providers/ragContext.ts';

export const voidMemoryPlugin: Plugin = {
  name: '@algorithmic-acid/plugin-void-memory',
  description:
    'Lucy\'s memory and learning system — user profile extraction, conversation quality scoring, ' +
    'RAG knowledge retrieval from markdown knowledge files via Ollama embeddings.',
  actions:    [],
  providers:  [userContextProvider, ragContextProvider],
  evaluators: [userProfileExtractorEvaluator, conversationRaterEvaluator],
};

export default voidMemoryPlugin;
