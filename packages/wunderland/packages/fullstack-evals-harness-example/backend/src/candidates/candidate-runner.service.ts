import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { renderTemplate } from './template-utils';

export interface CandidateRunResult {
  output: string;
  latencyMs: number;
  error?: string;
}

export interface TestCaseInput {
  input: string;
  expectedOutput?: string;
  context?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CandidateRunnerService {
  constructor(private llmService: LlmService) {}

  /**
   * Run a candidate against a single test case.
   */
  async run(candidate: any, testCase: TestCaseInput): Promise<CandidateRunResult> {
    const start = Date.now();

    try {
      if (candidate.runnerType === 'llm_prompt') {
        const output = await this.runLlmPrompt(candidate, testCase);
        return { output, latencyMs: Date.now() - start };
      } else if (candidate.runnerType === 'http_endpoint') {
        const output = await this.runHttpEndpoint(candidate, testCase);
        return { output, latencyMs: Date.now() - start };
      } else {
        throw new Error(`Unknown runner type: ${candidate.runnerType}`);
      }
    } catch (error) {
      return {
        output: '',
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Run an LLM prompt candidate.
   * Interpolates {{input}}, {{context}}, {{metadata.*}} into the template.
   */
  private async runLlmPrompt(candidate: any, testCase: TestCaseInput): Promise<string> {
    const vars: Record<string, unknown> = {
      input: testCase.input,
      context: testCase.context || '',
      expected: testCase.expectedOutput || '',
      metadata: {},
    };

    // Provide both {{metadata.key}} and {{key}} access for convenience.
    if (testCase.metadata) {
      for (const [key, value] of Object.entries(testCase.metadata)) {
        (vars.metadata as Record<string, unknown>)[key] = value;
        vars[key] = value;
      }
    }

    const userPrompt = candidate.userPromptTemplate
      ? renderTemplate(candidate.userPromptTemplate, vars)
      : testCase.input;

    const systemPrompt = candidate.systemPrompt
      ? renderTemplate(candidate.systemPrompt, vars)
      : undefined;

    // Model config overrides (provider/model for multi-model comparison)
    const modelConfig = candidate.modelConfig || {};

    return this.llmService.complete(userPrompt, {
      systemPrompt,
      temperature: modelConfig.temperature,
      maxTokens: modelConfig.maxTokens,
      provider: modelConfig.provider,
      model: modelConfig.model,
      apiKey: modelConfig.apiKey,
      baseUrl: modelConfig.baseUrl,
    });
  }

  /**
   * Run an HTTP endpoint candidate.
   * POSTs (or GETs) the test case to an external API.
   */
  private async runHttpEndpoint(candidate: any, testCase: TestCaseInput): Promise<string> {
    const url = candidate.endpointUrl;
    if (!url) {
      throw new Error('HTTP endpoint candidate missing endpointUrl');
    }

    const method = (candidate.endpointMethod || 'POST').toUpperCase();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(candidate.endpointHeaders || {}),
    };

    let body: string | undefined;
    if (method !== 'GET') {
      if (candidate.endpointBodyTemplate) {
        const vars: Record<string, unknown> = {
          input: testCase.input,
          context: testCase.context || '',
          expected: testCase.expectedOutput || '',
          metadata: {},
        };
        if (testCase.metadata) {
          for (const [key, value] of Object.entries(testCase.metadata)) {
            (vars.metadata as Record<string, unknown>)[key] = value;
            vars[key] = value;
          }
        }
        body = renderTemplate(candidate.endpointBodyTemplate, vars);
      } else {
        body = JSON.stringify({
          input: testCase.input,
          context: testCase.context,
          metadata: testCase.metadata,
        });
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.text();

    // Try to extract text from JSON response
    try {
      const json = JSON.parse(data);
      return json.output || json.response || json.text || json.result || JSON.stringify(json);
    } catch {
      return data;
    }
  }
}
