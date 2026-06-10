import { useId, useMemo } from "react";
import type { HootMood } from "./hoot-ascii";
import { moodColor } from "./hoot-ascii";
import { BRAND } from "./brand";

const LINE = "#E8D5A3";
const LINE_DIM = "rgba(232,213,163,0.42)";
const PUPIL = "#FFF176";

export type HootLogoProps = {
  mood: HootMood;
  size?: number;
  showWordmark?: boolean;
  showSubtitle?: boolean;
  frame?: number;
  onClick?: () => void;
  className?: string;
};

function eyeGlow(mood: HootMood): string {
  const map: Partial<Record<HootMood, string>> = {
    idle: "#7CFF7C",
    monitoring: "#7CFF7C",
    logging: "#7CFF7C",
    scanning: "#60a5fa",
    alert: "#fb923c",
    error: "#f87171",
    celebrating: "#7CFF7C",
    launching: "#4ade80",
    thinking: "#a78bfa",
    building: "#f59e0b",
    reading: "#93c5fd",
    talking: "#ffb042",
    peeking: "#fcd34d",
  };
  return map[mood] || moodColor(mood);
}

function blinkScale(mood: HootMood, frame: number): number {
  if (mood === "idle" && frame % 28 === 0) return 0.08;
  if (mood === "error" && frame % 4 === 0) return 0.15;
  return 1;
}

function pupilOffset(mood: HootMood, frame: number) {
  if (mood === "thinking") return frame % 3 === 0 ? { lx: -1.5, ly: 0, rx: 1.5, ry: 0 } : { lx: 0, ly: 0, rx: 0, ry: 0 };
  if (mood === "alert") return frame % 3 === 1 ? { lx: 0, ly: -1, rx: 0, ry: 1 } : { lx: 0, ly: 0, rx: 0, ry: 0 };
  return { lx: 0, ly: 0, rx: 0, ry: 0 };
}

function Eye({
  uid,
  glowId,
  cx,
  cy,
  glow,
  pulse,
  blink,
  moodEyeShape,
}: {
  uid: string;
  glowId: string;
  cx: number;
  cy: number;
  glow: string;
  pulse: number;
  blink: number;
  moodEyeShape: string;
}) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle cx="0" cy="0" r="28" stroke={LINE} strokeWidth="1.2" strokeDasharray="5 4" fill="none" opacity="0.85" />
      <circle cx="0" cy="0" r="18" stroke={LINE} strokeWidth="1.1" fill="none" />
      <circle cx="0" cy="0" r="11" fill={glow} opacity={0.22 * pulse} filter={`url(#${glowId})`} />
      <circle cx="0" cy="0" r="7" fill={glow} opacity={0.45 * pulse} filter={`url(#${glowId})`} />
      <circle cx="0" cy="0" r={4.5 * blink} fill={PUPIL} />
      {moodEyeShape === "cross" && <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#f87171" strokeWidth="1.4" />}
      {moodEyeShape === "happy" && <path d="M-4 2 Q0 5 4 2" stroke={LINE} strokeWidth="1.2" fill="none" />}
      {moodEyeShape === "alert" && <text x="-2" y="3" fill={glow} fontSize="10" fontWeight="700" fontFamily="sans-serif">!</text>}
      {moodEyeShape === "soft" && <path d="M-4 1 Q0 3 4 1" stroke={LINE_DIM} strokeWidth="1" fill="none" />}
    </g>
  );
}

export default function HootLogo({
  mood,
  size = 72,
  showWordmark = false,
  showSubtitle = true,
  frame = 0,
  onClick,
  className,
}: HootLogoProps) {
  const uid = useId().replace(/:/g, "");
  const glowId = `hoot-glow-${uid}`;
  const glow = eyeGlow(mood);
  const blink = blinkScale(mood, frame);
  const pupil = pupilOffset(mood, frame);
  const pulse =
    mood === "monitoring" || mood === "scanning" || mood === "logging" || mood === "idle"
      ? 0.88 + Math.sin(frame * 0.35) * 0.12
      : 1;
  const vbH = showWordmark ? 280 : 200;
  const height = (size * vbH) / 200;

  const moodEyeShape = useMemo(() => {
    if (mood === "error") return frame % 2 === 0 ? "cross" : "normal";
    if (mood === "celebrating") return "happy";
    if (mood === "alert") return "alert";
    if (mood === "reading") return "soft";
    return "normal";
  }, [mood, frame]);

  const mouthCurve = mood === "talking" ? (frame % 2 === 0 ? "M78 168 Q100 174 122 168" : "M78 168 Q100 178 122 168") : "M78 168 Q100 172 122 168";

  return (
    <svg
      width={size}
      height={height}
      viewBox={`0 0 200 ${vbH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
      className={className}
      style={{ display: "block", cursor: onClick ? "pointer" : undefined, flexShrink: 0 }}
      role="img"
      aria-label="HOOT"
    >
      <defs>
        <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Crown / ear tufts */}
      <g stroke={LINE} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
        <path d="M52 38 H148" />
        <path d="M58 30 H142" />
        <path d="M64 22 H136" />
        <path d="M70 14 H130" />
        <path d="M44 44 L58 30 L72 44" />
        <path d="M128 44 L142 30 L156 44" />
        <path d="M48 50 H152" />
      </g>

      <Eye uid={uid} glowId={glowId} cx={72 + pupil.lx} cy={82 + pupil.ly} glow={glow} pulse={pulse} blink={blink} moodEyeShape={moodEyeShape} />
      <Eye uid={uid} glowId={glowId} cx={128 + pupil.rx} cy={82 + pupil.ry} glow={glow} pulse={pulse} blink={blink} moodEyeShape={moodEyeShape} />

      {/* Beak */}
      <path d="M94 108 L100 118 L106 108" stroke={LINE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />

      {/* Hollow body outline */}
      <g stroke={LINE} strokeWidth="1.25" strokeLinecap="round">
        <path d="M56 124 L56 158" strokeDasharray="4 5" />
        <path d="M144 124 L144 158" strokeDasharray="4 5" />
        <path d="M62 124 Q100 132 138 124" fill="none" />
        <path d="M68 148 Q100 156 132 148" fill="none" opacity="0.75" />
      </g>

      {/* Expressive feet / mouth detail */}
      <g stroke={LINE} strokeWidth="1.2" strokeLinecap="round" fill="none">
        <path d={mouthCurve} />
        <path d="M72 182 Q76 186 80 182" />
        <path d="M120 182 Q124 186 128 182" />
        <path d="M88 184 H112" opacity="0.7" />
      </g>

      {(mood === "monitoring" || mood === "scanning" || mood === "logging") && (
        <rect x="20" y="70" width="160" height="1.5" fill={glow} opacity={0.2 + Math.sin(frame * 0.5) * 0.12} className="hoot-scan-line" />
      )}

      {showWordmark && (
        <>
          <text
            x="100"
            y="228"
            textAnchor="middle"
            fill={LINE}
            fontSize="34"
            fontWeight="700"
            letterSpacing="10"
            fontFamily="'Segoe UI', 'Inter', system-ui, sans-serif"
          >
            HOOT
          </text>
          {showSubtitle && (
            <text
              x="100"
              y="256"
              textAnchor="middle"
              fill="rgba(220,215,200,0.72)"
              fontSize="9.5"
              fontWeight="500"
              letterSpacing="3.2"
              fontFamily="'Segoe UI', 'Inter', system-ui, sans-serif"
            >
              {BRAND.subtitle.toUpperCase()}
            </text>
          )}
        </>
      )}
    </svg>
  );
}