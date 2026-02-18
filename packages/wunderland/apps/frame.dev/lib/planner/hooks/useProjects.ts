/**
 * useProjects Hook
 *
 * Manages project/area categories with CRUD operations.
 *
 * @module lib/planner/hooks/useProjects
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProjectCategory, CreateProjectInput, UpdateProjectInput } from '../projects'
import {
  getProjects,
  getProject,
  createProject as createProjectFn,
  updateProject as updateProjectFn,
  deleteProject as deleteProjectFn,
  reorderProjects as reorderProjectsFn,
  resetProjects as resetProjectsFn,
  getProjectColor,
  getProjectIcon,
  getProjectName,
  getProjectColorWithOpacity,
  getProjectTextColor,
} from '../projects'

export interface UseProjectsReturn {
  // Data
  projects: ProjectCategory[]
  isLoading: boolean

  // CRUD
  createProject: (input: CreateProjectInput) => ProjectCategory
  updateProject: (id: string, input: UpdateProjectInput) => ProjectCategory | null
  deleteProject: (id: string) => boolean
  reorderProjects: (ids: string[]) => void
  resetProjects: () => void

  // Helpers
  getProjectById: (id: string) => ProjectCategory | undefined
  getColor: (projectId: string | undefined) => string
  getColorWithOpacity: (projectId: string | undefined, opacity?: number) => string
  getTextColor: (projectId: string | undefined) => 'black' | 'white'
  getName: (projectId: string | undefined) => string
  getIcon: (projectId: string | undefined) => ReturnType<typeof getProjectIcon>

  // Refresh
  refresh: () => void
}

/**
 * Hook for managing project categories
 */
export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<ProjectCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load projects
  const loadProjects = useCallback(() => {
    setIsLoading(true)
    const loaded = getProjects()
    setProjects(loaded.sort((a, b) => a.sortOrder - b.sortOrder))
    setIsLoading(false)
  }, [])

  // Initial load
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // Create project
  const createProject = useCallback(
    (input: CreateProjectInput): ProjectCategory => {
      const project = createProjectFn(input)
      loadProjects()
      return project
    },
    [loadProjects]
  )

  // Update project
  const updateProject = useCallback(
    (id: string, input: UpdateProjectInput): ProjectCategory | null => {
      const project = updateProjectFn(id, input)
      if (project) loadProjects()
      return project
    },
    [loadProjects]
  )

  // Delete project
  const deleteProject = useCallback(
    (id: string): boolean => {
      const success = deleteProjectFn(id)
      if (success) loadProjects()
      return success
    },
    [loadProjects]
  )

  // Reorder projects
  const reorderProjects = useCallback(
    (ids: string[]): void => {
      reorderProjectsFn(ids)
      loadProjects()
    },
    [loadProjects]
  )

  // Reset projects
  const resetProjects = useCallback((): void => {
    resetProjectsFn()
    loadProjects()
  }, [loadProjects])

  return {
    projects,
    isLoading,
    createProject,
    updateProject,
    deleteProject,
    reorderProjects,
    resetProjects,
    getProjectById: getProject,
    getColor: getProjectColor,
    getColorWithOpacity: getProjectColorWithOpacity,
    getTextColor: getProjectTextColor,
    getName: getProjectName,
    getIcon: getProjectIcon,
    refresh: loadProjects,
  }
}

/**
 * Hook for a single project
 */
export function useProject(id: string | undefined) {
  const { projects, getColor, getColorWithOpacity, getTextColor, getName, getIcon } = useProjects()

  const project = id ? projects.find((p) => p.id === id) : undefined

  return {
    project,
    color: getColor(id),
    colorWithOpacity: (opacity?: number) => getColorWithOpacity(id, opacity),
    textColor: getTextColor(id),
    name: getName(id),
    icon: getIcon(id),
  }
}
