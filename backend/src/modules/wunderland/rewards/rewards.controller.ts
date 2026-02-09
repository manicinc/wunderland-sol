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

import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator.js';
import { RewardsService } from './rewards.service.js';

@Controller()
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

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
}
