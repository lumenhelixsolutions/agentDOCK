import { useEffect, useState } from "react";
import HootLogo from "@/lib/hoot-logo";
import { moodColor, moodFrameInterval, moodLabel, type HootMood, type HootMoodContext } from "@/lib/hoot-ascii";

export default function HootOwl({
  mood,
  moodContext,
  size = "sm",
  onClick,
  statusLine,
  showWordmark = false,
}: {
  mood: HootMood;
  moodContext?: HootMoodContext;
  size?: "sm" | "lg";
  onClick?: () => void;
  statusLine?: string | null;
  showWordmark?: boolean;
}) {
  const [frame, setFrame] = useState(0);
  const px = size === "lg" ? (showWordmark ? 200 : 96) : 64;
  const color = moodColor(mood);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), moodFrameInterval(mood));
    return () => clearInterval(id);
  }, [mood]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <HootLogo
        mood={mood}
        moodContext={moodContext}
        size={px}
        frame={frame}
        onClick={onClick}
        showWordmark={showWordmark}
        statusLine={statusLine}
        trackMouse={!moodContext}
      />
      {!showWordmark && (
        <span
          style={{
            fontSize: 8,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.45,
            color,
            maxWidth: 120,
            textAlign: "center",
            fontFamily: "'Fira Code', monospace",
          }}
        >
          {statusLine ? statusLine.slice(0, 28) : moodLabel(mood)}
        </span>
      )}
    </div>
  );
}