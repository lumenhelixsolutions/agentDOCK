export type StackTemplateNode =
  | { type: "agent"; agent: string }
  | { type: "llm"; model: string }
  | { type: "tool"; command: string; mcpServer?: string };

export type StackTemplate = {
  id: string;
  name: string;
  desc: string;
  tag: string;
  explainer: string;
  whenToUse: string[];
  requirements: string[];
  setupSteps?: string[];
  googleNote?: string;
  nodes: StackTemplateNode[];
};

export const STACK_TEMPLATES: StackTemplate[] = [
  {
    id: "local-audit",
    name: "Local audit",
    desc: "Ollama + Claude Code for safe offline review",
    tag: "Privacy-first",
    explainer:
      "Runs a read-heavy audit loop entirely on your machine. Claude Code drives the workflow while Ollama serves a local model — no cloud tokens for inference, ideal for proprietary codebases.",
    whenToUse: [
      "You need offline or air-gapped review",
      "Repo has secrets or regulated data",
      "You already have Ollama + Claude Code installed",
    ],
    requirements: ["Ollama running", "ollama pull llama3.1:8b (or loaded equivalent)", "Claude Code CLI detected"],
    nodes: [
      { type: "agent", agent: "claude-code" },
      { type: "llm", model: "llama3.1:8b" },
    ],
  },
  {
    id: "cloud-fast",
    name: "Cloud fast",
    desc: "Gemini Flash + Codex for quick iteration",
    tag: "Speed",
    explainer:
      "Pairs OpenAI Codex with Gemini 2.0 Flash for large-context cloud iteration. Best when you want fast scaffolding, multi-file reasoning, and you have API keys in the vault.",
    whenToUse: [
      "Greenfield features or rapid prototyping",
      "Large monorepos where context window matters",
      "You have GEMINI_API_KEY and OPENAI_API_KEY",
    ],
    requirements: ["Codex CLI", "GEMINI_API_KEY or GOOGLE_API_KEY in vault", "Network access"],
    nodes: [
      { type: "agent", agent: "codex" },
      { type: "llm", model: "gemini-2.0-flash" },
    ],
  },
  {
    id: "llamacpp-audit",
    name: "llama.cpp audit",
    desc: "Second local backend beside Ollama — uses GGUF from scan",
    tag: "Dual local",
    explainer:
      "Uses llama-server (GGUF) instead of Ollama for inference. HOOT picks up discovered GGUF weights from your scan and routes Claude Code through the llama.cpp HTTP API.",
    whenToUse: [
      "You prefer GGUF models or custom quantizations",
      "Ollama is unavailable but llama-server is running",
      "You want a second local backend for comparison",
    ],
    requirements: ["llama-server reachable", "GGUF discovered in scan or path set in Settings", "Claude Code CLI"],
    setupSteps: ["Start llama-server with your GGUF", "Re-run scan so HOOT detects the endpoint"],
    nodes: [
      { type: "agent", agent: "claude-code" },
      { type: "llm", model: "llamacpp-local" },
    ],
  },
  {
    id: "google-gemma-local",
    name: "Gemma 3 local",
    desc: "Gemma 3 4B on Ollama + Gemini CLI for Google-native local coding",
    tag: "Google local",
    explainer:
      "Google's Gemma 3 family (built on Gemini tech) runs fully local via Ollama. Gemma 3 4B is multimodal with 128K context — strong for docs, review, and light refactors on modest VRAM (~3.3 GB). Pairs with Gemini CLI as the agent frontend.",
    whenToUse: [
      "You want a Google model without cloud inference cost",
      "8 GB+ VRAM or CPU offload for gemma3:4b",
      "Safe audit, documentation, and bug-hunt profiles (gemma:4b tier)",
    ],
    requirements: [
      "Ollama 0.6+",
      "ollama pull gemma3:4b",
      "Gemini CLI (npm i -g @google/gemini-cli)",
      "Optional: GEMINI_API_KEY for cloud fallback inside CLI",
    ],
    googleNote:
      "Gemma 3 replaces legacy gemma2/gemma:4b tags in Ollama. QAT variants (gemma3:4b-it-qat) cut VRAM ~3× with similar quality. Consumer Gemini CLI migrates to Antigravity CLI on June 18, 2026 — enterprise API keys keep Gemini CLI access.",
    nodes: [
      { type: "agent", agent: "gemini-cli" },
      { type: "llm", model: "gemma3:4b" },
    ],
  },
  {
    id: "google-gemma-12b",
    name: "Gemma 3 12B",
    desc: "Heavier local Gemma for architecture and reasoning",
    tag: "Google local+",
    explainer:
      "Gemma 3 12B (~8 GB) steps up reasoning, HumanEval, and multilingual tasks versus 4B. Use when you have the VRAM and want local Google-quality analysis without sending code to the cloud.",
    whenToUse: [
      "Architecture reviews and deeper reasoning locally",
      "12 GB+ VRAM available",
      "You outgrew 4B but want to stay offline",
    ],
    requirements: ["Ollama 0.6+", "ollama pull gemma3:12b", "Gemini CLI or Claude Code as frontend"],
    googleNote: "For heavy refactors, HOOT profiles still recommend advanced-tier models — check compatibility warnings for gemma stacks.",
    nodes: [
      { type: "agent", agent: "gemini-cli" },
      { type: "llm", model: "gemma3:12b" },
    ],
  },
  {
    id: "google-gemini-cli-cloud",
    name: "Gemini CLI cloud",
    desc: "Gemini CLI + Gemini 2.0 Flash — full cloud agent loop",
    tag: "Google cloud",
    explainer:
      "The official Google terminal agent (gemini command) backed by Gemini 2.0 Flash in the cloud. Huge context (1M tokens), strong for multi-file edits, research, and agentic tool use when local VRAM is limited.",
    whenToUse: [
      "You want Google's agent harness with minimal local setup",
      "Large repos needing million-token context",
      "You have GEMINI_API_KEY or Google One / AI Pro auth",
    ],
    requirements: [
      "npm install -g @google/gemini-cli",
      "GEMINI_API_KEY or GOOGLE_API_KEY in vault",
      "Google account for interactive auth",
    ],
    googleNote:
      "Unpaid Gemini CLI + Code Assist for individuals sunset June 18, 2026 in favor of Antigravity CLI (Go-based, multi-agent, same skills/hooks). Enterprise Gemini Code Assist licenses are unaffected.",
    setupSteps: ["gemini --version to verify", "Set GEMINI_API_KEY in Settings vault or .env"],
    nodes: [
      { type: "agent", agent: "gemini-cli" },
      { type: "llm", model: "gemini-2.0-flash" },
    ],
  },
  {
    id: "google-gemma-router",
    name: "Gemma router (hybrid)",
    desc: "Gemini CLI + local Gemma 3 1B classifier — Flash/Pro routing",
    tag: "Hybrid Google",
    explainer:
      "Experimental cost-saver: `gemini gemma setup` installs a local Gemma 3 1B LiteRT server that classifies each request (~100 ms). Simple tasks route to Gemini Flash; complex ones to Gemini Pro — cutting cloud token use while keeping the Gemini CLI UX.",
    whenToUse: [
      "You use Gemini CLI daily and want lower API bills",
      "~1 GB disk for the router model",
      "Comfortable with experimental routing (silent cloud fallback if local server is down)",
    ],
    requirements: [
      "Gemini CLI installed",
      "gemini gemma setup (accepts Gemma Terms of Use)",
      "GEMINI_API_KEY for Flash/Pro backends",
    ],
    googleNote:
      "Router uses gemma3:1b locally — not the same as running full coding on Gemma 4B/12B. Verify with `gemini gemma status` and `gemini gemma logs`. Disable via experimental.gemmaModelRouter.enabled: false in settings.",
    setupSteps: [
      "gemini gemma setup",
      "gemini gemma status — all checks green",
      "Use CLI normally; routing is automatic",
    ],
    nodes: [
      { type: "agent", agent: "gemini-cli" },
      { type: "llm", model: "gemini-2.0-flash" },
    ],
  },
  {
    id: "google-gemma-audit",
    name: "Gemma safe audit",
    desc: "Gemma 3 4B + Gemini CLI — maps to local-safe-audit-gemma profiles",
    tag: "Audit",
    explainer:
      "Aligns with HOOT's nine gemma4b local profiles (safe-audit, code-review, bug-hunt, etc.). Gemma 3 4B is rated 'light' tier — perfect for read-only audits, docs, and security scans, not heavy refactors.",
    whenToUse: [
      "Read-only codebase audit",
      "Security or performance review passes",
      "Minimum cloud exposure with Google toolchain",
    ],
    requirements: ["ollama pull gemma3:4b", "Gemini CLI", "8 GB RAM minimum"],
    googleNote: "Compatibility rules flag gemma:4b for heavy-refactor — HOOT will warn if you push this stack beyond light tasks.",
    nodes: [
      { type: "agent", agent: "gemini-cli" },
      { type: "llm", model: "gemma3:4b" },
    ],
  },
  {
    id: "grok-build",
    name: "Grok Build",
    desc: "Grok Build CLI + grok-build-0.1 — xAI agentic coding",
    tag: "xAI",
    explainer:
      "xAI's Grok Build CLI with 256K context, subagents, skills, and MCP. Uses XAI_API_KEY from vault. Good alternative when you want a non-OpenAI/non-Google agent frontend.",
    whenToUse: ["You have XAI_API_KEY or SuperGrok auth", "Agentic coding with MCP tooling", "Large context agent sessions"],
    requirements: ["irm https://x.ai/cli/install.ps1 | iex (Windows)", "XAI_API_KEY in vault"],
    nodes: [
      { type: "agent", agent: "grok-cli" },
      { type: "llm", model: "grok-build-0.1" },
    ],
  },
];

export function getStackTemplate(id: string): StackTemplate | undefined {
  return STACK_TEMPLATES.find((t) => t.id === id);
}