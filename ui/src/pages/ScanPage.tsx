import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useCoach } from "@/context/CoachContext";
import { hootSignal } from "@/lib/hoot-signals";
import { Scan, Cpu, HardDrive, Microchip, Radar, Flame } from "lucide-react";
import { BRAND } from "@/lib/brand";
import TokenBurnPanel, { type TokenBurnReport } from "@/components/TokenBurnPanel";
import { grokFieldsFromRadar } from "@/lib/grok-radar";

type AgentRadar = Awaited<ReturnType<typeof api.getAgentRadar>>;

export default function ScanPage() {
  const [scan, setScan] = useState<Record<string, unknown> | null>(null);
  const [radar, setRadar] = useState<AgentRadar | null>(null);
  const [radarLoading, setRadarLoading] = useState(false);
  const [tokenBurn, setTokenBurn] = useState<TokenBurnReport | null>(null);
  const [burnLoading, setBurnLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pageContext, setPageContext, registerActionHandler, setHootMood, setHootStatus, reportError } = useCoach();

  const refreshBurn = async (forceRtk = false) => {
    setBurnLoading(true);
    setPageContext({ burnLoading: true });
    try {
      const data = await api.getTokenBurn(forceRtk);
      setTokenBurn(data);
      const saved = data.formatted?.total_saved;
      setPageContext({
        tokenBurnRisk: data.risk?.level,
        tokenBurnSaved: saved,
        rtkPresent: data.prevention?.rtk?.present,
        ...(data.risk?.level === "low" && saved ? hootSignal("burn:savings", 5000) : {}),
      });
    } catch (e) {
      reportError({
        message: e instanceof Error ? e.message : String(e),
        source: "token burn",
        fix: "Ensure the server is running and a system scan has completed.",
      });
    } finally {
      setBurnLoading(false);
      setPageContext({ burnLoading: false });
    }
  };

  const refreshRadar = async (force = true) => {
    setRadarLoading(true);
    setPageContext({ radarLoading: true });
    try {
      const data = await api.getAgentRadar(force);
      setRadar(data);
      setPageContext({
        agentRadarTotal: data.summary?.total ?? 0,
        agentRadarDock: data.summary?.dock ?? 0,
        agentRadarExternal: data.summary?.external ?? 0,
        agentRadarAgents: data.agents ?? [],
        agentRadarScannedAt: data.scanned_at,
        radarLoading: false,
        ...grokFieldsFromRadar(data),
      });
    } catch (e) {
      reportError({
        message: e instanceof Error ? e.message : String(e),
        source: "agent radar",
        fix: "Ensure PowerShell can run agent-radar.ps1 (same policy as system scan).",
      });
      setPageContext({ radarLoading: false });
    } finally {
      setRadarLoading(false);
    }
  };

  useEffect(() => {
    refreshRadar(false);
    refreshBurn(false);
  }, []);

  useEffect(() => {
    const coders = (scan?.coders || []) as any[];
    setPageContext({
      scanLoaded: Boolean(scan),
      ollamaPresent: Boolean((scan?.tools as any)?.ollama?.present),
      missingAgents: coders.filter((c) => !c.detection?.present).length,
    });
  }, [scan, setPageContext]);

  useEffect(() => {
    if (pageContext.agentRadarTotal != null && !radar) {
      setRadar({
        scanned_at: String(pageContext.agentRadarScannedAt || new Date().toISOString()),
        processes: [],
        agents: (pageContext.agentRadarAgents as AgentRadar["agents"]) || [],
        summary: {
          total: Number(pageContext.agentRadarTotal) || 0,
          dock: Number(pageContext.agentRadarDock) || 0,
          external: Number(pageContext.agentRadarExternal) || 0,
          agent_types: ((pageContext.agentRadarAgents as any[]) || []).length,
        },
      });
    }
  }, [pageContext, radar]);

  const run = async () => {
    setLoading(true);
    setError(null);
    setPageContext({ scanLoading: true });
    setHootStatus("Scanning your system…");
    try {
      const s = await api.runScan();
      setScan(s);
      const rtkPresent = Boolean((s as any)?.tools?.rtk?.present);
      await refreshBurn(rtkPresent);
      setHootMood("celebrating", { ttl: 2500 });
      setHootStatus(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      reportError({
        message: msg,
        source: "system scan",
        fix: "PowerShell scanner failed — HOOT can help diagnose. Try: Set-ExecutionPolicy Bypass -Scope Process, then re-run scan.",
      });
    } finally {
      setLoading(false);
      setPageContext({ scanLoading: false });
      setHootStatus(null);
    }
  };

  useEffect(() => {
    return registerActionHandler((target) => {
      if (target === "scan-run") run();
      if (target === "radar-refresh") refreshRadar(true);
      if (target === "token-burn-refresh") refreshBurn(true);
    });
  });

  const hw = (scan?.hardware || {}) as any;
  const tools = (scan?.tools || {}) as any;
  const coders = (scan?.coders || []) as any[];
  const envFiles = (scan?.env_files || []) as any[];
  const localBackends = (scan?.local_models as any)?.backends || [];
  const ggufs = (scan?.local_models as any)?.discovered_ggufs || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>System Scan</h2>
        <button
          onClick={run}
          disabled={loading}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "1px solid rgba(255,176,66,0.3)",
            background: "rgba(255,176,66,0.1)",
            color: "#ffb042",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Scan size={16} />
          {loading ? "Scanning..." : "Run Scan"}
        </button>
      </div>

      {error && <div style={{ padding: 16, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13 }}>{error}</div>}

      <Section title="Token burn prevention">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.65, lineHeight: 1.5, display: "flex", alignItems: "center", gap: 8 }}>
            <Flame size={14} color="#fb923c" />
            RTK prevention layer — risk assessment and savings from <code style={{ opacity: 0.85 }}>rtk gain</code>.
          </p>
        </div>
        <TokenBurnPanel data={tokenBurn} loading={burnLoading} onRefresh={() => refreshBurn(true)} compact />
      </Section>

      <Section title="Agent Radar — running processes">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.65, lineHeight: 1.5 }}>
            System-wide scan for coding agents (Claude, Codex, Gemini, Cursor, etc.) — {BRAND.dockLabel} vs {BRAND.externalLabel}.
          </p>
          <button
            onClick={() => refreshRadar(true)}
            disabled={radarLoading}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgba(52,211,153,0.3)",
              background: "rgba(52,211,153,0.08)",
              color: "#34d399",
              cursor: radarLoading ? "not-allowed" : "pointer",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <Radar size={14} />
            {radarLoading ? "Scanning…" : "Refresh"}
          </button>
        </div>
        {radar ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <RadarStat label="Total" value={radar.summary.total} color="#f5f5f5" />
              <RadarStat label={BRAND.dockLabel} value={radar.summary.dock} color="#4ade80" />
              <RadarStat label="External" value={radar.summary.external} color={radar.summary.external > 0 ? "#fb923c" : "#6b7280"} />
              <RadarStat label="Types" value={radar.summary.agent_types} color="#93c5fd" />
            </div>
            {(radar.agents || []).length > 0 ? (
              (radar.agents || []).map((agent) => (
                <div key={agent.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize: 13 }}>{agent.name}</span>
                  <span style={{ fontSize: 12, opacity: 0.75 }}>
                    {agent.count} proc · <span style={{ color: "#4ade80" }}>{agent.dock} dock</span>
                    {agent.external > 0 && <span style={{ color: "#fb923c" }}> · {agent.external} ext</span>}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, opacity: 0.5, padding: "8px 0" }}>No coding-agent processes detected.</div>
            )}
            {radar.scanned_at && (
              <div style={{ fontSize: 10, opacity: 0.4 }}>Last scan {new Date(radar.scanned_at).toLocaleTimeString()}{radar.cached ? " · cached" : ""}</div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.5 }}>Loading agent radar…</div>
        )}
      </Section>

      {scan && (scan as any).key_vault?.imported > 0 && (
        <div style={{ padding: 12, borderRadius: 8, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80", fontSize: 13 }}>
          Imported {(scan as any).key_vault.imported} API key{(scan as any).key_vault.imported === 1 ? "" : "s"} into local vault
          {((scan as any).key_vault.keys || []).length > 0 && (
            <span style={{ opacity: 0.8 }}> — {((scan as any).key_vault.keys as any[]).map((k) => k.masked).join(", ")}</span>
          )}
        </div>
      )}

      {scan && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <InfoCard icon={Cpu} label="CPU" value={hw.cpu || "unknown"} />
            <InfoCard icon={HardDrive} label="RAM" value={`${hw.ram_gb ?? "?"} GB`} />
            <InfoCard icon={Microchip} label="GPU" value={hw.gpu?.[0]?.name || "none"} />
          </div>

          <Section title="AI Tools">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {coders.map((c: any) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize: 13 }}>{c.name}</span>
                  <span style={{ fontSize: 12, color: c.detection?.present ? "#4ade80" : "#ef4444" }}>{c.detection?.present ? "Installed" : "Missing"}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Local Model Backends">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {localBackends.map((b: any) => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize: 13 }}>{b.name}</span>
                  <span style={{ fontSize: 12, color: b.present ? "#4ade80" : "#6b7280" }}>{b.present ? "Detected" : "Not found"}</span>
                </div>
              ))}
            </div>
          </Section>

          {ggufs.length > 0 && (
            <Section title="Discovered .gguf Files">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ggufs.map((g: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <span style={{ fontSize: 13, fontFamily: "'GeistMono', monospace" }}>{g.name}</span>
                    <span style={{ fontSize: 12, opacity: 0.5 }}>{g.size_mb} MB</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title=".env Files">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {envFiles.map((f: any, i: number) => (
                <div key={i} style={{ padding: 12, borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 12, fontFamily: "'GeistMono', monospace", marginBottom: 4 }}>{f.path}</div>
                  <div style={{ fontSize: 11, opacity: 0.5 }}>Keys: {(f.key_names || []).join(", ")}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={16} color="#ffb042" />
        <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.5 }}>{label}</span>
      </div>
      <span style={{ fontSize: 14, color: "#f5f5f5", fontFamily: "'GeistMono', monospace" }}>{value}</span>
    </div>
  );
}

function RadarStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.45 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, fontWeight: 300, margin: "0 0 12px" }}>{title}</h3>
      {children}
    </div>
  );
}
