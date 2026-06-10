import { useEffect, useMemo, useRef, useState } from "react";
import {
  computePupilOffset,
  moodColor,
  moodFrameInterval,
  moodLabel,
  renderOwl,
  type HootMood,
  type PupilOffset,
} from "@/lib/hoot-ascii";
import { throttle } from "@/lib/perf";

const PUPIL_EPSILON = 0.012;

function lerpPupil(current: PupilOffset, target: PupilOffset, t: number): PupilOffset {
  return {
    lx: current.lx + (target.lx - current.lx) * t,
    ly: current.ly + (target.ly - current.ly) * t,
    rx: current.rx + (target.rx - current.rx) * t,
    ry: current.ry + (target.ry - current.ry) * t,
  };
}

function pupilDelta(a: PupilOffset, b: PupilOffset): number {
  return Math.abs(a.lx - b.lx) + Math.abs(a.ly - b.ly) + Math.abs(a.rx - b.rx) + Math.abs(a.ry - b.ry);
}

export default function HootOwl({
  mood,
  size = "sm",
  onClick,
  statusLine,
}: {
  mood: HootMood;
  size?: "sm" | "lg";
  onClick?: () => void;
  statusLine?: string | null;
}) {
  const ref = useRef<HTMLPreElement>(null);
  const targetRef = useRef<PupilOffset>({ lx: 0, ly: 0, rx: 0, ry: 0 });
  const pupilRef = useRef<PupilOffset>({ lx: 0, ly: 0, rx: 0, ry: 0 });
  const rafRef = useRef(0);
  const [frame, setFrame] = useState(0);
  const [pupil, setPupil] = useState<PupilOffset>({ lx: 0, ly: 0, rx: 0, ry: 0 });

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), moodFrameInterval(mood));
    return () => clearInterval(id);
  }, [mood]);

  useEffect(() => {
    const schedulePupilFrame = () => {
      cancelAnimationFrame(rafRef.current);
      const tick = () => {
        const next = lerpPupil(pupilRef.current, targetRef.current, 0.18);
        pupilRef.current = next;
        if (pupilDelta(next, targetRef.current) > PUPIL_EPSILON) {
          setPupil(next);
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setPupil(targetRef.current);
          rafRef.current = 0;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const onMove = throttle((e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ax = rect.left + rect.width / 2;
      const ay = rect.top + rect.height / 2;
      targetRef.current = computePupilOffset(e.clientX, e.clientY, ax, ay);
      if (!rafRef.current) schedulePupilFrame();
    }, 48);

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, []);

  const art = useMemo(() => renderOwl(mood, pupil, frame, statusLine), [mood, pupil, frame, statusLine]);
  const fontSize = size === "lg" ? 11 : 9;
  const color = moodColor(mood);
  const scanline = mood === "monitoring" || mood === "scanning";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div
        style={{
          position: "relative",
          borderRadius: 10,
          padding: size === "lg" ? "8px 10px" : "4px 6px",
          background: "linear-gradient(160deg, rgba(18,18,22,0.95), rgba(8,8,10,0.88))",
          border: `1px solid ${color}44`,
          boxShadow: `0 0 18px ${color}22, inset 0 1px 0 rgba(255,255,255,0.04)`,
          transition: "border-color 0.35s, box-shadow 0.35s",
          contain: "layout paint",
        }}
      >
        {scanline && (
          <div
            style={{
              pointerEvents: "none",
              position: "absolute",
              inset: 0,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div
              className="hoot-scan-line"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${color}55, transparent)`,
              }}
            />
          </div>
        )}
        <pre
          ref={ref}
          onClick={onClick}
          style={{
            margin: 0,
            fontFamily: "'GeistMono', 'Consolas', monospace",
            fontSize,
            lineHeight: 1.2,
            color,
            cursor: onClick ? "pointer" : "default",
            userSelect: "none",
            whiteSpace: "pre",
            minWidth: "7.5em",
            minHeight: "4.8em",
            textAlign: "center",
            transition: "color 0.3s",
            textShadow: `0 0 8px ${color}33`,
          }}
        >
          {art}
        </pre>
      </div>
      <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.55, color }}>
        {statusLine ? statusLine.slice(0, 28) : moodLabel(mood)}
      </span>
    </div>
  );
}