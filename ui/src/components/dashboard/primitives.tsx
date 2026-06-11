import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";

/** Status tones rendered from theme-safe utility classes (work in dark + light). */
export const statusTone: Record<string, { className: string; label: string }> = {
  READY: { className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-400", label: "Ready" },
  DEGRADED: { className: "border-amber-400/25 bg-amber-400/10 text-amber-500", label: "Needs fixes" },
  BLOCKED: { className: "border-red-400/25 bg-red-400/10 text-red-400", label: "Blocked" },
  UNKNOWN: { className: "border-border bg-foreground/5 text-muted-foreground", label: "Unknown" },
};

export function Badge({ text, tone }: { text: string; tone: string }) {
  const style = statusTone[tone] || statusTone.UNKNOWN;
  return (
    <span className={`rounded-full border px-2.5 py-1.5 text-[11px] uppercase tracking-[0.08em] ${style.className}`}>
      {text}
    </span>
  );
}

export function Panel({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="hoot-card-soft rounded-[22px] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="mb-1.5 text-[11px] uppercase tracking-[0.16em] opacity-45">{subtitle}</div>
          <h2 className="font-serif text-xl font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
        </div>
        <div className="hoot-gold-chip flex h-10 w-10 items-center justify-center rounded-[14px]">
          <Icon size={18} className="hoot-gold-text" />
        </div>
      </div>
      {children}
    </section>
  );
}

export function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="hoot-card-soft rounded-2xl p-3.5">
      <div className="mb-2 text-[11px] uppercase tracking-[0.14em] opacity-40">{label}</div>
      <div className="text-lg font-semibold tracking-[-0.03em] text-foreground">{value}</div>
      <div className="mt-1.5 text-xs leading-relaxed opacity-55">{note}</div>
    </div>
  );
}

export function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="hoot-card-soft rounded-2xl p-3.5">
      <div className="mb-2 text-[11px] uppercase tracking-[0.12em] opacity-40">{label}</div>
      <div className="text-2xl font-semibold tracking-[-0.04em] text-foreground">{value}</div>
    </div>
  );
}

export function ActionCard({
  to,
  icon: Icon,
  title,
  body,
}: {
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <Link to={to} className="text-inherit no-underline">
      <div className="hoot-card-soft flex items-center justify-between gap-3 rounded-2xl p-3.5 hover:bg-foreground/[0.04]">
        <div className="flex items-start gap-3">
          <div className="hoot-gold-chip flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl">
            <Icon size={18} className="hoot-gold-text" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{title}</div>
            <div className="mt-1 text-xs leading-relaxed opacity-55">{body}</div>
          </div>
        </div>
        <ArrowRight size={16} className="shrink-0 opacity-50" />
      </div>
    </Link>
  );
}

export function LinkCard({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="hoot-gold-text mt-3.5 inline-flex items-center gap-2 text-[13px] font-semibold no-underline">
      {label}
      <ArrowRight size={14} />
    </Link>
  );
}

export function BodyNote({ children }: { children: ReactNode }) {
  return <div className="text-[13px] leading-relaxed opacity-60">{children}</div>;
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  actionTo,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  body: string;
  actionLabel: string;
  actionTo: string;
}) {
  return (
    <div className="rounded-[18px] border border-dashed border-border bg-foreground/[0.02] p-[18px]">
      <div className="hoot-gold-chip mb-3 flex h-[46px] w-[46px] items-center justify-center rounded-2xl">
        <Icon size={20} className="hoot-gold-text" />
      </div>
      <div className="text-lg font-semibold text-foreground">{title}</div>
      <div className="mt-2 text-[13px] leading-relaxed opacity-60">{body}</div>
      <LinkCard to={actionTo} label={actionLabel} />
    </div>
  );
}

/** Skeleton placeholder shown while a widget's data source is loading. */
export function WidgetSkeleton({ rows = 3, title }: { rows?: number; title?: string }) {
  return (
    <section className="hoot-card-soft animate-pulse rounded-[22px] p-5" aria-busy="true" aria-label={title ? `${title} loading` : "Loading"}>
      <div className="mb-4 h-3 w-24 rounded bg-foreground/10" />
      <div className="mb-5 h-5 w-44 rounded bg-foreground/10" />
      <div className="grid gap-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 rounded-2xl bg-foreground/[0.05]" />
        ))}
      </div>
    </section>
  );
}

/** Inline failure state for a single widget, with retry. */
export function WidgetError({ title, onRetry }: { title: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-red-400/20 bg-red-400/[0.06] p-4">
      <div className="flex items-center gap-2.5 text-sm text-red-400">
        <AlertTriangle size={16} className="shrink-0" />
        <span>{title} failed to load.</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw size={13} /> Retry
        </button>
      )}
    </div>
  );
}
