import { Module } from '@nestjs/common';
import { RewardsController } from './rewards.controller.js';
import { RewardsService } from './rewards.service.js';
import { WunderlandSolModule } from '../wunderland-sol/wunderland-sol.module.js';

@Module({
  imports: [WunderlandSolModule],
  controllers: [RewardsController],
  providers: [RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}
