import { NextRequest } from "next/server";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getCourse } from "@/content/courses";
import { getCourseContext } from "@/lib/courseContext";
import { buildSystemPrompt, looksLikeInjection } from "@/lib/systemPrompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_INPUT_LEN = 2000;
const MAX_MESSAGES = 20;

type Params = Promise<{ slug: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) {
    return Response.json({ error: "Curso no encontrado." }, { status: 404 });
  }

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

  // Extract flat text of each message for validation.
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
          "Detectamos etiquetas que parecen intentos de manipular el docente digital. Reformulá la pregunta.",
      },
      { status: 400 },
    );
  }

  const courseContext = await getCourseContext(course);
  const system = buildSystemPrompt(course, courseContext);

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system,
    messages: await convertToModelMessages(messages),
    temperature: 0.4,
    maxRetries: 1,
    experimental_telemetry: { isEnabled: false },
  });

  return result.toUIMessageStreamResponse();
}
