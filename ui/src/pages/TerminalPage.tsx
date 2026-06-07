import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Play, Square, Send, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

export default function TerminalPage() {
  const [sessions, setSessions] = useState<Array<any>>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [output, setOutput] = useState<string>("");
  const [cursor, setCursor] = useState(0);
  const [input, setInput] = useState("");
  const [showOutcome, setShowOutcome] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const loadSessions = async () => {
    try {
      const data = await api.getSessions();
      setSessions(data.sessions);
      if (!activeId && data.sessions[0]) {
        setActiveId(data.sessions[0].id);
      }
    } catch {}
  };

  useEffect(() => {
    loadSessions();
    const iv = setInterval(loadSessions, 2000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setOutput("");
    setCursor(0);
    setShowOutcome(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      try {
        const data = await api.getSessionOutput(activeId, cursor);
        if (data.chunk) {
          setOutput((prev) => prev + data.chunk);
          setCursor(data.cursor);
        }
        if (data.session?.status === "exited") {
          setShowOutcome(true);
        }
      } catch {}
    }, 900);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeId]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  const sendInput = async () => {
    if (!activeId || !input.trim()) return;
    await api.sendInput(activeId, input);
    setInput("");
  };

  const stopSession = async () => {
    if (!activeId) return;
    await api.stopSession(activeId);
  };

  const report = async (outcome: string) => {
    if (!activeId) return;
    await api.reportOutcome(activeId, outcome);
    setShowOutcome(false);
    loadSessions();
  };

  const activeSession = sessions.find((s) => s.id === activeId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Terminal Monitor</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadSessions} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#dadada", cursor: "pointer", fontSize: 12 }}>Refresh</button>
          {activeSession?.status === "running" && (
            <button onClick={stopSession} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Square size={12} /> Stop
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid",
              borderColor: s.id === activeId ? "rgba(255,176,66,0.4)" : "rgba(255,255,255,0.08)",
              background: s.id === activeId ? "rgba(255,176,66,0.1)" : "rgba(255,255,255,0.03)",
              color: s.status === "running" ? "#4ade80" : s.status === "error" ? "#ef4444" : "#dadada",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "'GeistMono', monospace",
            }}
          >
            {s.profileName} · {s.status}
          </button>
        ))}
      </div>

      <div
        ref={terminalRef}
        style={{
          flex: 1,
          minHeight: 400,
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: 16,
          fontFamily: "'GeistMono', monospace",
          fontSize: 12,
          lineHeight: 1.6,
          overflow: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: "#f5f5f5",
        }}
      >
        {output || "No output yet."}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendInput()}
          placeholder="Send input to session..."
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
            color: "#f5f5f5",
            fontFamily: "'GeistMono', monospace",
            fontSize: 13,
          }}
        />
        <button
          onClick={sendInput}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid rgba(255,176,66,0.3)",
            background: "rgba(255,176,66,0.1)",
            color: "#ffb042",
            cursor: "pointer",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Send size={14} /> Send
        </button>
      </div>

      {showOutcome && (
        <div style={{ padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>How did it go?</span>
          <button onClick={() => report("success")} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.1)", color: "#4ade80", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
            <CheckCircle size={12} /> Success
          </button>
          <button onClick={() => report("partial")} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.1)", color: "#f59e0b", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
            <AlertTriangle size={12} /> Partial
          </button>
          <button onClick={() => report("failure")} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
            <XCircle size={12} /> Failure
          </button>
          <button onClick={() => report("aborted")} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#dadada", cursor: "pointer", fontSize: 12 }}>
            Aborted
          </button>
        </div>
      )}
    </div>
  );
}
