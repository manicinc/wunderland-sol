import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';

export interface SyntheticTestCase {
  input: string;
  expectedOutput: string;
  context?: string;
}

export interface SyntheticGenerationRequest {
  topic: string;
  count: number;
  style: 'qa' | 'classification' | 'extraction' | 'rag';
  customInstructions?: string;
}

@Injectable()
export class SyntheticService {
  constructor(private llmService: LlmService) {}

  /**
   * Generate synthetic test cases using LLM
   */
  async generateTestCases(
    request: SyntheticGenerationRequest,
  ): Promise<SyntheticTestCase[]> {
    const prompt = this.buildPrompt(request);

    const response = await this.llmService.complete(prompt, {
      temperature: 0.8,
      maxTokens: 2048,
    });

    return this.parseResponse(response, request.style);
  }

  private buildPrompt(request: SyntheticGenerationRequest): string {
    const styleInstructions = {
      qa: `Generate question-answer pairs. Each question should have a clear, concise answer.`,
      classification: `Generate text samples with their correct classification labels. Common categories: positive/negative/neutral, spam/not-spam, etc.`,
      extraction: `Generate text passages with key information to extract. Include the expected extracted data.`,
      rag: `Generate questions with supporting context documents and answers that must be derived from the context.`,
    };

    return `You are a test data generator for AI evaluation systems.

Topic: ${request.topic}
Style: ${request.style}
Number of test cases: ${request.count}

${styleInstructions[request.style]}

${request.customInstructions ? `Additional instructions: ${request.customInstructions}` : ''}

Generate exactly ${request.count} test cases. Output as JSON array with this structure:
${request.style === 'rag' ? `[{"input": "question", "expectedOutput": "answer", "context": "supporting document"}]` : `[{"input": "input text", "expectedOutput": "expected output"}]`}

Important:
- Make test cases diverse and realistic
- Ensure expected outputs are accurate
- Keep inputs and outputs concise
- Only output valid JSON, no markdown formatting`;
  }

  private parseResponse(
    response: string,
    style: string,
  ): SyntheticTestCase[] {
    // Try to extract JSON from the response
    let jsonStr = response;

    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Try to find JSON array in the response
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonStr.trim());

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      // Validate and normalize each test case
      return parsed.map((item: any, index: number) => {
        if (!item.input || !item.expectedOutput) {
          throw new Error(
            `Test case ${index} missing required fields`,
          );
        }

        const testCase: SyntheticTestCase = {
          input: String(item.input).trim(),
          expectedOutput: String(item.expectedOutput).trim(),
        };

        if (item.context && style === 'rag') {
          testCase.context = String(item.context).trim();
        }

        return testCase;
      });
    } catch (error) {
      throw new Error(
        `Failed to parse LLM response as JSON: ${error.message}`,
      );
    }
  }
}
