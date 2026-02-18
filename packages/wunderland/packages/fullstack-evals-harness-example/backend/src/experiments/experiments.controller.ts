import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Sse,
  Res,
  Header,
  MessageEvent,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable, map } from 'rxjs';
import { ExperimentsService, CreateExperimentDto } from './experiments.service';

@Controller('experiments')
export class ExperimentsController {
  constructor(private readonly experimentsService: ExperimentsService) {}

  @Get()
  findAll() {
    return this.experimentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.experimentsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateExperimentDto) {
    return this.experimentsService.create(dto);
  }

  @Delete('clear-all')
  async clearAll() {
    const experiments = await this.experimentsService.findAll();
    for (const exp of experiments) {
      await this.experimentsService.remove(exp.id);
    }
    return { deleted: experiments.length };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.experimentsService.remove(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.experimentsService.getStats(id);
  }

  /**
   * SSE endpoint for real-time experiment progress.
   */
  @Sse(':id/stream')
  stream(@Param('id') id: string): Observable<MessageEvent> {
    return this.experimentsService.getProgressStream(id).pipe(
      map((progress) => ({
        data: progress,
      }))
    );
  }

  /**
   * Compare two candidates within an experiment.
   */
  @Get(':id/compare')
  compare(
    @Param('id') id: string,
    @Query('baseline') baselineId: string,
    @Query('challenger') challengerId: string
  ) {
    return this.experimentsService.compareCandidate(id, baselineId, challengerId);
  }

  /**
   * Export ALL experiments as a single consolidated CSV.
   */
  @Get('export/all-csv')
  @Header('Content-Type', 'text/csv')
  async exportAllCsv(@Res() res: Response) {
    const experiments = await this.experimentsService.findAll();

    const headers = [
      'experiment_id',
      'experiment_name',
      'dataset_id',
      'status',
      'model_provider',
      'model_name',
      'experiment_created_at',
      'test_case_id',
      'candidate_id',
      'grader_id',
      'pass',
      'score',
      'reason',
      'generated_output',
      'latency_ms',
      'result_created_at',
    ];

    const allRows: string[][] = [];
    for (const exp of experiments) {
      try {
        const full = await this.experimentsService.findOne(exp.id);
        for (const r of full.results) {
          allRows.push([
            exp.id,
            `"${(exp.name || '').replace(/"/g, '""')}"`,
            exp.datasetId,
            exp.status,
            r.modelProvider || '',
            r.modelName || '',
            exp.createdAt?.toISOString() || '',
            r.testCaseId,
            r.candidateId || '',
            r.graderId,
            r.pass ? 'true' : 'false',
            r.score?.toFixed(4) || '',
            `"${(r.reason || '').replace(/"/g, '""')}"`,
            `"${(r.generatedOutput || '').replace(/"/g, '""')}"`,
            r.latencyMs?.toString() || '',
            r.createdAt?.toISOString() || '',
          ]);
        }
      } catch {
        // Skip experiments that fail to load
      }
    }

    const csv = [headers.join(','), ...allRows.map((row) => row.join(','))].join('\n');
    const filename = `all-experiments-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  /**
   * Export experiment results as JSON.
   */
  @Get(':id/export/json')
  @Header('Content-Type', 'application/json')
  async exportJson(@Param('id') id: string, @Res() res: Response) {
    const experiment = await this.experimentsService.findOne(id);
    const stats = await this.experimentsService.getStats(id);

    const exportData = {
      experiment: {
        id: experiment.id,
        name: experiment.name,
        datasetId: experiment.datasetId,
        graderIds: experiment.graderIds,
        status: experiment.status,
        createdAt: experiment.createdAt,
        completedAt: experiment.completedAt,
      },
      stats,
      results: experiment.results.map((r) => ({
        testCaseId: r.testCaseId,
        candidateId: r.candidateId || null,
        graderId: r.graderId,
        pass: r.pass,
        score: r.score,
        reason: r.reason,
        output: r.output,
        generatedOutput: r.generatedOutput || null,
        latencyMs: r.latencyMs || null,
        createdAt: r.createdAt,
      })),
    };

    const filename = `experiment-${id}-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(exportData, null, 2));
  }

  /**
   * Export experiment results as CSV.
   */
  @Get(':id/export/csv')
  @Header('Content-Type', 'text/csv')
  async exportCsv(@Param('id') id: string, @Res() res: Response) {
    const experiment = await this.experimentsService.findOne(id);

    // CSV header
    const headers = [
      'test_case_id',
      'candidate_id',
      'grader_id',
      'pass',
      'score',
      'reason',
      'output',
      'generated_output',
      'latency_ms',
      'model_provider',
      'model_name',
      'created_at',
    ];

    // CSV rows
    const rows = experiment.results.map((r) => [
      r.testCaseId,
      r.candidateId || '',
      r.graderId,
      r.pass ? 'true' : 'false',
      r.score?.toFixed(4) || '',
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      `"${(r.output || '').replace(/"/g, '""')}"`,
      `"${(r.generatedOutput || '').replace(/"/g, '""')}"`,
      r.latencyMs?.toString() || '',
      r.modelProvider || '',
      r.modelName || '',
      r.createdAt?.toISOString() || '',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const filename = `experiment-${id}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
