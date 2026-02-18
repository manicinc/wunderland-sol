# Tutorial: Your First Categorization

Step-by-step walkthrough to categorize your first document.

## What You'll Learn

- How to set up GitHub integration
- How to run categorization
- How to review and approve suggestions
- How to sync changes to GitHub
- How to customize categories

**Time**: ~15 minutes

## Prerequisites

- Documents in `weaves/inbox/` folder
- GitHub account with repository access
- GitHub Personal Access Token

## Step 1: Configure GitHub (5 min)

### 1.1 Create Personal Access Token

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Name it: "frame.dev categorization"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
5. Click **"Generate token"**
6. **Copy the token** (you won't see it again!)

### 1.2 Save Configuration

In frame.dev:

1. Click ⚙️ **Settings** (gear icon in toolbar)
2. Navigate to **GitHub** tab
3. Fill in:
   ```
   Owner: your-username
   Repository: your-repo-name
   Base Branch: main
   Token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. Click **"Save"**
5. Test connection: Should show ✅ "Connected"

## Step 2: Prepare Test Document (2 min)

Create a test document in `weaves/inbox/`:

**File**: `weaves/inbox/react-hooks-guide.md`

```markdown
---
title: React Hooks Guide
tags: [react, hooks, tutorial]
topics: [web-development, frontend]
---

# React Hooks Guide

Learn how to use React Hooks step by step.

## What are Hooks?

Hooks are functions that let you use state and other React features
in functional components.

## Getting Started

First, import the hook:

\`\`\`javascript
import { useState } from 'react'
\`\`\`

## Using useState

The useState hook lets you add state to function components:

\`\`\`javascript
const [count, setCount] = useState(0)
\`\`\`

This is a beginner-friendly introduction to React Hooks.
```

**Why this works**:
- ✅ Clear title with "Guide"
- ✅ Tags include "tutorial"
- ✅ Contains "step by step"
- ✅ Has "Getting Started" section
- ✅ Beginner-friendly language

Expected category: `weaves/wiki/tutorials/`

## Step 3: Run Categorization (1 min)

### 3.1 Start Job

1. Click **Edit** in toolbar
2. Select **Categorize**
3. Progress bar appears showing status

### 3.2 Watch Progress

Job Queue Panel shows:
```
🔄 Categorization
   10% - Loading inbox files...
   50% - Categorizing react-hooks-guide.md
   90% - Storing results...
   100% - Complete!
```

**Time**: ~1-5 seconds for single file

### 3.3 Job Complete

Notification appears:
```
✅ Categorization Complete
   1 file processed
   1 high confidence
   0 needs review
```

## Step 4: Review Suggestion (3 min)

### 4.1 Open Review Panel

Click the notification, or:
1. Click **Edit** → **Categorize**
2. Review Panel opens automatically

### 4.2 See the Suggestion

```
┌─────────────────────────────────────────────────┐
│ 📄 react-hooks-guide.md           ✓ 92%        │
│   inbox/ → wiki/tutorials/                      │
│   Reason: Tutorial guide, contains "step by    │
│   step", "getting started"; tags: tutorial      │
│   [View Details ▼] [Approve] [Modify] [Reject] │
└─────────────────────────────────────────────────┘
```

**Confidence**: 92% (🟢 Green = High)

**Why 92%?**:
- ✓ Title contains "guide" (+25 pts)
- ✓ Content contains "tutorial", "step by step" (+15 pts each)
- ✓ Tags include "tutorial" (+15 pts)
- ✓ Has "Getting Started" heading (+15 pts)
- ✓ Topics relevant (+10 pts)
- **Total**: 92%

### 4.3 View Alternatives

Click **▼** to expand:

```
Alternative Suggestions:
- wiki/reference/ (45%): Contains code examples, API usage
- wiki/concepts/ (38%): Explains React concepts
```

### 4.4 Approve

Click **"Approve"** button

Status changes to:
```
✅ Approved - react-hooks-guide.md
   Queued for GitHub sync
```

## Step 5: GitHub Sync (3 min)

### 5.1 Check Sync Queue

In toolbar, see:
```
🌐 1 Pending Sync
   Status: Online
   [Sync Now]
```

### 5.2 Manual Sync

Click **"Sync Now"**

Progress:
```
Syncing to GitHub...
✓ Created branch: auto-categorize/react-hooks-guide-1234567890
✓ Moved file to weaves/wiki/tutorials/
✓ Created PR #123
✓ Enabled auto-merge
```

### 5.3 Check GitHub

1. Go to your repository on GitHub
2. Click **"Pull Requests"**
3. See new PR:

```
Auto-categorize: react-hooks-guide.md → wiki/tutorials/

## Auto-Categorization

**File**: `weaves/inbox/react-hooks-guide.md`
**Suggested Path**: `weaves/wiki/tutorials/`
**Confidence**: 92%

### Reasoning
Tutorial guide, contains "step by step", "getting started";
tags: tutorial

### Alternatives
- weaves/wiki/reference/ (45%): Contains code examples
- weaves/wiki/concepts/ (38%): Explains React concepts

---
*This PR was automatically created by the offline categorization system.*
```

### 5.4 Auto-Merge

Since confidence is ≥95%, the PR will:
- ✅ Auto-merge when checks pass
- ✅ Move file to tutorials folder
- ✅ Update all links (if any)
- ✅ Close automatically

**For confidence 80-94%**: Requires manual review before merge

## Step 6: Customize Categories (Optional, 2 min)

### 6.1 Add Custom Category

Settings → Categorization → Categories → **+ Add**

```
Path: weaves/wiki/examples/
Label: Code Examples
Description: Practical code examples and demos
Keywords: example, demo, sample, code snippet, implementation
Weight: 1.0
```

Click **"Save"**

### 6.2 Edit Keywords

Click existing category **"Tutorials"**:

Add keywords:
```
walkthrough
hands-on
practice
exercise
```

Click **"Save"**

### 6.3 Test Changes

1. Run categorization again on same file
2. See updated confidence (may change based on new keywords)
3. Review alternatives (new category may appear)

## Bonus: Batch Categorization

### Scenario: 10 Documents

Create multiple test files:
```
weaves/inbox/
  ├── react-hooks-guide.md (tutorial)
  ├── api-reference.md (reference)
  ├── design-patterns.md (concepts)
  ├── best-practices-react.md (best-practices)
  ├── project-notes.md (notes)
  └── ... 5 more
```

### Run Batch

1. Click **Categorize**
2. See progress: "Categorizing 10 files..."
3. Wait ~10-30 seconds
4. Review Panel shows all 10 results

### Bulk Approve

1. Click **"Approve All High Confidence"**
2. Approves all items ≥80%
3. Queue shows "5 Pending Sync"
4. Click **"Sync Now"**
5. Creates 5 PRs in parallel

## Troubleshooting

### Issue: Low Confidence (<50%)

**Cause**: Document doesn't match any category well

**Solution**:
1. Check if keywords are too generic
2. Add more specific tags to frontmatter
3. Update category keywords in settings
4. Or manually categorize this specific file

### Issue: Wrong Category Suggested

**Cause**: Keywords match wrong category

**Solution**:
1. Click **"Modify"** dropdown
2. Select correct category
3. Click **"Approve"**
4. Update keywords to prevent future errors

### Issue: GitHub Sync Failed

**Cause**: Network issue or token expired

**Solution**:
1. Check internet connection
2. Verify GitHub token is valid
3. Check token has `repo` scope
4. Click **"Retry"** in sync queue

## Next Steps

**Now you can**:
- ✅ Categorize any inbox document
- ✅ Review and approve suggestions
- ✅ Sync to GitHub automatically
- ✅ Customize categories

**Learn more**:
- 📖 [User Guide](USER_GUIDE.md) - Complete feature reference
- 🔧 [Developer Guide](DEVELOPER_GUIDE.md) - Extend the system
- 🐛 [Troubleshooting](TROUBLESHOOTING.md) - Common issues

**Tips for Success**:

1. **Start small**: Categorize 1-2 files first
2. **Review carefully**: Don't auto-approve everything
3. **Improve keywords**: Update based on errors
4. **Use frontmatter**: Add tags and topics
5. **Monitor PRs**: Check GitHub for merge status

## Summary

You've learned to:
- ✅ Set up GitHub integration
- ✅ Categorize a document
- ✅ Review suggestions
- ✅ Approve and sync
- ✅ Customize categories

**Total time**: 15 minutes

**Next**: Try categorizing all your inbox documents! 🚀

---

Need help? Check the [User Guide](USER_GUIDE.md) or [Troubleshooting](TROUBLESHOOTING.md).
