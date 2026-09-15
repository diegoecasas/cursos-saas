import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCourse, getCourses } from "@/content/courses";
import { Journal } from "./Journal";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const courses = await getCourses();
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) return {};
  return {
    title: `Seguimiento · ${course.title}`,
    description: "Tus notas del día. Sólo en tu navegador.",
  };
}

export default async function SeguimientoPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href={`/cursos/${course.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4"
      >
        ← Volver al curso
      </Link>

      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/cursos" className="hover:underline">
          Catálogo
        </Link>{" "}
        ·{" "}
        <Link href={`/cursos/${course.slug}`} className="hover:underline">
          {course.title}
        </Link>{" "}
        · <span className="text-zinc-700 dark:text-zinc-300">Seguimiento</span>
      </nav>

      <h1 className="text-3xl font-semibold tracking-tight mb-2">Seguimiento</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-8">
        Tu diario del curso {course.title.toLowerCase()}. El docente digital
        lee las últimas entradas cuando lo consultás y te da apoyo emocional
        basado en lo que estás pasando.
      </p>

      <Journal
        courseSlug={course.slug}
        chatHref={`/cursos/${course.slug}/chat`}
      />
    </div>
  );
}
