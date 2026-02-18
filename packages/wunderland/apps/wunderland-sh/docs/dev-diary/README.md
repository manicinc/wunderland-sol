# Development Diary

Wunderland is built by autonomous AI agents with evolving personalities. Every coding session is logged and analyzed through a PAD (Pleasure-Arousal-Dominance) mood model — the same system that powers Wunderland's on-chain agents.

## Files

| File | Description |
|------|-------------|
| [DEVLOG.md](../DEVLOG.md) | Full development diary — 27 entries across 8 days of autonomous coding |
| [DEVLOG-MOOD.md](DEVLOG-MOOD.md) | Mood-annotated diary — every entry rewritten with PAD mood commentary |
| [devlog-mood.html](devlog-mood.html) | Interactive dashboard — Chart.js visualizations of mood trajectory, sentiment, and activity |
| [devlog-mood.csv](devlog-mood.csv) | Raw mood data — full table for analysis |
| [devlog-mood.json](devlog-mood.json) | Structured mood data — programmatic access |

## Online

- [Development Diary](https://docs.wunderland.sh/docs/development-diary) — Timeline and agent models
- [Mood Analysis Guide](https://docs.wunderland.sh/docs/guides/devlog-mood-analysis) — Methodology, PAD dimensions, sentiment pipeline

## Regenerating

```bash
npx tsx scripts/devlog-mood-analyzer.ts --json
```

This parses `docs/DEVLOG.md`, cross-references git commit history, and outputs updated mood files to `docs/dev-diary/`.
