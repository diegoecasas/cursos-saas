"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";

const transport = new DefaultChatTransport({ api: "/api/director" });

function briefFromParts(
  parts: { type: string; [key: string]: unknown }[],
): { slug: string; status: string } | null {
  const part = parts.find(
    (p) => p.type === "tool-proposeCourseBrief" && p.state === "output-available",
  ) as { output?: { slug: string; status: string } } | undefined;
  return part?.output ? { slug: part.output.slug, status: part.output.status } : null;
}

export function DirectorChat() {
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: useMemo(() => transport, []),
  });
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col h-[70vh] bg-white dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-5 py-3 flex items-center gap-3">
        <span className="inline-block w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
          D
        </span>
        <div className="leading-tight">
          <p className="font-medium">Director de Cursos</p>
          <p className="text-xs text-zinc-500">Diseña un curso corto a tu medida</p>
        </div>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-sm text-zinc-500">
            <p>
              Contame qué querés aprender, para qué, y cuánto tiempo tenés — el
              Director arma un curso corto sólo para eso.
            </p>
          </div>
        )}

        {messages.map((m) => {
          const text = (m.parts ?? [])
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("");
          const brief = m.role === "assistant" ? briefFromParts(m.parts ?? []) : null;

          return (
            <div key={m.id}>
              <div
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {text || (m.role === "assistant" && busy ? "…" : "")}
                </div>
              </div>
              {brief && (
                <div className="mt-2 flex justify-start">
                  <Link
                    href={`/cursos/${brief.slug}`}
                    className="text-sm rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-4 py-2 hover:border-indigo-400"
                  >
                    Ver el curso generándose →
                  </Link>
                </div>
              )}
            </div>
          );
        })}

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
            {error.message || "Algo falló. Reintentá."}
          </div>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="border-t border-zinc-200 dark:border-zinc-800 p-3 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Quiero aprender a…"
          className="flex-1 resize-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 max-h-32"
        />
        {busy ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            Parar
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Enviar
          </button>
        )}
      </form>
    </div>
  );
}
