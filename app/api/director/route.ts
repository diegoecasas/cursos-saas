import { NextRequest } from "next/server";
import {
  streamText,
  convertToModelMessages,
  tool,
  stepCountIs,
  type UIMessage,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCourses } from "@/content/courses";
import { buildDirectorPrompt, looksLikeInjection } from "@/lib/directorPrompt";
import { courseBriefSchema } from "@/lib/courseBriefSchema";
import { getOwnerId } from "@/lib/identity";
import { startCourseGeneration } from "@/lib/generation/startJob";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_INPUT_LEN = 2000;
const MAX_MESSAGES = 30;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(req: NextRequest) {
  let body: { messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Faltan mensajes." }, { status: 400 });
  }
  if (messages.length > MAX_MESSAGES) {
    return Response.json(
      {
        error: `Esta conversación superó ${MAX_MESSAGES} turnos. Recargá la página para empezar de nuevo.`,
      },
      { status: 400 },
    );
  }

  const textOf = (m: UIMessage): string =>
    (m.parts ?? [])
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ");

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastUserText = lastUser ? textOf(lastUser) : "";
  if (lastUserText.length > MAX_INPUT_LEN) {
    return Response.json(
      { error: `Mensaje demasiado largo (máx ${MAX_INPUT_LEN} caracteres).` },
      { status: 400 },
    );
  }
  if (looksLikeInjection(lastUserText)) {
    return Response.json(
      {
        error:
          "Detectamos etiquetas que parecen intentos de manipular al Director. Reformulá el mensaje.",
      },
      { status: 400 },
    );
  }

  const ownerId = await getOwnerId();
  const existingCourses = await getCourses();
  const existingSummary = existingCourses
    .map((c) => `- "${c.title}" (${c.slug}): ${c.description}`)
    .join("\n");

  const system = buildDirectorPrompt(existingSummary);

  const result = streamText({
    model: anthropic("claude-sonnet-5"),
    system,
    messages: await convertToModelMessages(messages),
    temperature: 0.6,
    maxRetries: 1,
    stopWhen: stepCountIs(3),
    experimental_telemetry: { isEnabled: false },
    tools: {
      proposeCourseBrief: tool({
        description:
          "Crea el curso en el catálogo con el brief reunido en la entrevista, y dispara su generación.",
        inputSchema: courseBriefSchema,
        execute: async (brief) => {
          const db = getDb();
          const baseSlug = slugify(brief.topic) || "curso";
          let slug = baseSlug;
          let n = 1;
          // Evita colisiones de slug sin bloquear la creación.
          while (
            (
              await db
                .select({ id: schema.courses.id })
                .from(schema.courses)
                .where(eq(schema.courses.slug, slug))
                .limit(1)
            ).length > 0
          ) {
            n += 1;
            slug = `${baseSlug}-${n}`;
          }

          const [course] = await db
            .insert(schema.courses)
            .values({
              slug,
              title: brief.topic,
              subtitle: brief.audience,
              description: brief.objectives.join(". "),
              author: "Director de Cursos",
              level: brief.level,
              language: brief.language,
              hero: { from: "from-indigo-500", to: "to-purple-600", emoji: "✨" },
              tags: [],
              references: [],
              mission: brief,
              status: "generating",
              createdBy: ownerId,
            })
            .returning();

          const [job] = await db
            .insert(schema.generationJobs)
            .values({ courseId: course.id, kind: "full-course", status: "queued" })
            .returning();

          // No bloquea la respuesta — el Sandbox corre por su cuenta y
          // escribe el resultado directo en Neon.
          startCourseGeneration({
            courseId: course.id,
            courseSlug: course.slug,
            jobId: job.id,
            brief,
          }).catch(
            () => {
              // Falla registrada dentro de startCourseGeneration; nada más
              // que hacer acá sin bloquear la conversación.
            },
          );

          return {
            courseId: course.id,
            slug: course.slug,
            status: "queued" as const,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
