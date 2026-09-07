// Client-side journal storage. Notes live in localStorage — never on our server.
// They're sent to the chat API only when the student is actively chatting, so the
// server sees them only in-request, never at rest.

export type JournalEntry = {
  date: string; // YYYY-MM-DD in the student's local timezone
  content: string;
  updatedAt: number;
};

const storageKey = (courseSlug: string) => `cursos-saas:journal:${courseSlug}`;

export function todayIso(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function readAll(courseSlug: string): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(courseSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is JournalEntry =>
          e &&
          typeof e === "object" &&
          typeof e.date === "string" &&
          typeof e.content === "string",
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch {
    return [];
  }
}

export function readEntry(
  courseSlug: string,
  date: string,
): JournalEntry | undefined {
  return readAll(courseSlug).find((e) => e.date === date);
}

export function saveEntry(courseSlug: string, date: string, content: string) {
  if (typeof window === "undefined") return;
  const list = readAll(courseSlug);
  const idx = list.findIndex((e) => e.date === date);
  const trimmed = content.slice(0, 4000);
  if (!trimmed.trim() && idx >= 0) {
    // Empty content — remove the entry entirely.
    list.splice(idx, 1);
  } else if (trimmed.trim()) {
    const entry: JournalEntry = {
      date,
      content: trimmed,
      updatedAt: Date.now(),
    };
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);
  } else {
    return;
  }
  list.sort((a, b) => (a.date < b.date ? 1 : -1));
  window.localStorage.setItem(storageKey(courseSlug), JSON.stringify(list));
}

// Compact recent journal into a plain-text block for the model context.
// Only the last N days with content, trimmed to keep the prompt small.
export function recentJournalAsMarkdown(
  courseSlug: string,
  days = 7,
): string | undefined {
  const all = readAll(courseSlug);
  if (all.length === 0) return undefined;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const recent = all.filter((e) => e.date >= cutoffIso && e.content.trim());
  if (recent.length === 0) return undefined;
  const parts = recent.map((e) => {
    const capped = e.content.length > 600 ? e.content.slice(0, 600) + "…" : e.content;
    return `### ${e.date}\n${capped}`;
  });
  return parts.join("\n\n");
}

export function formatDateEs(iso: string): string {
  try {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("es", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}
