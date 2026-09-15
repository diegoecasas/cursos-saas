import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  uniqueIndex,
  index,
  vector,
} from "drizzle-orm/pg-core";
import type { LessonScript } from "@/lib/lessonScript";
import type { CourseBrief } from "@/lib/courseBriefSchema";

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

// --- Catálogo de cursos ---------------------------------------------------

export type Hero = { from: string; to: string; emoji: string };
export type Reference = { slug: string; title: string; file: string };
export type { CourseBrief };

// status: "draft" (recién creado por el Director) | "generating" (Sandbox
// corriendo) | "published" (al menos una lección lista) | "failed".
export const courses = pgTable("courses", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  description: text("description").notNull(),
  author: text("author").notNull(),
  level: text("level").notNull(),
  language: text("language").notNull().default("es"),
  hero: jsonb("hero").$type<Hero>().notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  references: jsonb("references").$type<Reference[]>().notNull().default([]),
  // La entrevista del Director, capturada por la tool proposeCourseBrief.
  mission: jsonb("mission").$type<CourseBrief>(),
  // Reservado para búsqueda por similitud cuando el catálogo lo justifique
  // (ver plan — Fase B lo deja listo, no lo consulta todavía).
  missionEmbedding: vector("mission_embedding", { dimensions: 1536 }),
  status: text("status").notNull().default("draft"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [uniqueIndex("courses_slug_uq").on(t.slug)]);

// status: "pending" (guion escrito, sin media) | "generating" (Sandbox
// trabajando esta lección) | "ready" | "failed".
export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    num: integer("num").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    duration: text("duration").notNull(),
    script: jsonb("script").$type<LessonScript>().notNull(),
    // Ruta relativa en public/course-content/<slug>/lessons/ (autoría a
    // mano) o URL de Vercel Blob (generado por la corrida local).
    htmlPath: text("html_path"),
    videoPath: text("video_path"),
    // Prompts de kie.ai decididos por planLessonVisuals (startJob.ts) —
    // se guardan acá para que la corrida local (scripts/run-local-generation.ts)
    // los pueda leer sin depender de un Sandbox.
    visualPlan: jsonb("visual_plan"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("lessons_course_num_uq").on(t.courseId, t.num)],
);

// kind: hoy sólo "full-course" (todo el curso en un job). Deja espacio para
// desglosar por lección/etapa (narration/visuals/render) más adelante.
export const generationJobs = pgTable("generation_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("full-course"),
  status: text("status").notNull().default("queued"),
  error: text("error"),
  creditsConsumed: integer("credits_consumed"),
  sandboxId: text("sandbox_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type GenerationJob = typeof generationJobs.$inferSelect;
export type NewGenerationJob = typeof generationJobs.$inferInsert;
