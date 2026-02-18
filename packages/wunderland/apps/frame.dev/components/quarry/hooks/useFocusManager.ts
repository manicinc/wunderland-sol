/**
 * Focus Management System
 * @module codex/hooks/useFocusManager
 * 
 * @remarks
 * Manages focus state across the entire application:
 * - Focus zones (regions that can be navigated)
 * - Focus context (what type of element is focused)
 * - Focus history (for Esc to go back)
 * - Tabindex management
 * - ARIA roles and states
 */

import { useState, useEffect, useRef, useCallback } from 'react'

export type FocusZone = 
  | 'sidebar'           // File tree navigation
  | 'content'          // Main content area
  | 'metadata'         // Right panel
  | 'toolbar'          // Top toolbar buttons
  | 'search'           // Search input
  | 'modal'            // Any modal dialog
  | 'editor'           // WYSIWYG editor
  | 'form'             // Form inputs
  | 'dropdown'         // Dropdown menus
  | 'tabs'             // Tab navigation

export type FocusContext = {
  zone: FocusZone
  element: HTMLElement | null
  index: number
  parentZone?: FocusZone
  metadata?: {
    modalId?: string
    formId?: string
    dropdownId?: string
    tabGroup?: string
  }
}

export interface FocusManagerState {
  /** Current focus context */
  current: FocusContext
  /** History stack for Esc navigation */
  history: FocusContext[]
  /** Available zones in current view */
  availableZones: FocusZone[]
  /** Whether focus is locked (e.g., in modal) */
  isLocked: boolean
  /** Current navigation mode */
  mode: 'normal' | 'insert' | 'command'
}

/**
 * Comprehensive focus management hook
 */
export function useFocusManager() {
  const [state, setState] = useState<FocusManagerState>({
    current: {
      zone: 'content',
      element: null,
      index: 0,
    },
    history: [],
    availableZones: ['sidebar', 'content', 'toolbar'],
    isLocked: false,
    mode: 'normal',
  })

  const zoneRefs = useRef<Map<FocusZone, HTMLElement[]>>(new Map())

  /**
   * Register a focusable element in a zone
   */
  const registerElement = useCallback((zone: FocusZone, element: HTMLElement) => {
    const elements = zoneRefs.current.get(zone) || []
    if (!elements.includes(element)) {
      elements.push(element)
      zoneRefs.current.set(zone, elements)
      
      // Set proper ARIA attributes
      element.setAttribute('data-focus-zone', zone)
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '-1')
      }
    }
  }, [])

  /**
   * Unregister an element
   */
  const unregisterElement = useCallback((zone: FocusZone, element: HTMLElement) => {
    const elements = zoneRefs.current.get(zone) || []
    const index = elements.indexOf(element)
    if (index > -1) {
      elements.splice(index, 1)
      zoneRefs.current.set(zone, elements)
    }
  }, [])

  /**
   * Focus a specific zone
   */
  const focusZone = useCallback((zone: FocusZone, index: number = 0) => {
    const elements = zoneRefs.current.get(zone) || []
    if (elements.length === 0) return

    // Push current to history
    setState(prev => ({
      ...prev,
      history: [...prev.history, prev.current],
      current: {
        zone,
        element: elements[index] || elements[0],
        index: Math.min(index, elements.length - 1),
      },
    }))

    // Actually focus the element
    const targetElement = elements[index] || elements[0]
    targetElement.focus()
    targetElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])

  /**
   * Navigate within current zone
   */
  const navigateInZone = useCallback((direction: 'next' | 'prev' | 'first' | 'last') => {
    const { zone, index } = state.current
    const elements = zoneRefs.current.get(zone) || []
    if (elements.length === 0) return

    let newIndex = index
    switch (direction) {
      case 'next':
        newIndex = (index + 1) % elements.length
        break
      case 'prev':
        newIndex = (index - 1 + elements.length) % elements.length
        break
      case 'first':
        newIndex = 0
        break
      case 'last':
        newIndex = elements.length - 1
        break
    }

    setState(prev => ({
      ...prev,
      current: {
        ...prev.current,
        index: newIndex,
        element: elements[newIndex],
      },
    }))

    elements[newIndex].focus()
    elements[newIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [state.current])

  /**
   * Navigate between zones
   */
  const navigateToZone = useCallback((direction: 'next' | 'prev' | 'left' | 'right') => {
    const { availableZones } = state
    const currentZoneIndex = availableZones.indexOf(state.current.zone)
    
    let targetZone: FocusZone | null = null

    // Spatial navigation
    if (direction === 'left') {
      if (state.current.zone === 'content') targetZone = 'sidebar'
      else if (state.current.zone === 'metadata') targetZone = 'content'
    } else if (direction === 'right') {
      if (state.current.zone === 'sidebar') targetZone = 'content'
      else if (state.current.zone === 'content') targetZone = 'metadata'
    } else {
      // Cycle through zones
      const increment = direction === 'next' ? 1 : -1
      const newIndex = (currentZoneIndex + increment + availableZones.length) % availableZones.length
      targetZone = availableZones[newIndex]
    }

    if (targetZone && targetZone !== state.current.zone) {
      focusZone(targetZone, 0)
    }
  }, [state, focusZone])

  /**
   * Go back in history (Esc key behavior)
   */
  const goBack = useCallback(() => {
    if (state.history.length === 0) return

    const previous = state.history[state.history.length - 1]
    setState(prev => ({
      ...prev,
      current: previous,
      history: prev.history.slice(0, -1),
    }))

    if (previous.element) {
      previous.element.focus()
    }
  }, [state.history])

  /**
   * Enter a modal (locks focus)
   */
  const enterModal = useCallback((modalId: string, modalElement: HTMLElement) => {
    setState(prev => ({
      ...prev,
      history: [...prev.history, prev.current],
      current: {
        zone: 'modal',
        element: modalElement,
        index: 0,
        metadata: { modalId },
      },
      isLocked: true,
    }))
  }, [])

  /**
   * Exit modal
   */
  const exitModal = useCallback(() => {
    goBack()
    setState(prev => ({
      ...prev,
      isLocked: false,
    }))
  }, [goBack])

  /**
   * Switch mode (normal/insert/command)
   */
  const setMode = useCallback((mode: 'normal' | 'insert' | 'command') => {
    setState(prev => ({
      ...prev,
      mode,
    }))
  }, [])

  /**
   * Global keyboard handler
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in insert mode (typing)
      if (state.mode === 'insert') {
        if (e.key === 'Escape') {
          setMode('normal')
          e.preventDefault()
        }
        return
      }

      // Tab navigation
      if (e.key === 'Tab') {
        e.preventDefault()
        if (e.shiftKey) {
          navigateInZone('prev')
        } else {
          navigateInZone('next')
        }
      }

      // Zone navigation
      else if (e.key === 'F6') {
        e.preventDefault()
        navigateToZone(e.shiftKey ? 'prev' : 'next')
      }

      // Arrow key navigation
      else if (!state.isLocked) {
        switch (e.key) {
          case 'ArrowLeft':
            if (e.ctrlKey || e.metaKey) {
              navigateToZone('left')
            }
            break
          case 'ArrowRight':
            if (e.ctrlKey || e.metaKey) {
              navigateToZone('right')
            }
            break
        }
      }

      // Escape to go back
      if (e.key === 'Escape') {
        e.preventDefault()
        goBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state, navigateInZone, navigateToZone, goBack, setMode])

  return {
    state,
    registerElement,
    unregisterElement,
    focusZone,
    navigateInZone,
    navigateToZone,
    enterModal,
    exitModal,
    setMode,
    goBack,
  }
}

/**
 * Hook to register an element in a focus zone
 */
export function useFocusZone(zone: FocusZone, elementRef: React.RefObject<HTMLElement>) {
  const { registerElement, unregisterElement } = useFocusManager()

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    registerElement(zone, element)
    return () => unregisterElement(zone, element)
  }, [zone, elementRef, registerElement, unregisterElement])
}
