/**
 * Holiday Utilities
 *
 * Provides holiday data for calendar integration.
 * Supports multiple countries with US as default.
 *
 * @module lib/planner/holidays
 */

export type CountryCode = 'US' | 'CA' | 'GB' | 'AU' | 'DE' | 'FR' | 'JP' | 'IN' | 'BR' | 'MX'

export interface Holiday {
  date: string // YYYY-MM-DD
  name: string
  type: 'federal' | 'observance' | 'religious' | 'cultural'
  country: CountryCode
}

export interface HolidaySettings {
  country: CountryCode
  showFederal: boolean
  showObservances: boolean
  showReligious: boolean
  showCultural: boolean
}

export const DEFAULT_HOLIDAY_SETTINGS: HolidaySettings = {
  country: 'US',
  showFederal: true,
  showObservances: true,
  showReligious: false,
  showCultural: false,
}

export const COUNTRY_OPTIONS: Array<{ code: CountryCode; name: string; flag: string }> = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
]

/**
 * Calculate Easter Sunday for a given year (Gregorian calendar)
 * Using Anonymous Gregorian algorithm
 */
function getEasterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/**
 * Get the nth occurrence of a weekday in a month
 * @param year - Year
 * @param month - Month (0-indexed)
 * @param weekday - Day of week (0 = Sunday, 1 = Monday, etc.)
 * @param n - Which occurrence (1 = first, 2 = second, etc., -1 = last)
 */
function getNthWeekday(year: number, month: number, weekday: number, n: number): Date {
  if (n > 0) {
    const first = new Date(year, month, 1)
    const firstWeekday = first.getDay()
    let day = 1 + ((weekday - firstWeekday + 7) % 7) + (n - 1) * 7
    return new Date(year, month, day)
  } else {
    // Last occurrence
    const last = new Date(year, month + 1, 0) // Last day of month
    const lastWeekday = last.getDay()
    let day = last.getDate() - ((lastWeekday - weekday + 7) % 7)
    return new Date(year, month, day)
  }
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get US holidays for a given year
 */
function getUSHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = []

  // Fixed holidays
  holidays.push({ date: `${year}-01-01`, name: "New Year's Day", type: 'federal', country: 'US' })
  holidays.push({ date: `${year}-07-04`, name: 'Independence Day', type: 'federal', country: 'US' })
  holidays.push({ date: `${year}-11-11`, name: 'Veterans Day', type: 'federal', country: 'US' })
  holidays.push({ date: `${year}-12-25`, name: 'Christmas Day', type: 'federal', country: 'US' })

  // Variable holidays
  // MLK Day - 3rd Monday of January
  holidays.push({
    date: formatDate(getNthWeekday(year, 0, 1, 3)),
    name: 'Martin Luther King Jr. Day',
    type: 'federal',
    country: 'US',
  })

  // Presidents Day - 3rd Monday of February
  holidays.push({
    date: formatDate(getNthWeekday(year, 1, 1, 3)),
    name: "Presidents' Day",
    type: 'federal',
    country: 'US',
  })

  // Memorial Day - Last Monday of May
  holidays.push({
    date: formatDate(getNthWeekday(year, 4, 1, -1)),
    name: 'Memorial Day',
    type: 'federal',
    country: 'US',
  })

  // Juneteenth - June 19
  holidays.push({ date: `${year}-06-19`, name: 'Juneteenth', type: 'federal', country: 'US' })

  // Labor Day - 1st Monday of September
  holidays.push({
    date: formatDate(getNthWeekday(year, 8, 1, 1)),
    name: 'Labor Day',
    type: 'federal',
    country: 'US',
  })

  // Columbus Day - 2nd Monday of October
  holidays.push({
    date: formatDate(getNthWeekday(year, 9, 1, 2)),
    name: 'Columbus Day',
    type: 'federal',
    country: 'US',
  })

  // Thanksgiving - 4th Thursday of November
  holidays.push({
    date: formatDate(getNthWeekday(year, 10, 4, 4)),
    name: 'Thanksgiving Day',
    type: 'federal',
    country: 'US',
  })

  // Observances
  holidays.push({ date: `${year}-02-14`, name: "Valentine's Day", type: 'observance', country: 'US' })
  holidays.push({ date: `${year}-03-17`, name: "St. Patrick's Day", type: 'observance', country: 'US' })
  holidays.push({ date: `${year}-10-31`, name: 'Halloween', type: 'observance', country: 'US' })

  // Mother's Day - 2nd Sunday of May
  holidays.push({
    date: formatDate(getNthWeekday(year, 4, 0, 2)),
    name: "Mother's Day",
    type: 'observance',
    country: 'US',
  })

  // Father's Day - 3rd Sunday of June
  holidays.push({
    date: formatDate(getNthWeekday(year, 5, 0, 3)),
    name: "Father's Day",
    type: 'observance',
    country: 'US',
  })

  // Easter (religious)
  const easter = getEasterSunday(year)
  holidays.push({
    date: formatDate(easter),
    name: 'Easter Sunday',
    type: 'religious',
    country: 'US',
  })

  return holidays
}

/**
 * Get Canadian holidays for a given year
 */
function getCAHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = []

  holidays.push({ date: `${year}-01-01`, name: "New Year's Day", type: 'federal', country: 'CA' })
  holidays.push({ date: `${year}-07-01`, name: 'Canada Day', type: 'federal', country: 'CA' })
  holidays.push({ date: `${year}-11-11`, name: 'Remembrance Day', type: 'federal', country: 'CA' })
  holidays.push({ date: `${year}-12-25`, name: 'Christmas Day', type: 'federal', country: 'CA' })
  holidays.push({ date: `${year}-12-26`, name: 'Boxing Day', type: 'federal', country: 'CA' })

  // Good Friday - 2 days before Easter
  const easter = getEasterSunday(year)
  const goodFriday = new Date(easter)
  goodFriday.setDate(easter.getDate() - 2)
  holidays.push({ date: formatDate(goodFriday), name: 'Good Friday', type: 'federal', country: 'CA' })

  // Victoria Day - Monday before May 25
  const may25 = new Date(year, 4, 25)
  const victoriaDay = new Date(year, 4, 25 - ((may25.getDay() + 6) % 7))
  holidays.push({ date: formatDate(victoriaDay), name: 'Victoria Day', type: 'federal', country: 'CA' })

  // Labour Day - 1st Monday of September
  holidays.push({
    date: formatDate(getNthWeekday(year, 8, 1, 1)),
    name: 'Labour Day',
    type: 'federal',
    country: 'CA',
  })

  // Thanksgiving - 2nd Monday of October
  holidays.push({
    date: formatDate(getNthWeekday(year, 9, 1, 2)),
    name: 'Thanksgiving',
    type: 'federal',
    country: 'CA',
  })

  return holidays
}

/**
 * Get UK holidays for a given year
 */
function getGBHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = []

  holidays.push({ date: `${year}-01-01`, name: "New Year's Day", type: 'federal', country: 'GB' })
  holidays.push({ date: `${year}-12-25`, name: 'Christmas Day', type: 'federal', country: 'GB' })
  holidays.push({ date: `${year}-12-26`, name: 'Boxing Day', type: 'federal', country: 'GB' })

  // Easter
  const easter = getEasterSunday(year)
  const goodFriday = new Date(easter)
  goodFriday.setDate(easter.getDate() - 2)
  const easterMonday = new Date(easter)
  easterMonday.setDate(easter.getDate() + 1)

  holidays.push({ date: formatDate(goodFriday), name: 'Good Friday', type: 'federal', country: 'GB' })
  holidays.push({ date: formatDate(easterMonday), name: 'Easter Monday', type: 'federal', country: 'GB' })

  // Early May Bank Holiday - 1st Monday of May
  holidays.push({
    date: formatDate(getNthWeekday(year, 4, 1, 1)),
    name: 'Early May Bank Holiday',
    type: 'federal',
    country: 'GB',
  })

  // Spring Bank Holiday - Last Monday of May
  holidays.push({
    date: formatDate(getNthWeekday(year, 4, 1, -1)),
    name: 'Spring Bank Holiday',
    type: 'federal',
    country: 'GB',
  })

  // Summer Bank Holiday - Last Monday of August
  holidays.push({
    date: formatDate(getNthWeekday(year, 7, 1, -1)),
    name: 'Summer Bank Holiday',
    type: 'federal',
    country: 'GB',
  })

  return holidays
}

/**
 * Get holidays for a specific country and year
 */
export function getHolidaysForYear(year: number, country: CountryCode): Holiday[] {
  switch (country) {
    case 'US':
      return getUSHolidays(year)
    case 'CA':
      return getCAHolidays(year)
    case 'GB':
      return getGBHolidays(year)
    // Add more countries as needed
    default:
      return getUSHolidays(year) // Fallback to US
  }
}

/**
 * Get holidays for a date range
 */
export function getHolidaysInRange(
  startDate: Date,
  endDate: Date,
  settings: HolidaySettings
): Holiday[] {
  const startYear = startDate.getFullYear()
  const endYear = endDate.getFullYear()
  const startStr = formatDate(startDate)
  const endStr = formatDate(endDate)

  const allHolidays: Holiday[] = []

  // Get holidays for all years in range
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getHolidaysForYear(year, settings.country)
    allHolidays.push(...yearHolidays)
  }

  // Filter by date range and settings
  return allHolidays.filter((h) => {
    if (h.date < startStr || h.date > endStr) return false

    switch (h.type) {
      case 'federal':
        return settings.showFederal
      case 'observance':
        return settings.showObservances
      case 'religious':
        return settings.showReligious
      case 'cultural':
        return settings.showCultural
      default:
        return true
    }
  })
}

/**
 * Get holidays for a specific date
 */
export function getHolidaysForDate(date: Date | string, settings: HolidaySettings): Holiday[] {
  const dateStr = typeof date === 'string' ? date : formatDate(date)
  const year = parseInt(dateStr.substring(0, 4))
  const holidays = getHolidaysForYear(year, settings.country)

  return holidays.filter((h) => {
    if (h.date !== dateStr) return false

    switch (h.type) {
      case 'federal':
        return settings.showFederal
      case 'observance':
        return settings.showObservances
      case 'religious':
        return settings.showReligious
      case 'cultural':
        return settings.showCultural
      default:
        return true
    }
  })
}

/**
 * Check if a date is a holiday
 */
export function isHoliday(date: Date | string, settings: HolidaySettings): boolean {
  return getHolidaysForDate(date, settings).length > 0
}

/**
 * Get holiday colors for display
 */
export function getHolidayColor(type: Holiday['type']): { bg: string; text: string; border: string } {
  switch (type) {
    case 'federal':
      return { bg: 'bg-rose-500/15', text: 'text-rose-500', border: 'border-rose-500/30' }
    case 'observance':
      return { bg: 'bg-purple-500/15', text: 'text-purple-500', border: 'border-purple-500/30' }
    case 'religious':
      return { bg: 'bg-amber-500/15', text: 'text-amber-500', border: 'border-amber-500/30' }
    case 'cultural':
      return { bg: 'bg-cyan-500/15', text: 'text-cyan-500', border: 'border-cyan-500/30' }
    default:
      return { bg: 'bg-zinc-500/15', text: 'text-zinc-500', border: 'border-zinc-500/30' }
  }
}
