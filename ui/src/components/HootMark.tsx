import HootLogo from "@/lib/hoot-logo";
import type { HootMood } from "@/lib/hoot-ascii";

type HootMarkProps = {
  size?: number;
  showGlow?: boolean;
  variant?: "app" | "favicon";
  mood?: HootMood;
};

/** Hollow line-art HOOT mark — matches animated mascot */
export default function HootMark({ size = 40, mood = "idle" }: HootMarkProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        filter: "drop-shadow(0 0 14px rgba(124,255,124,0.18))",
      }}
    >
      <HootLogo mood={mood} size={size} frame={0} />
    </div>
  );
}