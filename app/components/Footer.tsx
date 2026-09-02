export function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-8 text-sm text-zinc-500 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 justify-between">
        <p>© {new Date().getFullYear()} Cursos SaaS. Aprende algo cada semana.</p>
        <p className="flex gap-4">
          <a
            href="https://github.com/diegoecasas/cursos-saas"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-900 dark:hover:text-white"
          >
            Código
          </a>
          <span>·</span>
          <span>Hosted en Vercel + Fly.io</span>
        </p>
      </div>
    </footer>
  );
}
