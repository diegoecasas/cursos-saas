import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-lg tracking-tight"
        >
          <span className="inline-block w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-600" />
          Cursos SaaS
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/cursos"
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
          >
            Catálogo
          </Link>
          <a
            href="https://github.com/diegoecasas/cursos-saas"
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <Link
            href="/cursos"
            className="hidden sm:inline-flex items-center rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-1.5 text-sm font-medium hover:opacity-90"
          >
            Empezar
          </Link>
        </nav>
      </div>
    </header>
  );
}
