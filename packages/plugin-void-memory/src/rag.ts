/**
 * RAG — Knowledge retrieval using Ollama embeddings (mxbai-embed-large).
 *
 * Adapted from lucy-voidvendor/lucy-deploy/bridge/rag.js but rewritten in TypeScript
 * as an ElizaOS-compatible module.
 *
 * Two-phase retrieval (same strategy as the original):
 *   1. Fast keyword scoring (no LLM call)
 *   2. Semantic cosine similarity via Ollama if keyword match is weak
 *
 * Knowledge sources:
 *   - characters/knowledge/*.md files (loaded at startup)
 *   - Runtime-added snippets (VST parameter descriptions, etc.)
 */

import fs   from 'node:fs';
import path from 'node:path';
import os   from 'node:os';

const OLLAMA_URL   = process.env.OLLAMA_SERVER_URL || 'http://localhost:11434';
const EMBED_MODEL  = process.env.OLLAMA_EMBEDDING_MODEL || 'mxbai-embed-large';
const CACHE_FILE   = path.join(os.homedir(), '.lucy', 'memory', 'embed_cache.json');
const KNOWLEDGE_DIR = path.join(os.homedir(), 'eliza', 'characters', 'knowledge');

interface Doc { id: string; text: string; source: string }
interface EmbedEntry { id: string; vector: number[]; doc: Doc }

let docs:       Doc[]        = [];
let embedCache: Record<string, number[]> = {};
let embeddings: EmbedEntry[] | null = null;

// ── Load all knowledge/*.md files ─────────────────────────────
export function loadKnowledge(): void {
  const loaded: Doc[] = [];
  try {
    if (!fs.existsSync(KNOWLEDGE_DIR)) return;
    for (const file of fs.readdirSync(KNOWLEDGE_DIR)) {
      if (!file.endsWith('.md')) continue;
      const text = fs.readFileSync(path.join(KNOWLEDGE_DIR, file), 'utf8');
      // Split by H2 sections so each section is a retrievable chunk
      const sections = text.split(/\n##\s+/);
      for (let i = 0; i < sections.length; i++) {
        const chunk = sections[i].trim();
        if (chunk.length < 50) continue;
        loaded.push({ id: `${file}:${i}`, text: chunk.slice(0, 1200), source: file });
      }
    }
    docs = loaded;
    embeddings = null; // Invalidate cache
  } catch { /* non-fatal */ }
}

// ── Keyword scoring ───────────────────────────────────────────
const STOP = new Set(['i','a','an','the','is','it','in','on','at','to','do','for','and','or','but','how','what','can','my','me','you','with','this','that','not','be','are']);

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function keywordScore(queryTokens: string[], docText: string): number {
  const docSet = new Set(tokenize(docText));
  let score = 0;
  for (const qt of queryTokens) {
    if (docSet.has(qt)) { score += 1; continue; }
    for (const dt of docSet) {
      if (dt.startsWith(qt) || qt.startsWith(dt)) score += 0.3;
    }
  }
  return score;
}

// ── Embeddings ────────────────────────────────────────────────
function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

async function embed(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model: EMBED_MODEL, prompt: text }),
      signal:  AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const d = await res.json() as any;
    return d.embedding ?? null;
  } catch { return null; }
}

async function ensureEmbeddings(): Promise<EmbedEntry[]> {
  if (embeddings) return embeddings;
  try { embedCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { embedCache = {}; }
  const result: EmbedEntry[] = [];
  let dirty = false;
  for (const doc of docs) {
    const key = `${doc.id}:${doc.text.slice(0, 32)}`;
    if (embedCache[key]) {
      result.push({ id: doc.id, vector: embedCache[key], doc });
    } else {
      const vec = await embed(doc.text.slice(0, 500));
      if (vec) { embedCache[key] = vec; dirty = true; result.push({ id: doc.id, vector: vec, doc }); }
    }
  }
  if (dirty) {
    try {
      fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify(embedCache));
    } catch {}
  }
  embeddings = result;
  return result;
}

// ── Public: retrieve relevant knowledge chunks ────────────────
export async function retrieve(query: string, topK = 3): Promise<string> {
  if (docs.length === 0) loadKnowledge();
  if (docs.length === 0) return '';

  const qt = tokenize(query);
  const scored = docs.map((doc) => ({ doc, score: keywordScore(qt, doc.text) }))
    .sort((a, b) => b.score - a.score);
  let top = scored.filter((s) => s.score > 0).slice(0, topK);

  // Phase 2: semantic fallback
  if (top.length === 0 || top[0].score < 1.5) {
    try {
      const queryVec = await embed(query);
      if (queryVec) {
        const vecs = await ensureEmbeddings();
        const semantic = vecs.map((v) => ({ doc: v.doc, score: cosine(queryVec, v.vector) }))
          .sort((a, b) => b.score - a.score);
        const merged = new Map<string, { doc: Doc; score: number }>();
        for (const { doc, score } of scored) merged.set(doc.id, { doc, score });
        for (const { doc, score } of semantic) {
          const ex = merged.get(doc.id) ?? { doc, score: 0 };
          merged.set(doc.id, { doc, score: ex.score + score * 2 });
        }
        top = [...merged.values()].sort((a, b) => b.score - a.score).slice(0, topK);
      }
    } catch { /* keyword results stand */ }
  }

  if (top.length === 0) return '';
  const lines = top.map(({ doc }) => `[${doc.source}]\n${doc.text.slice(0, 600)}`);
  return `=== KNOWLEDGE_CONTEXT ===\n${lines.join('\n---\n')}\n=== END_KNOWLEDGE ===`;
}

// Warm up at module load
setTimeout(() => {
  loadKnowledge();
  ensureEmbeddings().catch(() => {});
}, 2000);
