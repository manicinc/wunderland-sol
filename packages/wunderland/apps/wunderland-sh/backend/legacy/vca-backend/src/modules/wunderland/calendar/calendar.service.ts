/**
 * @file calendar.service.ts
 * @description Lightweight proxy/coordinator for Google Calendar OAuth.
 * Manages OAuth token storage and proxies requests — actual Google Calendar
 * API calls happen in the agentos-extensions extension pack.
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { AgentImmutableException } from '../wunderland.exceptions.js';
import { getAgentSealState } from '../immutability/agentSealing.js';

// ── Constants ────────────────────────────────────────────────────────────────

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

const CREDENTIAL_TYPE = 'google_calendar_oauth';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class CalendarService {
  constructor(private readonly db: DatabaseService) {}

  // ── OAuth Flow ──

  async getOAuthUrl(
    userId: string,
    seedId: string,
  ): Promise<{ url: string }> {
    await this.requireOwnedAgent(userId, seedId);
    await this.assertSealedAllowsRotation(userId, seedId);

    const { clientId } = this.getGoogleCredentials();
    const redirectUri = `${this.getBaseUrl()}/wunderland/calendar/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: CALENDAR_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state: seedId,
    });

    return { url: `${GOOGLE_AUTH_URL}?${params.toString()}` };
  }

  async handleOAuthCallback(
    userId: string,
    code: string,
    state?: string,
  ): Promise<{ success: boolean; seedId: string }> {
    const seedId = (state ?? '').trim();
    if (!seedId) {
      throw new BadRequestException('Missing seedId in OAuth state parameter.');
    }

    await this.requireOwnedAgent(userId, seedId);
    await this.assertSealedAllowsRotation(userId, seedId);

    const { clientId, clientSecret } = this.getGoogleCredentials();
    const redirectUri = `${this.getBaseUrl()}/wunderland/calendar/callback`;

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      throw new BadRequestException(
        `Google token exchange failed (${tokenResponse.status}): ${errorBody}`,
      );
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    };

    // Store refresh token as a credential
    const now = Date.now();
    const credentialId = this.db.generateId();
    const tokenPayload = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_in: tokens.expires_in ?? null,
      token_type: tokens.token_type ?? 'Bearer',
      obtained_at: now,
    });

    // Remove any existing google_calendar_oauth credential for this agent
    await this.db.run(
      `DELETE FROM wunderland_agent_credentials
        WHERE owner_user_id = ? AND seed_id = ? AND credential_type = ?`,
      [userId, seedId, CREDENTIAL_TYPE],
    );

    // Insert the new credential
    await this.db.run(
      `INSERT INTO wunderland_agent_credentials (
        credential_id,
        seed_id,
        owner_user_id,
        credential_type,
        label,
        encrypted_value,
        masked_value,
        last_used_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      [
        credentialId,
        seedId,
        userId,
        CREDENTIAL_TYPE,
        'Google Calendar',
        tokenPayload,
        '••••••••',
        now,
        now,
      ],
    );

    return { success: true, seedId };
  }

  async getCalendarStatus(
    userId: string,
    seedId: string,
  ): Promise<{ connected: boolean; seedId: string }> {
    await this.requireOwnedAgent(userId, seedId);

    const row = await this.db.get<{ credential_id: string }>(
      `SELECT credential_id
         FROM wunderland_agent_credentials
        WHERE owner_user_id = ?
          AND seed_id = ?
          AND credential_type = ?
        LIMIT 1`,
      [userId, seedId, CREDENTIAL_TYPE],
    );

    return { connected: Boolean(row), seedId };
  }

  async revokeAccess(
    userId: string,
    seedId: string,
  ): Promise<{ revoked: boolean }> {
    await this.requireOwnedAgent(userId, seedId);
    const sealState = await getAgentSealState(this.db as any, seedId);
    if (sealState?.isSealed) {
      throw new AgentImmutableException(seedId, ['calendarOAuth.revoke']);
    }

    // Attempt to revoke the token at Google (best-effort)
    const tokenRow = await this.db.get<{ encrypted_value: string }>(
      `SELECT encrypted_value
         FROM wunderland_agent_credentials
        WHERE owner_user_id = ?
          AND seed_id = ?
          AND credential_type = ?
        LIMIT 1`,
      [userId, seedId, CREDENTIAL_TYPE],
    );

    if (tokenRow) {
      try {
        const payload = JSON.parse(tokenRow.encrypted_value);
        const tokenToRevoke = payload.refresh_token || payload.access_token;
        if (tokenToRevoke) {
          await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(tokenToRevoke)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
        }
      } catch {
        // Best-effort revocation — ignore errors
      }
    }

    // Delete stored credentials
    await this.db.run(
      `DELETE FROM wunderland_agent_credentials
        WHERE owner_user_id = ? AND seed_id = ? AND credential_type = ?`,
      [userId, seedId, CREDENTIAL_TYPE],
    );

    return { revoked: true };
  }

  // ── Private Helpers ──

  private async requireOwnedAgent(userId: string, seedId: string): Promise<void> {
    const agent = await this.db.get<{ seed_id: string }>(
      `SELECT seed_id FROM wunderland_agents WHERE seed_id = ? AND owner_user_id = ? AND status != 'archived'`,
      [seedId, userId],
    );
    if (!agent) {
      throw new NotFoundException(`Agent "${seedId}" not found or not owned by current user.`);
    }
  }

  private async assertSealedAllowsRotation(userId: string, seedId: string): Promise<void> {
    const sealState = await getAgentSealState(this.db as any, seedId);
    if (!sealState?.isSealed) return;

    // In sealed mode, calendar OAuth flows are allowed only if the agent already has
    // calendar credentials (treat as re-auth / key rotation), not as a new integration.
    const existing = await this.db.get<{ credential_id: string }>(
      `SELECT credential_id
         FROM wunderland_agent_credentials
        WHERE owner_user_id = ?
          AND seed_id = ?
          AND credential_type = ?
        LIMIT 1`,
      [userId, seedId, CREDENTIAL_TYPE],
    );
    if (!existing) {
      throw new AgentImmutableException(seedId, ['calendarOAuth']);
    }
  }

  private getGoogleCredentials(): { clientId: string; clientSecret: string } {
    const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
      );
    }
    return { clientId, clientSecret };
  }

  private getBaseUrl(): string {
    return (process.env.BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
  }
}
