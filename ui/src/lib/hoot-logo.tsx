import type { CSSProperties } from "react";
import type { HootMood } from "./hoot-ascii";

/** User artwork — cropped from uploads for pixel-faithful display */
export const HOOT_BRAND_SRC = "/hoot-brand.png";
export const HOOT_OWL_SRC = "/hoot-owl-mark.png";
export const HOOT_WORDMARK_SRC = "/hoot-wordmark.png";

const BRAND_ASPECT = 704 / 501;
const OWL_ASPECT = 737 / 1024;
const WORDMARK_ASPECT = 249 / 501;

export type HootLogoProps = {
  mood: HootMood;
  size?: number;
  showWordmark?: boolean;
  showSubtitle?: boolean;
  frame?: number;
  onClick?: () => void;
  className?: string;
};

function moodMotion(mood: HootMood, frame: number): CSSProperties {
  const breathe =
    mood === "idle" || mood === "monitoring" || mood === "logging" || mood === "scanning";
  const style: CSSProperties = {};

  if (breathe) {
    style.opacity = 0.94 + Math.sin(frame * 0.28) * 0.06;
  }

  if (mood === "celebrating") {
    style.transform = `scale(${1 + Math.sin(frame * 0.7) * 0.035})`;
  } else if (mood === "error") {
    style.transform = `translateX(${Math.sin(frame * 1.4) * 1.5}px)`;
  } else if (mood === "launching") {
    style.transform = `translateY(${Math.sin(frame * 0.9) * -2}px)`;
  }

  return style;
}

function ImgButton({
  src,
  alt,
  width,
  height,
  mood,
  frame,
  onClick,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  mood: HootMood;
  frame: number;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={className}
      style={{
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: onClick ? "pointer" : "default",
        display: "block",
        lineHeight: 0,
        ...moodMotion(mood, frame),
      }}
      aria-label={onClick ? "HOOT" : undefined}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        style={{ display: "block", width, height: "auto" }}
        draggable={false}
      />
    </Tag>
  );
}

/** Renders uploaded HOOT artwork — no SVG redraw, no eye overlays */
export default function HootLogo({
  mood,
  size = 72,
  showWordmark = false,
  showSubtitle = false,
  frame = 0,
  onClick,
  className,
}: HootLogoProps) {
  if (showWordmark) {
    return (
      <ImgButton
        src={HOOT_BRAND_SRC}
        alt="HOOT Local AI Command Center"
        width={size}
        height={Math.round(size * BRAND_ASPECT)}
        mood={mood}
        frame={frame}
        onClick={onClick}
        className={className}
      />
    );
  }

  if (showSubtitle) {
    const w = size * 1.4;
    return (
      <ImgButton
        src={HOOT_WORDMARK_SRC}
        alt="HOOT Local AI Command Center"
        width={w}
        height={Math.round(w * WORDMARK_ASPECT)}
        mood={mood}
        frame={frame}
        onClick={onClick}
        className={className}
      />
    );
  }

  return (
    <ImgButton
      src={HOOT_OWL_SRC}
      alt="HOOT"
      width={size}
      height={Math.round(size * OWL_ASPECT)}
      mood={mood}
      frame={frame}
      onClick={onClick}
      className={className}
    />
  );
}