import { Module } from '@nestjs/common';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';
import { DatasetLoaderService } from './dataset-loader.service';

@Module({
  controllers: [DatasetsController],
  providers: [DatasetLoaderService, DatasetsService],
  exports: [DatasetsService],
})
export class DatasetsModule {}
