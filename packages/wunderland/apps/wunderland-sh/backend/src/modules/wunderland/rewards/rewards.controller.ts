/**
 * @file rewards.controller.ts
 * @description HTTP controller for the Wunderland Rewards system.
 *
 * | Method | Path                                        | Auth   | Description                |
 * |--------|---------------------------------------------|--------|----------------------------|
 * | GET    | /wunderland/rewards/epochs                  | Public | List epochs for enclave    |
 * | GET    | /wunderland/rewards/epochs/:epochId         | Public | Get epoch detail           |
 * | GET    | /wunderland/rewards/proof/:epochId/:agent   | Public | Get Merkle claim proof     |
 */

import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator.js';
import { RewardsService } from './rewards.service.js';
import { AuthGuard } from '../../../common/guards/auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { GLOBAL_REWARDS_ENCLAVE_PDA } from './rewards.service.js';

@Controller()
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  private assertAdminRole(role: string): void {
    if (role !== 'admin' && role !== 'global') {
      throw new ForbiddenException('Admin privileges required.');
    }
  }

  @Public()
  @Get('wunderland/rewards/epochs')
  async listEpochs(@Query('enclave') enclavePda?: string) {
    if (!enclavePda) {
      return { epochs: [], error: 'enclave query param required' };
    }
    const epochs = await this.rewardsService.listEpochs(enclavePda);
    return { epochs };
  }

  @Public()
  @Get('wunderland/rewards/proof/:epochId/:agentPda')
  async getClaimProof(
    @Param('epochId') epochId: string,
    @Param('agentPda') agentPda: string,
  ) {
    const proof = await this.rewardsService.getClaimProof(epochId, agentPda);
    if (!proof) {
      return { error: 'No reward entry found for this agent in this epoch.' };
    }
    return proof;
  }

  // ── Global rewards (GlobalTreasury-funded) ──────────────────────────────

  @Public()
  @Get('wunderland/rewards/global/epochs')
  async listGlobalEpochs() {
    const epochs = await this.rewardsService.listGlobalEpochs();
    return { epochs };
  }

  @Public()
  @Get('wunderland/rewards/global/proof/:epochId/:agentPda')
  async getGlobalClaimProof(@Param('epochId') epochId: string, @Param('agentPda') agentPda: string) {
    const proof = await this.rewardsService.getClaimProof(epochId, agentPda);
    if (!proof) {
      return { error: 'No reward entry found for this agent in this epoch.' };
    }
    if (proof.enclavePda !== GLOBAL_REWARDS_ENCLAVE_PDA) {
      return { error: 'Epoch is not a global rewards epoch.' };
    }
    return proof;
  }

  @UseGuards(AuthGuard)
  @Post('wunderland/rewards/global/epochs/generate')
  @HttpCode(HttpStatus.CREATED)
  async generateGlobalEpoch(
    @CurrentUser('role') role: string,
    @Body()
    body: {
      epochNumber?: string | number;
      totalAmountLamports: string | number;
      sinceTimestampMs?: number;
      untilTimestampMs?: number;
    },
  ) {
    this.assertAdminRole(role);

    let epochNumber: bigint | undefined = undefined;
    if (body.epochNumber != null && String(body.epochNumber).trim()) {
      epochNumber = BigInt(String(body.epochNumber).trim());
    }

    const totalAmountLamports = BigInt(String(body.totalAmountLamports).trim());
    const generated = await this.rewardsService.generateGlobalEpoch({
      epochNumber,
      totalAmountLamports,
      sinceTimestampMs: body.sinceTimestampMs,
      untilTimestampMs: body.untilTimestampMs,
    });

    return { epoch: generated };
  }

  @UseGuards(AuthGuard)
  @Post('wunderland/rewards/global/epochs/:epochId/publish')
  async publishGlobalEpoch(
    @CurrentUser('role') role: string,
    @Param('epochId') epochId: string,
    @Body() body: { claimWindowSeconds?: string | number },
  ) {
    this.assertAdminRole(role);

    const claimWindowSeconds =
      body?.claimWindowSeconds != null && String(body.claimWindowSeconds).trim()
        ? BigInt(String(body.claimWindowSeconds).trim())
        : 0n;

    return this.rewardsService.publishGlobalEpoch({ epochId, claimWindowSeconds });
  }
}
