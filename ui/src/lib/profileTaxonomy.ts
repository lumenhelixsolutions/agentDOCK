export type AgentTheme = {
  id: string;
  label: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
};

const AGENT_THEMES: Record<string, AgentTheme> = {
  codex: { id: "codex", label: "Codex", color: "#6ee7b7", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.28)", glow: "rgba(16,185,129,0.18)" },
  claude: { id: "claude", label: "Claude", color: "#fdba74", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.28)", glow: "rgba(245,158,11,0.18)" },
  "claude-code": { id: "claude-code", label: "Claude Code", color: "#fbbf24", bg: "rgba(217,119,6,0.14)", border: "rgba(217,119,6,0.3)", glow: "rgba(217,119,6,0.2)" },
  ollama: { id: "ollama", label: "Ollama", color: "#c4b5fd", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.28)", glow: "rgba(139,92,246,0.18)" },
  hermes: { id: "hermes", label: "Hermes", color: "#67e8f9", bg: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.28)", glow: "rgba(6,182,212,0.18)" },
  aider: { id: "aider", label: "Aider", color: "#93c5fd", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.28)", glow: "rgba(59,130,246,0.18)" },
  kimi: { id: "kimi", label: "Kimi", color: "#f9a8d4", bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.28)", glow: "rgba(236,72,153,0.18)" },
  opencode: { id: "opencode", label: "OpenCode", color: "#5eead4", bg: "rgba(20,184,166,0.12)", border: "rgba(20,184,166,0.28)", glow: "rgba(20,184,166,0.18)" },
  gemini: { id: "gemini", label: "Gemini", color: "#7dd3fc", bg: "rgba(14,165,233,0.12)", border: "rgba(14,165,233,0.28)", glow: "rgba(14,165,233,0.18)" },
  "gemini-cli": { id: "gemini-cli", label: "Gemini CLI", color: "#bae6fd", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.28)", glow: "rgba(56,189,248,0.18)" },
};

const FALLBACK_THEME: AgentTheme = {
  id: "unknown",
  label: "Other",
  color: "#d6d3d1",
  bg: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.12)",
  glow: "rgba(255,255,255,0.08)",
};

export const TASK_INTENTS = [
  { id: "architecture", label: "Architecture", hint: "Design systems and structure" },
  { id: "bug-hunt", label: "Bug Hunt", hint: "Find and isolate defects" },
  { id: "patch-test", label: "Patch & Test", hint: "Small safe changes" },
  { id: "safe-audit", label: "Safe Audit", hint: "Read-only review posture" },
  { id: "heavy-refactor", label: "Heavy Refactor", hint: "Large structural edits" },
  { id: "code-review", label: "Code Review", hint: "Review-focused workflows" },
  { id: "documentation", label: "Documentation", hint: "Docs and explanations" },
  { id: "security-audit", label: "Security", hint: "Security-focused review" },
  { id: "performance", label: "Performance", hint: "Speed and efficiency" },
  { id: "general", label: "General", hint: "Flexible everyday work" },
] as const;

export function getAgentTheme(frontend?: string): AgentTheme {
  const key = String(frontend || "unknown").toLowerCase();
  return AGENT_THEMES[key] || { ...FALLBACK_THEME, id: key, label: key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) };
}

export function normalizeAgentId(frontend?: string): string {
  return String(frontend || "unknown").toLowerCase();
}

export function profileMatchesTask(profile: any, taskId: string): boolean {
  const taskMode = String(profile.taskMode || profile.meta?.task_mode || "").toLowerCase();
  const id = String(profile.id || "").toLowerCase();
  if (taskId === "general") return !TASK_INTENTS.some((t) => t.id !== "general" && profileMatchesTask(profile, t.id));
  return taskMode.includes(taskId.replace(/-/g, "")) || id.includes(taskId);
}

export const statusTone: Record<string, { color: string; bg: string; border: string; label: string }> = {
  READY: { color: "#86efac", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.18)", label: "Ready" },
  DEGRADED: { color: "#ffcb89", bg: "rgba(255,176,66,0.08)", border: "rgba(255,176,66,0.18)", label: "Needs fixes" },
  BLOCKED: { color: "#fca5a5", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.18)", label: "Blocked" },
  UNKNOWN: { color: "#d6d3d1", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.08)", label: "Unknown" },
};

export function sortProfilesForPick(profiles: any[]): any[] {
  const order = { READY: 0, DEGRADED: 1, UNKNOWN: 2, BLOCKED: 3 };
  return [...profiles].sort((a, b) => {
    const sa = order[a.state as keyof typeof order] ?? 9;
    const sb = order[b.state as keyof typeof order] ?? 9;
    if (sa !== sb) return sa - sb;
    return (b.score || 0) - (a.score || 0);
  });
}