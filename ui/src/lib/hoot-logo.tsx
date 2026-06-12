import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import HootContextMenu, { type HootMenuState } from "@/components/hoot/HootContextMenu";
import {
  asciiMotionClass,
  computePupilOffset,
  eyeGlowColor,
  isEyeGlowChar,
  moodColor,
  moodFrameInterval,
  renderBrandLines,
  renderCompactLines,
  renderGrandLines,
  BEAK_GLYPH_COL,
  BROW_L_COL,
  BROW_R_COL,
  EYE_L_COL,
  EYE_R_COL,
  GRAND_CENTER_COL,
  GRAND_EYE_L_COL,
  GRAND_EYE_R_COL,
  GRAND_FACE_ROWS,
  GRAND_TICK_MS,
  GRAND_WIDTH,
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
  variant?: "compact" | "grand";
};

const ZERO_OFFSET: PupilOffset = { lx: 0, ly: 0, rx: 0, ry: 0 };

function colorizeLine(
  line: string,
  mood: HootMood,
  frame: number,
  row: number,
  isWordmarkLine: boolean,
  fixedCells: boolean,
  isGrand: boolean,
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
    } else if (ch === "@" || ch === "?" || ch === ">" || ch === "~" || ch === "=" || ch === "◎" || ch === "◆" || ch === "★") {
      const phaseHue =
        ch === "@" ? "#FFF176" : ch === "?" ? "#c4b5fd" : ch === ">" ? "#4ade80" : ch === "~" ? "#93c5fd" : ch === "◆" ? "#4ade80" : ch === "★" ? "#fcd34d" : "#f59e0b";
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

    const isEyeGlyph = isGrand
      ? row === 2 && (i === GRAND_EYE_L_COL || i === GRAND_EYE_R_COL) && isEyeGlowChar(ch)
      : row === 1 && (i === EYE_L_COL || i === EYE_R_COL) && isEyeGlowChar(ch);
    const isCascadeFlank =
      !isGrand && row === 0 && (i === BROW_L_COL || i === BROW_R_COL) && ch !== "_" && ch !== "·" && ch !== " ";
    const isCascadeCenter = !isGrand && row === 0 && i === THIRD_EYE_COL && ch !== "_" && ch !== "·" && ch !== " ";
    const isBeakEmit = isGrand
      ? row === 3 && i === GRAND_CENTER_COL && ch !== "▽" && ch !== "·" && ch !== " "
      : row === 2 && i === BEAK_GLYPH_COL && ch !== "▽" && ch !== "·" && ch !== " ";
    const isSpineEmit =
      isGrand &&
      ((row === 1 && i === GRAND_CENTER_COL) || (row === 2 && i === GRAND_CENTER_COL) || row >= 6) &&
      ch !== " " &&
      ch !== "_" &&
      ch !== "=" &&
      ch !== "v" &&
      ch !== "V";

    return (
      <span
        key={`${row}-${i}`}
        className={[
          fixedCells ? "hoot-ascii-cell" : undefined,
          isEyeGlyph ? "hoot-ascii-eye-glyph" : undefined,
          isCascadeFlank ? "hoot-ascii-emit-glyph" : undefined,
          isCascadeCenter ? "hoot-ascii-cascade-center hoot-ascii-emit-glyph" : undefined,
          isBeakEmit || isSpineEmit ? "hoot-ascii-beak-emit hoot-ascii-emit-glyph" : undefined,
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
  isGrand,
}: {
  lines: string[];
  mood: HootMood;
  frame: number;
  wordmarkStart: number;
  fixedCells: boolean;
  isGrand: boolean;
}) {
  return (
    <>
      {lines.map((line, row) => (
        <div key={row} className="hoot-ascii-line" aria-hidden={row >= wordmarkStart}>
          {colorizeLine(line, mood, frame, row, row >= wordmarkStart, fixedCells, isGrand)}
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
  variant = "compact",
}: HootLogoProps) {
  const ref = useRef<HTMLButtonElement | HTMLDivElement>(null);
  const [frameInternal, setFrameInternal] = useState(0);
  const [offset, setOffset] = useState<PupilOffset>(ZERO_OFFSET);
  const [menu, setMenu] = useState<HootMenuState | null>(null);
  const [paused, setPaused] = useState(false);
  const [variantPref, setVariantPref] = useState<"compact" | "grand" | null>(() => {
    try {
      const v = localStorage.getItem("hoot-face-variant");
      return v === "grand" || v === "compact" ? v : null;
    } catch {
      return null;
    }
  });
  const frozenFrame = useRef(0);

  const liveFrame = frameProp ?? frameInternal;
  if (!paused) frozenFrame.current = liveFrame;
  const frame = paused ? frozenFrame.current : liveFrame;
  const effectiveVariant = variantPref ?? variant;
  const isGrand = effectiveVariant === "grand" && !showWordmark && Boolean(moodContext);

  const allLines = showWordmark
    ? renderBrandLines(mood, offset, frame)
    : isGrand
      ? renderGrandLines(moodContext!, frame, statusLine)
      : renderCompactLines(mood, offset, frame, statusLine, moodContext);

  const faceRowCount = isGrand ? GRAND_FACE_ROWS : HOOT_FACE_ROWS;
  const faceLines = showWordmark ? allLines : allLines.slice(0, faceRowCount);
  const captionLine = !showWordmark && allLines.length > faceRowCount ? allLines[faceRowCount] : null;
  const lines = showWordmark ? allLines : faceLines;

  const lineCount = showWordmark ? allLines.length : faceRowCount;
  const fontSize = showWordmark ? size / (lineCount + 1) : size / (lineCount - 0.05);
  const wordmarkStart = showWordmark ? allLines.length - 2 : faceRowCount;
  const gridWidth = isGrand ? GRAND_WIDTH : WIDTH;

  useEffect(() => {
    if (frameProp !== undefined || paused) return;
    const cognitive = !showWordmark && !isGrand;
    const ms = isGrand ? GRAND_TICK_MS : moodFrameInterval(mood, cognitive);
    const id = setInterval(() => setFrameInternal((f) => f + 1), ms);
    return () => clearInterval(id);
  }, [frameProp, mood, showWordmark, isGrand, paused]);

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

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (showWordmark) return;
      e.preventDefault();
      e.stopPropagation();
      setMenu({ x: e.clientX, y: e.clientY });
    },
    [showWordmark],
  );

  const toggleVariant = useCallback(() => {
    const next = effectiveVariant === "grand" ? "compact" : "grand";
    setVariantPref(next);
    try {
      localStorage.setItem("hoot-face-variant", next);
    } catch {
      /* storage unavailable */
    }
  }, [effectiveVariant]);

  const copySnapshot = useCallback(() => {
    navigator.clipboard?.writeText(allLines.join("\n")).catch(() => {});
  }, [allLines]);

  const copyStatus = useCallback(() => {
    const report = `HOOT ${effectiveVariant} face · mood: ${mood}` + (statusLine ? ` · ${statusLine}` : "");
    navigator.clipboard?.writeText(report).catch(() => {});
  }, [effectiveVariant, mood, statusLine]);

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
  const beakRow = faceLines[isGrand ? 3 : 2] ?? "";
  const beakCol = isGrand ? GRAND_CENTER_COL : BEAK_GLYPH_COL;
  const beakGlyph = beakRow[beakCol] ?? "";
  const hasEmit = Boolean(!showWordmark && beakGlyph && beakGlyph !== "▽" && beakGlyph !== "·");
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      ref={ref as never}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onContextMenu={onContextMenu}
      className={[className, "hoot-ascii", motionClass, hasEmit ? "hoot-ascii--emit" : ""].filter(Boolean).join(" ")}
      style={style}
      aria-label="HOOT"
    >
      {(mood === "scanning" || mood === "syncing" || mood === "monitoring" || mood === "watchful" || mood === "logging") &&
        !showWordmark && <span className="hoot-ascii-scan" aria-hidden />}
      <div
        className="hoot-ascii-face-grid"
        style={{ width: `${gridWidth}ch`, minWidth: `${gridWidth}ch`, fontSize, lineHeight: 1 }}
      >
        <AsciiBlock
          lines={lines}
          mood={mood}
          frame={frame}
          wordmarkStart={wordmarkStart}
          fixedCells={!showWordmark}
          isGrand={isGrand}
        />
      </div>
      {menu && (
        <HootContextMenu
          menu={menu}
          paused={paused}
          variant={effectiveVariant}
          onClose={() => setMenu(null)}
          onTogglePause={() => setPaused((v) => !v)}
          onToggleVariant={toggleVariant}
          onCopySnapshot={copySnapshot}
          onCopyStatus={copyStatus}
        />
      )}
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