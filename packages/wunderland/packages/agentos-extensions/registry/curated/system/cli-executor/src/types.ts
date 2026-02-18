/**
 * CLI Executor Extension Types
 * @module @framers/agentos-ext-cli-executor
 */

/**
 * Shell configuration options
 */
export interface ShellConfig {
  /** Default shell to use */
  defaultShell?: 'bash' | 'powershell' | 'cmd' | 'zsh' | 'sh' | 'auto';
  /** Default timeout for commands (ms) */
  timeout?: number;
  /** Default working directory */
  workingDirectory?: string;
  /**
   * Optional filesystem access policy for the file_* tools.
   *
   * When omitted, file tools can access any path (legacy behavior).
   * When set, read/write/list operations are restricted to the configured roots.
   */
  filesystem?: {
    /** Allow file reads and directory listings. Default: false. */
    allowRead?: boolean;
    /** Allow file writes. Default: false. */
    allowWrite?: boolean;
    /** Allowed root directories for reads/listing. */
    readRoots?: string[];
    /** Allowed root directories for writes. */
    writeRoots?: string[];
  };
  /**
   * Optional per-agent workspace helper. When provided, the extension can
   * auto-create an agent-specific directory and (optionally) default the
   * workingDirectory/readRoots/writeRoots to that directory.
   */
  agentWorkspace?: {
    /** Enable workspace behavior when provided. Default: true. */
    enabled?: boolean;
    /** Base directory under which per-agent folders are created. */
    baseDir?: string;
    /** Folder name for this agent. */
    agentId: string;
    /** Create the workspace directory if missing. Default: true. */
    createIfMissing?: boolean;
    /** Subdirectories to create inside the workspace. Default: ['assets','exports','tmp'] */
    subdirs?: string[];
  };
  /** Whitelist of allowed commands (empty = all allowed) */
  allowedCommands?: string[];
  /** Blacklist of blocked commands */
  blockedCommands?: string[];
  /**
   * Disable all command safety checks (dangerous patterns, allow/deny lists).
   * Use only in trusted environments.
   */
  dangerouslySkipSecurityChecks?: boolean;
  /** Environment variables to inject */
  env?: Record<string, string>;
}

/**
 * Result of a command execution
 */
export interface ExecutionResult {
  /** Command that was executed */
  command: string;
  /** Exit code (0 = success) */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Execution duration (ms) */
  duration: number;
  /** Whether command was successful */
  success: boolean;
  /** Working directory used */
  cwd: string;
  /** Shell used */
  shell: string;
}

/**
 * Script execution options
 */
export interface ScriptOptions {
  /** Script interpreter (python, node, bash, etc.) */
  interpreter?: string;
  /** Script arguments */
  args?: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout (ms) */
  timeout?: number;
}

/**
 * Result of a script execution
 */
export interface ScriptResult extends ExecutionResult {
  /** Script file path */
  scriptPath: string;
  /** Interpreter used */
  interpreter: string;
}

/**
 * File read options
 */
export interface FileReadOptions {
  /** Encoding (default: utf-8) */
  encoding?: BufferEncoding;
  /** Maximum bytes to read */
  maxBytes?: number;
  /** Start position */
  start?: number;
  /** Number of lines to read (from start or end) */
  lines?: number;
  /** Read from end of file */
  fromEnd?: boolean;
}

/**
 * File read result
 */
export interface FileReadResult {
  /** File path */
  path: string;
  /** File content */
  content: string;
  /** File size in bytes */
  size: number;
  /** Whether content was truncated */
  truncated: boolean;
  /** File encoding */
  encoding: string;
}

/**
 * File write options
 */
export interface FileWriteOptions {
  /** Encoding (default: utf-8) */
  encoding?: BufferEncoding;
  /** Append to file instead of overwrite */
  append?: boolean;
  /** Create parent directories if needed */
  createDirs?: boolean;
  /** File mode/permissions (Unix) */
  mode?: number;
}

/**
 * File write result
 */
export interface FileWriteResult {
  /** File path */
  path: string;
  /** Bytes written */
  bytesWritten: number;
  /** Whether file was created */
  created: boolean;
  /** Whether content was appended */
  appended: boolean;
}

/**
 * Directory entry
 */
export interface DirectoryEntry {
  /** Entry name */
  name: string;
  /** Full path */
  path: string;
  /** Entry type */
  type: 'file' | 'directory' | 'symlink' | 'other';
  /** Size in bytes (for files) */
  size?: number;
  /** Last modified time */
  modifiedAt?: string;
  /** Created time */
  createdAt?: string;
  /** File extension (for files) */
  extension?: string;
}

/**
 * Directory listing options
 */
export interface ListDirectoryOptions {
  /** Include hidden files */
  showHidden?: boolean;
  /** Recursive listing */
  recursive?: boolean;
  /** Maximum depth for recursive listing */
  maxDepth?: number;
  /** Filter pattern (glob) */
  pattern?: string;
  /** Include file stats */
  includeStats?: boolean;
}

/**
 * Directory listing result
 */
export interface ListDirectoryResult {
  /** Directory path */
  path: string;
  /** Directory entries */
  entries: DirectoryEntry[];
  /** Total count */
  count: number;
  /** Whether listing was recursive */
  recursive: boolean;
}

/**
 * Security check result
 */
export interface SecurityCheckResult {
  /** Whether command is allowed */
  allowed: boolean;
  /** Reason if blocked */
  reason?: string;
  /** Risk level */
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  /** Warnings */
  warnings: string[];
}

