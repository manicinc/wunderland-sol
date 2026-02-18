/**
 * Codex Edit Mode Component
 * Provides markdown editing capabilities with live preview
 * @module codex/CodexEditMode
 */

'use client'

import React, { useState } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { Save, X, AlertCircle, Loader2 } from 'lucide-react'
import type { GitHubFile } from '../lib/types'

interface CodexEditModeProps {
  /** The file being edited */
  file: GitHubFile
  /** Initial content */
  initialContent: string
  /** Callback when save is clicked */
  onSave: (content: string) => Promise<void>
  /** Callback when cancel is clicked */
  onCancel: () => void
  /** Whether save operation is in progress */
  isSaving?: boolean
  /** Error message if save failed */
  error?: string | null
}

/**
 * Edit mode for markdown files with live preview
 *
 * @remarks
 * - Uses @uiw/react-md-editor for rich editing
 * - Split view with live preview
 * - Save/Cancel controls
 * - Error handling
 * - Loading states
 *
 * @example
 * ```tsx
 * <CodexEditMode
 *   file={selectedFile}
 *   initialContent={fileContent}
 *   onSave={async (content) => {
 *     await saveToGitHub(content)
 *   }}
 *   onCancel={() => setEditMode(false)}
 * />
 * ```
 */
export default function CodexEditMode({
  file,
  initialContent,
  onSave,
  onCancel,
  isSaving = false,
  error = null,
}: CodexEditModeProps) {
  const [content, setContent] = useState(initialContent)
  const [hasChanges, setHasChanges] = useState(false)

  /**
   * Handle content changes
   */
  const handleChange = (value?: string) => {
    setContent(value || '')
    setHasChanges(value !== initialContent)
  }

  /**
   * Handle save button click
   */
  const handleSave = async () => {
    if (!hasChanges || isSaving) return
    await onSave(content)
  }

  /**
   * Handle cancel button click
   */
  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      )
      if (!confirmed) return
    }
    onCancel()
  }

  return (
    <div className="codex-edit-mode">
      {/* Header with Save/Cancel */}
      <div className="edit-header">
        <div className="edit-info">
          <h3 className="edit-title">Editing: {file.name}</h3>
          <span className="edit-subtitle">{file.path}</span>
        </div>

        <div className="edit-actions">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="btn-cancel"
            title="Cancel editing"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="btn-save"
            title={!hasChanges ? 'No changes to save' : 'Save changes'}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="edit-error">
          <AlertCircle className="w-5 h-5" />
          <div>
            <strong>Error saving file</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Markdown Editor */}
      <div className="edit-container" data-color-mode="light">
        <MDEditor
          value={content}
          onChange={handleChange}
          preview="live"
          height="100%"
          visibleDragbar={false}
          highlightEnable={true}
          enableScroll={true}
        />
      </div>

      <style jsx>{`
        .codex-edit-mode {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: white;
        }

        :global(.dark) .codex-edit-mode {
          background: rgb(15, 23, 42);
        }

        .edit-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 2px solid rgb(226, 232, 240);
          background: linear-gradient(
            to bottom,
            rgba(248, 250, 252, 0.8),
            rgba(241, 245, 249, 0.6)
          );
          gap: 1rem;
          flex-wrap: wrap;
        }

        :global(.dark) .edit-header {
          border-bottom-color: rgb(51, 65, 85);
          background: linear-gradient(
            to bottom,
            rgba(30, 41, 59, 0.8),
            rgba(51, 65, 85, 0.6)
          );
        }

        .edit-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
          flex: 1;
        }

        .edit-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: rgb(15, 23, 42);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        :global(.dark) .edit-title {
          color: rgb(248, 250, 252);
        }

        .edit-subtitle {
          font-size: 0.875rem;
          color: rgb(100, 116, 139);
          font-family: 'JetBrains Mono', monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        :global(.dark) .edit-subtitle {
          color: rgb(148, 163, 184);
        }

        .edit-actions {
          display: flex;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .btn-cancel,
        .btn-save {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-cancel {
          background: rgb(241, 245, 249);
          color: rgb(71, 85, 105);
        }

        .btn-cancel:hover:not(:disabled) {
          background: rgb(226, 232, 240);
        }

        :global(.dark) .btn-cancel {
          background: rgb(51, 65, 85);
          color: rgb(226, 232, 240);
        }

        :global(.dark) .btn-cancel:hover:not(:disabled) {
          background: rgb(71, 85, 105);
        }

        .btn-save {
          background: rgb(99, 102, 241);
          color: white;
        }

        .btn-save:hover:not(:disabled) {
          background: rgb(79, 70, 229);
        }

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .edit-error {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: rgb(254, 242, 242);
          border-bottom: 2px solid rgb(254, 202, 202);
          color: rgb(153, 27, 27);
        }

        :global(.dark) .edit-error {
          background: rgba(127, 29, 29, 0.2);
          border-bottom-color: rgb(127, 29, 29);
          color: rgb(252, 165, 165);
        }

        .edit-error strong {
          display: block;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .edit-error p {
          margin: 0;
          font-size: 0.875rem;
        }

        .edit-container {
          flex: 1;
          overflow: hidden;
          position: relative;
        }

        /* Override MDEditor styles */
        .edit-container :global(.w-md-editor) {
          border: none !important;
          box-shadow: none !important;
        }

        .edit-container :global(.w-md-editor-toolbar) {
          background: rgb(248, 250, 252) !important;
          border-bottom: 1px solid rgb(226, 232, 240) !important;
        }

        :global(.dark) .edit-container :global(.w-md-editor-toolbar) {
          background: rgb(30, 41, 59) !important;
          border-bottom-color: rgb(51, 65, 85) !important;
        }

        @media (max-width: 640px) {
          .edit-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .edit-actions {
            width: 100%;
          }

          .btn-cancel,
          .btn-save {
            flex: 1;
          }
        }
      `}</style>
    </div>
  )
}
