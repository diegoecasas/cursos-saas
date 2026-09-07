import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export async function recentJournalMarkdown(
  ownerId: string,
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
        eq(schema.notes.ownerId, ownerId),
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
