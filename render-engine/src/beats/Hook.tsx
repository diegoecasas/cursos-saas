import React from "react";
import { useCurrentFrame, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { MediaBackdrop } from "./MediaBackdrop";
import type { Beat } from "../lessonScript";

export const Hook: React.FC<{
  beat: Extract<Beat, { kind: "hook" }>;
  lessonId: string;
}> = ({ beat, lessonId }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });

  const text = (
    <div
      style={{
        opacity: enter,
        transform: `translateY(${(1 - enter) * 24}px)`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: theme.sans,
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: beat.media ? "#f0d9b8" : theme.accent,
          marginBottom: 28,
        }}
      >
        Lección 01 · Necesidades fuera de casa
      </div>
      <div
        style={{
          fontFamily: theme.serif,
          fontSize: 58,
          lineHeight: 1.25,
          color: beat.media ? "#ffffff" : theme.ink,
          fontWeight: 700,
          textShadow: beat.media ? "0 2px 24px rgba(0,0,0,0.45)" : "none",
        }}
      >
        {beat.caption}
      </div>
    </div>
  );

  if (beat.media) {
    return (
      <MediaBackdrop lessonId={lessonId} media={beat.media}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "0 140px 96px",
          }}
        >
          {text}
        </div>
      </MediaBackdrop>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: theme.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 140px",
        boxSizing: "border-box",
      }}
    >
      {text}
    </div>
  );
};
