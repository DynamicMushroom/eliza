import type { IAgentRuntime, Memory, Provider, State } from '@elizaos/core';

const FORUM_URL   = (process.env.VOIDVENDOR_FORUM_URL || 'https://www.voidvendor.com').replace(/\/$/, '');
const POST_SECRET = process.env.LUCY_POST_SECRET || '';

// Human-readable label translations for Lucy's voice
const LABEL_VOICE: Record<string, string> = {
  honeypot_hit:        'something walked into a trap',
  scanner_ua:          'a known scanner probed the surface',
  path_traversal:      'something tried to climb through the walls',
  scanner_tool:        'an automated tool swept the endpoints',
  credential_stuffing: 'a credential harvesting attempt',
  low_and_slow:        'a patient, methodical probe — low and slow',
  ban_evasion:         'a banned entity tried to return',
  admin_honeypot:      'someone targeted the admin paths',
  ip_rotation:         'rapid identity rotation detected',
};

function voice(label: string): string {
  return LABEL_VOICE[label] ?? label.replace(/_/g, ' ');
}

export const voidIntelProvider: Provider = {
  get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<string> => {
    if (!POST_SECRET) return '';
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6_000);
      const res = await fetch(`${FORUM_URL}/api/lucy/intel`, {
        headers: { 'X-Lucy-Secret': POST_SECRET },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) return '';

      const d = await res.json() as any;
      const lines: string[] = ['=== VOID_INTEL_FEED ==='];

      // High-level counts
      lines.push(`entities_in_watchlist: ${d.totalBanned ?? 0}`);
      lines.push(`new_intercepts_24h: ${d.newBans24h ?? 0}`);
      lines.push(`high_threat_signatures: ${d.highScoreIPs ?? 0}`);
      lines.push(`ml_anomalies_24h: ${d.mlEvents24h ?? 0}`);
      lines.push(`ssh_probes_24h: ${d.sshAttempts24h ?? 0}`);

      // ML breakdown — what kinds of activity the system caught
      if (d.mlBreakdown?.length > 0) {
        lines.push('');
        lines.push('detection_breakdown:');
        for (const b of d.mlBreakdown as any[]) {
          lines.push(`  [${b.severity}] ${voice(b.label)} × ${b.count}`);
        }
      }

      // Recent ML events — the actual stories
      if (d.recentMlEvents?.length > 0) {
        lines.push('');
        lines.push('recent_signals:');
        for (const e of (d.recentMlEvents as any[]).slice(0, 5)) {
          const loc = [e.city, e.country].filter(Boolean).join(', ') || 'unknown origin';
          const org = e.org ? ` (${e.org})` : '';
          const pat = e.pattern ? ` targeting: ${e.pattern}` : '';
          lines.push(`  ${voice(e.label)} — ${loc}${org}${pat} [${e.severity}]`);
        }
      }

      // Top source countries
      if (d.topCountries?.length > 0) {
        lines.push('');
        const countries = (d.topCountries as any[]).map((c: any) => `${c.country}(${c.count})`).join(', ');
        lines.push(`origin_countries: ${countries}`);
      }

      // Most probed paths
      if (d.topPatterns?.length > 0) {
        lines.push('');
        lines.push('most_probed_paths:');
        for (const p of (d.topPatterns as any[]).slice(0, 3)) {
          lines.push(`  ${p.pattern} × ${p.count}`);
        }
      }

      lines.push('');
      lines.push('=== END_INTEL ===');
      return lines.join('\n');
    } catch {
      return '';
    }
  },
};
