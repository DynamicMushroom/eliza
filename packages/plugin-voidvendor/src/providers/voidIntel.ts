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

async function fetchWithTimeout(url: string, opts: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export const voidIntelProvider: Provider = {
  get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<string> => {
    if (!POST_SECRET) return '';
    try {
      // Fetch security intel + conflict map data in parallel
      const [intelRes, predictionsRes, briefingRes] = await Promise.allSettled([
        fetchWithTimeout(`${FORUM_URL}/api/lucy/intel`, { headers: { 'X-Lucy-Secret': POST_SECRET } }, 6_000),
        fetchWithTimeout(`${FORUM_URL}/api/conflict-map/predictions`, {}, 5_000),
        fetchWithTimeout(`${FORUM_URL}/api/conflict-map/briefing`, {}, 5_000),
      ]);

      const lines: string[] = ['=== VOID_INTEL_FEED ==='];

      // ── Security intel ────────────────────────────────────────────────────
      if (intelRes.status === 'fulfilled' && intelRes.value.ok) {
        const d = await intelRes.value.json() as any;

        lines.push(`entities_in_watchlist: ${d.totalBanned ?? 0}`);
        lines.push(`new_intercepts_24h: ${d.newBans24h ?? 0}`);
        lines.push(`high_threat_signatures: ${d.highScoreIPs ?? 0}`);
        lines.push(`ml_anomalies_24h: ${d.mlEvents24h ?? 0}`);
        lines.push(`ssh_probes_24h: ${d.sshAttempts24h ?? 0}`);

        if (d.mlBreakdown?.length > 0) {
          lines.push('');
          lines.push('detection_breakdown:');
          for (const b of d.mlBreakdown as any[]) {
            lines.push(`  [${b.severity}] ${voice(b.label)} × ${b.count}`);
          }
        }

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

        if (d.topCountries?.length > 0) {
          lines.push('');
          const countries = (d.topCountries as any[]).map((c: any) => `${c.country}(${c.count})`).join(', ');
          lines.push(`origin_countries: ${countries}`);
        }

        if (d.topPatterns?.length > 0) {
          lines.push('');
          lines.push('most_probed_paths:');
          for (const p of (d.topPatterns as any[]).slice(0, 3)) {
            lines.push(`  ${p.pattern} × ${p.count}`);
          }
        }

        // ── Conflict summary (from lucy/intel) ─────────────────────────────
        const c = d.conflict;
        if (c) {
          lines.push('');
          lines.push('=== GLOBAL_CONFLICT_FEED ===');
          lines.push(`active_conflict_events: ${c.conflictEvents}`);
          lines.push(`critical_incidents: ${c.criticalCount}`);
          lines.push(`reported_fatalities: ${(c.totalFatalities ?? 0).toLocaleString()}`);
          lines.push(`data_source: ${c.dataSource ?? 'GDELT'}`);

          if (c.topTypes?.length) {
            const t = (c.topTypes as any[]).map((x: any) => `${x.type}(${x.count})`).join(', ');
            lines.push(`event_types: ${t}`);
          }
          if (c.topRegions?.length) {
            const r = (c.topRegions as any[]).map((x: any) => `${x.country}(${x.count})`).join(', ');
            lines.push(`active_combat_zones: ${r}`);
          }
          if ((c.thermalKinetic ?? 0) > 0 || (c.thermalUnreported ?? 0) > 0) {
            lines.push(`satellite_confirmed_kinetic: ${c.thermalKinetic ?? 0}`);
            lines.push(`satellite_unreported_activity: ${c.thermalUnreported ?? 0}`);
          }
          if (c.activePredictions > 0) {
            lines.push(`ai_escalation_predictions: ${c.activePredictions}`);
          }
          if (c.latestBriefing) {
            lines.push('');
            lines.push(`threat_level: ${c.latestBriefing.threatLevel}`);
            lines.push(`briefing_title: ${c.latestBriefing.title}`);
            lines.push(`briefing_summary: ${c.latestBriefing.summary}`);
          }
        }
      }

      // ── Lucy's conflict predictions (detailed) ─────────────────────────────
      if (predictionsRes.status === 'fulfilled' && predictionsRes.value.ok) {
        const pd = await predictionsRes.value.json() as any;
        const preds: any[] = pd.predictions ?? [];
        if (preds.length > 0) {
          lines.push('');
          lines.push('escalation_predictions:');
          for (const p of preds.slice(0, 5)) {
            const conf = p.confidence ? ` [confidence:${(p.confidence * 100).toFixed(0)}%]` : '';
            lines.push(`  [${p.predictionType?.replace(/_/g,' ').toUpperCase()}] ${p.region}, ${p.country} — ${p.horizon}${conf}`);
            if (p.reasoning) lines.push(`    reasoning: ${p.reasoning.slice(0, 200)}`);
          }
        }
      }

      // ── OSINT Briefing (full text) ─────────────────────────────────────────
      if (briefingRes.status === 'fulfilled' && briefingRes.value.ok) {
        const bd = await briefingRes.value.json() as any;
        const br = bd.briefing;
        if (br) {
          lines.push('');
          lines.push('=== OSINT_INTELLIGENCE_BRIEFING ===');
          lines.push(`threat_level: ${br.threatLevel}`);
          lines.push(`title: ${br.title}`);
          lines.push(`summary: ${br.summary}`);
          if (br.keyEvents?.length) {
            lines.push('key_events:');
            for (const e of (br.keyEvents as string[]).slice(0, 5)) lines.push(`  • ${e}`);
          }
          if (br.thermalHighlights?.length) {
            lines.push('satellite_highlights:');
            for (const e of (br.thermalHighlights as string[]).slice(0, 3)) lines.push(`  • ${e}`);
          }
          if (br.predictions?.length) {
            lines.push('analyst_predictions:');
            for (const e of (br.predictions as string[]).slice(0, 3)) lines.push(`  • ${e}`);
          }
          lines.push('=== END_BRIEFING ===');
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
