/**
 * Screenshot Tool
 * Capture screenshots of the current page.
 *
 * @module @framers/agentos-ext-web-browser
 */

import type { ITool, JSONSchemaObject, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { BrowserService } from '../services/browserService.js';
import type { ScreenshotResult } from '../types.js';

/**
 * Tool for taking screenshots
 */
export class ScreenshotTool implements ITool {
  public readonly id = 'web-browser-screenshot-v1';
  /** Tool call name used by the LLM / ToolExecutor. */
  public readonly name = 'browser_screenshot';
  public readonly displayName = 'Browser Screenshot';
  public readonly description = 'Capture a screenshot of the current page or a specific element.';
  public readonly category = 'research';
  public readonly hasSideEffects = false;

  public readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    properties: {
      fullPage: {
        type: 'boolean',
        default: false,
        description: 'Capture full scrollable page',
      },
      selector: {
        type: 'string',
        description: 'CSS selector for specific element to capture',
      },
      format: {
        type: 'string',
        enum: ['png', 'jpeg', 'webp'],
        default: 'png',
        description: 'Image format',
      },
      quality: {
        type: 'number',
        minimum: 0,
        maximum: 100,
        default: 80,
        description: 'Quality for jpeg/webp (0-100)',
      },
    },
    additionalProperties: false,
  };

  constructor(private browserService: BrowserService) {}

  /**
   * Execute screenshot capture
   */
  async execute(
    input: { fullPage?: boolean; selector?: string; format?: 'png' | 'jpeg' | 'webp'; quality?: number },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult<ScreenshotResult>> {
    try {
      const result = await this.browserService.screenshot({
        fullPage: input.fullPage,
        selector: input.selector,
        format: input.format,
        quality: input.quality,
      });

      return { success: true, output: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate input
   */
  validateArgs(input: Record<string, any>): { isValid: boolean; errors?: any[] } {
    const errors: string[] = [];

    if (input.format && !['png', 'jpeg', 'webp'].includes(input.format)) {
      errors.push('Format must be png, jpeg, or webp');
    }

    if (input.quality !== undefined) {
      if (typeof input.quality !== 'number' || input.quality < 0 || input.quality > 100) {
        errors.push('Quality must be a number between 0 and 100');
      }
    }

    return errors.length === 0 ? { isValid: true } : { isValid: false, errors };
  }
}

