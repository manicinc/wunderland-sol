/**
 * Visualization Presets Tests
 * @module __tests__/unit/lib/visualization-presets.test
 *
 * Tests for visualization presets, styles, and prompt builders.
 */

import { describe, it, expect } from 'vitest'
import {
  getStyle,
  getDiagramPreset,
  getPromptTemplate,
  buildPrompt,
  buildDiagramPrompt,
  getStylesByCategory,
  getDiagramPresetsByType,
  COLOR_PALETTES,
  VisualizationLibrary,
} from '@/lib/visualization/presets'

// ============================================================================
// COLOR PALETTES
// ============================================================================

describe('COLOR_PALETTES', () => {
  it('contains ocean palette', () => {
    expect(COLOR_PALETTES.ocean).toBeDefined()
    expect(COLOR_PALETTES.ocean.primary).toBe('#0ea5e9')
  })

  it('contains sunset palette', () => {
    expect(COLOR_PALETTES.sunset).toBeDefined()
    expect(COLOR_PALETTES.sunset.primary).toBe('#f97316')
  })

  it('palettes have required color properties', () => {
    const requiredProps = [
      'primary', 'secondary', 'accent', 'background',
      'foreground', 'muted', 'border', 'success', 'warning', 'error', 'info'
    ]

    for (const palette of Object.values(COLOR_PALETTES)) {
      for (const prop of requiredProps) {
        expect(palette).toHaveProperty(prop)
        expect(typeof palette[prop as keyof typeof palette]).toBe('string')
      }
    }
  })

  it('colors are valid hex codes', () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/

    for (const palette of Object.values(COLOR_PALETTES)) {
      for (const color of Object.values(palette)) {
        expect(color).toMatch(hexRegex)
      }
    }
  })
})

// ============================================================================
// getStyle
// ============================================================================

describe('getStyle', () => {
  it('returns style by ID', () => {
    const style = getStyle('tech-minimal')
    expect(style).toBeDefined()
    expect(style?.name).toBe('Technical Minimalist')
  })

  it('returns undefined for unknown ID', () => {
    const style = getStyle('non-existent-style')
    expect(style).toBeUndefined()
  })

  it('style has required properties', () => {
    const style = getStyle('tech-minimal')

    if (style) {
      expect(style.id).toBeDefined()
      expect(style.name).toBeDefined()
      expect(style.description).toBeDefined()
      expect(style.category).toBeDefined()
      expect(style.colors).toBeDefined()
      expect(style.typography).toBeDefined()
      expect(style.promptPrefix).toBeDefined()
      expect(style.promptSuffix).toBeDefined()
    }
  })
})

// ============================================================================
// getDiagramPreset
// ============================================================================

describe('getDiagramPreset', () => {
  it('returns preset by ID', () => {
    const preset = getDiagramPreset('flowchart-process')
    expect(preset).toBeDefined()
    expect(preset?.name).toBe('Process Flowchart')
  })

  it('returns undefined for unknown ID', () => {
    const preset = getDiagramPreset('non-existent-preset')
    expect(preset).toBeUndefined()
  })

  it('preset has required properties', () => {
    const preset = getDiagramPreset('flowchart-process')

    if (preset) {
      expect(preset.id).toBeDefined()
      expect(preset.name).toBeDefined()
      expect(preset.type).toBeDefined()
      expect(preset.description).toBeDefined()
      expect(preset.template).toBeDefined()
    }
  })
})

// ============================================================================
// getPromptTemplate
// ============================================================================

describe('getPromptTemplate', () => {
  it('returns template by ID', () => {
    const template = getPromptTemplate('concept-explanation')
    expect(template).toBeDefined()
    expect(template?.name).toBe('Concept Explanation')
  })

  it('returns undefined for unknown ID', () => {
    const template = getPromptTemplate('non-existent-template')
    expect(template).toBeUndefined()
  })

  it('template has required properties', () => {
    const template = getPromptTemplate('concept-explanation')

    if (template) {
      expect(template.id).toBeDefined()
      expect(template.name).toBeDefined()
      expect(template.category).toBeDefined()
      expect(template.template).toBeDefined()
      expect(Array.isArray(template.variables)).toBe(true)
      expect(Array.isArray(template.examples)).toBe(true)
    }
  })
})

// ============================================================================
// buildPrompt
// ============================================================================

describe('buildPrompt', () => {
  it('throws for unknown template', () => {
    expect(() => buildPrompt('unknown-template', {})).toThrow('Unknown prompt template')
  })

  it('builds prompt with variables', () => {
    const template = getPromptTemplate('concept-explanation')
    if (template) {
      const variables: Record<string, string> = {}
      template.variables.forEach(v => {
        variables[v] = `test-${v}`
      })

      const result = buildPrompt(template.id, variables)
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    }
  })

  it('applies style prefix and suffix when styleId provided', () => {
    const style = getStyle('tech-minimal')
    const template = getPromptTemplate('concept-explanation')

    if (style && template) {
      const variables: Record<string, string> = {}
      template.variables.forEach(v => {
        variables[v] = 'test'
      })

      const withoutStyle = buildPrompt(template.id, variables)
      const withStyle = buildPrompt(template.id, variables, style.id)

      // With style should include style's prompt elements
      expect(withStyle.length).toBeGreaterThan(withoutStyle.length)
      expect(withStyle).toContain(style.promptPrefix)
    }
  })

  it('replaces all variable placeholders', () => {
    const template = getPromptTemplate('concept-explanation')
    if (template) {
      const variables: Record<string, string> = {}
      template.variables.forEach(v => {
        variables[v] = `VALUE_${v}`
      })

      const result = buildPrompt(template.id, variables)

      // Should contain our custom values
      expect(result).toContain('VALUE_concept')
      expect(result).toContain('VALUE_keyPoints')
    }
  })
})

// ============================================================================
// buildDiagramPrompt
// ============================================================================

describe('buildDiagramPrompt', () => {
  it('throws for unknown preset', () => {
    expect(() => buildDiagramPrompt('unknown-preset', {})).toThrow('Unknown diagram preset')
  })

  it('builds diagram prompt with variables', () => {
    const preset = getDiagramPreset('flowchart-process')
    if (preset) {
      const result = buildDiagramPrompt(preset.id, {
        title: 'Test Process',
        steps: 'Step 1, Step 2',
        decisions: 'Decision A'
      })
      expect(typeof result).toBe('string')
      expect(result).toContain('Test Process')
    }
  })

  it('uses default style when no styleId provided', () => {
    const preset = getDiagramPreset('flowchart-process')
    if (preset) {
      const result = buildDiagramPrompt(preset.id, { title: 'test' })
      // Default is 'clean, professional'
      expect(result).toContain('clean, professional')
    }
  })

  it('applies style name when styleId provided', () => {
    const preset = getDiagramPreset('flowchart-process')
    const style = getStyle('tech-minimal')

    if (preset && style) {
      const result = buildDiagramPrompt(preset.id, { title: 'test' }, style.id)
      expect(result).toContain('Technical Minimalist')
    }
  })
})

// ============================================================================
// getStylesByCategory
// ============================================================================

describe('getStylesByCategory', () => {
  it('returns array of styles for category', () => {
    const minimalistStyles = getStylesByCategory('minimalist')
    expect(Array.isArray(minimalistStyles)).toBe(true)
  })

  it('all returned styles have matching category', () => {
    const technicalStyles = getStylesByCategory('technical')

    technicalStyles.forEach(style => {
      expect(style.category).toBe('technical')
    })
  })

  it('returns empty array for unknown category', () => {
    const styles = getStylesByCategory('unknown-category' as any)
    expect(styles).toEqual([])
  })
})

// ============================================================================
// getDiagramPresetsByType
// ============================================================================

describe('getDiagramPresetsByType', () => {
  it('returns array of presets for type', () => {
    const flowcharts = getDiagramPresetsByType('flowchart')
    expect(Array.isArray(flowcharts)).toBe(true)
  })

  it('all returned presets have matching type', () => {
    const timelines = getDiagramPresetsByType('timeline')

    timelines.forEach(preset => {
      expect(preset.type).toBe('timeline')
    })
  })

  it('returns empty array for unknown type', () => {
    const presets = getDiagramPresetsByType('unknown-type' as any)
    expect(presets).toEqual([])
  })
})

// ============================================================================
// VisualizationLibrary (default export)
// ============================================================================

describe('VisualizationLibrary', () => {
  it('exports styles array', () => {
    expect(Array.isArray(VisualizationLibrary.styles)).toBe(true)
    expect(VisualizationLibrary.styles.length).toBeGreaterThan(0)
  })

  it('exports diagrams array', () => {
    expect(Array.isArray(VisualizationLibrary.diagrams)).toBe(true)
    expect(VisualizationLibrary.diagrams.length).toBeGreaterThan(0)
  })

  it('exports prompts array', () => {
    expect(Array.isArray(VisualizationLibrary.prompts)).toBe(true)
    expect(VisualizationLibrary.prompts.length).toBeGreaterThan(0)
  })

  it('exports palettes object', () => {
    expect(typeof VisualizationLibrary.palettes).toBe('object')
    expect(Object.keys(VisualizationLibrary.palettes).length).toBeGreaterThan(0)
  })

  it('exports utility functions', () => {
    expect(typeof VisualizationLibrary.getStyle).toBe('function')
    expect(typeof VisualizationLibrary.getDiagramPreset).toBe('function')
    expect(typeof VisualizationLibrary.getPromptTemplate).toBe('function')
    expect(typeof VisualizationLibrary.buildPrompt).toBe('function')
    expect(typeof VisualizationLibrary.buildDiagramPrompt).toBe('function')
    expect(typeof VisualizationLibrary.getStylesByCategory).toBe('function')
    expect(typeof VisualizationLibrary.getDiagramPresetsByType).toBe('function')
  })
})
