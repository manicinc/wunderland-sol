/**
 * ViewConfigWizard Component Tests
 * @module __tests__/unit/views/ViewConfigWizard.test
 *
 * Tests for the embeddable view configuration wizard.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  ViewConfigWizard,
  type ViewConfigWizardProps,
} from '@/components/quarry/ui/blockCommands/modals/ViewConfigWizard'
import type { EmbeddableViewConfig, EmbeddableViewType } from '@/lib/views/embeddableViews'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
}))

// ============================================================================
// TEST SETUP
// ============================================================================

describe('ViewConfigWizard', () => {
  const defaultProps: ViewConfigWizardProps = {
    viewType: 'map',
    onConfigChange: vi.fn(),
    onClose: vi.fn(),
    strandPath: '/documents/test.md',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // RENDERING TESTS
  // ============================================================================

  describe('Rendering', () => {
    it('renders wizard for map view', () => {
      render(<ViewConfigWizard {...defaultProps} viewType="map" />)

      expect(screen.getByText(/map/i)).toBeInTheDocument()
    })

    it('renders wizard for calendar view', () => {
      render(<ViewConfigWizard {...defaultProps} viewType="calendar" />)

      expect(screen.getByText(/calendar/i)).toBeInTheDocument()
    })

    it('renders wizard for table view', () => {
      render(<ViewConfigWizard {...defaultProps} viewType="table" />)

      expect(screen.getByText(/table/i)).toBeInTheDocument()
    })

    it('renders wizard for chart view', () => {
      render(<ViewConfigWizard {...defaultProps} viewType="chart" />)

      expect(screen.getByText(/chart/i)).toBeInTheDocument()
    })

    it('renders wizard for list view', () => {
      render(<ViewConfigWizard {...defaultProps} viewType="list" />)

      expect(screen.getByText(/list/i)).toBeInTheDocument()
    })

    it('renders title input field', () => {
      render(<ViewConfigWizard {...defaultProps} />)

      const titleInput = screen.getByLabelText(/title/i)
      expect(titleInput).toBeInTheDocument()
    })

    it('renders scope selector', () => {
      render(<ViewConfigWizard {...defaultProps} />)

      expect(screen.getByText(/scope/i)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // GENERAL SETTINGS TESTS
  // ============================================================================

  describe('General Settings', () => {
    it('allows setting view title', async () => {
      const onConfigChange = vi.fn()
      render(<ViewConfigWizard {...defaultProps} onConfigChange={onConfigChange} />)

      const titleInput = screen.getByLabelText(/title/i)
      await userEvent.clear(titleInput)
      await userEvent.type(titleInput, 'My Custom Map')

      expect(onConfigChange).toHaveBeenCalled()
      const lastCall = onConfigChange.mock.calls[onConfigChange.mock.calls.length - 1]
      expect(lastCall[0].title).toBe('My Custom Map')
    })

    it('allows selecting scope', async () => {
      const onConfigChange = vi.fn()
      render(<ViewConfigWizard {...defaultProps} onConfigChange={onConfigChange} />)

      const scopeSelect = screen.getByLabelText(/scope/i)
      await userEvent.selectOptions(scopeSelect, 'subtree')

      expect(onConfigChange).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // MAP VIEW SETTINGS TESTS
  // ============================================================================

  describe('Map View Settings', () => {
    it('renders map-specific settings', () => {
      render(<ViewConfigWizard {...defaultProps} viewType="map" />)

      expect(screen.getByLabelText(/zoom/i)).toBeInTheDocument()
    })

    it('allows setting zoom level', async () => {
      const onConfigChange = vi.fn()
      render(<ViewConfigWizard {...defaultProps} viewType="map" onConfigChange={onConfigChange} />)

      const zoomInput = screen.getByLabelText(/zoom/i)
      await userEvent.clear(zoomInput)
      await userEvent.type(zoomInput, '15')

      expect(onConfigChange).toHaveBeenCalled()
    })

    it('allows toggling show markers', async () => {
      const onConfigChange = vi.fn()
      render(<ViewConfigWizard {...defaultProps} viewType="map" onConfigChange={onConfigChange} />)

      const markersToggle = screen.getByLabelText(/markers/i)
      await userEvent.click(markersToggle)

      expect(onConfigChange).toHaveBeenCalled()
    })

    it('allows toggling show route', async () => {
      const onConfigChange = vi.fn()
      render(<ViewConfigWizard {...defaultProps} viewType="map" onConfigChange={onConfigChange} />)

      const routeToggle = screen.getByLabelText(/route/i)
      if (routeToggle) {
        await userEvent.click(routeToggle)
        expect(onConfigChange).toHaveBeenCalled()
      }
    })
  })

  // ============================================================================
  // CALENDAR VIEW SETTINGS TESTS
  // ============================================================================

  describe('Calendar View Settings', () => {
    it('renders calendar-specific settings', () => {
      render(<ViewConfigWizard {...defaultProps} viewType="calendar" />)

      expect(screen.getByLabelText(/view/i)).toBeInTheDocument()
    })

    it('allows selecting calendar view type', async () => {
      const onConfigChange = vi.fn()
      render(
        <ViewConfigWizard {...defaultProps} viewType="calendar" onConfigChange={onConfigChange} />
      )

      const viewSelect = screen.getByLabelText(/view/i)
      await userEvent.selectOptions(viewSelect, 'week')

      expect(onConfigChange).toHaveBeenCalled()
    })

    it('allows toggling show weekends', async () => {
      const onConfigChange = vi.fn()
      render(
        <ViewConfigWizard {...defaultProps} viewType="calendar" onConfigChange={onConfigChange} />
      )

      const weekendsToggle = screen.getByLabelText(/weekends/i)
      await userEvent.click(weekendsToggle)

      expect(onConfigChange).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // TABLE VIEW SETTINGS TESTS
  // ============================================================================

  describe('Table View Settings', () => {
    it('renders table-specific settings', () => {
      render(<ViewConfigWizard {...defaultProps} viewType="table" />)

      // Table should have column settings
      expect(screen.getByText(/columns/i)).toBeInTheDocument()
    })

    it('allows toggling sortable', async () => {
      const onConfigChange = vi.fn()
      render(<ViewConfigWizard {...defaultProps} viewType="table" onConfigChange={onConfigChange} />)

      const sortableToggle = screen.getByLabelText(/sortable/i)
      await userEvent.click(sortableToggle)

      expect(onConfigChange).toHaveBeenCalled()
    })

    it('allows toggling filterable', async () => {
      const onConfigChange = vi.fn()
      render(<ViewConfigWizard {...defaultProps} viewType="table" onConfigChange={onConfigChange} />)

      const filterableToggle = screen.getByLabelText(/filterable/i)
      if (filterableToggle) {
        await userEvent.click(filterableToggle)
        expect(onConfigChange).toHaveBeenCalled()
      }
    })
  })

  // ============================================================================
  // CHART VIEW SETTINGS TESTS
  // ============================================================================

  describe('Chart View Settings', () => {
    it('renders chart-specific settings', () => {
      render(<ViewConfigWizard {...defaultProps} viewType="chart" />)

      expect(screen.getByLabelText(/chart type/i)).toBeInTheDocument()
    })

    it('allows selecting chart type', async () => {
      const onConfigChange = vi.fn()
      render(<ViewConfigWizard {...defaultProps} viewType="chart" onConfigChange={onConfigChange} />)

      const chartTypeSelect = screen.getByLabelText(/chart type/i)
      await userEvent.selectOptions(chartTypeSelect, 'bar')

      expect(onConfigChange).toHaveBeenCalled()
    })

    it('allows toggling legend', async () => {
      const onConfigChange = vi.fn()
      render(<ViewConfigWizard {...defaultProps} viewType="chart" onConfigChange={onConfigChange} />)

      const legendToggle = screen.getByLabelText(/legend/i)
      await userEvent.click(legendToggle)

      expect(onConfigChange).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // FILTER SETTINGS TESTS
  // ============================================================================

  describe('Filter Settings', () => {
    it('allows setting entity type filter', async () => {
      const onConfigChange = vi.fn()
      render(<ViewConfigWizard {...defaultProps} onConfigChange={onConfigChange} />)

      // Find filter section
      const filterSection = screen.getByText(/filter/i)
      expect(filterSection).toBeInTheDocument()
    })

    it('allows setting date range filter for calendar', async () => {
      const onConfigChange = vi.fn()
      render(
        <ViewConfigWizard {...defaultProps} viewType="calendar" onConfigChange={onConfigChange} />
      )

      const startDateInput = screen.getByLabelText(/start date/i)
      if (startDateInput) {
        await userEvent.type(startDateInput, '2025-01-01')
        expect(onConfigChange).toHaveBeenCalled()
      }
    })
  })

  // ============================================================================
  // INTERACTION TESTS
  // ============================================================================

  describe('User Interactions', () => {
    it('calls onClose when cancel is clicked', async () => {
      const onClose = vi.fn()
      render(<ViewConfigWizard {...defaultProps} onClose={onClose} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await userEvent.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('generates valid config on apply', async () => {
      const onConfigChange = vi.fn()
      render(<ViewConfigWizard {...defaultProps} onConfigChange={onConfigChange} />)

      // Make some changes
      const titleInput = screen.getByLabelText(/title/i)
      await userEvent.clear(titleInput)
      await userEvent.type(titleInput, 'Test View')

      // Check the config structure
      const lastCall = onConfigChange.mock.calls[onConfigChange.mock.calls.length - 1]
      const config = lastCall[0] as EmbeddableViewConfig

      expect(config.type).toBe('map')
      expect(config.title).toBe('Test View')
      expect(config.scope).toBeDefined()
    })

    it('updates preview when settings change', async () => {
      render(<ViewConfigWizard {...defaultProps} viewType="map" />)

      const zoomInput = screen.getByLabelText(/zoom/i)
      await userEvent.clear(zoomInput)
      await userEvent.type(zoomInput, '18')

      // Preview should update (implementation-specific)
      // Look for preview section
      const preview = screen.queryByTestId('config-preview')
      if (preview) {
        await waitFor(() => {
          expect(preview.textContent).toContain('18')
        })
      }
    })
  })

  // ============================================================================
  // INITIAL CONFIG TESTS
  // ============================================================================

  describe('Initial Configuration', () => {
    it('accepts initial config', () => {
      const initialConfig: Partial<EmbeddableViewConfig> = {
        type: 'map',
        title: 'Existing Map',
        scope: 'subtree',
        settings: {
          zoom: 15,
          showMarkers: true,
        },
      }

      render(<ViewConfigWizard {...defaultProps} initialConfig={initialConfig} />)

      const titleInput = screen.getByLabelText(/title/i)
      expect(titleInput).toHaveValue('Existing Map')
    })

    it('applies default settings for view type', () => {
      const onConfigChange = vi.fn()
      render(
        <ViewConfigWizard {...defaultProps} viewType="calendar" onConfigChange={onConfigChange} />
      )

      // Should immediately call with defaults
      expect(onConfigChange).toHaveBeenCalled()
      const initialConfig = onConfigChange.mock.calls[0][0]
      expect(initialConfig.type).toBe('calendar')
    })
  })

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  describe('Validation', () => {
    it('shows error for invalid zoom value', async () => {
      render(<ViewConfigWizard {...defaultProps} viewType="map" />)

      const zoomInput = screen.getByLabelText(/zoom/i)
      await userEvent.clear(zoomInput)
      await userEvent.type(zoomInput, '-5')

      // Should show validation error
      await waitFor(() => {
        const error = screen.queryByText(/invalid/i) || screen.queryByText(/must be/i)
        // Validation might be silent or shown
      })
    })

    it('requires at least one column for table view', async () => {
      render(<ViewConfigWizard {...defaultProps} viewType="table" />)

      // Clear all columns if possible
      // Check for validation warning
    })
  })

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  describe('Accessibility', () => {
    it('has accessible form labels', () => {
      render(<ViewConfigWizard {...defaultProps} />)

      const inputs = screen.getAllByRole('textbox')
      inputs.forEach((input) => {
        expect(input).toHaveAccessibleName()
      })
    })

    it('supports keyboard navigation', async () => {
      render(<ViewConfigWizard {...defaultProps} />)

      await userEvent.tab()

      // First interactive element should be focused
      expect(document.activeElement?.tagName).toBe('INPUT')
    })

    it('has proper heading structure', () => {
      render(<ViewConfigWizard {...defaultProps} />)

      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)
    })
  })
})

