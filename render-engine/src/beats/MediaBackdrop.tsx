import React from "react";
import { AbsoluteFill, Img, Loop, OffthreadVideo, staticFile } from "remotion";
import type { Media } from "../lessonScript";

// scripts/generate-visuals.py siempre pide clips de 5s (Seedance) — a 30fps.
const VIDEO_CLIP_FRAMES = 5 * 30;

/** Foto/video fotorrealista de fondo (kie.ai) + scrim para legibilidad de
 * texto claro encima. Usado sólo en los beats que tienen `media` — el resto
 * de la lección se queda en el tratamiento plano tipo "pizarra". */
export const MediaBackdrop: React.FC<{
  lessonId: string;
  media: Media;
  children: React.ReactNode;
}> = ({ lessonId, media, children }) => {
  const base = `generated/${lessonId}/`;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {media.video ? (
        <Loop durationInFrames={VIDEO_CLIP_FRAMES}>
          <OffthreadVideo
            src={staticFile(base + media.video)}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Loop>
      ) : (
        <Img
          src={staticFile(base + media.photo)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.05) 40%, rgba(20,14,8,0.55) 75%, rgba(20,14,8,0.82) 100%)",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
