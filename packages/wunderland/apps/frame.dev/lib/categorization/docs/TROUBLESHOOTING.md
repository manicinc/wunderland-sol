# Troubleshooting Guide

Common issues and solutions for the categorization system.

## Quick Diagnostics

Run these checks first:

```typescript
// Check if system is initialized
import { categorizationTablesExist } from '@/lib/categorization/schema'
const initialized = await categorizationTablesExist(db)
console.log('Initialized:', initialized)

// Check pending count
import { getPendingActionsCount } from '@/lib/categorization/githubSync'
const pending = await getPendingActionsCount()
console.log('Pending syncs:', pending)

// Check GitHub connectivity
import { isGitHubReachable } from '@/lib/categorization/githubSync'
const online = await isGitHubReachable()
console.log('GitHub reachable:', online)
```

## Common Issues

### Categorization Issues

#### 🔴 All Confidence Scores Are Low (<50%)

**Symptoms**:
- Every document scores below 50%
- No auto-approvals
- All marked as "needs triage"

**Causes**:
1. Category keywords too specific
2. Documents lack metadata
3. Content doesn't match any category

**Solutions**:

**Solution 1: Improve Keywords**
```typescript
// Add broader keywords
{
  path: 'weaves/wiki/tutorials/',
  keywords: [
    'tutorial', 'guide', 'how-to',
    // ADD THESE:
    'learn', 'beginner', 'introduction',
    'walkthrough', 'example', 'demo'
  ]
}
```

**Solution 2: Add Frontmatter**
```markdown
---
title: Document Title
tags: [tutorial, react, beginner]
topics: [web-development, frontend]
---
```

**Solution 3: Lower Thresholds Temporarily**
```typescript
// Settings → Categorization
{
  auto_apply_threshold: 0.70,  // Was 0.95
  pr_threshold: 0.50,          // Was 0.80
}
```

#### 🔴 Wrong Category Suggested

**Symptoms**:
- Tutorial categorized as reference
- Reference categorized as concepts
- Consistent pattern of errors

**Causes**:
1. Overlapping keywords
2. Generic titles
3. Mixed content

**Solutions**:

**Solution 1: Remove Overlapping Keywords**
```typescript
// BAD: Both have "example"
tutorials: ['tutorial', 'example', 'guide']
reference: ['api', 'example', 'documentation']

// GOOD: Distinct keywords
tutorials: ['tutorial', 'walkthrough', 'step-by-step']
reference: ['api', 'specification', 'interface']
```

**Solution 2: Use Weight**
```typescript
// Prioritize important categories
{
  path: 'weaves/wiki/tutorials/',
  keywords: [...],
  weight: 2.0  // Double the score
}
```

**Solution 3: Check Content**
```markdown
<!-- BAD: Mixed signals -->
# React Tutorial
This document provides an API reference...

<!-- GOOD: Clear intent -->
# React Tutorial
Learn React step by step with this hands-on guide...
```

#### 🔴 Categorization Job Hangs/Timeout

**Symptoms**:
- Job stuck at 50%
- "Categorization timed out" error
- Browser tab freezes

**Causes**:
1. Very large files
2. Too many files at once
3. Worker crash
4. Browser performance

**Solutions**:

**Solution 1: Batch Smaller**
```typescript
// Instead of 500 files
await jobQueue.createJob('categorization', {
  inboxPaths: all500Files  // ❌ TOO MANY
})

// Split into batches
const BATCH_SIZE = 50
for (let i = 0; i < all500Files.length; i += BATCH_SIZE) {
  await jobQueue.createJob('categorization', {
    inboxPaths: all500Files.slice(i, i + BATCH_SIZE)
  })
}
```

**Solution 2: Check File Sizes**
```bash
# Find large files
find weaves/inbox -type f -size +1M

# Split or exclude large files
```

**Solution 3: Check Browser Console**
```
F12 → Console → Look for errors:
- "Worker terminated"
- "Out of memory"
- "Script timeout"
```

**Solution 4: Restart Worker**
```typescript
// Kill and restart worker
worker.terminate()
worker = new Worker('/workers/categorization.worker.js')
```

### GitHub Sync Issues

#### 🔴 Sync Always Fails

**Symptoms**:
- All sync attempts fail
- Error: "GitHub API error: 401"
- Status shows "Failed"

**Causes**:
1. Invalid/expired token
2. Wrong token scopes
3. Network issues
4. Repository access denied

**Solutions**:

**Solution 1: Verify Token**
```bash
# Test token manually
curl -H "Authorization: token ghp_YOUR_TOKEN" \
  https://api.github.com/user
```

Should return your GitHub user info. If 401:
- Token expired → Create new token
- Token invalid → Check copy/paste

**Solution 2: Check Scopes**

Token needs:
- ✅ `repo` (or `public_repo` for public repos)
- ✅ `workflow` (if creating PRs)

Regenerate with correct scopes.

**Solution 3: Test Repository Access**
```bash
# Check repo exists and is accessible
curl -H "Authorization: token ghp_YOUR_TOKEN" \
  https://api.github.com/repos/OWNER/REPO
```

If 404:
- Repository name wrong
- Private repo without `repo` scope
- Not a collaborator

**Solution 4: Check Rate Limits**
```bash
curl -H "Authorization: token ghp_YOUR_TOKEN" \
  https://api.github.com/rate_limit
```

If rate limited:
- Wait for reset time
- Use different token
- Batch smaller

#### 🔴 PR Creation Fails

**Symptoms**:
- Sync starts but PR creation fails
- Error: "Reference already exists"
- Error: "Validation failed"

**Causes**:
1. Branch already exists
2. File already exists at destination
3. Invalid file path
4. Branch protection rules

**Solutions**:

**Solution 1: Check Existing Branches**
```bash
# List branches
git branch -r | grep auto-categorize

# Delete old branches
git push origin --delete auto-categorize/old-branch
```

Or in Settings:
```
Auto-delete head branches: ON
```

**Solution 2: Check File Conflicts**
```bash
# Check if file exists at destination
ls weaves/wiki/tutorials/filename.md
```

If exists:
- Choose different category
- Rename file
- Merge manually

**Solution 3: Validate Paths**
```typescript
// Ensure valid path
const validPath = suggestedPath
  .replace(/[^a-zA-Z0-9\-_\/]/g, '-')
  .toLowerCase()
```

#### 🔴 Auto-Merge Not Working

**Symptoms**:
- PR created but doesn't auto-merge
- High confidence items require manual merge
- PRs stay open

**Causes**:
1. Auto-merge not enabled
2. Checks required
3. Branch protection rules
4. Insufficient permissions

**Solutions**:

**Solution 1: Enable Auto-Merge in Settings**

Repository Settings → General:
```
✅ Allow auto-merge
```

**Solution 2: Check Branch Protection**

Settings → Branches → Branch protection rules:
```
⚠️ Require status checks before merging
   If enabled, checks must pass before auto-merge
```

Either:
- Disable required checks for categorization PRs
- Wait for checks to pass
- Use labels to bypass checks

**Solution 3: Use GraphQL API**

Check if auto-merge was enabled:
```bash
gh pr view 123 --json autoMergeRequest
```

If not enabled, our GitHub sync might have failed. Check sync logs.

### UI/UX Issues

#### 🔴 Review Panel Empty

**Symptoms**:
- Panel opens but shows "No pending categorizations"
- Job completed successfully
- Results not appearing

**Causes**:
1. Wrong filter applied
2. Results already approved
3. Database query error

**Solutions**:

**Solution 1: Check Filters**
```typescript
// Hook defaults to status=['pending']
usePendingCategorizations({
  status: ['pending', 'approved', 'rejected']  // Show all
})
```

**Solution 2: Query Database Directly**
```sql
SELECT * FROM categorization_results
WHERE job_id = 'your-job-id'
ORDER BY created_at DESC
```

**Solution 3: Check Browser Console**
```
F12 → Console → Look for:
- SQL errors
- Permission errors
- Network errors
```

#### 🔴 Sync Queue Widget Not Updating

**Symptoms**:
- Queue shows "0 Pending" but items exist
- Counter doesn't update
- Status stuck on "Syncing"

**Causes**:
1. Refresh interval not working
2. State not updating
3. Database out of sync

**Solutions**:

**Solution 1: Manual Refresh**
```typescript
// In component
const { refresh } = usePendingCategorizations()
refresh()
```

**Solution 2: Check Refresh Interval**
```typescript
// Default is 5 seconds
usePendingCategorizations({
  refreshInterval: 5000  // Increase if needed
})
```

**Solution 3: Clear State**
```typescript
// Force re-query
await syncCategorizationActions()
await getPendingActionsCount()
```

### Performance Issues

#### 🔴 Categorization Very Slow

**Symptoms**:
- Takes minutes for a few files
- UI becomes unresponsive
- Browser tab freezes

**Causes**:
1. Very large files
2. Complex regex
3. Too many categories
4. Memory leak

**Solutions**:

**Solution 1: Profile Performance**
```typescript
// In algorithm.ts
console.time('categorizeStrand')
const result = await categorizeStrand(input)
console.timeEnd('categorizeStrand')
// Should be <100ms per file
```

**Solution 2: Limit Content**
```typescript
// Only analyze first 10KB
export function categorizeStrand(input: CategorizationInput) {
  const trimmedContent = input.content.slice(0, 10000)
  // Process trimmedContent
}
```

**Solution 3: Reduce Categories**
```typescript
// Test with fewer categories
const testConfig = {
  ...config,
  categories: config.categories.slice(0, 5)  // Top 5 only
}
```

**Solution 4: Use Web Worker Pool**
```typescript
// Spawn multiple workers
const workers = Array(4).fill(null).map(() =>
  new Worker('/workers/categorization.worker.js')
)
// Distribute tasks across workers
```

#### 🔴 Browser Memory Issues

**Symptoms**:
- Tab crashes
- "Out of memory" errors
- Slow over time

**Causes**:
1. Results not cleared
2. Worker not terminated
3. Cache growing indefinitely

**Solutions**:

**Solution 1: Clear Old Results**
```sql
-- Delete results older than 30 days
DELETE FROM categorization_results
WHERE created_at < DATE('now', '-30 days')
```

**Solution 2: Terminate Workers**
```typescript
// After job completes
worker.terminate()
worker = null
```

**Solution 3: Clear Cache**
```typescript
// Clear categorization cache periodically
localStorage.removeItem('categorization_cache')
indexedDB.deleteDatabase('categorization_db')
```

## Error Messages

### "GitHub configuration not found"

**Fix**: Configure GitHub in Settings → GitHub

### "Worker timeout after 10 minutes"

**Fix**: Break into smaller batches or increase timeout

### "Failed to load config"

**Fix**: Check Settings → Categorization → Valid JSON

### "Reference already exists"

**Fix**: Delete branch on GitHub or rename

### "No valid files found"

**Fix**: Check file paths in `inboxPaths`

### "Database error: no such table"

**Fix**: Run schema initialization:
```typescript
import { initializeCategorizationSchema } from '@/lib/categorization'
await initializeCategorizationSchema(db)
```

## Debug Mode

Enable debug logging:

```typescript
// In browser console
localStorage.setItem('debug_categorization', 'true')

// Reload page
location.reload()

// Check logs
localStorage.getItem('categorization_logs')
```

Logs will show:
- Algorithm decisions
- Score calculations
- GitHub API calls
- Database queries

## Getting Help

If issue persists:

1. **Collect Information**:
   - Browser console errors
   - Network tab (for API failures)
   - Database state (SQL queries)
   - Recent actions taken

2. **Create Issue**:
   - Go to GitHub repository
   - Click "Issues" → "New issue"
   - Use template: "Bug Report"
   - Include debug information

3. **Emergency Workaround**:
   ```typescript
   // Disable auto-sync temporarily
   localStorage.setItem('disable_auto_sync', 'true')

   // Manual categorization
   // Move files manually via GitHub UI
   ```

## Prevention

### Regular Maintenance

**Weekly**:
- Review sync errors
- Update category keywords
- Delete old results

**Monthly**:
- Check token expiry
- Review accuracy metrics
- Optimize slow categories

### Best Practices

1. **Test with 1-2 files first**
2. **Review high confidence items**
3. **Update keywords regularly**
4. **Monitor GitHub API rate limits**
5. **Keep browser updated**
6. **Clear cache periodically**

---

**Still stuck?** Check the [User Guide](USER_GUIDE.md) or [Developer Guide](DEVELOPER_GUIDE.md).
