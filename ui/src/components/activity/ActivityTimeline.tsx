import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import type { ActivityTimelineEvent, DiarySourceFilter } from "@/lib/activity-types";

const TYPE_LABEL: Record<string, string> = {
  "session.launch": "Launch",
  "session.end": "Session end",
  "session.fail": "Session failed",
  "agent.dock.start": "Dock start",
  "agent.dock.stop": "Dock stop",
  "agent.external.start": "External start",
  "agent.external.stop": "External stop",
};

const TYPE_OPTIONS = ["all", ...Object.keys(TYPE_LABEL)] as const;

function outcomeColor(outcome: string | null | undefined) {
  if (outcome === "success") return "#4ade80";
  if (outcome === "failure") return "#fb923c";
  return undefined;
}

function matchesSource(ev: ActivityTimelineEvent, source: DiarySourceFilter) {
  if (source === "all") return true;
  if (source === "hoot") return ev.type.startsWith("session.");
  if (source === "dock") return ev.type.startsWith("agent.dock") || (ev.source === "agentdock" && ev.type.startsWith("agent."));
  if (source === "external") return ev.type.startsWith("agent.external") || ev.source === "external";
  return true;
}

export default function ActivityTimeline({
  events,
  filterDate,
  sourceFilter = "all",
  typeFilter = "all",
}: {
  events: ActivityTimelineEvent[];
  filterDate: string | null;
  sourceFilter?: DiarySourceFilter;
  typeFilter?: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filterDate && !e.at.startsWith(filterDate)) return false;
      if (!matchesSource(e, sourceFilter)) return false;
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      return true;
    });
  }, [events, filterDate, sourceFilter, typeFilter]);

  if (filtered.length === 0) {
    return (
      <div style={{ fontSize: 12, opacity: 0.5, display: "flex", alignItems: "center", gap: 8 }}>
        <CalendarDays size={14} />
        {filterDate ? `No events on ${filterDate} for current filters.` : "No events in this window yet."}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {filtered.map((ev) => {
        const label = TYPE_LABEL[ev.type] || ev.type.replace(/\./g, " · ");
        const oc = outcomeColor(ev.outcome);
        const open = expanded === ev.id;
        const hasMeta = ev.meta && Object.keys(ev.meta).length > 0;
        return (
          <div
            key={ev.id}
            style={{
              borderRadius: 10,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {hasMeta ? (
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : ev.id)}
                      style={{ background: "none", border: "none", padding: 0, color: "inherit", cursor: "pointer", display: "flex" }}
                    >
                      {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                  ) : null}
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
                  {oc && (
                    <span style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: oc, opacity: 0.9 }}>{ev.outcome}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, opacity: 0.55, marginTop: 3 }}>
                  {ev.agent_name || ev.agent || ev.source || "system"}
                  {ev.project ? ` · ${String(ev.project).split(/[/\\]/).pop()}` : ""}
                  {ev.duration_ms ? ` · ${Math.round(ev.duration_ms / 60000)}m` : ""}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                <div style={{ fontSize: 11, opacity: 0.45, fontFamily: "'GeistMono', monospace" }}>
                  {ev.at.slice(0, 10)} {ev.at.slice(11, 16)}
                </div>
                {ev.session_ref && ev.type.startsWith("session.") && (
                  <Link
                    to={`/terminal?session=${encodeURIComponent(ev.session_ref)}`}
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#ffb042", textDecoration: "none" }}
                  >
                    <ExternalLink size={10} />
                    Terminal
                  </Link>
                )}
              </div>
            </div>
            {open && hasMeta && (
              <pre
                style={{
                  margin: 0,
                  padding: "8px 12px 10px",
                  fontSize: 10,
                  opacity: 0.55,
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                  overflow: "auto",
                }}
              >
                {JSON.stringify(ev.meta, null, 2)}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { TYPE_OPTIONS };