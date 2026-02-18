/**
 * Project/Area Category System
 *
 * Ellie-style project categories with custom colors and icons.
 * Projects organize tasks by area of life (Work, Personal, Side Hustle, etc.)
 *
 * @module lib/planner/projects
 */

import type { LucideIcon } from 'lucide-react'
import {
  Briefcase,
  Home,
  Rocket,
  Heart,
  GraduationCap,
  Dumbbell,
  Code,
  Palette,
  Music,
  Camera,
  Plane,
  DollarSign,
  Users,
  ShoppingBag,
  BookOpen,
  Sparkles,
  Target,
  Zap,
  Coffee,
  Star,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectCategory {
  id: string
  name: string
  color: string // Hex color
  icon: string // Icon name from Lucide
  emoji?: string // Optional emoji for mobile
  isDefault?: boolean // System default, cannot be deleted
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CreateProjectInput {
  name: string
  color: string
  icon: string
  emoji?: string
}

export interface UpdateProjectInput {
  name?: string
  color?: string
  icon?: string
  emoji?: string
  sortOrder?: number
}

// ============================================================================
// DEFAULT PROJECTS (Like Ellie)
// ============================================================================

export const DEFAULT_PROJECTS: ProjectCategory[] = [
  {
    id: 'work',
    name: 'Work',
    color: '#ef4444', // Red/Pink
    icon: 'Briefcase',
    emoji: '💼',
    isDefault: true,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'personal',
    name: 'Personal',
    color: '#f59e0b', // Amber/Yellow
    icon: 'Home',
    emoji: '🏠',
    isDefault: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'side-hustle',
    name: 'Side Hustle',
    color: '#8b5cf6', // Purple
    icon: 'Rocket',
    emoji: '🚀',
    isDefault: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'health',
    name: 'Health',
    color: '#10b981', // Emerald
    icon: 'Heart',
    emoji: '💚',
    isDefault: true,
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'learning',
    name: 'Learning',
    color: '#3b82f6', // Blue
    icon: 'GraduationCap',
    emoji: '📚',
    isDefault: true,
    sortOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// ============================================================================
// PRESET COLORS
// ============================================================================

export const PROJECT_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Slate', value: '#64748b' },
]

// ============================================================================
// ICON REGISTRY
// ============================================================================

export const PROJECT_ICONS: Record<string, LucideIcon> = {
  Briefcase,
  Home,
  Rocket,
  Heart,
  GraduationCap,
  Dumbbell,
  Code,
  Palette,
  Music,
  Camera,
  Plane,
  DollarSign,
  Users,
  ShoppingBag,
  BookOpen,
  Sparkles,
  Target,
  Zap,
  Coffee,
  Star,
}

export const PROJECT_ICON_LIST = Object.keys(PROJECT_ICONS)

// ============================================================================
// STORAGE KEY
// ============================================================================

const STORAGE_KEY = 'planner_projects'

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get all projects from storage
 */
export function getProjects(): ProjectCategory[] {
  if (typeof window === 'undefined') return DEFAULT_PROJECTS

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      // Initialize with defaults
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROJECTS))
      return DEFAULT_PROJECTS
    }
    return JSON.parse(stored)
  } catch {
    return DEFAULT_PROJECTS
  }
}

/**
 * Save projects to storage
 */
function saveProjects(projects: ProjectCategory[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

/**
 * Get a single project by ID
 */
export function getProject(id: string): ProjectCategory | undefined {
  return getProjects().find((p) => p.id === id)
}

/**
 * Create a new project
 */
export function createProject(input: CreateProjectInput): ProjectCategory {
  const projects = getProjects()
  const maxOrder = Math.max(...projects.map((p) => p.sortOrder), -1)

  const project: ProjectCategory = {
    id: `project_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: input.name,
    color: input.color,
    icon: input.icon,
    emoji: input.emoji,
    isDefault: false,
    sortOrder: maxOrder + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  saveProjects([...projects, project])
  return project
}

/**
 * Update a project
 */
export function updateProject(id: string, input: UpdateProjectInput): ProjectCategory | null {
  const projects = getProjects()
  const index = projects.findIndex((p) => p.id === id)
  if (index === -1) return null

  const updated: ProjectCategory = {
    ...projects[index],
    ...input,
    updatedAt: new Date().toISOString(),
  }

  projects[index] = updated
  saveProjects(projects)
  return updated
}

/**
 * Delete a project (only non-default projects)
 */
export function deleteProject(id: string): boolean {
  const projects = getProjects()
  const project = projects.find((p) => p.id === id)

  if (!project || project.isDefault) return false

  saveProjects(projects.filter((p) => p.id !== id))
  return true
}

/**
 * Reorder projects
 */
export function reorderProjects(ids: string[]): void {
  const projects = getProjects()
  const reordered = ids
    .map((id, index) => {
      const project = projects.find((p) => p.id === id)
      if (project) {
        return { ...project, sortOrder: index }
      }
      return null
    })
    .filter(Boolean) as ProjectCategory[]

  // Add any projects not in the ids list at the end
  const missing = projects.filter((p) => !ids.includes(p.id))
  missing.forEach((p, i) => {
    reordered.push({ ...p, sortOrder: ids.length + i })
  })

  saveProjects(reordered)
}

/**
 * Reset to default projects
 */
export function resetProjects(): void {
  saveProjects(DEFAULT_PROJECTS)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get project color by ID
 */
export function getProjectColor(projectId: string | undefined): string {
  if (!projectId) return '#64748b' // Slate gray default
  const project = getProject(projectId)
  return project?.color || '#64748b'
}

/**
 * Get project icon by ID
 */
export function getProjectIcon(projectId: string | undefined): LucideIcon {
  if (!projectId) return Star
  const project = getProject(projectId)
  const iconName = project?.icon || 'Star'
  return PROJECT_ICONS[iconName] || Star
}

/**
 * Get project name by ID
 */
export function getProjectName(projectId: string | undefined): string {
  if (!projectId) return 'No Project'
  const project = getProject(projectId)
  return project?.name || 'Unknown'
}

/**
 * Get color with opacity for backgrounds
 */
export function getProjectColorWithOpacity(projectId: string | undefined, opacity: number = 0.2): string {
  const color = getProjectColor(projectId)
  // Convert hex to rgba
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/**
 * Get contrasting text color (black or white) for a project color
 */
export function getProjectTextColor(projectId: string | undefined): 'black' | 'white' {
  const color = getProjectColor(projectId)
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  // Luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? 'black' : 'white'
}
