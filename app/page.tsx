import Link from "next/link";
import { courses } from "@/content/courses";

export default function Home() {
  const featured = courses[0];
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-24 sm:py-32 grid gap-12 sm:grid-cols-2 items-center">
          <div>
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-3 tracking-wide uppercase">
              Cursos cortos · aprende hoy
            </p>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">
              Un curso no debería tomarte 40 horas.
            </h1>
            <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400 max-w-lg">
              Cursos diseñados para una victoria concreta cada lección.
              Con evidencia detrás de cada decisión. Sin relleno, sin cinturones que
              subir, sin gamificación vacía.
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                href="/cursos"
                className="inline-flex items-center rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-3 font-medium hover:opacity-90"
              >
                Ver catálogo →
              </Link>
              <a
                href="#por-que"
                className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-800 px-6 py-3 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Cómo funciona
              </a>
            </div>
          </div>
          <div className="relative">
            <div
              className={`aspect-[4/3] rounded-2xl bg-gradient-to-br ${featured.hero.from} ${featured.hero.to} p-8 shadow-xl flex flex-col justify-between text-white`}
            >
              <div className="text-6xl">{featured.hero.emoji}</div>
              <div>
                <p className="text-sm opacity-80 mb-1">Curso destacado</p>
                <p className="text-2xl font-semibold leading-tight">
                  {featured.title}
                </p>
                <p className="mt-2 text-sm opacity-90">{featured.subtitle}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Por qué */}
      <section id="por-que" className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-20 grid gap-10 sm:grid-cols-3">
          {[
            {
              title: "Lecciones de 15 minutos",
              body: "Cada lección tiene un objetivo tangible que puedes practicar hoy. Terminas con algo hecho, no con algo por hacer.",
            },
            {
              title: "Evidencia, no opiniones",
              body: "Cada afirmación se apoya en una fuente verificable. Sin citaciones inventadas, sin promesas mágicas.",
            },
            {
              title: "Cero fluff",
              body: "Nadie tiene tiempo para 40 horas de video. Los cursos van a lo esencial y respetan tu atención.",
            },
          ].map((f) => (
            <div key={f.title}>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured course preview */}
      <section className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-2 uppercase tracking-wide">
            Empieza aquí
          </p>
          <h2 className="text-3xl font-semibold tracking-tight mb-6">
            {featured.title}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mb-8">
            {featured.description}
          </p>
          <Link
            href={`/cursos/${featured.slug}`}
            className="inline-flex items-center rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-3 font-medium hover:opacity-90"
          >
            Ver el curso →
          </Link>
        </div>
      </section>
    </div>
  );
}
