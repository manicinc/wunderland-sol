/**
 * Block Tags API
 * @module api/blocks/tags
 *
 * POST /api/blocks/tags - Tag CRUD operations (accept, reject, add, remove)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getBlockById,
  updateBlockTags,
  acceptSuggestedTag,
  rejectSuggestedTag,
} from '@/lib/blockDatabase'

export const runtime = 'nodejs'

// ============================================================================
// POST /api/blocks/tags
// ============================================================================

type TagAction = 'accept' | 'reject' | 'add' | 'remove'

interface TagRequest {
  action: TagAction
  strandPath: string
  blockId: string
  tag: string
}

/**
 * POST /api/blocks/tags
 *
 * Perform tag operations on a block:
 * - accept: Move a suggested tag to accepted tags
 * - reject: Remove a suggested tag
 * - add: Add a new tag (manual)
 * - remove: Remove an accepted tag
 *
 * @example
 * ```typescript
 * // Accept a suggested tag
 * await fetch('/api/blocks/tags', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     action: 'accept',
 *     strandPath: 'weaves/wiki/strands/intro.md',
 *     blockId: 'heading-introduction',
 *     tag: 'react'
 *   })
 * })
 *
 * // Add a new tag manually
 * await fetch('/api/blocks/tags', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     action: 'add',
 *     strandPath: 'weaves/wiki/strands/intro.md',
 *     blockId: 'heading-introduction',
 *     tag: 'my-custom-tag'
 *   })
 * })
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    const body: TagRequest = await request.json()
    const { action, strandPath, blockId, tag } = body

    // Validate required fields
    if (!action || !strandPath || !blockId || !tag) {
      return NextResponse.json(
        { error: 'action, strandPath, blockId, and tag are all required' },
        { status: 400 }
      )
    }

    // Validate action
    const validActions: TagAction[] = ['accept', 'reject', 'add', 'remove']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    // Get current block state
    const block = await getBlockById(strandPath, blockId)
    if (!block) {
      return NextResponse.json(
        { error: `Block not found: ${strandPath}/${blockId}` },
        { status: 404 }
      )
    }

    // Perform the action
    switch (action) {
      case 'accept': {
        // Check if tag exists in suggested tags
        const hasSuggestion = block.suggestedTags.some((st) => st.tag === tag)
        if (!hasSuggestion) {
          return NextResponse.json(
            { error: `Tag "${tag}" is not in suggested tags` },
            { status: 400 }
          )
        }
        await acceptSuggestedTag(strandPath, blockId, tag)
        break
      }

      case 'reject': {
        // Check if tag exists in suggested tags
        const hasSuggestion = block.suggestedTags.some((st) => st.tag === tag)
        if (!hasSuggestion) {
          return NextResponse.json(
            { error: `Tag "${tag}" is not in suggested tags` },
            { status: 400 }
          )
        }
        await rejectSuggestedTag(strandPath, blockId, tag)
        break
      }

      case 'add': {
        // Check if tag already exists
        if (block.tags.includes(tag)) {
          return NextResponse.json(
            { error: `Tag "${tag}" already exists on this block` },
            { status: 400 }
          )
        }
        await updateBlockTags(strandPath, blockId, [...block.tags, tag])
        break
      }

      case 'remove': {
        // Check if tag exists
        if (!block.tags.includes(tag)) {
          return NextResponse.json(
            { error: `Tag "${tag}" does not exist on this block` },
            { status: 400 }
          )
        }
        await updateBlockTags(
          strandPath,
          blockId,
          block.tags.filter((t) => t !== tag)
        )
        break
      }
    }

    // Return updated block
    const updatedBlock = await getBlockById(strandPath, blockId)

    return NextResponse.json({
      success: true,
      action,
      tag,
      block: updatedBlock,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API] Block tags operation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform tag operation' },
      { status: 500 }
    )
  }
}
