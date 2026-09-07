// Client-side journal API. Notes live in Postgres on the server, keyed by an
// anonymous per-browser cookie. localStorage is used only as a temporary offline
// buffer for a note being edited between saves.

export type JournalEntry = {
  date: string;
  content: string;
  updatedAt: string;
};

export function todayIso(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
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

export async function listEntries(courseSlug: string): Promise<JournalEntry[]> {
  const res = await fetch(`/api/journal/${courseSlug}`, {
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`No pudimos cargar tus notas (${res.status}).`);
  const data = await res.json();
  return (data.entries ?? []) as JournalEntry[];
}

export async function saveEntry(
  courseSlug: string,
  date: string,
  content: string,
): Promise<void> {
  const res = await fetch(`/api/journal/${courseSlug}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date, content }),
  });
  if (!res.ok) throw new Error(`No pudimos guardar (${res.status}).`);
}

// One-shot migration: read old localStorage notes and push them to the API.
// Returns how many entries were migrated. Deletes the local key on success.
const legacyKey = (slug: string) => `cursos-saas:journal:${slug}`;

export async function migrateFromLocalStorage(
  courseSlug: string,
): Promise<number> {
  if (typeof window === "undefined") return 0;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(legacyKey(courseSlug));
  } catch {
    return 0;
  }
  if (!raw) return 0;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return 0;
  }
  if (!Array.isArray(parsed)) return 0;
  let migrated = 0;
  for (const entry of parsed) {
    if (
      entry &&
      typeof entry === "object" &&
      "date" in entry &&
      "content" in entry &&
      typeof (entry as { date: unknown }).date === "string" &&
      typeof (entry as { content: unknown }).content === "string"
    ) {
      const e = entry as { date: string; content: string };
      if (!e.content.trim()) continue;
      try {
        await saveEntry(courseSlug, e.date, e.content);
        migrated++;
      } catch {
        // best effort; leave the local copy in place if the API failed
        return migrated;
      }
    }
  }
  try {
    window.localStorage.removeItem(legacyKey(courseSlug));
  } catch {
    // ignore
  }
  return migrated;
}

export function hasLocalStorageEntries(courseSlug: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(legacyKey(courseSlug));
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}
