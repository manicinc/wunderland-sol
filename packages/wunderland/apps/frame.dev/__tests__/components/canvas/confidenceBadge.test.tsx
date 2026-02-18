/**
 * Confidence Badge Tests
 * @module __tests__/unit/canvas/confidenceBadge
 *
 * Tests for the OCR confidence indicator components
 * @vitest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import {
  ConfidenceBadge,
  ConfidenceText,
  ConfidenceProgress,
  ConfidenceAlternatives,
  type WordConfidence,
} from '@/components/quarry/ui/canvas/shapes/HandwritingShape/ConfidenceBadge'

describe('ConfidenceBadge', () => {
  describe('rendering', () => {
    it('should render high confidence correctly', () => {
      render(<ConfidenceBadge value={0.95} />)

      expect(screen.getByText('95%')).toBeInTheDocument()
      expect(screen.getByText('High')).toBeInTheDocument()
    })

    it('should render medium confidence correctly', () => {
      render(<ConfidenceBadge value={0.75} />)

      expect(screen.getByText('75%')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()
    })

    it('should render low confidence correctly', () => {
      render(<ConfidenceBadge value={0.45} />)

      expect(screen.getByText('45%')).toBeInTheDocument()
      expect(screen.getByText('Low')).toBeInTheDocument()
    })

    it('should show processing state', () => {
      render(<ConfidenceBadge value={0} isProcessing />)

      expect(screen.getByText('Analyzing...')).toBeInTheDocument()
    })

    it('should have correct aria-label', () => {
      render(<ConfidenceBadge value={0.85} />)

      expect(
        screen.getByRole('status', { name: /OCR confidence: 85%/i })
      ).toBeInTheDocument()
    })
  })

  describe('size variants', () => {
    it('should render small size', () => {
      render(<ConfidenceBadge value={0.9} size="sm" />)
      expect(screen.getByText('90%')).toBeInTheDocument()
    })

    it('should render medium size (default)', () => {
      render(<ConfidenceBadge value={0.9} />)
      expect(screen.getByText('90%')).toBeInTheDocument()
    })

    it('should render large size', () => {
      render(<ConfidenceBadge value={0.9} size="lg" />)
      expect(screen.getByText('90%')).toBeInTheDocument()
    })
  })

  describe('confidence thresholds', () => {
    it('should show High for >= 85%', () => {
      render(<ConfidenceBadge value={0.85} />)
      expect(screen.getByText('High')).toBeInTheDocument()
    })

    it('should show Medium for 60-84%', () => {
      render(<ConfidenceBadge value={0.6} />)
      expect(screen.getByText('Medium')).toBeInTheDocument()
    })

    it('should show Low for < 60%', () => {
      render(<ConfidenceBadge value={0.59} />)
      expect(screen.getByText('Low')).toBeInTheDocument()
    })

    it('should handle edge case at 85%', () => {
      const { rerender } = render(<ConfidenceBadge value={0.849} />)
      expect(screen.getByText('Medium')).toBeInTheDocument()

      rerender(<ConfidenceBadge value={0.85} />)
      expect(screen.getByText('High')).toBeInTheDocument()
    })

    it('should handle edge case at 60%', () => {
      const { rerender } = render(<ConfidenceBadge value={0.599} />)
      expect(screen.getByText('Low')).toBeInTheDocument()

      rerender(<ConfidenceBadge value={0.6} />)
      expect(screen.getByText('Medium')).toBeInTheDocument()
    })
  })
})

describe('ConfidenceText', () => {
  const mockWords: WordConfidence[] = [
    { word: 'Hello', confidence: 0.95, startIndex: 0, endIndex: 5 },
    { word: 'world', confidence: 0.75, startIndex: 6, endIndex: 11 },
    { word: 'test', confidence: 0.45, startIndex: 12, endIndex: 16, alternatives: ['rest', 'best'] },
  ]

  it('should render text without word confidences', () => {
    render(<ConfidenceText text="Plain text" wordConfidences={[]} />)

    expect(screen.getByText('Plain text')).toBeInTheDocument()
  })

  it('should render text with word confidences', () => {
    render(
      <ConfidenceText
        text="Hello world test"
        wordConfidences={mockWords}
      />
    )

    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('world')).toBeInTheDocument()
    expect(screen.getByText('test')).toBeInTheDocument()
  })

  it('should call onWordClick for low confidence words with alternatives', () => {
    const onClick = vi.fn()

    render(
      <ConfidenceText
        text="Hello world test"
        wordConfidences={mockWords}
        onWordClick={onClick}
      />
    )

    // Click on low confidence word with alternatives
    fireEvent.click(screen.getByText('test'))

    expect(onClick).toHaveBeenCalledWith(mockWords[2])
  })

  it('should not call onWordClick for high confidence words', () => {
    const onClick = vi.fn()

    render(
      <ConfidenceText
        text="Hello world test"
        wordConfidences={mockWords}
        onWordClick={onClick}
      />
    )

    // Click on high confidence word
    fireEvent.click(screen.getByText('Hello'))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('should show tooltip with confidence percentage', () => {
    render(
      <ConfidenceText
        text="Hello world test"
        wordConfidences={mockWords}
      />
    )

    const helloWord = screen.getByText('Hello')
    expect(helloWord).toHaveAttribute('title', expect.stringContaining('95%'))
  })
})

describe('ConfidenceProgress', () => {
  it('should render progress bar', () => {
    render(<ConfidenceProgress value={0.75} />)

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('should show percentage label by default', () => {
    render(<ConfidenceProgress value={0.75} />)

    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('should hide label when showLabel is false', () => {
    render(<ConfidenceProgress value={0.75} showLabel={false} />)

    expect(screen.queryByText('75%')).not.toBeInTheDocument()
  })

  it('should have correct aria attributes', () => {
    render(<ConfidenceProgress value={0.75} />)

    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '75')
    expect(progressbar).toHaveAttribute('aria-valuemin', '0')
    expect(progressbar).toHaveAttribute('aria-valuemax', '100')
  })

  it('should round percentage correctly', () => {
    render(<ConfidenceProgress value={0.756} />)

    expect(screen.getByText('76%')).toBeInTheDocument()
  })
})

describe('ConfidenceAlternatives', () => {
  const mockWord: WordConfidence = {
    word: 'test',
    confidence: 0.45,
    startIndex: 0,
    endIndex: 4,
    alternatives: ['rest', 'best', 'nest'],
  }

  it('should render alternatives', () => {
    render(
      <ConfidenceAlternatives
        word={mockWord}
        onSelect={vi.fn()}
        onDismiss={vi.fn()}
      />
    )

    expect(screen.getByText('Did you mean?')).toBeInTheDocument()
    expect(screen.getByText('rest')).toBeInTheDocument()
    expect(screen.getByText('best')).toBeInTheDocument()
    expect(screen.getByText('nest')).toBeInTheDocument()
  })

  it('should show keep original option', () => {
    render(
      <ConfidenceAlternatives
        word={mockWord}
        onSelect={vi.fn()}
        onDismiss={vi.fn()}
      />
    )

    expect(screen.getByText('Keep "test"')).toBeInTheDocument()
  })

  it('should call onSelect when alternative is clicked', () => {
    const onSelect = vi.fn()
    const onDismiss = vi.fn()

    render(
      <ConfidenceAlternatives
        word={mockWord}
        onSelect={onSelect}
        onDismiss={onDismiss}
      />
    )

    fireEvent.click(screen.getByText('rest'))

    expect(onSelect).toHaveBeenCalledWith('rest')
    expect(onDismiss).toHaveBeenCalled()
  })

  it('should call onDismiss when keep option is clicked', () => {
    const onDismiss = vi.fn()

    render(
      <ConfidenceAlternatives
        word={mockWord}
        onSelect={vi.fn()}
        onDismiss={onDismiss}
      />
    )

    fireEvent.click(screen.getByText('Keep "test"'))

    expect(onDismiss).toHaveBeenCalled()
  })

  it('should return null when no alternatives', () => {
    const wordWithoutAlts: WordConfidence = {
      word: 'test',
      confidence: 0.45,
      startIndex: 0,
      endIndex: 4,
    }

    const { container } = render(
      <ConfidenceAlternatives
        word={wordWithoutAlts}
        onSelect={vi.fn()}
        onDismiss={vi.fn()}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should return null when alternatives array is empty', () => {
    const wordWithEmptyAlts: WordConfidence = {
      word: 'test',
      confidence: 0.45,
      startIndex: 0,
      endIndex: 4,
      alternatives: [],
    }

    const { container } = render(
      <ConfidenceAlternatives
        word={wordWithEmptyAlts}
        onSelect={vi.fn()}
        onDismiss={vi.fn()}
      />
    )

    expect(container.firstChild).toBeNull()
  })
})
