/**
 * Node Configuration Parsing and Management
 * @module codex/lib/nodeConfig
 * 
 * @remarks
 * Handles parsing of weave.yaml and loom.yaml configuration files.
 * These YAML files define visual styling, metadata, and structure
 * for weave and loom nodes in the knowledge tree.
 */

import type { NodeVisualStyle, KnowledgeTreeNode } from '../types'
import { REPO_CONFIG } from '../constants'

/**
 * Weave configuration schema (weave.yaml)
 */
export interface WeaveConfig {
  /** Display name (overrides folder name) */
  name?: string
  /** Short description */
  description?: string
  /** Visual styling */
  style?: NodeVisualStyle
  /** Metadata */
  metadata?: {
    /** Author or maintainer */
    author?: string
    /** Creation date */
    created?: string
    /** Last updated date */
    updated?: string
    /** Tags for categorization */
    tags?: string[]
    /** License */
    license?: string
  }
  /** Ordering hint (lower = earlier) */
  order?: number
  /** Whether this weave is featured/highlighted */
  featured?: boolean
  /** Whether this weave is hidden from navigation */
  hidden?: boolean
}

/**
 * Loom configuration schema (loom.yaml)
 */
export interface LoomConfig {
  /** Display name (overrides folder name) */
  name?: string
  /** Short description */
  description?: string
  /** Visual styling */
  style?: NodeVisualStyle
  /** Metadata */
  metadata?: {
    /** Author or maintainer */
    author?: string
    /** Difficulty level */
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    /** Estimated reading time (minutes) */
    estimatedTime?: number
    /** Tags for categorization */
    tags?: string[]
  }
  /** Ordering hint (lower = earlier) */
  order?: number
  /** Whether this loom is hidden from navigation */
  hidden?: boolean
}

/**
 * Draft state for unsaved changes
 */
export interface NodeConfigDraft {
  /** Original config (from YAML) */
  original: WeaveConfig | LoomConfig | null
  /** Current edited config */
  edited: WeaveConfig | LoomConfig
  /** Whether there are unsaved changes */
  isDirty: boolean
  /** Path to the config file */
  configPath: string
  /** Node type */
  nodeType: 'weave' | 'loom'
  /** Last modified timestamp */
  lastModified: number
}

// Local storage key for drafts
const DRAFTS_STORAGE_KEY = 'codex-node-config-drafts'

/**
 * Parse YAML content to config object
 */
export function parseYamlConfig(content: string): WeaveConfig | LoomConfig {
  // Simple YAML parser for common cases
  // For production, use a full YAML library like js-yaml
  const config: Record<string, unknown> = {}
  const lines = content.split('\n')
  let currentKey = ''
  let currentIndent = 0
  let currentObject: Record<string, unknown> = config
  const objectStack: Array<{ obj: Record<string, unknown>; indent: number }> = [{ obj: config, indent: 0 }]
  
  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) continue
    
    // Count leading spaces
    const indent = line.search(/\S/)
    const trimmed = line.trim()
    
    // Handle indent changes
    if (indent < currentIndent) {
      while (objectStack.length > 1 && objectStack[objectStack.length - 1].indent >= indent) {
        objectStack.pop()
      }
      currentObject = objectStack[objectStack.length - 1].obj
    }
    currentIndent = indent
    
    // Parse key: value
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim()
      const value = trimmed.slice(colonIdx + 1).trim()
      
      if (value === '' || value === '|' || value === '>') {
        // Nested object or multiline string
        const newObj: Record<string, unknown> = {}
        currentObject[key] = newObj
        objectStack.push({ obj: newObj, indent: indent + 2 })
        currentObject = newObj
        currentKey = key
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array
        const items = value.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''))
        currentObject[key] = items.filter(s => s)
      } else if (value === 'true') {
        currentObject[key] = true
      } else if (value === 'false') {
        currentObject[key] = false
      } else if (!isNaN(Number(value))) {
        currentObject[key] = Number(value)
      } else {
        // String value (remove quotes if present)
        currentObject[key] = value.replace(/^['"]|['"]$/g, '')
      }
    } else if (trimmed.startsWith('- ')) {
      // Array item
      const value = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, '')
      const parentObj = objectStack[objectStack.length - 2]?.obj || config
      if (currentKey && Array.isArray(parentObj[currentKey])) {
        (parentObj[currentKey] as unknown[]).push(value)
      } else if (currentKey) {
        parentObj[currentKey] = [value]
      }
    }
  }
  
  return config as WeaveConfig | LoomConfig
}

/**
 * Serialize config object to YAML string
 */
export function serializeConfigToYaml(config: WeaveConfig | LoomConfig): string {
  const lines: string[] = []
  
  function serializeValue(value: unknown, indent: number): void {
    const prefix = '  '.repeat(indent)
    
    if (value === null || value === undefined) return
    
    if (Array.isArray(value)) {
      value.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          lines.push(`${prefix}-`)
          Object.entries(item).forEach(([k, v]) => {
            if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
              lines.push(`${prefix}  ${k}:`)
              serializeValue(v, indent + 2)
            } else {
              lines.push(`${prefix}  ${k}: ${formatScalar(v)}`)
            }
          })
        } else {
          lines.push(`${prefix}- ${formatScalar(item)}`)
        }
      })
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([k, v]) => {
        if (v === null || v === undefined) return
        
        if (typeof v === 'object' && !Array.isArray(v)) {
          lines.push(`${prefix}${k}:`)
          serializeValue(v, indent + 1)
        } else if (Array.isArray(v)) {
          lines.push(`${prefix}${k}:`)
          serializeValue(v, indent + 1)
        } else {
          lines.push(`${prefix}${k}: ${formatScalar(v)}`)
        }
      })
    }
  }
  
  function formatScalar(value: unknown): string {
    if (typeof value === 'string') {
      // Quote strings with special characters
      if (value.includes(':') || value.includes('#') || value.includes('\n') || 
          value.startsWith(' ') || value.endsWith(' ')) {
        return `"${value.replace(/"/g, '\\"')}"`
      }
      return value
    }
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (typeof value === 'number') return String(value)
    return String(value)
  }
  
  serializeValue(config, 0)
  return lines.join('\n')
}

/**
 * Fetch and parse a node config file (weave.yaml or loom.yaml)
 */
export async function fetchNodeConfig(
  nodePath: string,
  nodeType: 'weave' | 'loom'
): Promise<{ config: WeaveConfig | LoomConfig; exists: boolean }> {
  const configFileName = nodeType === 'weave' ? 'weave.yaml' : 'loom.yaml'
  const configPath = `${nodePath}/${configFileName}`
  
  try {
    const url = `https://raw.githubusercontent.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/${REPO_CONFIG.BRANCH}/${configPath}`
    const response = await fetch(url)
    
    if (!response.ok) {
      // Config file doesn't exist, return empty config
      return { config: {}, exists: false }
    }
    
    const content = await response.text()
    const config = parseYamlConfig(content)
    
    return { config, exists: true }
  } catch (error) {
    console.warn(`Failed to fetch ${configFileName} for ${nodePath}:`, error)
    return { config: {}, exists: false }
  }
}

/**
 * Save a draft config to local storage
 */
export function saveDraft(
  nodePath: string,
  nodeType: 'weave' | 'loom',
  original: WeaveConfig | LoomConfig | null,
  edited: WeaveConfig | LoomConfig
): void {
  const drafts = getDrafts()
  const configFileName = nodeType === 'weave' ? 'weave.yaml' : 'loom.yaml'
  
  drafts[nodePath] = {
    original,
    edited,
    isDirty: JSON.stringify(original) !== JSON.stringify(edited),
    configPath: `${nodePath}/${configFileName}`,
    nodeType,
    lastModified: Date.now(),
  }
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts))
  }
}

/**
 * Get all drafts from local storage
 */
export function getDrafts(): Record<string, NodeConfigDraft> {
  if (typeof localStorage === 'undefined') return {}
  
  try {
    const stored = localStorage.getItem(DRAFTS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Get a specific draft
 */
export function getDraft(nodePath: string): NodeConfigDraft | null {
  const drafts = getDrafts()
  return drafts[nodePath] || null
}

/**
 * Delete a draft
 */
export function deleteDraft(nodePath: string): void {
  const drafts = getDrafts()
  delete drafts[nodePath]
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts))
  }
}

/**
 * Check if a node has unsaved changes
 */
export function hasDraft(nodePath: string): boolean {
  const draft = getDraft(nodePath)
  return draft?.isDirty ?? false
}

/**
 * Get all dirty drafts (nodes with unsaved changes)
 */
export function getDirtyDrafts(): NodeConfigDraft[] {
  const drafts = getDrafts()
  return Object.values(drafts).filter(draft => draft.isDirty)
}

/**
 * Apply config to a KnowledgeTreeNode
 */
export function applyConfigToNode(
  node: KnowledgeTreeNode,
  config: WeaveConfig | LoomConfig
): KnowledgeTreeNode {
  return {
    ...node,
    style: config.style,
    description: config.description,
  }
}

/**
 * Create a default config for a new weave
 */
export function createDefaultWeaveConfig(name: string): WeaveConfig {
  return {
    name: name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: '',
    style: {
      icon: 'Layers',
    },
    metadata: {
      created: new Date().toISOString().split('T')[0],
    },
    order: 0,
    featured: false,
    hidden: false,
  }
}

/**
 * Create a default config for a new loom
 */
export function createDefaultLoomConfig(name: string): LoomConfig {
  return {
    name: name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: '',
    style: {
      icon: 'Box',
    },
    metadata: {
      difficulty: 'beginner',
    },
    order: 0,
    hidden: false,
  }
}


















