# Offline Document Categorization System

Browser-based categorization system for organizing inbox strands with offline support and GitHub sync.

## Overview

This system provides intelligent categorization of markdown documents in the inbox using keyword-based NLP analysis. All processing happens in the browser using Web Workers, with results stored in local SQL for offline access. Approved categorizations are queued and synced to GitHub when online.

## Architecture

```
┌─────────────────┐
│   User Action   │ (Categorize Inbox button)
└────────┬────────┘
         │
         v
┌─────────────────┐
│   Job Queue     │ (Background task orchestration)
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Web Worker     │ (Categorization algorithm)
└────────┬────────┘
         │
         v
┌─────────────────┐
│ SQL Storage     │ (Results + Actions queue)
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Review UI      │ (Approve/Reject/Modify)
└────────┬────────┘
         │
         v
┌─────────────────┐
│ GitHub Sync     │ (Create PRs/Issues when online)
└─────────────────┘
```

## Features

### ✅ Offline-First
- All categorization happens in browser
- SQL storage with IndexedDB fallback
- No GitHub connection required
- Resumes after page refresh

### ✅ Intelligent Categorization
- Keyword-based NLP analysis
- Confidence scoring (0-100%)
- 3 action tiers:
  - **Auto-apply** (≥95%): High confidence auto-merge PR
  - **Suggest** (≥80%): Medium confidence manual review PR
  - **Needs triage** (<80%): Low confidence issue creation

### ✅ Manual Review
- Visual confidence indicators (green/yellow/red)
- Approve/reject/modify actions
- Alternative suggestions
- Bulk approve high confidence items

### ✅ GitHub Sync
- Auto-sync on network reconnect
- Queue-based (survives offline periods)
- Creates branches and PRs via GitHub API
- Auto-merge for high confidence

## Files Created

### Core Algorithm
- `lib/categorization/algorithm.ts` - Browser-compatible NLP categorization
- `lib/categorization/types.ts` - TypeScript interfaces
- `lib/categorization/schema.ts` - SQL table definitions

### Background Processing
- `public/workers/categorization.worker.ts` - Web Worker for background execution
- `lib/jobs/processors/categorization.ts` - Job queue processor

### GitHub Integration
- `lib/categorization/githubSync.ts` - GitHub API sync service

### UI Components
- `components/quarry/CategorizationReviewPanel.tsx` - Full review interface
- `components/quarry/CategorizationActionQueue.tsx` - Sync queue widget
- `components/quarry/hooks/usePendingCategorizations.ts` - React hook

### Integration
- `lib/categorization/init.ts` - System initialization
- `lib/categorization/index.ts` - Module exports
- Updated: `lib/jobs/types.ts` - Added categorization job type
- Updated: `components/quarry/CodexToolbar.tsx` - Added Categorize button

## Database Schema

### `categorization_results`
Stores categorization suggestions:

```sql
CREATE TABLE categorization_results (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  strand_path TEXT NOT NULL,
  current_category TEXT NOT NULL,
  suggested_category TEXT NOT NULL,
  confidence REAL NOT NULL,
  reasoning TEXT NOT NULL,
  alternatives TEXT,              -- JSON array
  status TEXT DEFAULT 'pending',  -- pending|approved|rejected|modified
  review_notes TEXT,
  final_category TEXT,
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  applied_at TEXT,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);
```

### `categorization_actions`
GitHub sync queue:

```sql
CREATE TABLE categorization_actions (
  id TEXT PRIMARY KEY,
  result_id TEXT NOT NULL,
  action_type TEXT NOT NULL,      -- move|create_pr|create_issue
  from_path TEXT NOT NULL,
  to_path TEXT NOT NULL,
  strand_content TEXT NOT NULL,
  metadata TEXT,                  -- JSON
  status TEXT DEFAULT 'pending',  -- pending|syncing|completed|failed
  sync_error TEXT,
  github_pr_number INTEGER,
  github_pr_url TEXT,
  created_at TEXT NOT NULL,
  synced_at TEXT,
  FOREIGN KEY (result_id) REFERENCES categorization_results(id)
);
```

## Usage

### 1. Initialize System

In your app initialization (e.g., `app/layout.tsx` or `app/providers.tsx`):

```typescript
import { initializeCategorizationSystem } from '@/lib/categorization'

// During app startup
await initializeCategorizationSystem()
```

### 2. Trigger Categorization Job

```typescript
import { jobQueue } from '@/lib/jobs/jobQueue'

// Create categorization job
const job = await jobQueue.createJob('categorization', {
  inboxPaths: [
    'weaves/inbox/document1.md',
    'weaves/inbox/document2.md',
  ],
  autoApply: false,          // Don't auto-approve
  autoApplyThreshold: 0.95,  // Threshold for auto-approval
})

// Job runs in background, results stored in SQL
```

### 3. Review Results

Use the `CategorizationReviewPanel` component:

```tsx
import { CategorizationReviewPanel } from '@/components/quarry/CategorizationReviewPanel'

function ReviewModal({ jobId }) {
  return (
    <CategorizationReviewPanel
      jobId={jobId}  // Optional: filter by job
      onClose={() => setShowReview(false)}
    />
  )
}
```

### 4. Sync to GitHub

Automatic:
- Auto-syncs on network reconnect
- Periodic checks every 30 seconds (in CategorizationActionQueue)

Manual:
```typescript
import { syncCategorizationActions } from '@/lib/categorization'

const result = await syncCategorizationActions()
console.log(`Synced: ${result.synced}, Failed: ${result.failed}`)
```

## Configuration

### Default Categories

Edit `lib/categorization/algorithm.ts`:

```typescript
export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  {
    path: 'weaves/wiki/tutorials/',
    label: 'Tutorials',
    description: 'Tutorials and learning guides',
    keywords: ['tutorial', 'guide', 'how-to', 'learn'],
    weight: 1.0,
  },
  // Add more categories...
]
```

### GitHub Config

Store in settings table:

```typescript
const config = {
  token: 'ghp_xxxxxxxxxxxxx',  // GitHub PAT
  owner: 'your-username',
  repo: 'your-repo',
  baseBranch: 'main',
}

await db.run(
  'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
  ['github_config', JSON.stringify(config)]
)
```

### Categorization Config

```typescript
const config = {
  enabled: true,
  auto_apply_threshold: 0.95,  // Auto-approve threshold
  pr_threshold: 0.80,          // PR creation threshold
  categories: DEFAULT_CATEGORIES,
  excluded_paths: ['weaves/inbox/', 'weaves/.templates/'],
  keyword_hints: {
    'weaves/custom/': ['special', 'keyword'],
  },
}

await db.run(
  'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
  ['categorization_config', JSON.stringify(config)]
)
```

## API Reference

### Hook: `usePendingCategorizations`

```typescript
const {
  results,           // Categorization results
  loading,           // Loading state
  error,             // Error message
  refresh,           // Manual refresh
  approve,           // Approve result
  reject,            // Reject result
  modify,            // Modify category
  approveHighConfidence, // Bulk approve
} = usePendingCategorizations({
  status: ['pending'],  // Filter by status
  jobId: 'job-123',     // Filter by job (optional)
  refreshInterval: 5000, // Auto-refresh interval
})
```

### Function: `syncCategorizationActions`

```typescript
const result = await syncCategorizationActions(limit)

// Returns:
{
  synced: number,   // Successfully synced
  failed: number,   // Failed to sync
  errors: Array<{
    actionId: string,
    error: string,
  }>
}
```

### Function: `categorizeStrand`

```typescript
const result = await categorizeStrand({
  path: 'weaves/inbox/doc.md',
  title: 'Document Title',
  content: '# Content...',
  frontmatter: { tags: ['example'] },
  config: DEFAULT_CONFIG,
})

// Returns:
{
  filePath: string,
  currentPath: string,
  suggestion: {
    category: string,
    confidence: number,
    reasoning: string,
    alternatives: [...],
  },
  action: 'auto-apply' | 'suggest' | 'needs-triage',
}
```

## Workflow

### User Workflow

1. **Click "Categorize" in toolbar** → Starts categorization job
2. **Job runs in background** → Progress shown in job queue panel
3. **Results appear in Review Panel** → Color-coded by confidence
4. **Review and approve/reject** → Modify categories if needed
5. **Sync to GitHub** → Manual or automatic when online
6. **PRs created** → High confidence auto-merge, others need review

### System Workflow

1. **Job Created** → `jobQueue.createJob('categorization', payload)`
2. **Worker Spawned** → Background processing in Web Worker
3. **Results Stored** → `categorization_results` table
4. **Actions Created** → `categorization_actions` table (if approved)
5. **GitHub Sync** → Creates branches, moves files, creates PRs
6. **Status Updated** → Action marked as `completed` or `failed`

## Troubleshooting

### No GitHub Sync

- Check GitHub config in settings
- Verify PAT has `repo` scope
- Check network connectivity: `await isGitHubReachable()`
- View errors in `categorization_actions.sync_error`

### Low Confidence Scores

- Add more keywords to category definitions
- Use `keyword_hints` for custom patterns
- Adjust `weight` property on categories
- Check frontmatter tags and topics

### Worker Timeout

- Default timeout: 10 minutes
- Check browser console for errors
- Verify worker file is accessible: `/workers/categorization.worker.js`
- Ensure worker is built by webpack/next.config

## Performance

- **Batch Size**: 10 files at a time (adjustable in worker)
- **Progress Updates**: Every file processed
- **Database**: Indexed for fast queries
- **Auto-refresh**: Every 5 seconds (adjustable)
- **GitHub Sync**: 50 actions per batch (adjustable)

## Future Enhancements

- [ ] LLM-based categorization fallback
- [ ] Learn from user corrections
- [ ] Category suggestions based on content similarity
- [ ] Bulk operations (approve all, reject all)
- [ ] Export/import categorization rules
- [ ] Analytics dashboard (accuracy over time)

## License

Part of the frame.dev project.
