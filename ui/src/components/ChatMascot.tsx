import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { MessageCircle, X, Send, Bot, User, Wrench, Sparkles } from "lucide-react";

interface ChatMsg {
  role: "user" | "ai";
  text: string;
  commands?: Array<any>;
}

const SESSION_ID = "ui-mascot-" + Math.random().toString(36).slice(2, 8);

function getApiKey(): string | null {
  return localStorage.getItem("agentdock_gemini_key") || localStorage.getItem("agentdock_api_key");
}

function getModelProvider(): string {
  return localStorage.getItem("agentdock_model_provider") || "gemini";
}

function getModelName(): string | null {
  return localStorage.getItem("agentdock_model_name");
}

function getCustomEndpoint(): string | null {
  return localStorage.getItem("agentdock_custom_endpoint");
}

export default function ChatMascot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role: "ai", text: "🤖 Hello! I'm your AgentDock AI coach. I can help you choose stacks, troubleshoot launches, and configure your system. What are we working on today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await api.chat(SESSION_ID, text, {
        provider: getModelProvider(),
        model: getModelName() || undefined,
        apiKey: getApiKey() || undefined,
        customEndpoint: getCustomEndpoint() || undefined,
      });
      setMsgs((m) => [...m, { role: "ai", text: res.text || "...", commands: res.commands }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "ai", text: "⚠️ " + e.message }]);
    } finally {
      setLoading(false);
    }
  };

  const executeCmd = (cmd: any) => {
    switch (cmd.type) {
      case "launch":
        window.location.href = "/profiles";
        break;
      case "runScan":
        window.location.href = "/scan";
        break;
      case "switchProject":
        window.location.href = "/";
        break;
      case "showMessage":
        alert(cmd.text);
        break;
      case "openUrl":
        window.open(cmd.url, "_blank");
        break;
      default:
        break;
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #c8966a, #e8a050)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 32px rgba(232,160,80,0.3)",
            zIndex: 100,
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <MessageCircle size={26} color="#0a0a0a" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            width: 420,
            height: 560,
            background: "#0d0d0d",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Bot size={18} color="#ffb042" />
              <span style={{ fontSize: 14, fontWeight: 500, color: "#f5f5f5" }}>AI Coach</span>
              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>
                {getApiKey() ? getModelProvider().toUpperCase() : "RULE-BASED"}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: "#dadada", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: m.role === "user" ? "rgba(255,255,255,0.08)" : "rgba(255,176,66,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {m.role === "user" ? <User size={14} /> : <Sparkles size={14} color="#ffb042" />}
                </div>
                <div style={{ maxWidth: "80%" }}>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: m.role === "user" ? "rgba(255,255,255,0.06)" : "rgba(255,176,66,0.06)",
                      border: `1px solid ${m.role === "user" ? "rgba(255,255,255,0.08)" : "rgba(255,176,66,0.15)"}`,
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "#f5f5f5",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {m.text}
                  </div>
                  {m.commands && m.commands.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {m.commands.map((cmd: any, ci: number) => (
                        <button
                          key={ci}
                          onClick={() => executeCmd(cmd)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            border: "1px solid rgba(255,176,66,0.25)",
                            background: "rgba(255,176,66,0.08)",
                            color: "#ffb042",
                            cursor: "pointer",
                            fontSize: 11,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Wrench size={10} />
                          {cmd.type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                <div style={{ width: 16, height: 16, border: "2px solid rgba(255,176,66,0.2)", borderTopColor: "#ffb042", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 12, opacity: 0.5 }}>Thinking...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask me anything..."
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                color: "#f5f5f5",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              onClick={send}
              disabled={loading}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #c8966a, #e8a050)",
                color: "#0a0a0a",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
