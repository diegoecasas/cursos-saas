import {
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// One note per (cookieId, courseSlug, date). Empty content = row is deleted.
export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cookieId: text("cookie_id").notNull(),
    courseSlug: text("course_slug").notNull(),
    // YYYY-MM-DD in the student's local timezone (kept as text, not date,
    // to avoid TZ round-trips — the client owns the calendar).
    date: text("date").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("notes_owner_course_date_uq").on(
      t.cookieId,
      t.courseSlug,
      t.date,
    ),
    index("notes_owner_course_idx").on(t.cookieId, t.courseSlug),
  ],
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
