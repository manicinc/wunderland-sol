/**
 * Visualization Presets Tests
 * @module __tests__/unit/lib/visualization/presets.test
 *
 * Tests for visualization presets library.
 */

import { describe, it, expect } from 'vitest'
import {
  COLOR_PALETTES,
  VISUALIZATION_STYLES,
  DIAGRAM_PRESETS,
  PROMPT_TEMPLATES,
  getStyle,
  getDiagramPreset,
  getPromptTemplate,
  buildPrompt,
  buildDiagramPrompt,
  getStylesByCategory,
  getDiagramPresetsByType,
  VisualizationLibrary,
  type VisualizationStyle,
  type ColorPalette,
  type DiagramPreset,
  type PromptTemplate,
  type TypographyConfig,
} from '@/lib/visualization/presets'

describe('visualization presets', () => {
  // ============================================================================
  // COLOR_PALETTES
  // ============================================================================

  describe('COLOR_PALETTES', () => {
    it('has ocean palette', () => {
      expect(COLOR_PALETTES.ocean).toBeDefined()
      expect(COLOR_PALETTES.ocean.primary).toBe('#0ea5e9')
    })

    it('has sunset palette', () => {
      expect(COLOR_PALETTES.sunset).toBeDefined()
      expect(COLOR_PALETTES.sunset.primary).toBe('#f97316')
    })

    it('has forest palette', () => {
      expect(COLOR_PALETTES.forest).toBeDefined()
      expect(COLOR_PALETTES.forest.primary).toBe('#22c55e')
    })

    it('has cyber palette', () => {
      expect(COLOR_PALETTES.cyber).toBeDefined()
      expect(COLOR_PALETTES.cyber.primary).toBe('#a855f7')
    })

    it('has mono palette', () => {
      expect(COLOR_PALETTES.mono).toBeDefined()
      expect(COLOR_PALETTES.mono.primary).toBe('#18181b')
    })

    it('has monoDark palette', () => {
      expect(COLOR_PALETTES.monoDark).toBeDefined()
      expect(COLOR_PALETTES.monoDark.primary).toBe('#fafafa')
    })

    it('has paper palette', () => {
      expect(COLOR_PALETTES.paper).toBeDefined()
      expect(COLOR_PALETTES.paper.primary).toBe('#78716c')
    })

    it('all palettes have required color properties', () => {
      const requiredProps: (keyof ColorPalette)[] = [
        'primary', 'secondary', 'accent', 'background', 'foreground',
        'muted', 'border', 'success', 'warning', 'error', 'info'
      ]

      Object.values(COLOR_PALETTES).forEach(palette => {
        requiredProps.forEach(prop => {
          expect(palette[prop]).toBeDefined()
          expect(palette[prop]).toMatch(/^#[0-9a-f]{6}$/i)
        })
      })
    })
  })

  // ============================================================================
  // VISUALIZATION_STYLES
  // ============================================================================

  describe('VISUALIZATION_STYLES', () => {
    it('has multiple styles', () => {
      expect(VISUALIZATION_STYLES.length).toBeGreaterThan(0)
    })

    it('each style has required properties', () => {
      VISUALIZATION_STYLES.forEach(style => {
        expect(style.id).toBeDefined()
        expect(style.name).toBeDefined()
        expect(style.description).toBeDefined()
        expect(style.category).toBeDefined()
        expect(style.colors).toBeDefined()
        expect(style.typography).toBeDefined()
        expect(style.promptPrefix).toBeDefined()
        expect(style.promptSuffix).toBeDefined()
      })
    })

    it('includes technical styles', () => {
      const techStyles = VISUALIZATION_STYLES.filter(s => s.category === 'technical')
      expect(techStyles.length).toBeGreaterThan(0)
    })

    it('includes educational styles', () => {
      const eduStyles = VISUALIZATION_STYLES.filter(s => s.category === 'educational')
      expect(eduStyles.length).toBeGreaterThan(0)
    })

    it('includes artistic styles', () => {
      const artStyles = VISUALIZATION_STYLES.filter(s => s.category === 'artistic')
      expect(artStyles.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // DIAGRAM_PRESETS
  // ============================================================================

  describe('DIAGRAM_PRESETS', () => {
    it('has multiple presets', () => {
      expect(DIAGRAM_PRESETS.length).toBeGreaterThan(0)
    })

    it('each preset has required properties', () => {
      DIAGRAM_PRESETS.forEach(preset => {
        expect(preset.id).toBeDefined()
        expect(preset.name).toBeDefined()
        expect(preset.type).toBeDefined()
        expect(preset.description).toBeDefined()
        expect(preset.template).toBeDefined()
      })
    })

    it('includes flowchart preset', () => {
      const flowcharts = DIAGRAM_PRESETS.filter(p => p.type === 'flowchart')
      expect(flowcharts.length).toBeGreaterThan(0)
    })

    it('includes timeline presets', () => {
      const timelines = DIAGRAM_PRESETS.filter(p => p.type === 'timeline')
      expect(timelines.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // PROMPT_TEMPLATES
  // ============================================================================

  describe('PROMPT_TEMPLATES', () => {
    it('has multiple templates', () => {
      expect(PROMPT_TEMPLATES.length).toBeGreaterThan(0)
    })

    it('each template has required properties', () => {
      PROMPT_TEMPLATES.forEach(template => {
        expect(template.id).toBeDefined()
        expect(template.name).toBeDefined()
        expect(template.category).toBeDefined()
        expect(template.template).toBeDefined()
        expect(template.variables).toBeDefined()
      })
    })
  })

  // ============================================================================
  // getStyle
  // ============================================================================

  describe('getStyle', () => {
    it('returns style by ID', () => {
      const style = getStyle('tech-minimal')
      expect(style).toBeDefined()
      expect(style?.id).toBe('tech-minimal')
    })

    it('returns undefined for unknown ID', () => {
      const style = getStyle('unknown-style')
      expect(style).toBeUndefined()
    })
  })

  // ============================================================================
  // getDiagramPreset
  // ============================================================================

  describe('getDiagramPreset', () => {
    it('returns preset by ID', () => {
      const preset = getDiagramPreset('flowchart-process')
      expect(preset).toBeDefined()
      expect(preset?.id).toBe('flowchart-process')
    })

    it('returns undefined for unknown ID', () => {
      const preset = getDiagramPreset('unknown-preset')
      expect(preset).toBeUndefined()
    })
  })

  // ============================================================================
  // getPromptTemplate
  // ============================================================================

  describe('getPromptTemplate', () => {
    it('returns template by ID', () => {
      const template = getPromptTemplate('concept-explanation')
      expect(template).toBeDefined()
      expect(template?.id).toBe('concept-explanation')
    })

    it('returns undefined for unknown ID', () => {
      const template = getPromptTemplate('unknown-template')
      expect(template).toBeUndefined()
    })
  })

  // ============================================================================
  // buildPrompt
  // ============================================================================

  describe('buildPrompt', () => {
    it('builds prompt with variables', () => {
      const prompt = buildPrompt('concept-explanation', {
        concept: 'REST API',
        keyPoints: '- HTTP methods\n- Resources',
        audience: 'developers',
        complexity: 'intermediate',
      })

      expect(prompt).toContain('REST API')
      expect(prompt).toContain('HTTP methods')
    })

    it('builds prompt with style', () => {
      const prompt = buildPrompt('concept-explanation', {
        concept: 'Database',
        keyPoints: '- Schema\n- Queries',
        audience: 'students',
        complexity: 'beginner',
      }, 'tech-minimal')

      expect(prompt).toContain('Database')
      expect(prompt).toContain('clean, minimal technical diagram')
    })

    it('throws for unknown template', () => {
      expect(() => buildPrompt('unknown', {})).toThrow('Unknown prompt template')
    })
  })

  // ============================================================================
  // buildDiagramPrompt
  // ============================================================================

  describe('buildDiagramPrompt', () => {
    it('builds diagram prompt with variables', () => {
      const prompt = buildDiagramPrompt('flowchart-process', {
        title: 'User Registration',
        steps: 'Enter email, Verify, Create account',
        decisions: 'Email valid?',
      })

      expect(prompt).toContain('User Registration')
      expect(prompt).toContain('Enter email')
    })

    it('builds diagram prompt with style', () => {
      const prompt = buildDiagramPrompt('timeline-horizontal', {
        title: 'Project Timeline',
        events: 'Start, Milestone 1, End',
      }, 'tech-blueprint')

      expect(prompt).toContain('Project Timeline')
      expect(prompt).toContain('Blueprint Technical')
    })

    it('uses default style when none provided', () => {
      const prompt = buildDiagramPrompt('mindmap-central', {
        title: 'Topic',
        center: 'Main',
        branches: 'A, B, C',
      })

      expect(prompt).toContain('clean, professional')
    })

    it('throws for unknown preset', () => {
      expect(() => buildDiagramPrompt('unknown', {})).toThrow('Unknown diagram preset')
    })
  })

  // ============================================================================
  // getStylesByCategory
  // ============================================================================

  describe('getStylesByCategory', () => {
    it('returns styles for technical category', () => {
      const styles = getStylesByCategory('technical')
      expect(styles.length).toBeGreaterThan(0)
      styles.forEach(s => expect(s.category).toBe('technical'))
    })

    it('returns styles for educational category', () => {
      const styles = getStylesByCategory('educational')
      expect(styles.length).toBeGreaterThan(0)
    })

    it('returns empty array for unknown category', () => {
      const styles = getStylesByCategory('unknown' as any)
      expect(styles).toEqual([])
    })
  })

  // ============================================================================
  // getDiagramPresetsByType
  // ============================================================================

  describe('getDiagramPresetsByType', () => {
    it('returns presets for flowchart type', () => {
      const presets = getDiagramPresetsByType('flowchart')
      expect(presets.length).toBeGreaterThan(0)
      presets.forEach(p => expect(p.type).toBe('flowchart'))
    })

    it('returns presets for timeline type', () => {
      const presets = getDiagramPresetsByType('timeline')
      expect(presets.length).toBeGreaterThan(0)
    })

    it('returns empty array for unknown type', () => {
      const presets = getDiagramPresetsByType('unknown' as any)
      expect(presets).toEqual([])
    })
  })

  // ============================================================================
  // VisualizationLibrary
  // ============================================================================

  describe('VisualizationLibrary', () => {
    it('exports styles', () => {
      expect(VisualizationLibrary.styles).toBe(VISUALIZATION_STYLES)
    })

    it('exports diagrams', () => {
      expect(VisualizationLibrary.diagrams).toBe(DIAGRAM_PRESETS)
    })

    it('exports prompts', () => {
      expect(VisualizationLibrary.prompts).toBe(PROMPT_TEMPLATES)
    })

    it('exports palettes', () => {
      expect(VisualizationLibrary.palettes).toBe(COLOR_PALETTES)
    })

    it('exports utility functions', () => {
      expect(VisualizationLibrary.getStyle).toBe(getStyle)
      expect(VisualizationLibrary.getDiagramPreset).toBe(getDiagramPreset)
      expect(VisualizationLibrary.getPromptTemplate).toBe(getPromptTemplate)
      expect(VisualizationLibrary.buildPrompt).toBe(buildPrompt)
      expect(VisualizationLibrary.buildDiagramPrompt).toBe(buildDiagramPrompt)
      expect(VisualizationLibrary.getStylesByCategory).toBe(getStylesByCategory)
      expect(VisualizationLibrary.getDiagramPresetsByType).toBe(getDiagramPresetsByType)
    })
  })

  // ============================================================================
  // Type exports
  // ============================================================================

  describe('type exports', () => {
    it('VisualizationStyle type is valid', () => {
      const style: VisualizationStyle = {
        id: 'test',
        name: 'Test Style',
        description: 'A test style',
        category: 'technical',
        colors: COLOR_PALETTES.mono,
        typography: {
          headingFont: 'Arial',
          bodyFont: 'Arial',
          codeFont: 'Courier',
          scale: 'normal',
        },
        promptPrefix: 'prefix',
        promptSuffix: 'suffix',
      }

      expect(style.id).toBe('test')
    })

    it('DiagramPreset type is valid', () => {
      const preset: DiagramPreset = {
        id: 'test',
        name: 'Test Preset',
        type: 'flowchart',
        description: 'Test',
        template: 'Template {{var}}',
      }

      expect(preset.type).toBe('flowchart')
    })

    it('PromptTemplate type is valid', () => {
      const template: PromptTemplate = {
        id: 'test',
        name: 'Test Template',
        category: 'test',
        template: 'Hello {{name}}',
        variables: ['name'],
        examples: [],
      }

      expect(template.variables).toContain('name')
    })

    it('TypographyConfig type is valid', () => {
      const config: TypographyConfig = {
        headingFont: 'Sans',
        bodyFont: 'Serif',
        codeFont: 'Mono',
        scale: 'large',
      }

      expect(config.scale).toBe('large')
    })
  })
})
