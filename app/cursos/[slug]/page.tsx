import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCourse, courses } from "@/content/courses";

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
  return { title: course.title, description: course.subtitle };
}

export default async function CoursePage({ params }: { params: Params }) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link
        href="/cursos"
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
      >
        ← Catálogo
      </Link>

      <div
        className={`mt-6 rounded-2xl bg-gradient-to-br ${course.hero.from} ${course.hero.to} p-10 text-white flex items-start gap-6`}
      >
        <div className="text-6xl">{course.hero.emoji}</div>
        <div>
          <p className="text-sm opacity-80 uppercase tracking-wide">
            Nivel {course.level} · Por {course.author}
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold mt-2">
            {course.title}
          </h1>
          <p className="mt-3 opacity-90">{course.subtitle}</p>
        </div>
      </div>

      <p className="mt-8 text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
        {course.description}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {course.tags.map((t) => (
          <span
            key={t}
            className="text-xs px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          >
            {t}
          </span>
        ))}
      </div>

      <Link
        href={`/cursos/${course.slug}/chat`}
        className="mt-8 inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-5 py-2.5 text-sm font-medium hover:border-indigo-400"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        Hablar con el docente digital →
      </Link>

      <h2 className="text-2xl font-semibold mt-12 mb-4">Lecciones</h2>
      <ol className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        {course.lessons.map((lesson) => (
          <li key={lesson.num}>
            <Link
              href={`/cursos/${course.slug}/lecciones/${lesson.num}`}
              className="flex items-start gap-4 p-5 hover:bg-zinc-50 dark:hover:bg-zinc-900 group"
            >
              <span className="shrink-0 w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center font-medium">
                {String(lesson.num).padStart(2, "0")}
              </span>
              <span className="flex-1">
                <span className="block font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {lesson.title}
                </span>
                <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">
                  {lesson.summary}
                </span>
                <span className="mt-2 block text-xs uppercase tracking-wide text-zinc-500">
                  {lesson.duration}
                </span>
              </span>
              <span className="text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                →
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {course.references.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mt-12 mb-4">Referencia</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {course.references.map((ref) => (
              <li key={ref.slug}>
                <a
                  href={`/course-content/${course.slug}/reference/${ref.file}`}
                  target="_blank"
                  rel="noopener"
                  className="block rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-zinc-400 dark:hover:border-zinc-600"
                >
                  <span className="block font-medium">{ref.title}</span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    Abre en pestaña nueva
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
