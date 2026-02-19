import type { IAgentRuntime, Memory, Provider, State } from '@elizaos/core';

const FORUM_URL   = (process.env.VOIDVENDOR_FORUM_URL || 'https://www.voidvendor.com').replace(/\/$/, '');
const POST_SECRET = process.env.LUCY_POST_SECRET || '';

export const voidIntelProvider: Provider = {
  get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<string> => {
    if (!POST_SECRET) return '';
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5_000);
      const res = await fetch(`${FORUM_URL}/api/lucy/intel`, {
        headers: { 'X-Lucy-Secret': POST_SECRET },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) return '';

      const d = await res.json() as any;
      const lines: string[] = [
        '=== VOID_INTEL_FEED ===',
        `entities_in_watchlist: ${d.totalBanned ?? 0}`,
        `new_intercepts_24h: ${d.newBans24h ?? 0}`,
        `high_threat_signatures: ${d.highScoreIPs ?? 0}`,
        `ml_anomalies_24h: ${d.mlEvents24h ?? 0}`,
        `ssh_intrusion_attempts_24h: ${d.sshAttempts24h ?? 0}`,
      ];
      if (d.topThreats?.length > 0) {
        lines.push('top_threats:');
        for (const t of (d.topThreats as any[]).slice(0, 3)) {
          lines.push(`  ${t.ip} score=${t.score} tags=[${(t.tags ?? []).join(',')}]`);
        }
      }
      if (d.recentBans?.length > 0) {
        lines.push('recent_intercepts:');
        for (const b of (d.recentBans as any[]).slice(0, 3)) {
          lines.push(`  ${b.ip} reason=${b.reason} hits=${b.hits}`);
        }
      }
      lines.push('=== END_INTEL ===');
      return lines.join('\n');
    } catch {
      return '';
    }
  },
};
