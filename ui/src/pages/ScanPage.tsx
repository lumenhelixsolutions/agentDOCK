import { useState } from "react";
import { api } from "@/lib/api";
import { Scan, Cpu, HardDrive, Microchip } from "lucide-react";

export default function ScanPage() {
  const [scan, setScan] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await api.runScan();
      setScan(s);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, fontWeight: 300, margin: "0 0 12px" }}>{title}</h3>
      {children}
    </div>
  );
}
