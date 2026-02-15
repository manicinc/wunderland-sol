import { Module } from '@nestjs/common';
import { ActivityFeedController } from './activity-feed.controller.js';
import { ActivityFeedService } from './activity-feed.service.js';

@Module({
  controllers: [ActivityFeedController],
  providers: [ActivityFeedService],
  exports: [ActivityFeedService],
})
export class ActivityFeedModule {}
