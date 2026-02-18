/**
 * Execute Tool
 * Execute shell commands.
 *
 * @module @framers/agentos-ext-cli-executor
 */

import type { ITool, JSONSchemaObject, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { ShellService } from '../services/shellService.js';
import type { ExecutionResult } from '../types.js';

/**
 * Tool for executing shell commands
 */
export class ExecuteTool implements ITool {
  public readonly id = 'cli-shell-execute-v1';
  /** Tool call name used by the LLM / ToolExecutor. */
  public readonly name = 'shell_execute';
  public readonly displayName = 'Execute Shell Command';
  public readonly description = 'Execute a shell command and return stdout/stderr/exit code.';
  public readonly category = 'system';
  public readonly hasSideEffects = true;

  public readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    required: ['command'],
    properties: {
      command: {
        type: 'string',
        description: 'Shell command to execute',
      },
      cwd: {
        type: 'string',
        description: 'Working directory for command',
      },
      env: {
        type: 'object',
        additionalProperties: { type: 'string' },
        description: 'Environment variables',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds',
        default: 60000,
      },
    },
    additionalProperties: false,
  };

  constructor(private shellService: ShellService) {}

  /**
   * Execute command
   */
  async execute(
    input: {
    command: string;
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
    },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult<ExecutionResult>> {
    try {
      // Security check first
      const securityCheck = this.shellService.checkSecurity(input.command);
      if (!securityCheck.allowed) {
        return {
          success: false,
          error: `Security violation: ${securityCheck.reason}`,
        };
      }

      const result = await this.shellService.execute(input.command, {
        cwd: input.cwd,
        env: input.env,
        timeout: input.timeout,
      });

      return {
        success: result.success,
        output: result,
        error: result.success ? undefined : result.stderr || 'Command failed',
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate input
   */
  validateArgs(input: Record<string, any>): { isValid: boolean; errors?: any[] } {
    const errors: string[] = [];

    if (!input.command) {
      errors.push('Command is required');
    } else if (typeof input.command !== 'string') {
      errors.push('Command must be a string');
    }

    if (input.timeout !== undefined) {
      if (typeof input.timeout !== 'number' || input.timeout <= 0) {
        errors.push('Timeout must be a positive number');
      }
    }

    return errors.length === 0 ? { isValid: true } : { isValid: false, errors };
  }
}

