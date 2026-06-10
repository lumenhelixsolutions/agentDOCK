import HootLogo from "@/lib/hoot-logo";
import type { HootMood } from "@/lib/hoot-ascii";

type HootMarkProps = {
  size?: number;
  mood?: HootMood;
};

/** Sidebar mark — cropped from uploaded artwork */
export default function HootMark({ size = 44, mood = "idle" }: HootMarkProps) {
  return <HootLogo mood={mood} size={size} frame={0} />;
}