/**
 * Snapshot Tool
 * Get accessibility snapshot of the current page.
 *
 * @module @framers/agentos-ext-web-browser
 */

import type { ITool, JSONSchemaObject, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { BrowserService } from '../services/browserService.js';
import type { PageSnapshot } from '../types.js';

/**
 * Tool for getting page snapshot
 */
export class SnapshotTool implements ITool {
  public readonly id = 'web-browser-snapshot-v1';
  /** Tool call name used by the LLM / ToolExecutor. */
  public readonly name = 'browser_snapshot';
  public readonly displayName = 'Browser Snapshot';
  public readonly description = 'Get an accessibility-like snapshot of the current page (interactive elements, links, forms).';
  public readonly category = 'research';
  public readonly hasSideEffects = false;

  public readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    properties: {
      includeLinks: {
        type: 'boolean',
        default: true,
        description: 'Include links in snapshot',
      },
      includeForms: {
        type: 'boolean',
        default: true,
        description: 'Include forms in snapshot',
      },
    },
    additionalProperties: false,
  };

  constructor(private browserService: BrowserService) {}

  /**
   * Execute snapshot capture
   */
  async execute(
    input: { includeLinks?: boolean; includeForms?: boolean },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult<PageSnapshot>> {
    try {
      const snapshot = await this.browserService.getSnapshot();

      const includeLinks = input.includeLinks !== false;
      const includeForms = input.includeForms !== false;

      return {
        success: true,
        output: {
          ...snapshot,
          links: includeLinks ? snapshot.links : [],
          forms: includeForms ? snapshot.forms : [],
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate input
   */
  validateArgs(_input: Record<string, any>): { isValid: boolean; errors?: any[] } {
    return { isValid: true };
  }
}

