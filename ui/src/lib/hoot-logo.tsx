import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  asciiMotionClass,
  computePupilOffset,
  eyeGlowColor,
  isEyeGlowChar,
  moodColor,
  moodFrameInterval,
  renderBrandLines,
  renderCompactLines,
  type HootMood,
  type HootMoodContext,
  type PupilOffset,
} from "./hoot-ascii";

const LINE_COLOR = "#E8D5A3";
const DIM_COLOR = "rgba(232,213,163,0.55)";

export type HootLogoProps = {
  mood: HootMood;
  moodContext?: HootMoodContext;
  size?: number;
  showWordmark?: boolean;
  showSubtitle?: boolean;
  frame?: number;
  statusLine?: string | null;
  onClick?: () => void;
  className?: string;
  trackMouse?: boolean;
};

const ZERO_OFFSET: PupilOffset = { lx: 0, ly: 0, rx: 0, ry: 0 };

function colorizeLine(line: string, mood: HootMood, frame: number, isWordmarkLine: boolean): ReactNode[] {
  const glow = eyeGlowColor(mood);
  const pulse = 0.75 + Math.sin(frame * 0.4) * 0.25;
  let inEyes = false;

  return line.split("").map((ch, i) => {
    if (ch === "(") inEyes = true;
    const isEye = inEyes && isEyeGlowChar(ch);
    if (ch === ")") inEyes = false;

    let color = LINE_COLOR;
    let shadow: string | undefined;
    let weight: number | undefined;

    if (isEye) {
      color = glow;
      shadow = `0 0 ${6 + pulse * 6}px ${glow}, 0 0 2px #FFF176`;
      weight = 600;
    } else if (ch === "@") {
      color = "#FFF176";
      shadow = `0 0 ${8 + pulse * 8}px #ffb042, 0 0 3px #FFF176`;
      weight = 700;
    } else if (isWordmarkLine) {
      color = LINE_COLOR;
      weight = 700;
    } else if (ch === "~" || ch === "=" || ch === ">") {
      color = glow;
    } else if (ch === " ") {
      color = "transparent";
    } else if (/[|_\\/\\^]/.test(ch)) {
      color = DIM_COLOR;
    }

    return (
      <span
        key={`${i}-${ch}`}
        style={{
          color: ch === " " ? "transparent" : color,
          textShadow: shadow,
          fontWeight: weight,
        }}
      >
        {ch === " " ? "\u00a0" : ch}
      </span>
    );
  });
}

function AsciiBlock({
  lines,
  mood,
  frame,
  fontSize,
  wordmarkStart,
}: {
  lines: string[];
  mood: HootMood;
  frame: number;
  fontSize: number;
  wordmarkStart: number;
}) {
  return (
    <>
      {lines.map((line, row) => (
        <div key={row} className="hoot-ascii-line" aria-hidden={row >= wordmarkStart}>
          {colorizeLine(line, mood, frame, row >= wordmarkStart)}
        </div>
      ))}
    </>
  );
}

/** ASCII HOOT logo — frame sprites, per-char eye glow, optional mouse tracking */
export default function HootLogo({
  mood,
  moodContext,
  size = 72,
  showWordmark = false,
  frame: frameProp,
  statusLine,
  onClick,
  className,
  trackMouse = true,
}: HootLogoProps) {
  const ref = useRef<HTMLButtonElement | HTMLDivElement>(null);
  const [frameInternal, setFrameInternal] = useState(0);
  const [offset, setOffset] = useState<PupilOffset>(ZERO_OFFSET);

  const frame = frameProp ?? frameInternal;
  const lines = showWordmark
    ? renderBrandLines(mood, offset, frame)
    : renderCompactLines(mood, offset, frame, statusLine, moodContext);

  const lineCount = lines.length;
  const fontSize = showWordmark ? size / (lineCount + 1) : size / (lineCount + 0.5);
  const wordmarkStart = showWordmark ? lineCount - 2 : lineCount;

  useEffect(() => {
    if (frameProp !== undefined) return;
    const id = setInterval(() => setFrameInternal((f) => f + 1), moodFrameInterval(mood));
    return () => clearInterval(id);
  }, [frameProp, mood]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!trackMouse || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      setOffset(
        computePupilOffset(e.clientX, e.clientY, rect.left + rect.width / 2, rect.top + rect.height * 0.35),
      );
    },
    [trackMouse],
  );

  const onMouseLeave = useCallback(() => setOffset(ZERO_OFFSET), []);

  const style: CSSProperties = {
    margin: 0,
    padding: showWordmark ? "10px 12px" : "4px 6px",
    border: "none",
    background: showWordmark ? "rgba(18,18,18,0.92)" : "transparent",
    borderRadius: showWordmark ? 12 : 8,
    cursor: onClick ? "pointer" : "default",
    fontFamily: "'Fira Code', 'Cascadia Mono', 'Consolas', monospace",
    fontSize,
    lineHeight: 1.15,
    letterSpacing: "0.02em",
    color: moodColor(mood),
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
    boxShadow: showWordmark ? "inset 0 0 0 1px rgba(232,213,163,0.08)" : undefined,
  };

  const motionClass = asciiMotionClass(mood);
  const hasEmit = Boolean(moodContext && lines.length >= 5 && lines[lines.length - 2]?.trim());
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      ref={ref as never}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={[className, "hoot-ascii", motionClass, hasEmit ? "hoot-ascii--emit" : ""].filter(Boolean).join(" ")}
      style={style}
      aria-label="HOOT"
    >
      {(mood === "scanning" || mood === "syncing" || mood === "monitoring" || mood === "watchful" || mood === "logging") && !showWordmark && (
        <span className="hoot-ascii-scan" aria-hidden />
      )}
      <AsciiBlock lines={lines} mood={mood} frame={frame} fontSize={fontSize} wordmarkStart={wordmarkStart} />
    </Tag>
  );
}