// @ts-nocheck
/**
 * Profile Routes
 * 
 * User profile and settings endpoints.
 * 
 * @module lib/api/routes/profile
 */

import { FastifyInstance } from 'fastify'
import { requireAuth } from '../auth/plugin'
import { profileStorage, settingsStorage } from '@/lib/storage'

// ============================================================================
// SCHEMAS
// ============================================================================

const profileSchema = {
  type: 'object',
  properties: {
    profileId: { type: 'string' },
    displayName: { type: 'string' },
    avatar: { type: 'string', nullable: true },
    bio: { type: 'string', nullable: true },
    totalXp: { type: 'number' },
    level: { type: 'number' },
    levelTitle: { type: 'string' },
    stats: {
      type: 'object',
      properties: {
        strandsCreated: { type: 'number' },
        strandsViewed: { type: 'number' },
        flashcardsReviewed: { type: 'number' },
        quizzesTaken: { type: 'number' },
        currentStreak: { type: 'number' },
        longestStreak: { type: 'number' },
        totalStudyMinutes: { type: 'number' }
      }
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
}

const settingsSchema = {
  type: 'object',
  properties: {
    theme: { type: 'string', enum: ['light', 'dark', 'system'] },
    dailyGoalMinutes: { type: 'number' },
    studyReminders: { type: 'boolean' },
    reminderTime: { type: 'string', nullable: true },
    soundEffects: { type: 'boolean' },
    celebrations: { type: 'boolean' },
    reduceMotion: { type: 'boolean' },
    fontSize: { type: 'string', enum: ['small', 'medium', 'large'] },
    showShortcuts: { type: 'boolean' },
    flipDuration: { type: 'number' },
    autoAdvance: { type: 'boolean' }
  }
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_PROFILE = {
  displayName: 'User',
  avatar: null,
  bio: null,
  totalXp: 0,
  level: 1,
  levelTitle: 'Novice',
  stats: {
    strandsCreated: 0,
    strandsViewed: 0,
    flashcardsReviewed: 0,
    quizzesTaken: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalStudyMinutes: 0
  }
}

const DEFAULT_SETTINGS = {
  theme: 'system',
  dailyGoalMinutes: 15,
  studyReminders: false,
  reminderTime: null,
  soundEffects: true,
  celebrations: true,
  reduceMotion: false,
  fontSize: 'medium',
  showShortcuts: true,
  flipDuration: 300,
  autoAdvance: true
}

// ============================================================================
// ROUTES
// ============================================================================

export async function registerProfileRoutes(fastify: FastifyInstance): Promise<void> {

  // ========================================================================
  // PROFILE
  // ========================================================================

  fastify.get('/profile', {
    schema: {
      description: 'Get user profile',
      tags: ['Profile'],
      response: {
        200: {
          type: 'object',
          properties: {
            data: profileSchema
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const profileId = request.profileId

    // In a real implementation, this would fetch from the database
    // For now, we use local storage defaults
    const profile = await profileStorage.get('profile', {
      ...DEFAULT_PROFILE,
      profileId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    return {
      data: {
        ...profile,
        profileId
      }
    }
  })

  fastify.put('/profile', {
    schema: {
      description: 'Update user profile',
      tags: ['Profile'],
      body: {
        type: 'object',
        properties: {
          displayName: { type: 'string', minLength: 1, maxLength: 50 },
          bio: { type: 'string', maxLength: 500 },
          avatar: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: profileSchema,
            meta: {
              type: 'object',
              properties: {
                updated: { type: 'boolean' }
              }
            }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const profileId = request.profileId
    const updates = request.body as { displayName?: string; bio?: string; avatar?: string }

    const currentProfile = await profileStorage.get('profile', {
      ...DEFAULT_PROFILE,
      profileId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    const updatedProfile = {
      ...currentProfile,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    await profileStorage.set('profile', updatedProfile)

    return {
      data: {
        ...updatedProfile,
        profileId
      },
      meta: {
        updated: true
      }
    }
  })

  // ========================================================================
  // SETTINGS
  // ========================================================================

  fastify.get('/settings', {
    schema: {
      description: 'Get user settings',
      tags: ['Profile'],
      response: {
        200: {
          type: 'object',
          properties: {
            data: settingsSchema
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const settings = await settingsStorage.get('preferences', DEFAULT_SETTINGS)

    return {
      data: settings
    }
  })

  fastify.put('/settings', {
    schema: {
      description: 'Update user settings',
      tags: ['Profile'],
      body: {
        type: 'object',
        properties: {
          theme: { type: 'string', enum: ['light', 'dark', 'system'] },
          dailyGoalMinutes: { type: 'number', minimum: 1, maximum: 240 },
          studyReminders: { type: 'boolean' },
          reminderTime: { type: 'string' },
          soundEffects: { type: 'boolean' },
          celebrations: { type: 'boolean' },
          reduceMotion: { type: 'boolean' },
          fontSize: { type: 'string', enum: ['small', 'medium', 'large'] },
          showShortcuts: { type: 'boolean' },
          flipDuration: { type: 'number', minimum: 100, maximum: 1000 },
          autoAdvance: { type: 'boolean' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: settingsSchema,
            meta: {
              type: 'object',
              properties: {
                updated: { type: 'boolean' }
              }
            }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const updates = request.body as Record<string, unknown>

    const currentSettings = await settingsStorage.get('preferences', DEFAULT_SETTINGS)
    const updatedSettings = {
      ...currentSettings,
      ...updates
    }

    await settingsStorage.set('preferences', updatedSettings)

    return {
      data: updatedSettings,
      meta: {
        updated: true
      }
    }
  })

  // ========================================================================
  // STATS
  // ========================================================================

  fastify.get('/profile/stats', {
    schema: {
      description: 'Get detailed user statistics',
      tags: ['Profile'],
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                xp: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    level: { type: 'number' },
                    title: { type: 'string' },
                    toNextLevel: { type: 'number' },
                    progress: { type: 'number' }
                  }
                },
                study: {
                  type: 'object',
                  properties: {
                    totalMinutes: { type: 'number' },
                    averageSessionMinutes: { type: 'number' },
                    longestSession: { type: 'number' },
                    sessionsThisWeek: { type: 'number' }
                  }
                },
                streak: {
                  type: 'object',
                  properties: {
                    current: { type: 'number' },
                    longest: { type: 'number' },
                    maintained: { type: 'boolean' },
                    lastStudyDate: { type: 'string', nullable: true }
                  }
                },
                content: {
                  type: 'object',
                  properties: {
                    strandsViewed: { type: 'number' },
                    strandsCreated: { type: 'number' },
                    flashcardsReviewed: { type: 'number' },
                    quizzesTaken: { type: 'number' },
                    quizzesPassed: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const profile = await profileStorage.get('profile', DEFAULT_PROFILE)
    const stats = profile.stats || DEFAULT_PROFILE.stats

    // Calculate XP progress
    const levelThresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000]
    const currentLevel = profile.level || 1
    const currentThreshold = levelThresholds[currentLevel - 1] || 0
    const nextThreshold = levelThresholds[currentLevel] || 10000
    const toNextLevel = nextThreshold - (profile.totalXp || 0)
    const progress = ((profile.totalXp || 0) - currentThreshold) / (nextThreshold - currentThreshold)

    return {
      data: {
        xp: {
          total: profile.totalXp || 0,
          level: currentLevel,
          title: profile.levelTitle || 'Novice',
          toNextLevel: Math.max(0, toNextLevel),
          progress: Math.min(1, Math.max(0, progress))
        },
        study: {
          totalMinutes: stats.totalStudyMinutes || 0,
          averageSessionMinutes: stats.totalStudyMinutes ? Math.round(stats.totalStudyMinutes / Math.max(1, stats.strandsViewed)) : 0,
          longestSession: 0,
          sessionsThisWeek: 0
        },
        streak: {
          current: stats.currentStreak || 0,
          longest: stats.longestStreak || 0,
          maintained: (stats.currentStreak || 0) > 0,
          lastStudyDate: null
        },
        content: {
          strandsViewed: stats.strandsViewed || 0,
          strandsCreated: stats.strandsCreated || 0,
          flashcardsReviewed: stats.flashcardsReviewed || 0,
          quizzesTaken: stats.quizzesTaken || 0,
          quizzesPassed: 0
        }
      }
    }
  })
}

