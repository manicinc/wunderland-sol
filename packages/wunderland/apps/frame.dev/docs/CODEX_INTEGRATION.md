# Codex Repo Integration

This document describes how to set up the bidirectional integration between the `framersai/codex` repository (content) and `frame.dev` (viewer).

## Overview

The suggested questions system requires coordination between:

1. **frame.dev** - Builds and deploys the viewer, generates suggested questions from codex content
2. **framersai/codex** - Stores the actual strand content with optional `suggestedQuestions` frontmatter

## Workflow

```
┌─────────────────┐         ┌─────────────────┐
│  framersai/codex│         │    frame.dev    │
│   (content)     │         │    (viewer)     │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │  push to weaves/**        │
         ├──────────────────────────►│
         │  repository_dispatch      │
         │  "codex-content-updated"  │
         │                           │
         │                           ├──► Build triggers
         │                           │    generate-suggested-questions.js
         │                           │    fetches content from codex repo
         │                           │
         │                           ├──► Deploys to GitHub Pages
         │                           │
         │◄──────────────────────────┤
         │  repository_dispatch      │
         │  "frame-deploy-complete"  │
         │                           │
         │  (optional re-indexing)   │
         └───────────────────────────┘
```

## Setup in framersai/codex

### 1. Create the Trigger Workflow

Create `.github/workflows/trigger-frame-rebuild.yml`:

```yaml
name: Trigger Frame.dev Rebuild

on:
  push:
    paths:
      - 'weaves/**/*.md'
      - 'codex-index.json'
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger frame.dev Pages rebuild
        run: |
          echo "Triggering frame.dev rebuild for codex content update..."
          RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
            -H "Accept: application/vnd.github.v3+json" \
            -H "Authorization: token ${{ secrets.GH_PAT }}" \
            https://api.github.com/repos/framersai/frame.dev/dispatches \
            -d '{"event_type":"codex-content-updated","client_payload":{"source":"codex","ref":"${{ github.sha }}"}}')
          
          echo "$RESPONSE"
          HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
          
          if [ "$HTTP_CODE" = "204" ]; then
            echo "✓ Successfully triggered frame.dev rebuild"
          else
            echo "⚠ repository_dispatch returned HTTP $HTTP_CODE (expected 204)"
            echo "Check that GH_PAT has 'repo' or 'public_repo' scope for framersai/frame.dev"
          fi
```

### 2. Add Repository Secret

Add `GH_PAT` as a repository secret in `framersai/codex` Settings > Secrets > Actions.

The PAT needs:
- `repo` scope (for private repos) or `public_repo` scope (for public repos)
- Access to `framersai/frame.dev`

### 3. Using Suggested Questions Frontmatter

Add `suggestedQuestions` to your strand frontmatter:

```yaml
---
title: "My Strand Title"
tags: ["example", "tutorial"]
suggestedQuestions:
  - question: "What is the main concept explained here?"
    difficulty: beginner
    tags: [concept, intro]
  - question: "How do I implement this in my project?"
    difficulty: intermediate
    tags: [implementation]
  - question: "What are the performance considerations?"
    difficulty: advanced
    tags: [performance, optimization]
publishing:
  status: published
---

# My Strand Title

Content goes here...
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | The question text |
| `difficulty` | enum | No | `beginner`, `intermediate`, or `advanced` |
| `tags` | array | No | Tags for categorization |

## How Questions Are Generated

1. **Manual (frontmatter)** - Highest priority. Questions defined in `suggestedQuestions` are used directly.
2. **Auto-generated** - For strands without manual questions, NLP heuristics generate questions based on:
   - Headings
   - Tech entities (languages, frameworks)
   - Keywords
   - Code block presence

## API Endpoints (Server-Side)

When running the frame.dev API server (non-static mode):

### GET /api/v1/questions/strand/:path

Get suggested questions for a specific strand.

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3847/api/v1/questions/strand/weaves/docs/intro.md"
```

### POST /api/v1/questions/generate

Generate questions from arbitrary content.

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "# My Content\n\nThis is about JavaScript..."}' \
  "http://localhost:3847/api/v1/questions/generate"
```

### GET /api/v1/questions/prebuilt

Get all prebuilt questions from the JSON cache.

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3847/api/v1/questions/prebuilt"
```

## Troubleshooting

### Questions not updating after push

1. Check that the codex repo workflow ran successfully
2. Verify the `GH_PAT` has correct permissions
3. Check the frame.dev workflow logs for build errors
4. Clear your browser cache and IndexedDB

### Manual questions not appearing

1. Ensure frontmatter YAML is valid (use a YAML linter)
2. Check that `suggestedQuestions` is spelled correctly
3. Each question needs at least the `question` field

### Auto-generated questions are low quality

Auto-generation requires:
- At least 100 characters of content
- A significance score >= 20 (based on word count, headings, code blocks)

Add manual questions for important strands.

