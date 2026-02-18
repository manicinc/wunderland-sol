/**
 * @file channel-oauth.service.ts
 * @description Multi-tenant OAuth lifecycle for channel connections (Slack, Discord, Telegram).
 */

import { randomBytes } from 'node:crypto';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { CredentialsService } from '../credentials/credentials.service.js';
import { ChannelsService } from './channels.service.js';
import { AgentImmutableException } from '../wunderland.exceptions.js';
import { getAgentSealState } from '../immutability/agentSealing.js';

const STATE_TTL_MS = 10 * 60 * 1000;

const SLACK_TOKEN_URL = 'https://slack.com/api/oauth.v2.access';
const SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_SCOPES =
  'chat:write,channels:read,channels:history,groups:read,im:read,im:write,users:read';

const DISCORD_AUTH_URL = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_BOT_PERMISSIONS = (2048 | 65536 | 64 | 536870912).toString();

const TELEGRAM_API = 'https://api.telegram.org';
const TELEGRAM_TOKEN_REGEX = /^\d+:[A-Za-z0-9_-]+$/;

export interface OAuthResult {
  success: boolean;
  seedId: string;
  bindingId: string;
  platform: string;
  metadata?: Record<string, unknown>;
}

export interface ConnectionStatus {
  connected: boolean;
  platform: string;
  seedId: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ChannelOAuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly credentialsService: CredentialsService,
    private readonly channelsService: ChannelsService
  ) {}

  async initiateSlackOAuth(userId: string, seedId: string): Promise<{ url: string }> {
    await this.requireOwnedAgent(userId, seedId);
    await this.assertNotSealed(seedId);

    const clientId = process.env.SLACK_OAUTH_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException(
        'Slack OAuth is not configured (SLACK_OAUTH_CLIENT_ID missing).'
      );
    }

    const redirectUri = this.getCallbackUrl('slack');
    const stateId = await this.createOAuthState(userId, seedId, 'slack', redirectUri);

    const params = new URLSearchParams({
      client_id: clientId,
      scope: SLACK_SCOPES,
      redirect_uri: redirectUri,
      state: stateId,
    });

    return { url: `${SLACK_AUTH_URL}?${params.toString()}` };
  }

  async initiateDiscordOAuth(userId: string, seedId: string): Promise<{ url: string }> {
    await this.requireOwnedAgent(userId, seedId);
    await this.assertNotSealed(seedId);

    const clientId = process.env.DISCORD_OAUTH_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException(
        'Discord OAuth is not configured (DISCORD_OAUTH_CLIENT_ID missing).'
      );
    }

    const redirectUri = this.getCallbackUrl('discord');
    const stateId = await this.createOAuthState(userId, seedId, 'discord', redirectUri);

    const params = new URLSearchParams({
      client_id: clientId,
      permissions: DISCORD_BOT_PERMISSIONS,
      scope: 'bot applications.commands',
      redirect_uri: redirectUri,
      response_type: 'code',
      state: stateId,
    });

    return { url: `${DISCORD_AUTH_URL}?${params.toString()}` };
  }

  async handleSlackCallback(code: string, stateId: string): Promise<OAuthResult> {
    const state = await this.consumeOAuthState(stateId);

    const clientId = process.env.SLACK_OAUTH_CLIENT_ID;
    const clientSecret = process.env.SLACK_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Slack OAuth credentials not configured.');
    }

    const tokenRes = await fetch(SLACK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: state.redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      throw new BadRequestException(`Slack token exchange failed (${tokenRes.status}): ${errBody}`);
    }

    const data = (await tokenRes.json()) as {
      ok: boolean;
      error?: string;
      access_token?: string;
      team?: { id: string; name: string };
      bot_user_id?: string;
    };

    if (!data.ok || !data.access_token) {
      throw new BadRequestException(`Slack OAuth error: ${data.error || 'unknown'}`);
    }

    const teamId = data.team?.id ?? 'unknown';
    const teamName = data.team?.name ?? 'Slack Workspace';
    const botUserId = data.bot_user_id ?? '';

    await this.removeExistingCredential(state.ownerUserId, state.seedId, 'slack_oauth_bot_token');
    const { credential } = await this.credentialsService.createCredential(state.ownerUserId, {
      seedId: state.seedId,
      type: 'slack_oauth_bot_token',
      label: `Slack: ${teamName}`,
      value: data.access_token,
    });

    await this.removeExistingBinding(state.ownerUserId, state.seedId, 'slack');
    const { binding } = await this.channelsService.createBinding(state.ownerUserId, {
      seedId: state.seedId,
      platform: 'slack',
      channelId: teamId,
      conversationType: 'channel',
      credentialId: credential.credentialId,
      autoBroadcast: false,
      platformConfig: JSON.stringify({ teamName, botUserId }),
    });

    return {
      success: true,
      seedId: state.seedId,
      bindingId: binding.bindingId,
      platform: 'slack',
      metadata: { teamName, teamId, botUserId },
    };
  }

  async handleDiscordCallback(code: string, stateId: string): Promise<OAuthResult> {
    const state = await this.consumeOAuthState(stateId);

    const clientId = process.env.DISCORD_OAUTH_CLIENT_ID;
    const clientSecret = process.env.DISCORD_OAUTH_CLIENT_SECRET;
    const botToken = process.env.DISCORD_OAUTH_BOT_TOKEN;
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Discord OAuth credentials not configured.');
    }

    const tokenRes = await fetch(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: state.redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      throw new BadRequestException(
        `Discord token exchange failed (${tokenRes.status}): ${errBody}`
      );
    }

    const data = (await tokenRes.json()) as {
      access_token: string;
      guild?: { id: string; name: string };
    };

    const guildId = data.guild?.id ?? '';
    const guildName = data.guild?.name ?? 'Discord Server';

    if (!guildId) {
      throw new BadRequestException(
        'Discord OAuth did not return a guild. User may not have selected a server.'
      );
    }

    const operationalToken = botToken || data.access_token;

    await this.removeExistingCredential(state.ownerUserId, state.seedId, 'discord_oauth_bot_token');
    const { credential } = await this.credentialsService.createCredential(state.ownerUserId, {
      seedId: state.seedId,
      type: 'discord_oauth_bot_token',
      label: `Discord: ${guildName}`,
      value: operationalToken,
    });

    await this.removeExistingBinding(state.ownerUserId, state.seedId, 'discord');
    const { binding } = await this.channelsService.createBinding(state.ownerUserId, {
      seedId: state.seedId,
      platform: 'discord',
      channelId: guildId,
      conversationType: 'channel',
      credentialId: credential.credentialId,
      autoBroadcast: false,
      platformConfig: JSON.stringify({ guildName, guildId }),
    });

    return {
      success: true,
      seedId: state.seedId,
      bindingId: binding.bindingId,
      platform: 'discord',
      metadata: { guildName, guildId },
    };
  }

  async setupTelegramBot(userId: string, seedId: string, botToken: string): Promise<OAuthResult> {
    await this.requireOwnedAgent(userId, seedId);
    await this.assertNotSealed(seedId);

    if (!TELEGRAM_TOKEN_REGEX.test(botToken.trim())) {
      throw new BadRequestException(
        'Invalid Telegram bot token format. Expected format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz'
      );
    }

    const token = botToken.trim();
    const getMeRes = await fetch(`${TELEGRAM_API}/bot${token}/getMe`);
    if (!getMeRes.ok) {
      throw new BadRequestException(
        'Invalid Telegram bot token — getMe failed. Please check the token.'
      );
    }

    const getMeData = (await getMeRes.json()) as {
      ok: boolean;
      result?: { id: number; first_name: string; username?: string };
    };

    if (!getMeData.ok || !getMeData.result) {
      throw new BadRequestException('Telegram bot token is invalid or revoked.');
    }

    const botId = String(getMeData.result.id);
    const botUsername = getMeData.result.username ?? getMeData.result.first_name;

    const webhookUrl = this.getTelegramWebhookUrl(seedId);
    if (webhookUrl) {
      try {
        const setWebhookRes = await fetch(`${TELEGRAM_API}/bot${token}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl }),
        });
        if (!setWebhookRes.ok) {
          console.warn(
            `[channel-oauth] Telegram setWebhook failed for ${botUsername}:`,
            await setWebhookRes.text()
          );
        }
      } catch (err) {
        console.warn(`[channel-oauth] Telegram setWebhook error for ${botUsername}:`, err);
      }
    }

    await this.removeExistingCredential(userId, seedId, 'telegram_bot_token');
    const { credential } = await this.credentialsService.createCredential(userId, {
      seedId,
      type: 'telegram_bot_token',
      label: `Telegram: @${botUsername}`,
      value: token,
    });

    await this.removeExistingBinding(userId, seedId, 'telegram');
    const { binding } = await this.channelsService.createBinding(userId, {
      seedId,
      platform: 'telegram',
      channelId: botId,
      conversationType: 'direct',
      credentialId: credential.credentialId,
      autoBroadcast: false,
      platformConfig: JSON.stringify({ botUsername, botId }),
    });

    return {
      success: true,
      seedId,
      bindingId: binding.bindingId,
      platform: 'telegram',
      metadata: { botUsername, botId },
    };
  }

  async getConnectionStatus(userId: string, seedId: string, platform: string): Promise<ConnectionStatus> {
    await this.requireOwnedAgent(userId, seedId);

    const credentialType = this.getCredentialType(platform);
    const row = await this.db.get<{ credential_id: string }>(
      `SELECT credential_id FROM wunderbot_credentials
       WHERE owner_user_id = ? AND seed_id = ? AND credential_type = ? LIMIT 1`,
      [userId, seedId, credentialType]
    );

    if (!row) {
      return { connected: false, platform, seedId };
    }

    const binding = await this.db.get<{ platform_config: string }>(
      `SELECT platform_config FROM wunderland_channel_bindings
       WHERE owner_user_id = ? AND seed_id = ? AND platform = ? LIMIT 1`,
      [userId, seedId, platform]
    );

    let metadata: Record<string, unknown> = {};
    if (binding?.platform_config) {
      try {
        metadata = JSON.parse(String(binding.platform_config));
      } catch {
        metadata = {};
      }
    }

    return { connected: true, platform, seedId, metadata };
  }

  async disconnectChannel(
    userId: string,
    seedId: string,
    platform: string
  ): Promise<{ disconnected: boolean }> {
    await this.requireOwnedAgent(userId, seedId);
    await this.assertNotSealed(seedId);

    if (platform === 'telegram') {
      const credentialType = this.getCredentialType(platform);
      const vals = await this.credentialsService.getDecryptedValuesByType(userId, seedId, [
        credentialType,
      ]);
      const token = vals[credentialType];
      if (token) {
        try {
          await fetch(`${TELEGRAM_API}/bot${token}/deleteWebhook`, { method: 'POST' });
        } catch {
          // Best effort.
        }
      }
    }

    await this.removeExistingCredential(userId, seedId, this.getCredentialType(platform));
    await this.removeExistingBinding(userId, seedId, platform);

    return { disconnected: true };
  }

  private async createOAuthState(
    userId: string,
    seedId: string,
    platform: string,
    redirectUri: string
  ): Promise<string> {
    await this.cleanExpiredStates();

    const stateId = randomBytes(32).toString('hex');
    const now = Date.now();

    await this.db.run(
      `INSERT INTO wunderland_channel_oauth_states
        (state_id, owner_user_id, seed_id, platform, redirect_uri, created_at, expires_at, consumed)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [stateId, userId, seedId, platform, redirectUri, now, now + STATE_TTL_MS]
    );

    return stateId;
  }

  private async consumeOAuthState(stateId: string): Promise<{
    ownerUserId: string;
    seedId: string;
    platform: string;
    redirectUri: string;
  }> {
    const row = await this.db.get<{
      state_id: string;
      owner_user_id: string;
      seed_id: string;
      platform: string;
      redirect_uri: string;
      expires_at: number;
      consumed: number;
    }>(`SELECT * FROM wunderland_channel_oauth_states WHERE state_id = ?`, [stateId]);

    if (!row) {
      throw new BadRequestException('Invalid or expired OAuth state.');
    }
    if (row.consumed) {
      throw new BadRequestException('OAuth state has already been used.');
    }
    if (row.expires_at < Date.now()) {
      throw new BadRequestException('OAuth state has expired. Please try connecting again.');
    }

    await this.db.run(
      `UPDATE wunderland_channel_oauth_states SET consumed = 1 WHERE state_id = ?`,
      [stateId]
    );

    return {
      ownerUserId: String(row.owner_user_id),
      seedId: String(row.seed_id),
      platform: String(row.platform),
      redirectUri: String(row.redirect_uri),
    };
  }

  private async cleanExpiredStates(): Promise<void> {
    const now = Date.now();
    const oneHourAgo = now - 3600_000;
    await this.db.run(
      `DELETE FROM wunderland_channel_oauth_states
       WHERE expires_at < ? OR (consumed = 1 AND created_at < ?)`,
      [now, oneHourAgo]
    );
  }

  private async requireOwnedAgent(userId: string, seedId: string): Promise<void> {
    const agent = await this.db.get<{ seed_id: string }>(
      `SELECT seed_id FROM wunderbots WHERE seed_id = ? AND owner_user_id = ? AND status != 'archived'`,
      [seedId, userId]
    );
    if (!agent) {
      throw new NotFoundException(`Agent "${seedId}" not found or not owned by current user.`);
    }
  }

  private async assertNotSealed(seedId: string): Promise<void> {
    const state = await getAgentSealState(this.db as any, seedId);
    if (state?.isSealed) {
      throw new AgentImmutableException(seedId, ['channelOAuth']);
    }
  }

  private getCallbackUrl(platform: string): string {
    const base = (
      process.env.OAUTH_CALLBACK_BASE_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
    return `${base}/api/channels/oauth/${platform}/callback`;
  }

  private getTelegramWebhookUrl(seedId: string): string | null {
    const base = (process.env.API_BASE_URL || process.env.BASE_URL || '').replace(/\/$/, '');
    if (!base) return null;
    return `${base}/wunderland/channels/inbound/telegram/${seedId}`;
  }

  private getCredentialType(platform: string): string {
    switch (platform) {
      case 'slack':
        return 'slack_oauth_bot_token';
      case 'discord':
        return 'discord_oauth_bot_token';
      case 'telegram':
        return 'telegram_bot_token';
      default:
        return `${platform}_oauth_token`;
    }
  }

  private async removeExistingCredential(
    userId: string,
    seedId: string,
    credentialType: string
  ): Promise<void> {
    await this.db.run(
      `DELETE FROM wunderbot_credentials
       WHERE owner_user_id = ? AND seed_id = ? AND credential_type = ?`,
      [userId, seedId, credentialType]
    );
  }

  private async removeExistingBinding(
    userId: string,
    seedId: string,
    platform: string
  ): Promise<void> {
    await this.db.run(
      `DELETE FROM wunderland_channel_bindings
       WHERE owner_user_id = ? AND seed_id = ? AND platform = ?`,
      [userId, seedId, platform]
    );
  }
}
