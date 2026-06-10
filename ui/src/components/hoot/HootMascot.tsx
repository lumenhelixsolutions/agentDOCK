import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCoach } from "@/context/CoachContext";
import CoachThread from "@/components/coach/CoachThread";
import HootOwl from "./HootOwl";
import { BRAND } from "@/lib/brand";
import { api } from "@/lib/api";
import { Pin, PinOff, X, ChevronRight, Maximize2, Minimize2, GripHorizontal } from "lucide-react";

const SESSION_ID = "hoot-" + Math.random().toString(36).slice(2, 8);
const POS_KEY = "hoot_popout_pos";

const toneStyles = {
  tip: { border: "rgba(255,176,66,0.35)", bg: "rgba(255,176,66,0.12)", accent: "#ffb042" },
  warning: { border: "rgba(245,158,11,0.4)", bg: "rgba(245,158,11,0.1)", accent: "#fbbf24" },
  celebration: { border: "rgba(74,222,128,0.35)", bg: "rgba(74,222,128,0.1)", accent: "#4ade80" },
  error: { border: "rgba(248,113,113,0.4)", bg: "rgba(248,113,113,0.1)", accent: "#f87171" },
};

type PopoutPos = { x: number; y: number };

function loadPopoutPos(): PopoutPos {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return { x: window.innerWidth - 480, y: 16 };
    const parsed = JSON.parse(raw) as PopoutPos;
    const x = Math.max(8, Math.min(parsed.x, window.innerWidth - 200));
    const y = Math.max(8, Math.min(parsed.y, window.innerHeight - 120));
    return { x, y };
  } catch {
    return { x: window.innerWidth - 480, y: 16 };
  }
}

function savePopoutPos(pos: PopoutPos) {
  localStorage.setItem(POS_KEY, JSON.stringify(pos));
}

export default function HootMascot() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    topHint, viewGuide, dismissHint, coachOpen, setCoachOpen,
    consumeChatPrompt, emitCoachAction, queueChatPrompt,
    hootMood, hootPinned, setHootPinned,
    hootError, clearHootError, hootStatus, setHootStatus,
  } = useCoach();
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [composerPrompt, setComposerPrompt] = useState<string | null>(null);
  const [poppedOut, setPoppedOut] = useState(false);
  const [popoutPos, setPopoutPos] = useState<PopoutPos>(() => loadPopoutPos());
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onSession = location.pathname === "/terminal" || location.pathname === "/launch";

  useEffect(() => {
    if (onSession && !hootPinned) setHootPinned(true);
  }, [onSession, hootPinned, setHootPinned]);

  useEffect(() => {
    if (topHint) setBubbleVisible(true);
  }, [topHint?.id]);

  useEffect(() => {
    const prompt = consumeChatPrompt();
    if (prompt) {
      setCoachOpen(true);
      setComposerPrompt(prompt);
    }
  }, [consumeChatPrompt, setCoachOpen]);

  const startDrag = useCallback((e: React.PointerEvent) => {
    if (!poppedOut) return;
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: popoutPos.x,
      origY: popoutPos.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [poppedOut, popoutPos]);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const maxX = window.innerWidth - 120;
    const maxY = window.innerHeight - 80;
    const next = {
      x: Math.max(8, Math.min(dragRef.current.origX + dx, maxX)),
      y: Math.max(8, Math.min(dragRef.current.origY + dy, maxY)),
    };
    setPopoutPos(next);
  }, []);

  const endDrag = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setPopoutPos((pos) => {
      savePopoutPos(pos);
      return pos;
    });
  }, []);

  const runAction = (action: { type: string; target?: string; prompt?: string }) => {
    if (action.type === "navigate" && action.target) {
      navigate(action.target);
      if (topHint) dismissHint(topHint.id);
      return;
    }
    if (action.type === "chat") {
      if (action.prompt) queueChatPrompt(action.prompt);
      else setCoachOpen(true);
      return;
    }
    if (action.type === "action" && action.target) {
      emitCoachAction(action.target);
      if (topHint) dismissHint(topHint.id);
      return;
    }
    if (action.type === "command" && action.target === "runScan") navigate("/scan");
  };

  const executeCmd = async (cmd: Record<string, unknown>) => {
    const label = String(cmd.type || "action");
    setHootStatus(`HOOT running ${label}…`);
    try {
      const res = await api.coachExecute(cmd);
      const last = res.results?.[res.results.length - 1] as Record<string, unknown> | undefined;
      if (res.route) navigate(res.route);
      if (res.target) emitCoachAction(String(res.target));
      if (res.message) alert(String(res.message));
      if (res.launched && res.session) {
        setHootStatus(`Launched ${(res.session as { profileName?: string }).profileName || "session"}`);
        navigate("/terminal");
        return;
      }
      if (last?.type === "runScan") {
        setHootStatus("Scan complete");
        navigate("/scan");
        return;
      }
      if (last && last.ok === false) {
        setHootStatus(String(last.error || "Command blocked"));
        return;
      }
      setHootStatus(null);
    } catch {
      switch (cmd.type) {
        case "launch": navigate("/profiles"); break;
        case "runScan": navigate("/scan"); break;
        case "switchProject": navigate("/"); break;
        case "showMessage": alert(String(cmd.text || "")); break;
        case "openUrl": window.open(String(cmd.url || ""), "_blank"); break;
        default: setHootStatus(null); break;
      }
    }
  };

  const showBubble = (topHint || hootError) && bubbleVisible && !coachOpen;
  const toneKey = hootError ? "error" : (topHint?.tone || "tip");
  const tone = toneStyles[toneKey as keyof typeof toneStyles];

  const zIndex = hootPinned || poppedOut ? 9999 : 200;
  const positionStyle = poppedOut
    ? { left: popoutPos.x, top: popoutPos.y, right: "auto" as const, bottom: "auto" as const }
    : { bottom: 20, right: 20, top: "auto" as const, left: "auto" as const };

  const dragHandleStyle: React.CSSProperties = {
    cursor: poppedOut ? "grab" : "default",
    touchAction: "none",
    display: "flex",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        ...positionStyle,
        zIndex,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 10,
        maxWidth: poppedOut ? 480 : 420,
        pointerEvents: "none",
      }}
    >
      {hootStatus && coachOpen && (
        <div style={{
          pointerEvents: "auto", padding: "6px 12px", borderRadius: 8,
          background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.25)",
          color: "#fca5a5", fontSize: 11, maxWidth: 360,
        }}>
          {hootStatus}
        </div>
      )}

      {showBubble && (
        <div
          style={{
            pointerEvents: "auto",
            position: "relative",
            width: poppedOut ? 400 : 360,
            padding: "14px 16px",
            borderRadius: 14,
            border: `1px solid ${tone.border}`,
            background: `linear-gradient(145deg, ${tone.bg}, rgba(13,13,13,0.95))`,
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            animation: "hootPop 0.35s ease-out",
            display: "flex",
            gap: 12,
          }}
        >
          {poppedOut && (
            <div
              onPointerDown={startDrag}
              onPointerMove={onDragMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", cursor: "grab", opacity: 0.35, padding: 4 }}
              title="Drag HOOT"
            >
              <GripHorizontal size={14} color="#aaa" />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: tone.accent, fontWeight: 600 }}>
                HOOT{viewGuide ? ` · ${viewGuide.title}` : ""}
              </span>
              <button type="button" onClick={() => { setBubbleVisible(false); if (topHint) dismissHint(topHint.id); if (hootError) clearHootError(); }}
                style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 11 }}>
                Not now
              </button>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.55, color: "#f5f5f5" }}>
              {hootError ? hootError.message.split("\n")[0].slice(0, 180) : topHint?.message}
            </p>
            {hootError?.fix && (
              <p style={{ margin: "0 0 10px", fontSize: 11, color: "#fbbf24", lineHeight: 1.4 }}>{hootError.fix}</p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(hootError ? [
                { label: "Help me fix", type: "chat" as const, prompt: `Fix this ${hootError.source} error: ${hootError.message.slice(0, 200)}` },
                { label: "Dismiss", type: "action" as const, target: "hoot-dismiss" },
              ] : topHint?.actions || []).map((a, i) => (
                <button key={i} type="button" onClick={() => {
                  if (a.type === "action" && (a as { target?: string }).target === "hoot-dismiss") clearHootError();
                  else runAction(a);
                }}
                  style={{
                    padding: "6px 12px", borderRadius: 8, border: `1px solid ${tone.border}`,
                    background: "rgba(0,0,0,0.25)", color: tone.accent, cursor: "pointer", fontSize: 11,
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                  {a.label}
                  <ChevronRight size={10} />
                </button>
              ))}
              <button type="button" onClick={() => { setCoachOpen(true); setBubbleVisible(false); }}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#dadada", cursor: "pointer", fontSize: 11 }}>
                Ask HOOT
              </button>
            </div>
          </div>
        </div>
      )}

      {coachOpen && (
        <div style={{
          pointerEvents: "auto",
          width: poppedOut ? 440 : 400,
          height: poppedOut ? 560 : 520,
          background: "#0d0d0d",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden",
        }}>
          <div
            onPointerDown={poppedOut ? startDrag : undefined}
            onPointerMove={poppedOut ? onDragMove : undefined}
            onPointerUp={poppedOut ? endDrag : undefined}
            onPointerCancel={poppedOut ? endDrag : undefined}
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
              cursor: poppedOut ? "grab" : "default",
              touchAction: poppedOut ? "none" : "auto",
            }}
          >
            <div style={dragHandleStyle}>
              {poppedOut && <GripHorizontal size={14} color="#666" style={{ flexShrink: 0 }} />}
              <HootOwl mood={hootMood} size="sm" statusLine={hootStatus} />
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#ffb042" }}>{BRAND.name}</span>
                <span style={{ fontSize: 10, marginLeft: 8, opacity: 0.5 }}>{BRAND.mascotTagline}{poppedOut ? " · drag to move" : ""}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button type="button" title={poppedOut ? "Dock" : "Pop out"} onClick={() => setPoppedOut(!poppedOut)}
                style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", padding: 4 }}>
                {poppedOut ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button type="button" title={hootPinned ? "Unpin" : "Pin on top"} onClick={() => setHootPinned(!hootPinned)}
                style={{ background: "none", border: "none", color: hootPinned ? "#ffb042" : "#aaa", cursor: "pointer", padding: 4 }}>
                {hootPinned ? <Pin size={14} /> : <PinOff size={14} />}
              </button>
              <button type="button" onClick={() => setCoachOpen(false)}
                style={{ background: "none", border: "none", color: "#dadada", cursor: "pointer", padding: 4 }}>
                <X size={16} />
              </button>
            </div>
          </div>
          <CoachThread sessionId={SESSION_ID} pendingPrompt={composerPrompt} onPromptConsumed={() => setComposerPrompt(null)} onCommand={executeCmd} />
        </div>
      )}

      {!coachOpen && (
        <div style={{ pointerEvents: "auto" }}>
          <HootOwl
            mood={hootMood}
            size="lg"
            onClick={() => setCoachOpen(true)}
            statusLine={hootStatus}
            showWordmark={false}
          />
        </div>
      )}
      <style>{`@keyframes hootPop { from { opacity: 0; transform: translateY(8px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
    </div>
  );
}