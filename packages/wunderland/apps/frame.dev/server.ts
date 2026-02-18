/**
 * Custom Next.js Server with Fastify API
 * 
 * Runs Next.js alongside the Fastify API server.
 * The API runs on a separate port (default 3847) while Next.js runs on its port (default 3000).
 * 
 * @module server
 */

import { startAPIServer } from './lib/api'
import { ensureDefaultToken, initTokenSchema } from './lib/api/auth/tokenStorage'
import { profileStorage } from './lib/storage'
import { closeServerDatabase } from './lib/codexDatabase'

// ============================================================================
// FIRST LAUNCH DETECTION
// ============================================================================

const FIRST_LAUNCH_KEY = 'api_first_launch_complete'

async function checkFirstLaunch(): Promise<boolean> {
  try {
    const value = await profileStorage.get(FIRST_LAUNCH_KEY, false)
    return !value
  } catch {
    return true
  }
}

async function markFirstLaunchComplete(): Promise<void> {
  try {
    await profileStorage.set(FIRST_LAUNCH_KEY, true)
  } catch (e) {
    console.error('[Server] Failed to mark first launch complete:', e)
  }
}

// ============================================================================
// PROFILE INITIALIZATION
// ============================================================================

interface ProfileData {
  id?: string
  displayName?: string
  createdAt?: string
  updatedAt?: string
}

async function initializeProfile(): Promise<string> {
  try {
    const existingProfile = await profileStorage.get('profile', null) as ProfileData | null
    
    if (!existingProfile) {
      // Generate new profile ID
      const profileId = `profile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const newProfile: ProfileData = {
        id: profileId,
        displayName: 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      await profileStorage.set('profile', newProfile)
      console.log(`[Server] Created new profile: ${profileId}`)
      return profileId
    }
    
    return existingProfile.id || 'default'
  } catch {
    return 'default'
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🚀 Starting Frame.dev API Server...')
  
  const apiPort = parseInt(process.env.API_PORT || '3847', 10)
  const apiHost = process.env.API_HOST || '0.0.0.0'
  
  try {
    // Initialize token schema
    await initTokenSchema()
    
    // Check for first launch
    const isFirstLaunch = await checkFirstLaunch()
    
    if (isFirstLaunch) {
      console.log('[Server] First launch detected - initializing...')
      
      // Initialize profile
      const profileId = await initializeProfile()
      
      // Generate default API token
      const result = await ensureDefaultToken(profileId)
      
      if (result) {
        console.log('═══════════════════════════════════════════════════════════')
        console.log('🔑 DEFAULT API TOKEN GENERATED (save this, shown only once!)')
        console.log('═══════════════════════════════════════════════════════════')
        console.log(`   Token: ${result.rawToken}`)
        console.log('═══════════════════════════════════════════════════════════')
        console.log('')
      }
      
      await markFirstLaunchComplete()
    }
    
    // Start the API server
    await startAPIServer({
      port: apiPort,
      host: apiHost,
      logger: process.env.NODE_ENV !== 'test'
    })
    
    console.log('')
    console.log('✅ API Server ready!')
    console.log(`   - API: http://localhost:${apiPort}`)
    console.log(`   - Docs: http://localhost:${apiPort}/api/v1/docs`)
    console.log('')
    
  } catch (err) {
    console.error('❌ Failed to start API server:', err)
    process.exit(1)
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function gracefulShutdown(signal: string) {
  console.log(`\n📴 Received ${signal}, shutting down gracefully...`)

  try {
    // Close server database connection
    await closeServerDatabase()
    console.log('✅ Cleanup complete')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Run if this is the main module
main()

