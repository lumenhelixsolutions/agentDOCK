import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, MessageCircle, X } from "lucide-react";
import {
  type CooldownRegistry,
  PROVIDER_ORDER,
  STATE_COLORS,
  formatClock,
  gaugeState,
  liveRemaining,
  liveRemainingFraction,
} from "@/lib/cooldown";
import { useCoach } from "@/context/CoachContext";
import CoachThread from "@/components/coach/CoachThread";
import HootOwl from "@/components/hoot/HootOwl";
import { useCoachCommandExecute } from "@/lib/useCoachCommandExecute";
import { BRAND } from "@/lib/brand";
import GaugeRing from "./GaugeRing";
import PopoutRadarTelemetry from "./PopoutRadarTelemetry";
import HoverTip from "@/components/HoverTip";
import { getTooltip, tooltipTitle } from "@/lib/tooltips";

/**
 * Floating always-on-top monitor. Uses the Document Picture-in-Picture API
 * (Chromium) so the deck stays visible above every window on the OS — IDE,
 * other AI chats, anything. Falls back to a regular popup elsewhere.
 */

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
    };
  }
}

const DECK_SESSION_ID = "hoot-deck-" + Math.random().toString(36).slice(2, 8);
const POPOUT_SIZE = { compact: { w: 500, h: 460 }, expanded: { w: 500, h: 760 } };

function copyStylesInto(target: Document) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules).map((r) => r.cssText).join("\n");
      const style = target.createElement("style");
      style.textContent = css;
      target.head.appendChild(style);
    } catch {
      const owner = sheet.ownerNode;
      if (owner instanceof HTMLLinkElement && owner.href) {
        const link = target.createElement("link");
        link.rel = "stylesheet";
        link.href = owner.href;
        target.head.appendChild(link);
      }
    }
  }
  target.documentElement.className = document.documentElement.className;
  target.body.style.margin = "0";
}

function resizePopoutWindow(win: Window, expanded: boolean) {
  const { w, h } = expanded ? POPOUT_SIZE.expanded : POPOUT_SIZE.compact;
  try {
    win.resizeTo(w, h);
  } catch {
    /* PiP or cross-origin may block resize */
  }
}

export function useDeckPopout() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const winRef = useRef<Window | null>(null);
  winRef.current = pipWindow;

  const close = useCallback(() => {
    try {
      winRef.current?.close();
    } catch { /* already gone */ }
    setPipWindow(null);
  }, []);

  const toggle = useCallback(async () => {
    if (winRef.current && !winRef.current.closed) {
      close();
      return;
    }
    let win: Window | null = null;
    try {
      if (window.documentPictureInPicture?.requestWindow) {
        win = await window.documentPictureInPicture.requestWindow({
          width: POPOUT_SIZE.compact.w,
          height: POPOUT_SIZE.compact.h,
        });
      }
    } catch { /* user dismissed or unsupported — fall back */ }
    if (!win) {
      win = window.open(
        "",
        "hoot-cooldown-deck",
        `popup=yes,width=${POPOUT_SIZE.compact.w},height=${POPOUT_SIZE.compact.h}`,
      );
    }
    if (!win) return;
    copyStylesInto(win.document);
    win.document.title = "HOOT · Cooldown Deck";
    win.addEventListener("pagehide", () => setPipWindow(null));
    setPipWindow(win);
  }, [close]);

  useEffect(() => {
    const onUnload = () => winRef.current?.close();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  return { pipWindow, toggle, close };
}

/** Compact monitor rendered inside the floating window via a portal (shares app state). */
export function PopoutSurface({
  pipWindow,
  registry,
  nowMs,
}: {
  pipWindow: Window;
  registry: CooldownRegistry | null;
  nowMs: number;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    hootMood,
    hootStatus,
    setHootStatus,
    pageContext,
    chatLoading,
    topHint,
  } = useCoach();

  const [chatExpanded, setChatExpanded] = useState(false);
  const body = pipWindow.document.body;

  const hootMoodContext = useMemo(
    () => ({
      pathname: location.pathname,
      pageContext,
      hasError: false,
      coachOpen: chatExpanded,
      chatLoading,
      topHintTone: topHint?.tone || null,
      hasTopHint: Boolean(topHint),
    }),
    [location.pathname, pageContext, chatExpanded, chatLoading, topHint],
  );

  useEffect(() => {
    resizePopoutWindow(pipWindow, chatExpanded);
  }, [pipWindow, chatExpanded]);

  const executeCmd = useCoachCommandExecute(undefined, { onStatus: setHootStatus });

  const content = (
    <div className="flex min-h-screen flex-col gap-2.5 bg-background p-3 font-sans text-foreground">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">
            HOOT · Cooldown Deck
          </span>
        </div>
        <HoverTip id={chatExpanded ? "deck.chat.collapse" : "deck.chat.expand"}>
          <button
            type="button"
            onClick={() => setChatExpanded((v) => !v)}
            className={`flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] transition ${
              chatExpanded ? "hoot-gold-chip" : "border-border opacity-60 hover:opacity-100"
            }`}
          >
            <MessageCircle size={12} />
            {chatExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </HoverTip>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-foreground/[0.02] p-2">
        <button
          type="button"
          onClick={() => setChatExpanded((v) => !v)}
          title={tooltipTitle(chatExpanded ? "deck.chat.collapse" : "deck.chat.expand")}
          className="shrink-0 rounded-lg border-0 bg-transparent p-0 transition hover:opacity-90"
        >
          <HootOwl mood={hootMood} moodContext={hootMoodContext} size="sm" statusLine={hootStatus} />
        </button>
        <div className="min-w-0 flex-1 pt-1">
          <div className="text-[11px] font-semibold text-amber-300/90">{BRAND.name}</div>
          <div className="text-[9px] uppercase tracking-[0.12em] opacity-45">{BRAND.mascotTagline}</div>
          <PopoutRadarTelemetry />
        </div>
      </div>

      {!registry ? (
        <div className="text-xs opacity-50">Connecting to HOOT kernel…</div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {PROVIDER_ORDER.map((id) => {
            const row = registry.providers?.[id];
            if (!row) return null;
            const state = gaugeState(row);
            const remaining = liveRemaining(row, nowMs);
            const fraction = liveRemainingFraction(row, nowMs);
            const nearlyBack = state === "cooldown" && fraction !== null && fraction < 0.25;
            const color = nearlyBack ? "#fbbf24" : STATE_COLORS[state].stroke;
            const value = state === "cooldown" ? (fraction ?? 1) : state === "unknown" ? 0 : 1;
            return (
              <div
                key={id}
                className="flex flex-col items-center gap-1"
                title={`${getTooltip("deck.gauge.provider").body} · ${row.label}: ${state}`}
              >
                <GaugeRing size={58} stroke={5} value={value} color={color} glow={state === "cooldown"}>
                  {state === "cooldown" && remaining !== null ? (
                    <span className="font-mono text-[10px] font-semibold tabular-nums">{formatClock(remaining)}</span>
                  ) : (
                    <span className={`text-[8px] font-semibold uppercase ${STATE_COLORS[state].text}`}>
                      {state === "unknown" ? "?" : STATE_COLORS[state].label}
                    </span>
                  )}
                </GaugeRing>
                <span className="max-w-full truncate text-[9px] opacity-60">{row.label || id}</span>
              </div>
            );
          })}
        </div>
      )}

      {registry?.matrix_line && (
        <div className="overflow-hidden whitespace-nowrap font-mono text-[9px] opacity-40">
          {registry.matrix_line}
        </div>
      )}

      {chatExpanded && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-[#0d0d0d]">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <HootOwl mood={hootMood} moodContext={hootMoodContext} size="sm" statusLine={hootStatus} />
              <span className="text-[11px] font-medium opacity-80">Ask {BRAND.name}</span>
            </div>
            <HoverTip id="deck.chat.collapse">
              <button
                type="button"
                onClick={() => setChatExpanded(false)}
                className="rounded-md border border-border p-1 opacity-50 transition hover:opacity-100"
              >
              <X size={12} />
              </button>
            </HoverTip>
          </div>
          <div className="flex min-h-[280px] flex-1 flex-col">
            <CoachThread sessionId={DECK_SESSION_ID} onCommand={executeCmd} />
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(content, body);
}