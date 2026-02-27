import type { IAgentRuntime, Memory, Provider, State } from '@elizaos/core';

const BRIDGE_URL = (process.env.DAW_BRIDGE_URL || 'http://localhost:7700').replace(/\/$/, '');

// Cache DAW state for 10 seconds so every message doesn't poll FL
let cachedState: any = null;
let cacheTs          = 0;
const CACHE_MS       = 10_000;

export const dawContextProvider: Provider = {
  get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<string> => {
    const now = Date.now();
    if (cachedState && now - cacheTs < CACHE_MS) {
      return formatState(cachedState);
    }

    try {
      const res = await fetch(`${BRIDGE_URL}/state`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return '';
      cachedState = await res.json();
      cacheTs     = now;
      return formatState(cachedState);
    } catch {
      return '';
    }
  },
};

function formatState(s: any): string {
  if (!s) return '';

  const lines: string[] = ['=== FL_STUDIO_SESSION ==='];

  if (s.bpm)     lines.push(`bpm: ${s.bpm}`);
  if (s.pattern) lines.push(`active_pattern: ${s.pattern}`);
  if (s.isPlaying !== undefined) lines.push(`transport: ${s.isPlaying ? 'playing' : 'stopped'}`);
  if (s.timeSignature) lines.push(`time_sig: ${s.timeSignature}`);

  if (s.channels?.length) {
    const visible = s.channels.slice(0, 12);
    const muted   = visible.filter((c: any) => c.muted).map((c: any) => c.name);
    const names   = visible.map((c: any) => c.name).join(', ');
    lines.push(`channels (${s.channels.length}): ${names}`);
    if (muted.length) lines.push(`muted: ${muted.join(', ')}`);
  }

  if (s.mixerTracks?.length) {
    const clipping = s.mixerTracks.filter((t: any) => t.peak > 0.95).map((t: any) => t.name);
    if (clipping.length) lines.push(`clipping_tracks: ${clipping.join(', ')}`);
  }

  if (s.pluginsInUse?.length) {
    lines.push(`plugins: ${s.pluginsInUse.slice(0, 8).join(', ')}`);
  }

  if (s.cpuLoad !== undefined) lines.push(`cpu_load: ${s.cpuLoad}%`);

  lines.push('=== END_DAW ===');
  return lines.join('\n');
}
