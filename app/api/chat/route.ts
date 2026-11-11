import index from "@/data/index.json";

type Chunk = { source: string; page: number; text: string; embedding: number[] };
const INDEX = index as Chunk[];

export const maxDuration = 60;

const BASE = process.env.LLM_BASE_URL;
const AUTH = { Authorization: `Bearer ${process.env.LLM_API_KEY ?? ""}` };

async function embedQuery(q: string): Promise<number[]> {
  const r = await fetch(`${BASE}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...AUTH },
    body: JSON.stringify({ model: "nomic-embed-text", input: "search_query: " + q }),
  });
  if (!r.ok) throw new Error(await r.text());
  const v: number[] = (await r.json()).embeddings[0];
  const n = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

function topK(q: number[], k = 3) {
  return INDEX.map((c) => ({ c, score: c.embedding.reduce((a, x, i) => a + x * q[i], 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const question: string = messages[messages.length - 1]?.content ?? "";

  let context: string;
  try {
    const hits = topK(await embedQuery(question));
    context = hits.map((h, i) => `[${i + 1}] (${h.c.source}, p.${h.c.page})\n${h.c.text}`).join("\n\n");
  } catch (e) {
    return new Response("Embedding failed: " + String(e), { status: 502 });
  }

  const system = `You are a Student Success assistant. Answer ONLY using the context below.
If the answer is not in the context, say you don't know and suggest contacting a Student Success coach.
Cite sources at the end like (filename, p.X). Be concise.

Context:
${context}`;

  const r = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...AUTH },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      stream: true,
      temperature: 0.2,
      max_tokens: 300,
      messages: [{ role: "system", content: system }, ...messages.slice(-4)],
    }),
  });

  if (!r.ok || !r.body) return new Response(await r.text(), { status: 502 });
  return new Response(r.body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
