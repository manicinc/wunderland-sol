/**
 * Focus Page Layout
 * @module app/quarry/focus/layout
 * 
 * Provides layout wrapper for the Focus page.
 * Supports both normal and deep focus (fullscreen) modes.
 */

import type { Metadata } from 'next'
import { ToastProvider } from '@/components/quarry/ui/common/Toast'
import { InstanceConfigProvider } from '@/lib/config'

export const metadata: Metadata = {
  title: 'Focus | Quarry',
  description: 'Deep focus productivity workspace with ambient sounds, timers, and distraction-free environment.',
}

export default function FocusLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <InstanceConfigProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </InstanceConfigProvider>
  )
}





