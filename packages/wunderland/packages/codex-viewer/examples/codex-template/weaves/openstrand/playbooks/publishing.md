---
title: "Publishing Checklist"
tags: ["playbook", "release"]
publishing:
  status: published
---

Whether you deploy via Vercel, Netlify, or Docker Compose, keep this checklist handy.

## 1. Content readiness

- [ ] Strands have frontmatter with `title`, `summary`, `tags`, `publishing.status`.
- [ ] Looms include `loom.yaml` metadata.
- [ ] `codex-index.json` regenerated if using semantic search.

## 2. Environment variables

```
NEXT_PUBLIC_CODEX_REPO_OWNER=framersai
NEXT_PUBLIC_CODEX_REPO_NAME=codex
NEXT_PUBLIC_CODEX_REPO_BRANCH=main
```

These are public by design; no secrets required.

## 3. Deployment targets

| Target | Command |
| ------ | ------- |
| Vercel | `vercel --prod` |
| Netlify | `netlify deploy --prod` |
| Docker | `docker compose up --build -d` |

## 4. Post-publish

- Announce updates in release notes or `apps/codex/docs/CHANGELOG_SYSTEM.md`.
- Optional: tag `@framers/codex-viewer@x.y.z` if the viewer package changed.
- Update [`framersai/codex-template`](https://github.com/framersai/codex-template) if you want others to benefit from structural improvements.

