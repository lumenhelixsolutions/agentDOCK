import { useState, useEffect } from "react";
import { Key, Save, CheckCircle, Database, Sparkles } from "lucide-react";

interface ApiKeyConfig {
  provider: string;
  keyName: string;
  keyValue: string;
  endpoint?: string;
}

const DEFAULT_KEYS: ApiKeyConfig[] = [
  { provider: "gemini", keyName: "GEMINI_API_KEY", keyValue: "" },
  { provider: "openai", keyName: "OPENAI_API_KEY", keyValue: "" },
  { provider: "anthropic", keyName: "ANTHROPIC_API_KEY", keyValue: "" },
  { provider: "openrouter", keyName: "OPENROUTER_API_KEY", keyValue: "" },
  { provider: "moonshot", keyName: "MOONSHOT_API_KEY", keyValue: "" },
  { provider: "groq", keyName: "GROQ_API_KEY", keyValue: "" },
];

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKeyConfig[]>([]);
  const [saved, setSaved] = useState(false);
  const [modelProvider, setModelProvider] = useState("gemini");
  const [customEndpoint, setCustomEndpoint] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("agentdock_api_keys");
    if (stored) {
      setKeys(JSON.parse(stored));
    } else {
      setKeys(DEFAULT_KEYS);
    }
    setModelProvider(localStorage.getItem("agentdock_model_provider") || "gemini");
    setCustomEndpoint(localStorage.getItem("agentdock_custom_endpoint") || "");
  }, []);

  const updateKey = (provider: string, value: string) => {
    setKeys((prev) => prev.map((k) => (k.provider === provider ? { ...k, keyValue: value } : k)));
  };

  const save = () => {
    localStorage.setItem("agentdock_api_keys", JSON.stringify(keys));
    localStorage.setItem("agentdock_model_provider", modelProvider);
    localStorage.setItem("agentdock_custom_endpoint", customEndpoint);
    // Also set legacy keys for compatibility
    const gemini = keys.find((k) => k.provider === "gemini");
    if (gemini?.keyValue) localStorage.setItem("agentdock_gemini_key", gemini.keyValue);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getMasked = (v: string) => (v ? v.slice(0, 4) + "•".repeat(v.length - 4) : "");

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

      {/* Model Provider */}
      <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Sparkles size={16} color="#ffb042" />
          <h3 style={{ fontSize: 14, margin: 0, color: "#f5f5f5" }}>AI Coach Model</h3>
        </div>
        <p style={{ fontSize: 12, opacity: 0.5, margin: "0 0 12px" }}>
          Choose which model powers the AI assistant. If no key is provided, the rule-based advisor is used.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["gemini", "openai", "anthropic", "openrouter", "groq", "custom"].map((p) => (
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
            style={{
              marginTop: 12,
              width: "100%",
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#f5f5f5",
              fontSize: 13,
              fontFamily: "'GeistMono', monospace",
            }}
          />
        )}
      </div>

      {/* API Keys */}
      <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Key size={16} color="#ffb042" />
          <h3 style={{ fontSize: 14, margin: 0, color: "#f5f5f5" }}>API Keys</h3>
        </div>
        <p style={{ fontSize: 12, opacity: 0.5, margin: "0 0 16px" }}>
          Keys are stored locally in your browser. They are never sent to any server except the model provider you select.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {keys.map((k) => (
            <div key={k.provider} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, width: 120, textTransform: "uppercase", opacity: 0.6, letterSpacing: "0.05em" }}>{k.provider}</span>
              <input
                type="password"
                value={k.keyValue}
                onChange={(e) => updateKey(k.provider, e.target.value)}
                placeholder={`Enter ${k.keyName}...`}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  color: "#f5f5f5",
                  fontSize: 13,
                  fontFamily: "'GeistMono', monospace",
                }}
              />
              {k.keyValue && (
                <span style={{ fontSize: 11, color: "#4ade80", opacity: 0.7, fontFamily: "'GeistMono', monospace" }}>
                  {getMasked(k.keyValue)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Data */}
      <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Database size={16} color="#ffb042" />
          <h3 style={{ fontSize: 14, margin: 0, color: "#f5f5f5" }}>Local Data</h3>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { if (confirm("Clear all API keys?")) { localStorage.removeItem("agentdock_api_keys"); localStorage.removeItem("agentdock_gemini_key"); setKeys(DEFAULT_KEYS); } }}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.1)",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Clear API Keys
          </button>
          <button
            onClick={() => { if (confirm("Clear chat history?")) localStorage.removeItem("agentdock_chat_history"); }}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#dadada",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Clear Chat History
          </button>
        </div>
      </div>
    </div>
  );
}
