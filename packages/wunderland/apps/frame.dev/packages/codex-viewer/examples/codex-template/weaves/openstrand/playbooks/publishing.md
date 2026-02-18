---
title: "Publishing Checklist"
tags: ["playbook", "release"]
suggestedQuestions:
  - question: "What are the required frontmatter fields for publishing?"
    difficulty: beginner
    tags: [publishing, frontmatter]
  - question: "How do I deploy to Vercel vs Netlify?"
    difficulty: intermediate
    tags: [deployment]
  - question: "What environment variables are needed for the Codex viewer?"
    difficulty: beginner
    tags: [config, environment]
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

- Announce updates in release notes or `apps/quarry/docs/CHANGELOG_SYSTEM.md`.
- Optional: tag `@framers/codex-viewer@x.y.z` if the viewer package changed.
- Update [`framersai/codex-template`](https://github.com/framersai/codex-template) if you want others to benefit from structural improvements.

