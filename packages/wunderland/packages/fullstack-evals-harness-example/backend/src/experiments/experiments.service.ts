import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Subject, Observable } from 'rxjs';
import { DB_ADAPTER, IDbAdapter } from '../database/db.module';
import { DatasetsService } from '../datasets/datasets.service';
import { GradersService } from '../graders/graders.service';
import { PromptLoaderService, LoadedPrompt } from '../candidates/prompt-loader.service';
import { CandidateRunnerService } from '../candidates/candidate-runner.service';
import { LlmService } from '../llm/llm.service';
import { createGrader, GraderType, EvalInput } from '../eval-engine';

export interface CreateExperimentDto {
  name?: string;
  datasetId: string;
  graderIds: string[];
  candidateIds?: string[];
  modelConfig?: {
    provider?: string;
    model?: string;
  };
}

export interface ExperimentProgress {
  type: 'progress' | 'generation' | 'result' | 'complete' | 'error';
  experimentId: string;
  testCaseId?: string;
  graderId?: string;
  candidateId?: string;
  current?: number;
  total?: number;
  result?: {
    pass: boolean;
    score: number;
    reason: string;
  };
  generatedOutput?: string;
  error?: string;
}

@Injectable()
export class ExperimentsService {
  private experimentStreams = new Map<string, Subject<ExperimentProgress>>();

  constructor(
    @Inject(DB_ADAPTER)
    private db: IDbAdapter,
    private datasetsService: DatasetsService,
    private gradersService: GradersService,
    private promptLoaderService: PromptLoaderService,
    private candidateRunnerService: CandidateRunnerService,
    private llmService: LlmService
  ) {}

  /**
   * Get all experiments.
   */
  async findAll() {
    const experiments = await this.db.findAllExperiments();
    const results = await Promise.all(
      experiments.map(async (e) => {
        const stats = await this.db.getExperimentStats(e.id);
        return {
          ...e,
          graderIds: JSON.parse(e.graderIds),
          candidateIds: e.candidateIds ? JSON.parse(e.candidateIds) : null,
          modelConfig: e.modelConfig ? JSON.parse(e.modelConfig) : null,
          passRate: stats.total > 0 ? stats.passed / stats.total : null,
          totalResults: stats.total,
          passed: stats.passed,
          failed: stats.failed,
        };
      })
    );
    return results;
  }

  /**
   * Get an experiment by ID, including all results.
   */
  async findOne(id: string) {
    const experiment = await this.db.findExperimentById(id);

    if (!experiment) {
      throw new NotFoundException(`Experiment ${id} not found`);
    }

    const results = await this.db.findResultsByExperimentId(id);

    return {
      ...experiment,
      graderIds: JSON.parse(experiment.graderIds),
      candidateIds: experiment.candidateIds ? JSON.parse(experiment.candidateIds) : null,
      modelConfig: experiment.modelConfig ? JSON.parse(experiment.modelConfig) : null,
      results,
    };
  }

  /**
   * Delete an experiment and its results.
   */
  async remove(id: string) {
    const experiment = await this.db.findExperimentById(id);
    if (!experiment) {
      throw new NotFoundException(`Experiment ${id} not found`);
    }
    await this.db.deleteExperiment(id);
    return { deleted: true };
  }

  /**
   * Create and run a new experiment.
   */
  async create(dto: CreateExperimentDto) {
    const dataset = await this.datasetsService.findOne(dto.datasetId);
    const graders = await this.gradersService.findMany(dto.graderIds);

    // Fetch candidates if provided
    let candidates: any[] = [];
    if (dto.candidateIds && dto.candidateIds.length > 0) {
      candidates = this.promptLoaderService.findMany(dto.candidateIds);
    }

    // Ensure dataset exists in SQLite (file-based datasets skip the DB)
    const existingRow = await this.db.findDatasetById(dto.datasetId);
    if (!existingRow) {
      const now = new Date();
      await this.db.insertDataset({
        id: dataset.id,
        name: dataset.name,
        description: dataset.description || null,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Ensure test cases exist in SQLite (file-based datasets only live in memory)
    for (const tc of dataset.testCases) {
      const existingTC = await this.db.findTestCaseById(tc.id);
      if (!existingTC) {
        await this.db.insertTestCase({
          id: tc.id,
          datasetId: dataset.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput || null,
          context: tc.context || null,
          metadata: tc.metadata
            ? typeof tc.metadata === 'string'
              ? tc.metadata
              : JSON.stringify(tc.metadata)
            : null,
          createdAt: new Date(),
        });
      }
    }

    // Ensure graders exist in SQLite (file-based graders are YAML-only)
    for (const grader of graders) {
      const existingGrader = await this.db.findGraderById(grader.id);
      if (!existingGrader) {
        await this.db.insertGrader({
          id: grader.id,
          name: grader.name,
          description: grader.description || null,
          type: grader.type,
          rubric: grader.rubric || null,
          config: grader.config ? JSON.stringify(grader.config) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    const experiment = await this.db.insertExperiment({
      id: randomUUID(),
      name: dto.name || `Experiment ${new Date().toISOString().slice(0, 16)}`,
      datasetId: dto.datasetId,
      graderIds: JSON.stringify(dto.graderIds),
      candidateIds: candidates.length > 0 ? JSON.stringify(dto.candidateIds) : null,
      modelConfig: dto.modelConfig ? JSON.stringify(dto.modelConfig) : null,
      status: 'pending',
      createdAt: new Date(),
    });

    this.runExperiment(experiment.id, dataset, graders, candidates, dto.modelConfig);

    return {
      ...experiment,
      graderIds: dto.graderIds,
      candidateIds: dto.candidateIds || null,
    };
  }

  /**
   * Get SSE stream for experiment progress.
   */
  getProgressStream(experimentId: string): Observable<ExperimentProgress> {
    let subject = this.experimentStreams.get(experimentId);

    if (!subject) {
      subject = new Subject<ExperimentProgress>();
      this.experimentStreams.set(experimentId, subject);
    }

    return subject.asObservable();
  }

  /**
   * Run the experiment.
   * If candidates are provided: generate output per candidate, then grade.
   * If no candidates: grade expectedOutput directly (legacy mode).
   */
  private async runExperiment(
    experimentId: string,
    dataset: Awaited<ReturnType<typeof this.datasetsService.findOne>>,
    graders: Awaited<ReturnType<typeof this.gradersService.findMany>>,
    candidates: any[],
    modelConfig?: { provider?: string; model?: string }
  ) {
    const subject = this.experimentStreams.get(experimentId) || new Subject<ExperimentProgress>();
    this.experimentStreams.set(experimentId, subject);

    try {
      await this.db.updateExperiment(experimentId, { status: 'running' });

      // Resolve model metadata for results storage
      const globalSettings = await this.llmService.getFullSettings();
      const resolvedProvider = modelConfig?.provider || globalSettings.provider || 'openai';
      const resolvedModel = modelConfig?.model || globalSettings.model || '';

      const testCases = dataset.testCases;
      const hasCandidates = candidates.length > 0;

      // Calculate total evals
      const totalEvals = hasCandidates
        ? testCases.length * candidates.length * graders.length
        : testCases.length * graders.length;
      let current = 0;

      for (const testCase of testCases) {
        if (hasCandidates) {
          // Candidate mode: generate output per candidate, then grade
          for (const candidate of candidates) {
            // Generate output
            subject.next({
              type: 'generation',
              experimentId,
              testCaseId: testCase.id,
              candidateId: candidate.id,
            });

            const metadataFromRow = testCase.metadata
              ? typeof testCase.metadata === 'string'
                ? JSON.parse(testCase.metadata)
                : testCase.metadata
              : undefined;
            const metadata = {
              ...(metadataFromRow || {}),
              ...(testCase.customFields || {}),
            };

            // Merge experiment-level model config into candidate
            const candidateWithModel = modelConfig
              ? {
                  ...candidate,
                  modelConfig: {
                    ...(modelConfig || {}),
                    ...(candidate.modelConfig || {}),
                  },
                }
              : candidate;

            const runResult = await this.candidateRunnerService.run(candidateWithModel, {
              input: testCase.input,
              expectedOutput: testCase.expectedOutput || undefined,
              context: testCase.context || undefined,
              metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
            });

            const generatedOutput = runResult.output;

            if (runResult.error) {
              const generationError = `Generation error: ${runResult.error}`;

              subject.next({
                type: 'generation',
                experimentId,
                testCaseId: testCase.id,
                candidateId: candidate.id,
                error: runResult.error,
              });

              // Preserve matrix shape by emitting one failed result per grader.
              for (const graderDef of graders) {
                current++;

                subject.next({
                  type: 'progress',
                  experimentId,
                  testCaseId: testCase.id,
                  graderId: graderDef.id,
                  candidateId: candidate.id,
                  current,
                  total: totalEvals,
                });

                await this.db.insertResult({
                  id: randomUUID(),
                  experimentId,
                  testCaseId: testCase.id,
                  graderId: graderDef.id,
                  candidateId: candidate.id,
                  pass: false,
                  score: 0,
                  reason: generationError,
                  output: testCase.expectedOutput || '',
                  generatedOutput,
                  latencyMs: runResult.latencyMs,
                  modelProvider: resolvedProvider,
                  modelName: resolvedModel,
                  createdAt: new Date(),
                });

                subject.next({
                  type: 'result',
                  experimentId,
                  testCaseId: testCase.id,
                  graderId: graderDef.id,
                  candidateId: candidate.id,
                  current,
                  total: totalEvals,
                  result: {
                    pass: false,
                    score: 0,
                    reason: generationError,
                  },
                });
              }

              continue;
            }

            subject.next({
              type: 'generation',
              experimentId,
              testCaseId: testCase.id,
              candidateId: candidate.id,
              generatedOutput,
            });

            // Grade the generated output
            for (const graderDef of graders) {
              current++;

              subject.next({
                type: 'progress',
                experimentId,
                testCaseId: testCase.id,
                graderId: graderDef.id,
                candidateId: candidate.id,
                current,
                total: totalEvals,
              });

              try {
                const grader = createGrader(
                  graderDef.type as GraderType,
                  {
                    name: graderDef.name,
                    description: graderDef.description || undefined,
                    rubric: graderDef.rubric || undefined,
                    config: graderDef.config || undefined,
                  },
                  this.llmService
                );

                const evalInput: EvalInput = {
                  input: testCase.input,
                  output: generatedOutput,
                  expected: testCase.expectedOutput || undefined,
                  context: testCase.context || undefined,
                };

                const result = await grader.evaluate(evalInput);

                await this.db.insertResult({
                  id: randomUUID(),
                  experimentId,
                  testCaseId: testCase.id,
                  graderId: graderDef.id,
                  candidateId: candidate.id,
                  pass: result.pass,
                  score: result.score,
                  reason: result.reason,
                  output: testCase.expectedOutput || '',
                  generatedOutput,
                  latencyMs: runResult.latencyMs,
                  modelProvider: resolvedProvider,
                  modelName: resolvedModel,
                  createdAt: new Date(),
                });

                subject.next({
                  type: 'result',
                  experimentId,
                  testCaseId: testCase.id,
                  graderId: graderDef.id,
                  candidateId: candidate.id,
                  current,
                  total: totalEvals,
                  result: {
                    pass: result.pass,
                    score: result.score,
                    reason: result.reason,
                  },
                });
              } catch (error) {
                await this.db.insertResult({
                  id: randomUUID(),
                  experimentId,
                  testCaseId: testCase.id,
                  graderId: graderDef.id,
                  candidateId: candidate.id,
                  pass: false,
                  score: 0,
                  reason: `Evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  output: testCase.expectedOutput || '',
                  generatedOutput,
                  latencyMs: runResult.latencyMs,
                  modelProvider: resolvedProvider,
                  modelName: resolvedModel,
                  createdAt: new Date(),
                });

                subject.next({
                  type: 'error',
                  experimentId,
                  testCaseId: testCase.id,
                  graderId: graderDef.id,
                  candidateId: candidate.id,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            }
          }
        } else {
          // Legacy mode: grade expectedOutput directly
          for (const graderDef of graders) {
            current++;

            subject.next({
              type: 'progress',
              experimentId,
              testCaseId: testCase.id,
              graderId: graderDef.id,
              current,
              total: totalEvals,
            });

            try {
              const grader = createGrader(
                graderDef.type as GraderType,
                {
                  name: graderDef.name,
                  description: graderDef.description || undefined,
                  rubric: graderDef.rubric || undefined,
                  config: graderDef.config || undefined,
                },
                this.llmService
              );

              const evalInput: EvalInput = {
                input: testCase.input,
                output: testCase.expectedOutput || '',
                expected: testCase.expectedOutput || undefined,
                context: testCase.context || undefined,
              };

              const result = await grader.evaluate(evalInput);

              await this.db.insertResult({
                id: randomUUID(),
                experimentId,
                testCaseId: testCase.id,
                graderId: graderDef.id,
                pass: result.pass,
                score: result.score,
                reason: result.reason,
                output: evalInput.output,
                createdAt: new Date(),
              });

              subject.next({
                type: 'result',
                experimentId,
                testCaseId: testCase.id,
                graderId: graderDef.id,
                current,
                total: totalEvals,
                result: {
                  pass: result.pass,
                  score: result.score,
                  reason: result.reason,
                },
              });
            } catch (error) {
              await this.db.insertResult({
                id: randomUUID(),
                experimentId,
                testCaseId: testCase.id,
                graderId: graderDef.id,
                pass: false,
                score: 0,
                reason: `Evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                output: testCase.expectedOutput || '',
                createdAt: new Date(),
              });

              subject.next({
                type: 'error',
                experimentId,
                testCaseId: testCase.id,
                graderId: graderDef.id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }
        }
      }

      await this.db.updateExperiment(experimentId, {
        status: 'completed',
        completedAt: new Date(),
      });

      subject.next({ type: 'complete', experimentId });
      subject.complete();
    } catch (error) {
      await this.db.updateExperiment(experimentId, { status: 'failed' });

      subject.next({
        type: 'error',
        experimentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      subject.complete();
    } finally {
      setTimeout(() => {
        this.experimentStreams.delete(experimentId);
      }, 60000);
    }
  }

  /**
   * Get aggregate statistics for an experiment.
   */
  async getStats(experimentId: string) {
    const experiment = await this.findOne(experimentId);
    const stats = await this.db.getExperimentStats(experimentId);

    return {
      experimentId,
      totalTests: stats.total,
      totalGraders: (experiment.graderIds as string[]).length,
      passRate: stats.total > 0 ? stats.passed / stats.total : 0,
      passed: stats.passed,
      failed: stats.failed,
      graderStats: Object.entries(stats.byGrader).map(([graderId, data]) => ({
        graderId,
        ...data,
        passRate: data.total > 0 ? data.passed / data.total : 0,
      })),
      candidateStats: Object.entries(stats.byCandidate).map(([candidateId, data]) => {
        const byGraderArray = Object.entries(data.byGrader).map(([gid, gdata]) => ({
          graderId: gid,
          ...gdata,
          passRate: gdata.total > 0 ? gdata.passed / gdata.total : 0,
        }));

        // Compute weighted aggregate score using prompt's grader weights
        const prompt = this.tryFindPrompt(candidateId);
        const weights = prompt?.graderWeights || {};
        let weightedSum = 0;
        let weightTotal = 0;
        for (const gs of byGraderArray) {
          const w = weights[gs.graderId] || 1.0;
          weightedSum += gs.avgScore * w;
          weightTotal += w;
        }
        const weightedScore = weightTotal > 0 ? weightedSum / weightTotal : data.avgScore;

        return {
          candidateId,
          total: data.total,
          passed: data.passed,
          avgScore: data.avgScore,
          weightedScore,
          passRate: data.total > 0 ? data.passed / data.total : 0,
          byGrader: byGraderArray,
        };
      }),
    };
  }

  private tryFindPrompt(candidateId: string): LoadedPrompt | null {
    try {
      return this.promptLoaderService.findOne(candidateId);
    } catch {
      return null;
    }
  }

  /**
   * Compare two candidates from the same experiment.
   */
  async compareCandidate(experimentId: string, baselineId: string, challengerId: string) {
    const experiment = await this.findOne(experimentId);
    const results = experiment.results;

    const baselineResults = results.filter((r) => r.candidateId === baselineId);
    const challengerResults = results.filter((r) => r.candidateId === challengerId);

    // Build lookup by testCaseId+graderId
    const baselineMap = new Map<string, (typeof baselineResults)[0]>();
    for (const r of baselineResults) {
      baselineMap.set(`${r.testCaseId}:${r.graderId}`, r);
    }

    const challengerMap = new Map<string, (typeof challengerResults)[0]>();
    for (const r of challengerResults) {
      challengerMap.set(`${r.testCaseId}:${r.graderId}`, r);
    }

    let improved = 0;
    let regressed = 0;
    let same = 0;
    const comparisons: Array<{
      testCaseId: string;
      graderId: string;
      baseline: { pass: boolean; score: number | null };
      challenger: { pass: boolean; score: number | null };
      delta: string;
    }> = [];

    for (const [key, baseResult] of baselineMap) {
      const challResult = challengerMap.get(key);
      if (!challResult) continue;

      let delta: string;
      if (!baseResult.pass && challResult.pass) {
        delta = 'improved';
        improved++;
      } else if (baseResult.pass && !challResult.pass) {
        delta = 'regressed';
        regressed++;
      } else {
        delta = 'same';
        same++;
      }

      comparisons.push({
        testCaseId: baseResult.testCaseId,
        graderId: baseResult.graderId,
        baseline: { pass: baseResult.pass, score: baseResult.score },
        challenger: { pass: challResult.pass, score: challResult.score },
        delta,
      });
    }

    const baselinePassRate =
      baselineResults.length > 0
        ? baselineResults.filter((r) => r.pass).length / baselineResults.length
        : 0;
    const challengerPassRate =
      challengerResults.length > 0
        ? challengerResults.filter((r) => r.pass).length / challengerResults.length
        : 0;

    return {
      experimentId,
      baselineId,
      challengerId,
      summary: {
        baselinePassRate,
        challengerPassRate,
        deltaPassRate: challengerPassRate - baselinePassRate,
        improved,
        regressed,
        same,
        total: comparisons.length,
      },
      comparisons,
    };
  }
}
