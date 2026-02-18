/**
 * Component Tests for useCanvasDrop Hook
 * @module __tests__/components/hooks/useCanvasDrop.test
 *
 * Tests for the canvas drag-and-drop hook including:
 * - Drop zone state management
 * - Strand data encoding/decoding
 * - Shape creation on drop
 * - Visual feedback states
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import {
  useCanvasDrop,
  useCanvasDragSource,
  encodeStrandDragData,
  decodeStrandDragData,
  CANVAS_DROP_MIME,
  type StrandDropData,
} from '@/components/quarry/ui/canvas/useCanvasDrop'
import type { Editor } from '@tldraw/tldraw'

// Mock tldraw Editor
function createMockEditor() {
  return {
    createShape: vi.fn(),
    createShapes: vi.fn(),
    screenToPage: vi.fn().mockImplementation(({ x, y }: { x: number; y: number }) => ({ x: x * 2, y: y * 2 })),
  } as unknown as Partial<Editor>
}

// Mock DragEvent
function createMockDragEvent(
  type: string,
  overrides: Partial<React.DragEvent> = {}
): React.DragEvent {
  const mockDataTransfer = {
    getData: vi.fn((mimeType: string) => {
      if (mimeType === CANVAS_DROP_MIME) {
        return JSON.stringify({
          type: 'strand',
          id: 'strand-1',
          path: '/weave/loom/strand-1',
          title: 'Test Strand',
          summary: 'A test strand',
          tags: ['test'],
        } as StrandDropData)
      }
      return ''
    }),
    setData: vi.fn(),
    types: [CANVAS_DROP_MIME],
    dropEffect: 'none' as const,
    effectAllowed: 'uninitialized' as const,
    setDragImage: vi.fn(),
    ...overrides.dataTransfer,
  }

  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    clientX: 100,
    clientY: 200,
    dataTransfer: mockDataTransfer,
    relatedTarget: null,
    ...overrides,
  } as unknown as React.DragEvent
}

describe('useCanvasDrop', () => {
  let mockEditor: ReturnType<typeof createMockEditor>

  beforeEach(() => {
    vi.clearAllMocks()
    mockEditor = createMockEditor()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('encodeStrandDragData', () => {
    it('should encode strand data to JSON string', () => {
      const data: StrandDropData = {
        type: 'strand',
        id: 'strand-1',
        path: '/weave/loom/strand-1',
        title: 'Test Strand',
      }

      const encoded = encodeStrandDragData(data)
      expect(typeof encoded).toBe('string')
      expect(JSON.parse(encoded)).toEqual(data)
    })
  })

  describe('decodeStrandDragData', () => {
    it('should decode valid JSON to strand data', () => {
      const data: StrandDropData = {
        type: 'strand',
        id: 'strand-1',
        path: '/weave/loom/strand-1',
        title: 'Test Strand',
      }

      const decoded = decodeStrandDragData(JSON.stringify(data))
      expect(decoded).toEqual(data)
    })

    it('should return null for invalid JSON', () => {
      const decoded = decodeStrandDragData('not valid json')
      expect(decoded).toBeNull()
    })

    it('should return null for empty string', () => {
      const decoded = decodeStrandDragData('')
      expect(decoded).toBeNull()
    })
  })

  describe('initialization', () => {
    it('should return initial drop state', () => {
      const { result } = renderHook(() =>
        useCanvasDrop(mockEditor as unknown as Editor)
      )

      expect(result.current.dropState).toEqual({
        isOver: false,
        isValid: false,
        position: null,
      })
    })

    it('should return drop zone ref', () => {
      const { result } = renderHook(() =>
        useCanvasDrop(mockEditor as unknown as Editor)
      )

      expect(result.current.dropZoneRef).toBeDefined()
    })

    it('should return drop handlers', () => {
      const { result } = renderHook(() =>
        useCanvasDrop(mockEditor as unknown as Editor)
      )

      expect(result.current.dropHandlers.onDragOver).toBeInstanceOf(Function)
      expect(result.current.dropHandlers.onDragEnter).toBeInstanceOf(Function)
      expect(result.current.dropHandlers.onDragLeave).toBeInstanceOf(Function)
      expect(result.current.dropHandlers.onDrop).toBeInstanceOf(Function)
    })
  })

  describe('onDragOver handler', () => {
    it('should update drop state on drag over', () => {
      const { result } = renderHook(() =>
        useCanvasDrop(mockEditor as unknown as Editor)
      )

      const event = createMockDragEvent('dragover')

      act(() => {
        result.current.dropHandlers.onDragOver(event)
      })

      expect(result.current.dropState.isOver).toBe(true)
      expect(result.current.dropState.isValid).toBe(true)
      expect(result.current.dropState.position).toEqual({ x: 100, y: 200 })
    })

    it('should prevent default behavior', () => {
      const { result } = renderHook(() =>
        useCanvasDrop(mockEditor as unknown as Editor)
      )

      const event = createMockDragEvent('dragover')

      act(() => {
        result.current.dropHandlers.onDragOver(event)
      })

      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.stopPropagation).toHaveBeenCalled()
    })

    it('should set dropEffect to copy for valid drops', () => {
      const { result } = renderHook(() =>
        useCanvasDrop(mockEditor as unknown as Editor)
      )

      const event = createMockDragEvent('dragover')

      act(() => {
        result.current.dropHandlers.onDragOver(event)
      })

      expect(event.dataTransfer.dropEffect).toBe('copy')
    })

    it('should set isValid to false for invalid drag data', () => {
      const { result } = renderHook(() =>
        useCanvasDrop(mockEditor as unknown as Editor)
      )

      const event = createMockDragEvent('dragover', {
        dataTransfer: {
          types: ['text/plain'], // No strand data
          dropEffect: 'none' as const,
          effectAllowed: 'uninitialized' as const,
          getData: vi.fn().mockReturnValue(''),
          setData: vi.fn(),
          setDragImage: vi.fn(),
        } as unknown as DataTransfer,
      })

      act(() => {
        result.current.dropHandlers.onDragOver(event)
      })

      expect(result.current.dropState.isOver).toBe(true)
      expect(result.current.dropState.isValid).toBe(false)
    })
  })

  describe('onDragEnter handler', () => {
    it('should update isOver state on drag enter', () => {
      const { result } = renderHook(() =>
        useCanvasDrop(mockEditor as unknown as Editor)
      )

      const event = createMockDragEvent('dragenter')

      act(() => {
        result.current.dropHandlers.onDragEnter(event)
      })

      expect(result.current.dropState.isOver).toBe(true)
      expect(result.current.dropState.isValid).toBe(true)
    })
  })

  describe('onDragLeave handler', () => {
    it('should reset drop state on drag leave', () => {
      const { result } = renderHook(() =>
        useCanvasDrop(mockEditor as unknown as Editor)
      )

      // First enter
      act(() => {
        result.current.dropHandlers.onDragEnter(createMockDragEvent('dragenter'))
      })

      expect(result.current.dropState.isOver).toBe(true)

      // Then leave (without related target in drop zone)
      const leaveEvent = createMockDragEvent('dragleave', {
        relatedTarget: document.body,
      })

      act(() => {
        result.current.dropHandlers.onDragLeave(leaveEvent)
      })

      expect(result.current.dropState.isOver).toBe(false)
      expect(result.current.dropState.isValid).toBe(false)
      expect(result.current.dropState.position).toBeNull()
    })
  })

  describe('onDrop handler', () => {
    it('should call onStrandDrop callback with strand data', () => {
      const onStrandDrop = vi.fn()

      const { result } = renderHook(() =>
        useCanvasDrop(mockEditor as unknown as Editor, onStrandDrop)
      )

      const event = createMockDragEvent('drop')

      act(() => {
        result.current.dropHandlers.onDrop(event)
      })

      expect(onStrandDrop).toHaveBeenCalled()
    })

    it('should create strand shape on drop', () => {
      const { result } = renderHook(() =>
        useCanvasDrop(mockEditor as unknown as Editor)
      )

      const event = createMockDragEvent('drop')

      act(() => {
        result.current.dropHandlers.onDrop(event)
      })

      expect(mockEditor.createShape).toHaveBeenCalled()
      expect(mockEditor.createShapes).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'shape-123',
            type: 'strand',
            props: expect.objectContaining({
              strandId: 'strand-1',
              title: 'Test Strand',
            }),
          }),
        ])
      )
    })

    it('should reset drop state after drop', () => {
      const { result } = renderHook(() =>
        useCanvasDrop(mockEditor as unknown as Editor)
      )

      // First set drop state
      act(() => {
        result.current.dropHandlers.onDragEnter(createMockDragEvent('dragenter'))
      })

      expect(result.current.dropState.isOver).toBe(true)

      // Then drop
      act(() => {
        result.current.dropHandlers.onDrop(createMockDragEvent('drop'))
      })

      expect(result.current.dropState.isOver).toBe(false)
      expect(result.current.dropState.isValid).toBe(false)
      expect(result.current.dropState.position).toBeNull()
    })

    it('should create loom shape for loom drop data', () => {
      const { result } = renderHook(() =>
        useCanvasDrop(mockEditor as unknown as Editor)
      )

      const loomData: StrandDropData = {
        type: 'loom',
        id: 'loom-1',
        path: '/weave/loom-1',
        title: 'Test Loom',
      }

      const event = createMockDragEvent('drop', {
        dataTransfer: {
          getData: vi.fn(() => JSON.stringify(loomData)),
          types: [CANVAS_DROP_MIME],
          dropEffect: 'none' as const,
          effectAllowed: 'uninitialized' as const,
          setData: vi.fn(),
          setDragImage: vi.fn(),
        } as unknown as DataTransfer,
      })

      act(() => {
        result.current.dropHandlers.onDrop(event)
      })

      expect(mockEditor.createShapes).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'loom',
            props: expect.objectContaining({
              loomId: 'loom-1',
              title: 'Test Loom',
            }),
          }),
        ])
      )
    })

    it('should create weave shape for weave drop data', () => {
      const { result } = renderHook(() =>
        useCanvasDrop(mockEditor as unknown as Editor)
      )

      const weaveData: StrandDropData = {
        type: 'weave',
        id: 'weave-1',
        path: '/weave-1',
        title: 'Test Weave',
      }

      const event = createMockDragEvent('drop', {
        dataTransfer: {
          getData: vi.fn(() => JSON.stringify(weaveData)),
          types: [CANVAS_DROP_MIME],
          dropEffect: 'none' as const,
          effectAllowed: 'uninitialized' as const,
          setData: vi.fn(),
          setDragImage: vi.fn(),
        } as unknown as DataTransfer,
      })

      act(() => {
        result.current.dropHandlers.onDrop(event)
      })

      expect(mockEditor.createShapes).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'weave',
            props: expect.objectContaining({
              weaveId: 'weave-1',
              title: 'Test Weave',
            }),
          }),
        ])
      )
    })
  })

  describe('without editor', () => {
    it('should not create shapes on drop without editor', () => {
      const onStrandDrop = vi.fn()

      const { result } = renderHook(() =>
        useCanvasDrop(null, onStrandDrop)
      )

      const event = createMockDragEvent('drop')

      act(() => {
        result.current.dropHandlers.onDrop(event)
      })

      expect(onStrandDrop).not.toHaveBeenCalled()
    })
  })
})

describe('useCanvasDragSource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return draggable props', () => {
    const data: StrandDropData = {
      type: 'strand',
      id: 'strand-1',
      path: '/path',
      title: 'Test',
    }

    const { result } = renderHook(() => useCanvasDragSource(data))

    expect(result.current.draggable).toBe(true)
    expect(result.current.onDragStart).toBeInstanceOf(Function)
  })

  it('should set drag data on drag start', () => {
    const data: StrandDropData = {
      type: 'strand',
      id: 'strand-1',
      path: '/path',
      title: 'Test',
    }

    const { result } = renderHook(() => useCanvasDragSource(data))

    const mockSetData = vi.fn()
    const mockSetDragImage = vi.fn()

    const event = {
      dataTransfer: {
        setData: mockSetData,
        effectAllowed: 'uninitialized' as const,
        setDragImage: mockSetDragImage,
      },
    } as unknown as React.DragEvent

    // Mock document methods
    const mockPreview = document.createElement('div')
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockReturnValue(mockPreview)
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockPreview)

    act(() => {
      result.current.onDragStart(event)
    })

    expect(mockSetData).toHaveBeenCalledWith(
      CANVAS_DROP_MIME,
      expect.any(String)
    )

    const calledData = JSON.parse(mockSetData.mock.calls[0][1])
    expect(calledData).toEqual(data)

    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })
})
