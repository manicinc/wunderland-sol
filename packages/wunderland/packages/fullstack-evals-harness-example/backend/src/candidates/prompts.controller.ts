import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { PromptLoaderService } from './prompt-loader.service';
import { CandidateRunnerService } from './candidate-runner.service';
import {
  PromptVariantGeneratorService,
  GeneratePromptVariantsDto,
} from './prompt-variant-generator.service';

@Controller('prompts')
export class PromptsController {
  constructor(
    private promptLoader: PromptLoaderService,
    private runner: CandidateRunnerService,
    private variantGenerator: PromptVariantGeneratorService
  ) {}

  @Get()
  listPrompts() {
    return this.promptLoader.findAll();
  }

  @Get(':id')
  getPrompt(@Param('id') id: string) {
    return this.promptLoader.findOne(id);
  }

  @Post(':id/test')
  async testPrompt(
    @Param('id') id: string,
    @Body() body: { input: string; context?: string; metadata?: Record<string, unknown> }
  ) {
    const prompt = this.promptLoader.findOne(id);
    const result = await this.runner.run(prompt, {
      input: body.input,
      context: body.context,
      metadata: body.metadata,
    });
    return result;
  }

  /**
   * Create a variant of an existing prompt.
   * Clones the parent prompt and writes a new .md file with parent_prompt/variant fields.
   */
  @Post(':id/variant')
  createVariant(
    @Param('id') id: string,
    @Body()
    body: {
      variantLabel: string;
      name?: string;
      description?: string;
      systemPrompt?: string;
    }
  ) {
    return this.promptLoader.createVariant(id, body);
  }

  /**
   * Suggest a display name for a variant using the configured LLM.
   */
  @Post(':id/variant/suggest-name')
  suggestVariantName(
    @Param('id') id: string,
    @Body() body: { variantLabel: string; systemPrompt?: string }
  ) {
    return this.variantGenerator.suggestVariantName(id, body);
  }

  /**
   * Generate multiple variants of a prompt using the configured LLM.
   * Generation options are configurable per request and fall back to global settings.
   */
  @Post(':id/variants/generate')
  generateVariants(@Param('id') id: string, @Body() body: GeneratePromptVariantsDto) {
    return this.variantGenerator.generate(id, body);
  }

  @Put(':id')
  updatePrompt(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      runnerType?: 'llm_prompt' | 'http_endpoint';
      systemPrompt?: string;
      userPromptTemplate?: string;
      temperature?: number;
      maxTokens?: number;
      provider?: string;
      model?: string;
      endpointUrl?: string;
      endpointMethod?: string;
      endpointBodyTemplate?: string;
      recommendedGraders?: string[];
      graderWeights?: Record<string, number>;
      recommendedDatasets?: string[];
      graderRationale?: string;
      notes?: string;
    }
  ) {
    return this.promptLoader.updatePrompt(id, body);
  }

  /**
   * Delete a prompt's .md file from disk.
   */
  @Delete(':id')
  deletePrompt(@Param('id') id: string) {
    return this.promptLoader.deletePrompt(id);
  }

  @Post('reload')
  reloadPrompts() {
    return this.promptLoader.loadAll();
  }
}
