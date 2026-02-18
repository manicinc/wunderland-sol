import { Controller, Get, Post, Put, Delete, Body, Param, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { DatasetsService } from './datasets.service';

@Controller('datasets')
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  @Get()
  findAll() {
    return this.datasetsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.datasetsService.findOne(id);
  }

  /**
   * Reload all datasets from CSV files on disk.
   */
  @Post('reload')
  reload() {
    return this.datasetsService.reload();
  }

  /**
   * Import a CSV dataset. Writes the CSV to the datasets/ directory.
   */
  @Post('import')
  importCsv(
    @Body()
    body: {
      filename: string;
      csv: string;
      name?: string;
      description?: string;
    }
  ) {
    return this.datasetsService.importCsv(body.filename, body.csv, {
      name: body.name,
      description: body.description,
    });
  }

  /**
   * Update a dataset: rewrite CSV and/or meta.json on disk.
   */
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
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
    return this.datasetsService.update(id, body);
  }

  /**
   * Delete a dataset: removes its subfolder from disk.
   */
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.datasetsService.delete(id);
  }

  /**
   * Export dataset as JSON.
   */
  @Get(':id/export/json')
  @Header('Content-Type', 'application/json')
  exportJson(@Param('id') id: string, @Res() res: Response) {
    const dataset = this.datasetsService.findOne(id);

    const exportData = {
      name: dataset.name,
      description: dataset.description,
      testCases: dataset.testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        context: tc.context,
        metadata: tc.metadata,
        customFields: tc.customFields,
      })),
    };

    const filename = `dataset-${dataset.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(exportData, null, 2));
  }

  /**
   * Export dataset as CSV.
   */
  @Get(':id/export/csv')
  @Header('Content-Type', 'text/csv')
  exportCsv(@Param('id') id: string, @Res() res: Response) {
    const dataset = this.datasetsService.findOne(id);

    const customHeaders = Array.from(
      new Set(dataset.testCases.flatMap((tc) => Object.keys(tc.customFields || {})))
    );
    const headers = ['input', 'expected_output', 'context', 'metadata', ...customHeaders];
    const rows = dataset.testCases.map((tc) => [
      `"${(tc.input || '').replace(/"/g, '""')}"`,
      `"${(tc.expectedOutput || '').replace(/"/g, '""')}"`,
      `"${(tc.context || '').replace(/"/g, '""')}"`,
      `"${tc.metadata ? JSON.stringify(tc.metadata).replace(/"/g, '""') : ''}"`,
      ...customHeaders.map(
        (header) => `"${(tc.customFields?.[header] || '').replace(/"/g, '""')}"`
      ),
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const filename = `dataset-${dataset.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
