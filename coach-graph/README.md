# HOOT Coach Graph (Phase 4 sidecar)

Status: **spec + scaffold** (M10 prep). Runtime not wired — kernel remains source of truth.

## Purpose

LangGraph sidecar for human-in-the-loop launch approval. Patterns borrowed from upstream AgentDock orchestration (reference only).

## First graph

```
scan → score profile → human approve → launch → remember
```

| Node | HOOT API / file |
|------|-----------------|
| `scan` | `GET /api/scan` (redacted) |
| `score` | Profile eval ≥ 80 via stack health |
| `approve` | assistant-ui tool call / Coach confirm card |
| `launch` | `POST /api/launch` with validated profile ID only |
| `remember` | `memory.md` + `state/stack-usage.json` |

## Planned layout

```
coach-graph/
  README.md           # this file
  graph.spec.json     # node + edge contract
  nodes/              # Python LangGraph nodes (Phase 4)
  server.py           # optional 127.0.0.1 sidecar on PORT+1
```

## Guardrails

- Never execute arbitrary shell — profile IDs from `profiles/*.md` only
- Kernel `server.js` owns launch authority
- No `agentdock-core` npm dependency

## Entry criteria

See `D:/projects/docs/PHASE_4_COACH_GRAPH_PREP.md`:

- [x] M2 HOOT Kernel GA
- [x] M9 bench + Coach confirm gates
- [ ] 10 launch-approval flows logged without manual recovery
- [ ] Graph spec reviewed against `AI_OS_ARCHITECTURE.md`

## Related

- `D:/projects/docs/PHASE_4_COACH_GRAPH_PREP.md`
- `D:/projects/skills/agentdock-framework/SKILL.md`