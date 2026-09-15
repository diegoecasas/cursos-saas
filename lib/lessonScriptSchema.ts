import { z } from "zod";

// Espejo en Zod de lib/lessonScript.ts, para poder pedírselo a Claude como
// salida estructurada (generateObject). Mismo shape — si uno cambia, cambia
// el otro (y también teach-animado/src/lessonScript.ts, el consumidor real).

const mediaSchema = z
  .object({
    photo: z.string().describe("nombre de archivo, ej. hook.jpg"),
    video: z.string().optional(),
  })
  .optional();

const beatSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("hook"),
    narration: z.string(),
    caption: z.string(),
    media: mediaSchema,
  }),
  z.object({
    kind: z.literal("concept"),
    narration: z.string(),
    title: z.string(),
    body: z.string(),
  }),
  z.object({
    kind: z.literal("trigger-list"),
    narration: z.string(),
    title: z.string(),
    items: z.array(z.string()).min(3).max(6),
  }),
  z.object({
    kind: z.literal("process-steps"),
    narration: z.string(),
    steps: z
      .array(
        z.object({
          label: z.string(),
          detail: z.string(),
          photo: z.string().optional().describe("nombre de archivo, ej. step-1.jpg — se llena después, en un paso aparte"),
        }),
      )
      .min(3)
      .max(6),
  }),
  z.object({
    kind: z.literal("timing-compare"),
    narration: z.string(),
    cases: z
      .array(
        z.object({
          label: z.string(),
          verdict: z.enum(["ok", "bad"]),
          note: z.string(),
        }),
      )
      .min(2)
      .max(4),
  }),
  z.object({
    kind: z.literal("do-dont"),
    narration: z.string(),
    do: z.array(z.string()).min(2).max(5),
    dont: z.array(z.string()).min(2).max(5),
  }),
  z.object({
    kind: z.literal("cta"),
    narration: z.string(),
    tasks: z.array(z.string()).min(2).max(5),
    media: mediaSchema,
  }),
]);

export const lessonScriptSchema = z.object({
  id: z.string().describe('slug de la lección, ej. "0001-tu-primer-presupuesto"'),
  title: z.string(),
  primarySource: z.object({ label: z.string(), url: z.string() }),
  beats: z
    .array(beatSchema)
    .min(4)
    .max(9)
    .describe(
      "4-9 beats en orden pedagógico: normalmente empieza con hook, termina con cta.",
    ),
});

export const courseOutlineSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  tags: z.array(z.string()).min(2).max(6),
  heroEmoji: z.string().describe("un solo emoji representativo del tema"),
  lessons: z
    .array(lessonScriptSchema)
    .min(1)
    .max(4)
    .describe("1-4 lecciones cortas — nada de cursos de 40 horas."),
});

export type LessonScriptDraft = z.infer<typeof lessonScriptSchema>;
export type CourseOutline = z.infer<typeof courseOutlineSchema>;
