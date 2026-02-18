// File: backend/src/modules/support/support.service.ts
/**
 * @file support.service.ts
 * @description Business logic for the support ticket system. Handles ticket CRUD,
 * comment threading, priority queue, and PII sharing controls.
 */

import { Injectable } from '@nestjs/common';
import { getAppDatabase, generateId } from '../../core/database/appDatabase.js';
import { AnonymizationService, type RedactedTicket } from './anonymization.service.js';

const VALID_CATEGORIES = [
  'bug',
  'feature',
  'billing',
  'account',
  'integration',
  'general',
] as const;
const VALID_PRIORITIES = ['normal', 'urgent'] as const;
const VALID_STATUSES = ['open', 'in_progress', 'waiting_on_user', 'resolved', 'closed'] as const;

export type TicketCategory = (typeof VALID_CATEGORIES)[number];
export type TicketPriority = (typeof VALID_PRIORITIES)[number];
export type TicketStatus = (typeof VALID_STATUSES)[number];

export interface TicketComment {
  id: string;
  ticketId: string;
  authorType: 'user' | 'va_admin';
  authorId: string | null;
  authorDisplay: string | null;
  content: string;
  attachments: string[];
  createdAt: number;
}

export interface SupportStats {
  total: number;
  open: number;
  inProgress: number;
  waitingOnUser: number;
  resolved: number;
  closed: number;
  urgent: number;
  byCategory: Record<string, number>;
}

@Injectable()
export class SupportService {
  constructor(private readonly anonymization: AnonymizationService) {}

  // ---------------------------------------------------------------------------
  // User operations
  // ---------------------------------------------------------------------------

  async createTicket(data: {
    userId: string;
    userEmail: string;
    userName?: string;
    userPlan?: string;
    subject: string;
    category: string;
    priority?: string;
    description: string;
    piiShared?: boolean;
  }): Promise<RedactedTicket> {
    const db = getAppDatabase();
    const id = generateId();
    const now = Date.now();

    const category = VALID_CATEGORIES.includes(data.category as TicketCategory)
      ? data.category
      : 'general';
    const priority = VALID_PRIORITIES.includes(data.priority as TicketPriority)
      ? data.priority
      : 'normal';

    const anonymousId = await this.anonymization.getOrCreateAnonymousId(data.userId);

    await db.run(
      `INSERT INTO support_tickets (
        id, user_id, anonymous_id, pii_shared, subject, category, priority, status,
        description, attachments, user_email, user_name, user_plan,
        assigned_to_email, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        anonymousId,
        data.piiShared ? 1 : 0,
        data.subject,
        category,
        priority,
        'open',
        data.description,
        '[]',
        data.userEmail,
        data.userName || null,
        data.userPlan || 'metered',
        null,
        now,
        now,
      ]
    );

    const row = await db.get('SELECT * FROM support_tickets WHERE id = ? LIMIT 1', [id]);
    return this.anonymization.toOwnerView(row);
  }

  async listUserTickets(
    userId: string,
    filters?: { status?: string; limit?: number; offset?: number }
  ): Promise<{ tickets: RedactedTicket[]; count: number }> {
    const db = getAppDatabase();
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    let where = 'WHERE user_id = ?';
    const params: any[] = [userId];

    if (filters?.status && VALID_STATUSES.includes(filters.status as TicketStatus)) {
      where += ' AND status = ?';
      params.push(filters.status);
    }

    const countRow = await db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM support_tickets ${where}`,
      params
    );

    const rows = await db.all(
      `SELECT * FROM support_tickets ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      tickets: rows.map((r: any) => this.anonymization.toOwnerView(r)),
      count: countRow?.count ?? 0,
    };
  }

  async getUserTicket(
    ticketId: string,
    userId: string
  ): Promise<{ ticket: RedactedTicket; comments: TicketComment[] } | null> {
    const db = getAppDatabase();
    const row = await db.get('SELECT * FROM support_tickets WHERE id = ? AND user_id = ? LIMIT 1', [
      ticketId,
      userId,
    ]);
    if (!row) return null;

    const comments = await this.getComments(ticketId);
    return {
      ticket: this.anonymization.toOwnerView(row),
      comments,
    };
  }

  async addUserComment(
    ticketId: string,
    userId: string,
    content: string
  ): Promise<TicketComment | null> {
    const db = getAppDatabase();

    // Verify ownership
    const ticket = await db.get(
      'SELECT id, anonymous_id FROM support_tickets WHERE id = ? AND user_id = ? LIMIT 1',
      [ticketId, userId]
    );
    if (!ticket) return null;

    const id = generateId();
    const now = Date.now();

    await db.run(
      `INSERT INTO support_ticket_comments (id, ticket_id, author_type, author_id, author_display, content, attachments, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ticketId, 'user', userId, (ticket as any).anonymous_id, content, '[]', now]
    );

    // Update ticket timestamp
    await db.run('UPDATE support_tickets SET updated_at = ? WHERE id = ?', [now, ticketId]);

    return {
      id,
      ticketId,
      authorType: 'user',
      authorId: userId,
      authorDisplay: (ticket as any).anonymous_id,
      content,
      attachments: [],
      createdAt: now,
    };
  }

  async togglePiiSharing(
    ticketId: string,
    userId: string,
    enabled: boolean
  ): Promise<RedactedTicket | null> {
    const db = getAppDatabase();
    const row = await db.get('SELECT * FROM support_tickets WHERE id = ? AND user_id = ? LIMIT 1', [
      ticketId,
      userId,
    ]);
    if (!row) return null;

    await db.run('UPDATE support_tickets SET pii_shared = ?, updated_at = ? WHERE id = ?', [
      enabled ? 1 : 0,
      Date.now(),
      ticketId,
    ]);

    const updated = await db.get('SELECT * FROM support_tickets WHERE id = ? LIMIT 1', [ticketId]);
    return this.anonymization.toOwnerView(updated);
  }

  // ---------------------------------------------------------------------------
  // VA Admin operations
  // ---------------------------------------------------------------------------

  async listAllTickets(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ tickets: RedactedTicket[]; count: number }> {
    const db = getAppDatabase();
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.status && VALID_STATUSES.includes(filters.status as TicketStatus)) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters?.priority && VALID_PRIORITIES.includes(filters.priority as TicketPriority)) {
      conditions.push('priority = ?');
      params.push(filters.priority);
    }
    if (filters?.category && VALID_CATEGORIES.includes(filters.category as TicketCategory)) {
      conditions.push('category = ?');
      params.push(filters.category);
    }
    if (filters?.assignedTo) {
      conditions.push('assigned_to_email = ?');
      params.push(filters.assignedTo);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM support_tickets ${where}`,
      params
    );

    // Priority queue: urgent first, then by created_at ASC (oldest first)
    const rows = await db.all(
      `SELECT * FROM support_tickets ${where}
       ORDER BY
         CASE WHEN priority = 'urgent' THEN 0 ELSE 1 END ASC,
         created_at ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      tickets: rows.map((r: any) => this.anonymization.redactForAdmin(r)),
      count: countRow?.count ?? 0,
    };
  }

  async getAdminTicket(
    ticketId: string
  ): Promise<{ ticket: RedactedTicket; comments: TicketComment[] } | null> {
    const db = getAppDatabase();
    const row = await db.get('SELECT * FROM support_tickets WHERE id = ? LIMIT 1', [ticketId]);
    if (!row) return null;

    const comments = await this.getComments(ticketId);
    return {
      ticket: this.anonymization.redactForAdmin(row),
      comments,
    };
  }

  async assignTicket(ticketId: string, vaAdminEmail: string): Promise<RedactedTicket | null> {
    const db = getAppDatabase();
    const row = await db.get('SELECT * FROM support_tickets WHERE id = ? LIMIT 1', [ticketId]);
    if (!row) return null;

    const now = Date.now();
    await db.run(
      'UPDATE support_tickets SET assigned_to_email = ?, status = ?, updated_at = ? WHERE id = ?',
      [vaAdminEmail, 'in_progress', now, ticketId]
    );

    const updated = await db.get('SELECT * FROM support_tickets WHERE id = ? LIMIT 1', [ticketId]);
    return this.anonymization.redactForAdmin(updated);
  }

  async updateTicketStatus(ticketId: string, status: string): Promise<RedactedTicket | null> {
    if (!VALID_STATUSES.includes(status as TicketStatus)) return null;

    const db = getAppDatabase();
    const row = await db.get('SELECT * FROM support_tickets WHERE id = ? LIMIT 1', [ticketId]);
    if (!row) return null;

    const now = Date.now();
    const updates: Record<string, any> = { status, updated_at: now };
    if (status === 'resolved') updates.resolved_at = now;
    if (status === 'closed') updates.closed_at = now;

    const setClauses = Object.keys(updates)
      .map((k) => `${k} = ?`)
      .join(', ');
    const values = [...Object.values(updates), ticketId];

    await db.run(`UPDATE support_tickets SET ${setClauses} WHERE id = ?`, values);

    const updated = await db.get('SELECT * FROM support_tickets WHERE id = ? LIMIT 1', [ticketId]);
    return this.anonymization.redactForAdmin(updated);
  }

  async addAdminComment(
    ticketId: string,
    vaAdminEmail: string,
    content: string
  ): Promise<TicketComment | null> {
    const db = getAppDatabase();
    const ticket = await db.get('SELECT id FROM support_tickets WHERE id = ? LIMIT 1', [ticketId]);
    if (!ticket) return null;

    const id = generateId();
    const now = Date.now();

    await db.run(
      `INSERT INTO support_ticket_comments (id, ticket_id, author_type, author_id, author_display, content, attachments, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ticketId, 'va_admin', vaAdminEmail, 'Support Team', content, '[]', now]
    );

    // Update ticket to waiting_on_user
    await db.run(
      "UPDATE support_tickets SET status = 'waiting_on_user', updated_at = ? WHERE id = ?",
      [now, ticketId]
    );

    return {
      id,
      ticketId,
      authorType: 'va_admin',
      authorId: vaAdminEmail,
      authorDisplay: 'Support Team',
      content,
      attachments: [],
      createdAt: now,
    };
  }

  async getStats(): Promise<SupportStats> {
    const db = getAppDatabase();

    const total =
      (await db.get<{ c: number }>('SELECT COUNT(1) as c FROM support_tickets'))?.c ?? 0;
    const open =
      (
        await db.get<{ c: number }>(
          "SELECT COUNT(1) as c FROM support_tickets WHERE status = 'open'"
        )
      )?.c ?? 0;
    const inProgress =
      (
        await db.get<{ c: number }>(
          "SELECT COUNT(1) as c FROM support_tickets WHERE status = 'in_progress'"
        )
      )?.c ?? 0;
    const waitingOnUser =
      (
        await db.get<{ c: number }>(
          "SELECT COUNT(1) as c FROM support_tickets WHERE status = 'waiting_on_user'"
        )
      )?.c ?? 0;
    const resolved =
      (
        await db.get<{ c: number }>(
          "SELECT COUNT(1) as c FROM support_tickets WHERE status = 'resolved'"
        )
      )?.c ?? 0;
    const closed =
      (
        await db.get<{ c: number }>(
          "SELECT COUNT(1) as c FROM support_tickets WHERE status = 'closed'"
        )
      )?.c ?? 0;
    const urgent =
      (
        await db.get<{ c: number }>(
          "SELECT COUNT(1) as c FROM support_tickets WHERE priority = 'urgent' AND status NOT IN ('resolved', 'closed')"
        )
      )?.c ?? 0;

    const categoryRows = await db.all<{ category: string; c: number }>(
      'SELECT category, COUNT(1) as c FROM support_tickets GROUP BY category'
    );
    const byCategory: Record<string, number> = {};
    for (const row of categoryRows) {
      byCategory[row.category] = row.c;
    }

    return { total, open, inProgress, waitingOnUser, resolved, closed, urgent, byCategory };
  }

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  private async getComments(ticketId: string): Promise<TicketComment[]> {
    const db = getAppDatabase();
    const rows = await db.all(
      'SELECT * FROM support_ticket_comments WHERE ticket_id = ? ORDER BY created_at ASC',
      [ticketId]
    );
    return rows.map((r: any) => ({
      id: r.id,
      ticketId: r.ticket_id,
      authorType: r.author_type,
      authorId: r.author_id,
      authorDisplay: r.author_display,
      content: r.content,
      attachments: r.attachments ? JSON.parse(r.attachments) : [],
      createdAt: r.created_at,
    }));
  }
}
