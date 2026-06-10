# AgentDock + assistant-ui Integration

> Synced from `D:\projects\skills\chatbot-builder\references\agentdock-integration.md`

Wire assistant-ui as the Coach UI while AgentDock remains the kernel (scan, profiles, launch, memory).

## APIs to feed context

| Endpoint | Data |
|----------|------|
| `GET /api/scan` | Local tools, models, env hints |
| `GET /api/profiles` | Launch profiles + telemetry |
| `GET /api/portfolio/health` | Cross-project status |
| `GET /api/mcp` | MCP server catalog |
| `POST /api/chat` | Multi-provider chat + commands |
| `POST /api/advisor/analyze` | Rule/Gemini advisor |

Build a **context blob** on the server before each turn. Never send raw `.env` values.

## Custom runtime

Wrap existing `POST /api/chat` with `useExternalStoreRuntime` from `@assistant-ui/react`. Parse ` ```json commands``` ` blocks into Generative UI approval cards before executing.

## Migration

1. Add packages to `ui/package.json` only
2. Introduce `useAgentDockRuntime` in `ui/src/lib/`
3. Swap chat panel for `<Thread />`
4. Keep `chat.js` session map unchanged
5. Add Vitest smoke test with mocked fetch

## Local-only

Fetch same-origin `/api/*` on `127.0.0.1` — no CORS changes.