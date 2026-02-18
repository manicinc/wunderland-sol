/**
 * @fileoverview ITool for listing the user's available calendars.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { GoogleCalendarService } from '../GoogleCalendarService';

export class CalendarListCalendarsTool implements ITool {
  public readonly id = 'calendarListCalendars';
  public readonly name = 'calendarListCalendars';
  public readonly displayName = 'List Calendars';
  public readonly description =
    'List all calendars accessible to the authenticated user, including their IDs, names, and time zones.';
  public readonly category = 'productivity';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = false;

  public readonly inputSchema = {
    type: 'object' as const,
    required: [] as const,
    properties: {},
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      calendars: {
        type: 'array',
        description: 'List of accessible calendars',
      },
      count: {
        type: 'number',
        description: 'Number of calendars',
      },
    },
  };

  constructor(private readonly service: GoogleCalendarService) {}

  async execute(
    _args: Record<string, never>,
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      const calendars = await this.service.listCalendars();

      return {
        success: true,
        output: {
          calendars: calendars.map((c) => ({
            id: c.id,
            name: c.summary,
            description: c.description,
            timeZone: c.timeZone,
            primary: c.primary,
          })),
          count: calendars.length,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(_args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    // No required arguments
    return { isValid: true };
  }
}
