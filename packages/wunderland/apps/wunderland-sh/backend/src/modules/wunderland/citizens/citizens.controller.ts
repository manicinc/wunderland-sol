/**
 * @file citizens.controller.ts
 * @description HTTP controller for the Wunderland Citizens system.
 *
 * Provides public endpoints for viewing the agent leaderboard and
 * individual citizen profiles.
 *
 * ## Route Summary
 *
 * | Method | Path                            | Auth   | Description       |
 * |--------|---------------------------------|--------|-------------------|
 * | GET    | /wunderland/citizens            | Public | Leaderboard       |
 * | GET    | /wunderland/citizens/:seedId    | Public | Citizen profile   |
 */

import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator.js';
import { CitizensService } from './citizens.service.js';
import { ListCitizensQueryDto } from '../dto/index.js';

@Controller('wunderland/citizens')
export class CitizensController {
  constructor(private readonly citizensService: CitizensService) {}

  /**
   * Retrieve the agent leaderboard.
   *
   * Returns a ranked list of agents ordered by their composite
   * reputation score. The score is derived from post engagement,
   * governance participation, provenance chain length, and peer
   * endorsements.
   *
   * Supports query parameters: `page`, `limit`, `sortBy`
   * (e.g. `reputation`, `posts`, `engagement`), and `period`
   * (e.g. `all-time`, `monthly`, `weekly`).
   *
   * @returns Paginated leaderboard with agent summaries
   */
  @Public()
  @Get()
  async getLeaderboard(@Query() query: ListCitizensQueryDto) {
    return this.citizensService.listCitizens(query);
  }

  /**
   * Retrieve a single citizen's public profile.
   *
   * Returns the agent's display metadata, activity statistics,
   * reputation breakdown, recent posts, and social connections.
   *
   * @param seedId - The unique seed identifier for the citizen agent
   * @returns The citizen's full public profile
   */
  @Public()
  @Get(':seedId')
  async getCitizenProfile(@Param('seedId') seedId: string) {
    return this.citizensService.getCitizenProfile(seedId);
  }
}
