/**
 * useLifecycleData Hook Tests
 * @module __tests__/components/quarry/hooks/useLifecycleData.test
 *
 * Tests for the lifecycle data hook behavior, state management, and actions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { StrandLifecycleWithMeta, LifecycleStats, ResurfaceSuggestion, RitualSession } from '@/lib/analytics/lifecycleTypes'

// ============================================================================
// Mock Data
// ============================================================================

const mockStrand = (
  path: string,
  stage: 'fresh' | 'active' | 'faded',
  decayScore: number
): StrandLifecycleWithMeta => ({
  strandPath: path,
  stage,
  decayScore,
  lastAccessedAt: new Date().toISOString(),
  viewCount: 10,
  editCount: 5,
  connectionCount: 3,
  engagementScore: 50,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  title: path.split('/').pop() || path,
  daysSinceAccess: stage === 'fresh' ? 1 : stage === 'active' ? 15 : 40,
  atRisk: stage === 'active' && decayScore < 50,
  suggestResurface: stage === 'faded' && 3 > 0,
})

const mockStats: LifecycleStats = {
  totalStrands: 30,
  byStage: { fresh: 10, active: 15, faded: 5 },
  percentageByStage: { fresh: 33, active: 50, faded: 17 },
  averageDecayScore: 65,
  atRiskCount: 3,
  resurfaceSuggestionCount: 2,
  lastActivityAt: new Date().toISOString(),
}

const mockSuggestion: ResurfaceSuggestion = {
  strand: mockStrand('faded/note.md', 'faded', 20),
  reason: 'Well-connected note',
  relevanceScore: 75,
  connectedTags: ['tag1', 'tag2'],
  connectedStrands: ['other/note.md'],
}

const mockSession: RitualSession = {
  id: 'session-1',
  type: 'morning',
  startedAt: new Date().toISOString(),
  surfacedStrands: [],
  reviewedStrands: [],
  connectionsFormed: [],
}

// ============================================================================
// Mock Store
// ============================================================================

const mockGetAllLifecycles = vi.fn()
const mockGetAtRiskStrands = vi.fn()
const mockGetResurfaceSuggestions = vi.fn()
const mockGetLifecycleStats = vi.fn()
const mockGetLifecycleTimeSeries = vi.fn()
const mockRecalculateAllLifecycles = vi.fn()
const mockResurfaceStrand = vi.fn()
const mockRecordLifecycleEvent = vi.fn()
const mockCreateRitualSession = vi.fn()
const mockCompleteRitualSession = vi.fn()
const mockGetRecentRitualSessions = vi.fn()

vi.mock('@/lib/analytics/lifecycleStore', () => ({
  getAllLifecycles: (...args: unknown[]) => mockGetAllLifecycles(...args),
  getAtRiskStrands: (...args: unknown[]) => mockGetAtRiskStrands(...args),
  getResurfaceSuggestions: (...args: unknown[]) => mockGetResurfaceSuggestions(...args),
  getLifecycleStats: (...args: unknown[]) => mockGetLifecycleStats(...args),
  getLifecycleTimeSeries: (...args: unknown[]) => mockGetLifecycleTimeSeries(...args),
  recalculateAllLifecycles: (...args: unknown[]) => mockRecalculateAllLifecycles(...args),
  resurfaceStrand: (...args: unknown[]) => mockResurfaceStrand(...args),
  recordLifecycleEvent: (...args: unknown[]) => mockRecordLifecycleEvent(...args),
  createRitualSession: (...args: unknown[]) => mockCreateRitualSession(...args),
  completeRitualSession: (...args: unknown[]) => mockCompleteRitualSession(...args),
  getRecentRitualSessions: (...args: unknown[]) => mockGetRecentRitualSessions(...args),
}))

// Import after mocking
import { useLifecycleData } from '@/components/quarry/hooks/useLifecycleData'

// ============================================================================
// Tests
// ============================================================================

describe('useLifecycleData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementations
    mockGetAllLifecycles.mockResolvedValue([
      mockStrand('fresh/note1.md', 'fresh', 95),
      mockStrand('active/note1.md', 'active', 60),
      mockStrand('faded/note1.md', 'faded', 20),
    ])
    mockGetAtRiskStrands.mockResolvedValue([
      mockStrand('active/at-risk.md', 'active', 35),
    ])
    mockGetResurfaceSuggestions.mockResolvedValue([mockSuggestion])
    mockGetLifecycleStats.mockResolvedValue(mockStats)
    mockGetLifecycleTimeSeries.mockResolvedValue([])
    mockGetRecentRitualSessions.mockResolvedValue([])
    mockRecalculateAllLifecycles.mockResolvedValue(5)
    mockResurfaceStrand.mockResolvedValue(mockStrand('resurfaced.md', 'fresh', 100))
    mockRecordLifecycleEvent.mockResolvedValue(null)
    mockCreateRitualSession.mockResolvedValue(mockSession)
    mockCompleteRitualSession.mockResolvedValue({ ...mockSession, completedAt: new Date().toISOString() })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe('Initial State', () => {
    it('starts with loading true when fetchOnMount is true', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      expect(result.current.loading).toBe(true)
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('does not fetch when fetchOnMount is false', async () => {
      renderHook(() => useLifecycleData({ fetchOnMount: false }))
      
      expect(mockGetAllLifecycles).not.toHaveBeenCalled()
    })

    it('fetches all data on mount', async () => {
      renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(mockGetAllLifecycles).toHaveBeenCalled()
        expect(mockGetAtRiskStrands).toHaveBeenCalled()
        expect(mockGetResurfaceSuggestions).toHaveBeenCalled()
        expect(mockGetLifecycleStats).toHaveBeenCalled()
        expect(mockGetLifecycleTimeSeries).toHaveBeenCalled()
        expect(mockGetRecentRitualSessions).toHaveBeenCalled()
      })
    })
  })

  // ==========================================================================
  // Data Grouping Tests
  // ==========================================================================

  describe('Data Grouping', () => {
    it('groups strands by stage', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.freshStrands.every(s => s.stage === 'fresh')).toBe(true)
      expect(result.current.activeStrands.every(s => s.stage === 'active')).toBe(true)
      expect(result.current.fadedStrands.every(s => s.stage === 'faded')).toBe(true)
    })

    it('returns all strands in allStrands', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.allStrands.length).toBe(3)
    })

    it('returns at-risk strands separately', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.atRiskStrands.length).toBe(1)
    })
  })

  // ==========================================================================
  // Refresh Action Tests
  // ==========================================================================

  describe('Refresh Action', () => {
    it('refresh refetches all data', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      vi.clearAllMocks()
      
      await act(async () => {
        await result.current.refresh()
      })
      
      expect(mockGetAllLifecycles).toHaveBeenCalled()
      expect(mockGetLifecycleStats).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Recalculate Action Tests
  // ==========================================================================

  describe('Recalculate Action', () => {
    it('recalculate calls store and refreshes', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      vi.clearAllMocks()
      
      await act(async () => {
        await result.current.recalculate()
      })
      
      expect(mockRecalculateAllLifecycles).toHaveBeenCalled()
      expect(mockGetAllLifecycles).toHaveBeenCalled() // From refresh
    })
  })

  // ==========================================================================
  // Resurface Action Tests
  // ==========================================================================

  describe('Resurface Action', () => {
    it('resurface calls store with strand path', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      await act(async () => {
        await result.current.resurface('faded/note.md')
      })
      
      expect(mockResurfaceStrand).toHaveBeenCalledWith('faded/note.md', expect.any(Object))
    })

    it('resurface refreshes data after', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      vi.clearAllMocks()
      
      await act(async () => {
        await result.current.resurface('faded/note.md')
      })
      
      expect(mockGetAllLifecycles).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Record Event Tests
  // ==========================================================================

  describe('Record Event Action', () => {
    it('recordEvent calls store', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      await act(async () => {
        await result.current.recordEvent('note.md', 'view')
      })
      
      expect(mockRecordLifecycleEvent).toHaveBeenCalledWith(
        'note.md',
        'view',
        undefined,
        expect.any(Object)
      )
    })
  })

  // ==========================================================================
  // Ritual Action Tests
  // ==========================================================================

  describe('Ritual Actions', () => {
    it('startRitual creates session', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      let session: RitualSession | null = null
      await act(async () => {
        session = await result.current.startRitual('morning')
      })
      
      expect(mockCreateRitualSession).toHaveBeenCalledWith('morning')
      expect(session).toBeDefined()
      expect(session?.type).toBe('morning')
    })

    it('startRitual adds session to recentRituals', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      await act(async () => {
        await result.current.startRitual('morning')
      })
      
      expect(result.current.recentRituals.length).toBeGreaterThan(0)
    })

    it('completeRitual calls store and refreshes', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      await act(async () => {
        await result.current.startRitual('morning')
      })
      
      vi.clearAllMocks()
      
      await act(async () => {
        await result.current.completeRitual('session-1', {
          reviewedStrands: ['note1.md', 'note2.md'],
          intentions: ['Focus on project'],
        })
      })
      
      expect(mockCompleteRitualSession).toHaveBeenCalledWith('session-1', {
        reviewedStrands: ['note1.md', 'note2.md'],
        intentions: ['Focus on project'],
      })
      expect(mockGetAllLifecycles).toHaveBeenCalled() // From refresh
    })
  })

  // ==========================================================================
  // Ritual Prompt Data Tests
  // ==========================================================================

  describe('getRitualPromptData', () => {
    it('returns morning ritual data', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const promptData = result.current.getRitualPromptData('morning')
      
      expect(promptData.type).toBe('morning')
      expect(promptData).toHaveProperty('relevantStrands')
      expect(promptData).toHaveProperty('fadingStrands')
      expect(promptData).toHaveProperty('todayStrands')
      expect(promptData).toHaveProperty('suggestedConnections')
    })

    it('returns evening ritual data', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const promptData = result.current.getRitualPromptData('evening')
      
      expect(promptData.type).toBe('evening')
    })

    it('includes fading strands from suggestions', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const promptData = result.current.getRitualPromptData('morning')
      
      // Should include strands from resurface suggestions
      expect(Array.isArray(promptData.fadingStrands)).toBe(true)
    })
  })

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('sets error on fetch failure', async () => {
      mockGetAllLifecycles.mockRejectedValue(new Error('Database error'))
      
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.error).toBe('Database error')
    })

    it('clears error on successful refresh', async () => {
      mockGetAllLifecycles.mockRejectedValueOnce(new Error('Database error'))
      
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.error).toBe('Database error')
      })
      
      mockGetAllLifecycles.mockResolvedValue([])
      
      await act(async () => {
        await result.current.refresh()
      })
      
      expect(result.current.error).toBeNull()
    })
  })

  // ==========================================================================
  // Settings Tests
  // ==========================================================================

  describe('Settings', () => {
    it('passes settings to store functions', async () => {
      const customSettings = {
        freshThresholdDays: 14,
        fadeThresholdDays: 60,
        engagementWeight: 0.5,
        autoResurface: false,
        ritualReminders: false,
        resurfaceLimit: 10,
      }
      
      renderHook(() => useLifecycleData({ settings: customSettings }))
      
      await waitFor(() => {
        expect(mockGetAllLifecycles).toHaveBeenCalledWith(customSettings)
        expect(mockGetLifecycleStats).toHaveBeenCalledWith(customSettings)
      })
    })

    it('exposes settings in return value', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      expect(result.current.settings).toBeDefined()
      expect(result.current.settings.freshThresholdDays).toBeDefined()
      expect(result.current.settings.fadeThresholdDays).toBeDefined()
    })
  })

  // ==========================================================================
  // Stats Tests
  // ==========================================================================

  describe('Stats', () => {
    it('returns lifecycle stats', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.stats).toEqual(mockStats)
    })

    it('stats contains correct counts', async () => {
      const { result } = renderHook(() => useLifecycleData())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.stats?.totalStrands).toBe(30)
      expect(result.current.stats?.byStage.fresh).toBe(10)
      expect(result.current.stats?.atRiskCount).toBe(3)
    })
  })
})

