/**
 * AgentOS CLI Executor Extension
 *
 * Provides shell command execution, script running, and file management
 * capabilities for AgentOS agents.
 *
 * @module @framers/agentos-ext-cli-executor
 * @version 1.1.0
 * @license MIT
 */

import type { ExtensionContext, ExtensionPack } from '@framers/agentos';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { ShellService } from './services/shellService.js';
import { ExecuteTool } from './tools/execute.js';
import { FileReadTool } from './tools/fileRead.js';
import { FileWriteTool } from './tools/fileWrite.js';
import { ListDirectoryTool } from './tools/listDir.js';
import type { ShellConfig } from './types.js';

/**
 * Extension configuration options
 */
export interface CLIExecutorExtensionOptions extends ShellConfig {
  /** Extension priority in the stack */
  priority?: number;
}

/**
 * Creates the CLI executor extension pack
 *
 * @param context - The extension context
 * @returns The configured extension pack
 *
 * @example
 * ```typescript
 * import { createExtensionPack } from '@framers/agentos-ext-cli-executor';
 *
 * const pack = createExtensionPack({
 *   options: {
 *     defaultShell: 'bash',
 *     timeout: 60000,
 *     blockedCommands: ['rm -rf /']
 *   },
 *   logger: console
 * });
 * ```
 */
export function createExtensionPack(context: ExtensionContext): ExtensionPack {
  const options = (context.options as CLIExecutorExtensionOptions) || {};

  let workspaceDir: string | undefined;
  let workspaceSubdirs: string[] = [];
  const workspaceConfig = options.agentWorkspace;
  if (workspaceConfig && workspaceConfig.enabled !== false) {
    const baseDir =
      (workspaceConfig.baseDir && String(workspaceConfig.baseDir).trim()) ||
      path.join(os.homedir(), 'Documents', 'AgentOS');
    const agentId = String(workspaceConfig.agentId || '').trim();
    if (agentId) {
      workspaceDir = path.resolve(baseDir, agentId);
      workspaceSubdirs = Array.isArray(workspaceConfig.subdirs) && workspaceConfig.subdirs.length > 0
        ? workspaceConfig.subdirs.map((d) => String(d)).filter(Boolean)
        : ['assets', 'exports', 'tmp'];
    }
  }

  const workingDirectory = options.workingDirectory || workspaceDir;
  const filesystem = options.filesystem
    ? {
        ...options.filesystem,
        readRoots:
          options.filesystem.allowRead === true &&
          (!options.filesystem.readRoots || options.filesystem.readRoots.length === 0) &&
          workspaceDir
            ? [workspaceDir]
            : options.filesystem.readRoots,
        writeRoots:
          options.filesystem.allowWrite === true &&
          (!options.filesystem.writeRoots || options.filesystem.writeRoots.length === 0) &&
          workspaceDir
            ? [workspaceDir]
            : options.filesystem.writeRoots,
      }
    : undefined;

  // Initialize shell service with configuration
  const shellService = new ShellService({
    defaultShell: options.defaultShell,
    timeout: options.timeout,
    workingDirectory,
    filesystem,
    agentWorkspace: options.agentWorkspace,
    allowedCommands: options.allowedCommands,
    blockedCommands: options.blockedCommands,
    dangerouslySkipSecurityChecks: options.dangerouslySkipSecurityChecks,
    env: options.env,
  });

  // Create tool instances
  const executeTool = new ExecuteTool(shellService);
  const fileReadTool = new FileReadTool(shellService);
  const fileWriteTool = new FileWriteTool(shellService);
  const listDirectoryTool = new ListDirectoryTool(shellService);

  return {
    name: '@framers/agentos-ext-cli-executor',
    version: '1.1.0',
    descriptors: [
      {
        id: executeTool.name,
        kind: 'tool',
        priority: options.priority || 50,
        payload: executeTool,
      },
      {
        id: fileReadTool.name,
        kind: 'tool',
        priority: options.priority || 50,
        payload: fileReadTool,
      },
      {
        id: fileWriteTool.name,
        kind: 'tool',
        priority: options.priority || 50,
        payload: fileWriteTool,
      },
      {
        id: listDirectoryTool.name,
        kind: 'tool',
        priority: options.priority || 50,
        payload: listDirectoryTool,
      },
    ],

    /**
     * Called when extension is activated
     */
    onActivate: async () => {
      if (context.onActivate) {
        await context.onActivate();
      }
      if (workspaceDir && workspaceConfig?.createIfMissing !== false) {
        await fs.mkdir(workspaceDir, { recursive: true });
        for (const sub of workspaceSubdirs) {
          await fs.mkdir(path.join(workspaceDir, sub), { recursive: true });
        }
      }
      context.logger?.info('CLI Executor Extension activated');
    },

    /**
     * Called when extension is deactivated
     */
    onDeactivate: async () => {
      if (context.onDeactivate) {
        await context.onDeactivate();
      }
      context.logger?.info('CLI Executor Extension deactivated');
    },
  };
}

// Export types and classes for consumers
export { ShellService } from './services/shellService.js';
export { ExecuteTool } from './tools/execute.js';
export { FileReadTool } from './tools/fileRead.js';
export { FileWriteTool } from './tools/fileWrite.js';
export { ListDirectoryTool } from './tools/listDir.js';
export * from './types.js';

// Default export for convenience
export default createExtensionPack;
