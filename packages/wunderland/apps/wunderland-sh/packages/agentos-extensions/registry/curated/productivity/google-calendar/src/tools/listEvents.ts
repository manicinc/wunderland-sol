/**
 * @fileoverview ITool for listing upcoming calendar events within a time range.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { GoogleCalendarService } from '../GoogleCalendarService';

export class CalendarListEventsTool implements ITool {
  public readonly id = 'calendarListEvents';
  public readonly name = 'calendarListEvents';
  public readonly displayName = 'List Calendar Events';
  public readonly description =
    'List upcoming calendar events within a time range. Returns event summaries, times, locations, and attendees.';
  public readonly category = 'productivity';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = false;

  public readonly inputSchema = {
    type: 'object' as const,
    required: [] as const,
    properties: {
      calendarId: {
        type: 'string',
        description: 'Calendar ID to query (defaults to "primary")',
      },
      timeMin: {
        type: 'string',
        description: 'Start of time range in ISO 8601 format (e.g. "2025-01-15T09:00:00Z")',
      },
      timeMax: {
        type: 'string',
        description: 'End of time range in ISO 8601 format (e.g. "2025-01-15T17:00:00Z")',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of events to return (default 10, max 250)',
      },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      events: {
        type: 'array',
        description: 'List of calendar events',
      },
      count: {
        type: 'number',
        description: 'Number of events returned',
      },
    },
  };

  constructor(private readonly service: GoogleCalendarService) {}

  async execute(
    args: { calendarId?: string; timeMin?: string; timeMax?: string; maxResults?: number },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      const maxResults = Math.min(args.maxResults ?? 10, 250);

      const events = await this.service.listEvents(
        args.calendarId ?? 'primary',
        args.timeMin,
        args.timeMax,
        maxResults,
      );

      return {
        success: true,
        output: {
          events: events.map((e) => ({
            id: e.id,
            summary: e.summary,
            start: e.start.dateTime ?? e.start.date,
            end: e.end.dateTime ?? e.end.date,
            location: e.location,
            status: e.status,
            attendees: e.attendees?.map((a) => a.email),
            htmlLink: e.htmlLink,
          })),
          count: events.length,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (args.timeMin && isNaN(Date.parse(args.timeMin))) {
      errors.push('timeMin must be a valid ISO 8601 date string');
    }
    if (args.timeMax && isNaN(Date.parse(args.timeMax))) {
      errors.push('timeMax must be a valid ISO 8601 date string');
    }
    if (args.maxResults !== undefined && (typeof args.maxResults !== 'number' || args.maxResults < 1)) {
      errors.push('maxResults must be a positive number');
    }
    return { isValid: errors.length === 0, errors };
  }
}
