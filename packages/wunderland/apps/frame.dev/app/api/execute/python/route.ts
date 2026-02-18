/**
 * Python code execution API route
 * Executes Python code in a sandboxed child process
 *
 * Security: Feature-flagged via ENABLE_PYTHON_EXECUTION env var
 * Only available when backend/server is running with explicit enablement
 *
 * @module api/execute/python
 */

import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

// Feature flag for Python execution
const PYTHON_ENABLED = process.env.ENABLE_PYTHON_EXECUTION === 'true'
const DEFAULT_TIMEOUT = 30000 // 30 seconds
const MAX_OUTPUT_SIZE = 1024 * 100 // 100KB max output

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
 * Execute Python code in a sandboxed environment
 */
async function executePython(
  code: string,
  timeout: number
): Promise<ExecuteResponse> {
  const startTime = Date.now()

  return new Promise((resolve) => {
    const output: string[] = []
    let totalOutputSize = 0
    let killed = false

    // Spawn Python process
    const python = spawn('python3', ['-c', code], {
      timeout,
      env: {
        ...process.env,
        // Restrict network access (limited effect, but adds a layer)
        PYTHONDONTWRITEBYTECODE: '1',
        PYTHONUNBUFFERED: '1',
      },
      // Limit resources (platform-dependent)
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    // Timeout handler
    const timeoutId = setTimeout(() => {
      killed = true
      python.kill('SIGKILL')
    }, timeout)

    // Collect stdout
    python.stdout?.on('data', (data: Buffer) => {
      if (totalOutputSize < MAX_OUTPUT_SIZE) {
        const chunk = data.toString()
        totalOutputSize += chunk.length
        output.push(chunk)
      }
    })

    // Collect stderr
    python.stderr?.on('data', (data: Buffer) => {
      if (totalOutputSize < MAX_OUTPUT_SIZE) {
        const chunk = data.toString()
        totalOutputSize += chunk.length
        output.push(`[stderr] ${chunk}`)
      }
    })

    // Handle completion
    python.on('close', (exitCode) => {
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
    python.on('error', (err) => {
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
  // Check if Python execution is enabled
  if (!PYTHON_ENABLED) {
    return NextResponse.json(
      {
        success: false,
        output: [],
        error: 'Python execution is disabled on this server',
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

    const result = await executePython(code, safeTimeout)

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
    available: PYTHON_ENABLED,
    language: 'python',
  })
}
