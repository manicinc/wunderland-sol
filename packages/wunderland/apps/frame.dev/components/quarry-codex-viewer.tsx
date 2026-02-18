/**
 * Quarry Codex Viewer - Legacy export with providers wrapper
 * @deprecated Import from '@/components/quarry' instead
 *
 * This file re-exports the new modular QuarryViewer to maintain
 * backwards compatibility with existing imports.
 *
 * Wrapped with:
 * - QuarryErrorBoundary for graceful error handling
 * - ToastProvider for notifications
 * - InstanceConfigProvider for customizable instance naming
 */

'use client'

import React from 'react'
import QuarryViewer from './quarry/QuarryViewer'
import { ToastProvider } from './quarry/ui/common/Toast'
import { InstanceConfigProvider } from '@/lib/config'
import { QuarryErrorBoundary } from './quarry/QuarryErrorBoundary'
import type { QuarryQuarryViewerProps } from './quarry/types'

export type { QuarryQuarryViewerProps } from './quarry/types'

/**
 * Wrapped QuarryViewer with ErrorBoundary, ToastProvider and InstanceConfigProvider
 */
export default function QuarryQuarryViewerWithToast(props: QuarryQuarryViewerProps) {
  return (
    <QuarryErrorBoundary>
      <InstanceConfigProvider>
        <ToastProvider>
          <QuarryViewer {...props} />
        </ToastProvider>
      </InstanceConfigProvider>
    </QuarryErrorBoundary>
  )
}
