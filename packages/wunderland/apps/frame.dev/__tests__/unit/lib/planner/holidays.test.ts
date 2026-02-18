/**
 * Holidays Module Tests
 * @module __tests__/unit/lib/planner/holidays.test
 *
 * Tests for holiday utilities and calendar integration.
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_HOLIDAY_SETTINGS,
  COUNTRY_OPTIONS,
  getHolidaysForYear,
  getHolidaysInRange,
  getHolidaysForDate,
  isHoliday,
  getHolidayColor,
  type CountryCode,
  type Holiday,
  type HolidaySettings,
} from '@/lib/planner/holidays'

// ============================================================================
// DEFAULT_HOLIDAY_SETTINGS
// ============================================================================

describe('DEFAULT_HOLIDAY_SETTINGS', () => {
  it('is defined', () => {
    expect(DEFAULT_HOLIDAY_SETTINGS).toBeDefined()
  })

  it('defaults to US country', () => {
    expect(DEFAULT_HOLIDAY_SETTINGS.country).toBe('US')
  })

  it('shows federal holidays by default', () => {
    expect(DEFAULT_HOLIDAY_SETTINGS.showFederal).toBe(true)
  })

  it('shows observances by default', () => {
    expect(DEFAULT_HOLIDAY_SETTINGS.showObservances).toBe(true)
  })

  it('hides religious holidays by default', () => {
    expect(DEFAULT_HOLIDAY_SETTINGS.showReligious).toBe(false)
  })

  it('hides cultural holidays by default', () => {
    expect(DEFAULT_HOLIDAY_SETTINGS.showCultural).toBe(false)
  })

  it('has all required properties', () => {
    expect(DEFAULT_HOLIDAY_SETTINGS).toHaveProperty('country')
    expect(DEFAULT_HOLIDAY_SETTINGS).toHaveProperty('showFederal')
    expect(DEFAULT_HOLIDAY_SETTINGS).toHaveProperty('showObservances')
    expect(DEFAULT_HOLIDAY_SETTINGS).toHaveProperty('showReligious')
    expect(DEFAULT_HOLIDAY_SETTINGS).toHaveProperty('showCultural')
  })
})

// ============================================================================
// COUNTRY_OPTIONS
// ============================================================================

describe('COUNTRY_OPTIONS', () => {
  it('is defined and non-empty', () => {
    expect(COUNTRY_OPTIONS).toBeDefined()
    expect(Array.isArray(COUNTRY_OPTIONS)).toBe(true)
    expect(COUNTRY_OPTIONS.length).toBeGreaterThan(0)
  })

  it('has 10 country options', () => {
    expect(COUNTRY_OPTIONS).toHaveLength(10)
  })

  describe('country option structure', () => {
    COUNTRY_OPTIONS.forEach((option) => {
      describe(`country: ${option.code}`, () => {
        it('has code', () => {
          expect(option.code).toBeDefined()
          expect(typeof option.code).toBe('string')
          expect(option.code.length).toBe(2)
        })

        it('has name', () => {
          expect(option.name).toBeDefined()
          expect(typeof option.name).toBe('string')
          expect(option.name.length).toBeGreaterThan(0)
        })

        it('has flag emoji', () => {
          expect(option.flag).toBeDefined()
          expect(typeof option.flag).toBe('string')
        })
      })
    })
  })

  it('includes common countries', () => {
    const codes = COUNTRY_OPTIONS.map((o) => o.code)
    expect(codes).toContain('US')
    expect(codes).toContain('CA')
    expect(codes).toContain('GB')
    expect(codes).toContain('AU')
    expect(codes).toContain('DE')
    expect(codes).toContain('FR')
  })

  it('all codes are unique', () => {
    const codes = COUNTRY_OPTIONS.map((o) => o.code)
    const uniqueCodes = new Set(codes)
    expect(uniqueCodes.size).toBe(codes.length)
  })
})

// ============================================================================
// getHolidaysForYear
// ============================================================================

describe('getHolidaysForYear', () => {
  describe('US holidays', () => {
    const holidays = getHolidaysForYear(2024, 'US')

    it('returns array of holidays', () => {
      expect(Array.isArray(holidays)).toBe(true)
      expect(holidays.length).toBeGreaterThan(0)
    })

    it('includes New Year Day', () => {
      const newYear = holidays.find((h) => h.name === "New Year's Day")
      expect(newYear).toBeDefined()
      expect(newYear!.date).toBe('2024-01-01')
      expect(newYear!.type).toBe('federal')
    })

    it('includes Independence Day', () => {
      const july4 = holidays.find((h) => h.name === 'Independence Day')
      expect(july4).toBeDefined()
      expect(july4!.date).toBe('2024-07-04')
    })

    it('includes Christmas', () => {
      const christmas = holidays.find((h) => h.name === 'Christmas Day')
      expect(christmas).toBeDefined()
      expect(christmas!.date).toBe('2024-12-25')
    })

    it('includes MLK Day (3rd Monday of January)', () => {
      const mlk = holidays.find((h) => h.name === 'Martin Luther King Jr. Day')
      expect(mlk).toBeDefined()
      expect(mlk!.date).toBe('2024-01-15')
    })

    it('includes Memorial Day (last Monday of May)', () => {
      const memorial = holidays.find((h) => h.name === 'Memorial Day')
      expect(memorial).toBeDefined()
      expect(memorial!.date).toBe('2024-05-27')
    })

    it('includes Labor Day (1st Monday of September)', () => {
      const labor = holidays.find((h) => h.name === 'Labor Day')
      expect(labor).toBeDefined()
      expect(labor!.date).toBe('2024-09-02')
    })

    it('includes Thanksgiving (4th Thursday of November)', () => {
      const thanksgiving = holidays.find((h) => h.name === 'Thanksgiving Day')
      expect(thanksgiving).toBeDefined()
      expect(thanksgiving!.date).toBe('2024-11-28')
    })

    it('includes observances', () => {
      const valentines = holidays.find((h) => h.name === "Valentine's Day")
      expect(valentines).toBeDefined()
      expect(valentines!.type).toBe('observance')
    })

    it('includes Easter (religious)', () => {
      const easter = holidays.find((h) => h.name === 'Easter Sunday')
      expect(easter).toBeDefined()
      expect(easter!.type).toBe('religious')
      expect(easter!.date).toBe('2024-03-31')
    })

    it('all holidays have country set to US', () => {
      holidays.forEach((h) => {
        expect(h.country).toBe('US')
      })
    })
  })

  describe('Canadian holidays', () => {
    const holidays = getHolidaysForYear(2024, 'CA')

    it('returns array of holidays', () => {
      expect(Array.isArray(holidays)).toBe(true)
      expect(holidays.length).toBeGreaterThan(0)
    })

    it('includes Canada Day', () => {
      const canadaDay = holidays.find((h) => h.name === 'Canada Day')
      expect(canadaDay).toBeDefined()
      expect(canadaDay!.date).toBe('2024-07-01')
    })

    it('includes Boxing Day', () => {
      const boxingDay = holidays.find((h) => h.name === 'Boxing Day')
      expect(boxingDay).toBeDefined()
      expect(boxingDay!.date).toBe('2024-12-26')
    })

    it('includes Thanksgiving (2nd Monday of October)', () => {
      const thanksgiving = holidays.find((h) => h.name === 'Thanksgiving')
      expect(thanksgiving).toBeDefined()
      expect(thanksgiving!.date).toBe('2024-10-14')
    })

    it('all holidays have country set to CA', () => {
      holidays.forEach((h) => {
        expect(h.country).toBe('CA')
      })
    })
  })

  describe('UK holidays', () => {
    const holidays = getHolidaysForYear(2024, 'GB')

    it('returns array of holidays', () => {
      expect(Array.isArray(holidays)).toBe(true)
      expect(holidays.length).toBeGreaterThan(0)
    })

    it('includes Boxing Day', () => {
      const boxingDay = holidays.find((h) => h.name === 'Boxing Day')
      expect(boxingDay).toBeDefined()
    })

    it('includes bank holidays', () => {
      const earlyMay = holidays.find((h) => h.name === 'Early May Bank Holiday')
      const springBank = holidays.find((h) => h.name === 'Spring Bank Holiday')
      const summerBank = holidays.find((h) => h.name === 'Summer Bank Holiday')
      expect(earlyMay).toBeDefined()
      expect(springBank).toBeDefined()
      expect(summerBank).toBeDefined()
    })

    it('all holidays have country set to GB', () => {
      holidays.forEach((h) => {
        expect(h.country).toBe('GB')
      })
    })
  })

  describe('different years', () => {
    it('calculates correct Easter for 2023', () => {
      const holidays = getHolidaysForYear(2023, 'US')
      const easter = holidays.find((h) => h.name === 'Easter Sunday')
      expect(easter!.date).toBe('2023-04-09')
    })

    it('calculates correct Easter for 2025', () => {
      const holidays = getHolidaysForYear(2025, 'US')
      const easter = holidays.find((h) => h.name === 'Easter Sunday')
      expect(easter!.date).toBe('2025-04-20')
    })

    it('handles different years for variable holidays', () => {
      const h2023 = getHolidaysForYear(2023, 'US')
      const h2024 = getHolidaysForYear(2024, 'US')

      const mlk2023 = h2023.find((h) => h.name === 'Martin Luther King Jr. Day')
      const mlk2024 = h2024.find((h) => h.name === 'Martin Luther King Jr. Day')

      expect(mlk2023!.date).toBe('2023-01-16')
      expect(mlk2024!.date).toBe('2024-01-15')
    })
  })
})

// ============================================================================
// getHolidaysInRange
// ============================================================================

describe('getHolidaysInRange', () => {
  const settings: HolidaySettings = {
    ...DEFAULT_HOLIDAY_SETTINGS,
    showReligious: true,
    showCultural: true,
  }

  it('returns holidays within date range', () => {
    const start = new Date(2024, 0, 1)
    const end = new Date(2024, 1, 28)
    const holidays = getHolidaysInRange(start, end, settings)

    expect(holidays.length).toBeGreaterThan(0)
    holidays.forEach((h) => {
      expect(h.date >= '2024-01-01').toBe(true)
      expect(h.date <= '2024-02-28').toBe(true)
    })
  })

  it('excludes holidays outside range', () => {
    const start = new Date(2024, 5, 1)
    const end = new Date(2024, 5, 30)
    const holidays = getHolidaysInRange(start, end, settings)

    holidays.forEach((h) => {
      expect(h.date.startsWith('2024-06')).toBe(true)
    })
  })

  it('spans multiple years', () => {
    const start = new Date(2023, 11, 1)
    const end = new Date(2024, 0, 31)
    const holidays = getHolidaysInRange(start, end, settings)

    const years = new Set(holidays.map((h) => h.date.substring(0, 4)))
    expect(years.size).toBe(2)
  })

  describe('filtering by type', () => {
    it('filters by federal only', () => {
      const federalOnly: HolidaySettings = {
        ...DEFAULT_HOLIDAY_SETTINGS,
        showObservances: false,
        showReligious: false,
        showCultural: false,
      }
      const start = new Date(2024, 0, 1)
      const end = new Date(2024, 11, 31)
      const holidays = getHolidaysInRange(start, end, federalOnly)

      holidays.forEach((h) => {
        expect(h.type).toBe('federal')
      })
    })

    it('includes observances when enabled', () => {
      const withObservances: HolidaySettings = {
        ...DEFAULT_HOLIDAY_SETTINGS,
        showObservances: true,
      }
      const start = new Date(2024, 1, 1)
      const end = new Date(2024, 1, 29)
      const holidays = getHolidaysInRange(start, end, withObservances)

      const valentines = holidays.find((h) => h.name === "Valentine's Day")
      expect(valentines).toBeDefined()
    })

    it('excludes religious when disabled', () => {
      const noReligious: HolidaySettings = {
        ...DEFAULT_HOLIDAY_SETTINGS,
        showReligious: false,
      }
      const start = new Date(2024, 2, 1)
      const end = new Date(2024, 3, 30)
      const holidays = getHolidaysInRange(start, end, noReligious)

      const easter = holidays.find((h) => h.name === 'Easter Sunday')
      expect(easter).toBeUndefined()
    })
  })
})

// ============================================================================
// getHolidaysForDate
// ============================================================================

describe('getHolidaysForDate', () => {
  it('returns holidays for a specific date', () => {
    const holidays = getHolidaysForDate('2024-07-04', DEFAULT_HOLIDAY_SETTINGS)
    expect(holidays.length).toBeGreaterThan(0)
    expect(holidays[0].name).toBe('Independence Day')
  })

  it('accepts Date object', () => {
    const date = new Date(2024, 11, 25)
    const holidays = getHolidaysForDate(date, DEFAULT_HOLIDAY_SETTINGS)
    expect(holidays.length).toBeGreaterThan(0)
    expect(holidays[0].name).toBe('Christmas Day')
  })

  it('returns empty array for non-holiday', () => {
    const holidays = getHolidaysForDate('2024-01-02', DEFAULT_HOLIDAY_SETTINGS)
    expect(holidays).toEqual([])
  })

  it('respects settings filters', () => {
    const noReligious: HolidaySettings = {
      ...DEFAULT_HOLIDAY_SETTINGS,
      showReligious: false,
    }
    const holidays = getHolidaysForDate('2024-03-31', noReligious)
    expect(holidays).toEqual([])

    const withReligious: HolidaySettings = {
      ...DEFAULT_HOLIDAY_SETTINGS,
      showReligious: true,
    }
    const holidaysWithReligious = getHolidaysForDate('2024-03-31', withReligious)
    expect(holidaysWithReligious.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// isHoliday
// ============================================================================

describe('isHoliday', () => {
  it('returns true for holidays', () => {
    expect(isHoliday('2024-07-04', DEFAULT_HOLIDAY_SETTINGS)).toBe(true)
    expect(isHoliday('2024-12-25', DEFAULT_HOLIDAY_SETTINGS)).toBe(true)
    expect(isHoliday('2024-01-01', DEFAULT_HOLIDAY_SETTINGS)).toBe(true)
  })

  it('returns false for non-holidays', () => {
    expect(isHoliday('2024-01-02', DEFAULT_HOLIDAY_SETTINGS)).toBe(false)
    expect(isHoliday('2024-06-15', DEFAULT_HOLIDAY_SETTINGS)).toBe(false)
  })

  it('accepts Date object', () => {
    const date = new Date(2024, 6, 4)
    expect(isHoliday(date, DEFAULT_HOLIDAY_SETTINGS)).toBe(true)
  })

  it('respects settings filters', () => {
    const noObservances: HolidaySettings = {
      ...DEFAULT_HOLIDAY_SETTINGS,
      showObservances: false,
    }
    expect(isHoliday('2024-02-14', DEFAULT_HOLIDAY_SETTINGS)).toBe(true)
    expect(isHoliday('2024-02-14', noObservances)).toBe(false)
  })
})

// ============================================================================
// getHolidayColor
// ============================================================================

describe('getHolidayColor', () => {
  it('returns colors for federal holidays', () => {
    const colors = getHolidayColor('federal')
    expect(colors).toHaveProperty('bg')
    expect(colors).toHaveProperty('text')
    expect(colors).toHaveProperty('border')
    expect(colors.text).toContain('rose')
  })

  it('returns colors for observances', () => {
    const colors = getHolidayColor('observance')
    expect(colors.text).toContain('purple')
  })

  it('returns colors for religious holidays', () => {
    const colors = getHolidayColor('religious')
    expect(colors.text).toContain('amber')
  })

  it('returns colors for cultural holidays', () => {
    const colors = getHolidayColor('cultural')
    expect(colors.text).toContain('cyan')
  })

  it('returns fallback colors for unknown type', () => {
    const colors = getHolidayColor('unknown' as Holiday['type'])
    expect(colors.text).toContain('zinc')
  })

  it('all color objects have consistent structure', () => {
    const types: Holiday['type'][] = ['federal', 'observance', 'religious', 'cultural']
    types.forEach((type) => {
      const colors = getHolidayColor(type)
      expect(colors.bg).toMatch(/^bg-/)
      expect(colors.text).toMatch(/^text-/)
      expect(colors.border).toMatch(/^border-/)
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('holidays integration', () => {
  it('US has more holidays than minimum expected', () => {
    const holidays = getHolidaysForYear(2024, 'US')
    expect(holidays.length).toBeGreaterThanOrEqual(10)
  })

  it('Easter calculation is accurate across years', () => {
    const easterDates: Record<number, string> = {
      2020: '2020-04-12',
      2021: '2021-04-04',
      2022: '2022-04-17',
      2023: '2023-04-09',
      2024: '2024-03-31',
      2025: '2025-04-20',
    }

    Object.entries(easterDates).forEach(([year, expected]) => {
      const holidays = getHolidaysForYear(parseInt(year), 'US')
      const easter = holidays.find((h) => h.name === 'Easter Sunday')
      expect(easter?.date, `Easter ${year}`).toBe(expected)
    })
  })

  it('variable holidays fall on correct weekdays', () => {
    for (let year = 2020; year <= 2025; year++) {
      const holidays = getHolidaysForYear(year, 'US')
      const mlk = holidays.find((h) => h.name === 'Martin Luther King Jr. Day')
      const date = new Date(mlk!.date + 'T12:00:00') // Use noon to avoid timezone issues
      expect(date.getDay(), `MLK Day ${year}`).toBe(1)
    }

    for (let year = 2020; year <= 2025; year++) {
      const holidays = getHolidaysForYear(year, 'US')
      const thanksgiving = holidays.find((h) => h.name === 'Thanksgiving Day')
      const date = new Date(thanksgiving!.date + 'T12:00:00') // Use noon to avoid timezone issues
      expect(date.getDay(), `Thanksgiving ${year}`).toBe(4)
    }
  })

  it('holiday data structure is consistent', () => {
    const countries: CountryCode[] = ['US', 'CA', 'GB']
    countries.forEach((country) => {
      const holidays = getHolidaysForYear(2024, country)
      holidays.forEach((h) => {
        expect(h).toHaveProperty('date')
        expect(h).toHaveProperty('name')
        expect(h).toHaveProperty('type')
        expect(h).toHaveProperty('country')
        expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(['federal', 'observance', 'religious', 'cultural']).toContain(h.type)
      })
    })
  })
})
