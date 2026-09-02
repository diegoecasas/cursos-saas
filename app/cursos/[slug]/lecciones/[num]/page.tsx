import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCourse, getLesson, courses } from "@/content/courses";

type Params = Promise<{ slug: string; num: string }>;

export async function generateStaticParams() {
  return courses.flatMap((c) =>
    c.lessons.map((l) => ({ slug: c.slug, num: String(l.num) })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, num } = await params;
  const lesson = getLesson(slug, Number(num));
  const course = getCourse(slug);
  if (!lesson || !course) return {};
  return {
    title: lesson.title,
    description: `${course.title} · Lección ${lesson.num}`,
  };
}

export default async function LessonPage({ params }: { params: Params }) {
  const { slug, num } = await params;
  const numInt = Number(num);
  const course = getCourse(slug);
  const lesson = getLesson(slug, numInt);
  if (!course || !lesson) notFound();

  const prev = course.lessons.find((l) => l.num === numInt - 1);
  const next = course.lessons.find((l) => l.num === numInt + 1);
  const iframeSrc = `/course-content/${course.slug}/lessons/${lesson.file}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <nav className="text-sm text-zinc-500 mb-4">
        <Link href="/cursos" className="hover:underline">
          Catálogo
        </Link>{" "}
        ·{" "}
        <Link href={`/cursos/${course.slug}`} className="hover:underline">
          {course.title}
        </Link>{" "}
        · <span className="text-zinc-700 dark:text-zinc-300">Lección {lesson.num}</span>
      </nav>

      <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white">
        <iframe
          src={iframeSrc}
          title={lesson.title}
          className="w-full min-h-[80vh] bg-white"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="text-sm">
          {prev ? (
            <Link
              href={`/cursos/${course.slug}/lecciones/${prev.num}`}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              ← Lección {prev.num}: {prev.title}
            </Link>
          ) : (
            <span className="text-zinc-400">Primera lección</span>
          )}
        </div>
        <div className="text-sm text-right">
          {next ? (
            <Link
              href={`/cursos/${course.slug}/lecciones/${next.num}`}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Lección {next.num}: {next.title} →
            </Link>
          ) : (
            <span className="text-zinc-400">Última lección publicada</span>
          )}
        </div>
      </div>

      <p className="mt-6 text-sm text-zinc-500 text-center">
        <a
          href={iframeSrc}
          target="_blank"
          rel="noopener"
          className="hover:underline"
        >
          Abrir la lección en pestaña nueva ↗
        </a>
      </p>
    </div>
  );
}
