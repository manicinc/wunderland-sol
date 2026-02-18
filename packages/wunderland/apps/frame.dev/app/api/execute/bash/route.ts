/**
 * Bash/Shell code execution API route
 * Executes shell commands in a sandboxed child process
 *
 * Security: Feature-flagged via ENABLE_BASH_EXECUTION env var
 * WARNING: Shell execution is inherently dangerous - use with caution
 *
 * @module api/execute/bash
 */

import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

// Feature flag for Bash execution (default OFF for security)
const BASH_ENABLED = process.env.ENABLE_BASH_EXECUTION === 'true'
const DEFAULT_TIMEOUT = 30000 // 30 seconds
const MAX_OUTPUT_SIZE = 1024 * 100 // 100KB max output

// Dangerous commands that should be blocked
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+[\/~]/i, // rm -rf /
  /mkfs/i, // Format filesystems
  /dd\s+if=/i, // Direct disk writes
  />\s*\/dev\//i, // Write to device files
  /chmod\s+-R\s+777/i, // Dangerous permissions
  /sudo/i, // Privilege escalation
  /su\s+-/i, // Switch user
  /curl.*\|\s*(bash|sh)/i, // Piped execution
  /wget.*\|\s*(bash|sh)/i, // Piped execution
  /:()\s*\{\s*:\|:/i, // Fork bomb
]

interface ExecuteRequest {
  code: string
  timeout?: number
}

interface ExecuteResponse {
  success: boolean
  output: string[]
  error?: string
  duration: number
  exitCode?: number
}

/**
 * Check if code contains dangerous patterns
 */
function containsDangerousPatterns(code: string): string | null {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      return `Command blocked: matches dangerous pattern ${pattern.source}`
    }
  }
  return null
}

/**
 * Execute Bash code in a sandboxed environment
 */
async function executeBash(
  code: string,
  timeout: number
): Promise<ExecuteResponse> {
  const startTime = Date.now()

  // Check for dangerous patterns
  const dangerCheck = containsDangerousPatterns(code)
  if (dangerCheck) {
    return {
      success: false,
      output: [],
      error: dangerCheck,
      duration: 0,
    }
  }

  return new Promise((resolve) => {
    const output: string[] = []
    let totalOutputSize = 0
    let killed = false

    // Determine shell based on platform
    const shell = process.platform === 'win32' ? 'bash' : '/bin/bash'

    // Spawn bash process
    const bash = spawn(shell, ['-c', code], {
      timeout,
      env: {
        ...process.env,
        // Restrict PATH to essential commands
        PATH: '/usr/local/bin:/usr/bin:/bin',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    // Timeout handler
    const timeoutId = setTimeout(() => {
      killed = true
      bash.kill('SIGKILL')
    }, timeout)

    // Collect stdout
    bash.stdout?.on('data', (data: Buffer) => {
      if (totalOutputSize < MAX_OUTPUT_SIZE) {
        const chunk = data.toString()
        totalOutputSize += chunk.length
        output.push(chunk)
      }
    })

    // Collect stderr
    bash.stderr?.on('data', (data: Buffer) => {
      if (totalOutputSize < MAX_OUTPUT_SIZE) {
        const chunk = data.toString()
        totalOutputSize += chunk.length
        output.push(`[stderr] ${chunk}`)
      }
    })

    // Handle completion
    bash.on('close', (exitCode) => {
      clearTimeout(timeoutId)
      const duration = Date.now() - startTime

      if (killed) {
        resolve({
          success: false,
          output,
          error: `Execution timeout (${timeout / 1000}s)`,
          duration: timeout,
          exitCode: exitCode ?? -1,
        })
        return
      }

      resolve({
        success: exitCode === 0,
        output,
        error: exitCode !== 0 ? `Process exited with code ${exitCode}` : undefined,
        duration,
        exitCode: exitCode ?? 0,
      })
    })

    // Handle errors
    bash.on('error', (err) => {
      clearTimeout(timeoutId)
      resolve({
        success: false,
        output,
        error: err.message,
        duration: Date.now() - startTime,
      })
    })
  })
}

export async function POST(request: NextRequest) {
  // Check if Bash execution is enabled
  if (!BASH_ENABLED) {
    return NextResponse.json(
      {
        success: false,
        output: [],
        error: 'Bash execution is disabled on this server',
        duration: 0,
      } as ExecuteResponse,
      { status: 503 }
    )
  }

  try {
    const body: ExecuteRequest = await request.json()
    const { code, timeout = DEFAULT_TIMEOUT } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        {
          success: false,
          output: [],
          error: 'Invalid request: code is required',
          duration: 0,
        } as ExecuteResponse,
        { status: 400 }
      )
    }

    // Limit timeout to prevent abuse
    const safeTimeout = Math.min(Math.max(timeout, 1000), 60000)

    const result = await executeBash(code, safeTimeout)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        output: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0,
      } as ExecuteResponse,
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    available: BASH_ENABLED,
    language: 'bash',
  })
}
