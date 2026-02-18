/**
 * Workers Module
 * @module lib/workers
 *
 * Web workers for background processing.
 */

export { useCoverAnalyzer, type UseCoverAnalyzerReturn } from './useCoverAnalyzer'
export type { CoverAnalysisJob, CoverAnalysisResult } from './coverAnalyzer.worker'

