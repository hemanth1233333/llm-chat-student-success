export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const r = await fetch(`${process.env.LLM_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LLM_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      stream: true,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        ...messages.slice(-20),
      ],
    }),
  });

  if (!r.ok || !r.body) {
    return new Response(await r.text(), { status: 502 });
  }
  return new Response(r.body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
