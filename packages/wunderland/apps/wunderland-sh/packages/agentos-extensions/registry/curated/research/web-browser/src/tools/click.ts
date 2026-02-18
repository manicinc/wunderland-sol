/**
 * Click Tool
 * Click on elements in the current page.
 *
 * @module @framers/agentos-ext-web-browser
 */

import type { ITool, JSONSchemaObject, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { BrowserService } from '../services/browserService.js';
import type { ClickResult } from '../types.js';

/**
 * Tool for clicking elements
 */
export class ClickTool implements ITool {
  public readonly id = 'web-browser-click-v1';
  /** Tool call name used by the LLM / ToolExecutor. */
  public readonly name = 'browser_click';
  public readonly displayName = 'Browser Click';
  public readonly description = 'Click an element in the current page using a CSS selector.';
  public readonly category = 'research';
  public readonly hasSideEffects = true;

  public readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    required: ['selector'],
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector for the element to click',
      },
      waitForNavigation: {
        type: 'boolean',
        default: false,
        description: 'Wait for page navigation after click',
      },
    },
    additionalProperties: false,
  };

  constructor(private browserService: BrowserService) {}

  /**
   * Execute click
   */
  async execute(
    input: { selector: string; waitForNavigation?: boolean },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult<ClickResult>> {
    try {
      const result = await this.browserService.click(input.selector, {
        waitForNavigation: input.waitForNavigation,
      });

      return { success: result.success, output: result, error: result.success ? undefined : 'Click failed' };
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

    return errors.length === 0 ? { isValid: true } : { isValid: false, errors };
  }
}

