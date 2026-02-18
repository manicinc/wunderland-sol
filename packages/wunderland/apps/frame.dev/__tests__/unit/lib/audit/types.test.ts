/**
 * Tests for lib/audit/types.ts
 *
 * Tests type definitions, enums, and interface structures for the audit system.
 */

import { describe, it, expect } from 'vitest'
import type {
  AuditActionType,
  AuditActionName,
  AuditTargetType,
  AuditSource,
  AuditLogEntry,
  AuditLogInput,
  UndoStackEntry,
  UndoStackInput,
  UndoMetadata,
  AuditServiceConfig,
  UndoRedoServiceConfig,
  UndoRedoResult,
  UndoRedoHandler,
  UseAuditLogOptions,
  UseAuditLogReturn,
  UseUndoRedoOptions,
  UseUndoRedoReturn,
  AuditLogQueryOptions,
  AuditStats
} from '@/lib/audit/types'

// ============================================================================
// AUDIT ACTION TYPE TESTS
// ============================================================================

describe('AuditActionType', () => {
  it('supports file action type', () => {
    const actionType: AuditActionType = 'file'
    expect(actionType).toBe('file')
  })

  it('supports content action type', () => {
    const actionType: AuditActionType = 'content'
    expect(actionType).toBe('content')
  })

  it('supports metadata action type', () => {
    const actionType: AuditActionType = 'metadata'
    expect(actionType).toBe('metadata')
  })

  it('supports tree action type', () => {
    const actionType: AuditActionType = 'tree'
    expect(actionType).toBe('tree')
  })

  it('supports learning action type', () => {
    const actionType: AuditActionType = 'learning'
    expect(actionType).toBe('learning')
  })

  it('supports navigation action type', () => {
    const actionType: AuditActionType = 'navigation'
    expect(actionType).toBe('navigation')
  })

  it('supports settings action type', () => {
    const actionType: AuditActionType = 'settings'
    expect(actionType).toBe('settings')
  })

  it('supports bookmark action type', () => {
    const actionType: AuditActionType = 'bookmark'
    expect(actionType).toBe('bookmark')
  })

  it('supports api action type', () => {
    const actionType: AuditActionType = 'api'
    expect(actionType).toBe('api')
  })
})

// ============================================================================
// AUDIT ACTION NAME TESTS
// ============================================================================

describe('AuditActionName', () => {
  describe('file actions', () => {
    it('supports create action', () => {
      const action: AuditActionName = 'create'
      expect(action).toBe('create')
    })

    it('supports delete action', () => {
      const action: AuditActionName = 'delete'
      expect(action).toBe('delete')
    })

    it('supports rename action', () => {
      const action: AuditActionName = 'rename'
      expect(action).toBe('rename')
    })

    it('supports move action', () => {
      const action: AuditActionName = 'move'
      expect(action).toBe('move')
    })

    it('supports duplicate action', () => {
      const action: AuditActionName = 'duplicate'
      expect(action).toBe('duplicate')
    })
  })

  describe('content actions', () => {
    it('supports update action', () => {
      const action: AuditActionName = 'update'
      expect(action).toBe('update')
    })

    it('supports publish action', () => {
      const action: AuditActionName = 'publish'
      expect(action).toBe('publish')
    })

    it('supports revert action', () => {
      const action: AuditActionName = 'revert'
      expect(action).toBe('revert')
    })

    it('supports restore_draft action', () => {
      const action: AuditActionName = 'restore_draft'
      expect(action).toBe('restore_draft')
    })
  })

  describe('metadata actions', () => {
    it('supports update_title action', () => {
      const action: AuditActionName = 'update_title'
      expect(action).toBe('update_title')
    })

    it('supports update_tags action', () => {
      const action: AuditActionName = 'update_tags'
      expect(action).toBe('update_tags')
    })

    it('supports update_frontmatter action', () => {
      const action: AuditActionName = 'update_frontmatter'
      expect(action).toBe('update_frontmatter')
    })
  })

  describe('navigation actions', () => {
    it('supports view action', () => {
      const action: AuditActionName = 'view'
      expect(action).toBe('view')
    })

    it('supports search action', () => {
      const action: AuditActionName = 'search'
      expect(action).toBe('search')
    })

    it('supports jump_to_heading action', () => {
      const action: AuditActionName = 'jump_to_heading'
      expect(action).toBe('jump_to_heading')
    })

    it('supports jump_to_source action', () => {
      const action: AuditActionName = 'jump_to_source'
      expect(action).toBe('jump_to_source')
    })
  })

  describe('learning actions', () => {
    it('supports flashcard_create action', () => {
      const action: AuditActionName = 'flashcard_create'
      expect(action).toBe('flashcard_create')
    })

    it('supports flashcard_update action', () => {
      const action: AuditActionName = 'flashcard_update'
      expect(action).toBe('flashcard_update')
    })

    it('supports flashcard_delete action', () => {
      const action: AuditActionName = 'flashcard_delete'
      expect(action).toBe('flashcard_delete')
    })

    it('supports flashcard_review action', () => {
      const action: AuditActionName = 'flashcard_review'
      expect(action).toBe('flashcard_review')
    })

    it('supports quiz_attempt action', () => {
      const action: AuditActionName = 'quiz_attempt'
      expect(action).toBe('quiz_attempt')
    })

    it('supports quiz_complete action', () => {
      const action: AuditActionName = 'quiz_complete'
      expect(action).toBe('quiz_complete')
    })
  })

  describe('bookmark actions', () => {
    it('supports bookmark_add action', () => {
      const action: AuditActionName = 'bookmark_add'
      expect(action).toBe('bookmark_add')
    })

    it('supports bookmark_remove action', () => {
      const action: AuditActionName = 'bookmark_remove'
      expect(action).toBe('bookmark_remove')
    })
  })

  describe('settings actions', () => {
    it('supports setting_update action', () => {
      const action: AuditActionName = 'setting_update'
      expect(action).toBe('setting_update')
    })
  })

  describe('api actions', () => {
    it('supports token_create action', () => {
      const action: AuditActionName = 'token_create'
      expect(action).toBe('token_create')
    })

    it('supports token_validate action', () => {
      const action: AuditActionName = 'token_validate'
      expect(action).toBe('token_validate')
    })

    it('supports token_revoke action', () => {
      const action: AuditActionName = 'token_revoke'
      expect(action).toBe('token_revoke')
    })

    it('supports token_delete action', () => {
      const action: AuditActionName = 'token_delete'
      expect(action).toBe('token_delete')
    })

    it('supports auth_fail action', () => {
      const action: AuditActionName = 'auth_fail'
      expect(action).toBe('auth_fail')
    })

    it('supports rate_limit action', () => {
      const action: AuditActionName = 'rate_limit'
      expect(action).toBe('rate_limit')
    })
  })
})

// ============================================================================
// AUDIT TARGET TYPE TESTS
// ============================================================================

describe('AuditTargetType', () => {
  it('supports strand target', () => {
    const target: AuditTargetType = 'strand'
    expect(target).toBe('strand')
  })

  it('supports weave target', () => {
    const target: AuditTargetType = 'weave'
    expect(target).toBe('weave')
  })

  it('supports loom target', () => {
    const target: AuditTargetType = 'loom'
    expect(target).toBe('loom')
  })

  it('supports fabric target', () => {
    const target: AuditTargetType = 'fabric'
    expect(target).toBe('fabric')
  })

  it('supports flashcard target', () => {
    const target: AuditTargetType = 'flashcard'
    expect(target).toBe('flashcard')
  })

  it('supports flashcard_deck target', () => {
    const target: AuditTargetType = 'flashcard_deck'
    expect(target).toBe('flashcard_deck')
  })

  it('supports quiz target', () => {
    const target: AuditTargetType = 'quiz'
    expect(target).toBe('quiz')
  })

  it('supports quiz_question target', () => {
    const target: AuditTargetType = 'quiz_question'
    expect(target).toBe('quiz_question')
  })

  it('supports glossary_term target', () => {
    const target: AuditTargetType = 'glossary_term'
    expect(target).toBe('glossary_term')
  })

  it('supports bookmark target', () => {
    const target: AuditTargetType = 'bookmark'
    expect(target).toBe('bookmark')
  })

  it('supports draft target', () => {
    const target: AuditTargetType = 'draft'
    expect(target).toBe('draft')
  })

  it('supports setting target', () => {
    const target: AuditTargetType = 'setting'
    expect(target).toBe('setting')
  })

  it('supports search_query target', () => {
    const target: AuditTargetType = 'search_query'
    expect(target).toBe('search_query')
  })

  it('supports api_token target', () => {
    const target: AuditTargetType = 'api_token'
    expect(target).toBe('api_token')
  })
})

// ============================================================================
// AUDIT SOURCE TESTS
// ============================================================================

describe('AuditSource', () => {
  it('supports user source', () => {
    const source: AuditSource = 'user'
    expect(source).toBe('user')
  })

  it('supports autosave source', () => {
    const source: AuditSource = 'autosave'
    expect(source).toBe('autosave')
  })

  it('supports sync source', () => {
    const source: AuditSource = 'sync'
    expect(source).toBe('sync')
  })

  it('supports import source', () => {
    const source: AuditSource = 'import'
    expect(source).toBe('import')
  })

  it('supports undo source', () => {
    const source: AuditSource = 'undo'
    expect(source).toBe('undo')
  })

  it('supports redo source', () => {
    const source: AuditSource = 'redo'
    expect(source).toBe('redo')
  })

  it('supports system source', () => {
    const source: AuditSource = 'system'
    expect(source).toBe('system')
  })

  it('supports api source', () => {
    const source: AuditSource = 'api'
    expect(source).toBe('api')
  })
})

// ============================================================================
// AUDIT LOG ENTRY INTERFACE TESTS
// ============================================================================

describe('AuditLogEntry', () => {
  it('validates complete entry structure', () => {
    const entry: AuditLogEntry = {
      id: 'audit_123',
      timestamp: '2024-01-01T00:00:00.000Z',
      sessionId: 'session_abc',
      actionType: 'file',
      actionName: 'create',
      targetType: 'strand',
      targetId: 'strand_1',
      targetPath: '/notes/test.md',
      oldValue: undefined,
      newValue: { title: 'Test' },
      isUndoable: true,
      undoGroupId: 'group_1',
      durationMs: 50,
      source: 'user'
    }

    expect(entry.id).toBe('audit_123')
    expect(entry.timestamp).toBe('2024-01-01T00:00:00.000Z')
    expect(entry.sessionId).toBe('session_abc')
    expect(entry.actionType).toBe('file')
    expect(entry.actionName).toBe('create')
    expect(entry.targetType).toBe('strand')
    expect(entry.targetId).toBe('strand_1')
    expect(entry.targetPath).toBe('/notes/test.md')
    expect(entry.oldValue).toBeUndefined()
    expect(entry.newValue).toEqual({ title: 'Test' })
    expect(entry.isUndoable).toBe(true)
    expect(entry.undoGroupId).toBe('group_1')
    expect(entry.durationMs).toBe(50)
    expect(entry.source).toBe('user')
  })

  it('validates minimal entry structure', () => {
    const entry: AuditLogEntry = {
      id: 'audit_456',
      timestamp: '2024-01-01T12:00:00.000Z',
      sessionId: 'session_def',
      actionType: 'navigation',
      actionName: 'view',
      targetType: 'strand',
      isUndoable: false,
      source: 'user'
    }

    expect(entry.id).toBeDefined()
    expect(entry.targetId).toBeUndefined()
    expect(entry.targetPath).toBeUndefined()
    expect(entry.oldValue).toBeUndefined()
    expect(entry.newValue).toBeUndefined()
    expect(entry.undoGroupId).toBeUndefined()
    expect(entry.durationMs).toBeUndefined()
  })
})

// ============================================================================
// AUDIT LOG INPUT INTERFACE TESTS
// ============================================================================

describe('AuditLogInput', () => {
  it('validates complete input structure', () => {
    const input: AuditLogInput = {
      actionType: 'content',
      actionName: 'update',
      targetType: 'strand',
      targetId: 'strand_1',
      targetPath: '/notes/test.md',
      oldValue: { body: 'old content' },
      newValue: { body: 'new content' },
      isUndoable: true,
      undoGroupId: 'group_1',
      durationMs: 100,
      source: 'user'
    }

    expect(input.actionType).toBe('content')
    expect(input.actionName).toBe('update')
    expect(input.targetType).toBe('strand')
    expect(input.isUndoable).toBe(true)
  })

  it('validates minimal input structure', () => {
    const input: AuditLogInput = {
      actionType: 'bookmark',
      actionName: 'bookmark_add',
      targetType: 'bookmark'
    }

    expect(input.actionType).toBe('bookmark')
    expect(input.targetId).toBeUndefined()
    expect(input.source).toBeUndefined()
  })
})

// ============================================================================
// UNDO STACK ENTRY TESTS
// ============================================================================

describe('UndoStackEntry', () => {
  it('validates complete entry structure', () => {
    const entry: UndoStackEntry = {
      id: 'undo_123',
      sessionId: 'session_abc',
      stackPosition: 5,
      auditLogId: 'audit_456',
      targetType: 'strand',
      targetId: 'strand_1',
      beforeState: { body: 'before' },
      afterState: { body: 'after' },
      isActive: true
    }

    expect(entry.id).toBe('undo_123')
    expect(entry.sessionId).toBe('session_abc')
    expect(entry.stackPosition).toBe(5)
    expect(entry.auditLogId).toBe('audit_456')
    expect(entry.targetType).toBe('strand')
    expect(entry.targetId).toBe('strand_1')
    expect(entry.beforeState).toEqual({ body: 'before' })
    expect(entry.afterState).toEqual({ body: 'after' })
    expect(entry.isActive).toBe(true)
  })
})

// ============================================================================
// UNDO STACK INPUT TESTS
// ============================================================================

describe('UndoStackInput', () => {
  it('validates input structure', () => {
    const input: UndoStackInput = {
      targetType: 'strand',
      targetId: 'strand_1',
      beforeState: { title: 'Old Title' },
      afterState: { title: 'New Title' }
    }

    expect(input.targetType).toBe('strand')
    expect(input.targetId).toBe('strand_1')
    expect(input.beforeState).toEqual({ title: 'Old Title' })
    expect(input.afterState).toEqual({ title: 'New Title' })
  })
})

// ============================================================================
// UNDO METADATA TESTS
// ============================================================================

describe('UndoMetadata', () => {
  it('validates metadata structure', () => {
    const metadata: UndoMetadata = {
      id: 'meta_123',
      undoStackId: 'undo_456',
      key: 'relatedItems',
      value: JSON.stringify(['item1', 'item2'])
    }

    expect(metadata.id).toBe('meta_123')
    expect(metadata.undoStackId).toBe('undo_456')
    expect(metadata.key).toBe('relatedItems')
    expect(JSON.parse(metadata.value)).toEqual(['item1', 'item2'])
  })
})

// ============================================================================
// SERVICE CONFIG TESTS
// ============================================================================

describe('AuditServiceConfig', () => {
  it('validates complete config structure', () => {
    const config: AuditServiceConfig = {
      batchDelayMs: 200,
      maxLogEntries: 5000,
      retentionDays: 60,
      logNavigation: false,
      logLearning: true
    }

    expect(config.batchDelayMs).toBe(200)
    expect(config.maxLogEntries).toBe(5000)
    expect(config.retentionDays).toBe(60)
    expect(config.logNavigation).toBe(false)
    expect(config.logLearning).toBe(true)
  })

  it('validates partial config', () => {
    const config: AuditServiceConfig = {
      maxLogEntries: 2000
    }

    expect(config.maxLogEntries).toBe(2000)
    expect(config.batchDelayMs).toBeUndefined()
  })
})

describe('UndoRedoServiceConfig', () => {
  it('validates complete config structure', () => {
    const config: UndoRedoServiceConfig = {
      maxStackSize: 100,
      persistAcrossRefresh: true
    }

    expect(config.maxStackSize).toBe(100)
    expect(config.persistAcrossRefresh).toBe(true)
  })

  it('validates partial config', () => {
    const config: UndoRedoServiceConfig = {
      maxStackSize: 25
    }

    expect(config.maxStackSize).toBe(25)
    expect(config.persistAcrossRefresh).toBeUndefined()
  })
})

// ============================================================================
// UNDO REDO RESULT TESTS
// ============================================================================

describe('UndoRedoResult', () => {
  it('validates successful result', () => {
    const entry: UndoStackEntry = {
      id: 'undo_1',
      sessionId: 'session_1',
      stackPosition: 0,
      auditLogId: 'audit_1',
      targetType: 'strand',
      targetId: 'strand_1',
      beforeState: { value: 1 },
      afterState: { value: 2 },
      isActive: true
    }

    const result: UndoRedoResult = {
      success: true,
      entry,
      appliedState: { value: 1 }
    }

    expect(result.success).toBe(true)
    expect(result.entry).toBe(entry)
    expect(result.appliedState).toEqual({ value: 1 })
    expect(result.error).toBeUndefined()
  })

  it('validates failed result', () => {
    const result: UndoRedoResult = {
      success: false,
      error: 'Nothing to undo'
    }

    expect(result.success).toBe(false)
    expect(result.error).toBe('Nothing to undo')
    expect(result.entry).toBeUndefined()
    expect(result.appliedState).toBeUndefined()
  })
})

// ============================================================================
// UNDO REDO HANDLER TYPE TESTS
// ============================================================================

describe('UndoRedoHandler', () => {
  it('validates handler function signature', async () => {
    const handler: UndoRedoHandler = async (
      targetType,
      targetId,
      state,
      isUndo
    ) => {
      expect(targetType).toBe('strand')
      expect(targetId).toBe('strand_1')
      expect(state).toEqual({ value: 'test' })
      expect(isUndo).toBe(true)
      return true
    }

    const result = await handler('strand', 'strand_1', { value: 'test' }, true)
    expect(result).toBe(true)
  })

  it('handler can return false for failure', async () => {
    const handler: UndoRedoHandler = async () => false

    const result = await handler('strand', 'strand_1', {}, false)
    expect(result).toBe(false)
  })
})

// ============================================================================
// HOOK OPTIONS TESTS
// ============================================================================

describe('UseAuditLogOptions', () => {
  it('validates options structure', () => {
    const options: UseAuditLogOptions = {
      config: {
        maxLogEntries: 500,
        logNavigation: false
      }
    }

    expect(options.config?.maxLogEntries).toBe(500)
    expect(options.config?.logNavigation).toBe(false)
  })

  it('validates empty options', () => {
    const options: UseAuditLogOptions = {}
    expect(options.config).toBeUndefined()
  })
})

describe('UseUndoRedoOptions', () => {
  it('validates options with handler', () => {
    const mockHandler: UndoRedoHandler = async () => true

    const options: UseUndoRedoOptions = {
      config: { maxStackSize: 30 },
      onApplyState: mockHandler
    }

    expect(options.config?.maxStackSize).toBe(30)
    expect(options.onApplyState).toBe(mockHandler)
  })
})

// ============================================================================
// QUERY OPTIONS TESTS
// ============================================================================

describe('AuditLogQueryOptions', () => {
  it('validates complete query options', () => {
    const options: AuditLogQueryOptions = {
      actionType: 'content',
      actionName: 'update',
      targetType: 'strand',
      targetPathPrefix: '/notes/',
      sessionId: 'session_1',
      source: 'user',
      undoableOnly: true,
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-01-31T23:59:59Z',
      limit: 50,
      offset: 10,
      order: 'desc'
    }

    expect(options.actionType).toBe('content')
    expect(options.actionName).toBe('update')
    expect(options.targetType).toBe('strand')
    expect(options.targetPathPrefix).toBe('/notes/')
    expect(options.sessionId).toBe('session_1')
    expect(options.source).toBe('user')
    expect(options.undoableOnly).toBe(true)
    expect(options.startTime).toBe('2024-01-01T00:00:00Z')
    expect(options.endTime).toBe('2024-01-31T23:59:59Z')
    expect(options.limit).toBe(50)
    expect(options.offset).toBe(10)
    expect(options.order).toBe('desc')
  })

  it('validates ascending order', () => {
    const options: AuditLogQueryOptions = {
      order: 'asc'
    }

    expect(options.order).toBe('asc')
  })
})

// ============================================================================
// AUDIT STATS TESTS
// ============================================================================

describe('AuditStats', () => {
  it('validates complete stats structure', () => {
    const stats: AuditStats = {
      totalActions: 1500,
      actionsByType: {
        file: 200,
        content: 800,
        metadata: 100,
        tree: 50,
        learning: 150,
        navigation: 100,
        settings: 50,
        bookmark: 50,
        api: 0
      },
      actionsByDay: [
        { date: '2024-01-15', count: 120 },
        { date: '2024-01-14', count: 95 }
      ],
      mostEditedFiles: [
        { path: '/notes/index.md', count: 50 },
        { path: '/notes/readme.md', count: 35 }
      ],
      sessionCount: 25,
      averageActionsPerSession: 60
    }

    expect(stats.totalActions).toBe(1500)
    expect(stats.actionsByType.content).toBe(800)
    expect(stats.actionsByDay).toHaveLength(2)
    expect(stats.mostEditedFiles[0].path).toBe('/notes/index.md')
    expect(stats.sessionCount).toBe(25)
    expect(stats.averageActionsPerSession).toBe(60)
  })
})

// ============================================================================
// HOOK RETURN TYPES TESTS
// ============================================================================

describe('UseAuditLogReturn', () => {
  it('validates return structure', () => {
    // Create a mock return object matching the interface
    const mockReturn: UseAuditLogReturn = {
      sessionId: 'session_123',
      logAction: async () => 'audit_123',
      getRecentActions: async () => [],
      getActionsByType: async () => [],
      getActionsForTarget: async () => [],
      isReady: true
    }

    expect(mockReturn.sessionId).toBe('session_123')
    expect(mockReturn.isReady).toBe(true)
    expect(typeof mockReturn.logAction).toBe('function')
    expect(typeof mockReturn.getRecentActions).toBe('function')
    expect(typeof mockReturn.getActionsByType).toBe('function')
    expect(typeof mockReturn.getActionsForTarget).toBe('function')
  })
})

describe('UseUndoRedoReturn', () => {
  it('validates return structure', () => {
    const mockReturn: UseUndoRedoReturn = {
      canUndo: true,
      canRedo: false,
      undoCount: 5,
      redoCount: 0,
      undo: async () => ({ success: true }),
      redo: async () => ({ success: false, error: 'Nothing to redo' }),
      pushUndoableAction: async () => 'undo_123',
      clearStack: async () => {},
      isReady: true
    }

    expect(mockReturn.canUndo).toBe(true)
    expect(mockReturn.canRedo).toBe(false)
    expect(mockReturn.undoCount).toBe(5)
    expect(mockReturn.redoCount).toBe(0)
    expect(mockReturn.isReady).toBe(true)
    expect(typeof mockReturn.undo).toBe('function')
    expect(typeof mockReturn.redo).toBe('function')
    expect(typeof mockReturn.pushUndoableAction).toBe('function')
    expect(typeof mockReturn.clearStack).toBe('function')
  })
})
