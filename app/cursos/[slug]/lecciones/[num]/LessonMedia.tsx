"use client";

import { useState } from "react";

export default function LessonMedia({
  title,
  videoSrc,
  iframeSrc,
}: {
  title: string;
  videoSrc: string;
  iframeSrc: string;
}) {
  const [showReference, setShowReference] = useState(false);

  return (
    <div>
      <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white">
        {showReference ? (
          <iframe
            src={iframeSrc}
            title={title}
            className="w-full min-h-[80vh] bg-white"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <video
            src={videoSrc}
            title={title}
            controls
            className="w-full aspect-video bg-black"
          />
        )}
      </div>

      <p className="mt-3 text-sm text-zinc-500 text-center">
        <button
          type="button"
          onClick={() => setShowReference((v) => !v)}
          className="hover:underline"
        >
          {showReference
            ? "← Volver al video"
            : "Ver la versión de referencia (texto) →"}
        </button>
      </p>
    </div>
  );
}
