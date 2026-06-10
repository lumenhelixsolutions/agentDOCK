import { useId, useMemo } from "react";
import type { HootMood } from "./hoot-ascii";
import { moodColor } from "./hoot-ascii";

const LINE = "#E8D9A0";
const LINE_DIM = "rgba(232,217,160,0.45)";

export type HootLogoProps = {
  mood: HootMood;
  size?: number;
  showWordmark?: boolean;
  frame?: number;
  onClick?: () => void;
  className?: string;
};

function eyeGlow(mood: HootMood): string {
  const map: Partial<Record<HootMood, string>> = {
    monitoring: "#4ade80",
    scanning: "#60a5fa",
    alert: "#fb923c",
    error: "#f87171",
    celebrating: "#4ade80",
    launching: "#4ade80",
    thinking: "#a78bfa",
    building: "#f59e0b",
    reading: "#93c5fd",
    logging: "#34d399",
    talking: "#ffb042",
    peeking: "#fcd34d",
    idle: "#4ade80",
  };
  return map[mood] || moodColor(mood);
}

function blinkScale(mood: HootMood, frame: number): number {
  if (mood === "idle" && frame % 24 === 0) return 0.12;
  if (mood === "error" && frame % 4 === 0) return 0.2;
  return 1;
}

function pupilOffset(mood: HootMood, frame: number): { lx: number; ly: number; rx: number; ry: number } {
  if (mood === "thinking") return frame % 3 === 0 ? { lx: -2, ly: 0, rx: 2, ry: 0 } : { lx: 0, ly: 0, rx: 0, ry: 0 };
  if (mood === "alert") return frame % 3 === 1 ? { lx: 0, ly: -1, rx: 0, ry: 1 } : { lx: 0, ly: 0, rx: 0, ry: 0 };
  if (mood === "monitoring" && frame % 4 === 2) return { lx: 0, ly: 0, rx: 0, ry: 0 };
  return { lx: 0, ly: 0, rx: 0, ry: 0 };
}

export default function HootLogo({ mood, size = 72, showWordmark = false, frame = 0, onClick, className }: HootLogoProps) {
  const uid = useId().replace(/:/g, "");
  const glowId = `hoot-glow-${uid}`;
  const glow = eyeGlow(mood);
  const blink = blinkScale(mood, frame);
  const pupil = pupilOffset(mood, frame);
  const pulse = mood === "monitoring" || mood === "scanning" || mood === "logging" ? 0.85 + Math.sin(frame * 0.4) * 0.15 : 1;
  const height = showWordmark ? size * 1.35 : size;

  const moodEyeShape = useMemo(() => {
    if (mood === "error") return frame % 2 === 0 ? "cross" : "wide";
    if (mood === "celebrating") return "happy";
    if (mood === "alert") return "alert";
    if (mood === "reading") return "soft";
    return "normal";
  }, [mood, frame]);

  return (
    <svg
      width={size}
      height={height}
      viewBox={showWordmark ? "0 0 120 150" : "0 0 120 110"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
      className={className}
      style={{ display: "block", cursor: onClick ? "pointer" : undefined, flexShrink: 0 }}
      role="img"
      aria-label="HOOT"
    >
      <defs>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={`eye-core-${uid}`} cx="0.4" cy="0.4" r="0.7">
          <stop offset="0%" stopColor="#FFF3C4" />
          <stop offset="100%" stopColor="#F5C878" />
        </radialGradient>
      </defs>

      {/* Crown / feather lines */}
      <g stroke={LINE} strokeWidth="1.4" strokeLinecap="round" opacity="0.95">
        <path d="M24 18 H96" />
        <path d="M30 12 H90" />
        <path d="M36 6 H84" />
        <path d="M20 24 L30 18 L42 24" />
        <path d="M78 24 L90 18 L100 24" />
        <path d="M26 30 H94" />
      </g>

      {/* Eye rings — left */}
      <g transform={`translate(${42 + pupil.lx}, ${48 + pupil.ly})`}>
        <ellipse cx="0" cy="0" rx="22" ry="20" stroke={LINE} strokeWidth="1.2" opacity="0.7" />
        <ellipse cx="0" cy="0" rx="16" ry="14" stroke={LINE} strokeWidth="1" opacity="0.85" />
        <ellipse cx="0" cy="0" rx="10" ry="9" stroke={LINE} strokeWidth="1.1" />
        <circle cx="0" cy="0" r="7" fill={glow} opacity={0.28 * pulse} filter={`url(#${glowId})`} />
        <circle cx="0" cy="0" r={4 * blink} fill={`url(#eye-core-${uid})`} />
        {moodEyeShape === "cross" && <path d="M-3 -3 L3 3 M3 -3 L-3 3" stroke="#f87171" strokeWidth="1.2" />}
        {moodEyeShape === "happy" && <path d="M-3 1 Q0 4 3 1" stroke={LINE} strokeWidth="1" fill="none" />}
        {moodEyeShape === "alert" && <text x="-2" y="2" fill={glow} fontSize="8" fontFamily="sans-serif">!</text>}
      </g>

      {/* Eye rings — right */}
      <g transform={`translate(${78 + pupil.rx}, ${48 + pupil.ry})`}>
        <ellipse cx="0" cy="0" rx="22" ry="20" stroke={LINE} strokeWidth="1.2" opacity="0.7" />
        <ellipse cx="0" cy="0" rx="16" ry="14" stroke={LINE} strokeWidth="1" opacity="0.85" />
        <ellipse cx="0" cy="0" rx="10" ry="9" stroke={LINE} strokeWidth="1.1" />
        <circle cx="0" cy="0" r="7" fill={glow} opacity={0.28 * pulse} filter={`url(#${glowId})`} />
        <circle cx="0" cy="0" r={4 * blink} fill={`url(#eye-core-${uid})`} />
        {moodEyeShape === "cross" && <path d="M-3 -3 L3 3 M3 -3 L-3 3" stroke="#f87171" strokeWidth="1.2" />}
        {moodEyeShape === "happy" && <path d="M-3 1 Q0 4 3 1" stroke={LINE} strokeWidth="1" fill="none" />}
        {moodEyeShape === "alert" && <text x="-2" y="2" fill={glow} fontSize="8" fontFamily="sans-serif">!</text>}
      </g>

      {/* Lower face geometry */}
      <g stroke={LINE} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M34 72 L60 88 L86 72" />
        <path d="M40 78 H80" />
        <path d="M28 68 L34 72 M92 72 L98 68" />
        <path d="M46 82 L60 94 L74 82" opacity="0.8" />
        <path d="M52 86 H68" stroke={LINE_DIM} />
      </g>

      {(mood === "monitoring" || mood === "scanning" || mood === "logging") && (
        <rect x="10" y="44" width="100" height="2" fill={glow} opacity={0.25 + Math.sin(frame * 0.5) * 0.15} className="hoot-scan-line" />
      )}

      {showWordmark && (
        <text x="60" y="128" textAnchor="middle" fill={LINE} fontSize="18" fontWeight="700" letterSpacing="6" fontFamily="'Segoe UI', system-ui, sans-serif">
          HOOT
        </text>
      )}
    </svg>
  );
}