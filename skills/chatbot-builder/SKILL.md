---
name: chatbot-builder
description: >
  Build AgentDock Coach and portfolio chat UIs with assistant-ui. Use when upgrading
  the advisor panel, adding generative UI for launch commands, or scaffolding chat
  in agentdock/ui. Triggers: "coach UI", "chat panel", "assistant-ui", "Hey Coach".
origin: agentdock
---

# Chatbot Builder (AgentDock)

**Canonical skill:** `D:\projects\skills\chatbot-builder\SKILL.md`  
**Human doc:** `docs/CHATBOT_BUILDER.md`

AgentDock-specific rules on top of the portfolio standard.

## AgentDock constraints

- Server stays **zero runtime npm deps** — assistant-ui lives in `ui/` only
- Chat API already exists: `chat.js` → `POST /api/chat`
- Bind `127.0.0.1` only; runtime fetches same-origin
- Launch commands must use existing `json commands` block format until shared parser is extracted

## Implementation target

Replace the bespoke chat panel in `ui/` with:

```tsx
<AssistantRuntimeProvider runtime={useAgentDockRuntime(sessionId)}>
  <Thread />
</AssistantRuntimeProvider>
```

See `references/agentdock-integration.md` (copy of portfolio reference).

## Context blob sources

Pull before each Coach turn:

```
GET /api/scan
GET /api/profiles
GET /api/portfolio/health
memory.md excerpt (server-side)
vitals (when Vitals module lands)
```

## Command approval matrix

| `chat.js` command | UI gate |
|-------------------|---------|
| `showMessage`, `openUrl` | Inline OK |
| `runScan`, `generatePlan` | Confirm chip |
| `launch`, `setMemory`, `switchProject` | Approval card |

## Files to touch

| File | Change |
|------|--------|
| `ui/package.json` | Add `@assistant-ui/react`, adapter package |
| `ui/src/components/coach/` | Thread + runtime hook |
| `ui/src/lib/agentdockRuntime.ts` | External store → `/api/chat` |
| `chat.js` | Optional: export `parseCoachCommands()` |

## Do not

- Add assistant-ui to root `package.json` server bundle
- Bypass profile audit before executing `launch` commands from Coach
- Send raw `.env` values in context JSON

## References

- `references/agentdock-integration.md`
- `D:\projects\skills\chatbot-builder\references\assistant-ui.md`
- `D:\projects\docs\AI_OS_ARCHITECTURE.md`