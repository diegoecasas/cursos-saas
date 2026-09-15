import React from "react";
import { useCurrentFrame, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { BeatShell } from "./BeatShell";
import type { Beat } from "../lessonScript";

const Column: React.FC<{
  label: string;
  items: string[];
  tone: "good" | "bad";
  delay: number;
}> = ({ label, items, tone, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const color = tone === "good" ? theme.good : theme.bad;
  const soft = tone === "good" ? theme.goodSoft : theme.badSoft;

  return (
    <div
      style={{
        flex: 1,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 20}px)`,
        borderLeft: `4px solid ${color}`,
        background: soft,
        borderRadius: "0 16px 16px 0",
        padding: "28px 30px",
      }}
    >
      <div
        style={{
          fontFamily: theme.sans,
          fontWeight: 700,
          fontSize: 26,
          color,
          marginBottom: 16,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((item) => (
          <div
            key={item}
            style={{
              fontFamily: theme.sans,
              fontSize: 19,
              color: theme.ink,
              lineHeight: 1.4,
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

export const DoDont: React.FC<{
  beat: Extract<Beat, { kind: "do-dont" }>;
}> = ({ beat }) => {
  return (
    <BeatShell eyebrow="Si hay un accidente" caption={beat.narration}>
      <div style={{ display: "flex", gap: 24 }}>
        <Column label="Sí" items={beat.do} tone="good" delay={0} />
        <Column label="No" items={beat.dont} tone="bad" delay={8} />
      </div>
    </BeatShell>
  );
};
