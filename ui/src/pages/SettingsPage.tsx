import { useState, useEffect } from "react";
import { Key, Save, CheckCircle, Database, Sparkles, Cpu, Zap, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { useCoach } from "@/context/CoachContext";

type VaultKeyRow = {
  name: string;
  provider: string;
  masked: string;
  source: string;
  updatedAt: string;
};

const KEY_DEFS = [
  { provider: "gemini", keyName: "GEMINI_API_KEY" },
  { provider: "openai", keyName: "OPENAI_API_KEY" },
  { provider: "anthropic", keyName: "ANTHROPIC_API_KEY" },
  { provider: "openrouter", keyName: "OPENROUTER_API_KEY" },
  { provider: "moonshot", keyName: "MOONSHOT_API_KEY" },
  { provider: "groq", keyName: "GROQ_API_KEY" },
  { provider: "xai", keyName: "XAI_API_KEY" },
];

interface LlamaCppSettings {
  enabled: boolean;
  binary: string;
  modelPath: string;
  host: string;
  port: number;
  contextSize: number;
  nGpuLayers: number;
  threads: number;
  extraArgs: string;
}

interface ServerSettings {
  localInference: {
    preferredBackend: string;
    llamacpp: LlamaCppSettings;
  };
  tokenEfficiency: { rtkRecommended: boolean };
}

export default function SettingsPage() {
  const { setPageContext } = useCoach();
  const [vaultKeys, setVaultKeys] = useState<VaultKeyRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [modelProvider, setModelProvider] = useState("gemini");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [serverSettings, setServerSettings] = useState<ServerSettings | null>(null);
  const [scanHints, setScanHints] = useState<{ rtk?: { present?: boolean }; wsl?: { present?: boolean }; llamacpp?: { present?: boolean; server?: { reachable?: boolean } } } | null>(null);

  const loadKeys = () => {
    api.getKeys().then((r) => setVaultKeys(r.keys || [])).catch(() => setVaultKeys([]));
  };

  useEffect(() => {
    setModelProvider(localStorage.getItem("agentdock_model_provider") || "gemini");
    setCustomEndpoint(localStorage.getItem("agentdock_custom_endpoint") || "");
    loadKeys();
    api.getSettings().then((r) => {
      setServerSettings(r.settings);
      setScanHints(r.scanHints);
      if (r.keys?.length) setVaultKeys(r.keys);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setPageContext({
      llamacppEnabled: Boolean(serverSettings?.localInference?.llamacpp?.enabled),
      llamacppInterest: Boolean(scanHints?.llamacpp?.present || scanHints?.llamacpp?.server?.reachable),
      vaultKeyCount: vaultKeys.length,
    });
  }, [serverSettings, scanHints, vaultKeys.length, setPageContext]);

  const updateLlama = (patch: Partial<LlamaCppSettings>) => {
    setServerSettings((prev) =>
      prev
        ? {
            ...prev,
            localInference: {
              ...prev.localInference,
              llamacpp: { ...prev.localInference.llamacpp, ...patch },
            },
          }
        : prev
    );
  };

  const syncFromScan = async () => {
    setSyncing(true);
    try {
      const r = await api.syncKeys();
      setVaultKeys((r.keys || []) as VaultKeyRow[]);
    } finally {
      setSyncing(false);
    }
  };

  const save = async () => {
    localStorage.setItem("agentdock_model_provider", modelProvider);
    localStorage.setItem("agentdock_custom_endpoint", customEndpoint);
    for (const [name, value] of Object.entries(drafts)) {
      if (value.trim()) await api.saveKey(name, value.trim());
    }
    setDrafts({});
    loadKeys();
    if (serverSettings) {
      try {
        await api.saveSettings(serverSettings);
      } catch {
        /* optional */
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    color: "#f5f5f5",
    fontSize: 13,
    fontFamily: "'GeistMono', monospace",
  };

  const rowFor = (keyName: string) => vaultKeys.find((k) => k.name === keyName);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Settings</h2>
        <button
          onClick={save}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "1px solid rgba(74,222,128,0.3)",
            background: saved ? "rgba(74,222,128,0.2)" : "rgba(74,222,128,0.1)",
            color: "#4ade80",
            cursor: "pointer",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {saved ? <CheckCircle size={14} /> : <Save size={14} />}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>

      <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Sparkles size={16} color="#ffb042" />
          <h3 style={{ fontSize: 14, margin: 0, color: "#f5f5f5" }}>HOOT Model</h3>
        </div>
        <p style={{ fontSize: 12, opacity: 0.5, margin: "0 0 12px" }}>
          Coach uses keys from the local vault (auto-imported on scan). No key → screen-aware local coach.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["gemini", "openai", "anthropic", "openrouter", "groq", "xai", "custom"].map((p) => (
            <button
              key={p}
              onClick={() => setModelProvider(p)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid",
                borderColor: modelProvider === p ? "rgba(255,176,66,0.4)" : "rgba(255,255,255,0.08)",
                background: modelProvider === p ? "rgba(255,176,66,0.1)" : "rgba(255,255,255,0.02)",
                color: modelProvider === p ? "#ffb042" : "#dadada",
                cursor: "pointer",
                fontSize: 12,
                textTransform: "capitalize",
              }}
            >
              {p}
            </button>
          ))}
        </div>
        {modelProvider === "custom" && (
          <input
            value={customEndpoint}
            onChange={(e) => setCustomEndpoint(e.target.value)}
            placeholder="https://api.openai.com/v1/chat/completions"
            style={{ ...inputStyle, marginTop: 12 }}
          />
        )}
      </div>

      {serverSettings && (
        <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Cpu size={16} color="#4ade80" />
            <h3 style={{ fontSize: 14, margin: 0, color: "#f5f5f5" }}>Local Inference (llama.cpp)</h3>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={serverSettings.localInference.llamacpp.enabled}
              onChange={(e) => updateLlama({ enabled: e.target.checked })}
            />
            Enable llama.cpp backend
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["binary", "Binary (llama-server)", "text"],
              ["modelPath", "GGUF model path", "text"],
              ["host", "Host", "text"],
              ["port", "Port", "number"],
            ].map(([key, label, type]) => (
              <div key={key} style={{ gridColumn: key === "modelPath" ? "1 / -1" : undefined }}>
                <label style={{ fontSize: 11, opacity: 0.5, display: "block", marginBottom: 4 }}>{label}</label>
                <input
                  type={type}
                  value={String((serverSettings.localInference.llamacpp as Record<string, unknown>)[key] ?? "")}
                  onChange={(e) =>
                    updateLlama({
                      [key]: type === "number" ? Number(e.target.value) : e.target.value,
                    } as Partial<LlamaCppSettings>)
                  }
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Key size={16} color="#ffb042" />
            <h3 style={{ fontSize: 14, margin: 0, color: "#f5f5f5" }}>API Keys (local vault)</h3>
          </div>
          <button
            type="button"
            onClick={syncFromScan}
            disabled={syncing}
            style={{
              padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.03)", color: "#dadada", cursor: "pointer", fontSize: 11,
              display: "flex", alignItems: "center", gap: 6, opacity: syncing ? 0.6 : 1,
            }}
          >
            <RefreshCw size={12} />
            {syncing ? "Syncing…" : "Pull from scan"}
          </button>
        </div>
        <p style={{ fontSize: 12, opacity: 0.5, margin: "0 0 16px" }}>
          Keys auto-import from process env and scanned <code>.env</code> files on every Readiness scan.
          Stored in <code>state/key-vault.json</code> on your machine. UI shows last 3 characters only.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {KEY_DEFS.map((def) => {
            const stored = rowFor(def.keyName);
            return (
              <div key={def.keyName} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, width: 100, textTransform: "uppercase", opacity: 0.6 }}>{def.provider}</span>
                <input
                  type="password"
                  value={drafts[def.keyName] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [def.keyName]: e.target.value }))}
                  placeholder={stored ? `Stored ${stored.masked}` : `Enter ${def.keyName}…`}
                  style={{ ...inputStyle, flex: 1 }}
                />
                {stored && !drafts[def.keyName] && (
                  <span style={{ fontSize: 11, color: "#4ade80", fontFamily: "'GeistMono', monospace", minWidth: 72 }}>
                    {stored.masked}
                  </span>
                )}
                {stored && (
                  <span style={{ fontSize: 10, opacity: 0.45, maxWidth: 120 }} title={stored.source}>
                    {stored.source.startsWith("env-file") ? "from .env" : stored.source}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {vaultKeys.length > 0 && (
          <p style={{ fontSize: 11, color: "#4ade80", margin: "12px 0 0" }}>
            {vaultKeys.length} key{vaultKeys.length === 1 ? "" : "s"} in vault — used for coach, stack builder, and launches.
          </p>
        )}
      </div>

      <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Zap size={16} color="#fbbf24" />
          <h3 style={{ fontSize: 14, margin: 0, color: "#f5f5f5" }}>Token Efficiency (RTK)</h3>
        </div>
        {scanHints && (
          <p style={{ fontSize: 11, margin: 0, color: scanHints.rtk?.present ? "#4ade80" : "#fbbf24" }}>
            RTK: {scanHints.rtk?.present ? "installed" : "not detected"}
          </p>
        )}
      </div>

      <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Database size={16} color="#ffb042" />
          <h3 style={{ fontSize: 14, margin: 0, color: "#f5f5f5" }}>Local Data</h3>
        </div>
        <button
          onClick={async () => {
            if (!confirm("Clear all vault API keys?")) return;
            for (const k of vaultKeys) await api.deleteKey(k.name);
            setVaultKeys([]);
            localStorage.removeItem("agentdock_api_keys");
            localStorage.removeItem("agentdock_gemini_key");
          }}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer", fontSize: 12,
          }}
        >
          Clear API Keys
        </button>
      </div>
    </div>
  );
}