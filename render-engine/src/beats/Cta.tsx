import React from "react";
import { useCurrentFrame, spring, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { BeatShell } from "./BeatShell";
import { MediaBackdrop } from "./MediaBackdrop";
import type { Beat } from "../lessonScript";

const TaskList: React.FC<{ tasks: string[]; light: boolean }> = ({
  tasks,
  light,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stagger = 8;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {tasks.map((task, i) => {
        const enter = spring({
          frame: frame - i * stagger,
          fps,
          config: { damping: 200 },
        });
        return (
          <div
            key={task}
            style={{
              opacity: enter,
              transform: `translateX(${(1 - enter) * -16}px)`,
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: `2px solid ${light ? "#ffffff" : theme.accent}`,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontFamily: theme.serif,
                fontSize: 28,
                color: light ? "#ffffff" : theme.ink,
                textShadow: light ? "0 2px 16px rgba(0,0,0,0.5)" : "none",
              }}
            >
              {task}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Cta: React.FC<{
  beat: Extract<Beat, { kind: "cta" }>;
  lessonId: string;
}> = ({ beat, lessonId }) => {
  if (beat.media) {
    return (
      <MediaBackdrop lessonId={lessonId} media={beat.media}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: "72px 96px 56px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              fontFamily: theme.sans,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#f0d9b8",
              marginBottom: 28,
            }}
          >
            Tu tarea, hoy mismo
          </div>
          <TaskList tasks={beat.tasks} light />
        </div>
      </MediaBackdrop>
    );
  }

  return (
    <BeatShell eyebrow="Tu tarea, hoy mismo" caption={beat.narration}>
      <TaskList tasks={beat.tasks} light={false} />
    </BeatShell>
  );
};
