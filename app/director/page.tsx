import Link from "next/link";
import type { Metadata } from "next";
import { DirectorChat } from "./DirectorChat";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Director de Cursos",
  description: "Diseña un curso corto a tu medida, conversando.",
};

export default function DirectorPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/cursos" className="hover:underline">
          Catálogo
        </Link>{" "}
        · <span className="text-zinc-700 dark:text-zinc-300">Director de Cursos</span>
      </nav>

      <h1 className="text-3xl font-semibold tracking-tight mb-2">
        Director de Cursos
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-6">
        Contale qué querés aprender. Si ya existe un curso parecido, te lo
        muestra; si no, diseña uno nuevo y lo deja generándose.
      </p>

      <DirectorChat />

      <p className="mt-4 text-xs text-zinc-500">
        Modelo: <code>claude-sonnet-5</code> · La generación completa (video,
        narración, imágenes) tarda varios minutos una vez que el curso queda
        en cola.
      </p>
    </div>
  );
}
