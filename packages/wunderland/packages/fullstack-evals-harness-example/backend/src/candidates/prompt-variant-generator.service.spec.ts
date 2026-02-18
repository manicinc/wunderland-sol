import { BadRequestException } from '@nestjs/common';
import { PromptVariantGeneratorService } from './prompt-variant-generator.service';
import { LoadedPrompt } from './prompt-loader.service';

describe('PromptVariantGeneratorService', () => {
  const parentPrompt: LoadedPrompt = {
    id: 'analyst',
    name: 'Analyst',
    description: 'Analyze input',
    runnerType: 'llm_prompt',
    systemPrompt: 'You are an analyst.',
    userPromptTemplate: '{{input}}',
    modelConfig: null,
    endpointUrl: null,
    endpointMethod: null,
    endpointHeaders: null,
    endpointBodyTemplate: null,
    parentId: null,
    variantLabel: null,
    recommendedGraders: [],
    graderWeights: {},
    recommendedDatasets: [],
    graderRationale: null,
    notes: null,
    source: 'file',
    filePath: '/tmp/test/prompts/analyst/base.md',
  };

  function createService() {
    const promptLoader = {
      findOne: jest.fn().mockReturnValue(parentPrompt),
      findAll: jest.fn().mockReturnValue([parentPrompt]),
      createVariant: jest.fn(
        (
          parentId: string,
          data: { variantLabel: string; name?: string; description?: string; systemPrompt?: string }
        ) => ({
          ...parentPrompt,
          id: `${parentId}-${data.variantLabel}`,
          parentId,
          variantLabel: data.variantLabel,
          name: data.name || `${parentPrompt.name} (${data.variantLabel})`,
          description: data.description || null,
          systemPrompt: data.systemPrompt || parentPrompt.systemPrompt,
        })
      ),
      normalizeVariantLabel: jest.fn((label: string) =>
        label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      ),
      buildVariantId: jest.fn(
        (parentId: string, variantLabel: string) => `${parentId}-${variantLabel}`
      ),
    };

    const llmService = {
      getFullSettings: jest.fn().mockResolvedValue({
        provider: 'ollama',
        model: 'llama3',
        temperature: 0.7,
        maxTokens: 1024,
      }),
      complete: jest.fn().mockResolvedValue(
        JSON.stringify([
          {
            variantLabel: 'concise',
            name: 'Concise',
            description: 'Short format',
            systemPrompt: 'Be concise.',
          },
          {
            variantLabel: 'step-by-step',
            name: 'Step by Step',
            description: 'Explain steps',
            systemPrompt: 'Show reasoning clearly.',
          },
        ])
      ),
    };

    const service = new PromptVariantGeneratorService(promptLoader as any, llmService as any);

    return { service, promptLoader, llmService };
  }

  it('generates variants and uses provided overrides with settings defaults', async () => {
    const { service, llmService } = createService();

    const result = await service.generate('analyst', {
      count: 2,
      temperature: 0.4,
    });

    expect(result.created).toHaveLength(2);
    expect(result.usedConfig.provider).toBe('ollama');
    expect(result.usedConfig.model).toBe('llama3');
    expect(result.usedConfig.temperature).toBe(0.4);
    expect(result.usedConfig.maxTokens).toBe(1024);
    expect(llmService.complete).toHaveBeenCalled();
  });

  it('throws on invalid count', async () => {
    const { service } = createService();
    await expect(service.generate('analyst', { count: 0 })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it('rejects non-llm_prompt parents', async () => {
    const { service, promptLoader } = createService();
    promptLoader.findOne.mockReturnValue({
      ...parentPrompt,
      runnerType: 'http_endpoint',
    });

    await expect(service.generate('analyst', { count: 1 })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });
});
