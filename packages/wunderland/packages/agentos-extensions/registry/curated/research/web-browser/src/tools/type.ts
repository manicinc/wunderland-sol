/**
 * Type Tool
 * Type text into input fields.
 *
 * @module @framers/agentos-ext-web-browser
 */

import type { ITool, JSONSchemaObject, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { BrowserService } from '../services/browserService.js';
import type { TypeResult } from '../types.js';

/**
 * Tool for typing into inputs
 */
export class TypeTool implements ITool {
  public readonly id = 'web-browser-type-v1';
  /** Tool call name used by the LLM / ToolExecutor. */
  public readonly name = 'browser_type';
  public readonly displayName = 'Browser Type';
  public readonly description = 'Type text into an input field using a CSS selector.';
  public readonly category = 'research';
  public readonly hasSideEffects = true;

  public readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    required: ['selector', 'text'],
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector for the input element',
      },
      text: {
        type: 'string',
        description: 'Text to type',
      },
      delay: {
        type: 'number',
        description: 'Delay between keystrokes (ms)',
        default: 0,
      },
      clear: {
        type: 'boolean',
        description: 'Clear existing text before typing',
        default: false,
      },
    },
    additionalProperties: false,
  };

  constructor(private browserService: BrowserService) {}

  /**
   * Execute typing
   */
  async execute(
    input: { selector: string; text: string; delay?: number; clear?: boolean },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult<TypeResult>> {
    try {
      const result = await this.browserService.type(input.selector, input.text, {
        delay: input.delay,
        clear: input.clear,
      });

      return { success: result.success, output: result, error: result.success ? undefined : 'Type failed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate input
   */
  validateArgs(input: Record<string, any>): { isValid: boolean; errors?: any[] } {
    const errors: string[] = [];

    if (!input.selector) {
      errors.push('Selector is required');
    } else if (typeof input.selector !== 'string') {
      errors.push('Selector must be a string');
    }

    if (input.text === undefined || input.text === null) {
      errors.push('Text is required');
    } else if (typeof input.text !== 'string') {
      errors.push('Text must be a string');
    }

    return errors.length === 0 ? { isValid: true } : { isValid: false, errors };
  }
}

