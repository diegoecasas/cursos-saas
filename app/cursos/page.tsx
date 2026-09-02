import Link from "next/link";
import type { Metadata } from "next";
import { courses } from "@/content/courses";

export const metadata: Metadata = {
  title: "Catálogo de cursos",
  description: "Todos los cursos disponibles hoy.",
};

export default function CoursesCatalog() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Catálogo</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400 max-w-xl">
        {courses.length === 1
          ? "Un curso disponible por ahora. Más en camino."
          : `${courses.length} cursos disponibles.`}
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Link
            key={course.slug}
            href={`/cursos/${course.slug}`}
            className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:border-zinc-400 dark:hover:border-zinc-600 transition"
          >
            <div
              className={`aspect-[16/10] bg-gradient-to-br ${course.hero.from} ${course.hero.to} flex items-center justify-center text-6xl`}
            >
              {course.hero.emoji}
            </div>
            <div className="p-5">
              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                Nivel {course.level} · {course.lessons.length}{" "}
                {course.lessons.length === 1 ? "lección" : "lecciones"}
              </p>
              <h3 className="font-semibold text-lg leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {course.title}
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
                {course.subtitle}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
