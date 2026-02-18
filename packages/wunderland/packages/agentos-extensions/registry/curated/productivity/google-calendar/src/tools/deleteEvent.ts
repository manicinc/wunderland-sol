/**
 * @fileoverview ITool for deleting a calendar event by ID.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { GoogleCalendarService } from '../GoogleCalendarService';

export class CalendarDeleteEventTool implements ITool {
  public readonly id = 'calendarDeleteEvent';
  public readonly name = 'calendarDeleteEvent';
  public readonly displayName = 'Delete Calendar Event';
  public readonly description = 'Delete a calendar event by its event ID.';
  public readonly category = 'productivity';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = true;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['eventId'] as const,
    properties: {
      calendarId: {
        type: 'string',
        description: 'Calendar ID containing the event (defaults to "primary")',
      },
      eventId: {
        type: 'string',
        description: 'ID of the event to delete',
      },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      deleted: { type: 'boolean', description: 'Whether the event was successfully deleted' },
      eventId: { type: 'string', description: 'ID of the deleted event' },
    },
  };

  constructor(private readonly service: GoogleCalendarService) {}

  async execute(
    args: { calendarId?: string; eventId: string },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      await this.service.deleteEvent(args.calendarId ?? 'primary', args.eventId);

      return {
        success: true,
        output: { deleted: true, eventId: args.eventId },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!args.eventId || typeof args.eventId !== 'string') {
      errors.push('eventId is required and must be a string');
    }
    return { isValid: errors.length === 0, errors };
  }
}
