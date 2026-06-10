import { useEffect, useState } from "react";
import HootLogo from "@/lib/hoot-logo";
import { moodColor, moodFrameInterval, moodLabel, type HootMood } from "@/lib/hoot-ascii";

export default function HootOwl({
  mood,
  size = "sm",
  onClick,
  statusLine,
  showWordmark = false,
}: {
  mood: HootMood;
  size?: "sm" | "lg";
  onClick?: () => void;
  statusLine?: string | null;
  showWordmark?: boolean;
}) {
  const [frame, setFrame] = useState(0);
  const px = size === "lg" ? (showWordmark ? 120 : 96) : 64;
  const color = moodColor(mood);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), moodFrameInterval(mood));
    return () => clearInterval(id);
  }, [mood]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <HootLogo mood={mood} size={px} frame={frame} onClick={onClick} showWordmark={showWordmark} showSubtitle={size === "lg"} />
      {!showWordmark && (
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            opacity: 0.55,
            color,
            maxWidth: 140,
            textAlign: "center",
          }}
        >
          {statusLine ? statusLine.slice(0, 32) : moodLabel(mood)}
        </span>
      )}
    </div>
  );
}