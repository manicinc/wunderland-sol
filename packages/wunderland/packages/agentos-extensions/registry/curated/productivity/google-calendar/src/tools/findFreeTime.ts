/**
 * @fileoverview ITool for finding available time slots across calendars.
 * Queries free/busy data and computes gaps of requested duration.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { GoogleCalendarService, FreeBusySlot } from '../GoogleCalendarService';

export class CalendarFindFreeTimeTool implements ITool {
  public readonly id = 'calendarFindFreeTime';
  public readonly name = 'calendarFindFreeTime';
  public readonly displayName = 'Find Free Time Slots';
  public readonly description =
    'Find available time slots across one or more calendars. Queries free/busy data and returns open slots of the requested duration.';
  public readonly category = 'productivity';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = false;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['timeMin', 'timeMax', 'durationMinutes'] as const,
    properties: {
      calendarIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Calendar IDs to check (defaults to ["primary"])',
      },
      timeMin: {
        type: 'string',
        description: 'Start of search window in ISO 8601 format',
      },
      timeMax: {
        type: 'string',
        description: 'End of search window in ISO 8601 format',
      },
      durationMinutes: {
        type: 'number',
        description: 'Minimum duration of free slot in minutes',
      },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      freeSlots: {
        type: 'array',
        description: 'Available time slots of the requested duration',
      },
      count: {
        type: 'number',
        description: 'Number of free slots found',
      },
    },
  };

  constructor(private readonly service: GoogleCalendarService) {}

  async execute(
    args: {
      calendarIds?: string[];
      timeMin: string;
      timeMax: string;
      durationMinutes: number;
    },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      const calendarIds = args.calendarIds?.length ? args.calendarIds : ['primary'];

      const busyData = await this.service.queryFreeBusy(
        calendarIds,
        args.timeMin,
        args.timeMax,
      );

      // Merge all busy slots from all calendars into a single sorted list
      const allBusySlots = this.mergeBusySlots(busyData, calendarIds);

      // Compute free slots between the busy periods
      const freeSlots = this.computeFreeSlots(
        allBusySlots,
        new Date(args.timeMin),
        new Date(args.timeMax),
        args.durationMinutes,
      );

      return {
        success: true,
        output: {
          freeSlots: freeSlots.map((slot) => ({
            start: slot.start,
            end: slot.end,
            durationMinutes: Math.round(
              (new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 60000,
            ),
          })),
          count: freeSlots.length,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!args.timeMin) {
      errors.push('timeMin is required');
    } else if (isNaN(Date.parse(args.timeMin))) {
      errors.push('timeMin must be a valid ISO 8601 date string');
    }
    if (!args.timeMax) {
      errors.push('timeMax is required');
    } else if (isNaN(Date.parse(args.timeMax))) {
      errors.push('timeMax must be a valid ISO 8601 date string');
    }
    if (args.durationMinutes === undefined || typeof args.durationMinutes !== 'number' || args.durationMinutes < 1) {
      errors.push('durationMinutes is required and must be a positive number');
    }
    if (args.calendarIds && !Array.isArray(args.calendarIds)) {
      errors.push('calendarIds must be an array of strings');
    }
    return { isValid: errors.length === 0, errors };
  }

  // ── Private helpers ──

  private mergeBusySlots(
    busyData: Record<string, FreeBusySlot[]>,
    calendarIds: string[],
  ): Array<{ start: number; end: number }> {
    const allSlots: Array<{ start: number; end: number }> = [];

    for (const calId of calendarIds) {
      const slots = busyData[calId] ?? [];
      for (const slot of slots) {
        allSlots.push({
          start: new Date(slot.start).getTime(),
          end: new Date(slot.end).getTime(),
        });
      }
    }

    // Sort by start time
    allSlots.sort((a, b) => a.start - b.start);

    // Merge overlapping slots
    const merged: Array<{ start: number; end: number }> = [];
    for (const slot of allSlots) {
      if (merged.length === 0 || slot.start > merged[merged.length - 1].end) {
        merged.push({ ...slot });
      } else {
        merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, slot.end);
      }
    }

    return merged;
  }

  private computeFreeSlots(
    busySlots: Array<{ start: number; end: number }>,
    windowStart: Date,
    windowEnd: Date,
    durationMinutes: number,
  ): FreeBusySlot[] {
    const requiredMs = durationMinutes * 60 * 1000;
    const freeSlots: FreeBusySlot[] = [];
    let cursor = windowStart.getTime();

    for (const busy of busySlots) {
      // Gap between cursor and next busy period
      if (busy.start > cursor) {
        const gapMs = busy.start - cursor;
        if (gapMs >= requiredMs) {
          freeSlots.push({
            start: new Date(cursor).toISOString(),
            end: new Date(busy.start).toISOString(),
          });
        }
      }
      cursor = Math.max(cursor, busy.end);
    }

    // Gap after last busy period to end of window
    const windowEndMs = windowEnd.getTime();
    if (windowEndMs > cursor) {
      const gapMs = windowEndMs - cursor;
      if (gapMs >= requiredMs) {
        freeSlots.push({
          start: new Date(cursor).toISOString(),
          end: new Date(windowEndMs).toISOString(),
        });
      }
    }

    return freeSlots;
  }
}
