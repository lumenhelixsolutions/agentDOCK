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
  BEAK_GLYPH_COL,
  BROW_L_COL,
  BROW_R_COL,
  HOOT_FACE_ROWS,
  THIRD_EYE_COL,
  WIDTH,
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

function colorizeLine(
  line: string,
  mood: HootMood,
  frame: number,
  row: number,
  isWordmarkLine: boolean,
  fixedCells: boolean,
): ReactNode[] {
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
    } else if (ch === "@" || ch === "?" || ch === ">" || ch === "~" || ch === "=" || ch === "◎") {
      const phaseHue =
        ch === "@" ? "#FFF176" : ch === "?" ? "#c4b5fd" : ch === ">" ? "#4ade80" : ch === "~" ? "#93c5fd" : "#f59e0b";
      color = phaseHue;
      shadow = `0 0 ${6 + pulse * 6}px ${phaseHue}, 0 0 2px ${phaseHue}`;
      weight = 700;
    } else if (isWordmarkLine) {
      color = LINE_COLOR;
      weight = 700;
    } else if (ch === "▽" || ch === "v") {
      color = "#ffb042";
      weight = 600;
    } else if (ch === " ") {
      color = "transparent";
    } else if (/[|_\\/\\^]/.test(ch)) {
      color = DIM_COLOR;
    }

    const isCascadeGlyph =
      (row === 0 && (i === BROW_L_COL || i === THIRD_EYE_COL || i === BROW_R_COL) && ch !== "_" && ch !== "·" && ch !== " ") ||
      (row === 2 && i === BEAK_GLYPH_COL && ch !== "▽" && ch !== "·" && ch !== " ");

    return (
      <span
        key={`${row}-${i}`}
        className={[
          fixedCells ? "hoot-ascii-cell" : undefined,
          isCascadeGlyph ? "hoot-ascii-emit-glyph" : undefined,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          color: ch === " " ? "transparent" : color,
          textShadow: shadow,
          fontWeight: weight ?? (fixedCells ? 500 : undefined),
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
  wordmarkStart,
  fixedCells,
}: {
  lines: string[];
  mood: HootMood;
  frame: number;
  wordmarkStart: number;
  fixedCells: boolean;
}) {
  return (
    <>
      {lines.map((line, row) => (
        <div key={row} className="hoot-ascii-line" aria-hidden={row >= wordmarkStart}>
          {colorizeLine(line, mood, frame, row, row >= wordmarkStart, fixedCells)}
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
  const allLines = showWordmark
    ? renderBrandLines(mood, offset, frame)
    : renderCompactLines(mood, offset, frame, statusLine, moodContext);

  const faceLines = showWordmark ? allLines : allLines.slice(0, HOOT_FACE_ROWS);
  const captionLine = !showWordmark && allLines.length > HOOT_FACE_ROWS ? allLines[HOOT_FACE_ROWS] : null;
  const lines = showWordmark ? allLines : faceLines;

  const lineCount = showWordmark ? allLines.length : HOOT_FACE_ROWS;
  const fontSize = showWordmark ? size / (lineCount + 1) : size / (HOOT_FACE_ROWS - 0.05);
  const wordmarkStart = showWordmark ? allLines.length - 2 : HOOT_FACE_ROWS;

  useEffect(() => {
    if (frameProp !== undefined) return;
    const cognitive = !showWordmark;
    const id = setInterval(() => setFrameInternal((f) => f + 1), moodFrameInterval(mood, cognitive));
    return () => clearInterval(id);
  }, [frameProp, mood, showWordmark]);

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
    padding: showWordmark ? "10px 12px" : "2px 4px",
    border: "none",
    background: showWordmark ? "rgba(18,18,18,0.92)" : "transparent",
    borderRadius: showWordmark ? 12 : 8,
    cursor: onClick ? "pointer" : "default",
    fontFamily: "'Fira Code', 'Cascadia Mono', 'Consolas', monospace",
    fontSize,
    lineHeight: 1,
    letterSpacing: 0,
    color: moodColor(mood),
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
    boxShadow: showWordmark ? "inset 0 0 0 1px rgba(232,213,163,0.08)" : undefined,
  };

  const motionClass = showWordmark ? asciiMotionClass(mood) : "hoot-ascii--cognitive";
  const beakRow = faceLines[2] ?? "";
  const beakGlyph = beakRow[BEAK_GLYPH_COL] ?? "";
  const hasEmit = Boolean(!showWordmark && beakGlyph && beakGlyph !== "▽" && beakGlyph !== "·");
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
      <div
        className="hoot-ascii-face-grid"
        style={{ width: `${WIDTH}ch`, minWidth: `${WIDTH}ch`, fontSize, lineHeight: 1 }}
      >
        <AsciiBlock
          lines={lines}
          mood={mood}
          frame={frame}
          wordmarkStart={wordmarkStart}
          fixedCells={!showWordmark}
        />
      </div>
      {captionLine && (
        <div
          className="hoot-ascii-caption"
          style={{ fontSize: Math.max(7, fontSize * 0.58), lineHeight: 1.1, marginTop: 2, opacity: 0.5 }}
          aria-hidden
        >
          {captionLine.trim()}
        </div>
      )}
    </Tag>
  );
}