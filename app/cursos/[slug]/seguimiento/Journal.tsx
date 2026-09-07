"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  readAll,
  readEntry,
  saveEntry,
  todayIso,
  formatDateEs,
  type JournalEntry,
} from "@/lib/journal";

type Props = { courseSlug: string; chatHref: string };

export function Journal({ courseSlug, chatHref }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [today] = useState(() => todayIso());
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [past, setPast] = useState<JournalEntry[]>([]);
  const saveTimer = useRef<number | undefined>(undefined);

  // Hydrate from localStorage after mount.
  useEffect(() => {
    const existing = readEntry(courseSlug, today);
    setContent(existing?.content ?? "");
    setPast(readAll(courseSlug).filter((e) => e.date !== today));
    setHydrated(true);
  }, [courseSlug, today]);

  // Debounced autosave.
  useEffect(() => {
    if (!hydrated) return;
    setStatus("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveEntry(courseSlug, today, content);
      setPast(readAll(courseSlug).filter((e) => e.date !== today));
      setStatus("saved");
    }, 700);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [content, hydrated, courseSlug, today]);

  function exportJson() {
    const data = readAll(courseSlug);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seguimiento-${courseSlug}-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("formato inválido");
      for (const entry of parsed) {
        if (
          entry &&
          typeof entry.date === "string" &&
          typeof entry.content === "string"
        ) {
          saveEntry(courseSlug, entry.date, entry.content);
        }
      }
      const refreshed = readEntry(courseSlug, today);
      setContent(refreshed?.content ?? "");
      setPast(readAll(courseSlug).filter((e) => e.date !== today));
      alert(`Importadas ${parsed.length} entradas.`);
    } catch (err) {
      alert(`No pudimos importar el archivo: ${(err as Error).message}`);
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight capitalize">
            Hoy, {formatDateEs(today)}
          </h2>
          <span className="text-xs text-zinc-500">
            {status === "saving" && "Guardando…"}
            {status === "saved" && "Guardado en tu navegador"}
          </span>
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Contá cómo te fue con tu cachorro hoy. Qué funcionó, qué te frustró, qué te
          sorprendió. Cuando charles con el docente digital, va a poder usar estas
          notas para darte apoyo.
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={4000}
          rows={10}
          placeholder="Ej. Hoy tuvimos dos accidentes seguidos en la sala. Me da rabia porque hicimos las salidas del reloj. Creo que se me escapó el disparador de la siesta corta a las 4pm…"
          className="mt-4 w-full resize-y rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-indigo-400"
        />
        <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
          <span>{content.length} / 4000</span>
          <Link
            href={chatHref}
            className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
          >
            Hablar con el docente digital →
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-semibold">Días anteriores</h3>
          <div className="flex gap-3 text-xs">
            <button
              type="button"
              onClick={exportJson}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline"
            >
              Exportar todo
            </button>
            <label className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline cursor-pointer">
              Importar
              <input
                type="file"
                accept="application/json"
                onChange={importJson}
                className="hidden"
              />
            </label>
          </div>
        </div>
        {!hydrated ? (
          <p className="mt-4 text-sm text-zinc-500">Cargando…</p>
        ) : past.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Todavía no hay entradas anteriores. Cuando escribas mañana, este espacio
            va a llenarse solo.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {past.map((entry) => (
              <li
                key={entry.date}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
              >
                <p className="text-xs uppercase tracking-wide text-zinc-500 capitalize">
                  {formatDateEs(entry.date)}
                </p>
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {entry.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <strong>Privacidad:</strong> tus notas se guardan sólo en este navegador
        (localStorage). No las subimos a un servidor. Cuando chateás con el docente,
        las últimas 7 entradas van sólo dentro del mensaje a Anthropic y no se
        persisten en ningún lado.
      </p>
    </div>
  );
}
