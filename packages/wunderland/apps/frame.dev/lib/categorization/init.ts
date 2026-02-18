/**
 * Categorization System Initialization
 * @module lib/categorization/init
 *
 * Registers categorization processor and initializes database schema
 */

import { jobQueue } from '@/lib/jobs/jobQueue'
import { categorizationProcessor } from '@/lib/jobs/processors/categorization'
import { initializeCategorizationSchema } from './schema'
import { getDb } from '@/lib/storage/localCodex'
import { initializeSourceDetection } from './sourceAdapter'

/**
 * Initialize categorization system
 * - Auto-detects source (local files vs GitHub)
 * - Registers job processor
 * - Ensures database tables exist
 * - Sets up auto-sync on network reconnect
 */
export async function initializeCategorizationSystem(): Promise<void> {
  try {
    // Auto-detect and configure source
    await initializeSourceDetection()

    // Register job processor
    jobQueue.registerProcessor('categorization', categorizationProcessor)

    // Initialize database schema
    const db = await getDb()
    await initializeCategorizationSchema(db)

    // Setup auto-sync on network reconnect (for GitHub sources)
    if (typeof window !== 'undefined') {
      window.addEventListener('online', async () => {
        const { syncCategorizationActions } = await import('./sourceAdapter')
        const { getPendingActionsCount } = await import('./githubSync')
        const { getCodexSource } = await import('./sourceAdapter')

        const source = await getCodexSource()
        const pendingCount = await getPendingActionsCount()

        if (pendingCount > 0) {
          console.log(`[Categorization] Network reconnected (${source.type}), syncing ${pendingCount} pending actions...`)
          try {
            const result = await syncCategorizationActions()
            console.log(`[Categorization] Auto-sync complete: ${result.synced} synced, ${result.failed} failed`)
          } catch (error) {
            console.error('[Categorization] Auto-sync failed:', error)
          }
        }
      })
    }

    console.log('[Categorization] System initialized successfully')
  } catch (error) {
    console.error('[Categorization] Initialization failed:', error)
    throw error
  }
}
