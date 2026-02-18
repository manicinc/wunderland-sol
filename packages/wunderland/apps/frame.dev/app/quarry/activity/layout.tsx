import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Activity Log | Quarry',
  description: 'View your activity history, audit logs, and undo/redo stack',
}

export default function ActivityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

