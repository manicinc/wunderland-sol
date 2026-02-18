# CLI Executor Extension for AgentOS

Execute shell commands, run scripts, and manage files for AgentOS agents. This is one of the two fundamental primitives (along with Web Browser) that enables recursive self-building agent capabilities.

## Features

- **Shell Execution**: Run any shell command with output capture
- **File Management**: Read, write, and list files/directories
- **Security Controls**: Dangerous command detection and blocking
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Installation

```bash
npm install @framers/agentos-ext-cli-executor
```

## Quick Start

```typescript
import { ExtensionManager } from '@framers/agentos';
import { createExtensionPack } from '@framers/agentos-ext-cli-executor';

const extensionManager = new ExtensionManager();

// Load the pack into the runtime
await extensionManager.loadPackFromFactory(
  createExtensionPack({
    options: {
      defaultShell: 'bash',
      timeout: 60000,
      blockedCommands: ['rm -rf /', 'format'],
      // Restrict file_* tools to a per-agent workspace
      filesystem: { allowRead: true, allowWrite: true },
      agentWorkspace: { agentId: 'my-agent' },
    },
    logger: console,
  }),
  '@framers/agentos-ext-cli-executor',
);
```

## Tools

### shell_execute

Execute a shell command.

```typescript
const result = await gmi.executeTool('shell_execute', {
  command: 'npm install lodash',
  cwd: '/path/to/project',
  timeout: 30000
});
// Returns: { command, exitCode, stdout, stderr, duration, success }
```

### file_read

Read file contents.

```typescript
const result = await gmi.executeTool('file_read', {
  path: './package.json',
  encoding: 'utf-8'
});
// Returns: { path, content, size, truncated, encoding }

// Read last 50 lines
const logs = await gmi.executeTool('file_read', {
  path: './app.log',
  lines: 50,
  fromEnd: true
});
```

### file_write

Write content to a file.

```typescript
const result = await gmi.executeTool('file_write', {
  path: './config.json',
  content: JSON.stringify({ key: 'value' }),
  createDirs: true
});
// Returns: { path, bytesWritten, created, appended }
```

### list_directory

List directory contents.

```typescript
const result = await gmi.executeTool('list_directory', {
  path: './src',
  recursive: true,
  pattern: '*.ts',
  includeStats: true
});
// Returns: { path, entries: [{ name, path, type, size, ... }], count }
```

## Security

The extension includes built-in security controls:

### Dangerous Pattern Detection

Commands matching these patterns are blocked by default:
- `rm -rf /` (recursive delete root)
- `format C:` (format drives)
- Fork bombs
- Direct disk writes
- System shutdown/reboot commands

### Custom Blocklists

```typescript
createExtensionPack({
  options: {
    blockedCommands: ['sudo', 'su', 'chmod 777'],
    allowedCommands: ['npm', 'node', 'python', 'git'] // Whitelist mode
  }
});
```

### Disabling Safety Checks (Dangerous)

If you need full control (for example, in a locked-down container or local dev), you can disable all command safety checks:

```typescript
createExtensionPack({
  options: {
    dangerouslySkipSecurityChecks: true
  }
});
```

### Risk Assessment

Each command is assessed for risk level:

| Risk Level | Examples |
|------------|----------|
| `safe` | `ls`, `cat`, `npm list` |
| `low` | `echo "text" > file.txt` |
| `medium` | `rm file.txt`, `eval` |
| `high` | `sudo`, `curl | sh` |
| `critical` | `rm -rf /`, blocked patterns |

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultShell` | string | `auto` | Shell to use (bash, powershell, cmd, zsh) |
| `timeout` | number | `60000` | Default timeout (ms) |
| `workingDirectory` | string | `process.cwd()` | Default working directory |
| `filesystem` | object | `undefined` | Optional policy for file_* tools (allowRead/allowWrite + roots) |
| `agentWorkspace` | object | `undefined` | Optional per-agent workspace directory helper |
| `allowedCommands` | string[] | `[]` | Command whitelist (empty = all) |
| `blockedCommands` | string[] | `[]` | Command blacklist (additional to built-in dangerous patterns) |
| `dangerouslySkipSecurityChecks` | boolean | `false` | Disable all command safety checks (use only in trusted environments) |
| `env` | object | `{}` | Environment variables |

### Filesystem Policy (Recommended)

By default, the `file_*` tools can access any path (legacy behavior). To enforce a safe filesystem sandbox, configure `filesystem` + roots:

```ts
createExtensionPack({
  options: {
    filesystem: {
      allowRead: true,
      allowWrite: true,
      readRoots: ['/Users/me/Documents/AgentOS/agents/my-agent'],
      writeRoots: ['/Users/me/Documents/AgentOS/agents/my-agent'],
    },
  },
});
```

### Per-Agent Workspace Helper

To simplify safe defaults, you can configure `agentWorkspace`. When paired with `filesystem.allowRead/allowWrite`, the extension defaults roots to the workspace directory.

```ts
createExtensionPack({
  options: {
    filesystem: { allowRead: true, allowWrite: true },
    agentWorkspace: {
      agentId: 'my-agent',
      // baseDir defaults to ~/Documents/AgentOS
      subdirs: ['assets', 'exports', 'tmp'],
    },
  },
});
```

## Use Cases

### Code Generation and Execution

```typescript
// Write generated code
await gmi.executeTool('file_write', {
  path: './generated/app.py',
  content: generatedPythonCode,
  createDirs: true
});

// Execute it
await gmi.executeTool('shell_execute', {
  command: 'python ./generated/app.py',
  timeout: 30000
});
```

### Project Setup

```typescript
// Create project structure
await gmi.executeTool('shell_execute', {
  command: 'npx create-react-app my-app --template typescript'
});

// Install dependencies
await gmi.executeTool('shell_execute', {
  command: 'npm install axios lodash',
  cwd: './my-app'
});
```

### Log Analysis

```typescript
// Read recent logs
const logs = await gmi.executeTool('file_read', {
  path: '/var/log/app.log',
  lines: 100,
  fromEnd: true
});

// Parse and analyze
const errorCount = logs.output.content.match(/ERROR/g)?.length || 0;
```

## The Two Primitives Theory

This extension, combined with the Web Browser extension, provides the two fundamental capabilities needed for a recursive self-building agent:

1. **CLI Executor** (this extension)
   - Execute arbitrary code
   - Manage files
   - Install dependencies
   - Run tests and builds

2. **Web Browser** (see web-browser extension)
   - Search for information
   - Read documentation
   - Learn new techniques
   - Verify implementations

Together, an intelligent agent can:
1. Identify what it needs to learn → Web search
2. Find documentation/tutorials → Web scraping
3. Write code → File write
4. Execute and test → Shell execute
5. Debug and iterate → Repeat

## License

MIT © Frame.dev
