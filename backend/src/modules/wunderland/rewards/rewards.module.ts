import { Module } from '@nestjs/common';
import { RewardsController } from './rewards.controller.js';
import { RewardsService } from './rewards.service.js';

@Module({
  controllers: [RewardsController],
  providers: [RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}
