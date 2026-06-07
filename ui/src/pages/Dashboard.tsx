import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2, AlertTriangle, HelpCircle, Layers, Brain, Scan,
  Blocks, Terminal, Activity, TrendingUp, TrendingDown, Minus,
  Zap, Shield, Wrench, ChevronRight, Clock, Package,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";

const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2; label: string }> = {
  READY: { color: "#4ade80", bg: "rgba(74, 222, 128, 0.08)", icon: CheckCircle2, label: "Ready" },
  DEGRADED: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.08)", icon: AlertTriangle, label: "Fixable" },
  BLOCKED: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.08)", icon: AlertTriangle, label: "Blocked" },
  UNKNOWN: { color: "#6b7280", bg: "rgba(107, 114, 128, 0.08)", icon: HelpCircle, label: "Unknown" },
};

const PIE_COLORS = ["#4ade80", "#f59e0b", "#ef4444", "#6b7280", "#60a5fa"];

export default function Dashboard() {
  const [profiles, setProfiles] = useState<Array<any>>([]);
  const [scan, setScan] = useState<any>(null);
  const [memory, setMemory] = useState("");
  const [usage, setUsage] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [research, setResearch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getProfiles(),
      api.runScan().catch(() => null),
      api.getMemory(),
      api.getUsage().catch(() => null),
      api.getPortfolioHealth().catch(() => null),
      api.getResearch().catch(() => null),
    ]).then(([p, s, m, u, ph, r]) => {
      setProfiles(p);
      setScan(s);
      setMemory(m.text);
      setUsage(u);
      setPortfolio(ph);
      setResearch(r);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const list = profiles || [];
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { READY: 0, DEGRADED: 0, BLOCKED: 0, UNKNOWN: 0 };
    for (const p of list) {
      const state = p.state || p.meta?.status || "UNKNOWN";
      counts[state] = (counts[state] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [list]);

  const outcomeData = useMemo(() => {
    if (!usage?.outcomes) return [];
    const byDay: Record<string, { success: number; failure: number; partial: number }> = {};
    for (const o of usage.outcomes.slice(-30)) {
      const day = new Date(o.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      if (!byDay[day]) byDay[day] = { success: 0, failure: 0, partial: 0 };
      byDay[day][o.outcome as keyof typeof byDay[string]] = (byDay[day][o.outcome as keyof typeof byDay[string]] || 0) + 1;
    }
    return Object.entries(byDay).map(([day, vals]) => ({ day, ...vals }));
  }, [usage]);

  const recentOutcomes = useMemo(() => {
    return (usage?.outcomes || []).slice(-10).reverse();
  }, [usage]);

  const recentMemory = useMemo(() => {
    return memory
      .split(/\n(?=## Evidence:)/g)
      .filter((b) => b.includes("## Evidence:"))
      .slice(0, 5);
  }, [memory]);

  const portfolioIssues = useMemo(() => {
    return (portfolio?.items || []).filter((i: any) => i.issues.length > 0);
  }, [portfolio]);

  const installed = scan?.coders?.filter((c: any) => c.detection?.present).length || 0;
  const missing = (scan?.coders?.length || 0) - installed;
  const ollamaStatus = scan?.tools?.ollama?.present ? "Running" : "Not installed";
  const loadedModels = (scan?.ollama?.loaded_models || []).length;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
        <div className="spin" style={{ width: 32, height: 32, border: "2px solid rgba(255,176,66,0.2)", borderTopColor: "#ffb042", borderRadius: "50%" }} />
        <span style={{ fontSize: 12, opacity: 0.5, letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading AgentDock...</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Top Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Profiles Ready" value={statusCounts.find((s) => s.name === "READY")?.value || 0} total={list.length} icon={CheckCircle2} color="#4ade80" trend="up" />
        <StatCard label="Agents Installed" value={installed} total={scan?.coders?.length || 0} icon={Package} color="#60a5fa" trend={installed > 5 ? "up" : "down"} />
        <StatCard label="Models Loaded" value={loadedModels} icon={Layers} color="#f59e0b" trend="neutral" />
        <StatCard label="Portfolio Issues" value={portfolioIssues.length} icon={Shield} color="#ef4444" trend={portfolioIssues.length > 0 ? "down" : "up"} />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ChartCard title="Profile Status Distribution">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {statusCounts.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
            {statusCounts.map((s, i) => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i] }} />
                <span style={{ opacity: 0.7 }}>{s.name}</span>
                <span style={{ fontFamily: "'GeistMono', monospace" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Session Outcomes (Last 30 Days)">
          {outcomeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={outcomeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#666" }} />
                <YAxis tick={{ fontSize: 10, fill: "#666" }} />
                <Tooltip contentStyle={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="success" fill="#4ade80" radius={[2, 2, 0, 0]} />
                <Bar dataKey="partial" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                <Bar dataKey="failure" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4, fontSize: 12 }}>
              No session history yet. Launch a profile to start tracking.
            </div>
          )}
        </ChartCard>
      </div>

      {/* Quick Actions */}
      <div>
        <SectionTitle>Quick Actions</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 12 }}>
          <QuickActionCard to="/builder" icon={Blocks} label="Stack Builder" desc="Visual pipeline + install guides" highlight />
          <QuickActionCard to="/terminal" icon={Terminal} label="Terminal" desc="Monitor active sessions" />
          <QuickActionCard to="/scan" icon={Scan} label="System Scan" desc="Detect hardware & tools" />
          <QuickActionCard to="/profiles" icon={Layers} label="Profiles" desc={`${list.length} agent profiles`} />
          <QuickActionCard to="/settings" icon={Wrench} label="Settings" desc="API keys & models" />
        </div>
      </div>

      {/* Three Column: System + Activity + Memory */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {/* System Status */}
        <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <SectionTitle style={{ marginBottom: 12 }}>System Status</SectionTitle>
          <StatusRow label="OS" value={scan?.system?.os || "unknown"} />
          <StatusRow label="CPU" value={scan?.hardware?.cpu || "unknown"} />
          <StatusRow label="RAM" value={`${scan?.hardware?.ram_gb ?? "?"} GB`} />
          <StatusRow label="GPU" value={scan?.hardware?.gpu?.[0]?.name || "none"} />
          <StatusRow label="Ollama" value={ollamaStatus} />
          <StatusRow label="Loaded Models" value={`${loadedModels}`} />
          <StatusRow label="Local Backends" value={`${scan?.local_models?.backends?.filter((b: any) => b.present).length || 0}`} />
          <StatusRow label=".env Files" value={`${scan?.env_files?.length || 0}`} />
          <div style={{ marginTop: 10 }}>
            <Link to="/scan" style={{ fontSize: 11, color: "#ffb042", textDecoration: "none" }}>Run fresh scan →</Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionTitle style={{ marginBottom: 4 }}>Recent Activity</SectionTitle>
          {recentOutcomes.length === 0 ? (
            <div style={{ opacity: 0.4, fontSize: 12, padding: "20px 0", textAlign: "center" }}>No launches yet.</div>
          ) : (
            recentOutcomes.map((o: any, i: number) => {
              const color = o.outcome === "success" ? "#4ade80" : o.outcome === "failure" ? "#ef4444" : "#f59e0b";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <Activity size={12} color={color} />
                  <div style={{ flex: 1, fontSize: 12 }}>
                    <span style={{ color: "#f5f5f5" }}>{o.profileName}</span>
                    <span style={{ opacity: 0.4 }}> · {o.outcome}</span>
                  </div>
                  <span style={{ fontSize: 10, opacity: 0.3, fontFamily: "'GeistMono', monospace" }}>
                    {new Date(o.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Memory Evidence */}
        <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionTitle style={{ marginBottom: 4 }}>Memory Evidence</SectionTitle>
          {recentMemory.length === 0 ? (
            <div style={{ opacity: 0.4, fontSize: 12, padding: "20px 0", textAlign: "center" }}>No memory entries.</div>
          ) : (
            recentMemory.map((entry, i) => {
              const status = entry.includes("Status: blocked") ? "blocked" : entry.includes("Status: success") ? "success" : "observed";
              const color = status === "blocked" ? "#ef4444" : status === "success" ? "#4ade80" : "#f59e0b";
              const title = entry.match(/## Evidence:\s*(.+)/)?.[1]?.trim() ?? `Entry ${i + 1}`;
              return (
                <div key={i} style={{ padding: 8, borderRadius: 6, background: `${color}08`, border: `1px solid ${color}15`, fontSize: 11, lineHeight: 1.4 }}>
                  <div style={{ color: "#f5f5f5", fontWeight: 500 }}>{title}</div>
                  <div style={{ opacity: 0.5, marginTop: 2, textTransform: "uppercase", fontSize: 9, letterSpacing: "0.05em", color }}>{status}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Portfolio Health */}
      {portfolioIssues.length > 0 && (
        <div style={{ padding: 20, borderRadius: 12, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={14} color="#ef4444" />
            <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 500 }}>Portfolio Health Issues</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {portfolioIssues.slice(0, 5).map((item: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ opacity: 0.7 }}>{item.name}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ color: "#f59e0b" }}>{item.issues.join(", ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Research Brief */}
      {research?.text && (
        <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <SectionTitle>Latest Research Brief</SectionTitle>
            <span style={{ fontSize: 11, opacity: 0.4 }}>{research.name}</span>
          </div>
          <pre style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.7, whiteSpace: "pre-wrap", fontFamily: "'Inter', sans-serif", margin: 0, maxHeight: 120, overflow: "auto" }}>
            {research.text.slice(0, 800)}{research.text.length > 800 ? "..." : ""}
          </pre>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, total, icon: Icon, color, trend }: { label: string; value: number; total?: number; icon: any; color: string; trend: "up" | "down" | "neutral" }) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return (
    <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.5 }}>{label}</span>
        <Icon size={16} color={color} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 32, fontFamily: "'GeistMono', monospace", fontWeight: 300, color: "#ffffff", letterSpacing: "-2px" }}>{value}</span>
        {total !== undefined && <span style={{ fontSize: 13, opacity: 0.4 }}>/ {total}</span>}
        <TrendIcon size={14} color={trend === "up" ? "#4ade80" : trend === "down" ? "#ef4444" : "#6b7280"} style={{ marginLeft: "auto" }} />
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <h3 style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, fontWeight: 300, margin: "0 0 12px" }}>{title}</h3>
      {children}
    </div>
  );
}

function QuickActionCard({ to, icon: Icon, label, desc, highlight }: { to: string; icon: any; label: string; desc: string; highlight?: boolean }) {
  return (
    <Link
      to={to}
      style={{
        padding: 16,
        borderRadius: 12,
        background: highlight ? "rgba(255,176,66,0.04)" : "rgba(255,255,255,0.02)",
        border: highlight ? "1px solid rgba(255,176,66,0.2)" : "1px solid rgba(255,255,255,0.04)",
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,176,66,0.4)"; e.currentTarget.style.background = "rgba(255,176,66,0.06)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = highlight ? "rgba(255,176,66,0.2)" : "rgba(255,255,255,0.04)"; e.currentTarget.style.background = highlight ? "rgba(255,176,66,0.04)" : "rgba(255,255,255,0.02)"; }}
    >
      <Icon size={18} color={highlight ? "#ffb042" : undefined} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: highlight ? "#ffb042" : "#f5f5f5" }}>{label}</div>
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 3 }}>{desc}</div>
      </div>
    </Link>
  );
}

function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <h2 style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, fontWeight: 300, fontFamily: "'Inter', sans-serif", margin: 0, ...style }}>{children}</h2>;
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
      <span style={{ fontSize: 12, opacity: 0.5 }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: "'GeistMono', monospace", color: "#f5f5f5" }}>{value}</span>
    </div>
  );
}
