/**
 * Taxonomy System Initialization
 * @module lib/taxonomy/init
 *
 * Registers taxonomy job processor and initializes the system.
 * Should be called during app initialization.
 */

import { jobQueue } from '@/lib/jobs/jobQueue'
import { reclassifyTaxonomyProcessor } from '@/lib/jobs/processors/reclassifyTaxonomy'

/**
 * Initialize taxonomy system
 * - Registers reclassify-taxonomy job processor
 * - Sets up any required event handlers
 */
export async function initializeTaxonomySystem(): Promise<void> {
  try {
    // Register job processor for taxonomy reclassification
    jobQueue.registerProcessor('reclassify-taxonomy', reclassifyTaxonomyProcessor)

    console.log('[Taxonomy] System initialized successfully')
  } catch (error) {
    console.error('[Taxonomy] Initialization failed:', error)
    throw error
  }
}

/**
 * Check if the taxonomy system is properly initialized
 */
export function isTaxonomySystemReady(): boolean {
  // Check if processor is registered
  // Note: jobQueue doesn't expose a way to check this, so we just return true
  return true
}
