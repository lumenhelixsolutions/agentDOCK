import type { ComponentType, ReactNode } from "react";

/** Session status → chip styling. `blocked` covers memory-gated launches. */
export const SESSION_STATUS: Record<string, { label: string; className: string; pulse?: boolean }> = {
  running: { label: "Running", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400", pulse: true },
  exited: { label: "Exited", className: "border-border bg-foreground/5 text-muted-foreground" },
  error: { label: "Error", className: "border-red-400/30 bg-red-400/10 text-red-400" },
  blocked: { label: "Blocked by memory", className: "border-amber-400/30 bg-amber-400/10 text-amber-500" },
};

export function SessionStatusChip({ status }: { status: string }) {
  const tone = SESSION_STATUS[status] || SESSION_STATUS.exited;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.06em] ${tone.className}`}>
      {tone.pulse && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" aria-hidden />}
      {tone.label}
    </span>
  );
}

/** Shared button styles for the control room. */
export const btn = {
  secondary:
    "inline-flex items-center gap-2 rounded-[10px] border border-border bg-foreground/[0.04] px-3.5 py-2.5 text-xs text-foreground/80 hover:bg-foreground/[0.07] disabled:cursor-not-allowed disabled:opacity-50",
  primary:
    "hoot-gold-chip inline-flex items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50",
  success:
    "inline-flex items-center gap-2 rounded-[10px] border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-2.5 text-xs text-emerald-400 hover:bg-emerald-400/15",
  warning:
    "inline-flex items-center gap-2 rounded-[10px] border border-amber-400/30 bg-amber-400/10 px-3.5 py-2.5 text-xs text-amber-500 hover:bg-amber-400/15",
  danger:
    "inline-flex items-center gap-2 rounded-[10px] border border-red-400/30 bg-red-400/10 px-3.5 py-2.5 text-xs text-red-400 hover:bg-red-400/15",
} as const;

export function MetricCard({ label, value, tone, compact = false }: { label: string; value: string; tone: "green" | "blue" | "red" | "gold"; compact?: boolean }) {
  const toneClass = {
    green: "border-emerald-400/20 text-emerald-400",
    blue: "border-sky-400/20 text-sky-400",
    red: "border-red-400/20 text-red-400",
    gold: "hoot-gold-text border-[color-mix(in_srgb,var(--hoot-gold)_20%,transparent)]",
  }[tone];
  return (
    <div className={`rounded-xl border bg-foreground/[0.03] px-3.5 py-3 ${toneClass}`}>
      <div className="text-[11px] text-foreground/55">{label}</div>
      <div className={`mt-1.5 truncate ${compact ? "text-[13px] font-semibold" : "font-mono text-[22px]"}`}>{value}</div>
    </div>
  );
}

export function StatusRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs opacity-65">
        <Icon size={13} />
        <span>{label}</span>
      </div>
      <span className={`max-w-[58%] truncate text-right text-xs text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

export function Tag({ icon: Icon, text, tone }: { icon?: ComponentType<{ size?: number }>; text: string; tone: "blue" | "violet" }) {
  const toneClass =
    tone === "blue"
      ? "border-sky-400/30 bg-sky-400/[0.07] text-sky-400"
      : "border-violet-400/30 bg-violet-400/[0.07] text-violet-400";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.04em] ${toneClass}`}>
      {Icon && <Icon size={10} />}
      {text}
    </span>
  );
}

export function ControlCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`hoot-card-soft flex flex-col gap-3 rounded-2xl p-4 ${className}`}>{children}</div>;
}
