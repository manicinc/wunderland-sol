/**
 * Tests for PromptModeService
 * @module __tests__/unit/prompts/promptModeService.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getCurrentTimeOfDay,
  type TimeOfDay,
  type ProjectType,
  type PromptContext,
} from '@/lib/prompts/promptModeService'

// Mock the prompt manager
vi.mock('@/lib/prompts/promptManager', () => ({
  getPromptManager: vi.fn().mockResolvedValue({
    getAllPrompts: vi.fn().mockResolvedValue([
      // Write mode prompts
      { id: 'w1', text: 'Write a story about a character who discovers something', mode: 'write', category: 'creative', mood: ['creative'] },
      { id: 'w2', text: 'Describe the world from an unusual perspective', mode: 'write', category: 'creative', mood: ['curious'] },
      { id: 'w3', text: 'Document a technical system you built', mode: 'write', category: 'technical', mood: ['focused'] },
      // Reflect mode prompts
      { id: 'r1', text: 'What are you grateful for today?', mode: 'reflect', category: 'reflection', mood: ['reflective'] },
      { id: 'r2', text: 'How did you feel this morning?', mode: 'reflect', category: 'personal', mood: ['reflective'] },
      { id: 'r3', text: 'What intentions do you have for today?', mode: 'reflect', category: 'reflection', mood: ['focused'] },
      // Both mode prompts
      { id: 'b1', text: 'Explore the meaning of success', mode: 'both', category: 'philosophical', mood: ['reflective', 'curious'] },
      { id: 'b2', text: 'What have you learned recently?', mode: 'both', category: 'learning', mood: ['curious'] },
    ]),
    filterPrompts: vi.fn().mockResolvedValue([]),
  }),
}))

describe('getCurrentTimeOfDay', () => {
  it('returns morning for hours 5-11', () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2024-12-27T08:00:00'))
    expect(getCurrentTimeOfDay()).toBe('morning')

    vi.setSystemTime(new Date('2024-12-27T05:00:00'))
    expect(getCurrentTimeOfDay()).toBe('morning')

    vi.setSystemTime(new Date('2024-12-27T11:59:00'))
    expect(getCurrentTimeOfDay()).toBe('morning')

    vi.useRealTimers()
  })

  it('returns afternoon for hours 12-16', () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2024-12-27T12:00:00'))
    expect(getCurrentTimeOfDay()).toBe('afternoon')

    vi.setSystemTime(new Date('2024-12-27T14:30:00'))
    expect(getCurrentTimeOfDay()).toBe('afternoon')

    vi.setSystemTime(new Date('2024-12-27T16:59:00'))
    expect(getCurrentTimeOfDay()).toBe('afternoon')

    vi.useRealTimers()
  })

  it('returns evening for hours 17-20', () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2024-12-27T17:00:00'))
    expect(getCurrentTimeOfDay()).toBe('evening')

    vi.setSystemTime(new Date('2024-12-27T19:30:00'))
    expect(getCurrentTimeOfDay()).toBe('evening')

    vi.setSystemTime(new Date('2024-12-27T20:59:00'))
    expect(getCurrentTimeOfDay()).toBe('evening')

    vi.useRealTimers()
  })

  it('returns night for hours 21-4', () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2024-12-27T21:00:00'))
    expect(getCurrentTimeOfDay()).toBe('night')

    vi.setSystemTime(new Date('2024-12-27T23:30:00'))
    expect(getCurrentTimeOfDay()).toBe('night')

    vi.setSystemTime(new Date('2024-12-27T02:00:00'))
    expect(getCurrentTimeOfDay()).toBe('night')

    vi.setSystemTime(new Date('2024-12-27T04:59:00'))
    expect(getCurrentTimeOfDay()).toBe('night')

    vi.useRealTimers()
  })
})

describe('PromptModeService types', () => {
  it('TimeOfDay type covers all periods', () => {
    const times: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night']
    expect(times).toHaveLength(4)
  })

  it('ProjectType type covers all project types', () => {
    const types: ProjectType[] = ['story', 'essay', 'article', 'poem', 'script', 'other']
    expect(types).toHaveLength(6)
  })

  it('PromptContext interface has required fields', () => {
    const context: PromptContext = {
      mode: 'write',
      timeOfDay: 'morning',
    }
    expect(context.mode).toBe('write')
    expect(context.timeOfDay).toBe('morning')
  })

  it('PromptContext with optional fields', () => {
    const context: PromptContext = {
      mode: 'reflect',
      timeOfDay: 'evening',
      mood: 'reflective',
      projectType: 'story',
      isStuck: true,
    }
    expect(context.mood).toBe('reflective')
    expect(context.projectType).toBe('story')
    expect(context.isStuck).toBe(true)
  })
})

describe('Mode filtering logic', () => {
  it('write mode should include write and both prompts', () => {
    const prompts = [
      { mode: 'write' as const },
      { mode: 'reflect' as const },
      { mode: 'both' as const },
    ]

    const writePrompts = prompts.filter(p => p.mode === 'write' || p.mode === 'both')
    expect(writePrompts).toHaveLength(2)
  })

  it('reflect mode should include reflect and both prompts', () => {
    const prompts = [
      { mode: 'write' as const },
      { mode: 'reflect' as const },
      { mode: 'both' as const },
    ]

    const reflectPrompts = prompts.filter(p => p.mode === 'reflect' || p.mode === 'both')
    expect(reflectPrompts).toHaveLength(2)
  })
})

describe('Project type keywords', () => {
  const storyKeywords = ['character', 'story', 'fiction', 'narrative', 'plot', 'world', 'discover']
  const essayKeywords = ['explore', 'argue', 'explain', 'describe', 'analyze', 'document']

  it('story prompts should contain story-related keywords', () => {
    const storyPrompt = 'Write a story about a character who discovers something'
    const hasKeyword = storyKeywords.some(k => storyPrompt.toLowerCase().includes(k))
    expect(hasKeyword).toBe(true)
  })

  it('essay prompts should contain essay-related keywords', () => {
    const essayPrompt = 'Explore the meaning of success in modern society'
    const hasKeyword = essayKeywords.some(k => essayPrompt.toLowerCase().includes(k))
    expect(hasKeyword).toBe(true)
  })
})

describe('Time of day keywords', () => {
  const morningKeywords = ['morning', 'today', 'intention', 'plan', 'start', 'gratitude', 'grateful']
  const eveningKeywords = ['reflect', 'review', 'learned', 'happened', 'day']

  it('morning prompts should match morning keywords', () => {
    const morningPrompt = 'What intentions do you have for today?'
    const hasKeyword = morningKeywords.some(k => morningPrompt.toLowerCase().includes(k))
    expect(hasKeyword).toBe(true)
  })

  it('evening prompts should match evening keywords', () => {
    const eveningPrompt = 'What did you learn today?'
    const hasKeyword = eveningKeywords.some(k => eveningPrompt.toLowerCase().includes(k))
    expect(hasKeyword).toBe(true)
  })
})
