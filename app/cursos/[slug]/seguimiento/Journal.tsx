"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  listEntries,
  saveEntry,
  todayIso,
  formatDateEs,
  migrateFromLocalStorage,
  hasLocalStorageEntries,
  type JournalEntry,
} from "@/lib/journal";

type Props = { courseSlug: string; chatHref: string };

export function Journal({ courseSlug, chatHref }: Props) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [today] = useState(() => todayIso());
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [past, setPast] = useState<JournalEntry[]>([]);
  const [showMigrate, setShowMigrate] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const lastSaved = useRef<string>("");

  const refresh = useCallback(async () => {
    try {
      setError(undefined);
      const entries = await listEntries(courseSlug);
      const todayEntry = entries.find((e) => e.date === today);
      const preserved =
        !hydrated && todayEntry ? todayEntry.content : content;
      if (!hydrated) {
        setContent(todayEntry?.content ?? "");
        lastSaved.current = todayEntry?.content ?? "";
      } else if (todayEntry && todayEntry.content !== preserved) {
        setContent(todayEntry.content);
        lastSaved.current = todayEntry.content;
      }
      setPast(entries.filter((e) => e.date !== today));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, [courseSlug, today, content, hydrated]);

  useEffect(() => {
    void refresh();
    setShowMigrate(hasLocalStorageEntries(courseSlug));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSlug]);

  useEffect(() => {
    if (!hydrated || loading) return;
    if (content === lastSaved.current) return;
    setStatus("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await saveEntry(courseSlug, today, content);
        lastSaved.current = content;
        setStatus("saved");
      } catch (e) {
        setStatus("error");
        setError((e as Error).message);
      }
    }, 700);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [content, hydrated, loading, courseSlug, today]);

  async function handleSaveAndChat() {
    const trimmed = content.trim();
    if (!trimmed || navigating) return;
    setNavigating(true);
    setStatus("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    try {
      if (content !== lastSaved.current) {
        await saveEntry(courseSlug, today, content);
        lastSaved.current = content;
      }
      setStatus("saved");
      router.push(`${chatHref}?fromNote=${today}`);
    } catch (e) {
      setStatus("error");
      setError((e as Error).message);
      setNavigating(false);
    }
  }

  async function runMigration() {
    setStatus("saving");
    try {
      const n = await migrateFromLocalStorage(courseSlug);
      setShowMigrate(false);
      alert(`Migradas ${n} entrada${n === 1 ? "" : "s"} desde tu navegador.`);
      await refresh();
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      setError((e as Error).message);
    }
  }

  async function exportJson() {
    const all = [
      ...(content.trim() ? [{ date: today, content, updatedAt: "" }] : []),
      ...past,
    ];
    const blob = new Blob([JSON.stringify(all, null, 2)], {
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
      let ok = 0;
      for (const entry of parsed) {
        if (
          entry &&
          typeof entry.date === "string" &&
          typeof entry.content === "string" &&
          entry.content.trim()
        ) {
          await saveEntry(courseSlug, entry.date, entry.content);
          ok++;
        }
      }
      await refresh();
      alert(`Importadas ${ok} entradas.`);
    } catch (err) {
      alert(`No pudimos importar el archivo: ${(err as Error).message}`);
    } finally {
      e.target.value = "";
    }
  }

  const canSaveAndChat = content.trim().length > 0 && !loading && !navigating;

  return (
    <div className="space-y-8">
      {showMigrate && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            Encontramos notas viejas guardadas sólo en este navegador. Podés
            migrarlas al servidor para que sobrevivan si limpiás cookies o
            cambiás de dispositivo.
          </p>
          <button
            type="button"
            onClick={runMigration}
            className="mt-3 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-1.5"
          >
            Migrar notas al servidor
          </button>
        </div>
      )}

      <section>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight capitalize">
            Hoy, {formatDateEs(today)}
          </h2>
          <span className="text-xs text-zinc-500">
            {loading && "Cargando…"}
            {!loading && status === "saving" && "Guardando…"}
            {!loading && status === "saved" && "Guardado"}
            {!loading && status === "error" && "Error al guardar"}
          </span>
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Contá cómo te fue con tu cachorro hoy. Qué funcionó, qué te frustró, qué te
          sorprendió. Se autoguarda mientras escribís.
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={4000}
          rows={10}
          disabled={loading}
          placeholder="Ej. Hoy tuvimos dos accidentes seguidos en la sala. Me da rabia porque hicimos las salidas del reloj. Creo que se me escapó el disparador de la siesta corta a las 4pm…"
          className="mt-4 w-full resize-y rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-indigo-400 disabled:opacity-60"
        />
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xs text-zinc-500">{content.length} / 4000</span>
          <button
            type="button"
            onClick={handleSaveAndChat}
            disabled={!canSaveAndChat}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-5 py-2.5 text-sm font-medium transition"
          >
            {navigating ? (
              <>
                <span className="inline-block w-3 h-3 rounded-full bg-white/60 animate-pulse" />
                Abriendo el chat…
              </>
            ) : (
              <>Guardar y hablar con el docente →</>
            )}
          </button>
        </div>
        {!canSaveAndChat && !navigating && !loading && (
          <p className="mt-2 text-xs text-zinc-500 text-right">
            Escribí algo para activar el botón.
          </p>
        )}
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
              Exportar
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
        {loading ? (
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
        {error && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </section>

      <p className="text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <strong>Privacidad:</strong> tus notas se guardan en nuestro servidor
        (Neon Postgres), asociadas a tu cuenta si estás logueado o a un ID
        anónimo del navegador si no. Cuando charlás con el docente digital, las
        últimas 7 entradas se pasan a Anthropic dentro del mensaje y no se
        persisten allá.
      </p>
    </div>
  );
}
