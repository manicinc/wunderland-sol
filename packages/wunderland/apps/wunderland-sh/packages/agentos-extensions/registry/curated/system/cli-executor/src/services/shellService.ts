/**
 * Shell Service
 * Manages command execution with security validation.
 *
 * @module @framers/agentos-ext-cli-executor
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  ShellConfig,
  ExecutionResult,
  ScriptOptions,
  ScriptResult,
  FileReadOptions,
  FileReadResult,
  FileWriteOptions,
  FileWriteResult,
  ListDirectoryOptions,
  ListDirectoryResult,
  DirectoryEntry,
  SecurityCheckResult,
} from '../types.js';

const execPromise = promisify(exec);

/**
 * Dangerous command patterns to block by default
 */
const DANGEROUS_PATTERNS = [
  /rm\s+(-rf?|--recursive)\s+\/(?!\S)/i,  // rm -rf / (root)
  /rm\s+(-rf?|--recursive)\s+~(?!\S)/i,   // rm -rf ~ (home)
  /format\s+[a-z]:/i,                       // format C:
  /del\s+\/s\s+\/q\s+[a-z]:\\/i,           // del /s /q C:\
  /mkfs\./i,                                // mkfs.*
  /dd\s+.+of=\/dev\/sd/i,                  // dd to disk
  /:\(\)\s*\{\s*:\|\:\s*&\s*\}\s*;:/,      // Fork bomb
  />\s*\/dev\/sd[a-z]/i,                   // Write to disk device
  /shutdown|reboot|poweroff/i,              // System control
  /passwd|chpasswd/i,                       // Password changes
  /visudo|sudoers/i,                        // Sudo config
  /chmod\s+777\s+\//i,                      // chmod 777 /
  /chown\s+.+:\s*\//i,                      // chown root /
];

/**
 * Shell service for executing commands
 */
export class ShellService {
  private config: ShellConfig;

  constructor(config: ShellConfig = {}) {
    this.config = {
      defaultShell: 'auto',
      timeout: 60000,
      blockedCommands: [],
      dangerouslySkipSecurityChecks: false,
      ...config,
    };
  }

  private resolveAbsolutePath(filePath: string): string {
    const baseDir = this.config.workingDirectory || process.cwd();
    const abs = path.isAbsolute(filePath) ? filePath : path.resolve(baseDir, filePath);
    return path.normalize(abs);
  }

  private isFilesystemPolicyEnabled(): boolean {
    return !!this.config.filesystem;
  }

  private isWithinRoot(targetPath: string, rootPath: string): boolean {
    const rel = path.relative(rootPath, targetPath);
    return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
  }

  private async resolvePathForAuthorization(absolutePath: string, op: 'read' | 'write' | 'list'): Promise<string> {
    try {
      return await fs.realpath(absolutePath);
    } catch {
      // For writes, resolve the closest existing ancestor so symlink escapes are still detected.
      if (op !== 'write') return absolutePath;

      let cursor = path.dirname(absolutePath);
      while (true) {
        try {
          const realCursor = await fs.realpath(cursor);
          const remainder = path.relative(cursor, absolutePath);
          return path.join(realCursor, remainder);
        } catch {
          const parent = path.dirname(cursor);
          if (parent === cursor) break;
          cursor = parent;
        }
      }

      return absolutePath;
    }
  }

  private async assertFilesystemAllowed(op: 'read' | 'write' | 'list', absolutePath: string): Promise<void> {
    if (!this.isFilesystemPolicyEnabled()) return;

    const policy = this.config.filesystem!;
    const allow =
      op === 'write' ? policy.allowWrite === true : policy.allowRead === true;

    if (!allow) {
      throw new Error(`Filesystem ${op} is disabled by policy`);
    }

    const rootsRaw = op === 'write' ? policy.writeRoots : policy.readRoots;
    if (!Array.isArray(rootsRaw) || rootsRaw.length === 0) {
      throw new Error(`Filesystem ${op} roots are not configured`);
    }

    const baseDir = this.config.workingDirectory || process.cwd();
    const roots = await Promise.all(
      rootsRaw.map(async (root) => {
        const absRoot = path.isAbsolute(root) ? root : path.resolve(baseDir, root);
        const normalized = path.normalize(absRoot);
        try {
          return await fs.realpath(normalized);
        } catch {
          return normalized;
        }
      }),
    );

    const authPath = await this.resolvePathForAuthorization(absolutePath, op);
    const allowed = roots.some((root) => this.isWithinRoot(authPath, root));
    if (!allowed) {
      throw new Error(`Path is outside allowed filesystem ${op} roots: ${absolutePath}`);
    }
  }

  /**
   * Detect the appropriate shell for the current platform
   */
  private detectShell(): string {
    if (this.config.defaultShell && this.config.defaultShell !== 'auto') {
      return this.config.defaultShell;
    }

    const platform = process.platform;
    if (platform === 'win32') {
      return 'powershell';
    } else if (platform === 'darwin') {
      return 'zsh';
    } else {
      return 'bash';
    }
  }

  /**
   * Check if a command is safe to execute
   */
  checkSecurity(command: string): SecurityCheckResult {
    if (this.config.dangerouslySkipSecurityChecks) {
      return {
        allowed: true,
        reason: 'Security checks disabled by configuration',
        riskLevel: 'critical',
        warnings: ['Security checks are disabled'],
      };
    }

    const warnings: string[] = [];
    let riskLevel: SecurityCheckResult['riskLevel'] = 'safe';

    // Check against blocked commands list
    const blockedCommands = this.config.blockedCommands || [];
    for (const blocked of blockedCommands) {
      if (command.includes(blocked)) {
        return {
          allowed: false,
          reason: `Command contains blocked pattern: ${blocked}`,
          riskLevel: 'critical',
          warnings: [],
        };
      }
    }

    // Check against dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        return {
          allowed: false,
          reason: `Command matches dangerous pattern: ${pattern.source}`,
          riskLevel: 'critical',
          warnings: [],
        };
      }
    }

    // Check allowed commands whitelist
    if (this.config.allowedCommands && this.config.allowedCommands.length > 0) {
      const baseCommand = command.split(/\s+/)[0];
      if (!this.config.allowedCommands.includes(baseCommand)) {
        return {
          allowed: false,
          reason: `Command not in allowed list: ${baseCommand}`,
          riskLevel: 'medium',
          warnings: [],
        };
      }
    }

    // Risk assessment
    if (/sudo|su\s/i.test(command)) {
      warnings.push('Command uses elevated privileges');
      riskLevel = 'high';
    }
    if (/curl.*\|.*sh|wget.*\|.*sh/i.test(command)) {
      warnings.push('Piping downloaded content to shell');
      riskLevel = 'high';
    }
    if (/eval|exec/i.test(command)) {
      warnings.push('Command uses eval/exec');
      riskLevel = 'medium';
    }
    if (/>|>>/.test(command)) {
      warnings.push('Command redirects output to file');
      if (riskLevel === 'safe') riskLevel = 'low';
    }
    if (/rm\s|del\s|remove-item/i.test(command)) {
      warnings.push('Command deletes files');
      if (riskLevel === 'safe' || riskLevel === 'low') riskLevel = 'medium';
    }

    return {
      allowed: true,
      riskLevel,
      warnings,
    };
  }

  /**
   * Execute a shell command
   */
  async execute(
    command: string,
    options?: { cwd?: string; env?: Record<string, string>; timeout?: number }
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const shell = this.detectShell();
    const cwd = options?.cwd || this.config.workingDirectory || process.cwd();
    const timeout = options?.timeout || this.config.timeout || 60000;

    // Security check
    const securityCheck = this.checkSecurity(command);
    if (!securityCheck.allowed) {
      return {
        command,
        exitCode: 1,
        stdout: '',
        stderr: `Security violation: ${securityCheck.reason}`,
        duration: 0,
        success: false,
        cwd,
        shell,
      };
    }

    try {
      const env = { ...process.env, ...this.config.env, ...options?.env };

      const { stdout, stderr } = await execPromise(command, {
        cwd,
        env,
        timeout,
        shell: shell === 'powershell' ? 'powershell.exe' : shell,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      return {
        command,
        exitCode: 0,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        duration: Date.now() - startTime,
        success: true,
        cwd,
        shell,
      };
    } catch (error: any) {
      return {
        command,
        exitCode: error.code || 1,
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || error.message,
        duration: Date.now() - startTime,
        success: false,
        cwd,
        shell,
      };
    }
  }

  /**
   * Run a script file
   */
  async runScript(
    scriptPath: string,
    options?: ScriptOptions
  ): Promise<ScriptResult> {
    const startTime = Date.now();
    const cwd = options?.cwd || this.config.workingDirectory || process.cwd();
    const timeout = options?.timeout || this.config.timeout || 60000;

    // Detect interpreter from file extension if not specified
    let interpreter = options?.interpreter;
    if (!interpreter) {
      const ext = path.extname(scriptPath).toLowerCase();
      interpreter = {
        '.py': 'python',
        '.js': 'node',
        '.ts': 'npx ts-node',
        '.sh': 'bash',
        '.bash': 'bash',
        '.ps1': 'powershell',
        '.rb': 'ruby',
        '.pl': 'perl',
      }[ext] || 'bash';
    }

    const args = options?.args || [];
    const command = `${interpreter} "${scriptPath}" ${args.join(' ')}`;

    const result = await this.execute(command, { cwd, env: options?.env, timeout });

    return {
      ...result,
      scriptPath,
      interpreter,
    };
  }

  /**
   * Read a file
   */
  async readFile(filePath: string, options?: FileReadOptions): Promise<FileReadResult> {
    const encoding = options?.encoding || 'utf-8';
    const absolutePath = this.resolveAbsolutePath(filePath);

    await this.assertFilesystemAllowed('read', absolutePath);

    const stats = await fs.stat(absolutePath);

    let content: string;
    let truncated = false;

    if (options?.lines) {
      // Read specific number of lines
      const fileContent = await fs.readFile(absolutePath, encoding);
      const lines = fileContent.split('\n');

      if (options.fromEnd) {
        content = lines.slice(-options.lines).join('\n');
      } else {
        content = lines.slice(0, options.lines).join('\n');
      }
      truncated = lines.length > options.lines;
    } else if (options?.maxBytes) {
      // Read limited bytes
      const handle = await fs.open(absolutePath, 'r');
      const buffer = Buffer.alloc(options.maxBytes);
      const { bytesRead } = await handle.read(buffer, 0, options.maxBytes, options?.start || 0);
      await handle.close();
      content = buffer.slice(0, bytesRead).toString(encoding);
      truncated = stats.size > options.maxBytes;
    } else {
      // Read entire file
      content = await fs.readFile(absolutePath, encoding);
    }

    return {
      path: absolutePath,
      content,
      size: stats.size,
      truncated,
      encoding,
    };
  }

  /**
   * Write to a file
   */
  async writeFile(
    filePath: string,
    content: string,
    options?: FileWriteOptions
  ): Promise<FileWriteResult> {
    const encoding = options?.encoding || 'utf-8';
    const absolutePath = this.resolveAbsolutePath(filePath);

    await this.assertFilesystemAllowed('write', absolutePath);

    // Check if file exists
    let fileExists = true;
    try {
      await fs.access(absolutePath);
    } catch {
      fileExists = false;
    }

    // Create parent directories if needed
    if (options?.createDirs) {
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    }

    // Write file
    if (options?.append) {
      await fs.appendFile(absolutePath, content, { encoding, mode: options?.mode });
    } else {
      await fs.writeFile(absolutePath, content, { encoding, mode: options?.mode });
    }

    return {
      path: absolutePath,
      bytesWritten: Buffer.byteLength(content, encoding),
      created: !fileExists,
      appended: options?.append || false,
    };
  }

  /**
   * List directory contents
   */
  async listDirectory(
    dirPath: string,
    options?: ListDirectoryOptions
  ): Promise<ListDirectoryResult> {
    const absolutePath = this.resolveAbsolutePath(dirPath);

    await this.assertFilesystemAllowed('list', absolutePath);

    const entries: DirectoryEntry[] = [];

    const readDir = async (dir: string, depth: number) => {
      const items = await fs.readdir(dir, { withFileTypes: true });

      for (const item of items) {
        // Skip hidden files unless requested
        if (!options?.showHidden && item.name.startsWith('.')) {
          continue;
        }

        // Apply pattern filter
        if (options?.pattern) {
          const regex = new RegExp(
            options.pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
          );
          if (!regex.test(item.name)) {
            continue;
          }
        }

        const itemPath = path.join(dir, item.name);
        const entry: DirectoryEntry = {
          name: item.name,
          path: itemPath,
          type: item.isDirectory()
            ? 'directory'
            : item.isSymbolicLink()
            ? 'symlink'
            : item.isFile()
            ? 'file'
            : 'other',
        };

        if (item.isFile()) {
          entry.extension = path.extname(item.name);
        }

        // Include stats if requested
        if (options?.includeStats) {
          try {
            const stats = await fs.lstat(itemPath);
            entry.size = stats.size;
            entry.modifiedAt = stats.mtime.toISOString();
            entry.createdAt = stats.birthtime.toISOString();
          } catch {
            // Ignore stat errors
          }
        }

        entries.push(entry);

        // Recursive listing
        if (
          options?.recursive &&
          item.isDirectory() &&
          depth < (options?.maxDepth || 10)
        ) {
          await readDir(itemPath, depth + 1);
        }
      }
    };

    await readDir(absolutePath, 0);

    return {
      path: absolutePath,
      entries,
      count: entries.length,
      recursive: options?.recursive || false,
    };
  }
}
