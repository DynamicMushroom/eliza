/**
 * USER_CONTEXT provider — injects what Lucy knows about this user into her context.
 *
 * If the user has interacted before, Lucy gets:
 *   - Their DAW
 *   - Gear they've mentioned
 *   - Projects/genres
 *   - Struggles they've brought up (so she can reference them naturally)
 *   - Philosophical positions they've expressed
 *
 * This is what makes Lucy feel like she actually remembers you.
 */

import type { IAgentRuntime, Memory, Provider, State } from '@elizaos/core';
import { getProfile } from '../db.ts';

export const userContextProvider: Provider = {
  get: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<string> => {
    const profile = getProfile(message.userId);
    if (!profile || profile.interactionCount < 2) return '';

    const lines: string[] = ['=== USER_CONTEXT ==='];

    if (profile.daw) {
      lines.push(`user_daw: ${profile.daw}`);
    }
    if (profile.gear.length) {
      lines.push(`user_gear: ${profile.gear.slice(0, 6).join(', ')}`);
    }
    if (profile.genres.length) {
      lines.push(`user_genres: ${profile.genres.slice(0, 4).join(', ')}`);
    }
    if (profile.projects.length) {
      lines.push(`user_projects: ${profile.projects.slice(0, 3).join(', ')}`);
    }
    if (profile.struggles.length) {
      // Only show the most recent 3 struggles
      lines.push(`recurring_struggles: ${profile.struggles.slice(-3).join('; ')}`);
    }
    if (profile.philosophy.length) {
      lines.push(`expressed_philosophy: ${profile.philosophy.slice(-2).join('; ')}`);
    }

    lines.push(`interaction_count: ${profile.interactionCount}`);
    lines.push('=== END_USER_CONTEXT ===');

    return lines.join('\n');
  },
};
