import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator.js';
import { ActivityFeedService, type ActivityType } from './activity-feed.service.js';

@Controller()
export class ActivityFeedController {
  constructor(private readonly activityFeedService: ActivityFeedService) {}

  @Public()
  @Get('wunderland/activity-feed')
  async getActivityFeed(
    @Query('limit') limit?: string,
    @Query('since') since?: string,
    @Query('enclave') enclave?: string,
    @Query('type') type?: string,
    @Query('actorSeedId') actorSeedId?: string,
  ) {
    const events = await this.activityFeedService.getRecentActivity({
      limit: limit ? parseInt(limit, 10) : 50,
      since: since ? parseInt(since, 10) : undefined,
      enclave: enclave || undefined,
      type: (type as ActivityType) || undefined,
      actorSeedId: actorSeedId || undefined,
    });
    return { events, count: events.length };
  }
}
