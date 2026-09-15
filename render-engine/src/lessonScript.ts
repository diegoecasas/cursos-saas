// Contrato de datos entre la autoría de la lección (teach-hardened / el
// workspace en Documents) y el renderer de video (este repo). Un
// `LessonScript` es la traducción, beat a beat, de una lección HTML ya
// publicada — no reemplaza el HTML, lo complementa.

/** Fotos/video fotorrealistas generados con kie.ai (ver scripts/generate-visuals.py).
 * Rutas relativas a public/, sin el prefijo "generated/<lesson-id>/". */
export type Media = { photo: string; video?: string };

export type Beat =
  | { kind: "hook"; narration: string; caption: string; media?: Media }
  | { kind: "concept"; narration: string; title: string; body: string }
  | {
      kind: "trigger-list";
      narration: string;
      title: string;
      items: string[];
    }
  | {
      kind: "process-steps";
      narration: string;
      steps: { label: string; detail: string; photo?: string }[];
    }
  | {
      kind: "timing-compare";
      narration: string;
      cases: { label: string; verdict: "ok" | "bad"; note: string }[];
    }
  | {
      kind: "do-dont";
      narration: string;
      do: string[];
      dont: string[];
    }
  | { kind: "cta"; narration: string; tasks: string[]; media?: Media };

export type LessonScript = {
  id: string;
  courseSlug: string;
  title: string;
  /** Ruta relativa (informativa) al HTML del que se derivó este guion —
   * sólo existe para lecciones escritas a mano; las que autora el Director
   * de Cursos no vienen de un HTML previo. */
  sourceHtml?: string;
  primarySource: { label: string; url: string };
  beats: Beat[];
};

/** Duración de un clip de narración, en segundos, escrita por generate-narration.py. */
export type NarrationManifest = {
  lessonId: string;
  voice: string;
  beats: { index: number; file: string; seconds: number }[];
};
