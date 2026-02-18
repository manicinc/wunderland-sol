# Quarry Codex Publishing Guide

## Overview

Quarry Codex uses a tiered contribution model through GitHub:

1. **Approved Weavers** - Auto-merge after validation
2. **Regular Contributors** - Pull Request review required
3. **Anonymous** - GitHub redirect for manual PR creation

## How Publishing Works

### For Approved Weavers

If your GitHub username is listed in [`.github/WEAVERS.txt`](https://github.com/framersai/quarry/blob/main/.github/WEAVERS.txt):

1. Your changes pass validation checks automatically
2. Changes are committed directly to the repository
3. No manual review required

### For Regular Contributors

If you have a GitHub Personal Access Token (PAT) configured:

1. Click "Publish" in the Metadata Editor
2. A Pull Request is created on your behalf
3. Maintainers review and merge your contribution
4. You receive GitHub notifications on PR status

### Without a GitHub Account

You can still contribute:

1. Click "Publish" to be redirected to GitHub
2. Sign in (or create a free GitHub account)
3. Fork the repository
4. Submit your changes as a Pull Request

## Configuring GitHub Authentication

### Step 1: Create a Personal Access Token

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens?type=beta)
2. Click "Generate new token (fine-grained)"
3. Name it "Quarry Codex"
4. Set expiration (recommended: 90 days)
5. Select "framersai/codex" repository
6. Permissions needed:
   - Contents: Read and write
   - Pull requests: Read and write
7. Generate and copy the token

### Step 2: Add Token to Quarry Codex

1. Click the ⚙️ Settings icon in the Codex viewer
2. Paste your token in the "GitHub PAT" field
3. Click "Save"

Your token is encrypted and stored only in your browser's localStorage. It is **never** sent to any server or exposed publicly.

## Becoming an Approved Weaver

To become a trusted Weaver with auto-merge privileges:

1. **Submit quality contributions** - 5+ Pull Requests that pass all validation
2. **Follow the schema** - Demonstrate understanding of Codex metadata standards
3. **Consistent quality** - Show commitment to the project's quality standards
4. **Get nominated** - Existing Weavers or maintainers can nominate you

### Current Weavers

See the [WEAVERS.txt](https://github.com/framersai/quarry/blob/main/.github/WEAVERS.txt) file for the current list.

## Security

### Your Data is Safe

- Changes are **never published automatically**
- You must explicitly click "Publish"
- All changes go through GitHub for transparency
- Your PAT is encrypted in your browser only
- No tokens are stored on servers

### What We DON'T Do

- ❌ Auto-publish without your action
- ❌ Store your PAT on servers
- ❌ Use environment variables for client-side auth
- ❌ Access your GitHub account beyond Codex operations

## Preferences

### "Don't Show Again"

If you check "Don't show this guide again" in the publish wizard:
- Future publishes will skip the multi-step guide
- You'll go directly to the confirm step
- Reset this in Settings → Preferences

### Troubleshooting

**"Could not verify GitHub identity"**
- Your PAT may be expired or invalid
- Generate a new token and update in Settings

**"Pull Request required"**
- You're not yet an approved Weaver
- Continue contributing quality PRs to become one

**"No GitHub authentication"**
- You'll be redirected to GitHub's web interface
- Sign in there to complete your contribution

## API for Developers

```typescript
import { 
  checkWeaverStatus, 
  getPublishCapability,
  fetchWeaversList 
} from '@/lib/weaver'

// Check if current user is a weaver
const status = await checkWeaverStatus(pat)
console.log(status.isWeaver) // true/false
console.log(status.username) // 'jddunn'

// Get publishing capability
const capability = getPublishCapability(hasPAT, status)
console.log(capability.method) // 'auto-merge' | 'pr' | 'github-redirect'
console.log(capability.helpText) // Human-readable explanation
```

## Tree Reorganization (Drag-and-Drop)

Quarry Codex supports reorganizing your knowledge base through drag-and-drop. When you move strands between looms or weaves, the system handles persistence and publishing based on your configuration.

### How It Works

1. **Drag and drop** a strand or loom in the tree view
2. Changes are **auto-saved** to local storage immediately
3. A **status bar** appears showing pending changes
4. Click **Publish** when ready to commit changes

### Publishing Targets

The system auto-detects your publishing target:

| Target | When Used | What Happens |
|--------|-----------|--------------|
| **GitHub** | PAT configured | Creates a Pull Request with file moves |
| **Vault** | Local vault connected | Moves files in your local folder |
| **SQLite** | Default fallback | Saves changes to local database only |

### Status Bar

When you have pending tree changes, a status bar appears above the tree:

```
┌─────────────────────────────────────────────┐
│ Draft (3 changes)  [Save] [Publish]         │
└─────────────────────────────────────────────┘
```

**States:**
- **Draft (N changes)** - Pending moves waiting to be published
- **Saving...** - Auto-save in progress
- **Saved** - Changes persisted locally
- **Error** - Something went wrong (click Retry)

### Behind the Scenes

When files are moved:

1. **SQLite paths updated** - Database records reflect new locations
2. **Path references fixed** - Internal links are updated automatically
3. **NLP re-analysis queued** - Moved content is re-indexed for search

### API for Developers

```typescript
import { useTreePersistence } from '@/lib/planner/hooks/useTreePersistence'

// In your component
const {
  state,        // { pendingMoves, saveStatus, publishTarget, ... }
  addMoves,     // Add move operations
  saveLocally,  // Save to SQLite
  publish,      // Publish to target (vault/GitHub)
  clearPending, // Clear pending moves
} = useTreePersistence({ strandSlug: 'current-strand' })

// state.publishTarget is auto-detected:
// - 'github' if PAT is set
// - 'vault' if vault is connected
// - 'sqlite' as fallback
```

## Related Documentation

- [ENV_VARS.md](./ENV_VARS.md) - Environment variables reference
- [CONTRIBUTING.md](../CONTRIBUTING.md) - General contribution guidelines
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup








