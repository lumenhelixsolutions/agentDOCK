import { useEffect, useMemo, useRef, useState } from "react";
import { isPageVisible } from "@/lib/perf";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useCoach } from "@/context/CoachContext";
import { Activity, AlertTriangle, CheckCircle2, Clock3, LocateFixed, Play, RefreshCcw, Square, XCircle } from "lucide-react";
import Console from "@/components/terminal/Console";
import SessionQueue from "@/components/terminal/SessionQueue";
import { ControlCard, MetricCard, StatusRow, btn } from "@/components/terminal/primitives";

export default function TerminalPage() {
  const [sessions, setSessions] = useState<Array<any>>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [showOutcome, setShowOutcome] = useState(false);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [restartingId, setRestartingId] = useState<string | null>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoffSession]);

  useEffect(() => {
    if (!activeId) return;
    setOutput("");
    cursorRef.current = 0;
    setShowOutcome(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const pollOutput = async () => {
      setPolling(true);
      try {
        const data = await api.getSessionOutput(activeId, cursorRef.current);
        if (data.chunk) {
          setOutput((prev) => prev + data.chunk);
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

  const sendInput = async (text: string) => {
    if (!activeId || !text.trim()) return;
    try {
      await api.sendInput(activeId, text);
      toast.showToast("Input delivered to session.", "success", 2000);
    } catch (e) {
      toast.showToast(`Failed to send input: ${String(e)}`, "error");
    }
  };

  const stopSessionById = async (id: string) => {
    setStoppingId(id);
    try {
      await api.stopSession(id);
      toast.showToast("Stop signal sent.", "warning", 2500);
      loadSessions(id);
    } catch (e) {
      toast.showToast(`Failed to stop session: ${String(e)}`, "error");
    } finally {
      setStoppingId(null);
    }
  };

  const restartSession = async (session: any) => {
    if (!session.profileId) return;
    setRestartingId(session.id);
    try {
      const result = await api.launch(session.profileId);
      if (result.blocked) {
        toast.showToast(result.message || "Relaunch blocked by memory.", "warning", 6000);
      } else if (result.session) {
        toast.showToast(`Relaunched ${result.session.profileName || session.profileName}.`, "success");
        await loadSessions(result.session.id);
        focusSession(result.session.id);
      } else {
        toast.showToast("Relaunch request completed.", "info");
        loadSessions(activeId);
      }
    } catch (e: any) {
      toast.showToast(e?.message || "Relaunch failed.", "error");
    } finally {
      setRestartingId(null);
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
    return (
      <div className="px-10 py-10 text-center opacity-55" aria-busy="true">
        Loading session control room…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-gradient-to-br from-sky-400/10 to-[color-mix(in_srgb,var(--hoot-gold)_8%,transparent)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-sky-400">Operator control room</div>
              <h2 className="m-0 font-serif text-2xl text-foreground">Session command and observability deck</h2>
              <p className="mb-0 mt-2 text-[13px] leading-relaxed opacity-70">
                Track live launches, inspect ANSI-faithful output, deliver operator input, stop or relaunch runs, and
                record outcomes without leaving the console.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => loadSessions(activeId)} className={btn.secondary}>
                <RefreshCcw size={14} /> Refresh
              </button>
              {activeSession?.status === "running" && (
                <button onClick={() => stopSessionById(activeSession.id)} className={btn.danger}>
                  <Square size={14} /> Stop session
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <MetricCard label="Live sessions" value={String(runningCount)} tone="green" />
            <MetricCard label="Completed" value={String(exitedCount)} tone="blue" />
            <MetricCard label="Errors" value={String(errorCount)} tone="red" />
            <MetricCard label="Focused" value={activeSession ? activeSession.profileName || activeSession.id.slice(0, 8) : "None"} tone="gold" compact />
          </div>
        </div>

        <ControlCard>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold text-foreground">Launch handoff status</div>
              <div className="mt-1 text-[11px] opacity-45">Launch Center and Profiles can route a fresh session here automatically.</div>
            </div>
            <Link to="/launch" className="hoot-gold-text text-xs no-underline">
              Open launch center
            </Link>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-foreground/[0.03] p-3">
            <StatusRow icon={LocateFixed} label="Handoff session" value={handoffSession || "No session query detected"} />
            <StatusRow icon={Play} label="Handoff profile" value={handoffProfile || "Not supplied"} />
            <StatusRow icon={Clock3} label="Last output" value={lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : "Waiting for stream"} />
            <StatusRow icon={Activity} label="Polling" value={polling ? "Live" : "Idle between checks"} />
          </div>
        </ControlCard>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[0.86fr_1.14fr]">
        <div className="flex flex-col gap-3">
          <SessionQueue
            sessions={sessions}
            activeId={activeId}
            stoppingId={stoppingId}
            restartingId={restartingId}
            onFocus={focusSession}
            onStop={stopSessionById}
            onRestart={restartSession}
          />

          {activeSession && (
            <ControlCard>
              <div className="text-[13px] font-semibold text-foreground">Focused session</div>
              <StatusRow icon={Play} label="Profile" value={activeSession.profileName || "Unknown"} />
              <StatusRow icon={Activity} label="Status" value={activeSession.status || "Unknown"} />
              <StatusRow icon={Clock3} label="Started" value={activeSession.startedAt ? new Date(activeSession.startedAt).toLocaleString() : "Not provided"} />
              <StatusRow icon={LocateFixed} label="Session id" value={activeSession.id} mono />
            </ControlCard>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Console
            sessionId={activeId}
            sessionLabel={activeSession?.profileName || activeSession?.id || ""}
            output={output}
            onSendInput={sendInput}
            onCopied={() => toast.showToast("Output copied to clipboard.", "success", 2000)}
          />

          {showOutcome && (
            <ControlCard>
              <div>
                <div className="text-[13px] font-semibold text-foreground">Outcome capture</div>
                <div className="mt-1 text-[11px] opacity-45">
                  The session has stopped. Record operator judgment for history and recommendation feedback.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => report("success")} className={btn.success}>
                  <CheckCircle2 size={14} /> Success
                </button>
                <button onClick={() => report("partial")} className={btn.warning}>
                  <AlertTriangle size={14} /> Partial
                </button>
                <button onClick={() => report("failure")} className={btn.danger}>
                  <XCircle size={14} /> Failure
                </button>
                <button onClick={() => report("aborted")} className={btn.secondary}>
                  Aborted
                </button>
              </div>
            </ControlCard>
          )}
        </div>
      </div>
    </div>
  );
}
