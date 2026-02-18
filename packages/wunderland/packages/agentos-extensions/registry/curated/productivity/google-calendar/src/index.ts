/**
 * @fileoverview Google Calendar Extension for AgentOS.
 *
 * Provides OAuth2-authenticated Google Calendar integration with tools
 * for event CRUD, calendar listing, and free/busy availability queries.
 *
 * @module @framers/agentos-ext-calendar-google
 */

import type { ExtensionContext, ExtensionPack } from '@framers/agentos';
import { GoogleCalendarService, type GoogleCalendarConfig } from './GoogleCalendarService';
import { CalendarListEventsTool } from './tools/listEvents';
import { CalendarCreateEventTool } from './tools/createEvent';
import { CalendarUpdateEventTool } from './tools/updateEvent';
import { CalendarDeleteEventTool } from './tools/deleteEvent';
import { CalendarFindFreeTimeTool } from './tools/findFreeTime';
import { CalendarListCalendarsTool } from './tools/listCalendars';

export interface GoogleCalendarOptions {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessToken?: string;
  priority?: number;
}

function resolveSecret(
  key: string,
  options: GoogleCalendarOptions & { secrets?: Record<string, string> },
  envVars: string[],
): string {
  // 1. Explicit option
  const optionValue = (options as any)[key];
  if (optionValue) return optionValue;

  // 2. Secrets map from registry
  const secretKey = `google.${key}`;
  if (options.secrets?.[secretKey]) return options.secrets[secretKey];

  // 3. Environment variable fallback
  for (const envName of envVars) {
    if (process.env[envName]) return process.env[envName]!;
  }

  throw new Error(
    `Google Calendar ${key} not found. Provide via options.${key}, secrets["${secretKey}"], or one of [${envVars.join(', ')}] env vars.`,
  );
}

export function createExtensionPack(context: ExtensionContext): ExtensionPack {
  const options = (context.options ?? {}) as GoogleCalendarOptions & { secrets?: Record<string, string> };

  const clientId = resolveSecret('clientId', options, ['GOOGLE_CLIENT_ID']);
  const clientSecret = resolveSecret('clientSecret', options, ['GOOGLE_CLIENT_SECRET']);
  const refreshToken = resolveSecret('refreshToken', options, ['GOOGLE_REFRESH_TOKEN']);

  const config: GoogleCalendarConfig = {
    clientId,
    clientSecret,
    refreshToken,
    accessToken: options.accessToken,
  };

  const service = new GoogleCalendarService(config);

  const listEventsTool = new CalendarListEventsTool(service);
  const createEventTool = new CalendarCreateEventTool(service);
  const updateEventTool = new CalendarUpdateEventTool(service);
  const deleteEventTool = new CalendarDeleteEventTool(service);
  const findFreeTimeTool = new CalendarFindFreeTimeTool(service);
  const listCalendarsTool = new CalendarListCalendarsTool(service);

  const priority = options.priority ?? 50;

  return {
    name: '@framers/agentos-ext-calendar-google',
    version: '0.1.0',
    descriptors: [
      { id: 'calendarListEvents', kind: 'tool', priority, payload: listEventsTool },
      { id: 'calendarCreateEvent', kind: 'tool', priority, payload: createEventTool },
      { id: 'calendarUpdateEvent', kind: 'tool', priority, payload: updateEventTool },
      { id: 'calendarDeleteEvent', kind: 'tool', priority, payload: deleteEventTool },
      { id: 'calendarFindFreeTime', kind: 'tool', priority, payload: findFreeTimeTool },
      { id: 'calendarListCalendars', kind: 'tool', priority, payload: listCalendarsTool },
      { id: 'googleCalendarService', kind: 'productivity', priority, payload: service },
    ],
    onActivate: async () => {
      await service.initialize();
      context.logger?.info('[GoogleCalendar] Extension activated');
    },
    onDeactivate: async () => {
      await service.shutdown();
      context.logger?.info('[GoogleCalendar] Extension deactivated');
    },
  };
}

export {
  GoogleCalendarService,
  CalendarListEventsTool,
  CalendarCreateEventTool,
  CalendarUpdateEventTool,
  CalendarDeleteEventTool,
  CalendarFindFreeTimeTool,
  CalendarListCalendarsTool,
};
export type { GoogleCalendarConfig, CalendarEvent, CalendarInfo, FreeBusySlot, CreateEventInput, UpdateEventInput } from './GoogleCalendarService';
export default createExtensionPack;
