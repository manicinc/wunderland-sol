# Quarry Codex Changelog System

Quarry Codex automatically tracks and records all changes, issues, and pull requests in a structured, machine-readable format.

## Overview

The changelog system runs daily via GitHub Actions and generates:

1. **Git Changelog**: Parsed conventional commits with metadata
2. **Issue Activity**: Created, closed, and merged issues/PRs
3. **JSON Snapshots**: One file per day for easy querying

All history is stored in and committed to the repository.

## Why This Matters

### For Humans
- Transparent development history
- Easy to track when features were added
- Clear visibility into bug fixes and improvements

### For AI
- Structured data for analysis
- Timeline of decisions for context
- Training data for understanding project evolution

## Data Location

Changelog data is stored in the `codex-history/` directory:

```
codex-history/
├── changes/           # Daily git commit summaries
│   └── YYYY-MM-DD.json
├── issues/            # Issue and PR activity
│   └── YYYY-MM-DD.json
└── index.json         # Combined index
```

## File Format

### Changes File
```json
{
  "date": "2025-01-15",
  "commits": [
    {
      "hash": "abc123",
      "message": "feat: add new feature",
      "author": "username",
      "timestamp": "2025-01-15T10:30:00Z",
      "type": "feat",
      "scope": null,
      "breaking": false
    }
  ]
}
```

### Issues File
```json
{
  "date": "2025-01-15",
  "opened": [],
  "closed": [],
  "merged": []
}
```

## Viewing the Changelog

Visit the [Changelog page](/quarry/changelog) in Quarry to see a formatted view of recent changes.

## GitHub Action

The changelog is updated by a scheduled GitHub Action that runs daily:

```yaml
name: Update Changelog
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:      # Manual trigger

jobs:
  update-changelog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate changelog
        run: npm run changelog:generate
      - name: Commit changes
        run: |
          git add codex-history/
          git commit -m "chore: update changelog" || exit 0
          git push
```

## Related Documentation

- [Development Guide](./DEVELOPMENT.md)
- [Contributing](./contributing/how-to-submit.md)
- [NLP Guide](./NLP_GUIDE.md)

