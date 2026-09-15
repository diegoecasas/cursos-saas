// Migración de una sola vez: copia el curso que hasta ahora vivía en
// content/courses.ts (array estático) a las tablas nuevas. No mueve ningún
// asset — el HTML y el video de la Lección 1 se quedan donde ya están, en
// public/course-content/entrenamiento-perro/.
//
// Uso: npx tsx db/seed-entrenamiento-perro.ts

import { readFileSync } from "fs";
import { join } from "path";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./index";
import type { LessonScript } from "../lib/lessonScript";

async function main() {
  const db = getDb();

  const existing = await db
    .select()
    .from(schema.courses)
    .where(eq(schema.courses.slug, "entrenamiento-perro"))
    .limit(1);
  if (existing.length > 0) {
    console.log("entrenamiento-perro ya existe en Neon, no se toca.");
    return;
  }

  const script: LessonScript = JSON.parse(
    readFileSync(
      join(__dirname, "seed-data", "0001-el-ciclo-de-necesidades.json"),
      "utf8",
    ),
  );

  const [course] = await db
    .insert(schema.courses)
    .values({
      slug: "entrenamiento-perro",
      title: "Entrenar a tu cachorro sin usar la fuerza",
      subtitle: "El método positivo para las primeras semanas en casa",
      description:
        "Un curso corto y directo para quienes acaban de recibir un cachorro y viven en departamento. Se enfoca en lo urgente: que aprenda a hacer sus necesidades fuera de casa y responda con obediencia básica. Sin gritos, sin castigos, con evidencia detrás de cada decisión.",
      author: "Diego Casas",
      level: "principiante",
      language: "es",
      hero: { from: "from-amber-500", to: "to-orange-600", emoji: "🐶" },
      tags: ["mascotas", "cachorros", "refuerzo positivo", "departamento"],
      references: [
        {
          slug: "horario-diario",
          title: "Horario diario del cachorro",
          file: "horario-diario.html",
        },
      ],
      status: "published",
      createdBy: "seed:diego",
    })
    .returning();

  await db.insert(schema.lessons).values({
    courseId: course.id,
    num: 1,
    slug: "0001-el-ciclo-de-necesidades",
    title: "El ciclo del cachorro: predecir, sacar, marcar, premiar",
    summary:
      "El protocolo de las primeras dos semanas. Cada salida ejecutada igual, con timing preciso del marcador.",
    duration: "15 min",
    script,
    htmlPath: "0001-el-ciclo-de-necesidades.html",
    videoPath: "videos/0001-el-ciclo-de-necesidades.mp4",
    status: "ready",
  });

  console.log(`Sembrado: curso ${course.id}, lección 1.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
