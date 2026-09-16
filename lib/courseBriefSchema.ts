import { z } from "zod";

// Mismos campos que MISSION.md de teach-hardened (ver
// ~/.claude/skills/teach-hardened/MISSION-FORMAT.md) — el brief de la
// entrevista del Director se traduce 1:1 a ese archivo (lib/generation/mission.ts)
// para que una sesión real de teach-hardened lo reciba sin tener que
// re-preguntar nada.
export const courseBriefSchema = z.object({
  topic: z
    .string()
    .describe(
      "El tema concreto del curso, específico y accionable — no una categoría genérica.",
    ),
  why: z
    .string()
    .describe(
      "1-3 frases: el objetivo concreto de la vida real que persigue — qué cambia en su vida o trabajo cuando tenga esta habilidad. Nada de 'para entender X' — la razón real detrás del interés (MISSION.md > Why).",
    ),
  successLooksLike: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe(
      "Cosas específicas y observables que la persona podrá HACER al terminar — no conceptos abstractos (MISSION.md > Success looks like).",
    ),
  constraints: z
    .array(z.string())
    .describe(
      "Lo que enmarca el diseño del curso: tiempo disponible, experiencia previa, restricciones prácticas. Sólo lo que de verdad cambia el diseño — no datos personales que no lo hagan (MISSION.md > Constraints).",
    ),
  outOfScope: z
    .array(z.string())
    .default([])
    .describe(
      "Temas adyacentes que la persona explícitamente NO quiere abordar ahora — protege el foco del curso (MISSION.md > Out of scope). Vacío si no aplica.",
    ),
  level: z.enum(["principiante", "intermedio", "avanzado"]),
  language: z.enum(["es", "en"]),
});

export type CourseBrief = z.infer<typeof courseBriefSchema>;
