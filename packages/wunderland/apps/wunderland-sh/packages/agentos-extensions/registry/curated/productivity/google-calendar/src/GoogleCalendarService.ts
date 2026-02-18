/**
 * @fileoverview Google Calendar SDK wrapper using googleapis.
 * Handles OAuth2 lifecycle, event CRUD, calendar listing, and free/busy queries.
 */

// ── Types ──

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  status?: string;
  htmlLink?: string;
  created?: string;
  updated?: string;
}

export interface CalendarInfo {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  primary?: boolean;
}

export interface FreeBusySlot {
  start: string;
  end: string;
}

export interface CreateEventInput {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string }>;
}

export interface UpdateEventInput {
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string }>;
}

// ── Service ──

export class GoogleCalendarService {
  private oauth2Client: any = null;
  private calendarClient: any = null;
  private initialized = false;
  private readonly config: GoogleCalendarConfig;

  constructor(config: GoogleCalendarConfig) {
    this.config = config;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const { google } = await import('googleapis');

    this.oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
    );

    this.oauth2Client.setCredentials({
      refresh_token: this.config.refreshToken,
      access_token: this.config.accessToken,
    });

    this.calendarClient = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    this.oauth2Client = null;
    this.calendarClient = null;
    this.initialized = false;
  }

  async refreshAccessToken(): Promise<string> {
    this.ensureInitialized();
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    this.oauth2Client.setCredentials(credentials);
    return credentials.access_token;
  }

  // ── Event CRUD ──

  async listEvents(
    calendarId: string = 'primary',
    timeMin?: string,
    timeMax?: string,
    maxResults: number = 10,
  ): Promise<CalendarEvent[]> {
    this.ensureInitialized();

    const params: Record<string, any> = {
      calendarId,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    };

    if (timeMin) params.timeMin = timeMin;
    if (timeMax) params.timeMax = timeMax;

    const response = await this.calendarClient.events.list(params);
    const items: any[] = response.data.items ?? [];

    return items.map((item) => this.mapEvent(item));
  }

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    this.ensureInitialized();

    const response = await this.calendarClient.events.get({
      calendarId,
      eventId,
    });

    return this.mapEvent(response.data);
  }

  async createEvent(calendarId: string, event: CreateEventInput): Promise<CalendarEvent> {
    this.ensureInitialized();

    const response = await this.calendarClient.events.insert({
      calendarId,
      requestBody: {
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: event.start,
        end: event.end,
        attendees: event.attendees,
      },
    });

    return this.mapEvent(response.data);
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    updates: UpdateEventInput,
  ): Promise<CalendarEvent> {
    this.ensureInitialized();

    const requestBody: Record<string, any> = {};
    if (updates.summary !== undefined) requestBody.summary = updates.summary;
    if (updates.description !== undefined) requestBody.description = updates.description;
    if (updates.location !== undefined) requestBody.location = updates.location;
    if (updates.start !== undefined) requestBody.start = updates.start;
    if (updates.end !== undefined) requestBody.end = updates.end;
    if (updates.attendees !== undefined) requestBody.attendees = updates.attendees;

    const response = await this.calendarClient.events.patch({
      calendarId,
      eventId,
      requestBody,
    });

    return this.mapEvent(response.data);
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    this.ensureInitialized();

    await this.calendarClient.events.delete({
      calendarId,
      eventId,
    });
  }

  // ── Calendar listing ──

  async listCalendars(): Promise<CalendarInfo[]> {
    this.ensureInitialized();

    const response = await this.calendarClient.calendarList.list();
    const items: any[] = response.data.items ?? [];

    return items.map((item) => ({
      id: item.id,
      summary: item.summary ?? '',
      description: item.description,
      timeZone: item.timeZone,
      primary: item.primary ?? false,
    }));
  }

  // ── Free/Busy ──

  async queryFreeBusy(
    calendarIds: string[],
    timeMin: string,
    timeMax: string,
  ): Promise<Record<string, FreeBusySlot[]>> {
    this.ensureInitialized();

    const response = await this.calendarClient.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: calendarIds.map((id) => ({ id })),
      },
    });

    const calendars = response.data.calendars ?? {};
    const result: Record<string, FreeBusySlot[]> = {};

    for (const calId of calendarIds) {
      const busySlots: any[] = calendars[calId]?.busy ?? [];
      result[calId] = busySlots.map((slot) => ({
        start: slot.start,
        end: slot.end,
      }));
    }

    return result;
  }

  // ── Private helpers ──

  private ensureInitialized(): void {
    if (!this.initialized || !this.calendarClient) {
      throw new Error('GoogleCalendarService not initialized. Call initialize() first.');
    }
  }

  private mapEvent(item: any): CalendarEvent {
    return {
      id: item.id,
      summary: item.summary ?? '(No title)',
      description: item.description,
      location: item.location,
      start: {
        dateTime: item.start?.dateTime,
        date: item.start?.date,
        timeZone: item.start?.timeZone,
      },
      end: {
        dateTime: item.end?.dateTime,
        date: item.end?.date,
        timeZone: item.end?.timeZone,
      },
      attendees: item.attendees?.map((a: any) => ({
        email: a.email,
        displayName: a.displayName,
        responseStatus: a.responseStatus,
      })),
      status: item.status,
      htmlLink: item.htmlLink,
      created: item.created,
      updated: item.updated,
    };
  }
}
