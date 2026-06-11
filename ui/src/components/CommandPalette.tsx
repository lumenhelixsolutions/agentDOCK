import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  Layers3,
  Moon,
  PanelLeftClose,
  PlayCircle,
  Radar,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Wrench,
} from "lucide-react";
import { toggleTheme } from "@/lib/theme";

export interface PaletteCommand {
  id: string;
  label: string;
  hint: string;
  group: "Navigate" | "Actions";
  keywords: string;
  icon: typeof Radar;
  run: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onToggleSidebar: () => void;
}

/**
 * Ctrl/Cmd+K command palette: jump to any route or run an app action.
 * Keyboard: arrows to move, Enter to run, Esc to close.
 */
export default function CommandPalette({ open, onClose, onToggleSidebar }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<PaletteCommand[]>(
    () => [
      { id: "nav-overview", label: "Overview", hint: "Mission status and next action", group: "Navigate", keywords: "dashboard home mission", icon: Radar, run: () => navigate("/") },
      { id: "nav-scan", label: "Readiness", hint: "System posture and environment health", group: "Navigate", keywords: "scan tools health posture", icon: ShieldCheck, run: () => navigate("/scan") },
      { id: "nav-profiles", label: "Profiles", hint: "Operational roles and fit", group: "Navigate", keywords: "stacks roles audit", icon: Layers3, run: () => navigate("/profiles") },
      { id: "nav-terminal", label: "Sessions", hint: "Live terminals and launches", group: "Navigate", keywords: "terminal console output", icon: TerminalSquare, run: () => navigate("/terminal") },
      { id: "nav-launch", label: "Launch Center", hint: "Stage, validate, and launch", group: "Navigate", keywords: "run start execute", icon: PlayCircle, run: () => navigate("/launch") },
      { id: "nav-activity", label: "Activity", hint: "Session diary and telemetry", group: "Navigate", keywords: "history log radar", icon: CalendarDays, run: () => navigate("/activity") },
      { id: "nav-memory", label: "Memory", hint: "Captured evidence and outcomes", group: "Navigate", keywords: "notes learning evidence", icon: BookOpen, run: () => navigate("/memory") },
      { id: "nav-builder", label: "Stack Builder", hint: "Compose operator stacks", group: "Navigate", keywords: "compose build wizard", icon: Sparkles, run: () => navigate("/builder") },
      { id: "nav-modules", label: "Modules", hint: "Plugin packs, skills, MCP", group: "Navigate", keywords: "plugins skills mcp installer", icon: Wrench, run: () => navigate("/modules") },
      { id: "nav-settings", label: "Settings", hint: "Providers, policies, keys", group: "Navigate", keywords: "config preferences keys", icon: SettingsIcon, run: () => navigate("/settings") },
      { id: "act-scan", label: "Run system scan", hint: "Open Readiness and rescan the environment", group: "Actions", keywords: "rescan detect refresh", icon: ShieldCheck, run: () => navigate("/scan") },
      { id: "act-theme", label: "Toggle dark / light theme", hint: "Switch the interface theme", group: "Actions", keywords: "appearance mode color", icon: Moon, run: () => toggleTheme() },
      { id: "act-sidebar", label: "Toggle sidebar", hint: "Collapse or expand the dock (Ctrl+B)", group: "Actions", keywords: "collapse expand dock nav", icon: PanelLeftClose, run: onToggleSidebar },
    ],
    [navigate, onToggleSidebar],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.hint} ${c.keywords}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open) return null;

  const runCommand = (cmd: PaletteCommand) => {
    onClose();
    cmd.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[index]) runCommand(filtered[index]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  let lastGroup = "";

  return (
    <div
      className="hoot-backdrop fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="w-full max-w-xl border border-border bg-popover text-popover-foreground shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search size={16} className="shrink-0 opacity-50" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a view or run an action…"
            aria-label="Search commands"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="shrink-0 border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Esc
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2" role="listbox">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No matching commands.</div>
          )}
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon;
            const groupHeader =
              cmd.group !== lastGroup ? (
                <div className="px-4 pb-1 pt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground opacity-70">
                  {cmd.group}
                </div>
              ) : null;
            lastGroup = cmd.group;
            return (
              <div key={cmd.id}>
                {groupHeader}
                <button
                  data-index={i}
                  onClick={() => runCommand(cmd)}
                  onMouseMove={() => setIndex(i)}
                  role="option"
                  aria-selected={i === index}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                    i === index ? "hoot-active-item" : "border border-transparent"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.8} className={i === index ? "hoot-gold-text" : "opacity-60"} />
                  <span className="flex-1 text-sm">{cmd.label}</span>
                  <span className="hidden truncate text-xs text-muted-foreground sm:block">{cmd.hint}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
