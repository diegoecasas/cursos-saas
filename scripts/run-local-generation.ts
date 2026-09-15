// Corre en esta máquina para generar (narración vía Modal, fotos/video vía
// kie.ai, render Remotion) un curso que el Director armó en línea. La
// entrevista y el guion de las lecciones ya viven en Neon (escritos por
// lib/generation/startJob.ts) — esto sólo hace la parte pesada/costosa que
// dejamos de correr en Vercel Sandbox por lo frágil que resultó.
//
// Uso: npm run generate:local -- <course-slug>
//
// Requiere en .env.local: DATABASE_URL, KIE_API_KEY, BLOB_READ_WRITE_TOKEN,
// MODAL_NARRATION_URL, NARRATION_SHARED_SECRET.

import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";
import { neon } from "@neondatabase/serverless";

const REPO_ROOT = join(__dirname, "..");
const CONTENT_DIR = join(REPO_ROOT, "render-engine", "src", "content");

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("uso: npm run generate:local -- <course-slug>");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está seteada (¿falta .env.local?)");
  const sql = neon(url);

  const courses = await sql`SELECT * FROM courses WHERE slug = ${slug} LIMIT 1`;
  const course = courses[0];
  if (!course) throw new Error(`No existe ningún curso con slug "${slug}"`);
  if (course.status === "published") {
    console.log(`El curso "${slug}" ya está publicado — nada que hacer.`);
    return;
  }

  const jobs = await sql`
    SELECT * FROM generation_jobs
    WHERE course_id = ${course.id} AND status != 'success'
    ORDER BY created_at DESC LIMIT 1
  `;
  const job = jobs[0];
  if (!job) throw new Error(`No hay un generation_job pendiente para "${slug}"`);

  const lessons = await sql`
    SELECT * FROM lessons WHERE course_id = ${course.id} AND status != 'ready' ORDER BY num
  `;
  if (lessons.length === 0) {
    console.log(`Todas las lecciones de "${slug}" ya están "ready" — corriendo finish-job igual.`);
  }

  // Limpiamos src/content/*.json de corridas anteriores (otro curso, o un
  // intento previo) — driver.sh procesa TODO lo que encuentre ahí adentro.
  mkdirSync(CONTENT_DIR, { recursive: true });
  for (const name of readdirSync(CONTENT_DIR)) {
    if (name.endsWith(".json")) rmSync(join(CONTENT_DIR, name));
  }

  for (const lesson of lessons) {
    writeFileSync(
      join(CONTENT_DIR, `${lesson.slug}.json`),
      JSON.stringify(lesson.script, null, 2),
    );
    if (lesson.visual_plan) {
      writeFileSync(
        join(CONTENT_DIR, `${lesson.slug}.visuals.json`),
        JSON.stringify(lesson.visual_plan, null, 2),
      );
    }
  }

  console.log(
    `[run-local-generation] "${course.title}" (${lessons.length} lección(es) pendiente(s)) — arrancando driver.sh...`,
  );

  await sql`UPDATE generation_jobs SET status = 'running', updated_at = now() WHERE id = ${job.id}`;

  const driverPath = join(REPO_ROOT, "lib", "generation", "driver.sh");
  if (!existsSync(driverPath)) throw new Error(`No encuentro ${driverPath}`);

  await new Promise<void>((resolve, reject) => {
    const child = spawn("bash", [driverPath], {
      cwd: REPO_ROOT,
      stdio: "inherit",
      env: {
        ...process.env,
        COURSE_ID: course.id,
        JOB_ID: job.id,
      },
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`driver.sh salió con código ${code}`));
    });
    child.on("error", reject);
  });

  const finalCourse = await sql`SELECT status FROM courses WHERE id = ${course.id}`;
  const finalJob = await sql`SELECT status, error FROM generation_jobs WHERE id = ${job.id}`;
  console.log(
    `[run-local-generation] terminado — curso: ${finalCourse[0]?.status}, job: ${finalJob[0]?.status}${
      finalJob[0]?.error ? ` (${finalJob[0].error})` : ""
    }`,
  );
}

main().catch((err) => {
  console.error("[run-local-generation] error:", err);
  process.exit(1);
});
