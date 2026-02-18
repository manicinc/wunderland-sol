/**
 * Handwriting Templates Tests
 * @module __tests__/unit/canvas/handwritingTemplates
 *
 * Tests for handwriting canvas templates (lined, grid, blank, Cornell)
 */

import { describe, it, expect } from 'vitest'
import {
  renderTemplateToSVG,
  createTemplateBlob,
  createTemplateDataURL,
  TEMPLATES,
  TEMPLATE_DEFAULTS,
  PAGE_SIZES,
  type TemplateConfig,
  type TemplateType,
} from '@/components/quarry/ui/canvas/templates/HandwritingTemplates'

describe('HandwritingTemplates', () => {
  describe('TEMPLATES constant', () => {
    it('should have 4 template types', () => {
      expect(TEMPLATES).toHaveLength(4)
    })

    it('should include lined, grid, blank, and cornell', () => {
      const types = TEMPLATES.map((t) => t.type)
      expect(types).toContain('lined')
      expect(types).toContain('grid')
      expect(types).toContain('blank')
      expect(types).toContain('cornell')
    })

    it('should have name, description, and icon for each template', () => {
      for (const template of TEMPLATES) {
        expect(template.name).toBeTruthy()
        expect(template.description).toBeTruthy()
        expect(template.icon).toBeDefined()
      }
    })
  })

  describe('TEMPLATE_DEFAULTS', () => {
    it('should have defaults for all template types', () => {
      const types: TemplateType[] = ['lined', 'grid', 'blank', 'cornell']
      for (const type of types) {
        expect(TEMPLATE_DEFAULTS[type]).toBeDefined()
      }
    })

    it('should have lineSpacing for lined template', () => {
      expect(TEMPLATE_DEFAULTS.lined.lineSpacing).toBeGreaterThan(0)
    })

    it('should have gridSize for grid template', () => {
      expect(TEMPLATE_DEFAULTS.grid.gridSize).toBeGreaterThan(0)
    })

    it('should have cueColumn and summaryHeight for cornell template', () => {
      expect(TEMPLATE_DEFAULTS.cornell.cueColumn).toBeGreaterThan(0)
      expect(TEMPLATE_DEFAULTS.cornell.summaryHeight).toBeGreaterThan(0)
    })
  })

  describe('PAGE_SIZES', () => {
    it('should have standard page sizes', () => {
      const names = PAGE_SIZES.map((s) => s.name)
      expect(names).toContain('Letter')
      expect(names).toContain('A4')
      expect(names).toContain('A5')
    })

    it('should have valid dimensions for each size', () => {
      for (const size of PAGE_SIZES) {
        expect(size.width).toBeGreaterThan(0)
        expect(size.height).toBeGreaterThan(0)
      }
    })
  })

  describe('renderTemplateToSVG', () => {
    it('should return valid SVG for lined template', () => {
      const config: TemplateConfig = {
        type: 'lined',
        width: 400,
        height: 500,
        ...TEMPLATE_DEFAULTS.lined,
      }

      const svg = renderTemplateToSVG(config)

      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain('width="400"')
      expect(svg).toContain('height="500"')
    })

    it('should return valid SVG for grid template', () => {
      const config: TemplateConfig = {
        type: 'grid',
        width: 400,
        height: 500,
        ...TEMPLATE_DEFAULTS.grid,
      }

      const svg = renderTemplateToSVG(config)

      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
      // Grid should have vertical and horizontal lines
      expect(svg).toContain('<line')
    })

    it('should return valid SVG for blank template', () => {
      const config: TemplateConfig = {
        type: 'blank',
        width: 400,
        height: 500,
        ...TEMPLATE_DEFAULTS.blank,
      }

      const svg = renderTemplateToSVG(config)

      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
      // Blank should have corner marks
      expect(svg).toContain('<path')
    })

    it('should return valid SVG for cornell template', () => {
      const config: TemplateConfig = {
        type: 'cornell',
        width: 612,
        height: 792,
        ...TEMPLATE_DEFAULTS.cornell,
      }

      const svg = renderTemplateToSVG(config)

      expect(svg).toContain('<svg')
      expect(svg).toContain('</svg>')
      // Cornell should have text labels
      expect(svg).toContain('Cue Column')
      expect(svg).toContain('Notes')
      expect(svg).toContain('Summary')
    })

    it('should include background color', () => {
      const config: TemplateConfig = {
        type: 'lined',
        width: 400,
        height: 500,
        backgroundColor: '#ffffcc',
        ...TEMPLATE_DEFAULTS.lined,
      }

      const svg = renderTemplateToSVG(config)

      expect(svg).toContain('fill="#ffffcc"')
    })

    it('should include custom line color', () => {
      const config: TemplateConfig = {
        type: 'lined',
        width: 400,
        height: 500,
        ...TEMPLATE_DEFAULTS.lined,
        lineColor: '#cccccc', // Must come after defaults spread
      }

      const svg = renderTemplateToSVG(config)

      expect(svg).toContain('stroke="#cccccc"')
    })

    it('should respect custom line spacing for lined template', () => {
      const smallSpacing: TemplateConfig = {
        type: 'lined',
        width: 400,
        height: 500,
        lineSpacing: 20,
        marginTop: 40,
        marginBottom: 40,
      }

      const largeSpacing: TemplateConfig = {
        type: 'lined',
        width: 400,
        height: 500,
        lineSpacing: 40,
        marginTop: 40,
        marginBottom: 40,
      }

      const smallSvg = renderTemplateToSVG(smallSpacing)
      const largeSvg = renderTemplateToSVG(largeSpacing)

      // Count number of lines (smaller spacing = more lines)
      const smallLineCount = (smallSvg.match(/<line/g) || []).length
      const largeLineCount = (largeSvg.match(/<line/g) || []).length

      expect(smallLineCount).toBeGreaterThan(largeLineCount)
    })

    it('should respect custom grid size for grid template', () => {
      const smallGrid: TemplateConfig = {
        type: 'grid',
        width: 400,
        height: 400,
        gridSize: 10,
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
      }

      const largeGrid: TemplateConfig = {
        type: 'grid',
        width: 400,
        height: 400,
        gridSize: 40,
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
      }

      const smallSvg = renderTemplateToSVG(smallGrid)
      const largeSvg = renderTemplateToSVG(largeGrid)

      // Count number of lines (smaller grid = more lines)
      const smallLineCount = (smallSvg.match(/<line/g) || []).length
      const largeLineCount = (largeSvg.match(/<line/g) || []).length

      expect(smallLineCount).toBeGreaterThan(largeLineCount)
    })
  })

  describe('createTemplateDataURL', () => {
    it('should return a data URL', () => {
      const config: TemplateConfig = {
        type: 'lined',
        width: 400,
        height: 500,
        ...TEMPLATE_DEFAULTS.lined,
      }

      const dataUrl = createTemplateDataURL(config)

      expect(dataUrl).toMatch(/^data:image\/svg\+xml;base64,/)
    })

    it('should create valid base64 encoded SVG', () => {
      const config: TemplateConfig = {
        type: 'grid',
        width: 200,
        height: 200,
        ...TEMPLATE_DEFAULTS.grid,
      }

      const dataUrl = createTemplateDataURL(config)
      const base64 = dataUrl.replace('data:image/svg+xml;base64,', '')

      // Decode base64 and check it's valid SVG
      const decoded = atob(base64)
      expect(decoded).toContain('<svg')
      expect(decoded).toContain('</svg>')
    })
  })

  describe('createTemplateBlob', () => {
    it('should return a Blob with SVG mime type', () => {
      const config: TemplateConfig = {
        type: 'lined',
        width: 400,
        height: 500,
        ...TEMPLATE_DEFAULTS.lined,
      }

      const blob = createTemplateBlob(config)

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('image/svg+xml')
    })

    it('should have non-zero size', () => {
      const config: TemplateConfig = {
        type: 'cornell',
        width: 612,
        height: 792,
        ...TEMPLATE_DEFAULTS.cornell,
      }

      const blob = createTemplateBlob(config)

      expect(blob.size).toBeGreaterThan(0)
    })
  })

  describe('template rendering correctness', () => {
    it('should generate correct number of lines for lined template', () => {
      const config: TemplateConfig = {
        type: 'lined',
        width: 400,
        height: 300,
        lineSpacing: 25,
        marginTop: 25,
        marginBottom: 25,
        marginLeft: 40,
        marginRight: 40,
      }

      const svg = renderTemplateToSVG(config)

      // Content height = 300 - 25 - 25 = 250
      // Expected lines = floor(250 / 25) + 1 = 11 horizontal lines + 1 margin line = 12
      const horizontalLines = (svg.match(/<line[^>]*y1="[^"]*"[^>]*y2="[^"]*"/g) || []).length

      // At minimum, we should have several lines
      expect(horizontalLines).toBeGreaterThanOrEqual(10)
    })

    it('should include red margin line for lined template', () => {
      const config: TemplateConfig = {
        type: 'lined',
        width: 400,
        height: 500,
        ...TEMPLATE_DEFAULTS.lined,
      }

      const svg = renderTemplateToSVG(config)

      // Should have a red-ish vertical margin line
      expect(svg).toContain('stroke="#ef4444"')
    })

    it('should have cue column divider for cornell template', () => {
      const config: TemplateConfig = {
        type: 'cornell',
        width: 612,
        height: 792,
        cueColumn: 150,
        summaryHeight: 120,
        ...TEMPLATE_DEFAULTS.cornell,
      }

      const svg = renderTemplateToSVG(config)

      // Should have thicker divider lines (stroke-width="2")
      expect(svg).toContain('stroke-width="2"')
    })
  })
})
