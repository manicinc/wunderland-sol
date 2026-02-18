import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Knowledge Graph | Quarry',
  description: 'Interactive visualization of the entire Quarry knowledge base - explore weaves, looms, and strands in a force-directed graph.',
  openGraph: {
    title: 'Knowledge Graph | Quarry',
    description: 'Interactive visualization of the entire Quarry knowledge base',
  },
}

export default function GraphLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

