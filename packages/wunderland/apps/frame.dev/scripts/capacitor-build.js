#!/usr/bin/env node
/**
 * Capacitor Build Script
 *
 * Handles static export for Capacitor (iOS/Android) builds.
 * Temporarily moves API routes since they can't be statically exported.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const API_DIR = path.join(__dirname, '..', 'app', 'api')
const API_BACKUP = path.join(__dirname, '..', '.api-backup')

function log(msg) {
  console.log(`[capacitor-build] ${msg}`)
}

function moveApiRoutes() {
  if (fs.existsSync(API_DIR)) {
    log('Moving API routes to temporary backup...')
    fs.renameSync(API_DIR, API_BACKUP)
  }
}

function restoreApiRoutes() {
  if (fs.existsSync(API_BACKUP)) {
    log('Restoring API routes...')
    // Remove any API dir that might have been created during build
    if (fs.existsSync(API_DIR)) {
      fs.rmSync(API_DIR, { recursive: true })
    }
    fs.renameSync(API_BACKUP, API_DIR)
  }
}

async function main() {
  try {
    // Move API routes before build
    moveApiRoutes()

    // Run Next.js build with Capacitor flag
    log('Running Next.js static export...')
    execSync('cross-env CAPACITOR_BUILD=true next build', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    })

    log('Build completed successfully!')
  } catch (error) {
    console.error('[capacitor-build] Build failed:', error.message)
    process.exitCode = 1
  } finally {
    // Always restore API routes
    restoreApiRoutes()
  }
}

main()
