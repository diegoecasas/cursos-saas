// Corre dentro del Sandbox, después de renderizar una lección. Sube el mp4
// a Vercel Blob y marca la lección como "ready" en Neon — sin pasar por
// drizzle (este proyecto no lo tiene), SQL directo vía @neondatabase/serverless.
const fs = require("fs");
const path = require("path");
const { put } = require("@vercel/blob");
const { neon } = require("@neondatabase/serverless");

async function main() {
  const [, , lessonId, scriptPath] = process.argv;
  if (!lessonId || !scriptPath) {
    throw new Error("uso: publish-lesson.js <lessonId> <scriptPath>");
  }
  const courseId = process.env.COURSE_ID;
  if (!courseId) throw new Error("COURSE_ID no está seteado");

  const script = JSON.parse(fs.readFileSync(scriptPath, "utf8"));
  const courseSlug = script.courseSlug;
  const mp4Path = path.join("out", `${lessonId}.mp4`);

  const buffer = fs.readFileSync(mp4Path);
  const blob = await put(`${courseSlug}/${lessonId}.mp4`, buffer, {
    access: "public",
    contentType: "video/mp4",
  });

  const sql = neon(process.env.DATABASE_URL);
  await sql`
    UPDATE lessons
    SET video_path = ${blob.url}, status = 'ready', updated_at = now()
    WHERE course_id = ${courseId} AND slug = ${lessonId}
  `;

  console.log(`[publish-lesson] ${lessonId} -> ${blob.url}`);
}

main().catch((err) => {
  console.error("[publish-lesson] error:", err);
  process.exit(1);
});
