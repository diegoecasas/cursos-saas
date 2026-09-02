export type Lesson = {
  num: number;
  slug: string;
  title: string;
  summary: string;
  duration: string;
  file: string;
};

export type Reference = {
  slug: string;
  title: string;
  file: string;
};

export type Course = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  author: string;
  level: "principiante" | "intermedio" | "avanzado";
  language: "es" | "en";
  hero: {
    from: string;
    to: string;
    emoji: string;
  };
  tags: string[];
  lessons: Lesson[];
  references: Reference[];
};

export const courses: Course[] = [
  {
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
    lessons: [
      {
        num: 1,
        slug: "0001-el-ciclo-de-necesidades",
        title: "El ciclo del cachorro: predecir, sacar, marcar, premiar",
        summary:
          "El protocolo de las primeras dos semanas. Cada salida ejecutada igual, con timing preciso del marcador.",
        duration: "15 min",
        file: "0001-el-ciclo-de-necesidades.html",
      },
    ],
    references: [
      {
        slug: "horario-diario",
        title: "Horario diario del cachorro",
        file: "horario-diario.html",
      },
    ],
  },
];

export function getCourse(slug: string): Course | undefined {
  return courses.find((c) => c.slug === slug);
}

export function getLesson(
  courseSlug: string,
  num: number,
): Lesson | undefined {
  const course = getCourse(courseSlug);
  return course?.lessons.find((l) => l.num === num);
}

export function getReference(
  courseSlug: string,
  slug: string,
): Reference | undefined {
  const course = getCourse(courseSlug);
  return course?.references.find((r) => r.slug === slug);
}
