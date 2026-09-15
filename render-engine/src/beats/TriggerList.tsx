import React from "react";
import { useCurrentFrame, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { BeatShell } from "./BeatShell";
import type { Beat } from "../lessonScript";

export const TriggerList: React.FC<{
  beat: Extract<Beat, { kind: "trigger-list" }>;
}> = ({ beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stagger = 6;

  return (
    <BeatShell eyebrow={beat.title} caption={beat.narration}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        {beat.items.map((item, i) => {
          const enter = spring({
            frame: frame - i * stagger,
            fps,
            config: { damping: 200 },
          });
          return (
            <div
              key={item}
              style={{
                opacity: enter,
                transform: `translateX(${(1 - enter) * -18}px)`,
                display: "flex",
                alignItems: "center",
                gap: 16,
                background: "#ffffff",
                border: `1px solid ${theme.rule}`,
                borderRadius: 14,
                padding: "20px 26px",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: theme.accent,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  fontFamily: theme.sans,
                  fontSize: 26,
                  fontWeight: 600,
                  color: theme.ink,
                }}
              >
                {item}
              </div>
            </div>
          );
        })}
      </div>
    </BeatShell>
  );
};
