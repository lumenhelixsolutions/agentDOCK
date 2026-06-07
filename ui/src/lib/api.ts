/**
 * AgentDock v2.0 REST API Client
 * Thin wrapper around the Node.js server's HTTP endpoints.
 */

const API_BASE = '' // proxied via Vite to http://127.0.0.1:7777

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(`${API_BASE}${path}`, opts)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data as T
}

export const api = {
  // Profiles
  getProfiles: () => request<Array<{
    id: string
    name: string
    meta: Record<string, unknown>
    hasLaunch: boolean
  }>>('GET', '/api/profiles'),

  getProfile: (id: string) => request<{ id: string; name: string; meta: Record<string, unknown>; body: string }>('GET', `/api/profile/${encodeURIComponent(id)}`),

  // Scan
  runScan: (repo?: string) => request<Record<string, unknown>>('GET', `/api/scan?repo=${encodeURIComponent(repo || '')}`),

  // Plan
  makePlan: (goal: string) => request<{
    recommended: Array<Record<string, unknown>>
    blocked: Array<Record<string, unknown>>
  }>('POST', '/api/plan', { goal }),

  // Launch
  dryRun: (id: string) => request<{ script: string; project?: string; blocked?: boolean; message?: string }>('POST', `/api/launch/${encodeURIComponent(id)}`, { dryRun: true }),
  launch: (id: string, overrideReason?: string) => request<{ launched?: boolean; session?: { id: string; profileName: string; status: string }; blocked?: boolean; message?: string }>('POST', `/api/launch/${encodeURIComponent(id)}`, { overrideReason }),

  // Sessions
  getSessions: () => request<{ sessions: Array<{ id: string; profileId: string; profileName: string; status: string }> }>('GET', '/api/sessions'),
  getSessionOutput: (id: string, since: number) => request<{ chunk: string; cursor: number; session: { status: string; exitCode?: number } }>('GET', `/api/session/${encodeURIComponent(id)}/output?since=${since}`),
  sendInput: (id: string, text: string) => request<void>('POST', `/api/session/${encodeURIComponent(id)}/input`, { text }),
  stopSession: (id: string) => request<void>('POST', `/api/session/${encodeURIComponent(id)}/stop`, {}),
  reportOutcome: (id: string, outcome: string) => request<void>('POST', `/api/session/${encodeURIComponent(id)}/outcome`, { outcome }),

  // Memory
  getMemory: () => request<{ text: string }>('GET', '/api/memory'),
  setMemory: (text: string) => request<void>('POST', '/api/memory', { text }),

  // Catalog
  getCatalog: () => request<{ tools: Array<Record<string, unknown>> }>('GET', '/api/catalog'),

  // Projects
  getProjects: () => request<{ projects: Array<Record<string, unknown>>; active: string | null }>('GET', '/api/projects'),
  setActiveProject: (path: string) => request<void>('POST', '/api/active-project', { path }),

  // Advisor
  analyze: (question?: string) => request<{ advice: string; source: string }>('POST', '/api/advisor/analyze', { question, useGemini: false }),

  // Chat
  chat: (sessionId: string, text: string) => request<{ text: string; commands?: Array<any> }>('POST', '/api/chat', { sessionId, text }),
  clearChat: (sessionId: string) => request<void>('POST', '/api/chat/clear', { sessionId }),

  // Templates
  getTemplates: () => request<{ templates: Array<{ id: string; label: string }> }>('GET', '/api/templates'),
} as const
