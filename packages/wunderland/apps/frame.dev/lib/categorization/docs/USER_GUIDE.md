# User Guide: Offline Document Categorization

Complete guide to using the categorization system in frame.dev.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Categorizing Documents](#categorizing-documents)
4. [Reviewing Suggestions](#reviewing-suggestions)
5. [Managing GitHub Sync](#managing-github-sync)
6. [Understanding Confidence Scores](#understanding-confidence-scores)
7. [Customizing Categories](#customizing-categories)
8. [Best Practices](#best-practices)
9. [FAQ](#faq)

## Overview

The categorization system helps you organize documents in your inbox by:
- **Analyzing content** using keyword-based NLP
- **Suggesting categories** with confidence scores
- **Working offline** - no internet required for categorization
- **Syncing to GitHub** when online - creates PRs automatically

### How It Works

```
Inbox Documents → Categorization → Review → GitHub Sync → Organized!
```

1. **Select documents** from your inbox
2. **Run categorization** - happens in background
3. **Review suggestions** - approve, reject, or modify
4. **Auto-sync** to GitHub - creates PRs for approved items

## Getting Started

### Prerequisites

- Documents in `weaves/inbox/` folder
- GitHub Personal Access Token (for sync)
- Modern browser with IndexedDB support

### First-Time Setup

#### 1. Configure GitHub Access

Navigate to **Settings** (gear icon in toolbar):

```
Settings → GitHub → Add Personal Access Token
```

Required scopes:
- `repo` - Full control of private repositories
- `workflow` - Update GitHub Action workflows

Save your configuration:
```
Owner: your-username
Repository: your-repo
Base Branch: main
Token: ghp_your_token_here
```

#### 2. Review Default Categories

Default categories:
- **Tutorials** (`weaves/wiki/tutorials/`) - Learning guides, how-tos
- **Reference** (`weaves/wiki/reference/`) - API docs, specifications
- **Concepts** (`weaves/wiki/concepts/`) - Theory, architecture
- **Best Practices** (`weaves/wiki/best-practices/`) - Recommendations
- **Notes** (`weaves/notes/`) - Personal notes, ideas
- **Projects** (`weaves/projects/`) - Project documentation
- **Research** (`weaves/research/`) - Analysis, investigations

Customize in **Settings → Categorization**.

## Categorizing Documents

### Method 1: Toolbar Button

1. Click **Edit** in toolbar
2. Select **Categorize**
3. Categorization runs in background
4. Progress shown in job queue panel

### Method 2: Bulk Operation

For multiple documents:

1. Navigate to `weaves/inbox/`
2. Click **Categorize All**
3. System processes all `.md` files
4. Review panel opens automatically

### What Happens During Categorization

1. **File Scan** - Reads markdown content and frontmatter
2. **Keyword Extraction** - Identifies important terms
3. **Category Matching** - Compares against category keywords
4. **Confidence Scoring** - Calculates match quality (0-100%)
5. **Alternative Suggestions** - Provides backup options
6. **Storage** - Saves results to local database

**Processing Time**: ~100ms per document (depends on content length)

## Reviewing Suggestions

### Opening Review Panel

- Click **Categorize** in toolbar
- Or click notification when job completes
- Or navigate to **Activity → Categorization**

### Review Interface

Each suggestion shows:

```
┌─────────────────────────────────────────────┐
│ 📄 document-name.md               ✓ 87%     │
│   inbox/ → wiki/tutorials/                  │
│   Reason: Tutorial guide, "how-to" in title │
│   [View] [Approve] [Modify ▼] [Reject]     │
└─────────────────────────────────────────────┘
```

**Color Coding**:
- 🟢 **Green (≥80%)** - High confidence, safe to approve
- 🟡 **Yellow (50-79%)** - Medium confidence, review carefully
- 🔴 **Red (<50%)** - Low confidence, needs attention

### Actions

#### Approve
Accepts the suggestion as-is:
1. Click **Approve** button
2. Creates GitHub sync action
3. Status changes to "Approved"
4. Will sync on next GitHub connection

#### Reject
Keeps document in inbox:
1. Click **Reject** button
2. Adds to rejection log
3. Document stays in inbox
4. Won't be suggested again (for this job)

#### Modify
Changes the suggested category:
1. Click **Modify** dropdown
2. Select different category
3. Or type custom path
4. Click **Save**
5. Status changes to "Modified"

#### View Alternatives
See other category suggestions:
1. Click expand arrow (▼)
2. Shows top 3 alternatives with reasoning
3. Click alternative to apply it

### Bulk Actions

**Approve All High Confidence**:
- Approves all items ≥80%
- Quick way to process obvious matches
- Review manually afterward if needed

**Filter by Confidence**:
- Show only high/medium/low confidence
- Sort by confidence score
- Focus on items needing attention

## Managing GitHub Sync

### Sync Queue Widget

Shows pending GitHub operations in toolbar:

```
┌─────────────────────────┐
│ 🌐 5 Pending Sync      │
│ Status: Online         │
│ [Sync Now]             │
└─────────────────────────┘
```

### Auto-Sync Behavior

System automatically syncs when:
- **Network reconnects** - Detects online status
- **Approval happens** - Immediately queues action
- **Periodic check** - Every 30 seconds if items pending

### Manual Sync

Click **Sync Now** in queue widget:
- Processes up to 50 actions at once
- Shows progress and errors
- Retries failed items automatically

### GitHub Action Types

**High Confidence (≥95%) - Auto-Move**:
- Creates branch: `auto-categorize/filename-timestamp`
- Moves file in single commit
- Creates PR with auto-merge enabled
- PR merges automatically if checks pass

**Medium Confidence (80-94%) - Suggest PR**:
- Creates branch: `categorize-suggest/filename-timestamp`
- Moves file but requires manual review
- PR created without auto-merge
- You review and merge manually

**Low Confidence (<80%) - Create Issue**:
- Creates GitHub Issue
- Tagged with `needs-triage`
- Describes analysis and suggestions
- Manual categorization required

### Viewing Sync History

Navigate to **Activity → Sync History**:
- See all synced items
- Filter by success/failure
- View PR links
- Retry failed syncs

## Understanding Confidence Scores

### How Scores Are Calculated

```
Base Score = 0

For each category keyword:
  If in content:     +15 points
  If in title:       +25 points
  If in extracted:   +10 points
  If in tags:        +15 points
  If in topics:      +20 points

Final Score = min(Total, 100%)
```

### Score Interpretation

| Score | Meaning | Action | Example |
|-------|---------|--------|---------|
| 90-100% | Almost certain | Auto-approve | "React Tutorial" → tutorials/ |
| 80-89% | Very likely | Approve | "API Guide" → reference/ |
| 70-79% | Probably correct | Review first | "Design Patterns" → concepts/ |
| 60-69% | Possible match | Check carefully | "Project Notes" → notes/ or projects/? |
| 50-59% | Uncertain | Verify alternatives | Multiple category matches |
| <50% | Low confidence | Manual review | No clear category |

### Improving Scores

**Add Keywords**:
```markdown
---
tags: [tutorial, react, beginner]
topics: [web-development, frontend]
---
```

**Use Clear Titles**:
- ✅ "React Hooks Tutorial"
- ❌ "Some notes about React"

**Add Category Hints**:
```typescript
// In categorization config
keyword_hints: {
  'weaves/wiki/tutorials/': [
    'step-by-step',
    'getting-started',
    'walkthrough'
  ]
}
```

## Customizing Categories

### Adding New Categories

Settings → Categorization → Categories → Add:

```typescript
{
  path: 'weaves/custom/my-category/',
  label: 'My Category',
  description: 'Documents about X',
  keywords: [
    'keyword1',
    'keyword2',
    'phrase with spaces'
  ],
  weight: 1.0  // Multiplier for matches
}
```

### Editing Categories

1. Click category name
2. Modify keywords list
3. Adjust weight (0.5 = half, 2.0 = double)
4. Save changes
5. Re-run categorization to see effects

### Deleting Categories

1. Click category name
2. Click **Delete** button
3. Confirm deletion
4. Existing categorizations unaffected

### Category Best Practices

**Good Keywords**:
- ✅ Specific terms: "tutorial", "api", "specification"
- ✅ Phrases: "how to", "getting started"
- ✅ Domain terms: "react", "database", "authentication"

**Avoid**:
- ❌ Common words: "the", "and", "is"
- ❌ Too generic: "document", "file", "content"
- ❌ Overlapping: Same keywords in multiple categories

**Weight Guidelines**:
- `2.0` - Very important category (tutorials, reference)
- `1.0` - Normal category (default)
- `0.5` - Less important (inbox, drafts)

## Best Practices

### Before Categorizing

1. **Review inbox** - Remove irrelevant files
2. **Add frontmatter** - Tags, topics help accuracy
3. **Use clear titles** - "React Tutorial" > "notes.md"
4. **Group similar docs** - Categorize related docs together

### During Review

1. **Start with high confidence** - Approve obvious ones first
2. **Check alternatives** - Better category might exist
3. **Modify if close** - Small adjustments okay
4. **Reject if wrong** - Don't force categorization

### After Categorization

1. **Monitor PRs** - Check auto-created PRs
2. **Update categories** - Improve keywords based on results
3. **Review errors** - Fix failed syncs
4. **Clean up** - Delete old categorization jobs

### Workflow Tips

**Daily Routine**:
```
1. Morning: Categorize new inbox items
2. Review: Approve high confidence (5 min)
3. Sync: Manual sync if offline
4. Evening: Check PR merges
```

**Weekly Maintenance**:
```
1. Review category accuracy
2. Update keywords based on patterns
3. Clean up old jobs
4. Check sync error rate
```

## FAQ

### How do I re-categorize a document?

Delete the existing categorization result and run categorization again. Or modify the suggestion before approving.

### Can I categorize documents outside the inbox?

Yes, but you need to specify paths manually:
```typescript
jobQueue.createJob('categorization', {
  inboxPaths: ['weaves/anywhere/document.md']
})
```

### What if categorization is wrong?

1. Reject the suggestion
2. Manually move the file
3. Improve category keywords
4. Re-run categorization

### How do I disable auto-merge?

Settings → Categorization:
```typescript
{
  auto_apply_threshold: 1.1  // Impossible to reach
}
```

### Can I categorize into folders that don't exist?

Yes! GitHub sync will create the folder automatically when moving the file.

### What happens if GitHub is down?

Actions queue locally and sync when GitHub is reachable again. No data loss.

### How do I export/import categorization rules?

Settings → Categorization → Export/Import:
- Export to JSON file
- Share with team
- Import on other machine

### Can I undo an approval?

Not directly, but you can:
1. Cancel the GitHub sync (if not yet synced)
2. Close the PR manually
3. Re-categorize the document

### What about binary files (images, PDFs)?

Not supported. Categorization only works with markdown (`.md`) files.

### How many documents can I categorize at once?

No hard limit, but for performance:
- **<100 docs**: Very fast (seconds)
- **100-500 docs**: Fast (1-2 minutes)
- **>500 docs**: Slower (5+ minutes)

Break large batches into smaller chunks for better progress tracking.

---

**Need Help?**
- 📖 [Developer Guide](DEVELOPER_GUIDE.md)
- 🐛 [Troubleshooting](TROUBLESHOOTING.md)
- 💡 [Tutorial](TUTORIAL.md)
- 🔧 [API Reference](API_REFERENCE.md)
