import { z } from "zod";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  courseOutlineSchema,
  type CourseOutline,
  type LessonScriptDraft,
} from "@/lib/lessonScriptSchema";
import type { CourseBrief } from "@/lib/courseBriefSchema";

async function generateCourseOutline(brief: CourseBrief): Promise<CourseOutline> {
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-5"),
    schema: courseOutlineSchema,
    system: `Eres un diseñador instruccional. A partir de un brief de curso, escribes 1-4 lecciones cortas (15 min cada una) como guiones de video por beats — el mismo formato que ya usa esta plataforma para "Entrenar a tu cachorro sin usar la fuerza".

Cada beat tiene una "narration" (lo que se lee en voz alta, sin números en dígitos — escríbelos en palabras porque un modelo de texto a voz la va a leer literal) y un contenido visual según su "kind":
- hook: la apertura, una frase que engancha
- concept: una idea/estadística clave
- trigger-list: una lista corta de disparadores o casos
- process-steps: un proceso de 3-6 pasos en orden
- timing-compare: 2-4 casos comparados (uno "ok", el resto "bad")
- do-dont: qué sí / qué no
- cta: la tarea concreta para hoy

No pongas "media" (foto/video) en ningún beat — eso se genera después, en un paso aparte. El primer beat debe ser "hook" y el último "cta".

Idioma de todo el contenido: ${brief.language === "en" ? "inglés" : "español, tuteo colombiano"}.`,
    prompt: `Brief del curso:
Tema: ${brief.topic}
Por qué (misión): ${brief.why}
Éxito se ve como: ${brief.successLooksLike.join("; ")}
Restricciones: ${brief.constraints.join("; ") || "ninguna especial"}
Nivel: ${brief.level}`,
  });
  return object;
}

// Cuántas fotos de pasos permitimos como máximo por lección — junto con
// hook+cta eso acota el gasto de kie.ai por lección a ~5 fotos + 1 video.
const MAX_STEP_PHOTOS = 3;

const visualPlanSchema = z.object({
  hook: z.object({
    include: z.boolean().describe("true si esta lección se beneficia de una foto+video de apertura"),
    prompt: z.string().describe("escena fotorrealista en inglés, presente, sin texto en pantalla ni marcas ni celebridades"),
    motion: z.string().describe("descripción breve en inglés del movimiento sutil para animar la foto (cámara estable, 4-5s)"),
  }),
  cta: z.object({
    include: z.boolean().describe("true si vale la pena una foto para la tarea del cierre"),
    prompt: z.string().describe("escena fotorrealista en inglés, presente, sin texto en pantalla ni marcas"),
  }),
  steps: z
    .array(z.object({ include: z.boolean(), prompt: z.string() }))
    .describe(
      "un elemento por cada paso de la sección process-steps de la lección, mismo orden — arreglo vacío si la lección no tiene process-steps",
    ),
});
export type VisualPlan = z.infer<typeof visualPlanSchema>;

export async function planLessonVisuals(lesson: LessonScriptDraft): Promise<VisualPlan> {
  const hookBeat = lesson.beats.find((b) => b.kind === "hook");
  const ctaBeat = lesson.beats.find((b) => b.kind === "cta");
  const stepsBeat = lesson.beats.find((b) => b.kind === "process-steps");

  const { object: plan } = await generateObject({
    model: anthropic("claude-sonnet-5"),
    schema: visualPlanSchema,
    system: `Eres un director de fotografía que elige qué escenas de una lección merecen una foto fotorrealista generada por IA (kie.ai) y escribe el prompt en inglés para generarla.

Reglas:
- El hook (apertura) casi siempre se beneficia de una foto+video — inclúyelo salvo que el tema sea imposible de representar visualmente (ej. matemática abstracta).
- Describe personas genéricas ("a person's hands", "a home cook") salvo que el tema trate de un animal/objeto específico.
- Nunca menciones marcas, texto en pantalla, logos ni celebridades.
- Máximo ${MAX_STEP_PHOTOS} fotos de pasos — elige sólo los pasos donde una imagen realmente ayuda a entender; el resto va con include=false.
- Si la lección no tiene sección de pasos, devuelve "steps" como arreglo vacío.`,
    prompt: `Lección: "${lesson.title}"
Hook: ${hookBeat && hookBeat.kind === "hook" ? hookBeat.narration : "(esta lección no tiene hook)"}
CTA: ${ctaBeat && ctaBeat.kind === "cta" ? ctaBeat.narration : "(esta lección no tiene cta)"}
Pasos: ${
      stepsBeat && stepsBeat.kind === "process-steps"
        ? stepsBeat.steps.map((s, i) => `${i + 1}. ${s.label} — ${s.detail}`).join("\n")
        : "(esta lección no tiene process-steps)"
    }`,
  });

  if (hookBeat && hookBeat.kind === "hook" && plan.hook.include) {
    hookBeat.media = { photo: "hook.jpg", video: "hook.mp4" };
  }
  if (ctaBeat && ctaBeat.kind === "cta" && plan.cta.include) {
    ctaBeat.media = { photo: "cta.jpg" };
  }
  if (stepsBeat && stepsBeat.kind === "process-steps" && plan.steps.length === stepsBeat.steps.length) {
    stepsBeat.steps.forEach((step, i) => {
      if (plan.steps[i]?.include) {
        step.photo = `step-${i + 1}.jpg`;
      }
    });
  }

  return plan;
}

async function writeLessonRows(
  db: ReturnType<typeof getDb>,
  courseId: string,
  courseSlug: string,
  outline: CourseOutline,
  visualPlans: Map<string, VisualPlan>,
) {
  await db.insert(schema.lessons).values(
    outline.lessons.map((lesson, i) => ({
      courseId,
      num: i + 1,
      slug: lesson.id,
      title: lesson.title,
      summary: lesson.beats[0]?.narration.slice(0, 140) ?? lesson.title,
      duration: "15 min",
      script: { ...lesson, courseSlug },
      visualPlan: visualPlans.get(lesson.id) ?? null,
      status: "pending",
    })),
  );
}

// El curso completo (narración, fotos/video kie.ai, render Remotion) ya no
// se genera en un Vercel Sandbox — resultó demasiado frágil (reinicios por
// idle, red, librerías del sistema faltantes). Esta función ahora sólo hace
// la parte barata y rápida (guion + plan de fotos, vía Claude) y deja el
// job en "queued_local": alguien corre `npm run generate:local -- <slug>`
// en esta máquina para lo pesado. Ver scripts/run-local-generation.ts.
export async function startCourseGeneration({
  courseId,
  courseSlug,
  jobId,
  brief,
}: {
  courseId: string;
  courseSlug: string;
  jobId: string;
  brief: CourseBrief;
}): Promise<void> {
  const db = getDb();

  try {
    await db
      .update(schema.generationJobs)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(schema.generationJobs.id, jobId));

    const outline = await generateCourseOutline(brief);

    // Decide qué escenas de cada lección merecen foto/video fotorrealista
    // y con qué prompt — antes esto no existía y el paso de kie.ai quedaba
    // hardcodeado al piloto de Platanito. Muta outline.lessons in-place
    // (agrega los nombres de archivo en "media"/"photo").
    const visualPlans = new Map<string, VisualPlan>();
    for (const lesson of outline.lessons) {
      visualPlans.set(lesson.id, await planLessonVisuals(lesson));
    }

    await db
      .update(schema.courses)
      .set({
        title: outline.title,
        subtitle: outline.subtitle,
        description: outline.description,
        tags: outline.tags,
        hero: { from: "from-indigo-500", to: "to-purple-600", emoji: outline.heroEmoji },
        updatedAt: new Date(),
      })
      .where(eq(schema.courses.id, courseId));

    await writeLessonRows(db, courseId, courseSlug, outline, visualPlans);

    // El curso queda en status "generating" (tarjeta "disponible pronto"
    // en el catálogo) hasta que la corrida local termine y lo publique.
    await db
      .update(schema.generationJobs)
      .set({ status: "queued_local", updatedAt: new Date() })
      .where(eq(schema.generationJobs.id, jobId));
  } catch (err) {
    await db
      .update(schema.generationJobs)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message.slice(0, 2000) : String(err),
        updatedAt: new Date(),
      })
      .where(eq(schema.generationJobs.id, jobId));
    await db
      .update(schema.courses)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(schema.courses.id, courseId));
    throw err;
  }
}
