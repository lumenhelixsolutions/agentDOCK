export type CoachConfirmLevel = "auto" | "soft" | "hard";

const HARD = new Set([
  "launch",
  "launchProfile",
  "setMemory",
  "appendMemory",
  "switchProject",
]);

const SOFT = new Set(["runScan", "generatePlan", "makePlan", "getStatus"]);

export function coachConfirmLevel(cmd: Record<string, unknown>): CoachConfirmLevel {
  const type = String(cmd.type || "");
  if (HARD.has(type)) return "hard";
  if (SOFT.has(type)) return "soft";
  return "auto";
}

export function coachCommandLabel(cmd: Record<string, unknown>): string {
  const type = String(cmd.type || "action");
  if (type === "launch" || type === "launchProfile") {
    const id = cmd.profileId || cmd.profile || cmd.id;
    return id ? `Launch profile ${id}` : "Launch profile";
  }
  if (type === "switchProject") return `Switch project to ${cmd.path || cmd.project || "selection"}`;
  if (type === "setMemory" || type === "appendMemory") return "Write to memory.md";
  if (type === "runScan") return "Run system scan";
  if (type === "makePlan" || type === "generatePlan") return "Generate launch plan";
  if (type === "showMessage") return String(cmd.text || "Show message");
  if (type === "openUrl") return `Open ${cmd.url || "link"}`;
  return type;
}

export function coachConfirmMessage(cmd: Record<string, unknown>, level: CoachConfirmLevel): string {
  const label = coachCommandLabel(cmd);
  if (level === "hard") return `HOOT wants to: ${label}. This changes runtime state. Approve?`;
  if (level === "soft") return `HOOT suggests: ${label}. Proceed?`;
  return label;
}