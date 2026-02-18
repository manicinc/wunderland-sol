#!/usr/bin/env tsx
/**
 * Batch Block Processing CLI
 * @module scripts/process-all-blocks
 *
 * CLI tool for processing strand blocks through the NLP pipeline.
 * Used by GitHub Actions and for manual reindexing.
 *
 * Usage:
 *   npx tsx scripts/process-all-blocks.ts [options]
 *
 * Options:
 *   --force              Force reprocess all strands (ignore staleness)
 *   --paths=file1,file2  Process specific files only
 *   --limit=N            Max strands to process (default: 100)
 *   --llm                Use LLM for tagging (slower, better quality)
 *   --dry-run            Show what would be processed without doing it
 *
 * Examples:
 *   # Process all stale strands
 *   npx tsx scripts/process-all-blocks.ts
 *
 *   # Force reprocess everything
 *   npx tsx scripts/process-all-blocks.ts --force
 *
 *   # Process specific files (from GitHub Actions)
 *   npx tsx scripts/process-all-blocks.ts --paths="weaves/wiki/looms/intro/strands/welcome.md"
 */

import { queueStaleStrandsForProcessing, getStaleStrandCount } from '../lib/jobs/batchBlockProcessing'
import { jobQueue, getPendingCount } from '../lib/jobs/jobQueue'
import { registerReindexProcessors } from '../lib/jobs/reindexStrand'

/**
 * Wait for all pending jobs to complete
 */
async function waitForJobCompletion(timeoutMs = 300000): Promise<void> {
  const startTime = Date.now()
  const pollInterval = 1000 // Check every second

  return new Promise((resolve, reject) => {
    const checkCompletion = () => {
      const pending = getPendingCount()

      if (pending === 0) {
        resolve()
        return
      }

      if (Date.now() - startTime > timeoutMs) {
        reject(new Error(`Timeout: ${pending} jobs still pending after ${timeoutMs / 1000}s`))
        return
      }

      setTimeout(checkCompletion, pollInterval)
    }

    checkCompletion()
  })
}

// Parse CLI arguments
function parseArgs(): {
  force: boolean
  paths: string[] | undefined
  limit: number
  useLLM: boolean
  dryRun: boolean
} {
  const args = process.argv.slice(2)

  const force = args.includes('--force')
  const useLLM = args.includes('--llm')
  const dryRun = args.includes('--dry-run')

  // Parse --paths=file1,file2
  const pathsArg = args.find(a => a.startsWith('--paths='))
  const paths = pathsArg
    ? pathsArg.split('=')[1].split(',').map(p => p.trim()).filter(Boolean)
    : undefined

  // Parse --limit=N
  const limitArg = args.find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 100

  return { force, paths, limit, useLLM, dryRun }
}

async function main() {
  console.log('========================================')
  console.log('  Batch Block Processing')
  console.log('========================================\n')

  const { force, paths, limit, useLLM, dryRun } = parseArgs()

  console.log('Options:')
  console.log(`  Force:   ${force}`)
  console.log(`  Paths:   ${paths ? paths.join(', ') : '(auto-detect stale)'}`)
  console.log(`  Limit:   ${limit}`)
  console.log(`  LLM:     ${useLLM}`)
  console.log(`  Dry run: ${dryRun}`)
  console.log('')

  // Initialize job queue and register processors
  console.log('Initializing job queue...')
  await jobQueue.initialize()
  registerReindexProcessors()

  if (dryRun) {
    // Just show what would be processed
    const staleCount = await getStaleStrandCount()
    console.log(`\nDry run: Would process ${paths?.length ?? staleCount} strands`)
    process.exit(0)
  }

  // Queue the jobs
  console.log('\nQueueing jobs...')
  const result = await queueStaleStrandsForProcessing({
    force,
    paths,
    limit,
    useLLM,
  })

  console.log(`\nQueued: ${result.queued}`)
  console.log(`Skipped (duplicates): ${result.skipped}`)

  if (result.queued === 0) {
    console.log('\nNo strands to process. Exiting.')
    process.exit(0)
  }

  // Wait for all jobs to complete
  console.log('\nProcessing jobs...')
  console.log('(This may take a while for large batches)\n')

  // Subscribe to job events for progress logging
  const unsubscribe = jobQueue.subscribe((event) => {
    if (event.type === 'job:progress') {
      const job = event.job
      process.stdout.write(`\r  [${job.progress}%] ${job.message}`)
    } else if (event.type === 'job:completed') {
      const job = event.job
      console.log(`\n  ✓ Completed: ${(job.payload as { strandPath: string }).strandPath}`)
      if (job.result) {
        const r = job.result as { blocksReindexed?: number; blocksTagged?: number }
        console.log(`    Blocks: ${r.blocksReindexed ?? 0}, Tagged: ${r.blocksTagged ?? 0}`)
      }
    } else if (event.type === 'job:failed') {
      const job = event.job
      console.error(`\n  ✗ Failed: ${(job.payload as { strandPath: string }).strandPath}`)
      console.error(`    Error: ${job.error}`)
    }
  })

  // Wait for completion
  try {
    await waitForJobCompletion(300000) // 5 minute timeout
    console.log('\n========================================')
    console.log('  All jobs completed successfully!')
    console.log('========================================')
  } catch (error) {
    console.error('\n========================================')
    console.error('  Some jobs failed!')
    console.error('========================================')
    console.error(error)
    process.exit(1)
  } finally {
    unsubscribe()
  }

  process.exit(0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
