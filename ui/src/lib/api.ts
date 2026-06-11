import { hootReportError, shouldAutoReport } from "./hoot-bus";

const API_BASE = "";
const TOKEN_KEY = "hoot_session_token";

export function getHootToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setHootToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getHootToken();
  if (token) headers["X-HOOT-Token"] = token;
  const opts: RequestInit = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/html") && path.startsWith("/api/")) {
    throw new Error(`API returned HTML instead of JSON for ${path} — restart HOOT server (node server.js).`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = String((data as { error?: string }).error || `HTTP ${res.status}`);
    if (res.status === 401 && (data as { login_required?: boolean }).login_required) {
      const err = new Error(msg) as Error & { loginRequired?: boolean };
      err.loginRequired = true;
      throw err;
    }
    if (shouldAutoReport(path, res.status)) {
      hootReportError({
        message: msg,
        source: path.replace(/^\/api\//, ""),
        fix: path.includes("/scan") ? "Check scanner.ps1 and PowerShell execution policy, then retry." : undefined,
      });
    }
    throw new Error(msg);
  }
  return data as T;
}

export const api = {
  getStatus: () => request<{ ok: boolean; version: string; bind?: { host: string; port: number; lan: boolean }; urls?: string[]; auth?: { enabled: boolean } }>("GET", "/api/status"),
  getAuthStatus: () => request<{ enabled: boolean; authenticated: boolean; loopback: boolean; lan: boolean }>("GET", "/api/auth/status"),
  generateAuthToken: (enabled = true) => request<{ ok: boolean; token: string }>("POST", "/api/auth/token", { enabled }),
  clearAuthToken: () => request<{ ok: boolean }>("DELETE", "/api/auth/token"),
  getActivity: (from?: string, to?: string) => request<any>("GET", `/api/activity${from || to ? `?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString()}` : ""}`),
  getActivityToday: () => request<any>("GET", "/api/activity/today"),
  getActivityAnalytics: (days = 30, to?: string) => {
    const params = new URLSearchParams({ days: String(days) });
    if (to) params.set("to", to);
    return request<import("./activity-types").ActivityAnalytics>("GET", `/api/activity/analytics?${params}`);
  },
  exportActivityJson: (days = 30) => request<{ ok: boolean; analytics: import("./activity-types").ActivityAnalytics }>("GET", `/api/activity/export?days=${days}`),
  writeDiary: (date?: string) => request<any>("POST", "/api/activity/diary", { date }),
  getProfiles: () => request<Array<any>>("GET", "/api/profiles"),
  getProfileGroups: () => request<any>("GET", "/api/profiles/groups"),
  getProfileMatrix: () => request<any>("GET", "/api/profiles/matrix"),
  getProfile: (id: string) => request<any>("GET", `/api/profile/${encodeURIComponent(id)}`),
  createProfile: (data: any) => request<any>("POST", "/api/profiles/create", data),
  runScan: (repo?: string) => request<any>("GET", `/api/scan?repo=${encodeURIComponent(repo || "")}&refresh=1`),
  getScanCached: (repo?: string) => request<any>("GET", `/api/scan?cached=1&repo=${encodeURIComponent(repo || "")}`),
  getBootstrap: (refreshRegistry?: boolean) =>
    request<{
      version: number;
      scan: any;
      profiles: any[];
      usage: any;
      memory: { text: string };
      projects: { projects: any[]; active: string | null };
      portfolio: { items: any[] };
      activeProject: { active: string | null; project: any };
      tokenBurn: any;
    }>("GET", `/api/bootstrap${refreshRegistry ? "?refresh_registry=1" : ""}`),
  getProfilesSummary: () => request<any[]>("GET", "/api/profiles/summary"),
  getTokenBurn: (refresh?: boolean) => request<any>("GET", `/api/token-burn${refresh ? "?refresh=1" : ""}`),
  getAgentRadar: (force?: boolean) =>
    request<{
      scanned_at: string;
      processes: Array<{ pid: number; name: string; command: string; agent_id: string; agent_name: string; source: string }>;
      agents: Array<{ id: string; name: string; count: number; dock: number; external: number; pids: number[] }>;
      summary: { total: number; dock: number; external: number; agent_types: number };
      dock_sessions?: number;
      cached?: boolean;
      note?: string;
    }>("GET", `/api/agent-radar${force ? "?force=1" : ""}`),
  makePlan: (goal: string) => request<any>("POST", "/api/plan", { goal }),
  dryRun: (id: string) => request<any>("POST", `/api/launch/${encodeURIComponent(id)}`, { dryRun: true }),
  launch: (id: string, overrideReason?: string) => request<any>("POST", `/api/launch/${encodeURIComponent(id)}`, { overrideReason }),
  getSessions: () => request<any>("GET", "/api/sessions"),
  getSessionOutput: (id: string, since: number) => request<any>("GET", `/api/session/${encodeURIComponent(id)}/output?since=${since}`),
  sendInput: (id: string, text: string) => request<void>("POST", `/api/session/${encodeURIComponent(id)}/input`, { text }),
  stopSession: (id: string) => request<void>("POST", `/api/session/${encodeURIComponent(id)}/stop`, {}),
  reportOutcome: (id: string, outcome: string) => request<void>("POST", `/api/session/${encodeURIComponent(id)}/outcome`, { outcome }),
  getMemory: () => request<{ text: string }>("GET", "/api/memory"),
  setMemory: (text: string) => request<void>("POST", "/api/memory", { text }),
  getCompatibilityRules: () => request<any>("GET", "/api/compatibility-rules"),
  getCatalog: () => request<any>("GET", "/api/catalog"),
  getProjects: () => request<any>("GET", "/api/projects"),
  getActiveProject: () => request<any>("GET", "/api/active-project"),
  setActiveProject: (path: string) => request<void>("POST", "/api/active-project", { path }),
  analyze: (question?: string) => request<any>("POST", "/api/advisor/analyze", { question, useGemini: false }),
  chat: (sessionId: string, text: string, opts?: { provider?: string; model?: string; apiKey?: string; customEndpoint?: string; coachView?: string; pageContext?: Record<string, unknown> }) =>
    request<any>("POST", "/api/chat", { sessionId, text, ...opts }),
  clearChat: (sessionId: string) => request<void>("POST", "/api/chat/clear", { sessionId }),
  getTemplates: () => request<any>("GET", "/api/templates"),
  getResearch: () => request<any>("GET", "/api/research/latest"),
  runResearch: () => request<any>("POST", "/api/research/run", {}),
  getUsage: () => request<any>("GET", "/api/usage"),
  getMcp: () => request<any>("GET", "/api/mcp"),
  getSettings: () => request<any>("GET", "/api/settings"),
  saveSettings: (settings: unknown) => request<any>("POST", "/api/settings", { settings }),
  getKeys: () => request<{ keys: Array<{ name: string; provider: string; masked: string; source: string; updatedAt: string }>; count: number }>("GET", "/api/keys"),
  saveKey: (name: string, value: string) => request<any>("POST", "/api/keys", { name, value }),
  deleteKey: (name: string) => request<any>("POST", "/api/keys", { name, delete: true }),
  syncKeys: () => request<{ ok: boolean; imported: number; keys: Array<Record<string, unknown>> }>("POST", "/api/keys/sync", {}),
  getPortfolioHealth: () => request<any>("GET", "/api/portfolio/health"),
  getSuggestions: () => request<any>("GET", "/api/suggestions"),
  getModules: () => request<{ version: string; modules: Array<any>; auto_sync?: { enabled: boolean; interval_days: number } }>("GET", "/api/modules"),
  getPrefab: () => request<Record<string, unknown>>("GET", "/api/prefab"),
  getModule: (id: string) => request<any>("GET", `/api/modules/${encodeURIComponent(id)}`),
  getModuleInstallPlan: (id: string) => request<any>("GET", `/api/modules/${encodeURIComponent(id)}/install-plan`),
  setModuleEnabled: (id: string, enabled: boolean) =>
    request<any>("POST", `/api/modules/${encodeURIComponent(id)}/enable`, { enabled }),
  syncModule: (id: string) => request<{ ok: boolean; output?: string }>("POST", `/api/modules/${encodeURIComponent(id)}/sync`, {}),
  installModule: (id: string, target: string) =>
    request<any>("POST", `/api/modules/${encodeURIComponent(id)}/install`, { target }),
  fullModuleSetup: (id: string) =>
    request<any>("POST", `/api/modules/${encodeURIComponent(id)}/full-setup`, {}),
  runModulesAutoSync: () => request<any>("POST", "/api/modules/auto-sync", {}),
  setModuleSettings: (auto_sync: { enabled?: boolean; interval_days?: number }) =>
    request<any>("POST", "/api/modules/settings", { auto_sync }),
  getAgents: () => request<{ agents: Array<any> }>("GET", "/api/agents"),
  getSkills: () => request<{ skills: Array<any> }>("GET", "/api/skills"),
  getSkill: (id: string) => request<any>("GET", `/api/skills/${encodeURIComponent(id)}`),
  getSkillContent: (id: string) => request<{ content: string }>("GET", `/api/skills/${encodeURIComponent(id)}/content`),
  getCoachHints: (view: string, pageContext?: Record<string, unknown>) =>
    request<{ hints: Array<Record<string, unknown>>; view: string; guide?: Record<string, unknown>; orchestration?: Record<string, unknown> }>("POST", "/api/coach/hints", { view, pageContext: pageContext || {} }),
  getCoachDocs: (view: string) =>
    request<{ view: string; guide: Record<string, unknown>; orchestration: Record<string, unknown> }>("GET", `/api/coach/docs?view=${encodeURIComponent(view)}`),
  getCoachBrain: () =>
    request<{ brain: Record<string, unknown>; pull?: Record<string, unknown>; scan?: Record<string, unknown> }>("GET", "/api/coach/brain"),
  getCoachTools: () =>
    request<{
      tools: { app: Array<Record<string, unknown>>; mcp: Array<Record<string, unknown>> };
      coachActions: Array<{ id: string; label: string; aliases?: string[] }>;
      mcpPreview?: Record<string, unknown> | null;
    }>("GET", "/api/coach/tools"),
  coachExecute: (command: Record<string, unknown>) =>
    request<{
      ok: boolean;
      results: Array<Record<string, unknown>>;
      route?: string | null;
      target?: string | null;
      message?: string | null;
      launched?: boolean;
      session?: Record<string, unknown> | null;
    }>("POST", "/api/coach/execute", { command }),
  getCoachAudit: (limit = 50) =>
    request<{ entries: Array<Record<string, unknown>>; count: number }>("GET", `/api/coach/audit?limit=${limit}`),
  getProviderCooldown: () =>
    request<{
      version: number;
      providers: Record<string, { label: string; status: string; effective_status?: string; cooldown_until?: string | null; eta?: string | null; cooldown_label?: string | null }>;
      current_session_provider?: string | null;
      matrix_line: string;
      limits_reference?: Record<string, unknown>;
      updated_at?: string;
    }>("GET", "/api/providers/cooldown"),
  patchProviderCooldown: (body: { provider?: string; status?: string; cooldown_until?: string | null; preset?: string; current_session_provider?: string | null }) =>
    request<any>("PATCH", "/api/providers/cooldown", body),
  getWorkspaceRoots: () =>
    request<{ roots: Array<{ id: string; label: string; path: string; role?: string; exists?: boolean; valid?: boolean }>; active_root_id: string; active_root?: Record<string, unknown> | null; enforce_boundaries: boolean }>("GET", "/api/workspace/roots"),
  putWorkspaceRoots: (body: { roots?: Array<{ id: string; label: string; path: string; role?: string }>; active_root_id?: string; enforce_boundaries?: boolean }) =>
    request<any>("PUT", "/api/workspace/roots", body),
  generateHandoff: (body?: { next_action?: string; write_snapshot?: boolean }) =>
    request<{ markdown: string; json: Record<string, unknown>; copied_at: string; snapshot_path?: string | null }>("POST", "/api/handoff/generate", body || {}),
  getHandoffLatest: () => request<{ markdown?: string; empty?: boolean }>("GET", "/api/handoff/latest"),
  getOnboarding: () =>
    request<{
      version: number;
      completed: boolean;
      current_step: string;
      steps: Array<{ id: string; title: string; summary: string }>;
      checks: Record<string, boolean>;
      portfolio_roots: string[];
      scan_summary: Record<string, unknown> | null;
      projects: { active: string | null; count: number; items: Array<Record<string, unknown>> };
      layout: Record<string, unknown>;
      providers: Record<string, unknown>;
    }>("GET", "/api/onboarding"),
  postOnboarding: (body: Record<string, unknown>) =>
    request<{ ok: boolean; onboarding: Record<string, unknown>; scan?: unknown; projects?: unknown; roots?: unknown }>("POST", "/api/onboarding", body),
  getTelemetry: () =>
    request<{ file: string | null; kernel: string; mirror: string | null; telemetry: Record<string, unknown> }>("GET", "/api/telemetry"),
  syncTelemetry: (importFromDisk?: boolean) =>
    request<{ ok: boolean; direction: string; telemetry?: Record<string, unknown>; files?: Record<string, unknown> }>("POST", "/api/telemetry/sync", { import: importFromDisk }),
  sessionBootstrap: (body: {
    cooldowns?: Array<{ provider: string; status?: string; cooldown_until?: string | null; preset?: string }>;
    current_session_provider?: string | null;
    roots?: Array<{ id: string; label: string; path: string; role?: string }>;
    active_root_id?: string;
    enforce_boundaries?: boolean;
    inbound_handoff?: string;
  }) => request<any>("POST", "/api/session/bootstrap", body),
} as const;
