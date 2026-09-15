import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { theme } from "../theme";

export const BeatShell: React.FC<{
  eyebrow: string;
  caption: string;
  children: React.ReactNode;
}> = ({ eyebrow, caption, children }) => {
  const frame = useCurrentFrame();
  const captionOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: theme.bg,
        fontFamily: theme.sans,
        display: "flex",
        flexDirection: "column",
        padding: "72px 96px 56px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontFamily: theme.sans,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: theme.accent,
        }}
      >
        {eyebrow}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {children}
      </div>

      <div
        style={{
          borderTop: `1px solid ${theme.rule}`,
          paddingTop: 24,
          fontFamily: theme.serif,
          fontSize: 30,
          lineHeight: 1.4,
          color: theme.inkMuted,
          opacity: captionOpacity,
          minHeight: 84,
        }}
      >
        {caption}
      </div>
    </div>
  );
};
