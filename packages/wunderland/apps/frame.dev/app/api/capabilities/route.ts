/**
 * Capabilities API route
 * Returns information about available backend features
 *
 * @module api/capabilities
 */

import { NextResponse } from 'next/server'

// Feature flags from environment
const CAPABILITIES = {
  codeExecution: {
    python: process.env.ENABLE_PYTHON_EXECUTION === 'true',
    bash: process.env.ENABLE_BASH_EXECUTION === 'true',
  },
  // Add other capability flags here as needed
}

export async function GET() {
  return NextResponse.json(CAPABILITIES)
}
