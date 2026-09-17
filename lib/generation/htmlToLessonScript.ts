import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { lessonScriptSchema, type LessonScriptDraft } from "@/lib/lessonScriptSchema";

// data: URIs (fuentes, imágenes inline) pueden pesar cientos de KB y no
// aportan nada a la narración — los recortamos antes de mandar el HTML al
// modelo.
function stripDataUris(html: string): string {
  return html.replace(/data:[^"')\s]+/g, "data:[omitido]");
}

function stripNoise(html: string): string {
  return stripDataUris(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

/**
 * Traduce UN lesson HTML de teach-hardened (./lessons/NNNN-*.html) al
 * mismo contrato LessonScript (beats) que usa el motor Remotion — sin
 * inventar contenido nuevo, solo reestructurando lo que ya escribió la
 * sesión de autoría en beats con narración leíble en voz alta.
 */
export async function htmlToLessonScript(
  html: string,
  lessonId: string,
  language: "es" | "en",
): Promise<LessonScriptDraft> {
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-5"),
    schema: lessonScriptSchema,
    system: `Eres un editor que convierte una lección HTML ya escrita (de una sesión real de enseñanza, teach-hardened) en un guion de video por beats — el mismo formato que usa esta plataforma para lecciones animadas.

REGLA PRINCIPAL: no inventes contenido nuevo. Extrae y reestructura lo que YA está en el HTML — su texto, su orden, sus ejemplos, sus pasos. Tu trabajo es de edición, no de autoría.

Cada beat tiene una "narration" (lo que se lee en voz alta — sin números en dígitos, escríbelos en palabras porque un modelo de texto a voz la va a leer literal) y un contenido según su "kind":
- hook: la apertura de la lección — la idea o frase que engancha, tomada de la introducción del HTML.
- concept: una idea o dato clave del cuerpo de la lección.
- trigger-list: una lista corta (3-6 ítems) de casos, señales o ejemplos que ya aparecen en el HTML.
- process-steps: un proceso de 3-6 pasos, si el HTML describe uno en ese orden.
- timing-compare: 2-4 casos comparados (uno "ok", el resto "bad"), si el HTML compara así.
- do-dont: qué sí / qué no, si el HTML tiene esa distinción.
- cta: la tarea o práctica concreta que el HTML propone al final.

Usa solo los kinds que el contenido real soporte — no fuerces una lección sin pasos a tener "process-steps". El primer beat debe ser "hook" y el último "cta". No pongas "media" (foto/video) en ningún beat — eso se decide después, en un paso aparte.

"primarySource": busca en el HTML un enlace o cita a una fuente externa de calidad (el propio teach-hardened recomienda una por lección). Si genuinamente no hay ninguna, usa como label el título de la lección y url vacío — nunca inventes una URL.

"id": usa exactamente "${lessonId}".

Idioma de todo el contenido: ${language === "en" ? "inglés" : "español, tuteo colombiano"}.`,
    prompt: `Lección HTML (teach-hardened):\n\n${stripNoise(html)}`,
  });

  return { ...object, id: lessonId };
}
