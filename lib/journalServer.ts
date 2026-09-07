import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type JournalRow = {
  date: string;
  content: string;
  updatedAt: Date;
};

// Loads recent journal entries for a (cookieId, courseSlug) pair and formats
// them as markdown for injection into the chat system prompt.
export async function recentJournalMarkdown(
  cookieId: string,
  courseSlug: string,
  days = 7,
  maxCharsPerEntry = 600,
): Promise<string | undefined> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const db = getDb();
  const rows = await db
    .select({
      date: schema.notes.date,
      content: schema.notes.content,
    })
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.cookieId, cookieId),
        eq(schema.notes.courseSlug, courseSlug),
      ),
    )
    .orderBy(desc(schema.notes.date))
    .limit(30);

  const recent = rows.filter((r) => r.date >= cutoffIso && r.content.trim());
  if (recent.length === 0) return undefined;

  const parts = recent.map((r) => {
    const capped =
      r.content.length > maxCharsPerEntry
        ? r.content.slice(0, maxCharsPerEntry) + "…"
        : r.content;
    return `### ${r.date}\n${capped}`;
  });
  return parts.join("\n\n");
}
