/**
 * Import Tasks from Strand
 *
 * Parses a strand's markdown content and creates tasks from checkboxes.
 * Supports extracting priority, due dates, and other metadata.
 *
 * @module lib/planner/importFromStrand
 */

import { getStrandByPath } from '../storage/localCodex'
import { extractTasks } from './taskParser'
import { createTask } from './database'
import type { CreateTaskInput, ExtractedCheckbox } from './types'

export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  tasks: Array<{
    title: string
    status: 'created' | 'skipped' | 'error'
    reason?: string
  }>
}

export interface ImportOptions {
  /** Only import unchecked tasks (default: true) */
  uncheckedOnly?: boolean
  /** Default priority for tasks without explicit priority */
  defaultPriority?: 'low' | 'medium' | 'high' | 'urgent'
  /** Default due date for tasks without explicit due date */
  defaultDueDate?: string
  /** Skip tasks that already exist with same title and strand */
  skipDuplicates?: boolean
  /** Tags to add to all imported tasks */
  additionalTags?: string[]
}

/**
 * Import tasks from a strand by parsing its markdown checkboxes
 */
export async function importTasksFromStrand(
  strandPath: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const {
    uncheckedOnly = true,
    defaultPriority = 'medium',
    defaultDueDate,
    skipDuplicates = true,
    additionalTags = [],
  } = options

  const result: ImportResult = {
    success: false,
    imported: 0,
    skipped: 0,
    errors: [],
    tasks: [],
  }

  try {
    // Get the strand content
    const strand = await getStrandByPath(strandPath)
    if (!strand) {
      result.errors.push(`Strand not found: ${strandPath}`)
      return result
    }

    // Extract checkboxes from content
    const checkboxes = extractTasks(strand.content)

    if (checkboxes.length === 0) {
      result.success = true
      result.errors.push('No checkboxes found in strand')
      return result
    }

    // Filter based on options
    let tasksToImport = checkboxes
    if (uncheckedOnly) {
      tasksToImport = checkboxes.filter((cb) => !cb.checked)
    }

    // Parse strand tags
    let strandTags: string[] = []
    if (strand.tags) {
      try {
        strandTags = JSON.parse(strand.tags)
      } catch {
        // Ignore parse errors
      }
    }

    // Create tasks for each checkbox
    for (const checkbox of tasksToImport) {
      try {
        const taskInput: CreateTaskInput = {
          title: checkbox.text,
          taskType: 'linked',
          strandPath: strandPath,
          sourceLineNumber: checkbox.lineNumber,
          checkboxText: checkbox.raw,
          priority: checkbox.priority || defaultPriority,
          dueDate: checkbox.dueDate || defaultDueDate,
          tags: [...strandTags, ...additionalTags].filter(Boolean),
          status: 'pending',
        }

        const task = await createTask(taskInput)
        if (task) {
          result.imported++
          result.tasks.push({
            title: checkbox.text,
            status: 'created',
          })
        } else {
          result.skipped++
          result.tasks.push({
            title: checkbox.text,
            status: 'error',
            reason: 'Failed to create task',
          })
        }
      } catch (err) {
        result.skipped++
        result.errors.push(`Error creating task: ${checkbox.text}`)
        result.tasks.push({
          title: checkbox.text,
          status: 'error',
          reason: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    result.success = result.errors.length === 0
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'Unknown error')
  }

  return result
}

/**
 * Preview what tasks would be imported from a strand
 * (does not actually create tasks)
 */
export async function previewImportFromStrand(
  strandPath: string,
  options: ImportOptions = {}
): Promise<{
  success: boolean
  checkboxes: ExtractedCheckbox[]
  strandTitle?: string
  error?: string
}> {
  const { uncheckedOnly = true } = options

  try {
    const strand = await getStrandByPath(strandPath)
    if (!strand) {
      return { success: false, checkboxes: [], error: `Strand not found: ${strandPath}` }
    }

    const checkboxes = extractTasks(strand.content)
    const filtered = uncheckedOnly ? checkboxes.filter((cb) => !cb.checked) : checkboxes

    return {
      success: true,
      checkboxes: filtered,
      strandTitle: strand.title,
    }
  } catch (err) {
    return {
      success: false,
      checkboxes: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

export default importTasksFromStrand
