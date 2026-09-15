// Corre al final del driver, dentro del Sandbox. Suma los créditos de
// kie.ai gastados (si los hubo) y cierra el generation_job.
const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

function sumCredits() {
  const base = "public/generated";
  if (!fs.existsSync(base)) return 0;
  let total = 0;
  for (const dir of fs.readdirSync(base)) {
    const manifestPath = path.join(base, dir, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      total += m.total_credits || 0;
    } catch {
      // ignore
    }
  }
  return total;
}

async function main() {
  const jobId = process.env.JOB_ID;
  const courseId = process.env.COURSE_ID;
  if (!jobId || !courseId) throw new Error("JOB_ID/COURSE_ID no están seteados");

  const sql = neon(process.env.DATABASE_URL);
  const credits = sumCredits();

  const pending = await sql`
    SELECT count(*)::int AS n FROM lessons
    WHERE course_id = ${courseId} AND status != 'ready'
  `;
  const anyPending = pending[0]?.n > 0;

  await sql`
    UPDATE generation_jobs
    SET status = ${anyPending ? "failed" : "success"},
        error = ${anyPending ? "Al menos una lección no terminó de renderizar." : null},
        credits_consumed = ${credits},
        updated_at = now()
    WHERE id = ${jobId}
  `;
  await sql`
    UPDATE courses
    SET status = ${anyPending ? "failed" : "published"}, updated_at = now()
    WHERE id = ${courseId}
  `;

  console.log(`[finish-job] job ${jobId} -> ${anyPending ? "failed" : "success"} (${credits} créditos)`);
}

main().catch(async (err) => {
  console.error("[finish-job] error:", err);
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      UPDATE generation_jobs
      SET status = 'failed', error = ${String(err).slice(0, 2000)}, updated_at = now()
      WHERE id = ${process.env.JOB_ID}
    `;
    await sql`
      UPDATE courses SET status = 'failed', updated_at = now() WHERE id = ${process.env.COURSE_ID}
    `;
  } catch {
    // si ni siquiera esto funciona, el job queda huérfano en "running" —
    // se ve en la lista de generation_jobs para depurar a mano.
  }
  process.exit(1);
});
