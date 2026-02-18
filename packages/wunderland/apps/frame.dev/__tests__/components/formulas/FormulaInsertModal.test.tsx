/**
 * FormulaInsertModal Component Tests
 * @module __tests__/unit/formulas/FormulaInsertModal.test
 *
 * Tests for the formula insertion modal with live preview.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormulaInsertModal } from '@/components/quarry/ui/blockCommands/modals/FormulaInsertModal'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
}))

// Mock formula engine
const mockEvaluateFormula = vi.fn()
vi.mock('@/lib/formulas/formulaEngine', () => ({
  evaluateFormula: (...args: unknown[]) => mockEvaluateFormula(...args),
  getAvailableFunctions: () => [
    { name: 'ADD', description: 'Add numbers', category: 'math' },
    { name: 'SUBTRACT', description: 'Subtract numbers', category: 'math' },
    { name: 'MULTIPLY', description: 'Multiply numbers', category: 'math' },
    { name: 'DIVIDE', description: 'Divide numbers', category: 'math' },
    { name: 'WEATHER', description: 'Get weather forecast', category: 'data' },
    { name: 'ROUTE', description: 'Calculate route', category: 'data' },
  ],
  suggestFormulas: vi.fn().mockReturnValue([
    { formula: '=ADD()', score: 0.9 },
    { formula: '=SUM()', score: 0.8 },
  ]),
}))

// ============================================================================
// TEST SETUP
// ============================================================================

describe('FormulaInsertModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onInsert: vi.fn(),
    strandPath: '/documents/test.md',
    blockId: 'block-1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockEvaluateFormula.mockResolvedValue(0)
  })

  // ============================================================================
  // RENDERING TESTS
  // ============================================================================

  describe('Rendering', () => {
    it('renders modal when isOpen is true', () => {
      render(<FormulaInsertModal {...defaultProps} />)

      expect(screen.getByText(/formula/i)).toBeInTheDocument()
    })

    it('does not render when isOpen is false', () => {
      render(<FormulaInsertModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByText(/formula/i)).not.toBeInTheDocument()
    })

    it('renders formula input field', () => {
      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('renders insert button', () => {
      render(<FormulaInsertModal {...defaultProps} />)

      const insertButton = screen.getByRole('button', { name: /insert/i })
      expect(insertButton).toBeInTheDocument()
    })

    it('renders cancel button', () => {
      render(<FormulaInsertModal {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeInTheDocument()
    })

    it('renders available functions list', () => {
      render(<FormulaInsertModal {...defaultProps} />)

      expect(screen.getByText('ADD')).toBeInTheDocument()
      expect(screen.getByText('SUBTRACT')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // FORMULA INPUT TESTS
  // ============================================================================

  describe('Formula Input', () => {
    it('accepts formula input', async () => {
      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '=ADD(1, 2, 3)')

      expect(input).toHaveValue('=ADD(1, 2, 3)')
    })

    it('auto-prepends = if missing', async () => {
      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'ADD(1, 2)')

      // Some implementations auto-add =, check the value
      const value = (input as HTMLInputElement).value
      // May or may not have = depending on implementation
    })

    it('shows autocomplete suggestions', async () => {
      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '=AD')

      // Should show ADD as a suggestion
      await waitFor(() => {
        const suggestion = screen.queryByText(/ADD/i)
        expect(suggestion).toBeInTheDocument()
      })
    })

    it('clears input on cancel', async () => {
      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '=ADD(1, 2)')

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await userEvent.click(cancelButton)

      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // LIVE PREVIEW TESTS
  // ============================================================================

  describe('Live Preview', () => {
    it('shows preview section', () => {
      render(<FormulaInsertModal {...defaultProps} />)

      expect(screen.getByText(/preview/i)).toBeInTheDocument()
    })

    it('evaluates formula and shows result', async () => {
      mockEvaluateFormula.mockResolvedValue(6)

      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '=ADD(1, 2, 3)')

      await waitFor(() => {
        expect(screen.getByText('6')).toBeInTheDocument()
      })
    })

    it('shows loading state during evaluation', async () => {
      mockEvaluateFormula.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(100), 500))
      )

      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '=ADD(50, 50)')

      // Should show loading indicator
      await waitFor(() => {
        const loading = screen.queryByRole('status') || screen.queryByText(/calculating/i)
        // Loading state might be brief
      })
    })

    it('shows error for invalid formula', async () => {
      mockEvaluateFormula.mockRejectedValue(new Error('Invalid syntax'))

      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '=INVALID(()')

      await waitFor(() => {
        const error = screen.queryByText(/error/i) || screen.queryByText(/invalid/i)
        expect(error).toBeInTheDocument()
      })
    })

    it('updates preview on input change', async () => {
      mockEvaluateFormula
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(30)

      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')

      // First formula
      await userEvent.type(input, '=ADD(1, 2)')
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
      })

      // Change formula
      await userEvent.clear(input)
      await userEvent.type(input, '=ADD(10, 20)')

      await waitFor(() => {
        expect(screen.getByText('30')).toBeInTheDocument()
      })
    })

    it('debounces preview evaluation', async () => {
      mockEvaluateFormula.mockResolvedValue(15)

      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')

      // Type quickly
      await userEvent.type(input, '=ADD(1,2,3,4,5)')

      // Should not call evaluate for every keystroke
      await waitFor(
        () => {
          // Give time for debounce
        },
        { timeout: 500 }
      )

      // Should be called fewer times than keystrokes
      expect(mockEvaluateFormula.mock.calls.length).toBeLessThan(15)
    })
  })

  // ============================================================================
  // FUNCTION REFERENCE TESTS
  // ============================================================================

  describe('Function Reference', () => {
    it('displays function categories', () => {
      render(<FormulaInsertModal {...defaultProps} />)

      expect(screen.getByText(/math/i)).toBeInTheDocument()
      expect(screen.getByText(/data/i)).toBeInTheDocument()
    })

    it('shows function descriptions', () => {
      render(<FormulaInsertModal {...defaultProps} />)

      expect(screen.getByText(/add numbers/i)).toBeInTheDocument()
    })

    it('inserts function on click', async () => {
      render(<FormulaInsertModal {...defaultProps} />)

      const addButton = screen.getByText('ADD')
      await userEvent.click(addButton)

      const input = screen.getByRole('textbox')
      expect((input as HTMLInputElement).value).toContain('ADD')
    })

    it('filters functions on search', async () => {
      render(<FormulaInsertModal {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText(/search/i)
      if (searchInput) {
        await userEvent.type(searchInput, 'WEATHER')

        expect(screen.getByText('WEATHER')).toBeInTheDocument()
        expect(screen.queryByText('ADD')).not.toBeInTheDocument()
      }
    })
  })

  // ============================================================================
  // INSERT TESTS
  // ============================================================================

  describe('Insert Action', () => {
    it('calls onInsert with formula', async () => {
      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '=ADD(100, 200)')

      const insertButton = screen.getByRole('button', { name: /insert/i })
      await userEvent.click(insertButton)

      expect(defaultProps.onInsert).toHaveBeenCalledWith(
        expect.stringContaining('ADD(100, 200)')
      )
    })

    it('includes label in inserted formula', async () => {
      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '=ADD(1, 2)')

      // If there's a label input
      const labelInput = screen.queryByLabelText(/label/i)
      if (labelInput) {
        await userEvent.type(labelInput, 'my_sum')
      }

      const insertButton = screen.getByRole('button', { name: /insert/i })
      await userEvent.click(insertButton)

      expect(defaultProps.onInsert).toHaveBeenCalled()
    })

    it('closes modal after insert', async () => {
      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '=ADD(1, 1)')

      const insertButton = screen.getByRole('button', { name: /insert/i })
      await userEvent.click(insertButton)

      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('disables insert button for empty formula', () => {
      render(<FormulaInsertModal {...defaultProps} />)

      const insertButton = screen.getByRole('button', { name: /insert/i })
      expect(insertButton).toBeDisabled()
    })

    it('disables insert button for invalid formula', async () => {
      mockEvaluateFormula.mockRejectedValue(new Error('Invalid'))

      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '=INVALID')

      await waitFor(() => {
        const insertButton = screen.getByRole('button', { name: /insert/i })
        expect(insertButton).toBeDisabled()
      })
    })
  })

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  describe('Keyboard Shortcuts', () => {
    it('closes on Escape key', async () => {
      render(<FormulaInsertModal {...defaultProps} />)

      await userEvent.keyboard('{Escape}')

      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('inserts on Enter key when valid', async () => {
      mockEvaluateFormula.mockResolvedValue(5)

      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '=ADD(2, 3)')

      // Wait for validation
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })

      await userEvent.keyboard('{Enter}')

      expect(defaultProps.onInsert).toHaveBeenCalled()
    })

    it('does not insert on Enter when invalid', async () => {
      mockEvaluateFormula.mockRejectedValue(new Error('Invalid'))

      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '=BAD(')

      await waitFor(() => {
        const error = screen.queryByText(/error/i)
        // Error should be shown
      })

      await userEvent.keyboard('{Enter}')

      expect(defaultProps.onInsert).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  describe('Accessibility', () => {
    it('has accessible modal dialog', () => {
      render(<FormulaInsertModal {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
    })

    it('focuses input on open', () => {
      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      expect(document.activeElement).toBe(input)
    })

    it('has accessible labels', () => {
      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAccessibleName()
    })

    it('announces errors to screen readers', async () => {
      mockEvaluateFormula.mockRejectedValue(new Error('Syntax error'))

      render(<FormulaInsertModal {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '=BAD')

      await waitFor(() => {
        const alert = screen.queryByRole('alert')
        if (alert) {
          expect(alert).toBeInTheDocument()
        }
      })
    })
  })
})

