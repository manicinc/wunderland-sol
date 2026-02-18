/**
 * Enrichment Suggestion Toast Notifications
 * @module lib/enrichment/toasts
 * 
 * @description
 * Toast notifications for AI/NLP enrichment suggestions.
 * Non-intrusive notifications that inform users about available improvements.
 */

import { showToast, ToastOptions } from '@/lib/ai/toast'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface EnrichmentToastInfo {
  /** Document/strand that has suggestions */
  strandPath?: string
  /** Number of suggestions */
  count: number
  /** Suggestion categories present */
  categories: Array<'tags' | 'categories' | 'views' | 'related'>
  /** Callback when "View" action is clicked */
  onView?: () => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENRICHMENT TOAST FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Show toast when new enrichment suggestions are available
 */
export function showEnrichmentSuggestions(info: EnrichmentToastInfo): string {
  const categoryLabels: Record<string, string> = {
    tags: 'tags',
    categories: 'categories',
    views: 'views',
    related: 'related docs',
  }
  
  const categoryList = info.categories
    .slice(0, 2)
    .map(c => categoryLabels[c])
    .join(', ')
  
  const message = info.count === 1
    ? `1 enrichment suggestion: ${categoryList}`
    : `${info.count} enrichment suggestions: ${categoryList}${info.categories.length > 2 ? ' +more' : ''}`

  return showToast({
    type: 'subtle',
    message: `✨ ${message}`,
    duration: 5000,
    position: 'bottom-right',
    id: `enrichment-${info.strandPath || 'global'}`,
    action: info.onView ? {
      label: 'View',
      onClick: info.onView,
    } : undefined,
  })
}

/**
 * Show toast when an enrichment is applied
 */
export function showEnrichmentApplied(type: 'tag' | 'category' | 'view' | 'relation', name: string): string {
  const labels: Record<string, string> = {
    tag: 'Tag',
    category: 'Category',
    view: 'View',
    relation: 'Relation',
  }
  
  return showToast({
    type: 'success',
    message: `${labels[type]} "${name}" applied`,
    duration: 2500,
    position: 'bottom-right',
  })
}

/**
 * Show toast when an enrichment is dismissed
 */
export function showEnrichmentDismissed(count: number = 1): string {
  return showToast({
    type: 'subtle',
    message: count === 1 ? 'Suggestion dismissed' : `${count} suggestions dismissed`,
    duration: 2000,
    position: 'bottom-right',
  })
}

/**
 * Show toast when document analysis starts
 */
export function showAnalysisStarted(documentName: string): string {
  return showToast({
    type: 'subtle',
    message: `🔍 Analyzing "${documentName}"...`,
    duration: 0, // Persistent until dismissed
    position: 'bottom-right',
    id: `analysis-${documentName}`,
  })
}

/**
 * Show toast when document analysis completes
 */
export function showAnalysisComplete(
  documentName: string,
  suggestionCount: number,
  onView?: () => void
): string {
  const message = suggestionCount > 0
    ? `✅ Analysis complete: ${suggestionCount} suggestion${suggestionCount !== 1 ? 's' : ''} found`
    : `✅ Analysis complete: No suggestions`

  return showToast({
    type: 'success',
    message,
    duration: 4000,
    position: 'bottom-right',
    id: `analysis-${documentName}`,
    action: suggestionCount > 0 && onView ? {
      label: 'View',
      onClick: onView,
    } : undefined,
  })
}

/**
 * Show toast when enrichment requires AI but no API key
 */
export function showEnrichmentRequiresAPI(): string {
  return showToast({
    type: 'subtle',
    message: '🔑 Configure API keys to enable smart suggestions',
    duration: 5000,
    position: 'bottom-right',
    id: 'enrichment-api-required',
    action: {
      label: 'Settings',
      onClick: () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'api-keys' } }))
        }
      },
    },
  })
}

/**
 * Show toast for batch enrichment progress
 */
export function showBatchEnrichmentProgress(current: number, total: number): string {
  const percent = Math.round((current / total) * 100)
  
  return showToast({
    type: 'subtle',
    message: `📊 Processing documents: ${current}/${total} (${percent}%)`,
    duration: 0, // Persistent
    position: 'bottom-right',
    id: 'batch-enrichment-progress',
  })
}

/**
 * Show toast when batch enrichment completes
 */
export function showBatchEnrichmentComplete(
  documentCount: number,
  totalSuggestions: number,
  onViewDashboard?: () => void
): string {
  return showToast({
    type: 'success',
    message: `✨ Analyzed ${documentCount} documents, found ${totalSuggestions} suggestions`,
    duration: 6000,
    position: 'bottom-right',
    id: 'batch-enrichment-progress',
    action: onViewDashboard ? {
      label: 'Dashboard',
      onClick: onViewDashboard,
    } : undefined,
  })
}

/**
 * Show toast for mentions found during typing
 */
export function showMentionsFound(count: number): string {
  if (count === 0) return ''
  
  return showToast({
    type: 'subtle',
    message: `📍 ${count} mention${count !== 1 ? 's' : ''} detected`,
    duration: 2000,
    position: 'bottom-right',
    id: 'mentions-detected',
  })
}

/**
 * Show toast when a formula is computed
 */
export function showFormulaComputed(fieldName: string, result: unknown): string {
  const resultStr = typeof result === 'number' 
    ? result.toLocaleString()
    : String(result)
    
  return showToast({
    type: 'subtle',
    message: `🔢 ${fieldName}: ${resultStr}`,
    duration: 2500,
    position: 'bottom-right',
  })
}

/**
 * Show toast when a view is rendered
 */
export function showViewRendered(viewType: string, itemCount: number): string {
  return showToast({
    type: 'subtle',
    message: `📊 ${viewType} view: ${itemCount} item${itemCount !== 1 ? 's' : ''}`,
    duration: 2000,
    position: 'bottom-right',
  })
}

