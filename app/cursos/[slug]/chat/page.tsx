import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCourse, courses } from "@/content/courses";
import { DocenteChat } from "./DocenteChat";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) return {};
  return {
    title: `Docente digital · ${course.title}`,
    description: `Chat con el docente digital del curso ${course.title}.`,
  };
}

export default async function ChatPage({ params }: { params: Params }) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <nav className="text-sm text-zinc-500 mb-4">
        <Link href="/cursos" className="hover:underline">
          Catálogo
        </Link>{" "}
        ·{" "}
        <Link href={`/cursos/${course.slug}`} className="hover:underline">
          {course.title}
        </Link>{" "}
        · <span className="text-zinc-700 dark:text-zinc-300">Docente digital</span>
      </nav>

      <h1 className="text-3xl font-semibold tracking-tight mb-2">
        Docente digital
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-6">
        Un agente de Claude entrenado sólo con el material de este curso.
        No responde temas fuera del temario, y no reemplaza al veterinario para nada clínico.
      </p>

      <DocenteChat courseSlug={course.slug} courseTitle={course.title} />

      <p className="mt-4 text-xs text-zinc-500">
        Modelo: <code>claude-haiku-4-5</code> · Contexto: sólo las lecciones y
        documentos de referencia de este curso.
      </p>
    </div>
  );
}
