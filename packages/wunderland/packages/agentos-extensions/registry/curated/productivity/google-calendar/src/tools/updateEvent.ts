/**
 * @fileoverview ITool for updating an existing calendar event.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { GoogleCalendarService } from '../GoogleCalendarService';

export class CalendarUpdateEventTool implements ITool {
  public readonly id = 'calendarUpdateEvent';
  public readonly name = 'calendarUpdateEvent';
  public readonly displayName = 'Update Calendar Event';
  public readonly description =
    'Update an existing calendar event. Only provided fields are modified; others remain unchanged.';
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
        description: 'ID of the event to update',
      },
      summary: {
        type: 'string',
        description: 'Updated event title/summary',
      },
      start: {
        type: 'string',
        description: 'Updated start datetime in ISO 8601 format',
      },
      end: {
        type: 'string',
        description: 'Updated end datetime in ISO 8601 format',
      },
      description: {
        type: 'string',
        description: 'Updated event description',
      },
      location: {
        type: 'string',
        description: 'Updated event location',
      },
      timeZone: {
        type: 'string',
        description: 'IANA time zone for start/end (e.g. "America/New_York")',
      },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      event: { type: 'object', description: 'The updated event' },
    },
  };

  constructor(private readonly service: GoogleCalendarService) {}

  async execute(
    args: {
      calendarId?: string;
      eventId: string;
      summary?: string;
      start?: string;
      end?: string;
      description?: string;
      location?: string;
      timeZone?: string;
    },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      const updates: Record<string, any> = {};

      if (args.summary !== undefined) updates.summary = args.summary;
      if (args.description !== undefined) updates.description = args.description;
      if (args.location !== undefined) updates.location = args.location;
      if (args.start !== undefined) {
        updates.start = { dateTime: args.start, timeZone: args.timeZone };
      }
      if (args.end !== undefined) {
        updates.end = { dateTime: args.end, timeZone: args.timeZone };
      }

      const event = await this.service.updateEvent(
        args.calendarId ?? 'primary',
        args.eventId,
        updates,
      );

      return {
        success: true,
        output: {
          event: {
            id: event.id,
            summary: event.summary,
            start: event.start.dateTime ?? event.start.date,
            end: event.end.dateTime ?? event.end.date,
            location: event.location,
            htmlLink: event.htmlLink,
          },
        },
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
    if (args.start && isNaN(Date.parse(args.start))) {
      errors.push('start must be a valid ISO 8601 date string');
    }
    if (args.end && isNaN(Date.parse(args.end))) {
      errors.push('end must be a valid ISO 8601 date string');
    }
    return { isValid: errors.length === 0, errors };
  }
}
