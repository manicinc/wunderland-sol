/**
 * Tree node icon component based on node type and level
 * @module codex/tree/NodeIcon
 */

'use client'

import React from 'react'
import {
  Globe,
  Folder,
  FolderOpen,
  Layers,
  Box,
  FileText,
  BookOpen,
  FlaskConical,
  HelpCircle,
  Package,
  MessageSquare,
  Presentation,
  File,
  Image,
  Video,
  Music,
} from 'lucide-react'
import type { NodeLevel } from '../types'

interface NodeIconProps {
  /** Codex hierarchy level */
  level: NodeLevel
  /** Node type */
  type: 'file' | 'dir'
  /** Whether the node is expanded (for directories) */
  isOpen?: boolean
  /** Content type for strands */
  contentType?: string
  /** Custom className */
  className?: string
}

/**
 * Get appropriate icon based on node level and type
 */
export default function NodeIcon({
  level,
  type,
  isOpen = false,
  contentType,
  className = 'w-4 h-4 shrink-0',
}: NodeIconProps) {
  // Fabric (root collection)
  if (level === 'fabric') {
    return <Globe className={`${className} text-purple-500`} />
  }

  // Weave (top-level knowledge universe)
  if (level === 'weave') {
    return isOpen ? (
      <FolderOpen className={`${className} text-blue-500`} />
    ) : (
      <Folder className={`${className} text-blue-500`} />
    )
  }

  // Loom (subdirectory/module inside a weave)
  if (level === 'loom') {
    return isOpen ? (
      <Layers className={`${className} text-cyan-500`} />
    ) : (
      <Box className={`${className} text-cyan-500`} />
    )
  }

  // Strand (atomic knowledge unit)
  if (level === 'strand') {
    // Folder-strand
    if (type === 'dir') {
      return isOpen ? (
        <FolderOpen className={`${className} text-amber-500`} />
      ) : (
        <Folder className={`${className} text-amber-500`} />
      )
    }

    // Content type specific icons for file-strands
    switch (contentType?.toLowerCase()) {
      case 'lesson':
        return <BookOpen className={`${className} text-green-500`} />
      case 'reference':
        return <FileText className={`${className} text-zinc-500`} />
      case 'exercise':
        return <FlaskConical className={`${className} text-orange-500`} />
      case 'assessment':
      case 'quiz':
        return <HelpCircle className={`${className} text-red-500`} />
      case 'project':
        return <Package className={`${className} text-indigo-500`} />
      case 'discussion':
        return <MessageSquare className={`${className} text-pink-500`} />
      case 'collection':
      case 'guide':
        return <Presentation className={`${className} text-teal-500`} />
      default:
        return <FileText className={`${className} text-emerald-500`} />
    }
  }

  // Generic folder
  if (type === 'dir') {
    return isOpen ? (
      <FolderOpen className={`${className} text-zinc-500`} />
    ) : (
      <Folder className={`${className} text-zinc-500`} />
    )
  }

  // Generic file - detect by extension
  const name = ''
  if (name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
    return <Image className={`${className} text-purple-400`} />
  }
  if (name.match(/\.(mp4|webm|mov|avi)$/i)) {
    return <Video className={`${className} text-red-400`} />
  }
  if (name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
    return <Music className={`${className} text-blue-400`} />
  }

  return <File className={`${className} text-zinc-400`} />
}





