import React from "react";
import { useCurrentFrame, interpolate, Img, staticFile } from "remotion";
import { theme } from "../theme";
import { BeatShell } from "./BeatShell";
import type { Beat } from "../lessonScript";

export const ProcessSteps: React.FC<{
  beat: Extract<Beat, { kind: "process-steps" }>;
  durationInFrames: number;
  lessonId: string;
}> = ({ beat, durationInFrames, lessonId }) => {
  const frame = useCurrentFrame();
  const n = beat.steps.length;
  // Reserve the last 20% of the beat so the final step stays on screen.
  const activeSpan = durationInFrames * 0.8;
  const perStep = activeSpan / n;
  const activeIndex = Math.min(n - 1, Math.floor(frame / perStep));
  const hasPhotos = beat.steps.some((s) => s.photo);

  return (
    <BeatShell eyebrow="El ciclo, en orden" caption={beat.narration}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          gap: 20,
        }}
      >
        {hasPhotos && (
          <div
            style={{
              position: "relative",
              flex: 1,
              borderRadius: 20,
              overflow: "hidden",
              background: theme.rule,
            }}
          >
            {beat.steps.map((step, i) => {
              if (!step.photo) return null;
              const localFrame = frame - i * perStep;
              const fade = interpolate(localFrame, [0, 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <Img
                  key={step.label}
                  src={staticFile(`generated/${lessonId}/${step.photo}`)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: i === activeIndex ? fade : 0,
                  }}
                />
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-start" }}>
          {beat.steps.map((step, i) => {
            const isDone = i < activeIndex;
            const isActive = i === activeIndex;
            const localFrame = frame - i * perStep;
            const pop = interpolate(localFrame, [0, 10], [0.7, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <React.Fragment key={step.label}>
                {i > 0 && (
                  <div
                    style={{
                      flex: 1,
                      height: 3,
                      background:
                        isDone || isActive ? theme.accent : theme.rule,
                      marginTop: hasPhotos ? 22 : 44,
                      borderRadius: 3,
                    }}
                  />
                )}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: 190,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: hasPhotos ? 44 : 88,
                      height: hasPhotos ? 44 : 88,
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: theme.serif,
                      fontSize: hasPhotos ? 20 : 34,
                      fontWeight: 700,
                      color: isDone || isActive ? "#fff" : theme.inkMuted,
                      background: isDone || isActive ? theme.accent : "#ffffff",
                      border: `2px solid ${isDone || isActive ? theme.accent : theme.rule}`,
                      transform: `scale(${isActive ? pop : 1})`,
                    }}
                  >
                    {i + 1}
                  </div>
                  {!hasPhotos && (
                    <>
                      <div
                        style={{
                          marginTop: 18,
                          textAlign: "center",
                          fontFamily: theme.sans,
                          fontWeight: 700,
                          fontSize: 21,
                          color: theme.ink,
                        }}
                      >
                        {step.label}
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          textAlign: "center",
                          fontFamily: theme.sans,
                          fontSize: 16,
                          color: theme.inkMuted,
                          lineHeight: 1.35,
                        }}
                      >
                        {step.detail}
                      </div>
                    </>
                  )}
                  {hasPhotos && isActive && (
                    <div
                      style={{
                        marginTop: 10,
                        textAlign: "center",
                        fontFamily: theme.sans,
                        fontWeight: 700,
                        fontSize: 16,
                        color: theme.ink,
                      }}
                    >
                      {step.label}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </BeatShell>
  );
};
