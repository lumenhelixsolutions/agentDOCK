import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useCoach } from "@/context/CoachContext";
import HootLogo from "@/lib/hoot-logo";
import { moodFrameInterval, resolveHootMoodFromContext } from "@/lib/hoot-ascii";

type HootMarkProps = {
  size?: number;
};

/** Sidebar ASCII owl mark — same cognitive face as the floating mascot */
export default function HootMark({ size = 44 }: HootMarkProps) {
  const location = useLocation();
  const { hootError, coachOpen, chatLoading, pageContext, topHint } = useCoach();
  const [frame, setFrame] = useState(0);

  const moodContext = useMemo(
    () => ({
      pathname: location.pathname,
      pageContext,
      hasError: Boolean(hootError),
      coachOpen,
      chatLoading,
      topHintTone: topHint?.tone || null,
      hasTopHint: Boolean(topHint),
    }),
    [location.pathname, pageContext, hootError, coachOpen, chatLoading, topHint],
  );

  const mood = resolveHootMoodFromContext(moodContext);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), moodFrameInterval(mood, true));
    return () => clearInterval(id);
  }, [mood]);

  return <HootLogo mood={mood} moodContext={moodContext} size={size} frame={frame} trackMouse={false} />;
}