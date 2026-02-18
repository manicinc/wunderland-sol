/**
 * Sync Auth Routes
 *
 * Authentication endpoints for sync accounts.
 * Handles registration, login, recovery, OAuth, and token refresh.
 *
 * @module lib/api/routes/syncAuth
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { getDeviceAuthService } from '../services/deviceAuthService'

// ============================================================================
// SCHEMAS
// ============================================================================

const registerSchema = {
  description: 'Register a new sync account',
  tags: ['Sync'],
  security: [],  // No auth required
  body: {
    type: 'object',
    required: ['email', 'wrappedMasterKey', 'recoveryKeyHash'],
    properties: {
      email: { type: 'string', format: 'email' },
      wrappedMasterKey: { type: 'string', description: 'Base64-encoded wrapped master key' },
      recoveryKeyHash: { type: 'string', description: 'SHA-256 hash of recovery key' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        recoveryKey: { type: 'string', description: '24-word recovery phrase - show to user ONCE' }
      }
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}

const loginSchema = {
  description: 'Authenticate device and get tokens',
  tags: ['Sync'],
  security: [],  // No auth required
  body: {
    type: 'object',
    required: ['email', 'deviceId', 'deviceName', 'deviceType'],
    properties: {
      email: { type: 'string', format: 'email' },
      deviceId: { type: 'string' },
      deviceName: { type: 'string' },
      deviceType: { type: 'string', enum: ['electron', 'browser', 'capacitor', 'server'] }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        account: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            tier: { type: 'string' },
            deviceLimit: { type: 'number', nullable: true },
            createdAt: { type: 'string' },
            lastSyncAt: { type: 'string', nullable: true }
          }
        },
        tokens: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            expiresAt: { type: 'string' },
            refreshToken: { type: 'string' }
          }
        }
      }
    }
  }
}

const refreshSchema = {
  description: 'Refresh access token',
  tags: ['Sync'],
  security: [],  // Uses refresh token in body
  body: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        expiresAt: { type: 'string' },
        refreshToken: { type: 'string' }
      }
    }
  }
}

const recoverSchema = {
  description: 'Recover account using recovery key',
  tags: ['Sync'],
  security: [],
  body: {
    type: 'object',
    required: ['email', 'recoveryKey', 'deviceId', 'deviceName', 'deviceType'],
    properties: {
      email: { type: 'string', format: 'email' },
      recoveryKey: { type: 'string', description: '24-word recovery phrase' },
      deviceId: { type: 'string' },
      deviceName: { type: 'string' },
      deviceType: { type: 'string', enum: ['electron', 'browser', 'capacitor', 'server'] }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        account: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            tier: { type: 'string' },
            deviceLimit: { type: 'number', nullable: true },
            createdAt: { type: 'string' },
            lastSyncAt: { type: 'string', nullable: true }
          }
        },
        tokens: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            expiresAt: { type: 'string' },
            refreshToken: { type: 'string' }
          }
        },
        wrappedMasterKey: { type: 'string', description: 'Base64-encoded wrapped master key' }
      }
    }
  }
}

const oauthGoogleSchema = {
  description: 'Authenticate with Google OAuth',
  tags: ['Sync'],
  security: [],
  body: {
    type: 'object',
    required: ['googleId', 'email', 'deviceId', 'deviceName', 'deviceType'],
    properties: {
      googleId: { type: 'string' },
      email: { type: 'string', format: 'email' },
      deviceId: { type: 'string' },
      deviceName: { type: 'string' },
      deviceType: { type: 'string', enum: ['electron', 'browser', 'capacitor', 'server'] }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        account: { type: 'object' },
        tokens: { type: 'object' },
        isNewAccount: { type: 'boolean' }
      }
    }
  }
}

const oauthGitHubSchema = {
  description: 'Authenticate with GitHub OAuth',
  tags: ['Sync'],
  security: [],
  body: {
    type: 'object',
    required: ['githubId', 'email', 'deviceId', 'deviceName', 'deviceType'],
    properties: {
      githubId: { type: 'string' },
      email: { type: 'string', format: 'email' },
      deviceId: { type: 'string' },
      deviceName: { type: 'string' },
      deviceType: { type: 'string', enum: ['electron', 'browser', 'capacitor', 'server'] }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        account: { type: 'object' },
        tokens: { type: 'object' },
        isNewAccount: { type: 'boolean' }
      }
    }
  }
}

const upgradeSchema = {
  description: 'Upgrade account to premium tier',
  tags: ['Sync'],
  body: {
    type: 'object',
    properties: {
      stripeCustomerId: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  }
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

interface RegisterBody {
  email: string
  wrappedMasterKey: string  // Base64
  recoveryKeyHash: string
}

interface LoginBody {
  email: string
  deviceId: string
  deviceName: string
  deviceType: string
}

interface RefreshBody {
  refreshToken: string
}

interface RecoverBody {
  email: string
  recoveryKey: string
  deviceId: string
  deviceName: string
  deviceType: string
}

interface OAuthGoogleBody {
  googleId: string
  email: string
  deviceId: string
  deviceName: string
  deviceType: string
}

interface OAuthGitHubBody {
  githubId: string
  email: string
  deviceId: string
  deviceName: string
  deviceType: string
}

interface UpgradeBody {
  stripeCustomerId?: string
}

// ============================================================================
// ROUTES
// ============================================================================

export async function registerSyncAuthRoutes(fastify: FastifyInstance): Promise<void> {
  const authService = getDeviceAuthService()

  // --------------------------------------------------------------------------
  // Register
  // --------------------------------------------------------------------------

  fastify.post<{ Body: RegisterBody }>('/auth/register', {
    schema: registerSchema
  }, async (request, reply) => {
    try {
      const { email, wrappedMasterKey, recoveryKeyHash } = request.body

      const result = await authService.register({
        email,
        wrappedMasterKey: Buffer.from(wrappedMasterKey, 'base64'),
        recoveryKeyHash,
      })

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'

      if (message.includes('already exists')) {
        return reply.status(400).send({
          error: 'ACCOUNT_EXISTS',
          message: 'An account with this email already exists'
        })
      }

      return reply.status(400).send({
        error: 'REGISTRATION_FAILED',
        message
      })
    }
  })

  // --------------------------------------------------------------------------
  // Login
  // --------------------------------------------------------------------------

  fastify.post<{ Body: LoginBody }>('/auth/login', {
    schema: loginSchema
  }, async (request, reply) => {
    try {
      const result = await authService.login(request.body)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'

      if (message.includes('not found')) {
        return reply.status(401).send({
          error: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found. Please register first.'
        })
      }

      if (message.includes('Device limit')) {
        return reply.status(400).send({
          error: 'DEVICE_LIMIT_EXCEEDED',
          message
        })
      }

      return reply.status(401).send({
        error: 'LOGIN_FAILED',
        message
      })
    }
  })

  // --------------------------------------------------------------------------
  // Refresh Token
  // --------------------------------------------------------------------------

  fastify.post<{ Body: RefreshBody }>('/auth/refresh', {
    schema: refreshSchema
  }, async (request, reply) => {
    try {
      const tokens = await authService.refreshToken(request.body.refreshToken)
      return tokens
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed'

      return reply.status(401).send({
        error: 'REFRESH_FAILED',
        message
      })
    }
  })

  // --------------------------------------------------------------------------
  // Recover Account
  // --------------------------------------------------------------------------

  fastify.post<{ Body: RecoverBody }>('/auth/recover', {
    schema: recoverSchema
  }, async (request, reply) => {
    try {
      const result = await authService.recoverAccount(request.body)

      return {
        account: result.account,
        tokens: result.tokens,
        wrappedMasterKey: result.wrappedMasterKey.toString('base64'),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Recovery failed'

      if (message.includes('Invalid recovery key')) {
        return reply.status(401).send({
          error: 'INVALID_RECOVERY_KEY',
          message: 'The recovery key is incorrect'
        })
      }

      return reply.status(401).send({
        error: 'RECOVERY_FAILED',
        message
      })
    }
  })

  // --------------------------------------------------------------------------
  // OAuth: Google
  // --------------------------------------------------------------------------

  fastify.post<{ Body: OAuthGoogleBody }>('/auth/oauth/google', {
    schema: oauthGoogleSchema
  }, async (request, reply) => {
    try {
      const { googleId, email, deviceId, deviceName, deviceType } = request.body

      const result = await authService.loginWithGoogle(
        googleId,
        email,
        deviceId,
        deviceName,
        deviceType
      )

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google OAuth failed'

      return reply.status(401).send({
        error: 'OAUTH_FAILED',
        message
      })
    }
  })

  // --------------------------------------------------------------------------
  // OAuth: GitHub
  // --------------------------------------------------------------------------

  fastify.post<{ Body: OAuthGitHubBody }>('/auth/oauth/github', {
    schema: oauthGitHubSchema
  }, async (request, reply) => {
    try {
      const { githubId, email, deviceId, deviceName, deviceType } = request.body

      const result = await authService.loginWithGitHub(
        githubId,
        email,
        deviceId,
        deviceName,
        deviceType
      )

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'GitHub OAuth failed'

      return reply.status(401).send({
        error: 'OAUTH_FAILED',
        message
      })
    }
  })

  // --------------------------------------------------------------------------
  // Upgrade to Premium
  // --------------------------------------------------------------------------

  fastify.post<{ Body: UpgradeBody }>('/auth/upgrade', {
    schema: upgradeSchema,
    // @ts-expect-error - verifySyncToken is decorated
    preHandler: fastify.verifySyncToken
  }, async (request, reply) => {
    const accountId = request.syncAccountId
    if (!accountId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      })
    }

    await authService.upgradeToPremium(accountId, request.body.stripeCustomerId)

    return {
      success: true,
      message: 'Account upgraded to premium'
    }
  })
}
