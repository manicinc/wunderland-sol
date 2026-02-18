import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { CredentialsService } from '../credentials/credentials.service.js';
import { sendSmtpMail } from './smtp-client.js';

export type EmailIntegrationStatus = {
  configured: boolean;
  required: string[];
  present: string[];
  missing: string[];
};

@Injectable()
export class EmailIntegrationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly credentials: CredentialsService
  ) {}

  private async requireOwnedAgent(userId: string, seedId: string): Promise<void> {
    const row = await this.db.get<{ seed_id: string }>(
      `SELECT seed_id FROM wunderland_agents WHERE seed_id = ? AND owner_user_id = ? AND status != 'archived' LIMIT 1`,
      [seedId, userId]
    );
    if (!row) {
      throw new NotFoundException(`Agent "${seedId}" not found or not owned by current user.`);
    }
  }

  private validateEmail(value: string, field: string): string {
    const trimmed = value.trim();
    if (!trimmed) throw new BadRequestException(`${field} is required.`);
    // Lightweight validation; SMTP will be the ultimate authority.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new BadRequestException(`${field} must be a valid email address.`);
    }
    return trimmed;
  }

  async getStatus(userId: string, seedId: string): Promise<EmailIntegrationStatus> {
    const normalizedSeedId = seedId.trim();
    await this.requireOwnedAgent(userId, normalizedSeedId);

    const required = ['smtp_host', 'smtp_user', 'smtp_password'] as const;

    const rows = await this.db.all<{ credential_type: string }>(
      `
        SELECT credential_type
          FROM wunderland_agent_credentials
         WHERE owner_user_id = ?
           AND seed_id = ?
           AND credential_type IN (${required.map(() => '?').join(',')})
      `,
      [userId, normalizedSeedId, ...required]
    );

    const presentSet = new Set(rows.map((r) => String(r.credential_type)));
    const present = required.filter((t) => presentSet.has(t));
    const missing = required.filter((t) => !presentSet.has(t));

    return {
      configured: missing.length === 0,
      required: [...required],
      present: [...present],
      missing: [...missing],
    };
  }

  async sendTestEmail(
    userId: string,
    payload: {
      seedId: string;
      to: string;
      subject?: string;
      text?: string;
      from?: string;
    }
  ): Promise<{ ok: true; serverResponse: string }> {
    const seedId = payload.seedId.trim();
    await this.requireOwnedAgent(userId, seedId);

    const to = this.validateEmail(payload.to, 'to');
    const fromOverride = payload.from?.trim();
    const subject = (payload.subject?.trim() || 'Wunderland SMTP Test').slice(0, 160);
    const text =
      (payload.text?.trim() ||
        `SMTP integration is live.\n\nseedId: ${seedId}\n\nIf you received this email, your Wunderbot can send outbound email.`) +
      '\n';

    const creds = await this.credentials.getDecryptedValuesByType(userId, seedId, [
      'smtp_host',
      'smtp_user',
      'smtp_password',
      'smtp_from',
    ]);

    const smtpHost = creds.smtp_host?.trim() ?? '';
    const smtpUser = creds.smtp_user?.trim() ?? '';
    const smtpPass = creds.smtp_password ?? '';
    const smtpFrom = creds.smtp_from?.trim() ?? '';

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new BadRequestException(
        'Email integration is not configured. Add smtp_host, smtp_user, and smtp_password in Credential Vault.'
      );
    }

    const from = this.validateEmail(fromOverride || smtpFrom || smtpUser, 'from');

    const result = await sendSmtpMail({
      host: smtpHost,
      user: smtpUser,
      pass: smtpPass,
      from,
      to,
      subject,
      text,
      requireTLS: true,
    });

    return { ok: true, serverResponse: result.serverResponse };
  }

  async sendEmail(
    userId: string,
    payload: {
      seedId: string;
      to: string;
      from?: string;
      subject: string;
      text: string;
    }
  ): Promise<{ ok: true; serverResponse: string }> {
    const seedId = payload.seedId.trim();
    await this.requireOwnedAgent(userId, seedId);

    const to = this.validateEmail(payload.to, 'to');
    const fromOverride = payload.from?.trim();
    const subject = (payload.subject || '').trim();
    const text = (payload.text || '').trim();

    if (!subject) throw new BadRequestException('subject is required.');
    if (!text) throw new BadRequestException('text is required.');

    const creds = await this.credentials.getDecryptedValuesByType(userId, seedId, [
      'smtp_host',
      'smtp_user',
      'smtp_password',
      'smtp_from',
    ]);

    const smtpHost = creds.smtp_host?.trim() ?? '';
    const smtpUser = creds.smtp_user?.trim() ?? '';
    const smtpPass = creds.smtp_password ?? '';
    const smtpFrom = creds.smtp_from?.trim() ?? '';

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new BadRequestException(
        'Email integration is not configured. Add smtp_host, smtp_user, and smtp_password in Credential Vault.'
      );
    }

    const from = this.validateEmail(fromOverride || smtpFrom || smtpUser, 'from');

    const result = await sendSmtpMail({
      host: smtpHost,
      user: smtpUser,
      pass: smtpPass,
      from,
      to,
      subject: subject.slice(0, 160),
      text: text + '\n',
      requireTLS: true,
    });

    return { ok: true, serverResponse: result.serverResponse };
  }
}
