import {
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// Owner is either "user:<clerkId>" (signed in) or "anon:<cookie-uuid>"
// (anonymous per browser). One note per (owner, course, date). Empty content
// means the row was deleted client-side.
export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id").notNull(),
    courseSlug: text("course_slug").notNull(),
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
      t.ownerId,
      t.courseSlug,
      t.date,
    ),
    index("notes_owner_course_idx").on(t.ownerId, t.courseSlug),
  ],
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
