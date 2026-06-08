import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, Filter, Layers3, PlayCircle, Search, ShieldAlert, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";

const statusTone: Record<string, { color: string; bg: string; border: string; label: string }> = {
  READY: { color: "#86efac", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.18)", label: "Ready" },
  DEGRADED: { color: "#ffcb89", bg: "rgba(255,176,66,0.08)", border: "rgba(255,176,66,0.18)", label: "Needs fixes" },
  BLOCKED: { color: "#fca5a5", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.18)", label: "Blocked" },
  UNKNOWN: { color: "#d6d3d1", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.08)", label: "Unknown" },
};

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    api.getProfiles()
      .then((data) => {
        setProfiles(data || []);
        setLoading(false);
      })
      .catch((error: any) => {
        setLoading(false);
        toast.showToast(error.message || "Failed to load profiles", "error");
      });
  }, [toast]);

  const filtered = useMemo(() => {
    return profiles.filter((profile) => {
      const haystack = [profile.name, profile.id, profile.meta?.frontend, profile.meta?.backend, profile.meta?.model, profile.meta?.task_mode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !search.trim() || haystack.includes(search.toLowerCase());
      const matchesMode = modeFilter === "all" || (profile.meta?.mode || "").toLowerCase().includes(modeFilter);
      const state = profile.state || "UNKNOWN";
      const matchesStatus = statusFilter === "all" || state === statusFilter;
      return matchesSearch && matchesMode && matchesStatus;
    });
  }, [profiles, search, modeFilter, statusFilter]);

  const grouped = useMemo(() => {
    return {
      ready: filtered.filter((profile) => profile.state === "READY"),
      fixable: filtered.filter((profile) => profile.state === "DEGRADED"),
      blocked: filtered.filter((profile) => profile.state === "BLOCKED"),
      unknown: filtered.filter((profile) => !profile.state || profile.state === "UNKNOWN"),
    };
  }, [filtered]);

  const inspect = async (profile: any) => {
    setSelected(profile);
    try {
      const result = await api.dryRun(profile.id);
      setPreview(result);
    } catch (error: any) {
      setPreview({ error: error.message || "Preview failed" });
      toast.showToast(error.message || "Preview failed", "error");
    }
  };

  const launchProfile = async (profile: any, overrideReason?: string) => {
    setLaunchingId(profile.id);
    try {
      const result = await api.launch(profile.id, overrideReason);
      if (result.blocked) {
        toast.showToast(result.message || "Launch blocked", "warning", 6000);
      } else if (result.session) {
        toast.showToast(`Launched ${result.session.profileName}`, "success");
      }
    } catch (error: any) {
      toast.showToast(error.message || "Launch failed", "error");
    } finally {
      setLaunchingId(null);
    }
  };

  if (loading) {
    return <div style={{ minHeight: "50vh", display: "grid", placeItems: "center", opacity: 0.56 }}>Loading profiles…</div>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 20, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <section style={{ padding: 22, borderRadius: 22, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.42, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>Milestone 4</div>
              <div style={{ fontSize: 28, color: "#ffffff", fontWeight: 600, letterSpacing: "-0.05em" }}>Profile catalog rebuilt for decision-making.</div>
              <div style={{ fontSize: 14, opacity: 0.68, lineHeight: 1.7, marginTop: 10 }}>
                Browse by operational posture first: ready, fixable, blocked. The point is not to show every profile equally — it is to help the user choose confidently.
              </div>
            </div>
            <div style={{ display: "grid", gap: 10, minWidth: 260 }}>
              <SummaryPill tone="green" label={`${grouped.ready.length} ready`} />
              <SummaryPill tone="gold" label={`${grouped.fixable.length} fixable`} />
              <SummaryPill tone="red" label={`${grouped.blocked.length} blocked`} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr 0.7fr", gap: 10 }}>
            <InputShell icon={Search}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search profiles, models, frontends, task modes…"
                style={inputStyle}
              />
            </InputShell>
            <InputShell icon={Filter}>
              <select value={modeFilter} onChange={(event) => setModeFilter(event.target.value)} style={inputStyle}>
                <option value="all">All modes</option>
                <option value="local">Local</option>
                <option value="hybrid">Hybrid</option>
                <option value="cloud">Cloud</option>
              </select>
            </InputShell>
            <InputShell icon={Layers3}>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={inputStyle}>
                <option value="all">All states</option>
                <option value="READY">Ready</option>
                <option value="DEGRADED">Fixable</option>
                <option value="BLOCKED">Blocked</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </InputShell>
          </div>
        </section>

        <CatalogSection title="Ready now" subtitle="Safe starting points" profiles={grouped.ready} onInspect={inspect} onLaunch={launchProfile} launchingId={launchingId} />
        <CatalogSection title="Fixable with review" subtitle="Warnings deserve explanation" profiles={grouped.fixable} onInspect={inspect} onLaunch={launchProfile} launchingId={launchingId} />
        <CatalogSection title="Blocked" subtitle="Not launchable without intervention" profiles={grouped.blocked} onInspect={inspect} onLaunch={launchProfile} launchingId={launchingId} />
        {grouped.unknown.length > 0 && <CatalogSection title="Unknown" subtitle="Needs more evidence" profiles={grouped.unknown} onInspect={inspect} onLaunch={launchProfile} launchingId={launchingId} />}
      </div>

      <section style={{ position: "sticky", top: 94, padding: 22, borderRadius: 22, background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 11, opacity: 0.42, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>Milestone 5</div>
        <div style={{ fontSize: 24, color: "#ffffff", fontWeight: 600, letterSpacing: "-0.04em", marginBottom: 10 }}>Audit explainability panel</div>
        <div style={{ fontSize: 13, opacity: 0.68, lineHeight: 1.7, marginBottom: 16 }}>
          Clicking a profile should explain what will happen, why it is safe or risky, and what alternatives exist. That’s what this side panel is for.
        </div>

        {selected ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 18, color: "#ffffff", fontWeight: 600 }}>{selected.name}</div>
              <div style={{ fontSize: 11, opacity: 0.42, marginTop: 4, fontFamily: "'GeistMono', monospace" }}>{selected.id}</div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <Chip text={selected.meta?.mode || "unknown mode"} />
              <Chip text={selected.meta?.task_mode || "task mode"} />
              {selected.meta?.model && <Chip text={selected.meta.model} highlight />}
            </div>

            {preview?.error ? (
              <AuditBlock title="Preview error" tone="red" items={[preview.error]} />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <AuditBlock title="Errors" tone="red" items={preview?.audit?.errors || []} emptyLabel="No blocking errors." />
                <AuditBlock title="Warnings" tone="gold" items={preview?.audit?.warnings || []} emptyLabel="No warnings." />
                <SuggestionBlock suggestions={preview?.audit?.suggestions || []} />
                <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 11, opacity: 0.42, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Launch script preview</div>
                  <pre style={{ margin: 0, maxHeight: 220, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.6, fontFamily: "'GeistMono', monospace", color: "#ece8e1" }}>
                    {preview?.script || "No script available."}
                  </pre>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              <button onClick={() => launchProfile(selected)} disabled={launchingId === selected.id || selected.state === "BLOCKED"} style={{ ...primaryButtonStyle, opacity: launchingId === selected.id || selected.state === "BLOCKED" ? 0.56 : 1, cursor: launchingId === selected.id || selected.state === "BLOCKED" ? "not-allowed" : "pointer" }}>
                <PlayCircle size={14} /> {launchingId === selected.id ? "Launching…" : "Launch profile"}
              </button>
              {(preview?.audit?.warnings?.length || 0) > 0 && (
                <button onClick={() => launchProfile(selected, "User approved after reviewing warnings in Profiles panel")} style={secondaryButtonStyle}>
                  <ShieldAlert size={14} /> Launch with reviewed warning override
                </button>
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.12)" }}>
            <div style={{ fontSize: 16, color: "#ffffff", fontWeight: 600, marginBottom: 8 }}>Select a profile to inspect</div>
            <div style={{ fontSize: 13, opacity: 0.68, lineHeight: 1.7 }}>
              This panel will show audit errors, warnings, alternatives, and the exact launch script.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function CatalogSection({ title, subtitle, profiles, onInspect, onLaunch, launchingId }: { title: string; subtitle: string; profiles: any[]; onInspect: (profile: any) => void; onLaunch: (profile: any) => void; launchingId: string | null }) {
  return (
    <section style={{ padding: 20, borderRadius: 22, background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 21, color: "#ffffff", fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 13, opacity: 0.58, marginTop: 4 }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.42 }}>{profiles.length} profiles</div>
      </div>
      {profiles.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {profiles.map((profile) => <ProfileCard key={profile.id} profile={profile} onInspect={() => onInspect(profile)} onLaunch={() => onLaunch(profile)} launching={launchingId === profile.id} />)}
        </div>
      ) : (
        <div style={{ opacity: 0.52, fontSize: 13 }}>No profiles in this group.</div>
      )}
    </section>
  );
}

function ProfileCard({ profile, onInspect, onLaunch, launching }: { profile: any; onInspect: () => void; onLaunch: () => void; launching: boolean }) {
  const tone = statusTone[profile.state || "UNKNOWN"] || statusTone.UNKNOWN;
  return (
    <div style={{ padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.024)", border: `1px solid ${tone.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 16, color: "#ffffff", fontWeight: 600 }}>{profile.name}</div>
          <div style={{ fontSize: 11, opacity: 0.42, marginTop: 4, fontFamily: "'GeistMono', monospace" }}>{profile.id}</div>
        </div>
        <div style={{ padding: "7px 10px", borderRadius: 999, background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {tone.label}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {profile.meta?.mode && <Chip text={profile.meta.mode} />}
        {profile.meta?.task_mode && <Chip text={profile.meta.task_mode} />}
        {profile.meta?.model && <Chip text={profile.meta.model} highlight />}
      </div>

      {profile.reasons?.length > 0 && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
          {profile.reasons.slice(0, 2).map((reason: string, index: number) => (
            <div key={index} style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.72 }}>• {reason}</div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={onInspect} style={secondaryButtonStyle}>
          <Eye size={14} /> Inspect
        </button>
        <button onClick={onLaunch} disabled={launching || profile.state === "BLOCKED"} style={{ ...primaryButtonStyle, opacity: launching || profile.state === "BLOCKED" ? 0.56 : 1, cursor: launching || profile.state === "BLOCKED" ? "not-allowed" : "pointer" }}>
          <PlayCircle size={14} /> {launching ? "Launching…" : "Launch"}
        </button>
      </div>
    </div>
  );
}

function AuditBlock({ title, tone, items, emptyLabel }: { title: string; tone: "red" | "gold"; items: string[]; emptyLabel?: string }) {
  const styles = tone === "red"
    ? { color: "#fca5a5", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.16)", icon: AlertTriangle }
    : { color: "#ffcb89", bg: "rgba(255,176,66,0.06)", border: "rgba(255,176,66,0.16)", icon: CheckCircle2 };
  const Icon = styles.icon;
  return (
    <div style={{ padding: 14, borderRadius: 16, background: styles.bg, border: `1px solid ${styles.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: styles.color, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em" }}>
        <Icon size={14} />
        {title}
      </div>
      {items.length > 0 ? items.map((item, index) => <div key={index} style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 6 }}>• {item}</div>) : <div style={{ fontSize: 13, opacity: 0.68 }}>{emptyLabel || "Nothing here."}</div>}
    </div>
  );
}

function SuggestionBlock({ suggestions }: { suggestions: any[] }) {
  return (
    <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", opacity: 0.42 }}>
        <Sparkles size={14} color="#ffb042" />
        Suggestions
      </div>
      {suggestions.length > 0 ? suggestions.map((suggestion, index) => (
        <div key={index} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontSize: 13 }}>{suggestion.name || suggestion.id || "Alternative"}</span>
          {suggestion.score !== undefined && <span style={{ fontSize: 12, opacity: 0.54 }}>{suggestion.score}%</span>}
        </div>
      )) : <div style={{ fontSize: 13, opacity: 0.68 }}>No alternatives suggested.</div>}
    </div>
  );
}

function SummaryPill({ label, tone }: { label: string; tone: "green" | "gold" | "red" }) {
  const styles = tone === "green"
    ? { color: "#86efac", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.18)" }
    : tone === "gold"
      ? { color: "#ffcb89", bg: "rgba(255,176,66,0.08)", border: "rgba(255,176,66,0.18)" }
      : { color: "#fca5a5", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.18)" };
  return <div style={{ padding: "10px 12px", borderRadius: 999, background: styles.bg, border: `1px solid ${styles.border}`, color: styles.color, fontSize: 12 }}>{label}</div>;
}

function Chip({ text, highlight }: { text: string; highlight?: boolean }) {
  return <span style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${highlight ? "rgba(255,176,66,0.22)" : "rgba(255,255,255,0.08)"}`, background: highlight ? "rgba(255,176,66,0.08)" : "rgba(255,255,255,0.03)", color: highlight ? "#ffcb89" : "#ddd6cb", fontSize: 11 }}>{text}</span>;
}

function InputShell({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
      <Icon size={14} color="#bfb8ab" />
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  color: "#ece8e1",
  fontSize: 13,
  padding: "12px 0",
};

const secondaryButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#ece8e1",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontSize: 13,
};

const primaryButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(74,222,128,0.2)",
  background: "rgba(74,222,128,0.1)",
  color: "#86efac",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontSize: 13,
};
