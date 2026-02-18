/**
 * Oracle AI Assistant
 *
 * Natural language task management assistant for the planner.
 * Uses NLP (Compromise.js) or LLM (Claude/OpenAI) for understanding.
 *
 * @module lib/planner/oracle
 */

export * from './prompts'
export * from './actions'
export * from './nlpParser'
export * from './llmParser'
export * from './documentEnrichment'

import { useState, useCallback, useRef } from 'react'
import type { OracleAction, OracleActionResult } from './actions'
import { executeAction } from './actions'
import { getActionDescription } from './prompts'
import { getProjects } from '../projects'
import { parseNaturalLanguage, type ParsedTaskIntent } from './nlpParser'
import {
  parseWithLLM,
  generateResponse,
  getActiveLLMProvider,
  isLLMAvailable,
  getOracleConfig,
  type OracleLLMConfig,
} from './llmParser'
import {
  detectEnrichmentIntent,
  buildEnrichmentAction,
  executeEnrichmentAction,
  type EnrichmentActionType,
  type EnrichmentActionParams,
} from './documentEnrichment'

export interface OracleMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  action?: OracleAction
  actionResult?: OracleActionResult
  isLoading?: boolean
}

export interface UseOracleOptions {
  requireConfirmation?: boolean
  onActionComplete?: (result: OracleActionResult) => void
  /** Document context for enrichment actions */
  enrichmentContext?: EnrichmentActionParams
}

export interface UseOracleReturn {
  messages: OracleMessage[]
  isProcessing: boolean
  sendMessage: (content: string, overrideContext?: EnrichmentActionParams) => Promise<void>
  confirmAction: (messageId: string) => Promise<void>
  cancelAction: (messageId: string) => void
  clearMessages: () => void
  /** Update enrichment context (e.g., when navigating to a different strand) */
  setEnrichmentContext: (context: EnrichmentActionParams) => void
}

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Hook for using the Oracle assistant
 */
export function useOracle(options: UseOracleOptions = {}): UseOracleReturn {
  const { requireConfirmation = true, onActionComplete, enrichmentContext: initialContext } = options

  const [messages, setMessages] = useState<OracleMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [enrichmentContext, setEnrichmentContext] = useState<EnrichmentActionParams>(initialContext || {})
  const pendingActionsRef = useRef<Map<string, OracleAction>>(new Map())

  /**
   * Parse user message and determine action using NLP or LLM
   */
  const parseMessage = useCallback(async (content: string, enrichmentContext?: EnrichmentActionParams): Promise<{
    response: string
    action?: OracleAction
    provider: 'nlp' | 'claude' | 'openai' | 'enrichment'
  }> => {
    const today = new Date().toISOString().split('T')[0]
    const projects = getProjects()

    // Check for document enrichment intent first
    const enrichmentIntent = detectEnrichmentIntent(content)
    if (enrichmentIntent) {
      const action = buildEnrichmentAction(enrichmentIntent, enrichmentContext || {})
      const actionName = enrichmentIntent.replace(/_/g, ' ')
      return {
        response: `I'll ${actionName} for you.`,
        action: action as unknown as OracleAction,
        provider: 'enrichment',
      }
    }

    // Use LLM if available and enabled, otherwise use NLP
    const config = getOracleConfig()
    const useLLM = config.enabled && isLLMAvailable()

    let intent: ParsedTaskIntent

    if (useLLM) {
      intent = await parseWithLLM(content)
    } else {
      intent = await parseNaturalLanguage(content)
    }

    const provider = getActiveLLMProvider()

    // Convert parsed intent to action
    switch (intent.action) {
      case 'create': {
        if (!intent.title || intent.title.length < 2) {
          return {
            response: "I'd like to create a task, but I need more details. What would you like the task to be?",
            provider,
          }
        }

        // Try to match project by name
        let projectId: string | undefined = intent.project
        if (intent.project) {
          const matchedProject = projects.find(
            p => p.name.toLowerCase() === intent.project!.toLowerCase()
          )
          if (matchedProject) {
            projectId = matchedProject.id
          }
        }

        // Also check raw nouns for project matches
        if (!projectId && intent.rawEntities.nouns.length > 0) {
          for (const noun of intent.rawEntities.nouns) {
            const match = projects.find(
              p => p.name.toLowerCase() === noun.toLowerCase()
            )
            if (match) {
              projectId = match.id
              break
            }
          }
        }

        const params = {
          title: intent.title,
          description: intent.description,
          dueDate: intent.dueDate,
          dueTime: intent.dueTime,
          duration: intent.duration,
          priority: intent.priority || 'medium',
          project: projectId,
          tags: intent.tags,
          subtasks: intent.subtasks,
        }

        const projectName = projectId
          ? projects.find(p => p.id === projectId)?.name
          : undefined

        const response = buildCreateResponse(intent, projectName)

        return {
          response,
          action: {
            type: 'create_task',
            params,
            confirmation: getActionDescription('create_task', params),
            requiresConfirmation: true,
          },
          provider,
        }
      }

      case 'suggest': {
        return {
          response: "Let me check your tasks and suggest what to focus on...",
          action: {
            type: 'suggest_focus',
            params: {},
            confirmation: 'Analyze tasks and suggest focus',
            requiresConfirmation: false,
          },
          provider,
        }
      }

      case 'query': {
        // Handle queries about tasks
        if (content.toLowerCase().includes('free time') || content.toLowerCase().includes('when am i free')) {
          const duration = intent.duration || 60
          return {
            response: `Looking for ${duration} minutes of free time...`,
            action: {
              type: 'find_free_time',
              params: { date: intent.dueDate || today, duration },
              confirmation: `Find ${duration} minutes of free time`,
              requiresConfirmation: false,
            },
            provider,
          }
        }

        // Generic query - list tasks
        return {
          response: "Let me show you what you have coming up...",
          action: {
            type: 'suggest_focus',
            params: {},
            confirmation: 'Show task summary',
            requiresConfirmation: false,
          },
          provider,
        }
      }

      case 'schedule': {
        // Timebox day
        if (content.toLowerCase().includes('timebox') || content.toLowerCase().includes('my day')) {
          return {
            response: "I'll create a timeboxed schedule for your day.",
            action: {
              type: 'timebox_day',
              params: { date: intent.dueDate || today },
              confirmation: 'Create timeboxed schedule',
              requiresConfirmation: true,
            },
            provider,
          }
        }

        return {
          response: `I can help you schedule tasks${intent.dueDate ? ` for ${intent.dueDate}` : ''}. Please specify which task you'd like to schedule.`,
          provider,
        }
      }

      case 'complete': {
        return {
          response: "I can mark a task as complete. Which task would you like to complete?",
          provider,
        }
      }

      case 'delete': {
        return {
          response: "I can delete a task. Which task would you like to remove?",
          provider,
        }
      }

      case 'update': {
        return {
          response: "I can update a task. Which task would you like to modify, and what changes should I make?",
          provider,
        }
      }

      default: {
        // Low confidence or unknown intent - show help
        const helpMessage = `I'm your task management assistant. Here's what I can help with:

• **Create tasks**: "Add review quarterly report for tomorrow at 2pm"
• **Natural scheduling**: "I need to finish the proposal by Friday"
• **Timebox**: "Timebox my day" - creates a scheduled timeline
• **Focus**: "What should I work on?" - suggests priorities
• **Free time**: "When am I free for 2 hours?"

${provider !== 'nlp' ? `_Using ${provider === 'claude' ? 'Claude AI' : 'OpenAI'} for understanding_` : '_Using local NLP_'}

How can I help you?`

        return {
          response: helpMessage,
          provider,
        }
      }
    }
  }, [requireConfirmation])

  /**
   * Build a natural response for task creation
   */
  function buildCreateResponse(intent: ParsedTaskIntent, projectName?: string): string {
    const parts: string[] = [`I'll create a task "${intent.title}"`]

    if (intent.dueDate) {
      const dateStr = formatDateForDisplay(intent.dueDate)
      parts.push(`due ${dateStr}`)
    }

    if (intent.dueTime) {
      parts.push(`at ${formatTimeForDisplay(intent.dueTime)}`)
    }

    if (intent.duration) {
      parts.push(`(${formatDuration(intent.duration)})`)
    }

    if (projectName) {
      parts.push(`in ${projectName}`)
    }

    if (intent.priority && intent.priority !== 'medium') {
      parts.push(`with ${intent.priority} priority`)
    }

    if (intent.subtasks && intent.subtasks.length > 0) {
      parts.push(`with ${intent.subtasks.length} subtask${intent.subtasks.length > 1 ? 's' : ''}`)
    }

    return parts.join(' ') + '.'
  }

  /**
   * Format date for display
   */
  function formatDateForDisplay(isoDate: string): string {
    const date = new Date(isoDate)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (isoDate === today.toISOString().split('T')[0]) {
      return 'today'
    }
    if (isoDate === tomorrow.toISOString().split('T')[0]) {
      return 'tomorrow'
    }

    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  /**
   * Format time for display
   */
  function formatTimeForDisplay(time: string): string {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return minutes === 0 ? `${displayHours} ${period}` : `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  /**
   * Format duration for display
   */
  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
    return `${hours}h ${mins}m`
  }

  /**
   * Send a message to Oracle
   */
  const sendMessage = useCallback(async (content: string, overrideContext?: EnrichmentActionParams) => {
    if (!content.trim()) return

    setIsProcessing(true)

    // Add user message
    const userMessage: OracleMessage = {
      id: generateMessageId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Parse and generate response, using enrichment context
    const contextToUse = overrideContext || enrichmentContext
    const { response, action } = await parseMessage(content, contextToUse)

    const assistantMessage: OracleMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
      action,
    }

    // If action doesn't require confirmation, execute immediately
    if (action && !action.requiresConfirmation) {
      const result = await executeAction(action)
      assistantMessage.actionResult = result

      if (result.success && action.type === 'suggest_focus') {
        assistantMessage.content = result.message
      }

      onActionComplete?.(result)
    } else if (action) {
      // Store pending action for confirmation
      pendingActionsRef.current.set(assistantMessage.id, action)
    }

    setMessages((prev) => [...prev, assistantMessage])
    setIsProcessing(false)
  }, [parseMessage, onActionComplete])

  /**
   * Confirm a pending action
   */
  const confirmAction = useCallback(async (messageId: string) => {
    const action = pendingActionsRef.current.get(messageId)
    if (!action) return

    // Update message to show loading
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, isLoading: true } : m
      )
    )

    // Execute action
    const result = await executeAction(action)

    // Update message with result
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              isLoading: false,
              actionResult: result,
              content: result.success
                ? `✓ ${result.message}`
                : `✗ ${result.message}`,
            }
          : m
      )
    )

    pendingActionsRef.current.delete(messageId)
    onActionComplete?.(result)
  }, [onActionComplete])

  /**
   * Cancel a pending action
   */
  const cancelAction = useCallback((messageId: string) => {
    pendingActionsRef.current.delete(messageId)

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, action: undefined, content: m.content + '\n\n_Action cancelled._' }
          : m
      )
    )
  }, [])

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([])
    pendingActionsRef.current.clear()
  }, [])

  return {
    messages,
    isProcessing,
    sendMessage,
    confirmAction,
    cancelAction,
    clearMessages,
    setEnrichmentContext,
  }
}
