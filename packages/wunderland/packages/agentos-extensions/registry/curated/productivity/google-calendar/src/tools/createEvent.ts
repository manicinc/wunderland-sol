/**
 * @fileoverview ITool for creating a new calendar event.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { GoogleCalendarService } from '../GoogleCalendarService';

export class CalendarCreateEventTool implements ITool {
  public readonly id = 'calendarCreateEvent';
  public readonly name = 'calendarCreateEvent';
  public readonly displayName = 'Create Calendar Event';
  public readonly description =
    'Create a new calendar event with a summary, start/end times, optional description, location, and attendees.';
  public readonly category = 'productivity';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = true;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['summary', 'start', 'end'] as const,
    properties: {
      calendarId: {
        type: 'string',
        description: 'Calendar ID to create the event in (defaults to "primary")',
      },
      summary: {
        type: 'string',
        description: 'Event title/summary',
      },
      start: {
        type: 'string',
        description: 'Start datetime in ISO 8601 format (e.g. "2025-01-15T09:00:00-05:00")',
      },
      end: {
        type: 'string',
        description: 'End datetime in ISO 8601 format (e.g. "2025-01-15T10:00:00-05:00")',
      },
      description: {
        type: 'string',
        description: 'Event description or notes',
      },
      location: {
        type: 'string',
        description: 'Event location (address or place name)',
      },
      attendees: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of attendee email addresses',
      },
      timeZone: {
        type: 'string',
        description: 'IANA time zone (e.g. "America/New_York"). Applied to start/end if not embedded.',
      },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      event: { type: 'object', description: 'The created event' },
    },
  };

  constructor(private readonly service: GoogleCalendarService) {}

  async execute(
    args: {
      calendarId?: string;
      summary: string;
      start: string;
      end: string;
      description?: string;
      location?: string;
      attendees?: string[];
      timeZone?: string;
    },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      const event = await this.service.createEvent(args.calendarId ?? 'primary', {
        summary: args.summary,
        description: args.description,
        location: args.location,
        start: { dateTime: args.start, timeZone: args.timeZone },
        end: { dateTime: args.end, timeZone: args.timeZone },
        attendees: args.attendees?.map((email) => ({ email })),
      });

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
            attendees: event.attendees?.map((a) => a.email),
          },
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!args.summary || typeof args.summary !== 'string') {
      errors.push('summary is required and must be a string');
    }
    if (!args.start) {
      errors.push('start is required');
    } else if (isNaN(Date.parse(args.start))) {
      errors.push('start must be a valid ISO 8601 date string');
    }
    if (!args.end) {
      errors.push('end is required');
    } else if (isNaN(Date.parse(args.end))) {
      errors.push('end must be a valid ISO 8601 date string');
    }
    if (args.attendees && !Array.isArray(args.attendees)) {
      errors.push('attendees must be an array of email strings');
    }
    return { isValid: errors.length === 0, errors };
  }
}
