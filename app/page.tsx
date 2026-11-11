"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How do I set up an Early Alert campaign?",
  "What campus resources can I refer students to?",
  "GSU 1010 instructor FAQs",
  "How does group coaching work?",
];

/* eslint-disable @typescript-eslint/no-explicit-any */
const md = {
  p: ({ node, ...p }: any) => <p className="mb-3 last:mb-0" {...p} />,
  ul: ({ node, ...p }: any) => <ul className="mb-3 list-disc space-y-1.5 pl-5" {...p} />,
  ol: ({ node, ...p }: any) => <ol className="mb-3 list-decimal space-y-1.5 pl-5" {...p} />,
  strong: ({ node, ...p }: any) => <strong className="font-semibold text-slate-900" {...p} />,
  a: ({ node, ...p }: any) => (
    <a className="text-[#0039A6] underline underline-offset-2" target="_blank" rel="noreferrer" {...p} />
  ),
  h1: ({ node, ...p }: any) => <p className="mb-2 mt-4 font-semibold text-slate-900" {...p} />,
  h2: ({ node, ...p }: any) => <p className="mb-2 mt-4 font-semibold text-slate-900" {...p} />,
  h3: ({ node, ...p }: any) => <p className="mb-2 mt-3 font-semibold text-slate-900" {...p} />,
};

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [greeting, setGreeting] = useState("Welcome");
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function resize() {
    const t = taRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 192) + "px";
  }

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setTimeout(resize, 0);
    setLoading(true);

    const update = (fn: (s: string) => string) =>
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: fn(c[c.length - 1].content) };
        return c;
      });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const tok = JSON.parse(data).choices?.[0]?.delta?.content ?? "";
            if (tok) update((s) => s + tok);
          } catch {}
        }
      }
    } catch {
      update(() => "Sorry, I couldn't reach the server. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  const empty = messages.length === 0;

  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="w-full"
    >
      <div className="rounded-3xl border border-black/10 bg-white p-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition focus-within:border-[#0039A6]/40 focus-within:shadow-[0_6px_28px_rgba(0,57,166,0.12)]">
        <textarea
          ref={taRef}
          rows={1}
          value={input}
          autoFocus
          onChange={(e) => {
            setInput(e.target.value);
            resize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask about coaching, Early Alert, or campus resources…"
          className="block max-h-48 w-full resize-none bg-transparent px-3 pb-1 pt-2 text-[15.5px] text-slate-900 outline-none placeholder:text-slate-400"
        />
        <div className="flex items-center justify-between pl-3 pr-0.5 pt-1">
          <span className="text-xs text-slate-400">Answers from Student Success resources</span>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0039A6] text-white transition hover:bg-[#002d85] disabled:cursor-not-allowed disabled:opacity-25"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );

  return (
    <div className="relative flex h-dvh flex-col bg-[#F7F7F5] text-slate-900">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "url(/panther.png)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right -6% bottom -10%",
          backgroundSize: "min(78vw, 820px)",
        }}
      />
      <div className="relative z-10 h-1 w-full bg-[#0039A6]" />

      <header className="relative z-10 flex items-center gap-4 border-b border-black/5 bg-white/75 px-5 py-2.5 backdrop-blur-md">
        <img src="/gsu-logo.png" alt="Georgia State University" className="h-11 w-auto" />
        <div className="hidden h-7 w-px bg-black/10 sm:block" />
        <span className="hidden text-sm font-medium text-slate-600 sm:block">Student Success Assistant</span>
        {!empty && (
          <button
            onClick={() => setMessages([])}
            className="ml-auto flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <span className="text-base leading-none">+</span> New chat
          </button>
        )}
      </header>

      {empty ? (
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-20">
          <h1 className="text-center font-serif text-4xl tracking-tight text-slate-900 sm:text-5xl">
            {greeting}
          </h1>
          <p className="mb-9 mt-3 text-center text-[15px] text-slate-500">
            How can Student Success help you today?
          </p>
          <div className="w-full max-w-2xl">{composer}</div>
          <div className="mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm text-slate-600 transition hover:border-[#0039A6]/30 hover:text-[#0039A6]"
              >
                {s}
              </button>
            ))}
          </div>
        </main>
      ) : (
        <>
          <main className="relative z-10 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-[#E8EEF9] px-4 py-2.5 text-[15.5px] leading-relaxed text-slate-900">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-3.5">
                    <div className="mt-1 h-6 w-6 shrink-0 rounded-full bg-[#0039A6] ring-4 ring-[#0039A6]/10" />
                    <div className="min-w-0 flex-1 text-[15.5px] leading-7 text-slate-800">
                      {m.content ? (
                        <ReactMarkdown components={md}>{m.content}</ReactMarkdown>
                      ) : (
                        <span className="inline-flex gap-1 pt-2.5">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-[#0039A6]/40 [animation-delay:-0.3s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-[#0039A6]/40 [animation-delay:-0.15s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-[#0039A6]/40" />
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}
              <div ref={endRef} />
            </div>
          </main>
          <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-4">
            {composer}
            <p className="mt-2 text-center text-[11px] text-slate-400">
              AI can make mistakes. Confirm important details with a Student Success coach.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
