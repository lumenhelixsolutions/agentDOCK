import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Eye, FolderKanban, Layers3, PlayCircle, ShieldAlert, Sparkles, TerminalSquare } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useCoach } from "@/context/CoachContext";
import { hootSignal } from "@/lib/hoot-signals";

export default function LaunchCenterPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [goal, setGoal] = useState("privacy");
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [audit, setAudit] = useState<any>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const toast = useToast();
  const { setPageContext, registerActionHandler } = useCoach();

  useEffect(() => {
    Promise.all([api.getProfiles(), api.getActiveProject().catch(() => null), api.getSessions().catch(() => ({ sessions: [] }))])
      .then(([profileData, activeData, sessionData]) => {
        setProfiles(profileData || []);
        setActiveProject(activeData || null);
        setSessions(sessionData?.sessions || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        toast.showToast("Failed to load launch center", "error");
      });
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    setPlanLoading(true);
    api.makePlan(goal)
      .then((data) => {
        if (!cancelled) setPlan(data);
      })
      .catch(() => {
        if (!cancelled) toast.showToast("Could not calculate plan recommendations", "warning");
      })
      .finally(() => {
        if (!cancelled) setPlanLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [goal, toast]);

  const runningSessions = useMemo(() => sessions.filter((session) => session.status === "running"), [sessions]);
  const recommended = plan?.recommended || [];
  const blocked = plan?.blocked || [];
  const launchCandidates = recommended.length > 0 ? recommended : profiles.filter((profile) => profile.state !== "BLOCKED").slice(0, 8);

  const reviewProfile = async (id: string) => {
    try {
      const result = await api.dryRun(id);
      setPreview({ id, result });
      if (result.audit?.warnings?.length || result.audit?.errors?.length) {
        setAudit({ id, audit: result.audit });
      } else {
        setAudit(null);
      }
    } catch (error: any) {
      toast.showToast(error.message || "Preview failed", "error");
    }
  };

  useEffect(() => {
    const auditWarn = Boolean(audit?.audit?.warnings?.length || audit?.audit?.errors?.length);
    setPageContext({
      recommendedCount: recommended.length,
      previewProfileId: preview?.id || null,
      stagedProfileId: preview?.id && !auditWarn ? preview.id : null,
      hasAuditWarnings: auditWarn,
      runningSessions: runningSessions.length,
    });
  }, [recommended.length, preview, audit, runningSessions.length, setPageContext]);

  const launchProfile = async (id: string, overrideReason?: string) => {
    setLaunchingId(id);
    try {
      const result = await api.launch(id, overrideReason);
      if (result.blocked) {
        setPageContext(hootSignal("launch:blocked", 6000));
        toast.showToast(result.message || "Launch blocked", "warning", 6000);
      } else if (result.session) {
        toast.showToast(`Launched ${result.session.profileName}`, "success");
        setSessions((prev) => [result.session, ...prev]);
      } else {
        toast.showToast("Launch request completed", "info");
      }
    } catch (error: any) {
      toast.showToast(error.message || "Launch failed", "error");
    } finally {
      setLaunchingId(null);
    }
  };

  useEffect(() => {
    return registerActionHandler((target) => {
      const topId = launchCandidates[0]?.id;
      if (target === "launch-review-first" && topId) reviewProfile(topId);
      if (target === "launch-staged-go" && preview?.id) launchProfile(preview.id);
    });
  });

  if (loading) {
    return <div style={{ minHeight: "50vh", display: "grid", placeItems: "center", opacity: 0.56 }}>Loading launch center…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <section style={{ padding: 24, borderRadius: 22, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 780 }}>
            <div style={{ fontSize: 11, opacity: 0.46, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>Milestones 4 + 5</div>
            <div style={{ fontSize: 32, color: "#ffffff", fontWeight: 600, letterSpacing: "-0.05em" }}>Dedicated launch review, not blind clicking.</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.68, marginTop: 12 }}>
              This surface brings active project context, recommendation goals, audit explainability, script preview, and launch control
              into one place. It is the answer to the previous “everything everywhere” dashboard problem.
            </div>
          </div>
          <div style={{ minWidth: 250, display: "grid", gap: 10 }}>
            <MetaPill icon={FolderKanban} label={activeProject?.project?.name || "No active project"} tone="gold" />
            <MetaPill icon={Layers3} label={`${profiles.length} profiles loaded`} tone="slate" />
            <MetaPill icon={TerminalSquare} label={`${runningSessions.length} sessions running`} tone={runningSessions.length ? "green" : "slate"} />
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 18, alignItems: "start" }}>
        <section style={{ padding: 22, borderRadius: 22, background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.42, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>Recommendation goal</div>
              <div style={{ fontSize: 22, color: "#ffffff", fontWeight: 600 }}>Choose the best launch path</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                ["privacy", "Local-first"],
                ["fastest", "Fastest"],
                ["cheapest", "Cheapest"],
                ["heavy", "Heavy work"],
                ["audit", "Audit"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setGoal(value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: goal === value ? "1px solid rgba(255,176,66,0.28)" : "1px solid rgba(255,255,255,0.08)",
                    background: goal === value ? "rgba(255,176,66,0.08)" : "rgba(255,255,255,0.03)",
                    color: goal === value ? "#ffcb89" : "#e5ded1",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {planLoading ? (
            <div style={{ padding: 30, borderRadius: 16, background: "rgba(255,255,255,0.02)", textAlign: "center", opacity: 0.56 }}>Scoring profiles…</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {launchCandidates.map((profile: any) => (
                <ProfileLaunchCard
                  key={profile.id}
                  profile={profile}
                  launching={launchingId === profile.id}
                  onPreview={() => reviewProfile(profile.id)}
                  onLaunch={() => launchProfile(profile.id)}
                />
              ))}
              {launchCandidates.length === 0 && <div style={{ opacity: 0.56 }}>No launchable profiles found.</div>}
            </div>
          )}
        </section>

        <div style={{ display: "grid", gap: 18 }}>
          <section style={{ padding: 22, borderRadius: 22, background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 11, opacity: 0.42, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>Explainability</div>
            <div style={{ fontSize: 20, color: "#ffffff", fontWeight: 600, marginBottom: 12 }}>Audit posture</div>
            {audit ? (
              <div style={{ display: "grid", gap: 12 }}>
                <AuditBucket title="Errors" items={audit.audit?.errors || []} tone="red" emptyLabel="No blocking errors." />
                <AuditBucket title="Warnings" items={audit.audit?.warnings || []} tone="gold" emptyLabel="No warnings." />
                <AuditSuggestionList suggestions={audit.audit?.suggestions || []} />
                {(audit.audit?.warnings?.length || 0) > 0 && (
                  <button
                    onClick={() => launchProfile(audit.id, "User approved after reviewing warnings in Launch Center")}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,176,66,0.22)",
                      background: "rgba(255,176,66,0.1)",
                      color: "#ffcb89",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    Launch with explicit override
                  </button>
                )}
              </div>
            ) : (
              <BodyNote>Preview a profile to inspect warnings, blocking errors, suggestions, and the exact launch script.</BodyNote>
            )}
          </section>

          <section style={{ padding: 22, borderRadius: 22, background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 11, opacity: 0.42, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>Script preview</div>
            <div style={{ fontSize: 20, color: "#ffffff", fontWeight: 600, marginBottom: 12 }}>What will actually run</div>
            {preview ? (
              <>
                <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 10 }}>Profile: {preview.id}</div>
                <pre
                  style={{
                    margin: 0,
                    padding: 16,
                    borderRadius: 16,
                    background: "rgba(0,0,0,0.28)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 12,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    overflow: "auto",
                    maxHeight: 340,
                    color: "#ece8e1",
                    fontFamily: "'GeistMono', monospace",
                  }}
                >
                  {preview.result?.script || "No script preview available."}
                </pre>
              </>
            ) : (
              <BodyNote>No preview loaded yet.</BodyNote>
            )}
          </section>
        </div>
      </div>

      {(blocked.length > 0 || runningSessions.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <section style={{ padding: 20, borderRadius: 20, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.14)" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#fca5a5", marginBottom: 8 }}>Blocked for this goal</div>
            {blocked.slice(0, 5).map((profile: any) => (
              <div key={profile.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span>{profile.name}</span>
                <span style={{ opacity: 0.54 }}>{profile.score}%</span>
              </div>
            ))}
          </section>
          <section style={{ padding: 20, borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.42, marginBottom: 8 }}>Running now</div>
            {runningSessions.length > 0 ? (
              runningSessions.map((session: any) => (
                <div key={session.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span>{session.profileName}</span>
                  <Link to="/terminal" style={{ color: "#ffcb89", textDecoration: "none" }}>Monitor</Link>
                </div>
              ))
            ) : (
              <BodyNote>No running sessions.</BodyNote>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ProfileLaunchCard({ profile, launching, onPreview, onLaunch }: { profile: any; launching: boolean; onPreview: () => void; onLaunch: () => void }) {
  const state = profile.state || "UNKNOWN";
  const stateTone = state === "READY" ? "#86efac" : state === "DEGRADED" ? "#fbbf24" : state === "BLOCKED" ? "#fca5a5" : "#d6d3d1";
  return (
    <div style={{ padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 16, color: "#ffffff", fontWeight: 600 }}>{profile.name}</div>
          <div style={{ fontSize: 11, opacity: 0.42, marginTop: 4, fontFamily: "'GeistMono', monospace" }}>{profile.id}</div>
        </div>
        <div style={{ padding: "7px 10px", borderRadius: 999, background: `${stateTone}14`, border: `1px solid ${stateTone}28`, color: stateTone, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>{state}</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {profile.meta?.mode && <Chip text={profile.meta.mode} />}
        {profile.meta?.task_mode && <Chip text={profile.meta.task_mode} />}
        {profile.meta?.model && <Chip text={profile.meta.model} />}
        {profile.score !== undefined && <Chip text={`${profile.score}% fit`} highlight />}
      </div>

      {profile.reasons?.length > 0 && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.024)", border: "1px solid rgba(255,255,255,0.05)" }}>
          {profile.reasons.slice(0, 3).map((reason: string, index: number) => (
            <div key={index} style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.7 }}>• {reason}</div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={onPreview} style={secondaryButtonStyle}>
          <Eye size={14} /> Preview + audit
        </button>
        <button onClick={onLaunch} disabled={launching || state === "BLOCKED"} style={{ ...primaryButtonStyle, opacity: launching || state === "BLOCKED" ? 0.56 : 1, cursor: launching || state === "BLOCKED" ? "not-allowed" : "pointer" }}>
          <PlayCircle size={14} /> {launching ? "Launching…" : "Launch"}
        </button>
      </div>
    </div>
  );
}

function AuditBucket({ title, items, tone, emptyLabel }: { title: string; items: string[]; tone: "red" | "gold"; emptyLabel: string }) {
  const styles = tone === "red"
    ? { color: "#fca5a5", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.16)" }
    : { color: "#ffcb89", bg: "rgba(255,176,66,0.06)", border: "rgba(255,176,66,0.16)" };
  return (
    <div style={{ padding: 14, borderRadius: 16, background: styles.bg, border: `1px solid ${styles.border}` }}>
      <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: styles.color, marginBottom: 8 }}>{title}</div>
      {items.length > 0 ? items.map((item, index) => <div key={index} style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 6 }}>• {item}</div>) : <BodyNote>{emptyLabel}</BodyNote>}
    </div>
  );
}

function AuditSuggestionList({ suggestions }: { suggestions: any[] }) {
  if (!suggestions.length) return <BodyNote>No suggested alternatives.</BodyNote>;
  return (
    <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.42, marginBottom: 8 }}>Suggestions</div>
      {suggestions.map((suggestion: any, index: number) => (
        <div key={index} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span>{suggestion.name || suggestion.id || "Alternative"}</span>
          {suggestion.score !== undefined && <span style={{ opacity: 0.54 }}>{suggestion.score}%</span>}
        </div>
      ))}
    </div>
  );
}

function MetaPill({ icon: Icon, label, tone }: { icon: any; label: string; tone: "green" | "gold" | "slate" }) {
  const styles = {
    green: { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.18)", color: "#86efac" },
    gold: { bg: "rgba(255,176,66,0.08)", border: "rgba(255,176,66,0.18)", color: "#ffcb89" },
    slate: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.08)", color: "#ddd6cb" },
  }[tone];
  return (
    <div style={{ padding: "10px 12px", borderRadius: 999, border: `1px solid ${styles.border}`, background: styles.bg, color: styles.color, display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
      <Icon size={14} />
      {label}
    </div>
  );
}

function Chip({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <span style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${highlight ? "rgba(255,176,66,0.22)" : "rgba(255,255,255,0.08)"}`, background: highlight ? "rgba(255,176,66,0.08)" : "rgba(255,255,255,0.03)", color: highlight ? "#ffcb89" : "#ddd6cb", fontSize: 11 }}>
      {text}
    </span>
  );
}

function BodyNote({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.68 }}>{children}</div>;
}

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
