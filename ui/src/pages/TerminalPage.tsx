import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { isPageVisible } from "@/lib/perf";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useCoach } from "@/context/CoachContext";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  Clock3,
  Command,
  LocateFixed,
  Play,
  RefreshCcw,
  Send,
  Square,
  TerminalSquare,
  XCircle,
} from "lucide-react";

export default function TerminalPage() {
  const [sessions, setSessions] = useState<Array<any>>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [cursor, setCursor] = useState(0);
  const [input, setInput] = useState("");
  const [showOutcome, setShowOutcome] = useState(false);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [followTail, setFollowTail] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cursorRef = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { setPageContext, setHootStatus } = useCoach();
  const handoffSession = new URLSearchParams(location.search).get("session");
  const handoffProfile = new URLSearchParams(location.search).get("profile");

  const loadSessions = async (preferSessionId?: string | null) => {
    try {
      const data = await api.getSessions();
      const next = data.sessions || [];
      setSessions(next);
      const preferred = preferSessionId || handoffSession;
      if (preferred && next.some((session: any) => session.id === preferred)) {
        setActiveId(preferred);
      } else if (!activeId && next[0]) {
        setActiveId(next[0].id);
      } else if (activeId && !next.some((session: any) => session.id === activeId)) {
        setActiveId(next[0]?.id || null);
      }
      setLoading(false);
    } catch (e) {
      setLoading(false);
      toast.showToast(`Failed to load sessions: ${String(e)}`, "error");
    }
  };

  useEffect(() => {
    loadSessions(handoffSession);
    const iv = setInterval(() => {
      if (isPageVisible()) loadSessions(handoffSession);
    }, 2500);
    const onVisible = () => loadSessions(handoffSession);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [handoffSession]);

  useEffect(() => {
    if (!activeId) return;
    setOutput("");
    setCursor(0);
    cursorRef.current = 0;
    setShowOutcome(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const pollOutput = async () => {
      setPolling(true);
      try {
        const data = await api.getSessionOutput(activeId, cursorRef.current);
        if (data.chunk) {
          setOutput((prev) => prev + data.chunk);
          setCursor(data.cursor);
          cursorRef.current = data.cursor;
          setLastUpdate(Date.now());
        }
        if (data.session?.status === "exited" || data.session?.status === "error") {
          setShowOutcome(true);
        }
      } catch {
        // keep poll loop quiet to avoid toast spam
      } finally {
        setPolling(false);
      }
    };

    pollOutput();
    intervalRef.current = setInterval(() => {
      if (isPageVisible()) pollOutput();
    }, 1000);
    const onVisible = () => pollOutput();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [activeId]);

  useEffect(() => {
    if (followTail && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output, followTail]);

  const activeSession = useMemo(() => sessions.find((s) => s.id === activeId) || null, [sessions, activeId]);
  const runningCount = sessions.filter((s) => s.status === "running").length;
  const exitedCount = sessions.filter((s) => s.status === "exited").length;
  const errorCount = sessions.filter((s) => s.status === "error").length;

  useEffect(() => {
    setPageContext({
      runningCount,
      errorCount,
      activeSessionId: activeId,
      activeProfileId: activeSession?.profileId || null,
      handoffProfile,
    });
    if (runningCount > 0) {
      setHootStatus(`Watching ${runningCount} live session${runningCount === 1 ? "" : "s"}…`);
    } else if (errorCount > 0) {
      setHootStatus("A session hit an error.");
    } else {
      setHootStatus(null);
    }
  }, [runningCount, errorCount, activeId, activeSession?.profileId, handoffProfile, setPageContext, setHootStatus]);

  const sendInput = async () => {
    if (!activeId || !input.trim()) return;
    try {
      await api.sendInput(activeId, input);
      setInput("");
      toast.showToast("Input delivered to session.", "success", 2000);
    } catch (e) {
      toast.showToast(`Failed to send input: ${String(e)}`, "error");
    }
  };

  const stopSession = async () => {
    if (!activeId) return;
    try {
      await api.stopSession(activeId);
      toast.showToast("Stop signal sent.", "warning", 2500);
      loadSessions(activeId);
    } catch (e) {
      toast.showToast(`Failed to stop session: ${String(e)}`, "error");
    }
  };

  const report = async (outcome: string) => {
    if (!activeId) return;
    try {
      await api.reportOutcome(activeId, outcome);
      setShowOutcome(false);
      toast.showToast(`Outcome recorded: ${outcome}.`, "success", 2200);
      loadSessions(activeId);
    } catch (e) {
      toast.showToast(`Failed to record outcome: ${String(e)}`, "error");
    }
  };

  const focusSession = (id: string) => {
    setActiveId(id);
    navigate(`/terminal?session=${encodeURIComponent(id)}`);
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", opacity: 0.55 }}>Loading session control room...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
        <div style={{ padding: 20, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(135deg, rgba(96,165,250,0.12), rgba(255,176,66,0.08))", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#60a5fa", marginBottom: 8 }}>Operator control room</div>
              <h2 style={{ fontSize: 24, margin: 0 }}>Session command and observability deck</h2>
              <p style={{ margin: "8px 0 0", fontSize: 13, opacity: 0.72, lineHeight: 1.6 }}>
                Track live launches, inspect output, deliver operator input, stop active runs, and record outcomes without leaving the console.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => loadSessions(activeId)} style={secondaryButtonStyle}>
                <RefreshCcw size={14} /> Refresh
              </button>
              {activeSession?.status === "running" && (
                <button onClick={stopSession} style={dangerButtonStyle}>
                  <Square size={14} /> Stop session
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
            <MetricCard label="Live sessions" value={String(runningCount)} color="#4ade80" />
            <MetricCard label="Completed" value={String(exitedCount)} color="#60a5fa" />
            <MetricCard label="Errors" value={String(errorCount)} color="#ef4444" />
            <MetricCard label="Focused" value={activeSession ? activeSession.profileName || activeSession.id.slice(0, 8) : "None"} color="#ffb042" compact />
          </div>
        </div>

        <div style={{ padding: 18, borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Launch handoff status</div>
              <div style={{ fontSize: 11, opacity: 0.48, marginTop: 4 }}>Profiles page can route a fresh session here automatically.</div>
            </div>
            <Link to="/profiles" style={{ textDecoration: "none", color: "#ffb042", fontSize: 12 }}>Open launch center</Link>
          </div>
          <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 8 }}>
            <StatusRow icon={LocateFixed} label="Handoff session" value={handoffSession || "No session query detected"} />
            <StatusRow icon={Play} label="Handoff profile" value={handoffProfile || "Not supplied"} />
            <StatusRow icon={Clock3} label="Last output" value={lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "Waiting for stream"} />
            <StatusRow icon={Activity} label="Polling" value={polling ? "Live" : "Idle between checks"} />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "0.86fr 1.14fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Session queue</div>
              <div style={{ fontSize: 11, opacity: 0.45 }}>{sessions.length} total</div>
            </div>
            {sessions.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", opacity: 0.5, fontSize: 12 }}>
                No sessions found. Launch from <Link to="/profiles" style={{ color: "#ffb042" }}>Profiles</Link> to populate this room.
              </div>
            ) : (
              sessions.map((session: any) => {
                const selected = session.id === activeId;
                const tone = session.status === "running" ? "#4ade80" : session.status === "error" ? "#ef4444" : "#94a3b8";
                return (
                  <button
                    key={session.id}
                    onClick={() => focusSession(session.id)}
                    style={{ textAlign: "left", padding: 12, borderRadius: 12, border: selected ? "1px solid rgba(255,176,66,0.35)" : "1px solid rgba(255,255,255,0.06)", background: selected ? "rgba(255,176,66,0.08)" : "rgba(255,255,255,0.02)", color: "#f5f5f5", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{session.profileName || "Unnamed session"}</div>
                        <div style={{ fontSize: 11, opacity: 0.45, marginTop: 4, fontFamily: "'GeistMono', monospace" }}>{session.id}</div>
                      </div>
                      <div style={{ fontSize: 11, color: tone, textTransform: "uppercase" }}>{session.status}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Tag icon={Command} text={session.mode || session.taskMode || "session"} color="#60a5fa" />
                      {session.project && <Tag icon={TerminalSquare} text={session.project} color="#a78bfa" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {activeSession && (
            <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Focused session</div>
              <StatusRow icon={Play} label="Profile" value={activeSession.profileName || "Unknown"} />
              <StatusRow icon={Activity} label="Status" value={activeSession.status || "Unknown"} />
              <StatusRow icon={Clock3} label="Started" value={activeSession.startedAt ? new Date(activeSession.startedAt).toLocaleString() : "Not provided"} />
              <StatusRow icon={LocateFixed} label="Session id" value={activeSession.id} mono />
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Live console</div>
                <div style={{ fontSize: 11, opacity: 0.45, marginTop: 4 }}>{activeSession ? `${activeSession.profileName || activeSession.id} output stream` : "Select a session to begin monitoring."}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setFollowTail((prev) => !prev)} style={secondaryButtonStyle}>
                  <ArrowDown size={14} /> {followTail ? "Following tail" : "Tail paused"}
                </button>
                <button onClick={() => loadSessions(activeId)} style={secondaryButtonStyle}>
                  <RefreshCcw size={14} /> Sync
                </button>
              </div>
            </div>

            <div
              ref={terminalRef}
              style={{ minHeight: 420, maxHeight: 540, overflow: "auto", background: "rgba(0,0,0,0.38)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, fontFamily: "'GeistMono', monospace", fontSize: 12, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#f5f5f5" }}
            >
              {activeId ? output || "Waiting for session output..." : "No session selected."}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendInput()}
                placeholder={activeId ? "Send operator input to this session..." : "Select a session first"}
                disabled={!activeId}
                style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "#f5f5f5", fontFamily: "'GeistMono', monospace", fontSize: 13, outline: "none", opacity: activeId ? 1 : 0.5 }}
              />
              <button onClick={sendInput} disabled={!activeId || !input.trim()} style={{ ...primaryButtonStyle, opacity: !activeId || !input.trim() ? 0.5 : 1, cursor: !activeId || !input.trim() ? "not-allowed" : "pointer" }}>
                <Send size={14} /> Send
              </button>
            </div>
          </div>

          {showOutcome && (
            <div style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Outcome capture</div>
                <div style={{ fontSize: 11, opacity: 0.45, marginTop: 4 }}>The session has stopped. Record operator judgment for history and recommendation feedback.</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => report("success")} style={successButtonStyle}><CheckCircle2 size={14} /> Success</button>
                <button onClick={() => report("partial")} style={warningButtonStyle}><AlertTriangle size={14} /> Partial</button>
                <button onClick={() => report("failure")} style={dangerButtonStyle}><XCircle size={14} /> Failure</button>
                <button onClick={() => report("aborted")} style={secondaryButtonStyle}>Aborted</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, compact = false }: { label: string; value: string; color: string; compact?: boolean }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: `1px solid ${color}25` }}>
      <div style={{ fontSize: 11, opacity: 0.55 }}>{label}</div>
      <div style={{ marginTop: 6, color, fontFamily: compact ? "inherit" : "'GeistMono', monospace'", fontSize: compact ? 13 : 22, fontWeight: compact ? 600 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function StatusRow({ icon: Icon, label, value, mono = false }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.65, fontSize: 12 }}>
        <Icon size={13} />
        <span>{label}</span>
      </div>
      <span style={{ fontSize: 12, color: "#f5f5f5", fontFamily: mono ? "'GeistMono', monospace" : "inherit", maxWidth: "58%", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

function Tag({ icon: Icon, text, color }: { icon?: any; text: string; color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 999, background: `${color}12`, border: `1px solid ${color}30`, color, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {Icon && <Icon size={10} />}
      {text}
    </span>
  );
}

const secondaryButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "#dadada",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
};

const primaryButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,176,66,0.32)",
  background: "rgba(255,176,66,0.12)",
  color: "#ffb042",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
};

const successButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(74,222,128,0.32)",
  background: "rgba(74,222,128,0.12)",
  color: "#4ade80",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
};

const warningButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(245,158,11,0.32)",
  background: "rgba(245,158,11,0.12)",
  color: "#f59e0b",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
};

const dangerButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(239,68,68,0.32)",
  background: "rgba(239,68,68,0.12)",
  color: "#ef4444",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
};
