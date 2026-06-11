import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  type CooldownRegistry,
  PROVIDER_ORDER,
  STATE_COLORS,
  formatClock,
  gaugeState,
  liveRemaining,
  liveRemainingFraction,
} from "@/lib/cooldown";
import GaugeRing from "./GaugeRing";

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

function copyStylesInto(target: Document) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules).map((r) => r.cssText).join("\n");
      const style = target.createElement("style");
      style.textContent = css;
      target.head.appendChild(style);
    } catch {
      // cross-origin sheet — relink instead
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
        win = await window.documentPictureInPicture.requestWindow({ width: 460, height: 330 });
      }
    } catch { /* user dismissed or unsupported — fall back */ }
    if (!win) {
      win = window.open("", "hoot-cooldown-deck", "popup=yes,width=480,height=350");
    }
    if (!win) return;
    copyStylesInto(win.document);
    win.document.title = "HOOT · Cooldown Deck";
    win.addEventListener("pagehide", () => setPipWindow(null));
    setPipWindow(win);
  }, [close]);

  // Close the floating window if the app itself unloads.
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
  const body = pipWindow.document.body;

  const content = (
    <div className="flex min-h-screen flex-col gap-3 bg-background p-3 font-sans text-foreground">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">HOOT · Cooldown Deck</span>
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
              <div key={id} className="flex flex-col items-center gap-1" title={`${row.label}: ${state}`}>
                <GaugeRing size={62} stroke={5} value={value} color={color} glow={state === "cooldown"}>
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
        <div className="mt-auto overflow-hidden whitespace-nowrap font-mono text-[9px] opacity-40">
          {registry.matrix_line}
        </div>
      )}
    </div>
  );

  return createPortal(content, body);
}
