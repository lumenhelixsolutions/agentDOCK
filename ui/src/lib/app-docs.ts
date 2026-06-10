export type ViewDoc = {
  title: string;
  group: string;
  summary: string;
  features: string[];
  orchestration: string;
  tips: string[];
};

export const VIEW_DOCS: Record<string, ViewDoc> = {
  "/": {
    title: "Overview",
    group: "Command Center",
    summary: "Mission dashboard — see profile health, active project, and what needs attention before you launch.",
    features: [
      "Ready / Fixable / Blocked profile counts",
      "Active project switcher (scopes scans & launches)",
      "Portfolio git health alerts",
      "Memory evidence preview",
    ],
    orchestration: "Start each session here. Resolve blockers before moving to Launch.",
    tips: ["Run Readiness if scan is stale", "Click a blocked profile to see why in Memory"],
  },
  "/scan": {
    title: "Readiness",
    group: "Command Center",
    summary: "Full system scan — agents, models, env keys, GPU, RTK, llama.cpp.",
    features: ["Run Scan button refreshes all detection", "Ollama loaded models", "Missing agent install hints"],
    orchestration: "Run after any install or env change. Feeds Stack Builder and profile scoring.",
    tips: ["Scan before first launch of the day", "Fix Ollama before local profiles"],
  },
  "/profiles": {
    title: "Profiles",
    group: "Command Center",
    summary: "Pick a launch profile — Easy 1-2-3 or Advanced agent groups.",
    features: ["Easy: Agent → Task → Launch", "Audit preview panel", "Telemetry per profile"],
    orchestration: "Select Ready profile → preview audit → launch → Sessions.",
    tips: ["Use Easy mode with 12+ profiles", "Blocked profiles need Memory check"],
  },
  "/launch": {
    title: "Launch Center",
    group: "Command Center",
    summary: "Goal-based launch staging with audit preview.",
    features: ["Privacy / speed / local goals", "Recommended vs blocked lists", "Script preview"],
    orchestration: "Set goal → preview top pick → launch when audit is clean.",
    tips: ["Never skip audit preview on experimental profiles"],
  },
  "/terminal": {
    title: "Sessions",
    group: "Command Center",
    summary: "Monitor live agent terminals.",
    features: ["Session list", "Stream output", "Send input", "Report outcome"],
    orchestration: "Watch launches here. Report outcome so Memory learns.",
    tips: ["Report outcome when session ends", "Use Stop for runaway processes"],
  },
  "/memory": {
    title: "Memory",
    group: "Intelligence",
    summary: "Evidence store — blocks bad launches after repeated failures.",
    features: ["Markdown evidence blocks", "Manual edit", "Parsed on every launch"],
    orchestration: "Check when profiles show Blocked. Fix cause, don't override blindly.",
    tips: ["Ask AI Coach to explain a block", "Edit carefully — launches read this file"],
  },
  "/builder": {
    title: "Stack Builder",
    group: "Build + Configure",
    summary: "Compose agent + model + tools with health scoring.",
    features: ["Wizard steps", "Quick templates", "Install tab", "Save as profile"],
    orchestration: "Build → fix score → save profile → launch from Profiles.",
    tips: ["● marks detected agents / loaded models", "Use MCP git instead of raw shell"],
  },
  "/skills": {
    title: "Skills",
    group: "Build + Configure",
    summary: "Compound engineering skills catalog.",
    features: ["Browse by category", "Skill content viewer"],
    orchestration: "Reference before picking a profile for a complex task.",
    tips: ["Match skill category to your task intent"],
  },
  "/settings": {
    title: "Settings",
    group: "Build + Configure",
    summary: "API keys, providers, llama.cpp, server settings.",
    features: ["Local browser key storage", "llama.cpp GGUF path", "RTK scan hints"],
    orchestration: "Configure once. Re-scan after local inference changes.",
    tips: ["AI Coach chat needs a provider key for full LLM answers"],
  },
};

export function getViewDoc(path: string): ViewDoc {
  return VIEW_DOCS[path] || {
    title: "HOOT",
    group: "Command Center",
    summary: "Local AI command center — scan, launch, monitor.",
    features: ["Use sidebar navigation"],
    orchestration: "Overview → Readiness → Profiles → Launch → Sessions → Memory",
    tips: ["Ask the AI Coach on any screen"],
  };
}

export const ORCHESTRATION_STEPS = [
  { label: "Overview", path: "/" },
  { label: "Readiness", path: "/scan" },
  { label: "Profiles", path: "/profiles" },
  { label: "Launch", path: "/launch" },
  { label: "Sessions", path: "/terminal" },
  { label: "Memory", path: "/memory" },
];