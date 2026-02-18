/**
 * @file wunderland-sol-onboarding.controller.ts
 * @description Public wallet-signed endpoints for onboarding hosted Solana agents.
 */

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../../common/decorators/public.decorator.js';
import { WunderlandSolOnboardingService } from './wunderland-sol-onboarding.service.js';
import { DatabaseService } from '../../../database/database.service.js';
import { PublicKey } from '@solana/web3.js';
import { populateOptionalAuthContext } from '../../../features/auth/requestAuthContext.js';

@Controller()
export class WunderlandSolOnboardingController {
  constructor(
    private readonly onboarding: WunderlandSolOnboardingService,
    private readonly db: DatabaseService,
  ) {}

  /**
   * Onboard a newly minted AgentIdentity for managed hosting.
   *
   * The owner wallet signs a message authorizing the backend to store the agent signer secret
   * (encrypted) and run the agent runtime autonomously.
   */
  @Public()
  @Post('wunderland/sol/agents/onboard')
  @HttpCode(HttpStatus.OK)
  async onboard(
    @Req() req: Request,
    @Body() body: {
    ownerWallet: string;
    agentIdentityPda: string;
    signatureB64: string;
    agentSignerSecretKeyJson: number[];
  }) {
    const auth = await populateOptionalAuthContext(req);
    const ownerUserId = auth.authenticated ? auth.id : undefined;
    return this.onboarding.onboardManagedAgent(body, { ownerUserId });
  }

  /**
   * Check whether an AgentIdentity is onboarded for managed hosting.
   */
  @Public()
  @Get('wunderland/sol/agents/:agentIdentityPda/status')
  async status(@Param('agentIdentityPda') agentIdentityPda: string) {
    let normalized = agentIdentityPda;
    try {
      normalized = new PublicKey(agentIdentityPda).toBase58();
    } catch {
      return { ok: false, error: 'Invalid agentIdentityPda' };
    }

    const row = await this.db.get<{
      seed_id: string;
      agent_identity_pda: string;
      owner_wallet: string;
      agent_signer_pubkey: string;
      updated_at: number;
    }>(
      `
        SELECT seed_id, agent_identity_pda, owner_wallet, agent_signer_pubkey, updated_at
          FROM wunderland_sol_agent_signers
         WHERE agent_identity_pda = ?
         LIMIT 1
      `,
      [normalized],
    );

    if (!row) {
      return { ok: true, onboarded: false };
    }

    return {
      ok: true,
      onboarded: true,
      seedId: String(row.seed_id),
      agentIdentityPda: String(row.agent_identity_pda),
      ownerWallet: String(row.owner_wallet),
      agentSignerPubkey: String(row.agent_signer_pubkey),
      updatedAt: typeof row.updated_at === 'number' ? new Date(row.updated_at).toISOString() : null,
    };
  }
}
