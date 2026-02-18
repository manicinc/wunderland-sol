/**
 * Group management modal for highlights and bookmarks
 * @module codex/ui/GroupManager
 *
 * @remarks
 * - View all groups (default and custom)
 * - Create custom groups
 * - Edit names and colors
 * - Delete groups with confirmation
 * - Reorder groups with drag-and-drop
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  X,
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Folder,
  FolderPlus,
  AlertCircle,
  Check,
} from 'lucide-react'
import type { HighlightGroup } from '../lib/highlightTypes'
import { useGroups } from '../hooks/useGroups'

interface GroupManagerProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close modal callback */
  onClose: () => void
}

const COLOR_OPTIONS = [
  { value: 'cyan', class: 'bg-cyan-500', label: 'Cyan' },
  { value: 'purple', class: 'bg-purple-500', label: 'Purple' },
  { value: 'amber', class: 'bg-amber-500', label: 'Amber' },
  { value: 'green', class: 'bg-green-500', label: 'Green' },
  { value: 'blue', class: 'bg-blue-500', label: 'Blue' },
  { value: 'pink', class: 'bg-pink-500', label: 'Pink' },
  { value: 'orange', class: 'bg-orange-500', label: 'Orange' },
  { value: 'red', class: 'bg-red-500', label: 'Red' },
  { value: 'gray', class: 'bg-gray-500', label: 'Gray' },
]

/**
 * Modal for managing highlight and bookmark groups
 *
 * @example
 * ```tsx
 * function App() {
 *   const [showGroupManager, setShowGroupManager] = useState(false);
 *
 *   return (
 *     <>
 *       <button onClick={() => setShowGroupManager(true)}>
 *         Manage Groups
 *       </button>
 *       <GroupManager
 *         isOpen={showGroupManager}
 *         onClose={() => setShowGroupManager(false)}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export default function GroupManager({ isOpen, onClose }: GroupManagerProps) {
  const {
    groups,
    loading,
    error,
    createCustomGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,
    reload,
  } = useGroups()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingColor, setEditingColor] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState('cyan')

  const [orderedGroups, setOrderedGroups] = useState<HighlightGroup[]>([])

  // Sync ordered groups with fetched groups
  useEffect(() => {
    if (groups.length > 0) {
      setOrderedGroups([...groups].sort((a, b) => a.displayOrder - b.displayOrder))
    }
  }, [groups])

  /**
   * Handle creating a new custom group
   */
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return

    try {
      await createCustomGroup(newGroupName.trim(), newGroupColor)
      setNewGroupName('')
      setNewGroupColor('cyan')
      setShowCreateForm(false)
      await reload()
    } catch (err) {
      console.error('[GroupManager] Failed to create group:', err)
    }
  }

  /**
   * Handle editing a group
   */
  const handleStartEdit = (group: HighlightGroup) => {
    setEditingId(group.id)
    setEditingName(group.name)
    setEditingColor(group.color || 'cyan')
  }

  /**
   * Handle saving edit
   */
  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return

    try {
      await updateGroup(editingId, {
        name: editingName.trim(),
        color: editingColor,
      })
      setEditingId(null)
      setEditingName('')
      setEditingColor('')
      await reload()
    } catch (err) {
      console.error('[GroupManager] Failed to update group:', err)
    }
  }

  /**
   * Handle canceling edit
   */
  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
    setEditingColor('')
  }

  /**
   * Handle deleting a group
   */
  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteGroup(groupId)
      setDeletingId(null)
      await reload()
    } catch (err) {
      console.error('[GroupManager] Failed to delete group:', err)
    }
  }

  /**
   * Handle reordering groups
   */
  const handleReorder = async (newOrder: HighlightGroup[]) => {
    setOrderedGroups(newOrder)

    try {
      await reorderGroups(newOrder.map((g) => g.id))
      await reload()
    } catch (err) {
      console.error('[GroupManager] Failed to reorder groups:', err)
      // Revert on error
      setOrderedGroups([...groups].sort((a, b) => a.displayOrder - b.displayOrder))
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Folder className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Manage Groups
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close group manager"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Loading state */}
            {loading ? (
              <div className="py-12 text-center">
                <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-500">Loading groups...</p>
              </div>
            ) : (
              <>
                {/* Create new group button */}
                {!showCreateForm && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full mb-4 p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                  >
                    <FolderPlus className="w-5 h-5" />
                    <span className="font-medium">Create Custom Group</span>
                  </button>
                )}

                {/* Create group form */}
                <AnimatePresence>
                  {showCreateForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden"
                    >
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Create New Group
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Group Name
                          </label>
                          <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="e.g., Work Notes, Research"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Color
                          </label>
                          <div className="flex gap-2">
                            {COLOR_OPTIONS.map((color) => (
                              <button
                                key={color.value}
                                onClick={() => setNewGroupColor(color.value)}
                                className={`w-8 h-8 rounded-full ${color.class} transition-transform hover:scale-110 ${
                                  newGroupColor === color.value
                                    ? 'ring-2 ring-gray-900 dark:ring-white ring-offset-2'
                                    : ''
                                }`}
                                title={color.label}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleCreateGroup}
                            disabled={!newGroupName.trim()}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Create
                          </button>
                          <button
                            onClick={() => {
                              setShowCreateForm(false)
                              setNewGroupName('')
                              setNewGroupColor('cyan')
                            }}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Groups list */}
                {orderedGroups.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <Folder className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>No groups yet</p>
                    <p className="text-sm mt-2">Create your first custom group to organize highlights and bookmarks</p>
                  </div>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={orderedGroups}
                    onReorder={handleReorder}
                    className="space-y-2"
                  >
                    {orderedGroups.map((group) => (
                      <Reorder.Item
                        key={group.id}
                        value={group}
                        className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                      >
                        {editingId === group.id ? (
                          // Edit mode
                          <div className="p-4 space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Group Name
                              </label>
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                                autoFocus
                              />
                            </div>
                            {group.isEditable && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Color
                                </label>
                                <div className="flex gap-2">
                                  {COLOR_OPTIONS.map((color) => (
                                    <button
                                      key={color.value}
                                      onClick={() => setEditingColor(color.value)}
                                      className={`w-8 h-8 rounded-full ${color.class} transition-transform hover:scale-110 ${
                                        editingColor === color.value
                                          ? 'ring-2 ring-gray-900 dark:ring-white ring-offset-2'
                                          : ''
                                      }`}
                                      title={color.label}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveEdit}
                                disabled={!editingName.trim()}
                                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
                              >
                                <Check className="w-4 h-4" />
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <div className="p-4 flex items-center gap-3">
                            {/* Drag handle */}
                            <button
                              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              aria-label="Reorder group"
                            >
                              <GripVertical className="w-5 h-5" />
                            </button>

                            {/* Color indicator */}
                            <div
                              className={`w-4 h-4 rounded-full ${
                                COLOR_OPTIONS.find((c) => c.value === group.color)?.class ||
                                'bg-gray-500'
                              }`}
                            />

                            {/* Group info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {group.name}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {group.type === 'default' ? 'Default Group' : 'Custom Group'}
                                {group.weavePath && ` • ${group.weavePath}`}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              {group.isEditable && (
                                <>
                                  <button
                                    onClick={() => handleStartEdit(group)}
                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                    title="Edit group"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingId(group.id)}
                                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors text-red-600 dark:text-red-400"
                                    title="Delete group"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </motion.div>

        {/* Delete confirmation modal */}
        <AnimatePresence>
          {deletingId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setDeletingId(null)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Delete Group?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Are you sure you want to delete this group? Highlights and bookmarks in this
                      group will not be deleted, but they will lose their group assignment.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeletingId(null)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(deletingId)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Delete Group
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
