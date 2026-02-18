/**
 * Execution Types Tests
 * @module __tests__/unit/lib/execution/types.test
 *
 * Tests for execution type constants and utility functions.
 */

import { describe, it, expect } from 'vitest'
import {
  EXECUTION_TIMEOUTS,
  CLIENT_SIDE_LANGUAGES,
  BACKEND_LANGUAGES,
  PLAYGROUND_LANGUAGES,
  isClientSideLanguage,
  isBackendLanguage,
  isPlaygroundLanguage,
  normalizeLanguage,
  type ExecutionLanguage,
} from '@/lib/execution/types'

// ============================================================================
// EXECUTION_TIMEOUTS
// ============================================================================

describe('EXECUTION_TIMEOUTS', () => {
  it('has timeout for javascript', () => {
    expect(EXECUTION_TIMEOUTS.javascript).toBe(10000)
  })

  it('has timeout for typescript', () => {
    expect(EXECUTION_TIMEOUTS.typescript).toBe(15000)
  })

  it('has timeout for python', () => {
    expect(EXECUTION_TIMEOUTS.python).toBe(30000)
  })

  it('has timeout for bash', () => {
    expect(EXECUTION_TIMEOUTS.bash).toBe(30000)
  })

  it('has timeout for go', () => {
    expect(EXECUTION_TIMEOUTS.go).toBe(60000)
  })

  it('has timeout for rust', () => {
    expect(EXECUTION_TIMEOUTS.rust).toBe(60000)
  })

  it('typescript timeout is longer than javascript (includes transpilation)', () => {
    expect(EXECUTION_TIMEOUTS.typescript).toBeGreaterThan(EXECUTION_TIMEOUTS.javascript)
  })

  it('external API languages have longer timeouts', () => {
    expect(EXECUTION_TIMEOUTS.go).toBeGreaterThan(EXECUTION_TIMEOUTS.python)
    expect(EXECUTION_TIMEOUTS.rust).toBeGreaterThan(EXECUTION_TIMEOUTS.python)
  })

  it('all timeouts are positive numbers', () => {
    for (const [lang, timeout] of Object.entries(EXECUTION_TIMEOUTS)) {
      expect(timeout).toBeGreaterThan(0)
      expect(typeof timeout).toBe('number')
    }
  })

  it('has timeouts for all 6 languages', () => {
    const languages: ExecutionLanguage[] = [
      'javascript',
      'typescript',
      'python',
      'bash',
      'go',
      'rust',
    ]
    for (const lang of languages) {
      expect(EXECUTION_TIMEOUTS[lang]).toBeDefined()
    }
  })
})

// ============================================================================
// CLIENT_SIDE_LANGUAGES
// ============================================================================

describe('CLIENT_SIDE_LANGUAGES', () => {
  it('includes javascript', () => {
    expect(CLIENT_SIDE_LANGUAGES).toContain('javascript')
  })

  it('includes typescript', () => {
    expect(CLIENT_SIDE_LANGUAGES).toContain('typescript')
  })

  it('has exactly 2 languages', () => {
    expect(CLIENT_SIDE_LANGUAGES).toHaveLength(2)
  })

  it('does not include backend languages', () => {
    expect(CLIENT_SIDE_LANGUAGES).not.toContain('python')
    expect(CLIENT_SIDE_LANGUAGES).not.toContain('bash')
  })

  it('does not include playground languages', () => {
    expect(CLIENT_SIDE_LANGUAGES).not.toContain('go')
    expect(CLIENT_SIDE_LANGUAGES).not.toContain('rust')
  })
})

// ============================================================================
// BACKEND_LANGUAGES
// ============================================================================

describe('BACKEND_LANGUAGES', () => {
  it('includes python', () => {
    expect(BACKEND_LANGUAGES).toContain('python')
  })

  it('includes bash', () => {
    expect(BACKEND_LANGUAGES).toContain('bash')
  })

  it('has exactly 2 languages', () => {
    expect(BACKEND_LANGUAGES).toHaveLength(2)
  })

  it('does not include client-side languages', () => {
    expect(BACKEND_LANGUAGES).not.toContain('javascript')
    expect(BACKEND_LANGUAGES).not.toContain('typescript')
  })
})

// ============================================================================
// PLAYGROUND_LANGUAGES
// ============================================================================

describe('PLAYGROUND_LANGUAGES', () => {
  it('includes go', () => {
    expect(PLAYGROUND_LANGUAGES).toContain('go')
  })

  it('includes rust', () => {
    expect(PLAYGROUND_LANGUAGES).toContain('rust')
  })

  it('has exactly 2 languages', () => {
    expect(PLAYGROUND_LANGUAGES).toHaveLength(2)
  })

  it('does not include client-side languages', () => {
    expect(PLAYGROUND_LANGUAGES).not.toContain('javascript')
    expect(PLAYGROUND_LANGUAGES).not.toContain('typescript')
  })

  it('does not include backend languages', () => {
    expect(PLAYGROUND_LANGUAGES).not.toContain('python')
    expect(PLAYGROUND_LANGUAGES).not.toContain('bash')
  })
})

// ============================================================================
// Language category coverage
// ============================================================================

describe('language category coverage', () => {
  it('all languages are categorized exactly once', () => {
    const allCategorized = [
      ...CLIENT_SIDE_LANGUAGES,
      ...BACKEND_LANGUAGES,
      ...PLAYGROUND_LANGUAGES,
    ]

    // Should have 6 languages total
    expect(allCategorized).toHaveLength(6)

    // No duplicates
    const unique = new Set(allCategorized)
    expect(unique.size).toBe(6)
  })

  it('categories cover all timeout languages', () => {
    const timeoutLanguages = Object.keys(EXECUTION_TIMEOUTS)
    const categorized = [
      ...CLIENT_SIDE_LANGUAGES,
      ...BACKEND_LANGUAGES,
      ...PLAYGROUND_LANGUAGES,
    ]

    for (const lang of timeoutLanguages) {
      expect(categorized).toContain(lang)
    }
  })
})

// ============================================================================
// isClientSideLanguage
// ============================================================================

describe('isClientSideLanguage', () => {
  it('returns true for javascript', () => {
    expect(isClientSideLanguage('javascript')).toBe(true)
  })

  it('returns true for typescript', () => {
    expect(isClientSideLanguage('typescript')).toBe(true)
  })

  it('returns false for python', () => {
    expect(isClientSideLanguage('python')).toBe(false)
  })

  it('returns false for bash', () => {
    expect(isClientSideLanguage('bash')).toBe(false)
  })

  it('returns false for go', () => {
    expect(isClientSideLanguage('go')).toBe(false)
  })

  it('returns false for rust', () => {
    expect(isClientSideLanguage('rust')).toBe(false)
  })
})

// ============================================================================
// isBackendLanguage
// ============================================================================

describe('isBackendLanguage', () => {
  it('returns true for python', () => {
    expect(isBackendLanguage('python')).toBe(true)
  })

  it('returns true for bash', () => {
    expect(isBackendLanguage('bash')).toBe(true)
  })

  it('returns false for javascript', () => {
    expect(isBackendLanguage('javascript')).toBe(false)
  })

  it('returns false for typescript', () => {
    expect(isBackendLanguage('typescript')).toBe(false)
  })

  it('returns false for go', () => {
    expect(isBackendLanguage('go')).toBe(false)
  })

  it('returns false for rust', () => {
    expect(isBackendLanguage('rust')).toBe(false)
  })
})

// ============================================================================
// isPlaygroundLanguage
// ============================================================================

describe('isPlaygroundLanguage', () => {
  it('returns true for go', () => {
    expect(isPlaygroundLanguage('go')).toBe(true)
  })

  it('returns true for rust', () => {
    expect(isPlaygroundLanguage('rust')).toBe(true)
  })

  it('returns false for javascript', () => {
    expect(isPlaygroundLanguage('javascript')).toBe(false)
  })

  it('returns false for python', () => {
    expect(isPlaygroundLanguage('python')).toBe(false)
  })
})

// ============================================================================
// normalizeLanguage
// ============================================================================

describe('normalizeLanguage', () => {
  describe('javascript aliases', () => {
    it('normalizes js to javascript', () => {
      expect(normalizeLanguage('js')).toBe('javascript')
    })

    it('normalizes javascript to javascript', () => {
      expect(normalizeLanguage('javascript')).toBe('javascript')
    })

    it('is case insensitive', () => {
      expect(normalizeLanguage('JS')).toBe('javascript')
      expect(normalizeLanguage('JavaScript')).toBe('javascript')
    })
  })

  describe('typescript aliases', () => {
    it('normalizes ts to typescript', () => {
      expect(normalizeLanguage('ts')).toBe('typescript')
    })

    it('normalizes typescript to typescript', () => {
      expect(normalizeLanguage('typescript')).toBe('typescript')
    })

    it('is case insensitive', () => {
      expect(normalizeLanguage('TS')).toBe('typescript')
      expect(normalizeLanguage('TypeScript')).toBe('typescript')
    })
  })

  describe('python aliases', () => {
    it('normalizes py to python', () => {
      expect(normalizeLanguage('py')).toBe('python')
    })

    it('normalizes python to python', () => {
      expect(normalizeLanguage('python')).toBe('python')
    })

    it('normalizes python3 to python', () => {
      expect(normalizeLanguage('python3')).toBe('python')
    })

    it('is case insensitive', () => {
      expect(normalizeLanguage('PY')).toBe('python')
      expect(normalizeLanguage('Python')).toBe('python')
    })
  })

  describe('bash aliases', () => {
    it('normalizes sh to bash', () => {
      expect(normalizeLanguage('sh')).toBe('bash')
    })

    it('normalizes bash to bash', () => {
      expect(normalizeLanguage('bash')).toBe('bash')
    })

    it('normalizes shell to bash', () => {
      expect(normalizeLanguage('shell')).toBe('bash')
    })

    it('normalizes zsh to bash', () => {
      expect(normalizeLanguage('zsh')).toBe('bash')
    })
  })

  describe('go aliases', () => {
    it('normalizes go to go', () => {
      expect(normalizeLanguage('go')).toBe('go')
    })

    it('normalizes golang to go', () => {
      expect(normalizeLanguage('golang')).toBe('go')
    })

    it('is case insensitive', () => {
      expect(normalizeLanguage('GO')).toBe('go')
      expect(normalizeLanguage('Golang')).toBe('go')
    })
  })

  describe('rust aliases', () => {
    it('normalizes rs to rust', () => {
      expect(normalizeLanguage('rs')).toBe('rust')
    })

    it('normalizes rust to rust', () => {
      expect(normalizeLanguage('rust')).toBe('rust')
    })

    it('is case insensitive', () => {
      expect(normalizeLanguage('RS')).toBe('rust')
      expect(normalizeLanguage('Rust')).toBe('rust')
    })
  })

  describe('unknown languages', () => {
    it('returns null for unknown language', () => {
      expect(normalizeLanguage('ruby')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(normalizeLanguage('')).toBeNull()
    })

    it('returns null for random text', () => {
      expect(normalizeLanguage('foobar')).toBeNull()
    })

    it('returns null for partial matches', () => {
      expect(normalizeLanguage('java')).toBeNull() // not javascript
      expect(normalizeLanguage('type')).toBeNull() // not typescript
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('execution types integration', () => {
  it('language category functions are mutually exclusive', () => {
    const allLanguages: ExecutionLanguage[] = [
      'javascript',
      'typescript',
      'python',
      'bash',
      'go',
      'rust',
    ]

    for (const lang of allLanguages) {
      const categories = [
        isClientSideLanguage(lang),
        isBackendLanguage(lang),
        isPlaygroundLanguage(lang),
      ]

      // Exactly one should be true
      const trueCount = categories.filter((c) => c).length
      expect(trueCount).toBe(1)
    }
  })

  it('normalized languages can be used with category functions', () => {
    const normalized = normalizeLanguage('js')
    expect(normalized).not.toBeNull()
    expect(isClientSideLanguage(normalized!)).toBe(true)

    const normalized2 = normalizeLanguage('py')
    expect(normalized2).not.toBeNull()
    expect(isBackendLanguage(normalized2!)).toBe(true)

    const normalized3 = normalizeLanguage('golang')
    expect(normalized3).not.toBeNull()
    expect(isPlaygroundLanguage(normalized3!)).toBe(true)
  })

  it('normalized languages have timeouts', () => {
    const aliases = ['js', 'ts', 'py', 'sh', 'golang', 'rs']

    for (const alias of aliases) {
      const normalized = normalizeLanguage(alias)
      expect(normalized).not.toBeNull()
      expect(EXECUTION_TIMEOUTS[normalized!]).toBeGreaterThan(0)
    }
  })
})
