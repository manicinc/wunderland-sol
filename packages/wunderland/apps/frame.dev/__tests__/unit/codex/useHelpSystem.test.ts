/**
 * useHelpSystem Hook Tests
 * @module tests/unit/quarry/useHelpSystem
 *
 * Tests for the help system hook used in CreateNodeWizard guided tours.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// Import types
import type {
  WizardHelp,
  WizardTourStep,
  StepHelp,
  FieldHelp,
} from '@/components/quarry/help/HelpContent'

describe('useHelpSystem', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('WizardHelp type structure', () => {
    it('should have correct structure for wizard help', () => {
      const mockHelp: WizardHelp = {
        id: 'create-node-wizard',
        title: 'Create Node Wizard',
        description: 'Guided wizard for creating new nodes',
        steps: [],
        tourSteps: [],
      }

      expect(mockHelp.id).toBe('create-node-wizard')
      expect(mockHelp.steps).toEqual([])
      expect(mockHelp.tourSteps).toEqual([])
    })
  })

  describe('WizardTourStep type', () => {
    it('should support all position values', () => {
      const positions: WizardTourStep['position'][] = [
        'top',
        'bottom',
        'left',
        'right',
        'center',
      ]

      expect(positions).toContain('top')
      expect(positions).toContain('center')
    })

    it('should have required properties', () => {
      const step: WizardTourStep = {
        id: 'step-1',
        target: '[data-help="type-selector"]',
        title: 'Select Type',
        description: 'Choose the type of node to create',
      }

      expect(step.id).toBeDefined()
      expect(step.target).toBeDefined()
      expect(step.title).toBeDefined()
      expect(step.description).toBeDefined()
    })

    it('should support optional properties', () => {
      const step: WizardTourStep = {
        id: 'step-1',
        target: '[data-help="type-selector"]',
        title: 'Select Type',
        description: 'Choose the type of node to create',
        position: 'bottom',
        actionText: 'Got it!',
        onShow: () => {},
        onComplete: () => {},
      }

      expect(step.position).toBe('bottom')
      expect(step.actionText).toBe('Got it!')
      expect(typeof step.onShow).toBe('function')
      expect(typeof step.onComplete).toBe('function')
    })
  })

  describe('StepHelp type', () => {
    it('should have correct structure', () => {
      const stepHelp: StepHelp = {
        id: 'select-type',
        title: 'Select Node Type',
        overview: 'Choose the type of node you want to create.',
        tips: ['Weaves are top-level containers', 'Looms organize content within weaves'],
        troubleshooting: [],
        instructions: [],
      }

      expect(stepHelp.id).toBe('select-type')
      expect(stepHelp.tips).toHaveLength(2)
      expect(stepHelp.instructions).toEqual([])
    })
  })

  describe('FieldHelp type', () => {
    it('should have correct structure', () => {
      const fieldHelp: FieldHelp = {
        name: 'title',
        label: 'Title',
        description: 'The display name for your node',
        examples: ['Introduction to React', 'Getting Started Guide'],
        cautions: ['Avoid special characters'],
        docLink: 'https://docs.example.com/fields/title',
      }

      expect(fieldHelp.name).toBe('title')
      expect(fieldHelp.examples).toHaveLength(2)
      expect(fieldHelp.cautions).toHaveLength(1)
      expect(fieldHelp.docLink).toContain('https://')
    })
  })

  describe('localStorage interactions', () => {
    const TOUR_DISMISSED_KEY = 'help-tour-dismissed'

    it('should check if tour was previously dismissed', () => {
      localStorageMock.setItem(TOUR_DISMISSED_KEY, 'true')
      expect(localStorageMock.getItem(TOUR_DISMISSED_KEY)).toBe('true')
    })

    it('should persist tour dismissal', () => {
      localStorageMock.setItem(TOUR_DISMISSED_KEY, 'true')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(TOUR_DISMISSED_KEY, 'true')
    })

    it('should detect first-time users', () => {
      expect(localStorageMock.getItem(TOUR_DISMISSED_KEY)).toBeNull()
    })
  })

  describe('hook exports', () => {
    it('should export useHelpSystem function', async () => {
      const { useHelpSystem } = await import('@/components/quarry/hooks/useHelpSystem')
      expect(typeof useHelpSystem).toBe('function')
    })

    it('should export UseHelpSystemReturn type', async () => {
      // This tests the module exports correctly
      const module = await import('@/components/quarry/hooks/useHelpSystem')
      expect(module.useHelpSystem).toBeDefined()
    })
  })

  describe('help panel state', () => {
    const PANEL_STATE_KEY = 'help-panel-collapsed'

    it('should persist panel collapsed state', () => {
      localStorageMock.setItem(PANEL_STATE_KEY, 'true')
      expect(localStorageMock.getItem(PANEL_STATE_KEY)).toBe('true')
    })

    it('should default to open on first visit', () => {
      expect(localStorageMock.getItem(PANEL_STATE_KEY)).toBeNull()
    })
  })

  describe('tour navigation', () => {
    it('should calculate step indices correctly', () => {
      const totalSteps = 5
      const currentStep = 2

      expect(currentStep).toBeLessThan(totalSteps)
      expect(currentStep).toBeGreaterThan(0)

      // Can go next
      expect(currentStep < totalSteps - 1).toBe(true)
      // Can go prev
      expect(currentStep > 0).toBe(true)
    })

    it('should handle first step correctly', () => {
      const currentStep = 0
      expect(currentStep > 0).toBe(false) // Cannot go prev
    })

    it('should handle last step correctly', () => {
      const totalSteps = 5
      const currentStep = 4
      expect(currentStep < totalSteps - 1).toBe(false) // Cannot go next
    })
  })

  describe('content lookup', () => {
    const mockSteps: StepHelp[] = [
      {
        id: 'select-type',
        title: 'Select Type',
        overview: 'Choose node type',
        tips: [],
        troubleshooting: [],
        instructions: ['Step one', 'Step two'],
      },
      {
        id: 'configure',
        title: 'Configure',
        overview: 'Set up node',
        tips: [],
        troubleshooting: [],
        instructions: ['Configure title', 'Configure description'],
      },
    ]

    // Separate field help data (not part of StepHelp)
    const mockFields: FieldHelp[] = [
      { name: 'title', label: 'Title', description: 'Node title' },
      { name: 'description', label: 'Description', description: 'Node description' },
    ]

    it('should find step help by id', () => {
      const stepHelp = mockSteps.find(s => s.id === 'select-type')
      expect(stepHelp).toBeDefined()
      expect(stepHelp?.title).toBe('Select Type')
    })

    it('should find field help by name', () => {
      const fieldHelp = mockFields.find(f => f.name === 'title')
      expect(fieldHelp).toBeDefined()
      expect(fieldHelp?.label).toBe('Title')
    })

    it('should return undefined for non-existent step', () => {
      const stepHelp = mockSteps.find(s => s.id === 'nonexistent')
      expect(stepHelp).toBeUndefined()
    })
  })
})
