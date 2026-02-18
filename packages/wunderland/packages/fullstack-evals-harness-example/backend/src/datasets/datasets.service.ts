import { Injectable } from '@nestjs/common';
import { DatasetLoaderService } from './dataset-loader.service';

@Injectable()
export class DatasetsService {
  constructor(private readonly loader: DatasetLoaderService) {}

  /**
   * Get all datasets with their test case counts.
   */
  findAll() {
    return this.loader.findAll().map((ds) => ({
      id: ds.id,
      name: ds.name,
      description: ds.description,
      source: ds.source,
      filePath: ds.filePath,
      metaPath: ds.metaPath,
      testCaseCount: ds.testCaseCount,
    }));
  }

  /**
   * Get a dataset by ID, including all its test cases.
   */
  findOne(id: string) {
    return this.loader.findOne(id);
  }

  /**
   * Reload all datasets from disk.
   */
  reload() {
    return this.loader.loadAll();
  }

  /**
   * Update a dataset: rewrite CSV and/or meta.json on disk.
   */
  update(
    id: string,
    data: {
      name?: string;
      description?: string;
      testCases?: Array<{
        input: string;
        expectedOutput?: string;
        context?: string;
        metadata?: Record<string, unknown>;
        customFields?: Record<string, string>;
      }>;
    }
  ) {
    return this.loader.updateDataset(id, data);
  }

  /**
   * Delete a dataset from disk and memory.
   */
  delete(id: string) {
    return this.loader.deleteDataset(id);
  }

  /**
   * Import a CSV file to the datasets directory.
   */
  importCsv(
    filename: string,
    csv: string,
    meta?: { name?: string; description?: string; synthetic?: boolean }
  ) {
    return this.loader.importCsv(filename, csv, meta);
  }
}
