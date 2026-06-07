import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertTriangle, HelpCircle, Layers, Brain, Scan, Blocks, ChevronRight, Activity } from "lucide-react";
import { api } from "@/lib/api";

const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  READY: { color: "#4ade80", bg: "rgba(74, 222, 128, 0.08)", icon: CheckCircle2 },
  DEGRADED: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.08)", icon: AlertTriangle },
  BLOCKED: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.08)", icon: AlertTriangle },
  UNKNOWN: { color: "#6b7280", bg: "rgba(107, 114, 128, 0.08)", icon: HelpCircle },
};

export default function Dashboard() {
  const [profiles, setProfiles] = useState<Array<Record<string, unknown>> | null>(null);
  const [scan, setScan] = useState<Record<string, unknown> | null>(null);
  const [memory, setMemory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, m] = await Promise.all([api.getProfiles(), api.getMemory()]);
        if (!cancelled) {
          setProfiles(p);
          setMemory(m.text);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const runScan = async () => {
    setLoading(true);
    try {
      const s = await api.runScan();
      setScan(s);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profiles) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 32, height: 32, border: "2px solid rgba(255,176,66,0.2)", borderTopColor: "#ffb042", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 12, opacity: 0.5, letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading AgentDock...</span>
      </div>
    );
  }

  if (error && !profiles) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <AlertTriangle size={32} color="#ef4444" />
        <span style={{ fontSize: 14, color: "#ef4444" }}>Backend connection failed</span>
        <span style={{ fontSize: 12, opacity: 0.5, maxWidth: 400, textAlign: "center" }}>
          Ensure the AgentDock server is running on port 7777.
        </span>
      </div>
    );
  }

  const list = profiles || [];
  const readyCount = list.filter((p: any) => p.state === "READY" || p.meta?.status === "known-good").length;
  const blockedCount = list.filter((p: any) => p.state === "BLOCKED" || p.meta?.status === "blocked").length;
  const memoryBlocks = memory.split("## Evidence:").filter((b) => b.includes("Status: blocked")).length;

  const recentMemory = memory
    .split(/\n(?=## Evidence:)/g)
    .filter((b) => b.includes("## Evidence:"))
    .slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        <StatCard label="Profiles Ready" value={readyCount} total={list.length} icon={CheckCircle2} color="#4ade80" />
        <StatCard label="Blocked" value={blockedCount} icon={AlertTriangle} color="#ef4444" />
        <StatCard label="Memory Blocks" value={memoryBlocks} icon={Brain} color="#f59e0b" />
        <StatCard label="Profiles Total" value={list.length} icon={Layers} color="#60a5fa" />
      </div>

      <div>
        <SectionTitle>Quick Actions</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 16 }}>
          <QuickActionCard to="/terminal" icon={Blocks} label="Terminal" desc="Monitor active sessions" highlight />
          <QuickActionCard to="/scan" icon={Scan} label="Run System Scan" desc="Detect hardware, runtimes, tools" />
          <QuickActionCard to="/profiles" icon={Layers} label="Manage Profiles" desc={`${list.length} agent profiles configured`} />
          <QuickActionCard to="/memory" icon={Brain} label="Check Memory" desc="Anti-loop evidence log" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <SectionTitle>System Status</SectionTitle>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {scan ? (
              <>
                <StatusRow label="OS" value={String((scan as any).system?.os ?? "unknown")} />
                <StatusRow label="CPU" value={String((scan as any).hardware?.cpu ?? "Not scanned")} />
                <StatusRow label="RAM" value={`${(scan as any).hardware?.ram_gb ?? "?"} GB`} />
                <StatusRow label="Ollama" value={(scan as any).tools?.ollama?.present ? "installed" : "not installed"} />
                <StatusRow label="Loaded Models" value={`${((scan as any).ollama?.loaded_models ?? []).length}`} />
              </>
            ) : (
              <div style={{ padding: 24, textAlign: "center", opacity: 0.5 }}>
                No scan data yet. <button onClick={runScan} style={{ color: "#ffb042", background: "none", border: "none", cursor: "pointer" }}>Run a scan</button>
              </div>
            )}
          </div>
        </div>

        <div>
          <SectionTitle>Profile Status</SectionTitle>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {list.slice(0, 8).map((profile: any) => {
              const state = profile.state || profile.meta?.status || "UNKNOWN";
              const cfg = statusConfig[state] || statusConfig.UNKNOWN;
              const Icon = cfg.icon;
              return (
                <Link
                  key={profile.id}
                  to={`/profiles`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                >
                  <Icon size={14} color={cfg.color} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 400, color: "#f5f5f5" }}>{profile.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{profile.meta?.frontend} / {profile.meta?.backend} / {profile.meta?.model}</div>
                  </div>
                  <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500, color: cfg.color, padding: "2px 8px", borderRadius: 4, background: cfg.bg }}>
                    {state}
                  </span>
                  <span style={{ opacity: 0.3 }}><ChevronRight size={14} /></span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {recentMemory.length > 0 && (
        <div>
          <SectionTitle>Recent Memory Evidence</SectionTitle>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {recentMemory.map((entry, i) => {
              const status = entry.includes("Status: blocked") ? "blocked" : entry.includes("Status: success") ? "success" : "observed";
              const color = status === "blocked" ? "#ef4444" : status === "success" ? "#4ade80" : "#f59e0b";
              const title = entry.match(/## Evidence:\s*(.+)/)?.[1]?.trim() ?? `Entry ${i + 1}`;
              return (
                <div key={i} style={{ padding: "14px 16px", borderRadius: 8, background: status === "blocked" ? "rgba(239,68,68,0.04)" : status === "success" ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${status === "blocked" ? "rgba(239,68,68,0.1)" : status === "success" ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.04)"}`, display: "flex", alignItems: "center", gap: 12 }}>
                  <Activity size={14} color={color} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#f5f5f5" }}>{title}</div>
                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{status}</div>
                  </div>
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color }}>{status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, total, icon: Icon, color }: { label: string; value: number; total?: number; icon: any; color: string }) {
  return (
    <div style={{ padding: "24px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.5 }}>{label}</span>
        <Icon size={16} color={color} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 36, fontFamily: "'GeistMono', monospace", fontWeight: 300, color: "#ffffff", letterSpacing: "-2px" }}>{value}</span>
        {total !== undefined && <span style={{ fontSize: 13, opacity: 0.4 }}>/ {total}</span>}
      </div>
    </div>
  );
}

function QuickActionCard({ to, icon: Icon, label, desc, highlight }: { to: string; icon: any; label: string; desc: string; highlight?: boolean }) {
  return (
    <Link
      to={to}
      style={{
        padding: "20px",
        borderRadius: 12,
        background: highlight ? "rgba(255,176,66,0.04)" : "rgba(255,255,255,0.02)",
        border: highlight ? "1px solid rgba(255,176,66,0.2)" : "1px solid rgba(255,255,255,0.04)",
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,176,66,0.4)"; e.currentTarget.style.background = "rgba(255,176,66,0.06)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = highlight ? "rgba(255,176,66,0.2)" : "rgba(255,255,255,0.04)"; e.currentTarget.style.background = highlight ? "rgba(255,176,66,0.04)" : "rgba(255,255,255,0.02)"; }}
    >
      <Icon size={20} color={highlight ? "#ffb042" : undefined} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 400, color: highlight ? "#ffb042" : "#f5f5f5" }}>{label}</div>
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{desc}</div>
      </div>
    </Link>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, fontWeight: 300, fontFamily: "'Inter', sans-serif", margin: 0 }}>{children}</h2>;
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
      <span style={{ fontSize: 12, opacity: 0.5 }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: "'GeistMono', monospace", color: "#f5f5f5" }}>{value}</span>
    </div>
  );
}
