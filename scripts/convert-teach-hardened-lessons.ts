// Traduce las lecciones HTML que produjo una sesión real de teach-hardened
// (./lessons/*.html en el workspace) al LessonScript que usa el motor
// Remotion, y las deja listas en Neon para que
// scripts/run-local-generation.ts arranque narración/visuales/render — sin
// pasar por el generador de outline automático (generateCourseOutline).
//
// Uso: npm run convert:lessons -- <course-slug> [workspace-dir]
// Por defecto el workspace es ~/teach-hardened-workspaces/<course-slug>/,
// el mismo que arma scripts/prepare-teach-hardened-workspace.ts.

import { readdirSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { neon } from "@neondatabase/serverless";
import { htmlToLessonScript } from "@/lib/generation/htmlToLessonScript";
import { planLessonVisuals } from "@/lib/generation/startJob";

async function main() {
  const slug = process.argv[2];
  const workspaceDirArg = process.argv[3];
  if (!slug) {
    console.error("uso: npm run convert:lessons -- <course-slug> [workspace-dir]");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está seteada (¿falta .env.local?)");
  const sql = neon(url);

  const courses = await sql`SELECT id, language FROM courses WHERE slug = ${slug} LIMIT 1`;
  const course = courses[0];
  if (!course) throw new Error(`No existe ningún curso con slug "${slug}"`);
  const language = (course.language === "en" ? "en" : "es") as "es" | "en";

  const workspaceDir = workspaceDirArg ?? join(homedir(), "teach-hardened-workspaces", slug);
  const lessonsDir = join(workspaceDir, "lessons");
  const files = readdirSync(lessonsDir)
    .filter((f) => f.endsWith(".html"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No hay lecciones en ${lessonsDir} — ¿ya corrió teach-hardened acá?`);
  }

  console.log(`${files.length} lección(es) en ${lessonsDir}`);

  for (const [i, file] of files.entries()) {
    const lessonId = file.replace(/\.html$/, "");
    const html = readFileSync(join(lessonsDir, file), "utf8");

    console.log(`[${lessonId}] traduciendo HTML a LessonScript...`);
    const script = await htmlToLessonScript(html, lessonId, language);

    console.log(`[${lessonId}] decidiendo plan de fotos/video...`);
    const visualPlan = await planLessonVisuals(script);

    const num = i + 1;
    const summary = script.beats[0]?.narration.slice(0, 140) ?? script.title;

    await sql`
      INSERT INTO lessons (course_id, num, slug, title, summary, duration, script, visual_plan, status)
      VALUES (${course.id}, ${num}, ${lessonId}, ${script.title}, ${summary}, '15 min',
              ${JSON.stringify({ ...script, courseSlug: slug })}, ${JSON.stringify(visualPlan)}, 'pending')
      ON CONFLICT (course_id, num) DO UPDATE SET
        slug = EXCLUDED.slug,
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        script = EXCLUDED.script,
        visual_plan = EXCLUDED.visual_plan,
        updated_at = now()
      WHERE lessons.status != 'ready'
    `;
    console.log(`[${lessonId}] guardada como lección ${num}.`);
  }

  console.log(`\nListo — corré: npm run generate:local -- ${slug}`);
}

main().catch((err) => {
  console.error("[convert-teach-hardened-lessons] error:", err);
  process.exit(1);
});
