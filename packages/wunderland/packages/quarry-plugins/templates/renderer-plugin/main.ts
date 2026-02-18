/**
 * Renderer Plugin Template for Quarry
 *
 * This is a starting point for creating custom markdown renderers.
 * The example shows how to create a custom syntax: [[wiki-link]]
 */

import React from 'react'

// ============================================================================
// TYPES
// ============================================================================

interface RendererProps {
  match: RegExpMatchArray
  api: any
  content: string
}

// ============================================================================
// BASE CLASS (included for standalone development)
// ============================================================================

class QuarryPlugin {
  manifest: any
  api: any
  context: any
  async onLoad() {}
  async onUnload() {}
  protected log(message: string) {
    console.log(`[${this.manifest?.name}] ${message}`)
  }
}

// ============================================================================
// RENDERER COMPONENT
// ============================================================================

/**
 * Example: Wiki-style link renderer
 * Syntax: [[page-name]] or [[page-name|display text]]
 */
function WikiLinkRenderer({ match, api }: RendererProps) {
  const settings = api.getContext().settings || {}

  // Parse the match
  // match[0] = full match "[[page-name|display]]"
  // match[1] = capture group "page-name|display"
  const inner = match[1] || ''
  const parts = inner.split('|')
  const pageName = parts[0].trim()
  const displayText = parts[1]?.trim() || pageName

  // Handle click
  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    api.navigateTo(`/${pageName}`)
  }

  // Style variants
  const styleClasses = {
    default: 'text-blue-500 hover:text-blue-600 hover:underline',
    minimal: 'text-inherit underline decoration-dotted',
    fancy: 'text-purple-500 hover:text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-1 rounded',
  }

  const style = settings.style || 'default'
  const className = styleClasses[style as keyof typeof styleClasses] || styleClasses.default

  if (!settings.enableFeature) {
    // Feature disabled, show plain text
    return <span>{displayText}</span>
  }

  return (
    <a
      href={`/${pageName}`}
      onClick={handleClick}
      className={`wiki-link ${className} cursor-pointer`}
      title={`Navigate to ${pageName}`}
    >
      {displayText}
    </a>
  )
}

// ============================================================================
// PLUGIN CLASS
// ============================================================================

class MyRendererPlugin extends QuarryPlugin {
  async onLoad() {
    // Register the markdown renderer
    // Pattern matches [[content]] with optional |display text
    this.api.registerMarkdownRenderer({
      pattern: /\[\[([^\]]+)\]\]/g,
      component: WikiLinkRenderer,
      priority: 10, // Higher priority = processed first
    })

    // Register a command to insert wiki link syntax
    this.api.registerCommand({
      id: 'my-renderer:insert-wiki-link',
      name: 'Insert Wiki Link',
      callback: () => {
        this.api.showNotice('Use [[page-name]] or [[page-name|display text]] syntax', 'info')
      },
    })

    this.log('My Renderer Plugin loaded!')
  }

  async onUnload() {
    this.log('My Renderer Plugin unloaded')
  }

  onSettingsChange(key: string, value: any) {
    this.log(`Setting changed: ${key} = ${value}`)
  }
}

export default MyRendererPlugin
