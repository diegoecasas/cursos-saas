import type { CourseBrief } from "@/lib/courseBriefSchema";

// Traduce el brief del Director al MISSION.md exacto que espera
// teach-hardened (~/.claude/skills/teach-hardened/MISSION-FORMAT.md) — al
// encontrar este archivo ya escrito, el skill se salta su propia entrevista
// y va directo a producir lecciones.
export function renderMissionMarkdown(brief: CourseBrief): string {
  const lines = [
    `# Mission: ${brief.topic}`,
    "",
    "## Why",
    brief.why,
    "",
    "## Success looks like",
    ...brief.successLooksLike.map((s) => `- ${s}`),
    "",
    "## Constraints",
    ...(brief.constraints.length > 0
      ? brief.constraints.map((c) => `- ${c}`)
      : ["- (ninguna particular)"]),
  ];

  if (brief.outOfScope.length > 0) {
    lines.push("", "## Out of scope", ...brief.outOfScope.map((o) => `- ${o}`));
  }

  return lines.join("\n") + "\n";
}

const LANGUAGE_LABEL: Record<CourseBrief["language"], string> = {
  es: "español (Colombia, tuteo)",
  en: "English",
};

export function renderNotesMarkdown(brief: CourseBrief): string {
  return `# Notes\n\nTeaching language: ${LANGUAGE_LABEL[brief.language]}\nNivel de partida declarado en la entrevista: ${brief.level}\n`;
}
