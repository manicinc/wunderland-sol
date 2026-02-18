/**
 * LLM Streaming Tests
 * @module __tests__/unit/lib/llm/streaming.test
 *
 * Tests for LLM streaming utilities and state management.
 */

import { describe, it, expect } from 'vitest'
import {
  createStreamState,
  reduceStreamChunk,
  estimateTokens,
  type StreamChunk,
  type StreamState,
} from '@/lib/llm/streaming'

// ============================================================================
// createStreamState
// ============================================================================

describe('createStreamState', () => {
  it('creates initial state with empty text', () => {
    const state = createStreamState()

    expect(state.text).toBe('')
  })

  it('creates initial state with isStreaming false', () => {
    const state = createStreamState()

    expect(state.isStreaming).toBe(false)
  })

  it('creates initial state with null error', () => {
    const state = createStreamState()

    expect(state.error).toBeNull()
  })

  it('creates initial state with null usage', () => {
    const state = createStreamState()

    expect(state.usage).toBeNull()
  })

  it('returns a new object each time', () => {
    const state1 = createStreamState()
    const state2 = createStreamState()

    expect(state1).not.toBe(state2)
    expect(state1).toEqual(state2)
  })
})

// ============================================================================
// reduceStreamChunk
// ============================================================================

describe('reduceStreamChunk', () => {
  const initialState = (): StreamState => ({
    text: '',
    isStreaming: false,
    error: null,
    usage: null,
  })

  describe('text chunks', () => {
    it('appends content to text', () => {
      const state = initialState()
      const chunk: StreamChunk = { type: 'text', content: 'Hello' }

      const newState = reduceStreamChunk(state, chunk)

      expect(newState.text).toBe('Hello')
    })

    it('sets isStreaming to true', () => {
      const state = initialState()
      const chunk: StreamChunk = { type: 'text', content: 'Hi' }

      const newState = reduceStreamChunk(state, chunk)

      expect(newState.isStreaming).toBe(true)
    })

    it('accumulates text from multiple chunks', () => {
      let state = initialState()

      state = reduceStreamChunk(state, { type: 'text', content: 'Hello' })
      state = reduceStreamChunk(state, { type: 'text', content: ' ' })
      state = reduceStreamChunk(state, { type: 'text', content: 'World' })

      expect(state.text).toBe('Hello World')
    })

    it('handles undefined content as empty string', () => {
      const state = initialState()
      const chunk: StreamChunk = { type: 'text' }

      const newState = reduceStreamChunk(state, chunk)

      expect(newState.text).toBe('')
    })

    it('preserves other state properties', () => {
      const state: StreamState = {
        text: '',
        isStreaming: false,
        error: null,
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      }
      const chunk: StreamChunk = { type: 'text', content: 'Hi' }

      const newState = reduceStreamChunk(state, chunk)

      expect(newState.usage).toEqual(state.usage)
      expect(newState.error).toBeNull()
    })
  })

  describe('error chunks', () => {
    it('sets error message', () => {
      const state = initialState()
      const chunk: StreamChunk = { type: 'error', error: 'API timeout' }

      const newState = reduceStreamChunk(state, chunk)

      expect(newState.error).toBe('API timeout')
    })

    it('sets isStreaming to false', () => {
      const state: StreamState = { ...initialState(), isStreaming: true }
      const chunk: StreamChunk = { type: 'error', error: 'Failed' }

      const newState = reduceStreamChunk(state, chunk)

      expect(newState.isStreaming).toBe(false)
    })

    it('handles undefined error as Unknown error', () => {
      const state = initialState()
      const chunk: StreamChunk = { type: 'error' }

      const newState = reduceStreamChunk(state, chunk)

      expect(newState.error).toBe('Unknown error')
    })

    it('preserves accumulated text', () => {
      const state: StreamState = { ...initialState(), text: 'Partial response' }
      const chunk: StreamChunk = { type: 'error', error: 'Connection lost' }

      const newState = reduceStreamChunk(state, chunk)

      expect(newState.text).toBe('Partial response')
    })
  })

  describe('usage chunks', () => {
    it('sets usage data', () => {
      const state = initialState()
      const chunk: StreamChunk = {
        type: 'usage',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      }

      const newState = reduceStreamChunk(state, chunk)

      expect(newState.usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      })
    })

    it('handles undefined usage as null', () => {
      const state = initialState()
      const chunk: StreamChunk = { type: 'usage' }

      const newState = reduceStreamChunk(state, chunk)

      expect(newState.usage).toBeNull()
    })

    it('preserves streaming state', () => {
      const state: StreamState = { ...initialState(), isStreaming: true }
      const chunk: StreamChunk = {
        type: 'usage',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      }

      const newState = reduceStreamChunk(state, chunk)

      expect(newState.isStreaming).toBe(true)
    })
  })

  describe('done chunks', () => {
    it('sets isStreaming to false', () => {
      const state: StreamState = { ...initialState(), isStreaming: true }
      const chunk: StreamChunk = { type: 'done' }

      const newState = reduceStreamChunk(state, chunk)

      expect(newState.isStreaming).toBe(false)
    })

    it('preserves accumulated text', () => {
      const state: StreamState = { ...initialState(), text: 'Complete response' }
      const chunk: StreamChunk = { type: 'done' }

      const newState = reduceStreamChunk(state, chunk)

      expect(newState.text).toBe('Complete response')
    })

    it('preserves usage data', () => {
      const state: StreamState = {
        ...initialState(),
        usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
      }
      const chunk: StreamChunk = { type: 'done' }

      const newState = reduceStreamChunk(state, chunk)

      expect(newState.usage).toEqual({
        promptTokens: 50,
        completionTokens: 25,
        totalTokens: 75,
      })
    })
  })

  describe('unknown chunk types', () => {
    it('returns state unchanged for unknown types', () => {
      const state = initialState()
      const chunk = { type: 'unknown' } as unknown as StreamChunk

      const newState = reduceStreamChunk(state, chunk)

      expect(newState).toEqual(state)
    })
  })

  describe('immutability', () => {
    it('does not mutate original state', () => {
      const state = initialState()
      const originalText = state.text

      reduceStreamChunk(state, { type: 'text', content: 'Hello' })

      expect(state.text).toBe(originalText)
    })

    it('returns new object for each reduction', () => {
      const state = initialState()
      const newState = reduceStreamChunk(state, { type: 'text', content: 'Hi' })

      expect(newState).not.toBe(state)
    })
  })

  describe('full streaming simulation', () => {
    it('handles complete stream lifecycle', () => {
      let state = createStreamState()

      // Start streaming
      expect(state.isStreaming).toBe(false)

      // Receive text chunks
      state = reduceStreamChunk(state, { type: 'text', content: 'The answer is ' })
      expect(state.isStreaming).toBe(true)
      expect(state.text).toBe('The answer is ')

      state = reduceStreamChunk(state, { type: 'text', content: '42.' })
      expect(state.text).toBe('The answer is 42.')

      // Receive usage
      state = reduceStreamChunk(state, {
        type: 'usage',
        usage: { promptTokens: 10, completionTokens: 4, totalTokens: 14 },
      })
      expect(state.usage).toEqual({
        promptTokens: 10,
        completionTokens: 4,
        totalTokens: 14,
      })

      // Complete
      state = reduceStreamChunk(state, { type: 'done' })
      expect(state.isStreaming).toBe(false)
      expect(state.text).toBe('The answer is 42.')
      expect(state.error).toBeNull()
    })

    it('handles stream with error', () => {
      let state = createStreamState()

      // Start streaming
      state = reduceStreamChunk(state, { type: 'text', content: 'Partial ' })
      state = reduceStreamChunk(state, { type: 'text', content: 'response' })

      // Error occurs
      state = reduceStreamChunk(state, { type: 'error', error: 'Connection reset' })

      expect(state.text).toBe('Partial response')
      expect(state.error).toBe('Connection reset')
      expect(state.isStreaming).toBe(false)
    })
  })
})

// ============================================================================
// StreamChunk Type
// ============================================================================

describe('StreamChunk type', () => {
  it('supports text type', () => {
    const chunk: StreamChunk = { type: 'text', content: 'Hello' }
    expect(chunk.type).toBe('text')
  })

  it('supports error type', () => {
    const chunk: StreamChunk = { type: 'error', error: 'Failed' }
    expect(chunk.type).toBe('error')
  })

  it('supports done type', () => {
    const chunk: StreamChunk = { type: 'done' }
    expect(chunk.type).toBe('done')
  })

  it('supports usage type', () => {
    const chunk: StreamChunk = {
      type: 'usage',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    }
    expect(chunk.type).toBe('usage')
  })
})

// ============================================================================
// estimateTokens
// ============================================================================

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('returns 0 for null/undefined input', () => {
    expect(estimateTokens(null as unknown as string)).toBe(0)
    expect(estimateTokens(undefined as unknown as string)).toBe(0)
  })

  it('estimates ~4 chars per token for short text', () => {
    // "Hello" is 5 chars, should be ~2 tokens (ceil(5/4) = 2)
    expect(estimateTokens('Hello')).toBe(2)
  })

  it('estimates correctly for longer text', () => {
    // 20 chars should be 5 tokens
    expect(estimateTokens('12345678901234567890')).toBe(5)
  })

  it('rounds up partial tokens', () => {
    // 1 char should be 1 token (ceil(1/4) = 1)
    expect(estimateTokens('a')).toBe(1)
    // 5 chars should be 2 tokens (ceil(5/4) = 2)
    expect(estimateTokens('abcde')).toBe(2)
  })

  it('handles typical English sentence', () => {
    const sentence = 'The quick brown fox jumps over the lazy dog.'
    // 44 chars should be 11 tokens
    expect(estimateTokens(sentence)).toBe(11)
  })

  it('handles whitespace correctly', () => {
    // Spaces count as characters
    expect(estimateTokens('   ')).toBe(1) // 3 spaces = ceil(3/4) = 1
    expect(estimateTokens('    ')).toBe(1) // 4 spaces = ceil(4/4) = 1
    expect(estimateTokens('     ')).toBe(2) // 5 spaces = ceil(5/4) = 2
  })

  it('handles unicode characters', () => {
    // Unicode chars may take more bytes but we count string length
    const emoji = '👋' // This is 2 chars in JS (surrogate pair)
    expect(estimateTokens(emoji)).toBe(1) // ceil(2/4) = 1
  })

  it('estimates realistically for LLM response chunks', () => {
    // Typical streaming chunks are small
    const chunk1 = 'The'
    const chunk2 = ' answer'
    const chunk3 = ' is'
    const chunk4 = ' 42'

    const total =
      estimateTokens(chunk1) +
      estimateTokens(chunk2) +
      estimateTokens(chunk3) +
      estimateTokens(chunk4)

    // Total chars: 3 + 7 + 3 + 3 = 16, should be 4 tokens total
    // But chunked: ceil(3/4) + ceil(7/4) + ceil(3/4) + ceil(3/4) = 1 + 2 + 1 + 1 = 5
    expect(total).toBe(5)
  })
})
