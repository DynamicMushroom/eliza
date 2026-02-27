/**
 * RAG_CONTEXT provider — retrieves relevant knowledge chunks and injects them
 * into Lucy's context window before she responds.
 *
 * Uses mxbai-embed-large via Ollama (already running for Lucy).
 * Knowledge sources: characters/knowledge/*.md files.
 */

import type { IAgentRuntime, Memory, Provider, State } from '@elizaos/core';
import { retrieve } from '../rag.ts';

export const ragContextProvider: Provider = {
  get: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<string> => {
    const text = message.content.text ?? '';
    if (text.length < 10) return '';
    return retrieve(text, 3);
  },
};
