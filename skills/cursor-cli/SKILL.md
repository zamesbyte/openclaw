---
name: cursor-cli
description: Cursor CLI for terminal-based AI (one-shot or interactive). Connects to Cursor's agent ecosystem.
homepage: https://cursor.com/docs/cli/overview
metadata: { "openclaw": { "emoji": "⌨️", "requires": { "bins": ["cursor-agent"] }, "install": [] } }
---

# Cursor CLI

Use Cursor's terminal AI for one-shot prompts or interactive sessions.

Quick start (one-shot, for OpenClaw tool)

- `cursor-agent -p "Your prompt"`
- `cursor-agent -p "Prompt" --model "gpt-5"`

OpenClaw tool: `cursor_cli` — run a one-shot prompt via `cursor-agent -p "..."` (prompt; optional model).

Interactive

- `cursor-agent` — start session
- `cursor-agent -p "initial prompt"` — one-shot
- `cursor-agent ls` / `cursor-agent resume` — list or resume sessions

Notes

- Respects `.cursor/rules/`, `AGENTS.md`, `CLAUDE.md`, and MCP.
- Requires Cursor subscription (free tier available).
- See doc/ai-code-cli/cursor-cli.md for reference.
