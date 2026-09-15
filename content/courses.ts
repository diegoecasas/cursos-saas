import { eq, asc } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type Lesson = {
  num: number;
  slug: string;
  title: string;
  summary: string;
  duration: string;
  /** HTML de referencia, en public/course-content/<slug>/lessons/. Puede
   * faltar mientras el Sandbox todavía está generando la lección. */
  file?: string;
  /** Ruta local o URL de Vercel Blob del video renderizado. */
  video?: string;
  status: string;
};

export type Reference = {
  slug: string;
  title: string;
  file: string;
};

export type Course = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  author: string;
  level: "principiante" | "intermedio" | "avanzado";
  language: "es" | "en";
  hero: schema.Hero;
  tags: string[];
  status: string;
  lessons: Lesson[];
  references: Reference[];
};

function toLesson(row: schema.Lesson): Lesson {
  return {
    num: row.num,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    duration: row.duration,
    file: row.htmlPath ?? undefined,
    video: row.videoPath ?? undefined,
    status: row.status,
  };
}

function toCourse(
  row: schema.Course,
  lessonRows: schema.Lesson[],
): Course {
  return {
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    author: row.author,
    level: row.level as Course["level"],
    language: row.language as Course["language"],
    hero: row.hero,
    tags: row.tags,
    status: row.status,
    lessons: lessonRows.map(toLesson).sort((a, b) => a.num - b.num),
    references: row.references,
  };
}

/** Todos los cursos publicados o en generación (para el catálogo). */
export async function getCourses(): Promise<Course[]> {
  const db = getDb();
  const courseRows = await db
    .select()
    .from(schema.courses)
    .orderBy(asc(schema.courses.createdAt));
  const all = await Promise.all(
    courseRows.map(async (c) => {
      const lessonRows = await db
        .select()
        .from(schema.lessons)
        .where(eq(schema.lessons.courseId, c.id));
      return toCourse(c, lessonRows);
    }),
  );
  return all;
}

export async function getCourse(slug: string): Promise<Course | undefined> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.courses)
    .where(eq(schema.courses.slug, slug))
    .limit(1);
  if (!row) return undefined;
  const lessonRows = await db
    .select()
    .from(schema.lessons)
    .where(eq(schema.lessons.courseId, row.id));
  return toCourse(row, lessonRows);
}

export async function getLesson(
  courseSlug: string,
  num: number,
): Promise<Lesson | undefined> {
  const course = await getCourse(courseSlug);
  return course?.lessons.find((l) => l.num === num);
}

export async function getReference(
  courseSlug: string,
  slug: string,
): Promise<Reference | undefined> {
  const course = await getCourse(courseSlug);
  return course?.references.find((r) => r.slug === slug);
}
