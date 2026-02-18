/**
 * File Write Tool
 * Write content to files.
 *
 * @module @framers/agentos-ext-cli-executor
 */

import type { ITool, JSONSchemaObject, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { ShellService } from '../services/shellService.js';
import type { FileWriteResult } from '../types.js';

/**
 * Tool for writing files
 */
export class FileWriteTool implements ITool {
  public readonly id = 'cli-file-write-v1';
  /** Tool call name used by the LLM / ToolExecutor. */
  public readonly name = 'file_write';
  public readonly displayName = 'Write File';
  public readonly description = 'Write or append content to a file on disk.';
  public readonly category = 'system';
  public readonly hasSideEffects = true;

  public readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    required: ['path', 'content'],
    properties: {
      path: {
        type: 'string',
        description: 'File path to write',
      },
      content: {
        type: 'string',
        description: 'Content to write',
      },
      encoding: {
        type: 'string',
        default: 'utf-8',
        description: 'File encoding',
      },
      append: {
        type: 'boolean',
        default: false,
        description: 'Append to file instead of overwriting',
      },
      createDirs: {
        type: 'boolean',
        default: true,
        description: 'Create parent directories if needed',
      },
    },
    additionalProperties: false,
  };

  constructor(private shellService: ShellService) {}

  /**
   * Write file
   */
  async execute(
    input: {
    path: string;
    content: string;
    encoding?: BufferEncoding;
    append?: boolean;
    createDirs?: boolean;
    },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult<FileWriteResult>> {
    try {
      const result = await this.shellService.writeFile(input.path, input.content, {
        encoding: input.encoding,
        append: input.append,
        createDirs: input.createDirs,
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

    if (input.content === undefined || input.content === null) {
      errors.push('Content is required');
    }

    return errors.length === 0 ? { isValid: true } : { isValid: false, errors };
  }
}

