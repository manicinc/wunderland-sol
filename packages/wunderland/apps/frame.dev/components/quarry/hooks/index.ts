/**
 * Codex Hooks - Main exports
 * @module codex/hooks
 *
 * React hooks for the Codex system:
 * - Canvas & export workflows
 * - Keyboard shortcuts
 * - Touch & haptic feedback
 * - Navigation & UI state
 *
 * @example
 * ```tsx
 * import {
 *   useCanvasExport,
 *   useCodexHotkeys,
 *   useHaptics,
 *   useIsTouchDevice,
 * } from '@/components/quarry/hooks'
 * ```
 */

// Canvas & Export
export { useCanvasExport, useCanvasHasContent } from './useCanvasExport'
export type { UseCanvasExportOptions, UseCanvasExportResult } from './useCanvasExport'

// Keyboard Shortcuts
export { useCodexHotkeys } from './useCodexHotkeys'

// Touch & Haptics
export { useHaptics, triggerHaptic } from './useHaptics'
export type { HapticPattern } from './useHaptics'
export { useIsTouchDevice } from './useIsTouchDevice'

// Navigation & State
export { useActiveHeading } from './useActiveHeading'
export { useBookmarks } from './useBookmarks'
export { useKeyboardNavigation } from './useKeyboardNavigation'
export { useProfile } from './useProfile'
export { usePreferences } from './usePreferences'

// Media & Storage
export { useMediaStorage } from './useMediaStorage'
export { useTextToSpeech } from './useTextToSpeech'

// UI Utilities
export { useMediaQuery } from './useMediaQuery'
export { useResponsiveLayout } from './useResponsiveLayout'
export { useModalAccessibility } from './useModalAccessibility'
export { useFocusManager } from './useFocusManager'

// Learning Studio
export { useBatchSelection } from './useBatchSelection'
export type { UseBatchSelectionOptions, UseBatchSelectionReturn, SelectableItemType } from './useBatchSelection'
export { useAggregatedContent } from './useAggregatedContent'
export type { UseAggregatedContentOptions, UseAggregatedContentReturn, AggregatedStrand, AggregationStats, AggregationFilters, AggregationProgress } from './useAggregatedContent'
export { useLearningSelection } from './useLearningSelection'
export type { UseLearningSelectionOptions, UseLearningSelectionReturn } from './useLearningSelection'
export { useQuizTutor } from './useQuizTutor'
export type { ExplainAnswerInput, TutorExplanation, UseQuizTutorResult } from './useQuizTutor'
export { useSwipeGesture } from './useSwipeGesture'
export type { SwipeDirection, SwipeGestureOptions, SwipeState, UseSwipeGestureReturn } from './useSwipeGesture'
export { useLearningGamification } from './useLearningGamification'
export type { StudySession, LearningStats, UseLearningGamificationReturn } from './useLearningGamification'
export { useStrandContent, formatCacheAge, clearStrandContentCache } from './useStrandContent'
export type { UseStrandContentOptions, UseStrandContentReturn } from './useStrandContent'
export { usePullToRefresh, PullToRefreshIndicator } from './usePullToRefresh'
export type { PullToRefreshOptions, PullToRefreshState, UsePullToRefreshReturn, PullToRefreshIndicatorProps } from './usePullToRefresh'
export { useCachePreload, CachePreloadProvider, useCachePreloadContext } from './useCachePreload'
export type { PreloadStatus, PreloadState, PreloadedStrand, CachePreloadOptions, UseCachePreloadReturn } from './useCachePreload'

// Analytics & Evolution
export { useEvolutionData } from './useEvolutionData'
export type { ZoomLevel, EvolutionEvent, TimeframePeriod, EvolutionData } from './useEvolutionData'
export { useLifecycleData, useLifecycleStats, useLifecycleStage, useResurfaceSuggestions } from './useLifecycleData'
export type { UseLifecycleDataOptions, UseLifecycleDataReturn } from './useLifecycleData'
export { useJourneyData } from './useJourneyData'
export type { JourneyData, UseJourneyDataReturn } from './useJourneyData'

// Audit Log & Undo/Redo
export { useAuditLog } from './useAuditLog'
export { useUndoRedo } from './useUndoRedo'
