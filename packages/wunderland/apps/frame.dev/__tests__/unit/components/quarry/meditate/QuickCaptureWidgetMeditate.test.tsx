/**
 * QuickCaptureWidgetMeditate Component Tests
 * @module __tests__/unit/components/quarry/meditate/QuickCaptureWidgetMeditate.test
 *
 * Tests for the quick capture widget including:
 * - Saving notes as strands (not just localStorage)
 * - Voice recording states
 * - Tag selection
 * - Supernote frontmatter generation
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Use vi.hoisted to properly handle mock that's used in vi.mock factory
const { mockSaveStrand } = vi.hoisted(() => ({
  mockSaveStrand: vi.fn(),
}))

vi.mock('@/lib/storage/localCodex', () => ({
  saveStrand: mockSaveStrand,
}))

vi.mock('@/lib/voice/providers', () => ({
  getEffectiveSTTProvider: vi.fn().mockResolvedValue('browser'),
  getSTTProvider: vi.fn().mockReturnValue({
    transcribe: vi.fn().mockResolvedValue({ transcript: 'Test transcription' }),
  }),
}))

vi.mock('@/types/theme', () => ({
  isDarkTheme: (theme: string) => theme.includes('dark'),
}))

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
      className,
    }: React.PropsWithChildren<{
      onClick?: () => void
      className?: string
    }>) => (
      <button onClick={onClick} className={className}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Mic: () => <span data-testid="icon-mic">Mic</span>,
  MicOff: () => <span data-testid="icon-mic-off">MicOff</span>,
  Square: () => <span data-testid="icon-square">Square</span>,
  Send: () => <span data-testid="icon-send">Send</span>,
  Trash2: () => <span data-testid="icon-trash">Trash</span>,
  Tag: () => <span data-testid="icon-tag">Tag</span>,
  StickyNote: () => <span data-testid="icon-stickynote">StickyNote</span>,
  Loader2: () => <span data-testid="icon-loader">Loader</span>,
}))

// Import component after mocks
import QuickCaptureWidgetMeditate from '@/components/quarry/ui/meditate/widgets/QuickCaptureWidgetMeditate'

describe('QuickCaptureWidgetMeditate', () => {
  const defaultProps = {
    theme: 'light' as const,
    onNavigate: vi.fn(),
  }

  // Mock localStorage
  const localStorageMock = {
    store: {} as Record<string, string>,
    getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      localStorageMock.store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageMock.store[key]
    }),
    clear: vi.fn(() => {
      localStorageMock.store = {}
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.store = {}
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
    mockSaveStrand.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('renders in idle state by default', () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      expect(screen.getByText('Tap to start recording')).toBeInTheDocument()
      expect(screen.getByTestId('icon-mic')).toBeInTheDocument()
    })

    it('renders "or type a note" link', () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      expect(screen.getByText('or type a note')).toBeInTheDocument()
    })
  })

  describe('Editing Mode', () => {
    it('switches to editing mode when "type a note" is clicked', async () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      fireEvent.click(screen.getByText('or type a note'))

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("What's on your mind?")
        ).toBeInTheDocument()
      })
    })

    it('displays quick tags in editing mode', async () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      fireEvent.click(screen.getByText('or type a note'))

      await waitFor(() => {
        expect(screen.getByText('#idea')).toBeInTheDocument()
        expect(screen.getByText('#todo')).toBeInTheDocument()
        expect(screen.getByText('#note')).toBeInTheDocument()
        expect(screen.getByText('#question')).toBeInTheDocument()
        expect(screen.getByText('#reminder')).toBeInTheDocument()
      })
    })

    it('toggles tag selection', async () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      fireEvent.click(screen.getByText('or type a note'))

      await waitFor(() => {
        const ideaTag = screen.getByText('#idea')
        fireEvent.click(ideaTag)
        // Tag should have selected styling (purple)
        expect(ideaTag.className).toContain('purple')
      })
    })

    it('allows typing content', async () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      fireEvent.click(screen.getByText('or type a note'))

      const textarea = screen.getByPlaceholderText("What's on your mind?")
      fireEvent.change(textarea, { target: { value: 'My test note content' } })

      expect(textarea).toHaveValue('My test note content')
    })
  })

  describe('Saving Notes as Strands', () => {
    it('calls saveStrand when saving a note', async () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      // Enter editing mode
      fireEvent.click(screen.getByText('or type a note'))

      // Type content
      const textarea = await screen.findByPlaceholderText("What's on your mind?")
      fireEvent.change(textarea, { target: { value: 'Test note content' } })

      // Click save button
      const saveButton = screen.getByText('Save to Notes')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockSaveStrand).toHaveBeenCalledTimes(1)
      })
    })

    it('saves with correct strand structure', async () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      // Enter editing mode
      fireEvent.click(screen.getByText('or type a note'))

      // Type content
      const textarea = await screen.findByPlaceholderText("What's on your mind?")
      fireEvent.change(textarea, { target: { value: 'My important note' } })

      // Select a tag
      const ideaTag = screen.getByText('#idea')
      fireEvent.click(ideaTag)

      // Save
      const saveButton = screen.getByText('Save to Notes')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockSaveStrand).toHaveBeenCalledWith(
          expect.objectContaining({
            path: expect.stringMatching(/^weaves\/notes\/note-\d+\.md$/),
            title: 'My important note',
            tags: 'idea',
          })
        )
      })
    })

    it('includes supernote frontmatter in content', async () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      fireEvent.click(screen.getByText('or type a note'))

      const textarea = await screen.findByPlaceholderText("What's on your mind?")
      fireEvent.change(textarea, { target: { value: 'Frontmatter test' } })

      const saveButton = screen.getByText('Save to Notes')
      fireEvent.click(saveButton)

      await waitFor(() => {
        const savedStrand = mockSaveStrand.mock.calls[0][0]
        expect(savedStrand.content).toContain('---')
        expect(savedStrand.content).toContain('strandType: "supernote"')
        expect(savedStrand.content).toContain('isSupernote: true')
        expect(savedStrand.content).toContain('cardSize: "3x5"')
        expect(savedStrand.content).toContain('supernoteStyle: "paper"')
      })
    })

    it('includes selected tags in frontmatter', async () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      fireEvent.click(screen.getByText('or type a note'))

      const textarea = await screen.findByPlaceholderText("What's on your mind?")
      fireEvent.change(textarea, { target: { value: 'Tagged note' } })

      // Select multiple tags
      fireEvent.click(screen.getByText('#idea'))
      fireEvent.click(screen.getByText('#todo'))

      const saveButton = screen.getByText('Save to Notes')
      fireEvent.click(saveButton)

      await waitFor(() => {
        const savedStrand = mockSaveStrand.mock.calls[0][0]
        expect(savedStrand.content).toContain('"idea"')
        expect(savedStrand.content).toContain('"todo"')
        expect(savedStrand.tags).toBe('idea,todo')
      })
    })

    it('uses first tag as primarySupertag', async () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      fireEvent.click(screen.getByText('or type a note'))

      const textarea = await screen.findByPlaceholderText("What's on your mind?")
      fireEvent.change(textarea, { target: { value: 'Priority tag test' } })

      // Select todo first
      fireEvent.click(screen.getByText('#todo'))

      const saveButton = screen.getByText('Save to Notes')
      fireEvent.click(saveButton)

      await waitFor(() => {
        const savedStrand = mockSaveStrand.mock.calls[0][0]
        // Frontmatter format uses quoted strings
        expect(savedStrand.content).toContain('primarySupertag: "todo"')
      })
    })

    it('defaults to "note" supertag when no tags selected', async () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      fireEvent.click(screen.getByText('or type a note'))

      const textarea = await screen.findByPlaceholderText("What's on your mind?")
      fireEvent.change(textarea, { target: { value: 'No tags note' } })

      const saveButton = screen.getByText('Save to Notes')
      fireEvent.click(saveButton)

      await waitFor(() => {
        const savedStrand = mockSaveStrand.mock.calls[0][0]
        // Frontmatter format uses quoted strings
        expect(savedStrand.content).toContain('primarySupertag: "note"')
      })
    })

    it('resets form after successful save', async () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      fireEvent.click(screen.getByText('or type a note'))

      const textarea = await screen.findByPlaceholderText("What's on your mind?")
      fireEvent.change(textarea, { target: { value: 'Will be cleared' } })

      const saveButton = screen.getByText('Save to Notes')
      fireEvent.click(saveButton)

      await waitFor(() => {
        // Should return to idle state
        expect(screen.getByText('Tap to start recording')).toBeInTheDocument()
      })
    })

    it('also saves to localStorage for recent notes display', async () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      fireEvent.click(screen.getByText('or type a note'))

      const textarea = await screen.findByPlaceholderText("What's on your mind?")
      fireEvent.change(textarea, { target: { value: 'LocalStorage test' } })

      const saveButton = screen.getByText('Save to Notes')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'meditate-inbox-notes',
          expect.any(String)
        )
      })
    })
  })

  describe('Clear Functionality', () => {
    it('clears content when trash button is clicked', async () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      fireEvent.click(screen.getByText('or type a note'))

      const textarea = await screen.findByPlaceholderText("What's on your mind?")
      fireEvent.change(textarea, { target: { value: 'Content to clear' } })

      // Find and click trash button
      const trashButton = screen.getByTestId('icon-trash').closest('button')
      fireEvent.click(trashButton!)

      await waitFor(() => {
        // Should return to idle state
        expect(screen.getByText('Tap to start recording')).toBeInTheDocument()
      })
    })
  })

  describe('Save Button State', () => {
    it('disables save button when content is empty', async () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      fireEvent.click(screen.getByText('or type a note'))

      await waitFor(() => {
        const saveButton = screen.getByText('Save to Notes').closest('button')
        expect(saveButton).toBeDisabled()
      })
    })

    it('enables save button when content is entered', async () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      fireEvent.click(screen.getByText('or type a note'))

      const textarea = await screen.findByPlaceholderText("What's on your mind?")
      fireEvent.change(textarea, { target: { value: 'Some content' } })

      const saveButton = screen.getByText('Save to Notes').closest('button')
      expect(saveButton).not.toBeDisabled()
    })

    it('shows loading state while saving', async () => {
      // Make saveStrand slow
      mockSaveStrand.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 200))
      )

      render(<QuickCaptureWidgetMeditate {...defaultProps} />)

      fireEvent.click(screen.getByText('or type a note'))

      const textarea = await screen.findByPlaceholderText("What's on your mind?")
      fireEvent.change(textarea, { target: { value: 'Test content for loading' } })

      const saveButton = screen.getByText('Save to Notes').closest('button')
      fireEvent.click(saveButton!)

      // Check that the button shows "Saving..." text and loader icon
      await waitFor(() => {
        // The button text changes to "Saving..." during save
        const savingButton = screen.getByRole('button', { name: /saving/i })
        expect(savingButton).toBeInTheDocument()
        expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
      })
    })
  })

  describe('Theme Support', () => {
    it('renders with light theme', () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} theme="light" />)
      expect(screen.getByText('Tap to start recording')).toBeInTheDocument()
    })

    it('renders with dark theme', () => {
      render(<QuickCaptureWidgetMeditate {...defaultProps} theme="dark" />)
      expect(screen.getByText('Tap to start recording')).toBeInTheDocument()
    })
  })
})
