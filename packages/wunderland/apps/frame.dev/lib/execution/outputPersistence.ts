/**
 * Output persistence utilities
 * Save execution results back into markdown as output blocks
 *
 * @module execution/outputPersistence
 */

import type { ExecutionResult, ExecutionLanguage, ExecutionMeta } from './types'

/**
 * Format output block for markdown
 */
export function formatOutputBlock(
  output: string[],
  meta: ExecutionMeta
): string {
  const outputContent = output.join('\n')
  const metaJson = JSON.stringify(meta)

  return `
\`\`\`output
${outputContent}
\`\`\`
<!-- exec-meta: ${metaJson} -->
`.trim()
}

/**
 * Find the end position of a code block by its exec-id
 * Returns the position after the closing fence
 */
function findCodeBlockEnd(
  markdown: string,
  execId: string
): number | null {
  // Build a regex to find the code block with this exec-id
  // The exec-id should be in the meta string after the language
  const codeBlockPattern = /```(\w+)\s+exec\b[^\n]*\n([\s\S]*?)```/g

  let match
  let blockIndex = 0

  while ((match = codeBlockPattern.exec(markdown)) !== null) {
    const generatedExecId = `exec-${blockIndex}`

    if (generatedExecId === execId) {
      // Found the block - return position after closing fence
      return match.index + match[0].length
    }

    blockIndex++
  }

  return null
}

/**
 * Remove existing output block after a code block
 * Returns the markdown with the old output removed
 */
function removeExistingOutput(
  markdown: string,
  insertPosition: number
): { markdown: string; position: number } {
  // Check if there's an existing output block after this position
  const afterBlock = markdown.slice(insertPosition)

  // Match output block with optional meta comment
  const outputPattern = /^\s*\n```output\n[\s\S]*?```\n(?:<!--\s*exec-meta:[^>]*-->\s*)?/

  const outputMatch = afterBlock.match(outputPattern)

  if (outputMatch) {
    // Remove the existing output block
    const newMarkdown =
      markdown.slice(0, insertPosition) +
      markdown.slice(insertPosition + outputMatch[0].length)

    return { markdown: newMarkdown, position: insertPosition }
  }

  return { markdown, position: insertPosition }
}

/**
 * Insert output block after a code block in markdown
 *
 * @param markdown - The full markdown content
 * @param execId - The execution ID (e.g., "exec-0")
 * @param result - The execution result
 * @returns Updated markdown with output block inserted
 */
export function insertOutputBlock(
  markdown: string,
  execId: string,
  result: ExecutionResult
): string {
  // Find the code block with this exec-id
  const insertPosition = findCodeBlockEnd(markdown, execId)

  if (insertPosition === null) {
    console.warn(`Could not find code block with exec-id: ${execId}`)
    return markdown
  }

  // Remove any existing output block first
  const { markdown: cleanedMarkdown, position } = removeExistingOutput(
    markdown,
    insertPosition
  )

  // Create output block
  const meta: ExecutionMeta = {
    lang: result.language || ('javascript' as ExecutionLanguage),
    timestamp: new Date().toISOString(),
    duration: result.duration || 0,
    success: result.success,
    exitCode: result.exitCode,
  }

  const outputBlock = formatOutputBlock(result.output, meta)

  // Insert the output block
  return (
    cleanedMarkdown.slice(0, position) +
    '\n\n' +
    outputBlock +
    '\n' +
    cleanedMarkdown.slice(position)
  )
}

/**
 * Extract output blocks from markdown
 * Returns array of { execId, output, meta } objects
 */
export function extractOutputBlocks(
  markdown: string
): Array<{ execId: string; output: string[]; meta: ExecutionMeta }> {
  const results: Array<{ execId: string; output: string[]; meta: ExecutionMeta }> = []

  // Pattern to match output blocks with meta comments
  const pattern = /```output\n([\s\S]*?)```\n<!--\s*exec-meta:\s*(\{[\s\S]*?\})\s*-->/g

  let match
  let outputIndex = 0

  while ((match = pattern.exec(markdown)) !== null) {
    try {
      const outputContent = match[1].trim()
      const meta = JSON.parse(match[2]) as ExecutionMeta

      results.push({
        execId: `exec-${outputIndex}`,
        output: outputContent.split('\n'),
        meta,
      })

      outputIndex++
    } catch {
      // Invalid JSON in meta, skip
    }
  }

  return results
}

/**
 * Clear all output blocks from markdown
 */
export function clearAllOutputBlocks(markdown: string): string {
  // Remove output blocks with meta comments
  return markdown.replace(
    /\n*```output\n[\s\S]*?```\n<!--\s*exec-meta:[^>]*-->\s*/g,
    ''
  )
}
