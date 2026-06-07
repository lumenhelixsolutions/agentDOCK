/**
 * AgentDock v2.0 REST API Client
 */

const API_BASE = ''

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(`${API_BASE}${path}`, opts)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data as T
}

export const api = {
  getProfiles: () => request<Array<any>>('GET', '/api/profiles'),
  getProfile: (id: string) => request<any>('GET', `/api/profile/${encodeURIComponent(id)}`),
  runScan: (repo?: string) => request<any>('GET', `/api/scan?repo=${encodeURIComponent(repo || '')}`),
  makePlan: (goal: string) => request<any>('POST', '/api/plan', { goal }),
  dryRun: (id: string) => request<any>('POST', `/api/launch/${encodeURIComponent(id)}`, { dryRun: true }),
  launch: (id: string, overrideReason?: string) => request<any>('POST', `/api/launch/${encodeURIComponent(id)}`, { overrideReason }),
  getSessions: () => request<any>('GET', '/api/sessions'),
  getSessionOutput: (id: string, since: number) => request<any>('GET', `/api/session/${encodeURIComponent(id)}/output?since=${since}`),
  sendInput: (id: string, text: string) => request<void>('POST', `/api/session/${encodeURIComponent(id)}/input`, { text }),
  stopSession: (id: string) => request<void>('POST', `/api/session/${encodeURIComponent(id)}/stop`, {}),
  reportOutcome: (id: string, outcome: string) => request<void>('POST', `/api/session/${encodeURIComponent(id)}/outcome`, { outcome }),
  getMemory: () => request<{ text: string }>('GET', '/api/memory'),
  setMemory: (text: string) => request<void>('POST', '/api/memory', { text }),
  getCatalog: () => request<any>('GET', '/api/catalog'),
  getProjects: () => request<any>('GET', '/api/projects'),
  setActiveProject: (path: string) => request<void>('POST', '/api/active-project', { path }),
  analyze: (question?: string) => request<any>('POST', '/api/advisor/analyze', { question, useGemini: false }),
  chat: (sessionId: string, text: string) => request<any>('POST', '/api/chat', { sessionId, text }),
  clearChat: (sessionId: string) => request<void>('POST', '/api/chat/clear', { sessionId }),
  getTemplates: () => request<any>('GET', '/api/templates'),
  getResearch: () => request<any>('GET', '/api/research/latest'),
  runResearch: () => request<any>('POST', '/api/research/run', {}),
  getUsage: () => request<any>('GET', '/api/usage'),
  getMcp: () => request<any>('GET', '/api/mcp'),
  getPortfolioHealth: () => request<any>('GET', '/api/portfolio/health'),
  getSuggestions: () => request<any>('GET', '/api/suggestions'),
} as const
