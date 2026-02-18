/**
 * Collections API - File-based persistence for collections
 * @module api/collections
 *
 * REST endpoints for managing strand collections.
 * Persists to public/data/collections.json for static builds.
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// Path to collections data file
const COLLECTIONS_FILE = path.join(process.cwd(), 'public/data/collections.json')

/** Collection metadata interface */
interface CollectionMetadata {
  id: string
  title: string
  description?: string
  icon?: string
  color?: string
  strandPaths: string[]
  loomSlugs?: string[]
  weaveSlugs?: string[]
  viewMode: 'cards' | 'grid' | 'list' | 'freeform' | 'canvas'
  positions?: Record<string, { x: number; y: number; width?: number; height?: number }>
  zoom?: number
  viewportCenter?: { x: number; y: number }
  connections?: Array<{
    source: string
    target: string
    type?: string
    label?: string
    discovered: boolean
  }>
  showDiscoveredConnections?: boolean
  pinned?: boolean
  sortOrder?: number
  createdAt: string
  updatedAt: string
  // System collections
  isSystem?: boolean
  systemType?: 'favorites' | 'recent' | 'inbox'
}

/** Create collection input */
interface CreateCollectionInput {
  title: string
  description?: string
  icon?: string
  color?: string
  strandPaths?: string[]
  viewMode?: CollectionMetadata['viewMode']
  // System collection fields (only allowed for isSystem: true)
  id?: string
  isSystem?: boolean
  systemType?: 'favorites' | 'recent' | 'inbox'
  sortOrder?: number
}

/** Update collection input */
interface UpdateCollectionInput {
  title?: string
  description?: string
  icon?: string
  color?: string
  strandPaths?: string[]
  viewMode?: CollectionMetadata['viewMode']
  pinned?: boolean
  sortOrder?: number
}

/**
 * Read collections from file
 */
async function readCollections(): Promise<CollectionMetadata[]> {
  try {
    const data = await fs.readFile(COLLECTIONS_FILE, 'utf-8')
    return JSON.parse(data) as CollectionMetadata[]
  } catch (error) {
    // File doesn't exist or is empty, return empty array
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    console.error('[Collections API] Error reading collections:', error)
    return []
  }
}

/**
 * Write collections to file
 */
async function writeCollections(collections: CollectionMetadata[]): Promise<void> {
  try {
    // Ensure directory exists
    const dir = path.dirname(COLLECTIONS_FILE)
    await fs.mkdir(dir, { recursive: true })
    
    // Write with pretty formatting
    await fs.writeFile(COLLECTIONS_FILE, JSON.stringify(collections, null, 2), 'utf-8')
  } catch (error) {
    console.error('[Collections API] Error writing collections:', error)
    throw error
  }
}

/**
 * Default color palette for new collections
 */
const DEFAULT_COLORS = [
  '#8b5cf6', // Violet
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#ef4444', // Red
  '#84cc16', // Lime
  '#0ea5e9', // Sky
]

/**
 * GET - List all collections or get one by ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    const collections = await readCollections()
    
    if (id) {
      const collection = collections.find(c => c.id === id)
      if (!collection) {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
      }
      return NextResponse.json(collection)
    }
    
    // Return all collections sorted by sortOrder, then pinned first
    const sorted = [...collections].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    })
    
    return NextResponse.json(sorted)
  } catch (error) {
    console.error('[Collections API] GET error:', error)
    return NextResponse.json({ error: 'Failed to load collections' }, { status: 500 })
  }
}

/**
 * POST - Create a new collection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateCollectionInput
    
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    
    const collections = await readCollections()
    const now = new Date().toISOString()

    // For system collections, use provided ID; otherwise generate
    const collectionId = body.isSystem && body.id ? body.id : uuidv4()

    // Check if system collection with this ID already exists
    if (body.isSystem && body.id) {
      const existing = collections.find(c => c.id === body.id)
      if (existing) {
        return NextResponse.json({ error: 'Collection already exists' }, { status: 409 })
      }
    }

    const newCollection: CollectionMetadata = {
      id: collectionId,
      title: body.title.trim(),
      description: body.description?.trim(),
      icon: body.icon,
      color: body.color || DEFAULT_COLORS[collections.length % DEFAULT_COLORS.length],
      strandPaths: body.strandPaths || [],
      viewMode: body.viewMode || 'cards',
      pinned: false,
      sortOrder: body.sortOrder ?? collections.length,
      createdAt: now,
      updatedAt: now,
      ...(body.isSystem && { isSystem: true }),
      ...(body.systemType && { systemType: body.systemType }),
    }

    collections.push(newCollection)
    await writeCollections(collections)
    
    return NextResponse.json(newCollection, { status: 201 })
  } catch (error) {
    console.error('[Collections API] POST error:', error)
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 })
  }
}

/**
 * PUT - Update an existing collection
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 })
    }
    
    const body = await request.json() as UpdateCollectionInput
    const collections = await readCollections()
    const index = collections.findIndex(c => c.id === id)
    
    if (index === -1) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Protect system collections from being renamed
    const existingCollection = collections[index]
    if (existingCollection.isSystem && body.title !== undefined && body.title.trim() !== existingCollection.title) {
      return NextResponse.json({ error: 'Cannot rename system collection' }, { status: 403 })
    }

    // Update only provided fields
    const updated: CollectionMetadata = {
      ...collections[index],
      ...(body.title !== undefined && { title: body.title.trim() }),
      ...(body.description !== undefined && { description: body.description?.trim() }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.strandPaths !== undefined && { strandPaths: body.strandPaths }),
      ...(body.viewMode !== undefined && { viewMode: body.viewMode }),
      ...(body.pinned !== undefined && { pinned: body.pinned }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      updatedAt: new Date().toISOString(),
    }
    
    collections[index] = updated
    await writeCollections(collections)
    
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[Collections API] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 })
  }
}

/**
 * DELETE - Remove a collection
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 })
    }
    
    const collections = await readCollections()
    const index = collections.findIndex(c => c.id === id)

    if (index === -1) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Protect system collections from deletion
    const collection = collections[index]
    if (collection.isSystem) {
      return NextResponse.json({ error: 'Cannot delete system collection' }, { status: 403 })
    }

    collections.splice(index, 1)
    await writeCollections(collections)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Collections API] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 })
  }
}

/**
 * PATCH - Partial update (add/remove strands, update positions, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const action = searchParams.get('action')
    
    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 })
    }
    
    const body = await request.json()
    const collections = await readCollections()
    const index = collections.findIndex(c => c.id === id)
    
    if (index === -1) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }
    
    const collection = collections[index]
    
    switch (action) {
      case 'add-strand': {
        const strandPath = body.strandPath as string
        if (!strandPath) {
          return NextResponse.json({ error: 'strandPath is required' }, { status: 400 })
        }
        if (!collection.strandPaths.includes(strandPath)) {
          collection.strandPaths.push(strandPath)
        }
        break
      }
      
      case 'remove-strand': {
        const strandPath = body.strandPath as string
        if (!strandPath) {
          return NextResponse.json({ error: 'strandPath is required' }, { status: 400 })
        }
        collection.strandPaths = collection.strandPaths.filter(p => p !== strandPath)
        // Also remove from positions
        if (collection.positions) {
          delete collection.positions[strandPath]
        }
        break
      }
      
      case 'update-position': {
        const { strandPath, position } = body as { strandPath: string; position: { x: number; y: number; width?: number; height?: number } }
        if (!strandPath || !position) {
          return NextResponse.json({ error: 'strandPath and position are required' }, { status: 400 })
        }
        collection.positions = {
          ...collection.positions,
          [strandPath]: position,
        }
        break
      }
      
      case 'update-positions': {
        const positions = body.positions as Record<string, { x: number; y: number; width?: number; height?: number }>
        if (!positions) {
          return NextResponse.json({ error: 'positions is required' }, { status: 400 })
        }
        collection.positions = {
          ...collection.positions,
          ...positions,
        }
        break
      }
      
      case 'toggle-pin': {
        collection.pinned = !collection.pinned
        break
      }
      
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
    
    collection.updatedAt = new Date().toISOString()
    collections[index] = collection
    await writeCollections(collections)
    
    return NextResponse.json(collection)
  } catch (error) {
    console.error('[Collections API] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 })
  }
}

