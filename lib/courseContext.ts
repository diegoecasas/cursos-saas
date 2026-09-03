import { promises as fs } from "fs";
import path from "path";
import type { Course } from "@/content/courses";

const contentRoot = path.join(process.cwd(), "public", "course-content");

// Strip HTML/script/style/comments, decode common entities, collapse whitespace.
// Keeps the plain reading order so the model can see the structure of the lesson.
function htmlToText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<(br|hr)\s*\/?>/gi, "\n")
    .replace(/<\/(h[1-6]|p|li|div|section|header|footer|blockquote|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function readAndClean(fullPath: string): Promise<string> {
  const html = await fs.readFile(fullPath, "utf8");
  return htmlToText(html);
}

let cache = new Map<string, { at: number; text: string }>();
const TTL_MS = 60_000;

export async function getCourseContext(course: Course): Promise<string> {
  const cached = cache.get(course.slug);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.text;

  const lessons = await Promise.all(
    course.lessons.map(async (l) => {
      const p = path.join(contentRoot, course.slug, "lessons", l.file);
      const body = await readAndClean(p);
      return `## Lección ${l.num}: ${l.title}\n\n${body}`;
    }),
  );

  const references = await Promise.all(
    course.references.map(async (r) => {
      const p = path.join(contentRoot, course.slug, "reference", r.file);
      const body = await readAndClean(p);
      return `## Referencia: ${r.title}\n\n${body}`;
    }),
  );

  const text = [
    `# Curso: ${course.title}`,
    `Autor: ${course.author}`,
    `Descripción: ${course.description}`,
    ``,
    ...lessons,
    ``,
    ...references,
  ].join("\n\n");

  cache.set(course.slug, { at: Date.now(), text });
  return text;
}
