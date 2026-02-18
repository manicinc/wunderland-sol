/**
 * @file voting.controller.ts
 * @description HTTP controller for the Wunderland Voting / Governance system.
 *
 * Provides endpoints for listing governance proposals, creating new
 * proposals, viewing proposal details with vote tallies, and casting
 * votes. Vote casting requires authentication; all other endpoints
 * are publicly accessible for transparency.
 *
 * ## Route Summary
 *
 * | Method | Path                              | Auth     | Description        |
 * |--------|-----------------------------------|----------|--------------------|
 * | GET    | /wunderland/proposals             | Public   | List proposals     |
 * | POST   | /wunderland/proposals             | Required | Create proposal    |
 * | GET    | /wunderland/proposals/:id         | Public   | Proposal detail    |
 * | POST   | /wunderland/proposals/:id/vote    | Required | Cast a vote        |
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator.js';
import { AuthGuard } from '../../../common/guards/auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { VotingService } from './voting.service.js';
import { CastVoteDto, CreateProposalDto, ListProposalsQueryDto } from '../dto/index.js';

@Controller('wunderland/proposals')
export class VotingController {
  constructor(private readonly votingService: VotingService) {}

  /**
   * List all governance proposals.
   *
   * Returns proposals in reverse-chronological order. Supports query
   * parameters: `page`, `limit`, `status` (e.g. `draft`, `active`,
   * `closed`, `executed`, `rejected`), and `author` (seed ID).
   *
   * @returns Paginated list of proposals with summary tallies
   */
  @Public()
  @Get()
  async listProposals(@Query() query: ListProposalsQueryDto) {
    return this.votingService.listProposals(query);
  }

  /**
   * Create a new governance proposal.
   *
   * The request body should contain:
   * - `title` -- Short title for the proposal
   * - `description` -- Full markdown description of the proposal
   * - `options` -- Array of voting options (e.g. `['For', 'Against', 'Abstain']`)
   * - `votingPeriodHours` -- Duration of the voting period in hours
   * - `quorumPercentage` -- Minimum participation percentage for validity
   * - `metadata` -- Optional key-value metadata
   *
   * The proposal is created in `draft` status and must be explicitly
   * activated to begin the voting period.
   *
   * @returns The newly created proposal record
   */
  @UseGuards(AuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProposal(@CurrentUser('id') userId: string, @Body() body: CreateProposalDto) {
    return this.votingService.createProposal(userId, body);
  }

  /**
   * Retrieve a single proposal with its full details and current
   * vote tallies.
   *
   * Includes the proposal description, voting options, current tallies,
   * participation count, time remaining (if active), and the list of
   * votes with their InputManifest references.
   *
   * @param id - The unique proposal identifier
   * @returns The proposal with detailed vote breakdown
   */
  @Public()
  @Get(':id')
  async getProposal(@Param('id') id: string) {
    return this.votingService.getProposal(id);
  }

  /**
   * Cast a vote on an active proposal.
   *
   * The request body should contain:
   * - `option` -- The selected voting option (must match one of the
   *   proposal's defined options)
   * - `seedId` -- The agent casting the vote (must be owned by the
   *   authenticated user)
   * - `rationale` -- Optional text explaining the vote rationale
   *
   * Each agent may vote only once per proposal. Votes are recorded
   * with a cryptographic InputManifest for auditability. A
   * `voting:proposal-update` WebSocket event is emitted with
   * updated tallies.
   *
   * @param id - The unique proposal identifier
   * @returns The recorded vote with its manifest reference
   */
  @UseGuards(AuthGuard)
  @Post(':id/vote')
  @HttpCode(HttpStatus.OK)
  async castVote(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: CastVoteDto
  ) {
    return this.votingService.castVote(userId, id, body);
  }
}
