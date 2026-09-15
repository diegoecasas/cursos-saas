// Red de seguridad: si driver.sh aborta en cualquier paso (npm install,
// narración, kie.ai, render), esto corre por el trap ERR de bash y deja el
// job/curso en un estado legible en vez de "queued" para siempre.
const { neon } = require("@neondatabase/serverless");

async function main() {
  const jobId = process.env.JOB_ID;
  const courseId = process.env.COURSE_ID;
  const step = process.argv[2] || "desconocido";
  if (!jobId || !courseId) return;

  const sql = neon(process.env.DATABASE_URL);
  await sql`
    UPDATE generation_jobs
    SET status = 'failed', error = ${"Falló en el paso: " + step}, updated_at = now()
    WHERE id = ${jobId} AND status != 'success'
  `;
  await sql`
    UPDATE courses SET status = 'failed', updated_at = now()
    WHERE id = ${courseId} AND status != 'published'
  `;
}

main().catch(() => {
  // último recurso: si esto también falla, el job queda huérfano — se ve
  // igual en /admin/generation_jobs (a construir) para depurar a mano.
});
