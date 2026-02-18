// File: backend/src/modules/support/anonymization.service.ts
/**
 * @file anonymization.service.ts
 * @description Manages anonymous identities for support ticket users and PII redaction.
 */

import { Injectable } from '@nestjs/common';
import { getAppDatabase, generateId } from '../../core/database/appDatabase.js';

export interface RedactedTicket {
  id: string;
  userId: string;
  anonymousId: string;
  piiShared: boolean;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  attachments: string[];
  userEmail: string | null;
  userName: string | null;
  userPlan: string | null;
  assignedToEmail: string | null;
  createdAt: number;
  updatedAt: number | null;
  resolvedAt: number | null;
  closedAt: number | null;
}

@Injectable()
export class AnonymizationService {
  /**
   * Get or create a persistent anonymous ID for a user.
   * Format: "User-XXXX" where XXXX is a 4-digit number.
   */
  async getOrCreateAnonymousId(userId: string): Promise<string> {
    const db = getAppDatabase();
    const existing = await db.get<{ anonymous_id: string }>(
      'SELECT anonymous_id FROM support_anonymous_ids WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (existing) return existing.anonymous_id;

    // Generate a unique 4-digit anonymous ID
    let anonymousId: string;
    let attempts = 0;
    do {
      const num = Math.floor(1000 + Math.random() * 9000);
      anonymousId = `User-${num}`;
      const conflict = await db.get<{ id: string }>(
        'SELECT id FROM support_anonymous_ids WHERE anonymous_id = ? LIMIT 1',
        [anonymousId]
      );
      if (!conflict) break;
      attempts++;
    } while (attempts < 100);

    await db.run(
      'INSERT INTO support_anonymous_ids (id, user_id, anonymous_id, created_at) VALUES (?, ?, ?, ?)',
      [generateId(), userId, anonymousId, Date.now()]
    );

    return anonymousId;
  }

  /**
   * Redact PII from a raw ticket row for VA admin consumption.
   * If pii_shared=0, strips email and name. If pii_shared=1, includes them.
   */
  redactForAdmin(row: any): RedactedTicket {
    const piiShared = Boolean(row.pii_shared);
    return {
      id: row.id,
      userId: row.user_id,
      anonymousId: row.anonymous_id,
      piiShared,
      subject: row.subject,
      category: row.category,
      priority: row.priority,
      status: row.status,
      description: row.description,
      attachments: row.attachments ? JSON.parse(row.attachments) : [],
      userEmail: piiShared ? row.user_email : null,
      userName: piiShared ? row.user_name : null,
      userPlan: row.user_plan,
      assignedToEmail: row.assigned_to_email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at,
      closedAt: row.closed_at,
    };
  }

  /**
   * Full ticket view for the ticket owner (includes their own PII).
   */
  toOwnerView(row: any): RedactedTicket {
    return {
      id: row.id,
      userId: row.user_id,
      anonymousId: row.anonymous_id,
      piiShared: Boolean(row.pii_shared),
      subject: row.subject,
      category: row.category,
      priority: row.priority,
      status: row.status,
      description: row.description,
      attachments: row.attachments ? JSON.parse(row.attachments) : [],
      userEmail: row.user_email,
      userName: row.user_name,
      userPlan: row.user_plan,
      assignedToEmail: row.assigned_to_email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at,
      closedAt: row.closed_at,
    };
  }
}
