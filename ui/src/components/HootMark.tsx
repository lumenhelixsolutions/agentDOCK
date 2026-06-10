import { useEffect, useState } from "react";
import HootLogo from "@/lib/hoot-logo";
import { moodFrameInterval, type HootMood } from "@/lib/hoot-ascii";

type HootMarkProps = {
  size?: number;
  mood?: HootMood;
};

/** Sidebar ASCII owl mark */
export default function HootMark({ size = 44, mood = "idle" }: HootMarkProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), moodFrameInterval(mood));
    return () => clearInterval(id);
  }, [mood]);

  return <HootLogo mood={mood} size={size} frame={frame} trackMouse={false} />;
}