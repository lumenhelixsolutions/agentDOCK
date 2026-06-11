import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ChevronDown, ChevronUp, Copy, Download, Search, Send, X } from "lucide-react";
import { parseAnsi, segmentCss } from "@/lib/ansi";
import { btn } from "./primitives";

interface ConsoleProps {
  sessionId: string | null;
  sessionLabel: string;
  output: string;
  onSendInput: (text: string) => Promise<void>;
  onCopied: () => void;
}

const MAX_RENDER_LINES = 2500;

/**
 * Live console: ANSI-faithful rendering, sticky autoscroll that pauses when
 * the operator scrolls back, in-output search with match navigation, and
 * copy / .log export. The surface stays dark in both themes, like a real
 * terminal, so ANSI contrast is guaranteed.
 */
export default function Console({ sessionId, sessionLabel, output, onSendInput, onCopied }: ConsoleProps) {
  const [input, setInput] = useState("");
  const [follow, setFollow] = useState(true);
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);
  const programmatic = useRef(false);

  const parsed = useMemo(() => parseAnsi(output, MAX_RENDER_LINES), [output]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hits: number[] = [];
    parsed.plain.forEach((line, i) => {
      if (line.toLowerCase().includes(q)) hits.push(i);
    });
    return hits;
  }, [parsed.plain, query]);

  useEffect(() => setMatchIndex(0), [query]);

  // Sticky tail: follow while pinned to the bottom; pause on scrollback.
  useEffect(() => {
    const el = viewRef.current;
    if (follow && el) {
      programmatic.current = true;
      el.scrollTop = el.scrollHeight;
      requestAnimationFrame(() => {
        programmatic.current = false;
      });
    }
  }, [parsed, follow]);

  const onScroll = () => {
    if (programmatic.current) return;
    const el = viewRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setFollow(nearBottom);
  };

  // Jump the current match into view.
  useEffect(() => {
    if (matches.length === 0) return;
    setFollow(false);
    const el = viewRef.current?.querySelector(`[data-line="${matches[Math.min(matchIndex, matches.length - 1)]}"]`);
    el?.scrollIntoView({ block: "center" });
  }, [matchIndex, matches]);

  const step = (dir: 1 | -1) => {
    if (matches.length === 0) return;
    setMatchIndex((i) => (i + dir + matches.length) % matches.length);
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(parsed.plain.join("\n"));
      onCopied();
    } catch {
      /* clipboard unavailable */
    }
  };

  const exportLog = () => {
    const blob = new Blob([parsed.plain.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hoot-session-${(sessionId || "log").slice(0, 8)}.log`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  };

  const send = async () => {
    if (!sessionId || !input.trim()) return;
    await onSendInput(input);
    setInput("");
  };

  const currentMatchLine = matches.length > 0 ? matches[Math.min(matchIndex, matches.length - 1)] : -1;
  const matchSet = useMemo(() => new Set(matches), [matches]);
  const q = query.trim().toLowerCase();

  return (
    <div className="hoot-card-soft flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-foreground">Live console</div>
          <div className="mt-1 truncate text-[11px] opacity-45">
            {sessionId ? `${sessionLabel} output stream` : "Select a session to begin monitoring."}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSearchOpen((v) => !v)} className={btn.secondary} aria-label="Search output" aria-expanded={searchOpen}>
            <Search size={14} /> Find
          </button>
          <button onClick={copyOutput} className={btn.secondary} disabled={!output} aria-label="Copy output">
            <Copy size={14} /> Copy
          </button>
          <button onClick={exportLog} className={btn.secondary} disabled={!output} aria-label="Export output as .log">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-foreground/[0.03] px-3 py-2">
          <Search size={14} className="shrink-0 opacity-50" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") step(e.shiftKey ? -1 : 1);
              if (e.key === "Escape") {
                setQuery("");
                setSearchOpen(false);
              }
            }}
            placeholder="Find in output… (Enter next, Shift+Enter previous)"
            aria-label="Find in output"
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {matches.length > 0 ? `${Math.min(matchIndex + 1, matches.length)}/${matches.length}` : query ? "0/0" : ""}
          </span>
          <button onClick={() => step(-1)} disabled={matches.length === 0} aria-label="Previous match" className="opacity-60 hover:opacity-100 disabled:opacity-25">
            <ChevronUp size={14} />
          </button>
          <button onClick={() => step(1)} disabled={matches.length === 0} aria-label="Next match" className="opacity-60 hover:opacity-100 disabled:opacity-25">
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => {
              setQuery("");
              setSearchOpen(false);
            }}
            aria-label="Close search"
            className="opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="relative">
        <div
          ref={viewRef}
          onScroll={onScroll}
          role="log"
          aria-live="off"
          aria-label="Session output"
          className="max-h-[540px] min-h-[420px] overflow-auto rounded-[14px] border border-border bg-[#0b0b0d] p-4 font-mono text-xs leading-[1.65] text-zinc-100"
        >
          {parsed.truncated > 0 && (
            <div className="mb-2 text-[11px] italic text-zinc-500">… {parsed.truncated.toLocaleString()} earlier lines hidden (Export saves the visible tail)</div>
          )}
          {sessionId ? (
            output ? (
              parsed.lines.map((segments, i) => {
                const isMatch = matchSet.has(i);
                const isCurrent = i === currentMatchLine;
                return (
                  <div
                    key={i}
                    data-line={i}
                    className={`whitespace-pre-wrap break-words ${
                      isCurrent ? "bg-amber-400/20 ring-1 ring-inset ring-amber-400/50" : isMatch ? "bg-amber-400/10" : ""
                    }`}
                  >
                    {segments.length === 0
                      ? "\u00a0"
                      : segments.map((segment, j) => {
                          if (!q || !isMatch) {
                            return (
                              <span key={j} style={segmentCss(segment.style)}>
                                {segment.text}
                              </span>
                            );
                          }
                          // Highlight the query inside matched lines.
                          const parts = segment.text.split(new RegExp(`(${escapeRegExp(query.trim())})`, "ig"));
                          return (
                            <span key={j} style={segmentCss(segment.style)}>
                              {parts.map((part, k) =>
                                part.toLowerCase() === q ? (
                                  <mark key={k} className="bg-amber-400/60 text-black">
                                    {part}
                                  </mark>
                                ) : (
                                  part
                                ),
                              )}
                            </span>
                          );
                        })}
                  </div>
                );
              })
            ) : (
              <span className="text-zinc-500">Waiting for session output…</span>
            )
          ) : (
            <span className="text-zinc-500">No session selected.</span>
          )}
        </div>

        {!follow && sessionId && (
          <button
            onClick={() => setFollow(true)}
            className="hoot-gold-chip absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-lg"
            aria-label="Jump to latest output"
          >
            <ArrowDown size={13} /> Jump to latest
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={sessionId ? "Send operator input to this session…" : "Select a session first"}
          disabled={!sessionId}
          aria-label="Operator input"
          className="flex-1 rounded-[10px] border border-border bg-foreground/[0.03] px-3.5 py-2.5 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button onClick={send} disabled={!sessionId || !input.trim()} className={btn.primary} aria-label="Send input">
          <Send size={14} /> Send
        </button>
      </div>
    </div>
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
