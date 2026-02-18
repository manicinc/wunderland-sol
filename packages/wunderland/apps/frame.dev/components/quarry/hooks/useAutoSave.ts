/**
 * Auto-Save Hook with Real-time NLP Analysis
 * @module codex/hooks/useAutoSave
 * 
 * Provides:
 * - Auto-save to localStorage with debouncing
 * - Real-time NLP analysis with progress tracking
 * - Draft management
 * - Offline support
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { extractEntities, extractKeywords, generateSummary, suggestTags } from '@/lib/nlp'

const DRAFT_STORAGE_PREFIX = 'codex-draft-'
const DEBOUNCE_MS = 1500
const NLP_DEBOUNCE_MS = 2000

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline'
export type NLPStatus = 'idle' | 'analyzing' | 'complete' | 'error'

export interface ExtractedMetadata {
  title?: string
  summary?: string
  tags: string[]
  topics: string[]
  subjects: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  entities: {
    technologies: string[]
    concepts: string[]
    people: string[]
    organizations: string[]
    locations: string[]
    [key: string]: string[]
  }
  keywords: string[]
  wordCount: number
  readingTime: number
}

export interface Draft {
  id: string
  content: string
  fileName: string
  targetPath: string
  metadata?: ExtractedMetadata
  createdAt: string
  updatedAt: string
}

export interface UseAutoSaveOptions {
  /** Draft ID (filename-based) */
  draftId: string
  /** Initial content */
  initialContent?: string
  /** Initial file name */
  initialFileName?: string
  /** Initial target path */
  initialTargetPath?: string
  /** Callback on content change */
  onChange?: (content: string, metadata: ExtractedMetadata | null) => void
  /** Auto-analyze with NLP */
  enableNLP?: boolean
  /** Callback to show publish reminder after local save (for GitHub backend) */
  onLocalSaveComplete?: () => void
}

export interface UseAutoSaveReturn {
  /** Current content */
  content: string
  /** Set content */
  setContent: (content: string) => void
  /** Current file name */
  fileName: string
  /** Set file name */
  setFileName: (name: string) => void
  /** Target path */
  targetPath: string
  /** Set target path */
  setTargetPath: (path: string) => void
  /** Save status */
  saveStatus: SaveStatus
  /** Last saved time */
  lastSaved: Date | null
  /** NLP analysis status */
  nlpStatus: NLPStatus
  /** NLP progress (0-100) */
  nlpProgress: number
  /** NLP tasks progress */
  nlpTasks: { done: number; total: number }
  /** Extracted metadata */
  metadata: ExtractedMetadata | null
  /** Force save now */
  forceSave: () => void
  /** Clear draft */
  clearDraft: () => void
  /** List all drafts */
  listDrafts: () => Draft[]
  /** Load a specific draft */
  loadDraft: (id: string) => boolean
  /** Is online */
  isOnline: boolean
}

function inferDifficulty(content: string): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  const lower = content.toLowerCase()
  const expertTerms = ['optimization', 'algorithm', 'architecture', 'internal', 'advanced', 'expert']
  const advancedTerms = ['complex', 'pattern', 'best practice', 'performance', 'scale']
  const beginnerTerms = ['introduction', 'getting started', 'basic', 'simple', 'tutorial', 'beginner']
  
  let score = 0
  expertTerms.forEach(t => { if (lower.includes(t)) score += 2 })
  advancedTerms.forEach(t => { if (lower.includes(t)) score += 1 })
  beginnerTerms.forEach(t => { if (lower.includes(t)) score -= 1 })
  
  if (score >= 4) return 'expert'
  if (score >= 2) return 'advanced'
  if (score <= -1) return 'beginner'
  return 'intermediate'
}

export function useAutoSave({
  draftId,
  initialContent = '',
  initialFileName = 'new-strand.md',
  initialTargetPath = 'weaves/',
  onChange,
  enableNLP = true,
  onLocalSaveComplete,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  // State
  const [content, setContentState] = useState(initialContent)
  const [fileName, setFileName] = useState(initialFileName)
  const [targetPath, setTargetPath] = useState(initialTargetPath)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [nlpStatus, setNlpStatus] = useState<NLPStatus>('idle')
  const [nlpProgress, setNlpProgress] = useState(0)
  const [nlpTasks, setNlpTasks] = useState({ done: 0, total: 4 })
  const [metadata, setMetadata] = useState<ExtractedMetadata | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  
  // Refs for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const nlpTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const contentRef = useRef(content)

  // Keep content ref updated
  useEffect(() => {
    contentRef.current = content
  }, [content])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load existing draft on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_PREFIX + draftId)
      if (stored) {
        const draft: Draft = JSON.parse(stored)
        setContentState(draft.content)
        setFileName(draft.fileName)
        setTargetPath(draft.targetPath)
        if (draft.metadata) setMetadata(draft.metadata)
        setLastSaved(new Date(draft.updatedAt))
        setSaveStatus('saved')
      }
    } catch (err) {
      console.warn('[useAutoSave] Failed to load draft:', err)
    }
  }, [draftId])

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    if (!contentRef.current) return

    setSaveStatus('saving')

    try {
      const draft: Draft = {
        id: draftId,
        content: contentRef.current,
        fileName,
        targetPath,
        metadata: metadata || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      localStorage.setItem(DRAFT_STORAGE_PREFIX + draftId, JSON.stringify(draft))
      setLastSaved(new Date())
      setSaveStatus(isOnline ? 'saved' : 'offline')

      // Notify caller that local save completed (for publish reminder)
      onLocalSaveComplete?.()
    } catch (err) {
      console.error('[useAutoSave] Save failed:', err)
      setSaveStatus('error')
    }
  }, [draftId, fileName, targetPath, metadata, isOnline, onLocalSaveComplete])

  // Analyze content with NLP
  const analyzeContent = useCallback(async (text: string) => {
    if (!text || text.length < 50) {
      setMetadata(null)
      setNlpStatus('idle')
      return
    }
    
    setNlpStatus('analyzing')
    setNlpProgress(0)
    setNlpTasks({ done: 0, total: 4 })
    
    try {
      // Step 1: Extract title
      const titleMatch = text.match(/^#\s+(.+)$/m) || text.match(/^(.{1,60})/m)
      const title = titleMatch ? titleMatch[1].trim() : undefined
      setNlpProgress(25)
      setNlpTasks({ done: 1, total: 4 })
      
      // Small delay for visual feedback
      await new Promise(r => setTimeout(r, 100))
      
      // Step 2: Extract entities
      const entities = extractEntities(text)
      setNlpProgress(50)
      setNlpTasks({ done: 2, total: 4 })
      
      await new Promise(r => setTimeout(r, 100))
      
      // Step 3: Extract keywords and tags
      const keywordResults = extractKeywords(text)
      const suggestedTagsList = suggestTags(text)
      setNlpProgress(75)
      setNlpTasks({ done: 3, total: 4 })
      
      await new Promise(r => setTimeout(r, 100))
      
      // Step 4: Generate summary and finalize
      const summary = generateSummary(text)
      const difficulty = inferDifficulty(text)
      
      const wordCount = text.split(/\s+/).filter(w => w.length > 0).length
      const readingTime = Math.ceil(wordCount / 200)
      
      // Infer topics
      const topics: string[] = []
      if (text.toLowerCase().includes('tutorial') || text.toLowerCase().includes('guide')) {
        topics.push('tutorial')
      }
      if (text.toLowerCase().includes('api') || text.toLowerCase().includes('endpoint')) {
        topics.push('api-reference')
      }
      if (text.toLowerCase().includes('architecture') || text.toLowerCase().includes('design')) {
        topics.push('architecture')
      }
      
      // Infer subjects
      const subjects: string[] = []
      if (entities.technologies.length > 0) subjects.push('technology')
      if (text.toLowerCase().includes('ai') || text.toLowerCase().includes('machine learning')) {
        subjects.push('artificial-intelligence')
      }
      
      const keywordStrings = keywordResults.map(k => k.word)
      
      const newMetadata: ExtractedMetadata = {
        title,
        summary,
        tags: [...new Set([...suggestedTagsList.slice(0, 5), ...keywordStrings.slice(0, 3)])],
        topics,
        subjects,
        difficulty,
        entities,
        keywords: keywordStrings,
        wordCount,
        readingTime,
      }
      
      setMetadata(newMetadata)
      setNlpProgress(100)
      setNlpTasks({ done: 4, total: 4 })
      setNlpStatus('complete')
      
      onChange?.(text, newMetadata)
      
    } catch (err) {
      console.error('[useAutoSave] NLP analysis failed:', err)
      setNlpStatus('error')
    }
  }, [onChange])

  // Set content with debounced save and NLP
  const setContent = useCallback((newContent: string) => {
    setContentState(newContent)
    setSaveStatus('idle')
    
    // Debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft()
    }, DEBOUNCE_MS)
    
    // Debounced NLP analysis
    if (enableNLP) {
      if (nlpTimeoutRef.current) {
        clearTimeout(nlpTimeoutRef.current)
      }
      nlpTimeoutRef.current = setTimeout(() => {
        analyzeContent(newContent)
      }, NLP_DEBOUNCE_MS)
    }
  }, [saveDraft, analyzeContent, enableNLP])

  // Force save
  const forceSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveDraft()
  }, [saveDraft])

  // Clear draft
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_PREFIX + draftId)
      setContentState('')
      setMetadata(null)
      setLastSaved(null)
      setSaveStatus('idle')
    } catch (err) {
      console.error('[useAutoSave] Clear failed:', err)
    }
  }, [draftId])

  // List all drafts
  const listDrafts = useCallback((): Draft[] => {
    const drafts: Draft[] = []
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(DRAFT_STORAGE_PREFIX)) {
          const stored = localStorage.getItem(key)
          if (stored) {
            drafts.push(JSON.parse(stored))
          }
        }
      }
    } catch (err) {
      console.error('[useAutoSave] List failed:', err)
    }
    return drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [])

  // Load a specific draft
  const loadDraft = useCallback((id: string): boolean => {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_PREFIX + id)
      if (stored) {
        const draft: Draft = JSON.parse(stored)
        setContentState(draft.content)
        setFileName(draft.fileName)
        setTargetPath(draft.targetPath)
        if (draft.metadata) setMetadata(draft.metadata)
        setLastSaved(new Date(draft.updatedAt))
        return true
      }
    } catch (err) {
      console.error('[useAutoSave] Load failed:', err)
    }
    return false
  }, [])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (nlpTimeoutRef.current) clearTimeout(nlpTimeoutRef.current)
    }
  }, [])

  return {
    content,
    setContent,
    fileName,
    setFileName,
    targetPath,
    setTargetPath,
    saveStatus,
    lastSaved,
    nlpStatus,
    nlpProgress,
    nlpTasks,
    metadata,
    forceSave,
    clearDraft,
    listDrafts,
    loadDraft,
    isOnline,
  }
}

export default useAutoSave
