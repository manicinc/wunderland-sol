import { Module } from '@nestjs/common';
import { ExperimentsController } from './experiments.controller';
import { ExperimentsService } from './experiments.service';
import { DatasetsModule } from '../datasets/datasets.module';
import { GradersModule } from '../graders/graders.module';
import { CandidatesModule } from '../candidates/candidates.module';

@Module({
  imports: [DatasetsModule, GradersModule, CandidatesModule],
  controllers: [ExperimentsController],
  providers: [ExperimentsService],
})
export class ExperimentsModule {}
