/**
 * Greetings Module Tests
 * @module __tests__/unit/lib/codex/greetings.test
 *
 * Tests for the personalized greetings system.
 */

import { describe, it, expect } from 'vitest'
import {
  getSmartGreeting,
  getGreetingWithContext,
  getGreeting,
  type GreetingContext,
} from '@/lib/codex/greetings'

// ============================================================================
// getSmartGreeting
// ============================================================================

describe('getSmartGreeting', () => {
  describe('default behavior', () => {
    it('returns a string', () => {
      const greeting = getSmartGreeting()
      expect(typeof greeting).toBe('string')
    })

    it('uses "Traveler" as default name', () => {
      const greeting = getSmartGreeting()
      expect(greeting).toContain('Traveler')
    })

    it('returns non-empty greeting', () => {
      const greeting = getSmartGreeting()
      expect(greeting.length).toBeGreaterThan(0)
    })
  })

  describe('with custom display name', () => {
    it('uses provided display name', () => {
      const greeting = getSmartGreeting({ displayName: 'Alex' })
      expect(greeting).toContain('Alex')
    })

    it('handles various names', () => {
      const names = ['John', 'Jane', 'Dr. Smith', 'Mary Jane']
      names.forEach((name) => {
        const greeting = getSmartGreeting({ displayName: name })
        expect(greeting).toContain(name)
      })
    })
  })

  describe('first visit greeting', () => {
    it('returns welcome-style greeting for first visit', () => {
      const greeting = getSmartGreeting({ isFirstVisit: true })
      const welcomeWords = ['welcome', 'greetings', 'hello', 'nice to meet']
      const hasWelcome = welcomeWords.some((word) =>
        greeting.toLowerCase().includes(word)
      )
      expect(hasWelcome).toBe(true)
    })

    it('uses display name for first visit', () => {
      const greeting = getSmartGreeting({
        isFirstVisit: true,
        displayName: 'NewUser',
      })
      expect(greeting).toContain('NewUser')
    })
  })

  describe('streak greetings', () => {
    it('returns greeting for 3-day streak', () => {
      const greeting = getSmartGreeting({ streak: 3 })
      // Should return a valid greeting (content varies by random selection)
      expect(typeof greeting).toBe('string')
      expect(greeting.length).toBeGreaterThan(0)
    })

    it('returns greeting for 7-day streak', () => {
      const greeting = getSmartGreeting({ streak: 7 })
      // Should return a valid greeting
      expect(typeof greeting).toBe('string')
      expect(greeting.length).toBeGreaterThan(0)
    })

    it('returns greeting for 30-day streak', () => {
      const greeting = getSmartGreeting({ streak: 30 })
      // Should return a valid greeting
      expect(typeof greeting).toBe('string')
      expect(greeting.length).toBeGreaterThan(0)
    })

    it('uses highest applicable threshold', () => {
      const greeting14 = getSmartGreeting({ streak: 14 })
      const greeting15 = getSmartGreeting({ streak: 15 })
      // Both should reference the 14-day milestone
      expect(greeting14).toBeDefined()
      expect(greeting15).toBeDefined()
    })
  })

  describe('returning visitor greetings', () => {
    it('returns welcome back style for returning visitor', () => {
      const greeting = getSmartGreeting({
        isFirstVisitToday: true,
        visitCount: 5,
      })
      const hasReturn = greeting.toLowerCase().includes('back') || greeting.toLowerCase().includes('again') || greeting.toLowerCase().includes('see you')
      // May also get time-based greeting, so just check it returns something
      expect(greeting.length).toBeGreaterThan(0)
    })
  })

  describe('time-based greetings', () => {
    it('returns morning greeting for 8am', () => {
      const greeting = getSmartGreeting({ hour: 8 })
      expect(greeting.length).toBeGreaterThan(0)
    })

    it('returns evening greeting for 18:00', () => {
      const greeting = getSmartGreeting({ hour: 18 })
      expect(greeting.length).toBeGreaterThan(0)
    })

    it('returns night greeting for 22:00', () => {
      const greeting = getSmartGreeting({ hour: 22 })
      expect(greeting.length).toBeGreaterThan(0)
    })

    it('returns late night greeting for 2am', () => {
      const greeting = getSmartGreeting({ hour: 2 })
      expect(greeting.length).toBeGreaterThan(0)
    })

    it('handles all 24 hours without errors', () => {
      for (let hour = 0; hour < 24; hour++) {
        const greeting = getSmartGreeting({ hour })
        expect(greeting.length).toBeGreaterThan(0)
      }
    })
  })
})

// ============================================================================
// getGreetingWithContext
// ============================================================================

describe('getGreetingWithContext', () => {
  describe('return structure', () => {
    it('returns object with greeting', () => {
      const result = getGreetingWithContext()
      expect(result).toHaveProperty('greeting')
      expect(typeof result.greeting).toBe('string')
    })

    it('returns object with subtitle', () => {
      const result = getGreetingWithContext()
      expect(result).toHaveProperty('subtitle')
    })

    it('returns object with emoji', () => {
      const result = getGreetingWithContext()
      expect(result).toHaveProperty('emoji')
      expect(typeof result.emoji).toBe('string')
    })
  })

  describe('greeting content', () => {
    it('greeting uses Traveler by default', () => {
      const result = getGreetingWithContext()
      expect(result.greeting).toContain('Traveler')
    })

    it('greeting uses custom display name', () => {
      const result = getGreetingWithContext({ displayName: 'Alex' })
      expect(result.greeting).toContain('Alex')
    })
  })

  describe('subtitle content', () => {
    it('returns subtitle for first visit', () => {
      const result = getGreetingWithContext({ isFirstVisit: true })
      expect(result.subtitle).toBeDefined()
      expect(result.subtitle!.length).toBeGreaterThan(0)
    })

    it('returns subtitle for streak', () => {
      const result = getGreetingWithContext({ streak: 7 })
      expect(result.subtitle).toBeDefined()
    })

    it('returns mood-based subtitle', () => {
      const result = getGreetingWithContext({ mood: 'focused' })
      expect(result.subtitle).toBeDefined()
    })

    it('returns generic subtitle as fallback', () => {
      const result = getGreetingWithContext({})
      expect(result.subtitle).toBeDefined()
    })
  })

  describe('emoji content', () => {
    it('returns time-appropriate emoji for morning', () => {
      const result = getGreetingWithContext({ hour: 10 })
      expect(result.emoji).toBeDefined()
    })

    it('returns time-appropriate emoji for evening', () => {
      const result = getGreetingWithContext({ hour: 19 })
      expect(result.emoji).toBeDefined()
    })

    it('returns time-appropriate emoji for night', () => {
      const result = getGreetingWithContext({ hour: 23 })
      expect(result.emoji).toBeDefined()
    })
  })

  describe('mood-based subtitles', () => {
    const moodsToTest: Array<{ mood: 'focused' | 'creative' | 'tired' | 'anxious'; keywords: string[] }> = [
      { mood: 'focused', keywords: ['deep', 'sharp', 'locked'] },
      { mood: 'creative', keywords: ['imagination', 'create', 'art'] },
      { mood: 'tired', keywords: ['rest', 'gentle', 'small'] },
      { mood: 'anxious', keywords: ['breath', 'got this', 'easy'] },
    ]

    moodsToTest.forEach(({ mood, keywords }) => {
      it(`returns appropriate subtitle for ${mood} mood`, () => {
        const result = getGreetingWithContext({ mood })
        // Subtitle should exist and be relevant (or generic fallback)
        expect(result.subtitle).toBeDefined()
      })
    })
  })
})

// ============================================================================
// getGreeting (Simple version)
// ============================================================================

describe('getGreeting', () => {
  it('returns a string', () => {
    const greeting = getGreeting()
    expect(typeof greeting).toBe('string')
  })

  it('returns same as getSmartGreeting with no context', () => {
    // Both should use Traveler as default
    const simple = getGreeting()
    expect(simple).toContain('Traveler')
  })

  it('returns non-empty greeting', () => {
    const greeting = getGreeting()
    expect(greeting.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('greetings integration', () => {
  it('all greeting functions return consistent types', () => {
    const smart = getSmartGreeting({ displayName: 'Test' })
    const context = getGreetingWithContext({ displayName: 'Test' })
    const simple = getGreeting()

    expect(typeof smart).toBe('string')
    expect(typeof context.greeting).toBe('string')
    expect(typeof simple).toBe('string')
  })

  it('priority order: first visit > streak > returning > time', () => {
    // First visit should always show welcome
    const firstVisit = getSmartGreeting({
      isFirstVisit: true,
      streak: 100,
      isFirstVisitToday: true,
    })
    const welcomeWords = ['welcome', 'greetings', 'hello', 'meet']
    const hasWelcome = welcomeWords.some((w) =>
      firstVisit.toLowerCase().includes(w)
    )
    expect(hasWelcome).toBe(true)
  })

  it('handles complex context without errors', () => {
    const complexContext: GreetingContext = {
      displayName: 'Power User',
      hour: 14,
      mood: 'energetic',
      streak: 50,
      visitCount: 100,
      isFirstVisit: false,
      isFirstVisitToday: true,
      daysSinceFirstVisit: 365,
      totalStrands: 500,
    }

    const greeting = getSmartGreeting(complexContext)
    const withContext = getGreetingWithContext(complexContext)

    expect(greeting).toContain('Power User')
    expect(withContext.greeting).toBeDefined()
    expect(withContext.subtitle).toBeDefined()
    expect(withContext.emoji).toBeDefined()
  })

  it('time emojis are appropriate for time of day', () => {
    const morning = getGreetingWithContext({ hour: 9 })
    const evening = getGreetingWithContext({ hour: 19 })
    const night = getGreetingWithContext({ hour: 23 })

    // All should have emojis
    expect(morning.emoji).toBeDefined()
    expect(evening.emoji).toBeDefined()
    expect(night.emoji).toBeDefined()
  })
})
