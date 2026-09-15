import React from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  Composition,
  Sequence,
  staticFile,
} from "remotion";
import type { LessonScript, NarrationManifest } from "./lessonScript";
import { Hook } from "./beats/Hook";
import { Concept } from "./beats/Concept";
import { TriggerList } from "./beats/TriggerList";
import { ProcessSteps } from "./beats/ProcessSteps";
import { TimingCompare } from "./beats/TimingCompare";
import { DoDont } from "./beats/DoDont";
import { Cta } from "./beats/Cta";

const FPS = 30;
const WORDS_PER_SECOND = 2.5; // estimado, cuando aún no hay narración generada
const LEAD_IN_SECONDS = 1.1;
const TAIL_SECONDS = 1.3;
const GAP_FRAMES = 8;

// `manifest`/`frames` llegan resueltos por calculateMetadata (ver abajo) y no
// deben pasarse a mano — quedan opcionales sólo para que el tipo de
// `defaultProps` no obligue a inventarlos antes de tiempo.
type Props = {
  lesson: LessonScript;
  manifest?: NarrationManifest | null;
  frames?: number[];
};

// Sólo se usa al abrir Remotion Studio sin --props (previsualización manual
// de este proyecto). Cualquier render real (`npx remotion render ... --props`)
// llega con su propio "lesson" y lo reemplaza por completo — no hay ningún
// curso "de ejemplo" hardcodeado acá.
const PLACEHOLDER_LESSON: LessonScript = {
  id: "0000-placeholder",
  courseSlug: "placeholder",
  title: "(sin lección — abrí con --props)",
  primarySource: { label: "placeholder", url: "" },
  beats: [{ kind: "hook", narration: "Placeholder.", caption: "Placeholder" }],
};

function estimateSeconds(narration: string): number {
  const words = narration.trim().split(/\s+/).length;
  return words / WORDS_PER_SECOND;
}

async function loadManifest(
  lessonId: string,
): Promise<NarrationManifest | null> {
  try {
    const res = await fetch(staticFile(`narration/${lessonId}/manifest.json`));
    if (!res.ok) return null;
    return (await res.json()) as NarrationManifest;
  } catch {
    return null;
  }
}

function framesFor(
  lesson: LessonScript,
  manifest: NarrationManifest | null,
): number[] {
  return lesson.beats.map((beat, i) => {
    const seconds =
      manifest?.beats.find((b) => b.index === i)?.seconds ??
      estimateSeconds(beat.narration);
    return Math.ceil((seconds + LEAD_IN_SECONDS + TAIL_SECONDS) * FPS);
  });
}

const calculateMetadata: CalculateMetadataFunction<Props> = async ({
  props,
}) => {
  const manifest = await loadManifest(props.lesson.id);
  const frames = framesFor(props.lesson, manifest);
  const total =
    frames.reduce((a, b) => a + b, 0) + GAP_FRAMES * (frames.length - 1);
  return {
    durationInFrames: total,
    fps: FPS,
    width: 1920,
    height: 1080,
    props: { ...props, manifest, frames },
  };
};

export const LessonVideoComposition: React.FC = () => {
  return (
    <Composition
      id="LessonVideo"
      component={LessonVideo}
      durationInFrames={300}
      fps={FPS}
      width={1920}
      height={1080}
      calculateMetadata={calculateMetadata}
      defaultProps={{
        lesson: PLACEHOLDER_LESSON,
        manifest: null,
        frames: undefined,
      }}
    />
  );
};

export const LessonVideo: React.FC<Props> = ({ lesson, manifest, frames }) => {
  const resolvedFrames = frames ?? framesFor(lesson, manifest ?? null);
  let cursor = 0;

  return (
    <AbsoluteFill>
      {lesson.beats.map((beat, i) => {
        const durationInFrames = resolvedFrames[i];
        const from = cursor;
        cursor += durationInFrames + GAP_FRAMES;
        const audioFile = manifest?.beats.find((b) => b.index === i)?.file;

        return (
          <Sequence key={i} from={from} durationInFrames={durationInFrames}>
            {audioFile ? (
              <Audio src={staticFile(`narration/${lesson.id}/${audioFile}`)} />
            ) : null}
            {beat.kind === "hook" && <Hook beat={beat} lessonId={lesson.id} />}
            {beat.kind === "concept" && <Concept beat={beat} />}
            {beat.kind === "trigger-list" && <TriggerList beat={beat} />}
            {beat.kind === "process-steps" && (
              <ProcessSteps
                beat={beat}
                durationInFrames={durationInFrames}
                lessonId={lesson.id}
              />
            )}
            {beat.kind === "timing-compare" && <TimingCompare beat={beat} />}
            {beat.kind === "do-dont" && <DoDont beat={beat} />}
            {beat.kind === "cta" && <Cta beat={beat} lessonId={lesson.id} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
