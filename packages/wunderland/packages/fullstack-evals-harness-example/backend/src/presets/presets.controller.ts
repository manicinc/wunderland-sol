import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { GRADER_PRESETS } from './presets';
import { GradersService } from '../graders/graders.service';
import { DatasetsService } from '../datasets/datasets.service';
import { SyntheticService, SyntheticGenerationRequest } from './synthetic.service';
import { PromptLoaderService } from '../candidates/prompt-loader.service';

@Controller('presets')
export class PresetsController {
  constructor(
    private gradersService: GradersService,
    private datasetsService: DatasetsService,
    private syntheticService: SyntheticService,
    private promptLoaderService: PromptLoaderService
  ) {}

  /**
   * Get all grader presets
   */
  @Get('graders')
  getGraderPresets() {
    return GRADER_PRESETS;
  }

  /**
   * Load a grader preset - creates a new grader from the preset
   */
  @Post('graders/:id/load')
  async loadGraderPreset(@Param('id') id: string) {
    const preset = GRADER_PRESETS.find((p) => p.id === id);
    if (!preset) {
      throw new Error(`Grader preset not found: ${id}`);
    }

    try {
      return this.gradersService.findOne(id);
    } catch {
      // Continue and create from preset if not already present.
    }

    return this.gradersService.create({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      type: preset.type,
      rubric: preset.rubric,
      config: preset.config,
    });
  }

  /**
   * Load all grader presets at once - useful for demo/seed data.
   * Datasets are loaded from CSV files on startup (no seeding needed).
   */
  @Post('seed')
  async seedAll() {
    const results = {
      graders: [] as any[],
      skipped: [] as string[],
    };

    for (const preset of GRADER_PRESETS) {
      try {
        const existing = this.gradersService.findOne(preset.id);
        results.graders.push(existing);
        results.skipped.push(preset.id);
      } catch {
        const grader = await this.gradersService.create({
          id: preset.id,
          name: preset.name,
          description: preset.description,
          type: preset.type,
          rubric: preset.rubric,
          config: preset.config,
        });
        results.graders.push(grader);
      }
    }

    return results;
  }

  /**
   * Generate synthetic test cases using LLM
   */
  @Post('synthetic/generate')
  async generateSynthetic(@Body() request: SyntheticGenerationRequest) {
    return this.syntheticService.generateTestCases(request);
  }

  /**
   * Generate synthetic test cases and save as a CSV dataset.
   * Optionally link to a candidate prompt via forCandidateId.
   */
  @Post('synthetic/dataset')
  async generateSyntheticDataset(
    @Body()
    body: SyntheticGenerationRequest & {
      name: string;
      description?: string;
      forCandidateId?: string;
    }
  ) {
    const testCases = await this.syntheticService.generateTestCases(body);

    // Build CSV content
    const escCsv = (val: string) => '"' + (val || '').replace(/"/g, '""') + '"';
    const lines = ['input,expected_output,context,metadata'];
    for (const tc of testCases) {
      lines.push(
        [escCsv(tc.input), escCsv(tc.expectedOutput || ''), escCsv(tc.context || ''), '""'].join(
          ','
        )
      );
    }

    const filename = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const dataset = this.datasetsService.importCsv(filename, lines.join('\n') + '\n', {
      name: body.name,
      description: body.description || `Synthetic ${body.style} dataset: ${body.topic}`,
      synthetic: true,
    });

    // Auto-link dataset to candidate's recommended_datasets
    if (body.forCandidateId) {
      try {
        const candidate = this.promptLoaderService.findOne(body.forCandidateId);
        const existing = candidate.recommendedDatasets || [];
        if (!existing.includes(dataset.id)) {
          this.promptLoaderService.updatePrompt(body.forCandidateId, {
            recommendedDatasets: [...existing, dataset.id],
          });
        }
      } catch {
        // Candidate not found — skip linking, still return dataset
      }
    }

    return dataset;
  }
}
