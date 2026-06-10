import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  FolderKanban,
  GitBranch,
  Layers3,
  PlayCircle,
  Radar,
  Scan,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Workflow,
  Wrench,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useCoach } from "@/context/CoachContext";
import { BRAND } from "@/lib/brand";

const statusTone: Record<string, { color: string; bg: string; border: string; label: string }> = {
  READY: { color: "#86efac", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.18)", label: "Ready" },
  DEGRADED: { color: "#fbbf24", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.18)", label: "Needs fixes" },
  BLOCKED: { color: "#fca5a5", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.18)", label: "Blocked" },
  UNKNOWN: { color: "#d6d3d1", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.08)", label: "Unknown" },
};

export default function Dashboard() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProjectData, setActiveProjectData] = useState<any>(null);
  const [scan, setScan] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [research, setResearch] = useState<any>(null);
  const [memory, setMemory] = useState("");
  const [loading, setLoading] = useState(true);
  const [switchingProject, setSwitchingProject] = useState(false);
  const toast = useToast();
  const { setPageContext, pageContext } = useCoach();

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.getProfiles(),
      api.getProjects().catch(() => ({ projects: [], active: null })),
      api.getActiveProject().catch(() => ({ active: null, project: null })),
      api.runScan().catch(() => null),
      api.getUsage().catch(() => null),
      api.getPortfolioHealth().catch(() => null),
      api.getResearch().catch(() => null),
      api.getMemory().catch(() => ({ text: "" })),
    ])
      .then(([profileData, projectData, activeData, scanData, usageData, portfolioData, researchData, memoryData]) => {
        if (!mounted) return;
        setProfiles(profileData || []);
        setProjects(projectData?.projects || []);
        setActiveProjectData(activeData || { active: null, project: null });
        setScan(scanData);
        setUsage(usageData);
        setPortfolio(portfolioData);
        setResearch(researchData);
        setMemory(memoryData?.text || "");
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
        toast.showToast("Failed to load dashboard data", "error");
      });
    return () => {
      mounted = false;
    };
  }, [toast]);

  const activeProject = useMemo(() => {
    const fromActive = activeProjectData?.project;
    if (fromActive) return fromActive;
    const activePath = activeProjectData?.active;
    return projects.find((project) => project.path === activePath) || null;
  }, [activeProjectData, projects]);

  const profileCounts = useMemo(() => {
    const counts = { READY: 0, DEGRADED: 0, BLOCKED: 0, UNKNOWN: 0 };
    for (const profile of profiles) {
      const state = profile.state || profile.meta?.status || "UNKNOWN";
      counts[state as keyof typeof counts] = (counts[state as keyof typeof counts] || 0) + 1;
    }
    return counts;
  }, [profiles]);

  const recentOutcomes = useMemo(() => (usage?.outcomes || []).slice(-5).reverse(), [usage]);
  const evidenceBlocks = useMemo(
    () =>
      memory
        .split(/\n(?=## Evidence:)/g)
        .filter((block) => block.includes("## Evidence:"))
        .slice(0, 3),
    [memory],
  );

  const activeIssues = useMemo(() => {
    if (!activeProject) return [];
    const item = (portfolio?.items || []).find((entry: any) => entry.path === activeProject.path || entry.name === activeProject.name);
    return item?.issues || [];
  }, [portfolio, activeProject]);

  useEffect(() => {
    setPageContext({
      scanPresent: Boolean(scan),
      readyCount: profileCounts.READY,
      blockedCount: profileCounts.BLOCKED,
      portfolioIssues: activeIssues.length,
    });
  }, [scan, profileCounts, activeIssues.length, setPageContext]);

  const readiness = useMemo(() => {
    if (!scan) {
      return {
        state: "UNKNOWN",
        headline: "Run a local scan to establish system readiness.",
        details: ["No system scan available yet", "Toolchain and model availability are unknown"],
      };
    }
    const coders = scan.coders || [];
    const installedCoders = coders.filter((coder: any) => coder.detection?.present).length;
    const localBackends = (scan.local_models?.backends || []).filter((backend: any) => backend.present).length;
    const details: string[] = [];
    if (!scan.tools?.ollama?.present) details.push("Ollama not detected");
    if (installedCoders === 0) details.push("No agent CLI detected");
    if (!activeProject) details.push("No active project selected");
    if (activeProject && !activeProject.hasAgentsMd) details.push("AGENTS.md missing for active project");
    const state = details.length === 0 ? "READY" : installedCoders > 0 || activeProject ? "DEGRADED" : "BLOCKED";
    return {
      state,
      headline:
        state === "READY"
          ? "System and project context are in place for local-first execution."
          : state === "BLOCKED"
            ? "You have first-run blockers to clear before reliable launches."
            : "You can proceed, but the next run will be stronger after a short setup pass.",
      details:
        details.length > 0
          ? details
          : [
              `${installedCoders}/${coders.length || installedCoders} agent tools detected`,
              `${localBackends} local model backends ready`,
            ],
    };
  }, [scan, activeProject]);

  const executiveSummary = useMemo(() => {
    const coders = scan?.coders || [];
    const installedCoders = coders.filter((coder: any) => coder.detection?.present).length;
    const loadedModels = (scan?.ollama?.loaded_models || []).length;
    const cleanProjects = projects.filter((project: any) => project.git?.clean).length;
    const radarTotal = Number(pageContext.agentRadarTotal) || 0;
    const radarExt = Number(pageContext.agentRadarExternal) || 0;
    const radarDock = Number(pageContext.agentRadarDock) || 0;
    const items = [
      { label: "Readiness", value: statusTone[readiness.state]?.label || "Unknown", note: readiness.headline },
      { label: "Active project", value: activeProject?.name || "None selected", note: activeProject?.type || "Pick a repo to ground recommendations" },
      { label: "Profiles ready", value: `${profileCounts.READY}/${profiles.length || 0}`, note: `${profileCounts.DEGRADED} fixable · ${profileCounts.BLOCKED} blocked` },
      { label: "Toolchain", value: `${installedCoders}/${coders.length || 0} detected`, note: `${loadedModels} models loaded locally` },
      { label: "Project health", value: `${cleanProjects}/${projects.length || 0} clean`, note: activeIssues.length ? activeIssues.join(", ") : "No active-project issues surfaced" },
    ];
    if (radarTotal > 0) {
      items.push({
        label: "Agent radar",
        value: `${radarTotal} running`,
        note: radarExt > 0 ? `${radarExt} external · ${radarDock} docked` : `${radarDock} docked · HOOT monitoring`,
      });
    }
    return items;
  }, [scan, projects, activeProject, readiness, profileCounts, profiles.length, activeIssues, pageContext]);

  const recommendedActions = useMemo(() => {
    const actions: Array<{ title: string; body: string; to: string; icon: any }> = [];
    if (!scan) actions.push({ title: "Run the first scan", body: "Detect local agents, models, and machine capability before launch.", to: "/scan", icon: Scan });
    if (!activeProject) actions.push({ title: "Choose an active project", body: "HOOT works best when the home screen, memory, and launches are tied to a repo.", to: "/launch", icon: FolderKanban });
    if (activeProject && !activeProject.hasAgentsMd) actions.push({ title: "Add AGENTS.md context", body: "Document architecture and workflow so the first autonomous run is grounded.", to: "/memory", icon: BookOpen });
    if (readiness.state !== "READY") actions.push({ title: "Resolve readiness gaps", body: "Review scan results and settings to clear blockers or missing pieces.", to: "/settings", icon: Wrench });
    if (Number(pageContext.agentRadarExternal) > 0) {
      actions.unshift({
        title: "Review external agents",
        body: `${pageContext.agentRadarExternal} coding agent(s) running ${BRAND.externalLabel} — see radar report on Readiness.`,
        to: "/scan",
        icon: Radar,
      });
    }
    if (actions.length === 0) actions.push({ title: "Open Launch Center", body: "Your system looks ready. Review profiles and continue with a guided launch.", to: "/launch", icon: PlayCircle });
    return actions.slice(0, 4);
  }, [scan, activeProject, readiness.state, pageContext.agentRadarExternal]);

  const suggestedProfiles = useMemo(() => {
    return profiles
      .slice()
      .sort((a: any, b: any) => {
        const score = (profile: any) => {
          let value = 0;
          if ((profile.state || profile.meta?.status) === "READY") value += 5;
          if (profile.ce_compatible) value += 2;
          if ((profile.meta?.mode || "").includes("local")) value += 1;
          return value;
        };
        return score(b) - score(a);
      })
      .slice(0, 3);
  }, [profiles]);

  const handleProjectChange = async (path: string) => {
    setSwitchingProject(true);
    try {
      const result = await api.setActiveProject(path);
      setProjects(result?.projects || projects);
      setActiveProjectData({ active: result?.active || path, project: (result?.projects || projects).find((project: any) => project.path === (result?.active || path)) || null });
      toast.showToast("Active project updated", "success");
    } catch {
      toast.showToast("Failed to switch active project", "error");
    } finally {
      setSwitchingProject(false);
    }
  };

  if (loading) return <LoadingState />;

  const activeGit = activeProject?.git || {};
  const readinessStyle = statusTone[readiness.state] || statusTone.UNKNOWN;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <section
        style={{
          borderRadius: 24,
          padding: 28,
          background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1.45fr 0.9fr", gap: 18, alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.48, marginBottom: 12 }}>
              Command center
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <Badge text={statusTone[readiness.state]?.label || "Unknown"} tone={readiness.state} />
              <Badge text="Local-first" tone="UNKNOWN" />
            </div>
            <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.02, letterSpacing: "-0.05em", color: "#ffffff" }}>
              {activeProject ? `${activeProject.name} command center` : `Prepare ${BRAND.name} for the first run`}
            </h1>
            <p style={{ margin: "14px 0 0", fontSize: 15, lineHeight: 1.7, opacity: 0.7 }}>
              {activeProject
                ? `See project readiness, session momentum, and the next highest-leverage action without leaving the home screen.`
                : "Start with a scan, select a project, and add enough context so launches stay grounded, local-first, and recoverable."}
            </p>
            <div style={{ marginTop: 18, padding: 16, borderRadius: 18, background: readinessStyle.bg, border: `1px solid ${readinessStyle.border}` }}>
              <div style={{ fontSize: 14, color: "#ffffff", fontWeight: 600 }}>{readiness.headline}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {readiness.details.slice(0, 3).map((detail) => (
                  <div key={detail} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, opacity: 0.78 }}>
                    <CircleDot size={14} color={readinessStyle.color} style={{ marginTop: 1, flexShrink: 0 }} />
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {executiveSummary.slice(0, 3).map((item) => (
              <SummaryCard key={item.label} label={item.label} value={item.value} note={item.note} />
            ))}
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.95fr", gap: 18 }}>
        <Panel title="Active project context" subtitle="Project-centered home" icon={Radar}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 26, color: "#ffffff", fontWeight: 600, letterSpacing: "-0.04em" }}>
                {activeProject?.name || "No active project"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.48, marginTop: 6, fontFamily: "'GeistMono', monospace" }}>
                {activeProject?.path || "Choose a repo to anchor recommendations and launches"}
              </div>
            </div>
            <select
              value={activeProject?.path || ""}
              disabled={switchingProject || projects.length === 0}
              onChange={(event) => handleProjectChange(event.target.value)}
              style={{
                minWidth: 230,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "#f7f2ea",
              }}
            >
              <option value="">No active project</option>
              {projects.map((project) => (
                <option key={project.path} value={project.path}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {activeProject ? (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <Badge text={activeProject.type || "unknown"} tone="UNKNOWN" />
                <Badge text={activeGit.present ? `branch:${activeGit.branch || "none"}` : "no git repo"} tone={activeGit.present ? "READY" : "UNKNOWN"} />
                <Badge text={activeGit.clean ? "git clean" : `dirty ${activeGit.uncommitted || 0}`} tone={activeGit.clean ? "READY" : "DEGRADED"} />
                <Badge text={activeProject.hasAgentsMd ? "AGENTS.md ready" : "AGENTS.md missing"} tone={activeProject.hasAgentsMd ? "READY" : "DEGRADED"} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                <MiniStat label="Modified" value={activeGit.modified ?? 0} />
                <MiniStat label="Untracked" value={activeGit.untracked ?? 0} />
                <MiniStat label="Ahead / Behind" value={`${activeGit.ahead ?? 0} / ${activeGit.behind ?? 0}`} />
                <MiniStat label="Risk flags" value={activeIssues.length} />
              </div>
              <div style={{ marginTop: 16, padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.46, marginBottom: 10 }}>
                  Why this matters
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.65, opacity: 0.76 }}>
                  The active project is the operating context for readiness checks, memory, portfolio risk, and profile selection. This keeps the home screen oriented around real work instead of raw controls.
                </div>
              </div>
              {activeIssues.length > 0 && (
                <div style={{ marginTop: 16, padding: 16, borderRadius: 18, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.16)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "#fca5a5", fontWeight: 600 }}>
                    <AlertTriangle size={16} /> Active project watchlist
                  </div>
                  {activeIssues.map((issue: string, index: number) => (
                    <div key={index} style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.84 }}>
                      • {issue}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={FolderKanban}
              title="No active project selected"
              body="Pick a local repository so HOOT can give project-aware recommendations, first-run setup guidance, and cleaner session recovery context."
              actionLabel="Open Launch Center"
              actionTo="/launch"
            />
          )}
        </Panel>

        <Panel title="First-run mission flow" subtitle="Milestone 2" icon={Workflow}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FlowStep number="01" title="Scan the machine" body="Detect installed frontends, local model backends, and environment capability before promising a launch path." ready={!!scan} />
            <FlowStep number="02" title="Choose the operating project" body="Set the repo that should anchor recommendations, memory, and portfolio context." ready={!!activeProject} />
            <FlowStep number="03" title="Add agent context" body="Confirm AGENTS.md or memory notes exist before the first autonomous handoff." ready={!!activeProject?.hasAgentsMd || evidenceBlocks.length > 0} />
            <FlowStep number="04" title="Launch with confidence" body="Move into Launch Center once readiness is green or known tradeoffs are understood." ready={profiles.length > 0} />
          </div>
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Panel title="Recommended next actions" subtitle="Do this next" icon={PlayCircle}>
          <div style={{ display: "grid", gap: 10 }}>
            {recommendedActions.map((action) => (
              <ActionCard key={action.title} to={action.to} icon={action.icon} title={action.title} body={action.body} />
            ))}
          </div>
        </Panel>

        <Panel title="Cleaner executive summary" subtitle="At-a-glance status" icon={ShieldCheck}>
          <div style={{ display: "grid", gap: 10 }}>
            {executiveSummary.map((item) => (
              <SummaryCard key={item.label} label={item.label} value={item.value} note={item.note} />
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
        <Panel title="Suggested profiles" subtitle="Launch candidates" icon={Layers3}>
          {suggestedProfiles.length > 0 ? (
            suggestedProfiles.map((profile: any) => {
              const state = profile.state || profile.meta?.status || "UNKNOWN";
              return (
                <div key={profile.id} style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#f7f2ea", fontWeight: 600 }}>{profile.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.52, marginTop: 4 }}>{profile.meta?.mode || "unknown mode"} · {profile.meta?.model || "model not specified"}</div>
                    </div>
                    <Badge text={statusTone[state]?.label || state} tone={state} />
                  </div>
                </div>
              );
            })
          ) : (
            <BodyNote>No profiles discovered yet.</BodyNote>
          )}
          <LinkCard to="/profiles" label="Review full profile catalog" />
        </Panel>

        <Panel title="Recent sessions" subtitle="Operational signal" icon={TerminalSquare}>
          {recentOutcomes.length > 0 ? (
            recentOutcomes.map((outcome: any, index: number) => (
              <div key={index} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <div style={{ fontSize: 14, color: "#f7f2ea" }}>{outcome.profileName}</div>
                  <div style={{ fontSize: 11, opacity: 0.46, marginTop: 3 }}>{outcome.timestamp ? new Date(outcome.timestamp).toLocaleString() : "Unknown time"}</div>
                </div>
                <Badge text={outcome.outcome || "observed"} tone={outcome.outcome === "success" ? "READY" : outcome.outcome === "failure" ? "BLOCKED" : "DEGRADED"} />
              </div>
            ))
          ) : (
            <BodyNote>No launch outcomes yet.</BodyNote>
          )}
          <LinkCard to="/terminal" label="Open terminal control room" />
        </Panel>

        <Panel title="Evidence and research" subtitle="Trust layer" icon={Sparkles}>
          {evidenceBlocks.length > 0 ? (
            evidenceBlocks.map((block, index) => {
              const title = block.match(/## Evidence:\s*(.+)/)?.[1]?.trim() || `Evidence ${index + 1}`;
              return <EvidenceRow key={index} title={title} status={block.match(/Status:\s*(.+)/)?.[1]?.trim().toUpperCase() || "UNKNOWN"} />;
            })
          ) : (
            <BodyNote>No local evidence yet.</BodyNote>
          )}
          {research?.text && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.42, marginBottom: 8 }}>
                Latest research brief
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.74 }}>{String(research.text).slice(0, 220)}{String(research.text).length > 220 ? "..." : ""}</div>
            </div>
          )}
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
        <QuickLink to="/scan" icon={Scan} label="System Scan" desc="Refresh local readiness" />
        <QuickLink to="/launch" icon={PlayCircle} label="Launch Center" desc="Preview and start stacks" highlight />
        <QuickLink to="/profiles" icon={Layers3} label="Profiles" desc={`${profiles.length} agent profiles`} />
        <QuickLink to="/terminal" icon={TerminalSquare} label="Terminal" desc="Monitor sessions" />
        <QuickLink to="/settings" icon={Wrench} label="Settings" desc="Models and configuration" />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ minHeight: "55vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
      <div className="spin" style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid rgba(255,176,66,0.16)", borderTopColor: "#ffb042" }} />
      <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.46 }}>Loading mission control</div>
    </div>
  );
}

function Panel({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: any; children: ReactNode }) {
  return (
    <section style={{ padding: 22, borderRadius: 22, background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.45, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>{subtitle}</div>
          <div style={{ fontSize: 20, color: "#ffffff", fontWeight: 600, letterSpacing: "-0.03em" }}>{title}</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 14, background: "rgba(255,176,66,0.08)", border: "1px solid rgba(255,176,66,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={18} color="#ffb042" />
        </div>
      </div>
      {children}
    </section>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 11, opacity: 0.42, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 18, color: "#ffffff", fontWeight: 600, letterSpacing: "-0.03em" }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.56, marginTop: 6, lineHeight: 1.55 }}>{note}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ fontSize: 11, opacity: 0.42, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, color: "#ffffff", fontWeight: 600, letterSpacing: "-0.04em" }}>{value}</div>
    </div>
  );
}

function FlowStep({ number, title, body, ready }: { number: string; title: string; body: string; ready: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 12, padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", alignItems: "start" }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: ready ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.05)", color: ready ? "#86efac" : "#bfb8ab", fontSize: 13, fontWeight: 700 }}>{number}</div>
      <div>
        <div style={{ fontSize: 14, color: "#ffffff", fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 13, opacity: 0.68, lineHeight: 1.6, marginTop: 4 }}>{body}</div>
      </div>
      {ready ? <CheckCircle2 size={18} color="#86efac" /> : <AlertTriangle size={18} color="#bfb8ab" />}
    </div>
  );
}

function ActionCard({ to, icon: Icon, title, body }: { to: string; icon: any; title: string; body: string }) {
  return (
    <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(255,176,66,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={18} color="#ffb042" />
          </div>
          <div>
            <div style={{ fontSize: 14, color: "#f7f2ea", fontWeight: 600 }}>{title}</div>
            <div style={{ fontSize: 12, opacity: 0.56, marginTop: 4, lineHeight: 1.55 }}>{body}</div>
          </div>
        </div>
        <ChevronRight size={16} color="#bfb8ab" />
      </div>
    </Link>
  );
}

function EvidenceRow({ title, status }: { title: string; status: string }) {
  const tone = statusTone[status] || statusTone.UNKNOWN;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ fontSize: 14, color: "#f7f2ea" }}>{title}</div>
      <Badge text={tone.label} tone={status} />
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, actionLabel, actionTo }: { icon: any; title: string; body: string; actionLabel: string; actionTo: string }) {
  return (
    <div style={{ padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.025)", border: "1px dashed rgba(255,255,255,0.1)" }}>
      <div style={{ width: 46, height: 46, borderRadius: 16, background: "rgba(255,176,66,0.08)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <Icon size={20} color="#ffb042" />
      </div>
      <div style={{ fontSize: 18, color: "#ffffff", fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 13, opacity: 0.62, lineHeight: 1.65, marginTop: 8 }}>{body}</div>
      <Link to={actionTo} style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#ffb042", fontSize: 13, fontWeight: 600 }}>
        {actionLabel}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function BodyNote({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 13, opacity: 0.6, lineHeight: 1.65 }}>{children}</div>;
}

function LinkCard({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#ffb042", fontSize: 13, fontWeight: 600 }}>
      {label}
      <ArrowRight size={14} />
    </Link>
  );
}

function Badge({ text, tone }: { text: string; tone: string }) {
  const style = statusTone[tone] || statusTone.UNKNOWN;
  return (
    <span
      style={{
        padding: "7px 10px",
        borderRadius: 999,
        border: `1px solid ${style.border}`,
        background: style.bg,
        color: style.color,
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {text}
    </span>
  );
}

function QuickLink({ to, icon: Icon, label, desc, highlight }: { to: string; icon: any; label: string; desc: string; highlight?: boolean }) {
  return (
    <Link
      to={to}
      style={{
        textDecoration: "none",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 14,
        borderRadius: 16,
        border: highlight ? "1px solid rgba(255,176,66,0.25)" : "1px solid rgba(255,255,255,0.08)",
        background: highlight ? "rgba(255,176,66,0.08)" : "rgba(255,255,255,0.03)",
        color: "inherit",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Icon size={18} color={highlight ? "#ffb042" : "#d6d3d1"} />
        <ArrowRight size={15} color={highlight ? "#ffb042" : "#bfb8ab"} />
      </div>
      <div>
        <div style={{ fontSize: 14, color: highlight ? "#ffcf8b" : "#f7f2ea", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 12, opacity: 0.52, marginTop: 4 }}>{desc}</div>
      </div>
    </Link>
  );
}
