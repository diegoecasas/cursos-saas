import React from "react";
import { useCurrentFrame, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { BeatShell } from "./BeatShell";
import type { Beat } from "../lessonScript";

export const TimingCompare: React.FC<{
  beat: Extract<Beat, { kind: "timing-compare" }>;
}> = ({ beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stagger = 14;

  return (
    <BeatShell eyebrow='El timing del "¡sí!"' caption={beat.narration}>
      <div style={{ display: "flex", gap: 22 }}>
        {beat.cases.map((c, i) => {
          const enter = spring({
            frame: frame - i * stagger,
            fps,
            config: { damping: 200 },
          });
          const isOk = c.verdict === "ok";
          const emphasis = isOk
            ? spring({
                frame: frame - i * stagger - 14,
                fps,
                config: { damping: 12, stiffness: 90 },
              })
            : 0;

          return (
            <div
              key={c.label}
              style={{
                flex: 1,
                opacity: enter,
                transform: `translateY(${(1 - enter) * 20}px) scale(${1 + emphasis * 0.04})`,
                borderRadius: 18,
                padding: "34px 28px",
                background: isOk ? theme.goodSoft : theme.badSoft,
                border: `2px solid ${isOk ? theme.good : theme.bad}`,
              }}
            >
              <div
                style={{
                  fontFamily: theme.sans,
                  fontSize: 34,
                  marginBottom: 14,
                }}
              >
                {isOk ? "✓" : "✗"}
              </div>
              <div
                style={{
                  fontFamily: theme.sans,
                  fontWeight: 700,
                  fontSize: 24,
                  color: isOk ? theme.good : theme.bad,
                  marginBottom: 8,
                }}
              >
                {c.label}
              </div>
              <div
                style={{
                  fontFamily: theme.sans,
                  fontSize: 18,
                  color: theme.inkMuted,
                }}
              >
                {c.note}
              </div>
            </div>
          );
        })}
      </div>
    </BeatShell>
  );
};
