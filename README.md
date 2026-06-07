# AgentDock MVP 1.1

Private local AI agent stack scanner, planner, Markdown memory core, research watch, monitored terminal, and launcher.

## Run

```powershell
cd path\to\agentdock
node server.js
```

Open:

```text
http://127.0.0.1:7777
```

Or double-click:

```text
start-agentdock.bat
```

## New in 1.1

- Scans `.env`, `.env.local`, `.env.*`, and `.envrc` files in safe bounded locations.
- Redacts secret values and only displays key names/provider hints.
- Detects installed coder tools: Hermes, OpenCode, Codex, Kimi, Claude Code, Aider, Gemini CLI, Goose, VS Code extensions such as Cline/Roo/Continue where discoverable.
- Includes a coder catalog with official links directly in the dashboard.
- Adds a managed terminal monitor so launches are tracked, output is captured, and stack use is written to local logs and memory.
- Adds additional profiles for Claude Code, Aider, and Gemini CLI.

## Safety model

- Binds to localhost only.
- No cloud telemetry.
- No arbitrary shell command box.
- No secret values printed.
- Launches only profile-defined command blocks.
- Dangerous patterns are preview-warned.
- Terminal sessions are logged locally.

## Important note about the terminal

The built-in terminal is a monitored child-process terminal using stdout/stderr pipes. It captures normal CLI output and accepts line input. Full-screen TUIs may still work better in their own console, but AgentDock will still track the launch, profile, timestamps, exit code, and logs.

## First good profile for your setup

Use `Hermes Local Llama 3.1 64K`, because your machine already proved `llama31-hermes-64k` loads at 64,000 context.
