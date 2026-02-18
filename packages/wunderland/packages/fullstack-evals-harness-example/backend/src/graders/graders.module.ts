import { Module } from '@nestjs/common';
import { GradersController } from './graders.controller';
import { GradersService } from './graders.service';
import { GraderLoaderService } from './grader-loader.service';

@Module({
  controllers: [GradersController],
  providers: [GraderLoaderService, GradersService],
  exports: [GraderLoaderService, GradersService],
})
export class GradersModule {}
