/**
 * Scrape Tool
 * Extract content from web pages using CSS selectors.
 *
 * @module @framers/agentos-ext-web-browser
 */

import type { ITool, JSONSchemaObject, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { BrowserService } from '../services/browserService.js';
import type { ScrapeResult } from '../types.js';

/**
 * Tool for scraping page content
 */
export class ScrapeTool implements ITool {
  public readonly id = 'web-browser-scrape-v1';
  /** Tool call name used by the LLM / ToolExecutor. */
  public readonly name = 'browser_scrape';
  public readonly displayName = 'Browser Scrape';
  public readonly description = 'Extract content from the current page using a CSS selector.';
  public readonly category = 'research';
  public readonly hasSideEffects = false;

  public readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    required: ['selector'],
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector to match elements',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of elements to return',
        minimum: 1,
      },
      attributes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific attributes to extract',
      },
    },
    additionalProperties: false,
  };

  constructor(private browserService: BrowserService) {}

  /**
   * Execute scraping
   */
  async execute(
    input: { selector: string; limit?: number; attributes?: string[] },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult<ScrapeResult>> {
    try {
      const result = await this.browserService.scrape(input.selector);

      // Apply limit if specified
      if (input.limit && result.elements.length > input.limit) {
        result.elements = result.elements.slice(0, input.limit);
        result.count = result.elements.length;
      }

      // Filter attributes if specified
      if (input.attributes) {
        result.elements = result.elements.map((el) => ({
          ...el,
          attributes: Object.fromEntries(
            Object.entries(el.attributes).filter(([key]) =>
              input.attributes!.includes(key)
            )
          ),
        }));
      }

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

    if (!input.selector) {
      errors.push('Selector is required');
    } else if (typeof input.selector !== 'string') {
      errors.push('Selector must be a string');
    }

    if (input.limit !== undefined) {
      if (typeof input.limit !== 'number' || input.limit <= 0) {
        errors.push('Limit must be a positive number');
      }
    }

    return errors.length === 0 ? { isValid: true } : { isValid: false, errors };
  }
}

