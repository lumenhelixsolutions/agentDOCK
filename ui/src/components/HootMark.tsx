import { useId } from "react";
import { BRAND_COLORS } from "@/lib/brand";

type HootMarkProps = {
  size?: number;
  showGlow?: boolean;
  variant?: "app" | "favicon";
};

/** Custom HOOT owl mark — sidebar, launcher, favicon source */
export default function HootMark({ size = 40, showGlow = true, variant = "app" }: HootMarkProps) {
  const uid = useId().replace(/:/g, "");
  const shell = `hoot-shell-${uid}`;
  const face = `hoot-face-${uid}`;
  const eye = `hoot-eye-${uid}`;
  const ring = `hoot-ring-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      role="img"
      style={{ display: "block", flexShrink: 0, filter: showGlow ? `drop-shadow(0 8px 18px ${BRAND_COLORS.glow})` : undefined }}
    >
      <defs>
        <linearGradient id={shell} x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffe2a8" />
          <stop offset="0.45" stopColor={BRAND_COLORS.goldLight} />
          <stop offset="1" stopColor={BRAND_COLORS.goldDark} />
        </linearGradient>
        <radialGradient id={face} cx="24" cy="25" r="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1c1712" />
          <stop offset="1" stopColor={BRAND_COLORS.ink} />
        </radialGradient>
        <radialGradient id={eye} cx="0.35" cy="0.35" r="0.75">
          <stop stopColor="#ffd89a" />
          <stop offset="1" stopColor={BRAND_COLORS.gold} />
        </radialGradient>
        <linearGradient id={ring} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgba(255,255,255,0.55)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {variant === "app" && (
        <rect x="3.5" y="3.5" width="41" height="41" rx="14" fill="rgba(255,176,66,0.12)" stroke="rgba(255,176,66,0.22)" strokeWidth="1" />
      )}

      <rect x="5" y="5" width="38" height="38" rx="13" fill={`url(#${shell})`} />
      <rect x="5.5" y="5.5" width="37" height="18" rx="12" fill={`url(#${ring})`} opacity="0.55" />

      <path
        d="M13.5 17.5 L17 10.5 L20.5 17.2 M27.5 17.2 L31 10.5 L34.5 17.5"
        stroke={BRAND_COLORS.ink}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.88"
      />

      <ellipse cx="24" cy="26.5" rx="12.5" ry="11.5" fill={`url(#${face})`} />
      <path d="M11.5 28.5 Q24 37 36.5 28.5" stroke="rgba(255,176,66,0.18)" strokeWidth="1.2" fill="none" />

      <circle cx="18.2" cy="25.8" r="3.35" fill={`url(#${eye})`} />
      <circle cx="29.8" cy="25.8" r="3.35" fill={`url(#${eye})`} />
      <circle cx="18.55" cy="26.05" r="1.35" fill={BRAND_COLORS.ink} />
      <circle cx="30.15" cy="26.05" r="1.35" fill={BRAND_COLORS.ink} />
      <circle cx="17.55" cy="24.75" r="0.55" fill="rgba(255,255,255,0.72)" />
      <circle cx="29.15" cy="24.75" r="0.55" fill="rgba(255,255,255,0.72)" />

      <path d="M24 29.2 L20.8 33.2 H27.2 Z" fill={BRAND_COLORS.goldMid} stroke={BRAND_COLORS.goldDark} strokeWidth="0.6" strokeLinejoin="round" />

      {variant === "app" && (
        <>
          <path d="M8.5 31.5 Q24 40.5 39.5 31.5" stroke="rgba(10,10,10,0.28)" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M14 34.5 Q24 38.5 34 34.5" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}