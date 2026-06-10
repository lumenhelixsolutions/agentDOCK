# AgentDock Memory

This file is the local learning layer. AgentDock reads this before recommending or launching stacks.

## Known Successes

### Hermes + Ollama + llama31-hermes-64k
Date: 2026-06-05
Machine: RTX 4060 8GB
Status: success
Observed: `ollama ps` reported `CONTEXT 64000`
Decision: recommend this for private local Hermes Agent work.

## Known Failures

## Evidence: qwen-local-hermes-64k
Date: 2026-06-05
Profile: qwen-local-hermes-64k
Status: blocked
Observed: Qwen local attempts repeatedly loaded at `CONTEXT 32768` despite Modelfile, environment, and API `num_ctx` attempts.
Reason: Do not recommend Qwen 7B local Hermes 64K unless Ollama version, model tag, or runtime changes.

## Work Ethos

### Version Control Integration
Date: 2026-06-06
Principle: Every project — prototype, spec, or production — must be initialized with Git before meaningful code is written. Remotes must be created and pushed within the first session. Generated assets >1MB or >10K lines must be reviewed for `.gitignore` suitability before commit. No project shall exist in a "local only" state across build sessions.
Rationale: Prevents catastrophic data loss, enables rollback, and maintains portfolio hygiene across rapid sprints.

## Avoided Loops

- Do not trust model names containing `64k`; verify with `ollama ps`.
- Do not continue Hermes setup until the active model context is verified.
- Do not retry Qwen local 64K on the same Ollama/model build unless something changed.


## Evidence: codex-patch-test run
Date: 2026-06-05T21:55:54.362Z
Profile: codex-patch-test
Status: observed-run
Observed: exitCode=0
Reason: Terminal-monitored AgentDock session s-2026-06-05T21-55-53-752Z-0291d7


## Evidence: gemini-cli-code run
Date: 2026-06-05T21:56:21.474Z
Profile: gemini-cli-code
Status: observed-run
Observed: exitCode=0
Reason: Terminal-monitored AgentDock session s-2026-06-05T21-56-19-503Z-fe0308


## Evidence: gemini-cli-code run
Date: 2026-06-05T21:57:09.875Z
Profile: gemini-cli-code
Status: observed-run
Observed: exitCode=0
Reason: Terminal-monitored AgentDock session s-2026-06-05T21-57-07-486Z-2a04bf


## Evidence: hermes-local-llama31-64k run
Date: 2026-06-07T00:56:56.632Z
Profile: hermes-local-llama31-64k
Status: observed-failure
Observed: exitCode=1
Reason: Terminal-monitored AgentDock session s-2026-06-07T00-33-05-640Z-511002


## Evidence: aider-git-patch run
Date: 2026-06-07T00:57:34.300Z
Profile: aider-git-patch
Status: observed-failure
Observed: exitCode=1
Reason: Terminal-monitored AgentDock session s-2026-06-07T00-43-23-969Z-93dd31


## Evidence: aider-git-patch run
Date: 2026-06-07T00:57:36.567Z
Profile: aider-git-patch
Status: observed-failure
Observed: exitCode=1
Reason: Terminal-monitored AgentDock session s-2026-06-07T00-43-57-113Z-5dca1b


## Evidence: hermes-local-llama31-64k run
Date: 2026-06-07T01:38:57.708Z
Profile: hermes-local-llama31-64k
Status: observed-failure
Observed: exitCode=1
Reason: Terminal-monitored AgentDock session s-2026-06-07T00-58-40-616Z-f0b168


## Evidence: cloud-heavy-refactor-claude run
Date: 2026-06-07T02:56:54.462Z
Profile: cloud-heavy-refactor-claude
Status: observed-run
Observed: exitCode=0
Reason: Terminal-monitored AgentDock session s-2026-06-07T02-56-48-904Z-2ef1fd


## Evidence: local-architecture run
Date: 2026-06-07T03:53:44.241Z
Profile: local-architecture
Status: observed-failure
Observed: exitCode=1
Reason: Terminal-monitored AgentDock session s-2026-06-07T03-53-42-126Z-00f9c5


## Evidence: local-code-review run
Date: 2026-06-07T03:54:53.443Z
Profile: local-code-review
Status: observed-failure
Observed: exitCode=1
Reason: Terminal-monitored AgentDock session s-2026-06-07T03-54-51-455Z-caa299


## Evidence: cloud-architecture-codex run
Date: 2026-06-07T04:20:05.078Z
Profile: cloud-architecture-codex
Status: observed-run
Observed: exitCode=0
Reason: Terminal-monitored AgentDock session s-2026-06-07T04-20-01-742Z-d40fd8


## Evidence: claude-code-heavy run
Date: 2026-06-07T04:21:41.635Z
Profile: claude-code-heavy
Status: observed-run
Observed: exitCode=0
Reason: Terminal-monitored AgentDock session s-2026-06-07T04-21-36-027Z-abd407


## Evidence: claude-code-heavy run
Date: 2026-06-07T04:22:17.940Z
Profile: claude-code-heavy
Status: observed-run
Observed: exitCode=0
Reason: Terminal-monitored AgentDock session s-2026-06-07T04-22-13-008Z-0236ac


## Evidence: local-safe-audit run
Date: 2026-06-07T04:45:12.072Z
Profile: local-safe-audit
Status: observed-failure
Observed: exitCode=1
Reason: Terminal-monitored AgentDock session s-2026-06-07T04-45-09-700Z-066777


## Evidence: local-architecture run
Date: 2026-06-07T04:48:25.252Z
Profile: local-architecture
Status: observed-failure
Observed: exitCode=1
Reason: Terminal-monitored AgentDock session s-2026-06-07T04-48-22-743Z-8644f4


## Evidence: local-code-review run
Date: 2026-06-07T04:48:35.768Z
Profile: local-code-review
Status: observed-failure
Observed: exitCode=1
Reason: Terminal-monitored AgentDock session s-2026-06-07T04-48-33-495Z-43a3a3


## Evidence: cloud-security-audit-claude run
Date: 2026-06-07T04:48:56.684Z
Profile: cloud-security-audit-claude
Status: observed-run
Observed: exitCode=0
Reason: Terminal-monitored AgentDock session s-2026-06-07T04-48-50-943Z-f98a44


## Evidence: local-safe-audit run
Date: 2026-06-07T09:55:55.028Z
Profile: local-safe-audit
Status: observed-failure
Observed: exitCode=1
Reason: Terminal-monitored AgentDock session s-2026-06-07T09-55-52-162Z-fe7804

## Evidence: ce-plan skill self-integration
Date: 2026-06-07T17:12:04Z
Profile: compound-core-kimi
Status: success
Observed: Used `ce-plan` skill from `skills/compound-engineering/cache/ce-plan/SKILL.md` to create implementation plan for dashboard UI integration
Reason: First CE skill usage logged in AgentDock memory. Plan written to `docs/plans/ce-dashboard-ui-integration.md` with 5 implementation units, dependencies, test scenarios, and risk mitigations.


## Evidence: codex-patch-test run
Date: 2026-06-08T00:16:46.925Z
Profile: codex-patch-test
Status: observed-run
Observed: exitCode=0
Reason: Terminal-monitored AgentDock session s-2026-06-08T00-16-46-054Z-f207d8


## Evidence: cloud-architecture-codex run
Date: 2026-06-10T00:51:03.282Z
Profile: cloud-architecture-codex
Status: observed-run
Observed: exitCode=0
Reason: Terminal-monitored AgentDock session s-2026-06-10T00-51-00-139Z-4a4478
