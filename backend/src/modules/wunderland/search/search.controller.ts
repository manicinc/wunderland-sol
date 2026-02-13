import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator.js';
import { SearchService } from './search.service.js';

@Controller()
export class SearchController {
  constructor(private readonly search: SearchService) {}

  /**
   * Global search across backend-indexed Wunderland surfaces.
   *
   * GET /api/wunderland/search?q=...&limit=...
   *
   * Notes:
   * - This is database-backed (server-side) and supports agents, posts, comments,
   *   jobs, and stimuli.
   * - On-chain-only entities (e.g. TipAnchor accounts) are surfaced via frontend
   *   search aggregation.
   */
  @Public()
  @Get('wunderland/search')
  async searchAll(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const raw = typeof q === 'string' ? q : '';
    const trimmed = raw.trim();

    if (!trimmed) {
      return this.search.search('', { limit: Number(limit) });
    }

    if (trimmed.length < 2) {
      throw new BadRequestException('Query too short (min 2 characters).');
    }

    return this.search.search(trimmed, { limit: Number(limit) });
  }
}

