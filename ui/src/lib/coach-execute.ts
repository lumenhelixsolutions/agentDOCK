import { api } from "@/lib/api";

export type CoachToolRun = {
  type: string;
  ok: boolean;
  summary: string;
  route?: string | null;
  target?: string | null;
  launched?: boolean;
};

export type CoachExecuteOutcome = {
  ok: boolean;
  statuses: string[];
  route?: string | null;
  target?: string | null;
  launched?: boolean;
};

export function toolRunsToStatuses(toolRuns: CoachToolRun[]): string[] {
  return toolRuns.map((tr) => (tr.ok ? `✓ ${tr.summary}` : `✗ ${tr.summary}`));
}

export function applyToolRunEffects(
  toolRuns: CoachToolRun[],
  handlers: {
    navigate: (route: string) => void;
    emitAction: (target: string) => void;
    onStatus?: (msg: string | null) => void;
  },
): CoachExecuteOutcome {
  const statuses = toolRunsToStatuses(toolRuns);
  let route: string | null = null;
  let target: string | null = null;
  let launched = false;
  let ok = toolRuns.every((tr) => tr.ok);

  for (const tr of toolRuns) {
    if (tr.route) route = tr.route;
    if (tr.target) target = tr.target;
    if (tr.launched) launched = true;
  }

  if (route) handlers.navigate(route);
  if (target) handlers.emitAction(target);
  if (launched) handlers.onStatus?.("Session launched");
  else if (ok) handlers.onStatus?.(null);

  return { ok, statuses, route, target, launched };
}

function statusForCommand(cmd: Record<string, unknown>, res: Record<string, unknown>, last?: Record<string, unknown>): string {
  const type = String(cmd.type || "action");
  if (!res.ok) {
    const err = String(last?.error || res.message || "blocked");
    return `✗ ${type} — ${err}`;
  }
  if (type === "runScan") return "✓ HOOT ran system scan";
  if (type === "getStatus") return "✓ HOOT fetched live status";
  if (type === "readMemory") return "✓ HOOT read memory";
  if (type === "appendMemory") return "✓ HOOT logged to memory";
  if (type === "makePlan") return "✓ HOOT built launch plan";
  if (type === "launchProfile") return "✓ HOOT launched safe profile";
  if (type === "navigate") return `✓ Opening ${String(cmd.route || cmd.target || "/")}`;
  if (type === "coachAction") {
    const label = String(last?.label || last?.target || cmd.target || "action");
    return `✓ HOOT triggered ${label}`;
  }
  if (type === "switchProject") return "✓ HOOT switched active project";
  return `✓ HOOT ran ${type}`;
}

export async function executeCoachCommands(
  commands: Array<Record<string, unknown>>,
  handlers: {
    navigate: (route: string) => void;
    emitAction: (target: string) => void;
    onStatus?: (msg: string) => void;
  },
): Promise<CoachExecuteOutcome> {
  const statuses: string[] = [];
  let route: string | null = null;
  let target: string | null = null;
  let launched = false;
  let ok = true;

  for (const cmd of commands) {
    const label = String(cmd.type || "action");
    handlers.onStatus?.(`HOOT running ${label}…`);
    try {
      const res = await api.coachExecute(cmd);
      const last = res.results?.[res.results.length - 1];
      const line = statusForCommand(cmd, res, last);
      statuses.push(line);
      ok = ok && Boolean(res.ok);
      if (res.route) route = res.route;
      if (res.target) target = res.target;
      if (res.launched) launched = true;
      if (cmd.type === "showMessage") alert(String(res.message || last?.message || cmd.text || ""));
      if (cmd.type === "openUrl") window.open(String(last?.url || cmd.url || ""), "_blank");
    } catch {
      statuses.push(`✗ ${label} failed`);
      ok = false;
      continue;
    }
  }

  if (route) handlers.navigate(route);
  if (target) handlers.emitAction(target);

  return { ok, statuses, route, target, launched };
}