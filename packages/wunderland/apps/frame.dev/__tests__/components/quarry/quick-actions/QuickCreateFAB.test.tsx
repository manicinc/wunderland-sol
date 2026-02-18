/**
 * QuickCreateFAB Component Tests
 * @module __tests__/components/quarry/quick-actions/QuickCreateFAB.test
 *
 * Tests for the floating action button component including:
 * - Rendering all create options
 * - Supernote button integration
 * - Option click handlers
 * - Menu open/close behavior
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    button: ({
      children,
      onClick,
      disabled,
      className,
      style,
      'aria-label': ariaLabel,
      'aria-expanded': ariaExpanded,
      'aria-haspopup': ariaHasPopup,
    }: React.PropsWithChildren<{
      onClick?: () => void
      disabled?: boolean
      className?: string
      style?: React.CSSProperties
      'aria-label'?: string
      'aria-expanded'?: boolean
      'aria-haspopup'?: string
    }>) => (
      <button
        onClick={onClick}
        disabled={disabled}
        className={className}
        style={style}
        aria-label={ariaLabel}
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHasPopup}
      >
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus">Plus</span>,
  Sparkles: () => <span data-testid="icon-sparkles">Sparkles</span>,
  PenTool: () => <span data-testid="icon-pentool">PenTool</span>,
  Layers: () => <span data-testid="icon-layers">Layers</span>,
  FileText: () => <span data-testid="icon-filetext">FileText</span>,
  StickyNote: () => <span data-testid="icon-stickynote">StickyNote</span>,
  X: () => <span data-testid="icon-x">X</span>,
}))

// Mock hooks
vi.mock('../../hooks/useHaptics', () => ({
  useHaptics: () => ({
    haptic: vi.fn(),
  }),
}))

vi.mock('../../hooks/useIsTouchDevice', () => ({
  useIsTouchDevice: () => false,
}))

// Import after mocks
import QuickCreateFAB from '@/components/quarry/ui/quick-actions/QuickCreateFAB'

describe('QuickCreateFAB', () => {
  const defaultProps = {
    onNewBlank: vi.fn(),
    onFromCanvas: vi.fn(),
    onFromTemplate: vi.fn(),
    onNewSupernote: vi.fn(),
    canvasHasContent: false,
    theme: 'light' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the FAB button', () => {
      render(<QuickCreateFAB {...defaultProps} />)

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      expect(fabButton).toBeInTheDocument()
    })

    it('shows plus icon when closed', () => {
      render(<QuickCreateFAB {...defaultProps} />)

      expect(screen.getByTestId('icon-plus')).toBeInTheDocument()
    })

    it('opens menu when FAB is clicked', async () => {
      render(<QuickCreateFAB {...defaultProps} />)

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      fireEvent.click(fabButton)

      await waitFor(() => {
        expect(screen.getByText('New Blank')).toBeInTheDocument()
      })
    })
  })

  describe('Menu Options', () => {
    it('displays all create options when menu is open', async () => {
      render(<QuickCreateFAB {...defaultProps} />)

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      fireEvent.click(fabButton)

      await waitFor(() => {
        expect(screen.getByText('New Blank')).toBeInTheDocument()
        expect(screen.getByText('New Supernote')).toBeInTheDocument()
        expect(screen.getByText('From Canvas')).toBeInTheDocument()
        expect(screen.getByText('From Template')).toBeInTheDocument()
      })
    })

    it('displays supernote option with correct description', async () => {
      render(<QuickCreateFAB {...defaultProps} />)

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      fireEvent.click(fabButton)

      await waitFor(() => {
        expect(screen.getByText('New Supernote')).toBeInTheDocument()
        expect(screen.getByText('Quick structured note')).toBeInTheDocument()
      })
    })

    it('displays hotkeys for options', async () => {
      render(<QuickCreateFAB {...defaultProps} />)

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      fireEvent.click(fabButton)

      await waitFor(() => {
        expect(screen.getByText('Cmd+N')).toBeInTheDocument()
        expect(screen.getByText('Cmd+Shift+S')).toBeInTheDocument()
        expect(screen.getByText('Cmd+Shift+N')).toBeInTheDocument()
      })
    })
  })

  describe('Option Click Handlers', () => {
    it('calls onNewBlank when blank option is clicked', async () => {
      const onNewBlank = vi.fn()
      render(<QuickCreateFAB {...defaultProps} onNewBlank={onNewBlank} />)

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      fireEvent.click(fabButton)

      await waitFor(() => {
        const blankOption = screen.getByText('New Blank').closest('button')
        expect(blankOption).toBeInTheDocument()
        fireEvent.click(blankOption!)
      })

      expect(onNewBlank).toHaveBeenCalledTimes(1)
    })

    it('calls onNewSupernote when supernote option is clicked', async () => {
      const onNewSupernote = vi.fn()
      render(
        <QuickCreateFAB {...defaultProps} onNewSupernote={onNewSupernote} />
      )

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      fireEvent.click(fabButton)

      await waitFor(() => {
        const supernoteOption = screen.getByText('New Supernote').closest('button')
        expect(supernoteOption).toBeInTheDocument()
        fireEvent.click(supernoteOption!)
      })

      expect(onNewSupernote).toHaveBeenCalledTimes(1)
    })

    it('calls onFromCanvas when canvas option is clicked (with content)', async () => {
      const onFromCanvas = vi.fn()
      render(
        <QuickCreateFAB
          {...defaultProps}
          onFromCanvas={onFromCanvas}
          canvasHasContent={true}
        />
      )

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      fireEvent.click(fabButton)

      await waitFor(() => {
        const canvasOption = screen.getByText('From Canvas').closest('button')
        expect(canvasOption).toBeInTheDocument()
        fireEvent.click(canvasOption!)
      })

      expect(onFromCanvas).toHaveBeenCalledTimes(1)
    })

    it('calls onFromTemplate when template option is clicked', async () => {
      const onFromTemplate = vi.fn()
      render(
        <QuickCreateFAB {...defaultProps} onFromTemplate={onFromTemplate} />
      )

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      fireEvent.click(fabButton)

      await waitFor(() => {
        const templateOption = screen.getByText('From Template').closest('button')
        expect(templateOption).toBeInTheDocument()
        fireEvent.click(templateOption!)
      })

      expect(onFromTemplate).toHaveBeenCalledTimes(1)
    })

    it('does not crash when onNewSupernote is not provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { onNewSupernote, ...propsWithoutSupernote } = defaultProps
      render(<QuickCreateFAB {...propsWithoutSupernote} />)

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      fireEvent.click(fabButton)

      await waitFor(() => {
        const supernoteOption = screen.getByText('New Supernote').closest('button')
        expect(supernoteOption).toBeInTheDocument()
        // Should not throw when clicked
        fireEvent.click(supernoteOption!)
      })
    })
  })

  describe('Canvas Option State', () => {
    it('disables canvas option when canvas has no content', async () => {
      render(<QuickCreateFAB {...defaultProps} canvasHasContent={false} />)

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      fireEvent.click(fabButton)

      await waitFor(() => {
        const canvasOption = screen.getByText('From Canvas').closest('button')
        expect(canvasOption).toBeDisabled()
      })
    })

    it('enables canvas option when canvas has content', async () => {
      render(<QuickCreateFAB {...defaultProps} canvasHasContent={true} />)

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      fireEvent.click(fabButton)

      await waitFor(() => {
        const canvasOption = screen.getByText('From Canvas').closest('button')
        expect(canvasOption).not.toBeDisabled()
      })
    })

    it('does not call onFromCanvas when canvas option is disabled', async () => {
      const onFromCanvas = vi.fn()
      render(
        <QuickCreateFAB
          {...defaultProps}
          onFromCanvas={onFromCanvas}
          canvasHasContent={false}
        />
      )

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      fireEvent.click(fabButton)

      await waitFor(() => {
        const canvasOption = screen.getByText('From Canvas').closest('button')
        fireEvent.click(canvasOption!)
      })

      expect(onFromCanvas).not.toHaveBeenCalled()
    })
  })

  describe('Menu Behavior', () => {
    it('closes menu after option is selected', async () => {
      render(<QuickCreateFAB {...defaultProps} />)

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      fireEvent.click(fabButton)

      await waitFor(() => {
        expect(screen.getByText('New Blank')).toBeInTheDocument()
      })

      const blankOption = screen.getByText('New Blank').closest('button')
      fireEvent.click(blankOption!)

      // Menu should close - button should show "Create new strand" again
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Create new strand' })
        ).toBeInTheDocument()
      })
    })

    it('updates aria-expanded when menu opens/closes', async () => {
      render(<QuickCreateFAB {...defaultProps} />)

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })

      expect(fabButton).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(fabButton)

      await waitFor(() => {
        const closeButton = screen.getByRole('button', {
          name: 'Close create menu',
        })
        expect(closeButton).toHaveAttribute('aria-expanded', 'true')
      })
    })
  })

  describe('Theme Support', () => {
    it('renders with light theme', () => {
      render(<QuickCreateFAB {...defaultProps} theme="light" />)

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      expect(fabButton).toBeInTheDocument()
    })

    it('renders with dark theme', () => {
      render(<QuickCreateFAB {...defaultProps} theme="dark" />)

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      expect(fabButton).toBeInTheDocument()
    })

    it('renders with terminal-dark theme', () => {
      render(<QuickCreateFAB {...defaultProps} theme="terminal-dark" />)

      const fabButton = screen.getByRole('button', {
        name: 'Create new strand',
      })
      expect(fabButton).toBeInTheDocument()
    })
  })
})
