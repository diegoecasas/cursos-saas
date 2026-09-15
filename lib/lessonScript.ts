// Debe coincidir a mano con teach-animado/src/lessonScript.ts — es el
// contrato que consume el motor Remotion al renderizar. Si cambia uno,
// cambia el otro.

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
  sourceHtml?: string;
  primarySource: { label: string; url: string };
  beats: Beat[];
};
