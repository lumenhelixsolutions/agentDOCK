import HootLogo from "@/lib/hoot-logo";
import type { HootMood } from "@/lib/hoot-ascii";

type HootMarkProps = {
  size?: number;
  showGlow?: boolean;
  variant?: "app" | "favicon";
  mood?: HootMood;
};

/** Geometric HOOT owl mark — matches animated mascot */
export default function HootMark({ size = 40, mood = "idle" }: HootMarkProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        filter: "drop-shadow(0 4px 12px rgba(255,176,66,0.2))",
      }}
    >
      <HootLogo mood={mood} size={size} frame={0} />
    </div>
  );
}