import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/db.module';
import { DatasetsModule } from './datasets/datasets.module';
import { GradersModule } from './graders/graders.module';
import { ExperimentsModule } from './experiments/experiments.module';
import { LlmModule } from './llm/llm.module';
import { PresetsModule } from './presets/presets.module';
import { SettingsModule } from './settings/settings.module';
import { CandidatesModule } from './candidates/candidates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    DatabaseModule,
    LlmModule,
    DatasetsModule,
    GradersModule,
    CandidatesModule,
    ExperimentsModule,
    PresetsModule,
    SettingsModule,
  ],
})
export class AppModule {}
