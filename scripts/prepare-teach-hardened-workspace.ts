// Traduce el brief que el Director recolectó en línea (guardado en
// courses.mission) a un workspace real de teach-hardened — MISSION.md ya
// escrito, para que la sesión de autoría no vuelva a preguntar nada y vaya
// directo a producir lecciones.
//
// Uso: npm run prepare:mission -- <course-slug>
//
// Después: abrir Claude Code en la carpeta impresa y correr /teach-hardened.

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { neon } from "@neondatabase/serverless";
import { renderMissionMarkdown, renderNotesMarkdown } from "@/lib/generation/mission";
import type { CourseBrief } from "@/lib/courseBriefSchema";

const WORKSPACES_ROOT = join(homedir(), "teach-hardened-workspaces");

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("uso: npm run prepare:mission -- <course-slug>");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está seteada (¿falta .env.local?)");
  const sql = neon(url);

  const courses = await sql`SELECT slug, mission FROM courses WHERE slug = ${slug} LIMIT 1`;
  const course = courses[0];
  if (!course) throw new Error(`No existe ningún curso con slug "${slug}"`);
  if (!course.mission) {
    throw new Error(
      `El curso "${slug}" no tiene un brief guardado (courses.mission está vacío) — este curso es anterior al nuevo formato del Director.`,
    );
  }

  const brief = course.mission as CourseBrief;
  const workspaceDir = join(WORKSPACES_ROOT, slug);
  const missionPath = join(workspaceDir, "MISSION.md");

  if (existsSync(missionPath)) {
    console.log(`Ya existe ${missionPath} — no lo piso. Bórralo a mano si querés regenerarlo.`);
    console.log(`Workspace: ${workspaceDir}`);
    return;
  }

  mkdirSync(workspaceDir, { recursive: true });
  writeFileSync(missionPath, renderMissionMarkdown(brief));
  writeFileSync(join(workspaceDir, "NOTES.md"), renderNotesMarkdown(brief));

  console.log(`Workspace listo: ${workspaceDir}`);
  console.log(`  - MISSION.md (${brief.topic})`);
  console.log(`  - NOTES.md`);
  console.log("");
  console.log("Siguiente paso: abre Claude Code en esa carpeta y corre /teach-hardened —");
  console.log("va a encontrar el MISSION.md y saltarse la entrevista, directo a lecciones.");
}

main().catch((err) => {
  console.error("[prepare-teach-hardened-workspace] error:", err);
  process.exit(1);
});
