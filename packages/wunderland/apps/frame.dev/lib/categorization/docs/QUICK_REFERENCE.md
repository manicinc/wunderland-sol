# Quick Reference Card

Cheat sheet for common categorization tasks.

## 🚀 Quick Start

```typescript
// 1. Initialize system
import { initializeCategorizationSystem } from '@/lib/categorization'
await initializeCategorizationSystem()

// 2. Create categorization job
import { jobQueue } from '@/lib/jobs/jobQueue'
const job = await jobQueue.createJob('categorization', {
  inboxPaths: ['weaves/inbox/document.md'],
  autoApply: false,
})

// 3. Review results
import { usePendingCategorizations } from '@/components/quarry/hooks/usePendingCategorizations'
const { results, approve, reject } = usePendingCategorizations()

// 4. Sync to GitHub
import { syncCategorizationActions } from '@/lib/categorization/githubSync'
await syncCategorizationActions()
```

## 📊 Confidence Scores

| Score | Color | Meaning | Action |
|-------|-------|---------|--------|
| 90-100% | 🟢 Green | Almost certain | Auto-approve |
| 80-89% | 🟢 Green | Very likely | Approve |
| 70-79% | 🟡 Yellow | Probably | Review first |
| 50-69% | 🟡 Yellow | Possible | Check carefully |
| <50% | 🔴 Red | Uncertain | Manual review |

## 🎯 Default Categories

```typescript
'weaves/wiki/tutorials/'        // Learning guides, how-tos
'weaves/wiki/reference/'        // API docs, specs
'weaves/wiki/concepts/'         // Theory, architecture
'weaves/wiki/best-practices/'   // Recommendations, tips
'weaves/notes/'                 // Personal notes, ideas
'weaves/projects/'              // Project docs
'weaves/research/'              // Analysis, studies
```

## 🔧 Common Commands

### Create Job
```typescript
await jobQueue.createJob('categorization', {
  inboxPaths: ['weaves/inbox/doc1.md', 'weaves/inbox/doc2.md'],
  autoApply: false,           // Don't auto-approve
  autoApplyThreshold: 0.95,   // Threshold for auto-approval
})
```

### List Results
```typescript
import { listCategorizationResults } from '@/lib/categorization/database'

const results = await listCategorizationResults({
  status: ['pending'],
  minConfidence: 0.8,
  limit: 50,
})
```

### Approve Result
```typescript
import { updateCategorizationResult } from '@/lib/categorization/database'

await updateCategorizationResult(resultId, {
  status: 'approved',
  final_category: 'weaves/wiki/tutorials/',
  reviewed_at: new Date().toISOString(),
})
```

### Sync to GitHub
```typescript
const result = await syncCategorizationActions(50)  // Sync up to 50
console.log(`Synced: ${result.synced}, Failed: ${result.failed}`)
```

## 📝 Frontmatter Tips

Good frontmatter boosts confidence:

```yaml
---
title: Clear Descriptive Title           # +25 pts if matches keyword
tags: [tutorial, react, beginner]       # +15 pts each match
topics: [web-development, frontend]     # +20 pts each match
summary: Brief description              # Analyzed for keywords
---
```

## ⚡ Keyboard Shortcuts

| Action | Shortcut | Context |
|--------|----------|---------|
| Open Review | `Ctrl+R` | Anywhere |
| Approve | `A` | Review Panel |
| Reject | `R` | Review Panel |
| Modify | `M` | Review Panel |
| Next Item | `↓` | Review Panel |
| Previous Item | `↑` | Review Panel |

*(Shortcuts may vary by component implementation)*

## 🎨 Customization Snippets

### Add Custom Category
```typescript
import { DEFAULT_CATEGORIES } from '@/lib/categorization/algorithm'

const customCategories = [
  ...DEFAULT_CATEGORIES,
  {
    path: 'weaves/custom/my-category/',
    label: 'My Category',
    description: 'Documents about X',
    keywords: ['keyword1', 'keyword2', 'phrase'],
    weight: 1.5,  // Higher priority
  },
]
```

### Custom Scoring
```typescript
function customScoreCategory(content: string, category: CategoryDefinition) {
  let score = 0

  // Original keyword matching
  score += keywordMatches * category.weight

  // Add custom logic
  if (content.includes('specific-pattern')) {
    score += 0.3
  }

  return Math.min(score, 1.0)
}
```

### LLM Fallback
```typescript
async function smartCategorize(input: CategorizationInput) {
  const result = await categorizeStrand(input)

  // Use LLM for low confidence
  if (result.suggestion.confidence < 0.5) {
    return await llmCategorize(input)
  }

  return result
}
```

## 🔍 SQL Queries

### Find High Confidence Items
```sql
SELECT * FROM categorization_results
WHERE confidence >= 0.9
  AND status = 'pending'
ORDER BY confidence DESC
```

### Pending Sync Actions
```sql
SELECT * FROM categorization_actions
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 10
```

### Failed Syncs
```sql
SELECT * FROM categorization_actions
WHERE status = 'failed'
  AND created_at > DATE('now', '-7 days')
```

### Statistics
```sql
SELECT
  COUNT(*) as total,
  AVG(confidence) as avg_confidence,
  SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved,
  SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejected
FROM categorization_results
WHERE created_at > DATE('now', '-30 days')
```

## 🛠️ Utility Functions

### Bulk Approve
```typescript
async function bulkApproveHighConfidence(threshold = 0.8) {
  const results = await listCategorizationResults({
    status: ['pending'],
    minConfidence: threshold,
  })

  for (const result of results) {
    await updateCategorizationResult(result.id, {
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    })
  }

  return results.length
}
```

### Retry Failed
```typescript
async function retryAllFailed() {
  const failed = await listCategorizationActions({
    status: ['failed'],
  })

  for (const action of failed) {
    await updateCategorizationAction(action.id, {
      status: 'pending',
      sync_error: undefined,
    })
  }

  return syncCategorizationActions()
}
```

### Export Rules
```typescript
async function exportCategorizationConfig() {
  const db = await getDb()
  const config = await db.get(
    'SELECT value FROM settings WHERE key = ?',
    ['categorization_config']
  )

  return JSON.parse(config.value)
}
```

## 🐛 Quick Debug

```typescript
// Enable debug mode
localStorage.setItem('debug_categorization', 'true')

// Check initialization
import { categorizationTablesExist } from '@/lib/categorization/schema'
console.log('Initialized:', await categorizationTablesExist(db))

// Test GitHub connection
import { isGitHubReachable } from '@/lib/categorization/githubSync'
console.log('GitHub:', await isGitHubReachable())

// View logs
console.table(await listCategorizationResults({ limit: 10 }))
```

## 📚 Links

- 📖 [Full User Guide](USER_GUIDE.md)
- 🔧 [Developer Guide](DEVELOPER_GUIDE.md)
- 🎓 [Tutorial](TUTORIAL.md)
- 🐛 [Troubleshooting](TROUBLESHOOTING.md)
- 📝 [API Reference](API_REFERENCE.md)

## 💡 Pro Tips

1. **Start small** - Test with 1-2 files first
2. **Use frontmatter** - Add tags and topics
3. **Review high confidence** - Even 90% can be wrong
4. **Update keywords** - Improve based on errors
5. **Monitor syncs** - Check GitHub PRs regularly
6. **Clear cache** - If behavior seems strange
7. **Batch smartly** - 50 files at a time is optimal
8. **Check alternatives** - Better category might exist

## 🚨 Emergency Commands

```typescript
// Stop all jobs
jobQueue.cancelAllJobs()

// Clear queue
localStorage.removeItem('job_queue')

// Reset database
await dropCategorizationTables(db)
await initializeCategorizationSchema(db)

// Force refresh
location.reload()
```

---

**Quick help**: Press `?` for keyboard shortcuts or check [Troubleshooting](TROUBLESHOOTING.md)
