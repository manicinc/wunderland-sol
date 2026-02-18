/**
 * MentionChip Component Tests
 * @module __tests__/unit/mentions/MentionChip.test
 *
 * Tests for the inline mention chip component with hover preview.
 * @vitest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MentionChip } from '@/components/quarry/ui/mentions/MentionChip'
import type { MentionableEntity } from '@/lib/mentions/types'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('MentionChip', () => {
  const mockPerson: MentionableEntity = {
    id: 'person-1',
    type: 'person',
    label: 'John Doe',
    color: '#3b82f6',
    description: 'Software Engineer',
    sourceStrandPath: '/team/engineering',
    properties: {
      fullName: 'John Doe',
      email: 'john@example.com',
      role: 'Developer',
    },
    createdAt: '2024-01-01T00:00:00Z',
  } as MentionableEntity

  const mockPlace: MentionableEntity = {
    id: 'place-1',
    type: 'place',
    label: 'New York',
    color: '#22c55e',
    properties: {
      city: 'New York',
      country: 'USA',
      latitude: 40.7128,
      longitude: -74.006,
    },
    createdAt: '2024-01-01T00:00:00Z',
  } as MentionableEntity

  const mockDate: MentionableEntity = {
    id: 'date-1',
    type: 'date',
    label: 'Jan 15, 2024',
    color: '#f59e0b',
    properties: {
      date: '2024-01-15',
      isRange: false,
    },
    createdAt: '2024-01-01T00:00:00Z',
  } as MentionableEntity

  afterEach(() => {
    cleanup()
  })

  describe('Rendering', () => {
    it('renders with entity label', () => {
      render(<MentionChip entity={mockPerson} />)
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('renders @ symbol', () => {
      render(<MentionChip entity={mockPerson} />)
      
      expect(screen.getByText('@')).toBeInTheDocument()
    })

    it('renders type icon by default', () => {
      const { container } = render(<MentionChip entity={mockPerson} />)
      
      // Check for SVG icon (User icon for person type)
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('hides icon when showIcon is false', () => {
      const { container } = render(<MentionChip entity={mockPerson} showIcon={false} />)
      
      // Should only have @ symbol, no SVG
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBe(0)
    })

    it('applies entity color to styling', () => {
      const { container } = render(<MentionChip entity={mockPerson} />)
      
      const chip = container.querySelector('span')
      expect(chip).toHaveStyle({ color: '#3b82f6' })
    })
  })

  describe('Size Variants', () => {
    it('renders small size', () => {
      const { container } = render(<MentionChip entity={mockPerson} size="sm" />)
      
      const chip = container.querySelector('span')
      expect(chip?.className).toContain('text-xs')
    })

    it('renders medium size (default)', () => {
      const { container } = render(<MentionChip entity={mockPerson} size="md" />)
      
      const chip = container.querySelector('span')
      expect(chip?.className).toContain('text-sm')
    })

    it('renders large size', () => {
      const { container } = render(<MentionChip entity={mockPerson} size="lg" />)
      
      const chip = container.querySelector('span')
      expect(chip?.className).toContain('text-base')
    })
  })

  describe('Entity Types', () => {
    it('renders person entity correctly', () => {
      render(<MentionChip entity={mockPerson} />)
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('renders place entity correctly', () => {
      render(<MentionChip entity={mockPlace} />)
      
      expect(screen.getByText('New York')).toBeInTheDocument()
    })

    it('renders date entity correctly', () => {
      render(<MentionChip entity={mockDate} />)
      
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument()
    })

    it('uses correct color for each type', () => {
      const { container: personContainer } = render(<MentionChip entity={mockPerson} />)
      const personChip = personContainer.querySelector('span')
      expect(personChip).toHaveStyle({ color: '#3b82f6' })
      cleanup()

      const { container: placeContainer } = render(<MentionChip entity={mockPlace} />)
      const placeChip = placeContainer.querySelector('span')
      expect(placeChip).toHaveStyle({ color: '#22c55e' })
    })
  })

  describe('Click Handling', () => {
    it('calls onClick when clicked', () => {
      const handleClick = vi.fn()
      render(<MentionChip entity={mockPerson} onClick={handleClick} />)
      
      fireEvent.click(screen.getByText('John Doe'))
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('has cursor-pointer class', () => {
      const { container } = render(<MentionChip entity={mockPerson} onClick={() => {}} />)
      
      const chip = container.querySelector('span')
      expect(chip?.className).toContain('cursor-pointer')
    })
  })

  describe('Editable Mode', () => {
    it('shows remove button when editable', () => {
      render(
        <MentionChip
          entity={mockPerson}
          editable={true}
          onRemove={() => {}}
        />
      )
      
      expect(screen.getByText('×')).toBeInTheDocument()
    })

    it('does not show remove button when not editable', () => {
      render(<MentionChip entity={mockPerson} />)
      
      expect(screen.queryByText('×')).not.toBeInTheDocument()
    })

    it('calls onRemove when remove button clicked', () => {
      const handleRemove = vi.fn()
      render(
        <MentionChip
          entity={mockPerson}
          editable={true}
          onRemove={handleRemove}
        />
      )
      
      fireEvent.click(screen.getByText('×'))
      
      expect(handleRemove).toHaveBeenCalledTimes(1)
    })

    it('stops propagation on remove button click', () => {
      const handleClick = vi.fn()
      const handleRemove = vi.fn()
      
      render(
        <MentionChip
          entity={mockPerson}
          onClick={handleClick}
          editable={true}
          onRemove={handleRemove}
        />
      )
      
      fireEvent.click(screen.getByText('×'))
      
      expect(handleRemove).toHaveBeenCalled()
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Hover Preview', () => {
    it('shows preview popup on hover when showPreview is true', () => {
      const { container } = render(<MentionChip entity={mockPerson} showPreview={true} />)
      
      const chip = container.querySelector('span')
      fireEvent.mouseEnter(chip!)
      
      // Preview should show entity label again in header
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(1)
    })

    it('shows entity type in preview', () => {
      const { container } = render(<MentionChip entity={mockPerson} showPreview={true} />)
      
      const chip = container.querySelector('span')
      fireEvent.mouseEnter(chip!)
      
      // Type should be shown
      expect(screen.getByText('person')).toBeInTheDocument()
    })

    it('shows entity description in preview', () => {
      const { container } = render(<MentionChip entity={mockPerson} showPreview={true} />)
      
      const chip = container.querySelector('span')
      fireEvent.mouseEnter(chip!)
      
      expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    })

    it('shows entity properties in preview', () => {
      const { container } = render(<MentionChip entity={mockPerson} showPreview={true} />)
      
      const chip = container.querySelector('span')
      fireEvent.mouseEnter(chip!)
      
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
    })

    it('hides preview on mouse leave', () => {
      const { container } = render(<MentionChip entity={mockPerson} showPreview={true} />)
      
      const chip = container.querySelector('span')
      fireEvent.mouseEnter(chip!)
      
      // Preview is shown
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(1)
      
      fireEvent.mouseLeave(chip!)
      
      // Preview should be hidden - only one label remains
      expect(screen.getAllByText('John Doe').length).toBe(1)
    })

    it('does not show preview when showPreview is false', () => {
      const { container } = render(<MentionChip entity={mockPerson} showPreview={false} />)
      
      const chip = container.querySelector('span')
      fireEvent.mouseEnter(chip!)
      
      // Should only have one instance of the label
      expect(screen.getAllByText('John Doe').length).toBe(1)
    })

    it('shows source strand path in preview', () => {
      const { container } = render(<MentionChip entity={mockPerson} showPreview={true} />)
      
      const chip = container.querySelector('span')
      fireEvent.mouseEnter(chip!)
      
      expect(screen.getByText('/team/engineering')).toBeInTheDocument()
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <MentionChip entity={mockPerson} className="custom-class" />
      )
      
      const chip = container.querySelector('.custom-class')
      expect(chip).toBeInTheDocument()
    })

    it('has rounded-full class for pill shape', () => {
      const { container } = render(<MentionChip entity={mockPerson} />)
      
      const chip = container.querySelector('span')
      expect(chip?.className).toContain('rounded-full')
    })
  })

  describe('Edge Cases', () => {
    it('handles entity without description', () => {
      const entityNoDesc = { ...mockPerson, description: undefined }
      render(<MentionChip entity={entityNoDesc} showPreview={true} />)
      
      const { container } = render(<MentionChip entity={entityNoDesc} />)
      const chip = container.querySelector('span')
      fireEvent.mouseEnter(chip!)
      
      // Should not crash, description section should not render
      expect(screen.queryByText('Software Engineer')).not.toBeInTheDocument()
    })

    it('handles entity without properties', () => {
      const entityNoProps = { ...mockPerson, properties: {} }
      const { container } = render(<MentionChip entity={entityNoProps} showPreview={true} />)
      
      const chip = container.querySelector('span')
      fireEvent.mouseEnter(chip!)
      
      // Should not crash
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('handles entity without color (uses default)', () => {
      const entityNoColor = { ...mockPerson, color: undefined }
      const { container } = render(<MentionChip entity={entityNoColor} />)
      
      const chip = container.querySelector('span')
      // Should render without error and have some color
      expect(chip).toBeInTheDocument()
    })

    it('handles long labels gracefully', () => {
      const longLabelEntity = {
        ...mockPerson,
        label: 'This Is A Very Long Label That Should Still Render Correctly',
      }
      render(<MentionChip entity={longLabelEntity} />)
      
      expect(screen.getByText(longLabelEntity.label)).toBeInTheDocument()
    })
  })
})

