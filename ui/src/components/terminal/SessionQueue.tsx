import { Command, Play, RotateCcw, Square, TerminalSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { SessionStatusChip, Tag, btn } from "./primitives";

interface SessionQueueProps {
  sessions: any[];
  activeId: string | null;
  stoppingId: string | null;
  restartingId: string | null;
  onFocus: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (session: any) => void;
}

/** Session rail: status chips plus inline stop / restart per session. */
export default function SessionQueue({ sessions, activeId, stoppingId, restartingId, onFocus, onStop, onRestart }: SessionQueueProps) {
  return (
    <div className="hoot-card-soft flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-foreground">Session queue</div>
        <div className="text-[11px] opacity-45">{sessions.length} total</div>
      </div>
      {sessions.length === 0 ? (
        <div className="px-2 py-6 text-center text-xs opacity-50">
          No sessions found. Launch from{" "}
          <Link to="/launch" className="hoot-gold-text">
            Launch Center
          </Link>{" "}
          to populate this room.
        </div>
      ) : (
        sessions.map((session: any) => {
          const selected = session.id === activeId;
          const canRestart = session.profileId && session.status !== "running";
          return (
            <div
              key={session.id}
              className={`flex flex-col gap-2 rounded-xl border p-3 ${
                selected ? "hoot-active-item" : "border-border bg-foreground/[0.02]"
              }`}
            >
              <button onClick={() => onFocus(session.id)} className="flex w-full items-start justify-between gap-3 text-left" aria-current={selected ? "true" : undefined}>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{session.profileName || "Unnamed session"}</div>
                  <div className="mt-1 truncate font-mono text-[11px] opacity-45">{session.id}</div>
                </div>
                <SessionStatusChip status={session.status} />
              </button>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <Tag icon={Command} text={session.mode || session.taskMode || "session"} tone="blue" />
                  {session.project && <Tag icon={TerminalSquare} text={session.project} tone="violet" />}
                </div>
                <div className="flex gap-1.5">
                  {session.status === "running" && (
                    <button
                      onClick={() => onStop(session.id)}
                      disabled={stoppingId === session.id}
                      className={`${btn.danger} !px-2.5 !py-1.5 !text-[11px]`}
                      aria-label={`Stop ${session.profileName || session.id}`}
                    >
                      <Square size={11} /> Stop
                    </button>
                  )}
                  {canRestart && (
                    <button
                      onClick={() => onRestart(session)}
                      disabled={restartingId === session.id}
                      className={`${btn.secondary} !px-2.5 !py-1.5 !text-[11px]`}
                      aria-label={`Restart ${session.profileName || session.id}`}
                    >
                      {restartingId === session.id ? <Play size={11} /> : <RotateCcw size={11} />}
                      {restartingId === session.id ? "Launching…" : "Restart"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
