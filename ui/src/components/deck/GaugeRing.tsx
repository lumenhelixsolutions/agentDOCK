import { type ReactNode } from "react";

/** SVG radial gauge. `value` is the filled fraction (0–1) of the ring. */
export default function GaugeRing({
  size = 120,
  stroke = 8,
  value,
  color,
  glow = false,
  pulse = false,
  children,
}: {
  size?: number;
  stroke?: number;
  value: number;
  color: string;
  glow?: boolean;
  pulse?: boolean;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={pulse ? "animate-pulse" : undefined} style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{
            transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease",
            filter: glow ? `drop-shadow(0 0 ${Math.max(4, stroke)}px ${color}55)` : undefined,
          }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}
