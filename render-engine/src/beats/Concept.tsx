import React from "react";
import { useCurrentFrame, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { BeatShell } from "./BeatShell";
import type { Beat } from "../lessonScript";

export const Concept: React.FC<{
  beat: Extract<Beat, { kind: "concept" }>;
}> = ({ beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });

  return (
    <BeatShell eyebrow={beat.title} caption={beat.narration}>
      <div
        style={{
          opacity: enter,
          transform: `scale(${0.94 + enter * 0.06})`,
          background: theme.accentSoft,
          borderRadius: 20,
          padding: "48px 56px",
          alignSelf: "flex-start",
        }}
      >
        <div
          style={{
            fontFamily: theme.serif,
            fontSize: 44,
            lineHeight: 1.35,
            color: theme.ink,
            fontWeight: 700,
          }}
        >
          {beat.body}
        </div>
      </div>
    </BeatShell>
  );
};
