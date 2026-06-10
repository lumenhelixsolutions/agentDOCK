import { useId, useState, type ReactNode } from "react";
import { CircleHelp } from "lucide-react";

type HelpTooltipProps = {
  title: string;
  body: string;
  features?: string[];
  size?: number;
  children?: ReactNode;
};

export default function HelpTooltip({ title, body, features, size = 14, children }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children || (
        <button
          type="button"
          aria-label={`Help: ${title}`}
          aria-describedby={open ? tooltipId : undefined}
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: "1px solid rgba(255,176,66,0.25)",
            background: open ? "rgba(255,176,66,0.15)" : "rgba(255,255,255,0.04)",
            color: open ? "#ffb042" : "rgba(236,232,225,0.55)",
            cursor: "help",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            transition: "all 0.15s ease",
          }}
        >
          <CircleHelp size={size} strokeWidth={2} />
        </button>
      )}
      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 10px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: 280,
            padding: "14px 16px",
            borderRadius: 12,
            background: "linear-gradient(165deg, #1a1a1a 0%, #0d0d0d 100%)",
            border: "1px solid rgba(255,176,66,0.22)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset",
            zIndex: 300,
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "#ffb042", marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 12, lineHeight: 1.55, color: "rgba(245,245,245,0.88)" }}>{body}</div>
          {features && features.length > 0 && (
            <ul style={{ margin: "10px 0 0", paddingLeft: 16, fontSize: 11, lineHeight: 1.5, color: "rgba(236,232,225,0.65)" }}>
              {features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          <div
            style={{
              position: "absolute",
              bottom: -6,
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
              width: 10,
              height: 10,
              background: "#141414",
              borderRight: "1px solid rgba(255,176,66,0.22)",
              borderBottom: "1px solid rgba(255,176,66,0.22)",
            }}
          />
        </div>
      )}
    </span>
  );
}