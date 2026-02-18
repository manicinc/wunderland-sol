/**
 * Tests for Reflect Types
 * @module __tests__/unit/reflect/types.test
 */

import { describe, it, expect, vi } from 'vitest'
import {
  getReflectionTimeOfDay,
  MOOD_VALUES,
  MOOD_EMOJIS,
  WEATHER_EMOJIS,
  REFLECTIONS_WEAVE,
  type Reflection,
  type ReflectionMetadata,
  type RelationshipTag,
  type LocationTag,
  type WeatherCondition,
  type CalendarDayMarker,
  type ReflectionStreak,
} from '@/lib/reflect/types'

describe('getReflectionTimeOfDay', () => {
  it('returns morning for hours 5-11', () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2024-12-27T08:00:00'))
    expect(getReflectionTimeOfDay()).toBe('morning')

    vi.setSystemTime(new Date('2024-12-27T05:00:00'))
    expect(getReflectionTimeOfDay()).toBe('morning')

    vi.setSystemTime(new Date('2024-12-27T11:59:00'))
    expect(getReflectionTimeOfDay()).toBe('morning')

    vi.useRealTimers()
  })

  it('returns afternoon for hours 12-16', () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2024-12-27T12:00:00'))
    expect(getReflectionTimeOfDay()).toBe('afternoon')

    vi.setSystemTime(new Date('2024-12-27T16:59:00'))
    expect(getReflectionTimeOfDay()).toBe('afternoon')

    vi.useRealTimers()
  })

  it('returns evening for hours 17-20', () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2024-12-27T17:00:00'))
    expect(getReflectionTimeOfDay()).toBe('evening')

    vi.setSystemTime(new Date('2024-12-27T20:59:00'))
    expect(getReflectionTimeOfDay()).toBe('evening')

    vi.useRealTimers()
  })

  it('returns night for hours 21-4', () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2024-12-27T21:00:00'))
    expect(getReflectionTimeOfDay()).toBe('night')

    vi.setSystemTime(new Date('2024-12-27T02:00:00'))
    expect(getReflectionTimeOfDay()).toBe('night')

    vi.useRealTimers()
  })
})

describe('Constants', () => {
  describe('MOOD_VALUES', () => {
    it('has values for all moods', () => {
      expect(MOOD_VALUES.focused).toBe(4)
      expect(MOOD_VALUES.creative).toBe(5)
      expect(MOOD_VALUES.curious).toBe(4)
      expect(MOOD_VALUES.relaxed).toBe(3)
      expect(MOOD_VALUES.energetic).toBe(5)
      expect(MOOD_VALUES.reflective).toBe(3)
    })

    it('all values are between 1 and 5', () => {
      Object.values(MOOD_VALUES).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(1)
        expect(value).toBeLessThanOrEqual(5)
      })
    })
  })

  describe('MOOD_EMOJIS', () => {
    it('has emoji for each mood', () => {
      expect(MOOD_EMOJIS.focused).toBe('🎯')
      expect(MOOD_EMOJIS.creative).toBe('🎨')
      expect(MOOD_EMOJIS.curious).toBe('🔍')
      expect(MOOD_EMOJIS.relaxed).toBe('😌')
      expect(MOOD_EMOJIS.energetic).toBe('⚡')
      expect(MOOD_EMOJIS.reflective).toBe('💭')
    })
  })

  describe('WEATHER_EMOJIS', () => {
    it('has emoji for each weather type', () => {
      expect(WEATHER_EMOJIS.sunny).toBe('☀️')
      expect(WEATHER_EMOJIS.cloudy).toBe('☁️')
      expect(WEATHER_EMOJIS.rainy).toBe('🌧️')
      expect(WEATHER_EMOJIS.snowy).toBe('❄️')
      expect(WEATHER_EMOJIS.stormy).toBe('⛈️')
      expect(WEATHER_EMOJIS.foggy).toBe('🌫️')
      expect(WEATHER_EMOJIS.windy).toBe('💨')
      expect(WEATHER_EMOJIS.clear).toBe('🌙')
    })
  })

  describe('REFLECTIONS_WEAVE', () => {
    it('has correct value', () => {
      expect(REFLECTIONS_WEAVE).toBe('reflections')
    })
  })
})

describe('Type structures', () => {
  describe('Reflection', () => {
    it('has required fields', () => {
      const reflection: Reflection = {
        date: '2024-12-27',
        strandPath: 'weaves/reflections/2024-12-27',
        title: 'December 27, 2024',
        metadata: {},
        createdAt: '2024-12-27T10:00:00Z',
        updatedAt: '2024-12-27T10:00:00Z',
      }

      expect(reflection.date).toBe('2024-12-27')
      expect(reflection.strandPath).toContain('reflections')
      expect(reflection.metadata).toEqual({})
    })

    it('can have optional wordCount', () => {
      const reflection: Reflection = {
        date: '2024-12-27',
        strandPath: 'weaves/reflections/2024-12-27',
        title: 'December 27, 2024',
        metadata: {},
        createdAt: '2024-12-27T10:00:00Z',
        updatedAt: '2024-12-27T10:00:00Z',
        wordCount: 500,
      }

      expect(reflection.wordCount).toBe(500)
    })
  })

  describe('ReflectionMetadata', () => {
    it('can have mood and sleep', () => {
      const metadata: ReflectionMetadata = {
        mood: 'focused',
        moodSetAt: '2024-12-27T08:00:00Z',
        sleepHours: '7-8',
        sleepSetAt: '2024-12-27T08:00:00Z',
      }

      expect(metadata.mood).toBe('focused')
      expect(metadata.sleepHours).toBe('7-8')
    })

    it('can have people tags', () => {
      const metadata: ReflectionMetadata = {
        people: [
          { handle: '@mom', name: 'Mom', category: 'family' },
          { handle: '@john', category: 'friend' },
        ],
      }

      expect(metadata.people).toHaveLength(2)
      expect(metadata.people![0].category).toBe('family')
    })

    it('can have gratitude items', () => {
      const metadata: ReflectionMetadata = {
        gratitude: ['Family', 'Health', 'Good weather'],
      }

      expect(metadata.gratitude).toHaveLength(3)
    })
  })

  describe('RelationshipTag', () => {
    it('has required handle', () => {
      const tag: RelationshipTag = {
        handle: '@mom',
      }

      expect(tag.handle).toBe('@mom')
    })

    it('can have optional fields', () => {
      const tag: RelationshipTag = {
        handle: '@john',
        name: 'John Doe',
        category: 'colleague',
        notes: 'Works on the backend team',
      }

      expect(tag.name).toBe('John Doe')
      expect(tag.category).toBe('colleague')
    })
  })

  describe('LocationTag', () => {
    it('has required name', () => {
      const location: LocationTag = {
        name: 'Coffee Shop',
      }

      expect(location.name).toBe('Coffee Shop')
    })

    it('can have coordinates', () => {
      const location: LocationTag = {
        name: 'Home',
        city: 'San Francisco',
        country: 'USA',
        coordinates: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
        type: 'home',
      }

      expect(location.coordinates?.latitude).toBe(37.7749)
      expect(location.type).toBe('home')
    })
  })

  describe('WeatherCondition', () => {
    it('has required type', () => {
      const weather: WeatherCondition = {
        type: 'sunny',
      }

      expect(weather.type).toBe('sunny')
    })

    it('can have temperature and description', () => {
      const weather: WeatherCondition = {
        type: 'cloudy',
        temperature: 18,
        description: 'Overcast with light clouds',
      }

      expect(weather.temperature).toBe(18)
      expect(weather.description).toContain('Overcast')
    })
  })

  describe('CalendarDayMarker', () => {
    it('has required fields', () => {
      const marker: CalendarDayMarker = {
        date: '2024-12-27',
        hasReflection: true,
      }

      expect(marker.date).toBe('2024-12-27')
      expect(marker.hasReflection).toBe(true)
    })

    it('can have mood and wordCount', () => {
      const marker: CalendarDayMarker = {
        date: '2024-12-27',
        hasReflection: true,
        mood: 'creative',
        wordCount: 350,
      }

      expect(marker.mood).toBe('creative')
      expect(marker.wordCount).toBe(350)
    })
  })

  describe('ReflectionStreak', () => {
    it('has all streak fields', () => {
      const streak: ReflectionStreak = {
        current: 5,
        longest: 30,
        thisWeek: 4,
        thisMonth: 15,
        total: 100,
      }

      expect(streak.current).toBe(5)
      expect(streak.longest).toBe(30)
      expect(streak.thisWeek).toBe(4)
      expect(streak.thisMonth).toBe(15)
      expect(streak.total).toBe(100)
    })
  })
})
