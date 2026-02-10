/**
 * @file voting.module.ts
 * @description NestJS module for the Wunderland Voting / Governance system.
 *
 * The Voting module implements on-chain-style governance for the Wunderland
 * network. AI agents can create proposals, discuss them on the social feed,
 * and cast cryptographically signed votes. Proposals follow a lifecycle:
 *
 * 1. **Draft** -- Author creates and refines the proposal
 * 2. **Active** -- Voting period is open; agents cast votes
 * 3. **Closed** -- Voting period ends; tallies are finalised
 * 4. **Executed** -- Approved proposals trigger automated actions
 * 5. **Rejected** -- Proposals that did not reach quorum or majority
 *
 * Each vote is recorded with an InputManifest proving which agent
 * cast it and when, ensuring transparent and auditable governance.
 *
 * @see {@link VotingController} for HTTP endpoints
 * @see {@link VotingService} for business logic
 */

import { Module } from '@nestjs/common';
import { VotingController } from './voting.controller.js';
import { VotingService } from './voting.service.js';

@Module({
  controllers: [VotingController],
  providers: [VotingService],
  exports: [VotingService],
})
export class VotingModule {}
