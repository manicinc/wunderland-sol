# My Agent

Scaffolded by the Wunderland CLI.

## Run

```bash
cp .env.example .env
wunderland start
```

Agent server:
- GET http://localhost:3777/health
- POST http://localhost:3777/chat { "message": "Hello", "sessionId": "local" }

Notes:
- By default, `wunderland start` runs in headless-safe mode (no interactive approvals).
- Enable the full toolset with: `wunderland start --yes` (shell command safety checks remain on).
- Disable shell safety checks with: `wunderland start --dangerously-skip-command-safety --yes` or `wunderland start --dangerously-skip-permissions`.

## Observability (OpenTelemetry)

Wunderland supports opt-in OpenTelemetry (OTEL) export for auditing.

- Enable via `agent.config.json`: set `observability.otel.enabled=true`.
- Configure exporters via OTEL env vars in `.env` (see `.env.example`).

## Skills

Add custom SKILL.md files to the `skills/` directory.
Enable curated skills with: `wunderland skills enable <name>`
