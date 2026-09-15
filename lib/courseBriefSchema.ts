import { z } from "zod";

export const courseBriefSchema = z.object({
  topic: z
    .string()
    .describe(
      "El tema concreto del curso, específico y accionable — no una categoría genérica.",
    ),
  audience: z
    .string()
    .describe(
      "Para quién es y por qué lo quiere aprender ahora — la misión detrás del interés.",
    ),
  objectives: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe("2-4 resultados concretos que la persona podrá hacer al terminar."),
  constraints: z
    .array(z.string())
    .describe(
      "Lo que enmarca el diseño del curso: tiempo disponible, experiencia previa, restricciones prácticas.",
    ),
  level: z.enum(["principiante", "intermedio", "avanzado"]),
  language: z.enum(["es", "en"]),
});

export type CourseBrief = z.infer<typeof courseBriefSchema>;
