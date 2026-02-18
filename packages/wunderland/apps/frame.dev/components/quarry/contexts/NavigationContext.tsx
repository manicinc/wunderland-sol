/**
 * Navigation Context Provider
 * @module codex/contexts/NavigationContext
 * 
 * @remarks
 * Global navigation state management
 * Coordinates between keyboard, mouse, and programmatic navigation
 */

'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useFocusManager } from '../hooks/useFocusManager'

export interface NavigationState {
  // Current focus
  focusedElement: HTMLElement | null
  focusedZone: string
  focusedIndex: number
  
  // Navigation mode
  mode: 'browse' | 'search' | 'edit' | 'command'
  
  // UI state
  sidebarOpen: boolean
  metadataOpen: boolean
  activeModal: string | null
  
  // Selection state
  selectedFileIndex: number
  selectedHeadingIndex: number
  selectedSearchResultIndex: number
  
  // Form state
  activeFormField: string | null
  formMode: 'navigate' | 'fill'
  
  // Dropdown state
  activeDropdown: string | null
  dropdownIndex: number
}

export interface NavigationContextValue {
  state: NavigationState
  
  // Mode switching
  enterSearchMode: () => void
  enterEditMode: () => void
  enterBrowseMode: () => void
  enterCommandMode: () => void
  
  // Navigation actions
  navigateFiles: (direction: 'up' | 'down') => void
  navigateHeadings: (direction: 'up' | 'down') => void
  navigateSearchResults: (direction: 'up' | 'down') => void
  
  // Focus actions
  focusSearch: () => void
  focusEditor: () => void
  focusSidebar: () => void
  focusContent: () => void
  focusMetadata: () => void
  
  // Modal management
  openModal: (modalId: string) => void
  closeModal: () => void
  
  // Form navigation
  navigateForm: (direction: 'next' | 'prev' | 'submit') => void
  enterFormField: (fieldId: string) => void
  exitFormField: () => void
  
  // Dropdown navigation
  openDropdown: (dropdownId: string) => void
  closeDropdown: () => void
  navigateDropdown: (direction: 'up' | 'down' | 'select') => void
}

const NavigationContext = createContext<NavigationContextValue | null>(null)

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}

interface NavigationProviderProps {
  children: React.ReactNode
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const focusManager = useFocusManager()
  
  const [state, setState] = useState<NavigationState>({
    focusedElement: null,
    focusedZone: 'content',
    focusedIndex: 0,
    mode: 'browse',
    sidebarOpen: true,
    metadataOpen: false,
    activeModal: null,
    selectedFileIndex: 0,
    selectedHeadingIndex: 0,
    selectedSearchResultIndex: 0,
    activeFormField: null,
    formMode: 'navigate',
    activeDropdown: null,
    dropdownIndex: 0,
  })

  // Track form fields
  const formFieldsRef = useRef<Map<string, HTMLElement[]>>(new Map())
  const dropdownItemsRef = useRef<Map<string, HTMLElement[]>>(new Map())

  /**
   * Enter search mode
   */
  const enterSearchMode = useCallback(() => {
    setState(prev => ({ ...prev, mode: 'search' }))
    focusManager.setMode('insert')
    
    // Focus search input
    const searchInput = document.querySelector('input[role="searchbox"]') as HTMLInputElement
    if (searchInput) {
      searchInput.focus()
      searchInput.select()
    }
  }, [focusManager])

  /**
   * Enter edit mode
   */
  const enterEditMode = useCallback(() => {
    setState(prev => ({ ...prev, mode: 'edit' }))
    focusManager.setMode('insert')
  }, [focusManager])

  /**
   * Enter browse mode
   */
  const enterBrowseMode = useCallback(() => {
    setState(prev => ({ ...prev, mode: 'browse' }))
    focusManager.setMode('normal')
    
    // Blur any active input
    const activeElement = document.activeElement as HTMLElement
    if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
      activeElement.blur()
    }
  }, [focusManager])

  /**
   * Navigate files in sidebar
   */
  const navigateFiles = useCallback((direction: 'up' | 'down') => {
    const fileElements = document.querySelectorAll('[data-file-item]')
    const currentIndex = state.selectedFileIndex
    const newIndex = direction === 'up' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(fileElements.length - 1, currentIndex + 1)
    
    setState(prev => ({ ...prev, selectedFileIndex: newIndex }))
    
    // Focus and scroll to element
    const targetElement = fileElements[newIndex] as HTMLElement
    if (targetElement) {
      targetElement.focus()
      targetElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [state.selectedFileIndex])

  /**
   * Focus search
   */
  const focusSearch = useCallback(() => {
    enterSearchMode()
  }, [enterSearchMode])

  /**
   * Navigate form fields
   */
  const navigateForm = useCallback((direction: 'next' | 'prev' | 'submit') => {
    if (!state.activeFormField) return
    
    const fields = formFieldsRef.current.get(state.activeFormField) || []
    const currentField = document.activeElement as HTMLElement
    const currentIndex = fields.indexOf(currentField)
    
    if (direction === 'submit') {
      // Find and click submit button
      const form = currentField.closest('form')
      const submitButton = form?.querySelector('[type="submit"]') as HTMLButtonElement
      submitButton?.click()
      return
    }
    
    const newIndex = direction === 'next'
      ? (currentIndex + 1) % fields.length
      : (currentIndex - 1 + fields.length) % fields.length
    
    const targetField = fields[newIndex]
    if (targetField) {
      targetField.focus()
      if ('select' in targetField) {
        (targetField as HTMLInputElement).select()
      }
    }
  }, [state.activeFormField])

  /**
   * Open dropdown
   */
  const openDropdown = useCallback((dropdownId: string) => {
    setState(prev => ({ 
      ...prev, 
      activeDropdown: dropdownId,
      dropdownIndex: 0 
    }))
    
    // Focus first item
    const items = dropdownItemsRef.current.get(dropdownId) || []
    if (items[0]) {
      items[0].focus()
    }
  }, [])

  /**
   * Navigate dropdown items
   */
  const navigateDropdown = useCallback((direction: 'up' | 'down' | 'select') => {
    if (!state.activeDropdown) return
    
    const items = dropdownItemsRef.current.get(state.activeDropdown) || []
    if (items.length === 0) return
    
    if (direction === 'select') {
      const currentItem = items[state.dropdownIndex] as HTMLElement
      currentItem?.click()
      setState(prev => ({ ...prev, activeDropdown: null }))
      return
    }
    
    const newIndex = direction === 'down'
      ? Math.min(items.length - 1, state.dropdownIndex + 1)
      : Math.max(0, state.dropdownIndex - 1)
    
    setState(prev => ({ ...prev, dropdownIndex: newIndex }))
    items[newIndex]?.focus()
  }, [state.activeDropdown, state.dropdownIndex])

  /**
   * Global keyboard handler
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Mode switching
      if (e.key === 'Escape') {
        if (state.mode !== 'browse') {
          enterBrowseMode()
          e.preventDefault()
          return
        }
      }

      // Quick actions from browse mode
      if (state.mode === 'browse') {
        switch (e.key) {
          case '/':
            e.preventDefault()
            focusSearch()
            break
          case 'i':
            e.preventDefault()
            enterEditMode()
            break
        }
      }

      // Tab navigation in forms
      if (state.activeFormField && e.key === 'Tab') {
        e.preventDefault()
        navigateForm(e.shiftKey ? 'prev' : 'next')
      }

      // Enter to submit forms
      if (state.activeFormField && e.key === 'Enter' && !e.shiftKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          navigateForm('submit')
        }
      }

      // Dropdown navigation
      if (state.activeDropdown) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            navigateDropdown('down')
            break
          case 'ArrowUp':
            e.preventDefault()
            navigateDropdown('up')
            break
          case 'Enter':
          case ' ':
            e.preventDefault()
            navigateDropdown('select')
            break
          case 'Escape':
            e.preventDefault()
            setState(prev => ({ ...prev, activeDropdown: null }))
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [state, enterBrowseMode, focusSearch, enterEditMode, navigateForm, navigateDropdown])

  /**
   * Navigate headings in content
   */
  const navigateHeadings = useCallback((direction: 'up' | 'down') => {
    const headingElements = document.querySelectorAll('[data-heading-item]')
    const currentIndex = state.selectedHeadingIndex
    const newIndex = direction === 'up'
      ? Math.max(0, currentIndex - 1)
      : Math.min(headingElements.length - 1, currentIndex + 1)
    
    setState(prev => ({ ...prev, selectedHeadingIndex: newIndex }))
    
    // Focus and scroll to element
    const targetElement = headingElements[newIndex] as HTMLElement
    if (targetElement) {
      targetElement.focus()
      targetElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [state.selectedHeadingIndex])

  /**
   * Navigate search results
   */
  const navigateSearchResults = useCallback((direction: 'up' | 'down') => {
    const resultElements = document.querySelectorAll('[data-search-result]')
    const currentIndex = state.selectedSearchResultIndex
    const newIndex = direction === 'up'
      ? Math.max(0, currentIndex - 1)
      : Math.min(resultElements.length - 1, currentIndex + 1)
    
    setState(prev => ({ ...prev, selectedSearchResultIndex: newIndex }))
    
    // Focus and scroll to element
    const targetElement = resultElements[newIndex] as HTMLElement
    if (targetElement) {
      targetElement.focus()
      targetElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [state.selectedSearchResultIndex])

  /**
   * Focus editor
   */
  const focusEditor = useCallback(() => {
    const editorElement = document.querySelector('[data-wysiwyg-editor]') as HTMLElement
    if (editorElement) {
      editorElement.focus()
      enterEditMode()
    }
  }, [enterEditMode])

  const value: NavigationContextValue = {
    state,
    enterSearchMode,
    enterEditMode,
    enterBrowseMode,
    enterCommandMode: () => setState(prev => ({ ...prev, mode: 'command' })),
    navigateFiles,
    navigateHeadings,
    navigateSearchResults,
    focusSearch,
    focusEditor,
    focusSidebar: () => focusManager.focusZone('sidebar'),
    focusContent: () => focusManager.focusZone('content'),
    focusMetadata: () => focusManager.focusZone('metadata'),
    openModal: (modalId) => setState(prev => ({ ...prev, activeModal: modalId })),
    closeModal: () => setState(prev => ({ ...prev, activeModal: null })),
    navigateForm,
    enterFormField: (fieldId) => setState(prev => ({ 
      ...prev, 
      activeFormField: fieldId,
      formMode: 'fill' 
    })),
    exitFormField: () => setState(prev => ({ 
      ...prev, 
      activeFormField: null,
      formMode: 'navigate' 
    })),
    openDropdown,
    closeDropdown: () => setState(prev => ({ ...prev, activeDropdown: null })),
    navigateDropdown,
  }

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}
