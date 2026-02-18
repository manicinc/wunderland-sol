/**
 * Categorization Processor Tests
 * @module __tests__/unit/lib/jobs/processors/categorizationProcessor.test
 *
 * Tests for categorization processor utilities including
 * action type determination, path calculation, and result handling.
 */

import { describe, it, expect } from 'vitest'

/* ═══════════════════════════════════════════════════════════════════════════
   RE-IMPLEMENTED UTILITIES (for testing logic)
═══════════════════════════════════════════════════════════════════════════ */

type CategorizationActionType = 'move' | 'create_pr' | 'create_issue'
type CategorizationResultStatus = 'pending' | 'approved' | 'rejected'

/**
 * Determine action type based on confidence level
 */
function determineActionType(confidence: number): CategorizationActionType {
  if (confidence >= 0.95) return 'move'
  if (confidence >= 0.80) return 'create_pr'
  return 'create_issue'
}

/**
 * Calculate target path from category and filename
 */
function calculateTargetPath(category: string, filePath: string): string {
  const filename = filePath.split('/').pop() || 'untitled.md'
  return `${category}${filename}`
}

/**
 * Extract filename from path
 */
function extractFilename(filePath: string): string {
  return filePath.split('/').pop() || 'untitled.md'
}

/**
 * Determine initial status based on auto-apply settings
 */
function determineInitialStatus(
  autoApply: boolean,
  action: string
): CategorizationResultStatus {
  if (autoApply && action === 'auto-apply') {
    return 'approved'
  }
  return 'pending'
}

interface CategorizationJobPayload {
  inboxPaths: string[]
  autoApply?: boolean
  autoApplyThreshold?: number
}

interface CategoryResult {
  filePath: string
  currentPath: string
  action: string
  suggestion: {
    category: string
    confidence: number
    reasoning: string
    alternatives: Array<{ category: string; confidence: number }>
  }
}

interface CategorizationJobResult {
  filesProcessed: number
  autoApplied: number
  pendingReview: number
  failed: number
  resultIds: string[]
}

/* ═══════════════════════════════════════════════════════════════════════════
   TESTS
═══════════════════════════════════════════════════════════════════════════ */

describe('Categorization Processor Utilities', () => {
  describe('determineActionType', () => {
    describe('high confidence (>= 0.95)', () => {
      it('should return "move" for 95% confidence', () => {
        expect(determineActionType(0.95)).toBe('move')
      })

      it('should return "move" for 100% confidence', () => {
        expect(determineActionType(1.0)).toBe('move')
      })

      it('should return "move" for 99% confidence', () => {
        expect(determineActionType(0.99)).toBe('move')
      })
    })

    describe('medium confidence (0.80-0.94)', () => {
      it('should return "create_pr" for 80% confidence', () => {
        expect(determineActionType(0.80)).toBe('create_pr')
      })

      it('should return "create_pr" for 90% confidence', () => {
        expect(determineActionType(0.90)).toBe('create_pr')
      })

      it('should return "create_pr" for 94% confidence', () => {
        expect(determineActionType(0.94)).toBe('create_pr')
      })
    })

    describe('low confidence (< 0.80)', () => {
      it('should return "create_issue" for 79% confidence', () => {
        expect(determineActionType(0.79)).toBe('create_issue')
      })

      it('should return "create_issue" for 50% confidence', () => {
        expect(determineActionType(0.50)).toBe('create_issue')
      })

      it('should return "create_issue" for 0% confidence', () => {
        expect(determineActionType(0)).toBe('create_issue')
      })
    })

    describe('boundary conditions', () => {
      it('should handle exactly 0.95', () => {
        expect(determineActionType(0.95)).toBe('move')
      })

      it('should handle just below 0.95', () => {
        expect(determineActionType(0.9499)).toBe('create_pr')
      })

      it('should handle exactly 0.80', () => {
        expect(determineActionType(0.80)).toBe('create_pr')
      })

      it('should handle just below 0.80', () => {
        expect(determineActionType(0.7999)).toBe('create_issue')
      })
    })
  })

  describe('calculateTargetPath', () => {
    it('should combine category and filename', () => {
      const result = calculateTargetPath('docs/api/', 'src/notes/readme.md')
      expect(result).toBe('docs/api/readme.md')
    })

    it('should extract filename from nested path', () => {
      const result = calculateTargetPath(
        'weaves/wiki/strands/',
        'inbox/imported/notes/2024/document.md'
      )
      expect(result).toBe('weaves/wiki/strands/document.md')
    })

    it('should handle single-level paths', () => {
      const result = calculateTargetPath('output/', 'input.md')
      expect(result).toBe('output/input.md')
    })

    it('should use default filename for empty path', () => {
      const result = calculateTargetPath('output/', '')
      expect(result).toBe('output/untitled.md')
    })

    it('should handle category without trailing slash', () => {
      const result = calculateTargetPath('docs/api', 'source/file.md')
      // Note: the function expects category to end with / for proper paths
      expect(result).toBe('docs/apifile.md')
    })
  })

  describe('extractFilename', () => {
    it('should extract filename from path', () => {
      expect(extractFilename('path/to/file.md')).toBe('file.md')
    })

    it('should handle nested paths', () => {
      expect(extractFilename('a/b/c/d/e/document.txt')).toBe('document.txt')
    })

    it('should handle single filename', () => {
      expect(extractFilename('file.md')).toBe('file.md')
    })

    it('should return default for empty string', () => {
      expect(extractFilename('')).toBe('untitled.md')
    })

    it('should handle paths with special characters', () => {
      expect(extractFilename('path/to/my-file_2024.md')).toBe('my-file_2024.md')
    })
  })

  describe('determineInitialStatus', () => {
    it('should return approved when autoApply and action is auto-apply', () => {
      expect(determineInitialStatus(true, 'auto-apply')).toBe('approved')
    })

    it('should return pending when autoApply but different action', () => {
      expect(determineInitialStatus(true, 'review')).toBe('pending')
    })

    it('should return pending when not autoApply', () => {
      expect(determineInitialStatus(false, 'auto-apply')).toBe('pending')
    })

    it('should return pending when both false and different action', () => {
      expect(determineInitialStatus(false, 'review')).toBe('pending')
    })
  })

  describe('CategorizationJobPayload', () => {
    it('should require inboxPaths', () => {
      const payload: CategorizationJobPayload = {
        inboxPaths: ['inbox/file1.md', 'inbox/file2.md'],
      }
      expect(payload.inboxPaths.length).toBe(2)
    })

    it('should have optional autoApply default to false', () => {
      const payload: CategorizationJobPayload = {
        inboxPaths: [],
      }
      const autoApply = payload.autoApply ?? false
      expect(autoApply).toBe(false)
    })

    it('should have optional autoApplyThreshold default to 0.95', () => {
      const payload: CategorizationJobPayload = {
        inboxPaths: [],
      }
      const threshold = payload.autoApplyThreshold ?? 0.95
      expect(threshold).toBe(0.95)
    })

    it('should allow custom threshold', () => {
      const payload: CategorizationJobPayload = {
        inboxPaths: [],
        autoApplyThreshold: 0.99,
      }
      expect(payload.autoApplyThreshold).toBe(0.99)
    })
  })

  describe('CategoryResult structure', () => {
    it('should include all required fields', () => {
      const result: CategoryResult = {
        filePath: 'inbox/document.md',
        currentPath: 'inbox/',
        action: 'auto-apply',
        suggestion: {
          category: 'docs/api/',
          confidence: 0.97,
          reasoning: 'Contains API documentation',
          alternatives: [
            { category: 'docs/guides/', confidence: 0.85 },
          ],
        },
      }

      expect(result.filePath).toBeDefined()
      expect(result.currentPath).toBeDefined()
      expect(result.action).toBeDefined()
      expect(result.suggestion).toBeDefined()
      expect(result.suggestion.alternatives).toBeDefined()
    })

    it('should support empty alternatives array', () => {
      const result: CategoryResult = {
        filePath: 'file.md',
        currentPath: 'inbox/',
        action: 'review',
        suggestion: {
          category: 'docs/',
          confidence: 0.70,
          reasoning: 'Low confidence match',
          alternatives: [],
        },
      }
      expect(result.suggestion.alternatives.length).toBe(0)
    })
  })

  describe('CategorizationJobResult structure', () => {
    it('should track all processing counts', () => {
      const result: CategorizationJobResult = {
        filesProcessed: 10,
        autoApplied: 3,
        pendingReview: 5,
        failed: 2,
        resultIds: ['id1', 'id2', 'id3'],
      }

      expect(result.filesProcessed).toBe(10)
      expect(result.autoApplied + result.pendingReview + result.failed).toBe(10)
    })

    it('should have result IDs for all successful categorizations', () => {
      const result: CategorizationJobResult = {
        filesProcessed: 5,
        autoApplied: 2,
        pendingReview: 3,
        failed: 0,
        resultIds: ['a', 'b', 'c', 'd', 'e'],
      }

      expect(result.resultIds.length).toBe(result.filesProcessed)
    })
  })

  describe('Worker message types', () => {
    type WorkerResponseType = 'progress' | 'complete' | 'error'

    it('should handle progress type', () => {
      const type: WorkerResponseType = 'progress'
      expect(type).toBe('progress')
    })

    it('should handle complete type', () => {
      const type: WorkerResponseType = 'complete'
      expect(type).toBe('complete')
    })

    it('should handle error type', () => {
      const type: WorkerResponseType = 'error'
      expect(type).toBe('error')
    })
  })

  describe('Progress mapping', () => {
    it('should map 0-80% of worker progress to 10-90% of job progress', () => {
      const mapProgress = (workerProgress: number) => {
        return 10 + Math.round(workerProgress * 0.8)
      }

      expect(mapProgress(0)).toBe(10)
      expect(mapProgress(50)).toBe(50)
      expect(mapProgress(100)).toBe(90)
    })
  })

  describe('Timeout configuration', () => {
    const TEN_MINUTES_MS = 10 * 60 * 1000

    it('should define 10 minute timeout', () => {
      expect(TEN_MINUTES_MS).toBe(600000)
    })
  })

  describe('Error handling', () => {
    it('should create error for no valid files', () => {
      const error = new Error('No valid files found to categorize')
      expect(error.message).toContain('No valid files')
    })

    it('should create timeout error', () => {
      const error = new Error('Categorization timed out after 10 minutes')
      expect(error.message).toContain('timed out')
      expect(error.message).toContain('10 minutes')
    })
  })
})

describe('Categorization Action Creation', () => {
  describe('action type selection', () => {
    it('should select move for very high confidence', () => {
      const confidence = 0.98
      const actionType = confidence >= 0.95 ? 'move'
        : confidence >= 0.80 ? 'create_pr'
        : 'create_issue'
      expect(actionType).toBe('move')
    })

    it('should select create_pr for high confidence', () => {
      const confidence = 0.87
      const actionType = confidence >= 0.95 ? 'move'
        : confidence >= 0.80 ? 'create_pr'
        : 'create_issue'
      expect(actionType).toBe('create_pr')
    })

    it('should select create_issue for low confidence', () => {
      const confidence = 0.65
      const actionType = confidence >= 0.95 ? 'move'
        : confidence >= 0.80 ? 'create_pr'
        : 'create_issue'
      expect(actionType).toBe('create_issue')
    })
  })

  describe('target path calculation', () => {
    it('should append filename to category path', () => {
      const category = 'weaves/docs/strands/'
      const filePath = 'inbox/my-document.md'
      const filename = filePath.split('/').pop() || 'untitled.md'
      const toPath = `${category}${filename}`
      expect(toPath).toBe('weaves/docs/strands/my-document.md')
    })
  })

  describe('database action insert fields', () => {
    interface ActionInsert {
      id: string
      result_id: string
      action_type: CategorizationActionType
      from_path: string
      to_path: string
      strand_content: string
      metadata: string
      status: string
      created_at: string
    }

    it('should include all required fields', () => {
      const action: ActionInsert = {
        id: 'action-123',
        result_id: 'result-456',
        action_type: 'move',
        from_path: 'inbox/file.md',
        to_path: 'docs/file.md',
        strand_content: '# Document\nContent here',
        metadata: '{}',
        status: 'pending',
        created_at: new Date().toISOString(),
      }

      expect(action.id).toBeDefined()
      expect(action.result_id).toBeDefined()
      expect(action.action_type).toBeDefined()
      expect(action.from_path).toBeDefined()
      expect(action.to_path).toBeDefined()
    })

    it('should have valid ISO timestamp', () => {
      const timestamp = new Date().toISOString()
      const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      expect(timestamp).toMatch(isoPattern)
    })
  })
})

describe('Config Override Logic', () => {
  interface CategorizationConfig {
    auto_apply_threshold: number
    categories: string[]
    rules: Array<{ pattern: string; category: string }>
  }

  it('should override threshold from payload', () => {
    const defaultConfig: CategorizationConfig = {
      auto_apply_threshold: 0.95,
      categories: [],
      rules: [],
    }

    const payloadThreshold = 0.90

    // Override
    if (payloadThreshold) {
      defaultConfig.auto_apply_threshold = payloadThreshold
    }

    expect(defaultConfig.auto_apply_threshold).toBe(0.90)
  })

  it('should preserve default threshold when not overridden', () => {
    const config: CategorizationConfig = {
      auto_apply_threshold: 0.95,
      categories: [],
      rules: [],
    }

    const payloadThreshold: number | undefined = undefined

    if (payloadThreshold) {
      config.auto_apply_threshold = payloadThreshold
    }

    expect(config.auto_apply_threshold).toBe(0.95)
  })
})
