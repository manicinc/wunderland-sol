/**
 * Tests for ResearchWidget Dashboard Component
 * @module __tests__/unit/research/ResearchWidget.test
 *
 * Tests for the research dashboard widget:
 * - Search input functionality
 * - Recent sessions display
 * - Navigation callbacks
 * - Compact mode
 * - Theme support
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import React from 'react'

// Mock sessions data
const mockSessions = [
  {
    id: 'session_1',
    topic: 'Machine Learning Research',
    queries: ['neural networks', 'deep learning', 'transformers'],
    savedResults: [],
    notes: '',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
  },
  {
    id: 'session_2',
    topic: 'Quantum Computing',
    queries: ['qubits', 'quantum gates'],
    savedResults: [],
    notes: '',
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 3600000,
  },
]

// Use vi.hoisted for mock functions
const { mockUseResearchSessions } = vi.hoisted(() => ({
  mockUseResearchSessions: vi.fn(),
}))

// Mock the research sessions hook
vi.mock('@/lib/research', () => ({
  useResearchSessions: mockUseResearchSessions,
}))

// Import after mocks
import { ResearchWidget } from '@/components/quarry/dashboard/widgets/ResearchWidget'

describe('ResearchWidget', () => {
  let mockNavigate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockNavigate = vi.fn()
    mockUseResearchSessions.mockReturnValue({
      sessions: mockSessions,
      loading: false,
      error: null,
      activeSession: null,
      create: vi.fn(),
      activate: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      addQuery: vi.fn(),
      saveResult: vi.fn(),
      unsaveResult: vi.fn(),
    })
    vi.clearAllMocks()
  })

  describe('Search Input', () => {
    it('should render search input', () => {
      render(
        <ResearchWidget
          theme="light"
          size="medium"
          onNavigate={mockNavigate}
        />
      )

      expect(screen.getByPlaceholderText('Search the web...')).toBeInTheDocument()
    })

    it('should update search query on input', () => {
      render(
        <ResearchWidget
          theme="light"
          size="medium"
          onNavigate={mockNavigate}
        />
      )

      const input = screen.getByPlaceholderText('Search the web...')
      fireEvent.change(input, { target: { value: 'test query' } })

      expect(input).toHaveValue('test query')
    })

    it('should navigate on Enter key', () => {
      render(
        <ResearchWidget
          theme="light"
          size="medium"
          onNavigate={mockNavigate}
        />
      )

      const input = screen.getByPlaceholderText('Search the web...')
      fireEvent.change(input, { target: { value: 'test query' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(mockNavigate).toHaveBeenCalledWith('/quarry/research?q=test+query')
    })

    it('should not navigate on empty query', () => {
      render(
        <ResearchWidget
          theme="light"
          size="medium"
          onNavigate={mockNavigate}
        />
      )

      const input = screen.getByPlaceholderText('Search the web...')
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should navigate on submit button click', () => {
      render(
        <ResearchWidget
          theme="light"
          size="medium"
          onNavigate={mockNavigate}
        />
      )

      const input = screen.getByPlaceholderText('Search the web...')
      fireEvent.change(input, { target: { value: 'web search' } })

      // Find the submit button (arrow icon)
      const buttons = screen.getAllByRole('button')
      const submitButton = buttons.find(btn => !btn.textContent?.includes('Research'))
      if (submitButton) {
        fireEvent.click(submitButton)
        expect(mockNavigate).toHaveBeenCalledWith('/quarry/research?q=web+search')
      }
    })
  })

  describe('Recent Sessions', () => {
    it('should display recent sessions', () => {
      render(
        <ResearchWidget
          theme="light"
          size="medium"
          onNavigate={mockNavigate}
        />
      )

      expect(screen.getByText('Machine Learning Research')).toBeInTheDocument()
      expect(screen.getByText('Quantum Computing')).toBeInTheDocument()
    })

    it('should show query count for each session', () => {
      render(
        <ResearchWidget
          theme="light"
          size="medium"
          onNavigate={mockNavigate}
        />
      )

      expect(screen.getByText('3q')).toBeInTheDocument() // 3 queries in first session
      expect(screen.getByText('2q')).toBeInTheDocument() // 2 queries in second session
    })

    it('should limit to 3 recent sessions', () => {
      const manySessions = Array.from({ length: 10 }, (_, i) => ({
        id: `session_${i}`,
        topic: `Session ${i}`,
        queries: ['query'],
        savedResults: [],
        notes: '',
        createdAt: Date.now() - i * 86400000,
        updatedAt: Date.now() - i * 3600000,
      }))

      mockUseResearchSessions.mockReturnValue({
        sessions: manySessions,
        loading: false,
        error: null,
        activeSession: null,
        create: vi.fn(),
        activate: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        addQuery: vi.fn(),
        saveResult: vi.fn(),
        unsaveResult: vi.fn(),
      })

      render(
        <ResearchWidget
          theme="light"
          size="medium"
          onNavigate={mockNavigate}
        />
      )

      // Should only show first 3
      expect(screen.getByText('Session 0')).toBeInTheDocument()
      expect(screen.getByText('Session 1')).toBeInTheDocument()
      expect(screen.getByText('Session 2')).toBeInTheDocument()
      expect(screen.queryByText('Session 3')).not.toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should render without error in loading state', () => {
      mockUseResearchSessions.mockReturnValue({
        sessions: [],
        loading: true,
        error: null,
        activeSession: null,
        create: vi.fn(),
        activate: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        addQuery: vi.fn(),
        saveResult: vi.fn(),
        unsaveResult: vi.fn(),
      })

      const { container } = render(
        <ResearchWidget
          theme="light"
          size="medium"
          onNavigate={mockNavigate}
        />
      )

      // Should render without throwing
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty message when no sessions', () => {
      mockUseResearchSessions.mockReturnValue({
        sessions: [],
        loading: false,
        error: null,
        activeSession: null,
        create: vi.fn(),
        activate: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        addQuery: vi.fn(),
        saveResult: vi.fn(),
        unsaveResult: vi.fn(),
      })

      render(
        <ResearchWidget
          theme="light"
          size="medium"
          onNavigate={mockNavigate}
        />
      )

      expect(screen.getByText('No research sessions yet')).toBeInTheDocument()
    })
  })

  describe('Compact Mode', () => {
    it('should render compact button in compact mode', () => {
      render(
        <ResearchWidget
          theme="light"
          size="small"
          onNavigate={mockNavigate}
          compact={true}
        />
      )

      const button = screen.getByRole('button', { name: /research/i })
      expect(button).toBeInTheDocument()
    })

    it('should navigate to research page on compact button click', () => {
      render(
        <ResearchWidget
          theme="light"
          size="small"
          onNavigate={mockNavigate}
          compact={true}
        />
      )

      const button = screen.getByRole('button', { name: /research/i })
      fireEvent.click(button)

      expect(mockNavigate).toHaveBeenCalledWith('/quarry/research')
    })
  })

  describe('Theme Support', () => {
    it('should render correctly in light mode', () => {
      const { container } = render(
        <ResearchWidget
          theme="light"
          size="medium"
          onNavigate={mockNavigate}
        />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('should render correctly in dark mode', () => {
      const { container } = render(
        <ResearchWidget
          theme="dark"
          size="medium"
          onNavigate={mockNavigate}
        />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('should render correctly in sepia-dark mode', () => {
      const { container } = render(
        <ResearchWidget
          theme="sepia-dark"
          size="medium"
          onNavigate={mockNavigate}
        />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should have Open Research link', () => {
      render(
        <ResearchWidget
          theme="light"
          size="medium"
          onNavigate={mockNavigate}
        />
      )

      const openButton = screen.getByRole('button', { name: /open research/i })
      expect(openButton).toBeInTheDocument()
    })

    it('should navigate on Open Research click', () => {
      render(
        <ResearchWidget
          theme="light"
          size="medium"
          onNavigate={mockNavigate}
        />
      )

      const openButton = screen.getByRole('button', { name: /open research/i })
      fireEvent.click(openButton)

      expect(mockNavigate).toHaveBeenCalledWith('/quarry/research')
    })

    it('should navigate when clicking a session', () => {
      render(
        <ResearchWidget
          theme="light"
          size="medium"
          onNavigate={mockNavigate}
        />
      )

      const sessionButton = screen.getByText('Machine Learning Research')
      fireEvent.click(sessionButton)

      expect(mockNavigate).toHaveBeenCalledWith('/quarry/research')
    })
  })
})

describe('ResearchWidget Edge Cases', () => {
  it('should handle special characters in search query', () => {
    const mockNavigate = vi.fn()
    mockUseResearchSessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: null,
      activeSession: null,
      create: vi.fn(),
      activate: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      addQuery: vi.fn(),
      saveResult: vi.fn(),
      unsaveResult: vi.fn(),
    })

    render(
      <ResearchWidget
        theme="light"
        size="medium"
        onNavigate={mockNavigate}
      />
    )

    const input = screen.getByPlaceholderText('Search the web...')
    fireEvent.change(input, { target: { value: 'C++ programming & algorithms' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockNavigate).toHaveBeenCalled()
    const call = mockNavigate.mock.calls[0][0]
    expect(call).toContain('/quarry/research')
    expect(call).toContain('q=')
  })

  it('should trim whitespace from search query', () => {
    const mockNavigate = vi.fn()
    mockUseResearchSessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: null,
      activeSession: null,
      create: vi.fn(),
      activate: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      addQuery: vi.fn(),
      saveResult: vi.fn(),
      unsaveResult: vi.fn(),
    })

    render(
      <ResearchWidget
        theme="light"
        size="medium"
        onNavigate={mockNavigate}
      />
    )

    const input = screen.getByPlaceholderText('Search the web...')
    fireEvent.change(input, { target: { value: '   test   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockNavigate).toHaveBeenCalledWith('/quarry/research?q=test')
  })

  it('should not submit on Shift+Enter', () => {
    const mockNavigate = vi.fn()
    mockUseResearchSessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: null,
      activeSession: null,
      create: vi.fn(),
      activate: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      addQuery: vi.fn(),
      saveResult: vi.fn(),
      unsaveResult: vi.fn(),
    })

    render(
      <ResearchWidget
        theme="light"
        size="medium"
        onNavigate={mockNavigate}
      />
    )

    const input = screen.getByPlaceholderText('Search the web...')
    fireEvent.change(input, { target: { value: 'test query' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })

    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
