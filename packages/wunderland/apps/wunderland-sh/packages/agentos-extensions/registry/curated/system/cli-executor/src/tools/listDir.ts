/**
 * List Directory Tool
 * List directory contents.
 *
 * @module @framers/agentos-ext-cli-executor
 */

import type { ITool, JSONSchemaObject, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { ShellService } from '../services/shellService.js';
import type { ListDirectoryResult } from '../types.js';

/**
 * Tool for listing directories
 */
export class ListDirectoryTool implements ITool {
  public readonly id = 'cli-list-directory-v1';
  /** Tool call name used by the LLM / ToolExecutor. */
  public readonly name = 'list_directory';
  public readonly displayName = 'List Directory';
  public readonly description = 'List files and directories within a path.';
  public readonly category = 'system';
  public readonly hasSideEffects = false;

  public readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    required: ['path'],
    properties: {
      path: {
        type: 'string',
        description: 'Directory path to list',
      },
      showHidden: {
        type: 'boolean',
        default: false,
        description: 'Include hidden files',
      },
      recursive: {
        type: 'boolean',
        default: false,
        description: 'Recursive listing',
      },
      maxDepth: {
        type: 'number',
        default: 10,
        description: 'Maximum depth for recursive listing',
      },
      pattern: {
        type: 'string',
        description: 'Filter pattern (glob)',
      },
      includeStats: {
        type: 'boolean',
        default: false,
        description: 'Include file stats (size, dates)',
      },
    },
    additionalProperties: false,
  };

  constructor(private shellService: ShellService) {}

  /**
   * List directory
   */
  async execute(
    input: {
    path: string;
    showHidden?: boolean;
    recursive?: boolean;
    maxDepth?: number;
    pattern?: string;
    includeStats?: boolean;
    },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult<ListDirectoryResult>> {
    try {
      const result = await this.shellService.listDirectory(input.path, {
        showHidden: input.showHidden,
        recursive: input.recursive,
        maxDepth: input.maxDepth,
        pattern: input.pattern,
        includeStats: input.includeStats,
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

    if (!input.path) {
      errors.push('Path is required');
    } else if (typeof input.path !== 'string') {
      errors.push('Path must be a string');
    }

    return errors.length === 0 ? { isValid: true } : { isValid: false, errors };
  }
}

