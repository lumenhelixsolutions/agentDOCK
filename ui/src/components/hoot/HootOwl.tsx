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
  const px = size === "lg" ? 88 : 56;
  const color = moodColor(mood);
  const scanline = mood === "monitoring" || mood === "scanning" || mood === "logging";

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), moodFrameInterval(mood));
    return () => clearInterval(id);
  }, [mood]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div
        style={{
          position: "relative",
          borderRadius: 14,
          padding: size === "lg" ? "10px 12px" : "6px 8px",
          background: "linear-gradient(160deg, rgba(18,18,22,0.95), rgba(8,8,10,0.88))",
          border: `1px solid ${color}44`,
          boxShadow: `0 0 22px ${color}22, inset 0 1px 0 rgba(255,255,255,0.04)`,
          transition: "border-color 0.35s, box-shadow 0.35s",
          contain: "layout paint",
        }}
      >
        {scanline && (
          <div style={{ pointerEvents: "none", position: "absolute", inset: 0, borderRadius: 14, overflow: "hidden" }}>
            <div
              className="hoot-scan-line"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${color}55, transparent)`,
              }}
            />
          </div>
        )}
        <HootLogo mood={mood} size={px} frame={frame} onClick={onClick} showWordmark={showWordmark && size === "lg"} />
      </div>
      <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.55, color, maxWidth: 120, textAlign: "center" }}>
        {statusLine ? statusLine.slice(0, 32) : moodLabel(mood)}
      </span>
    </div>
  );
}