# Strand Creation Guide

> Complete guide to creating, editing, and publishing strands in Quarry Codex.

> **Interactive Tutorial Available!** 🎓
> New to Codex? Start with our [Creating Notes tutorial](/codex?tutorial=strand-creation) for a hands-on walkthrough of the strand creation workflow.

## Table of Contents

- [Overview](#overview)
- [Creating a Strand](#creating-a-strand)
- [Auto-Save System](#auto-save-system)
- [Real-Time NLP Analysis](#real-time-nlp-analysis)
- [Publishing Workflow](#publishing-workflow)
- [GitHub Integration](#github-integration)
- [Components Reference](#components-reference)
- [Hooks Reference](#hooks-reference)

---

## Overview

The strand creation system provides a seamless workflow from draft to published content:

```
Draft (localStorage) → Client NLP → Publish → GitHub PR → Backend Processing
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Auto-Save** | Drafts saved automatically every 1.5s |
| **Real-Time NLP** | Keywords, entities, tags extracted as you type |
| **Offline Support** | Works offline, syncs when back online |
| **GitHub Integration** | Creates PRs directly from the UI |
| **PAT Management** | Secure token storage for private repos |
| **Pipeline Tracking** | Live status of backend processing |

---

## Creating a Strand

### Input Methods

Navigate to `/quarry/new/` to access the strand creator:

#### 1. Templates
Pre-built templates for common strand types:
- Tutorial
- API Reference
- Architecture Doc
- Concept Explanation
- Quick Reference

#### 2. Write Mode
Direct markdown editing with live preview:
- Split view (edit + preview)
- Edit-only view
- Preview-only view

#### 3. File Upload
Drag-and-drop or click to upload:
- `.md` - Markdown
- `.txt` - Plain text
- `.markdown` - Markdown

#### 4. URL Import
Scrape content from a URL:
```
https://example.com/article → Markdown content
```

---

## Auto-Save System

### How It Works

```typescript
import { useAutoSave } from '@/components/quarry/hooks/useAutoSave'

const {
  content,
  setContent,
  saveStatus,      // 'idle' | 'saving' | 'saved' | 'error' | 'offline'
  lastSaved,       // Date object
  forceSave,       // Manual save trigger
  clearDraft,      // Delete draft
  listDrafts,      // Get all drafts
  loadDraft,       // Load specific draft
} = useAutoSave({
  draftId: 'my-strand',
  initialContent: '',
  enableNLP: true,
})
```

### Save States

| State | Icon | Description |
|-------|------|-------------|
| `idle` | ☁️ | Not yet saved |
| `saving` | 🔄 | Save in progress |
| `saved` | ✅ | Successfully saved |
| `error` | ❌ | Save failed |
| `offline` | 📴 | Saved locally, offline |

### Draft Storage

Drafts are stored in localStorage with prefix `codex-draft-`:

```json
{
  "id": "my-strand",
  "content": "# My Strand\n\n...",
  "fileName": "my-strand.md",
  "targetPath": "weaves/tech/",
  "metadata": { ... },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:01:00Z"
}
```

### Debouncing

| Operation | Debounce Time |
|-----------|---------------|
| Auto-save | 1500ms |
| NLP Analysis | 2000ms |

---

## Real-Time NLP Analysis

### Pipeline

As you type, the following NLP tasks run client-side:

```
[Content] → [Keywords] → [Entities] → [Tags] → [Summary]
   ↓           ↓            ↓           ↓          ↓
   0%         25%          50%         75%        100%
```

### Extracted Metadata

```typescript
interface ExtractedMetadata {
  title?: string              // From first heading or line
  summary?: string            // Auto-generated summary
  tags: string[]              // Suggested tags
  topics: string[]            // Inferred topics (tutorial, api-reference, etc.)
  subjects: string[]          // Inferred subjects (technology, ai, etc.)
  difficulty?: string         // beginner | intermediate | advanced | expert
  entities: {
    technologies: string[]    // React, TypeScript, etc.
    concepts: string[]        // API, algorithm, etc.
    people: string[]          // Named people
    organizations: string[]   // Companies, orgs
    locations: string[]       // Places
  }
  keywords: string[]          // Top keywords by TF score
  wordCount: number
  readingTime: number         // Minutes
}
```

### NLP Status Indicator

```
🧠 ████░░░░ 50% (2/4 tasks)
```

Shows:
- Progress bar
- Task count
- Current operation

---

## Publishing Workflow

### Draft vs Published

| Aspect | Draft | Published |
|--------|-------|-----------|
| **Storage** | localStorage | GitHub repo |
| **Visibility** | Local only | Public PR |
| **NLP** | Client-side only | Client + Backend |
| **Search** | Not indexed | Indexed after merge |
| **Actions** | None | Triggers workflow |

### Publish Flow

```
1. Click "Publish"
     ↓
2. Review/edit commit message
     ↓
3. Review/edit PR title & description
     ↓
4. Click "Create Pull Request"
     ↓
5. [Validate PAT]
     ↓
6. [Create Branch: strand/{slug}-{timestamp}]
     ↓
7. [Commit File]
     ↓
8. [Create PR]
     ↓
9. Success! View PR on GitHub
```

### PR Template

Auto-generated PR description:

```markdown
## New Strand

{Auto-generated summary}

### Tags
- tag1
- tag2

### Metadata
- Words: 1234
- Reading time: ~6 min
- Difficulty: intermediate
```

---

## GitHub Integration

### Personal Access Token (PAT)

Required for:
- Private repository access
- Creating branches and PRs
- Checking Actions status

#### Required Scopes

| Scope | Purpose |
|-------|---------|
| `repo` | Full repository access |
| `workflow` | Actions status |
| `read:org` | Organization membership |

#### Configure PAT

1. Click 🔑 icon in status bar
2. Or navigate to Settings → GitHub PAT
3. Enter your token
4. Click "Validate & Save"

Token is stored **locally only** in `localStorage`.

#### Create New PAT

Direct link with correct scopes:
```
https://github.com/settings/tokens/new?scopes=repo,workflow,read:org&description=Frame%20Codex
```

### GitHub Actions Integration

After publishing, the status bar shows backend processing:

```
[PR ✓] → [Index ⏳] → [NLP ⏳] → [Search ○]
```

#### Pipeline Steps

| Step | Description | Duration |
|------|-------------|----------|
| **PR** | Pull request created | Instant |
| **Index** | File indexed in codex | ~30s |
| **NLP** | Backend NLP processing | ~1-2min |
| **Search** | Search index updated | ~30s |

Click "View" to open the Actions run on GitHub.

---

## Components Reference

### CreationStatusBar

Compact inline status indicator:

```tsx
import CreationStatusBar from '@/components/quarry/ui/CreationStatusBar'

<CreationStatusBar
  saveStatus="saved"
  lastSaved={new Date()}
  nlpStatus="complete"
  nlpProgress={100}
  nlpTasks={{ done: 4, total: 4 }}
  backendStatus="running"
  actionsUrl="https://github.com/.../actions/runs/123"
  publishStatus="published"
  hasPAT={true}
  theme="dark"
  onConfigurePAT={() => setShowPAT(true)}
  onRefreshBackend={() => refreshStatus()}
  onForceSave={() => forceSave()}
/>
```

### GitHubPATConfig

PAT configuration modal:

```tsx
import GitHubPATConfig from '@/components/quarry/ui/GitHubPATConfig'

<GitHubPATConfig
  isOpen={showPATConfig}
  onClose={() => setShowPATConfig(false)}
  theme="dark"
/>
```

Utilities:
```typescript
import { getStoredPAT, hasPATConfigured } from '@/components/quarry/ui/GitHubPATConfig'

const pat = getStoredPAT()        // string | null
const hasPAT = hasPATConfigured() // boolean
```

### PublishWorkflow

Complete publish flow:

```tsx
import PublishWorkflow from '@/components/quarry/ui/PublishWorkflow'

<PublishWorkflow
  content={content}
  fileName="my-strand.md"
  targetPath="weaves/tech/"
  metadata={{
    title: "My Strand",
    summary: "A great strand",
    tags: ["react", "typescript"],
  }}
  theme="dark"
  onPublished={(prUrl) => {
    console.log('PR created:', prUrl)
  }}
  onConfigurePAT={() => setShowPAT(true)}
/>
```

---

## Hooks Reference

### useAutoSave

Complete auto-save and NLP hook:

```typescript
import { useAutoSave } from '@/components/quarry/hooks/useAutoSave'

const {
  // Content
  content,              // Current content
  setContent,           // Update content (triggers auto-save + NLP)
  fileName,             // Current filename
  setFileName,          // Update filename
  targetPath,           // Target path in repo
  setTargetPath,        // Update path
  
  // Save state
  saveStatus,           // SaveStatus type
  lastSaved,            // Date | null
  forceSave,            // () => void
  clearDraft,           // () => void
  
  // NLP state
  nlpStatus,            // NLPStatus type
  nlpProgress,          // 0-100
  nlpTasks,             // { done: number, total: number }
  metadata,             // ExtractedMetadata | null
  
  // Drafts
  listDrafts,           // () => Draft[]
  loadDraft,            // (id: string) => boolean
  
  // Network
  isOnline,             // boolean
} = useAutoSave({
  draftId: 'unique-id',
  initialContent: '',
  initialFileName: 'new-strand.md',
  initialTargetPath: 'weaves/',
  enableNLP: true,
  onChange: (content, metadata) => { ... },
})
```

---

## Best Practices

### 1. Draft Management

```typescript
// List all drafts
const drafts = listDrafts()

// Load a draft
loadDraft('my-draft-id')

// Clear current draft
clearDraft()
```

### 2. Offline Handling

```typescript
if (!isOnline) {
  // Show offline indicator
  // Drafts still save locally
}
```

### 3. NLP Feedback

```typescript
// Show loading state
if (nlpStatus === 'analyzing') {
  return <Spinner progress={nlpProgress} />
}

// Show extracted tags
if (metadata?.tags) {
  return <TagList tags={metadata.tags} />
}
```

### 4. Publish Validation

```typescript
// Check before publish
if (!hasPATConfigured()) {
  return <ConfigurePATPrompt />
}

if (content.length < 50) {
  return <ContentTooShortWarning />
}
```

---

## Troubleshooting

### "Save failed" error

1. Check localStorage quota
2. Clear old drafts: `listDrafts()` then `clearDraft()`
3. Check browser console for errors

### "Invalid token" on publish

1. Regenerate PAT with correct scopes
2. Check token hasn't expired
3. Verify repo access permissions

### NLP not running

1. Content must be >50 characters
2. Check `enableNLP: true` in hook options
3. Wait for 2s debounce

### Actions status not updating

1. Verify PAT has `workflow` scope
2. Click refresh button
3. Check GitHub Actions directly

---

## Related Documentation

- [NLP Guide](./NLP_GUIDE.md) - Detailed NLP implementation
- [Semantic Search](./SEMANTIC_SEARCH_ARCHITECTURE.md) - Search indexing
- [Block Tagging](./BLOCK_LEVEL_TAGGING.md) - Auto-tagging system
- [Storage](./STORAGE_AND_PROFILE.md) - localStorage usage




















