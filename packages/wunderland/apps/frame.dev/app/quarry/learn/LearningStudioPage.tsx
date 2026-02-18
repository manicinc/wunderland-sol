'use client'

/**
 * Learning Studio Page Client
 * @module codex/learn/LearningStudioPage
 *
 * Full-page learning experience with consistent QuarryPageLayout navigation.
 * Includes left sidebar with stats/widgets, right sidebar with clock/ambience/jukebox.
 * 
 * Fetches strands from /api/strands (database) for reliable strand selection.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import LearningStudio, { type LearningStudioRef } from '@/components/quarry/ui/learning/LearningStudio'
import LearningSidebar from '@/components/quarry/ui/learning/LearningSidebar'
import { AmbienceRightSidebar } from '@/components/quarry/ui/sidebar/AmbienceRightSidebar'
import { useAllStrands, type StrandSummary } from '@/lib/hooks/useStrands'
import { useTreeSelection } from '@/components/quarry/hooks/useTreeSelection'
import { SelectedStrandsProvider } from '@/components/quarry/contexts/SelectedStrandsContext'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import type { LearningFilters } from '@/components/quarry/ui/learning/LearningFiltersPanel'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import type { ThemeName } from '@/types/theme'

// Convert API StrandSummary to LearningStudio format
function toLearningSummary(strand: StrandSummary) {
  return {
    id: strand.id,
    path: strand.path,
    title: strand.title,
    tags: strand.tags,
    subjects: strand.subjects,
    topics: strand.topics,
    skills: [], // Not in API yet
    difficulty: strand.difficulty || 'intermediate',
    strandCount: 1,
  }
}

export default function LearningStudioPage() {
  const router = useRouter()
  const resolvePath = useQuarryPath()
  const searchParams = useSearchParams()
  const { theme } = useTheme()

  const [currentStrand, setCurrentStrand] = useState<string | undefined>(
    searchParams.get('strand') || undefined
  )
  const [strandContent, setStrandContent] = useState<string>('')
  const [isMounted, setIsMounted] = useState(false)
  const [activeFilters, setActiveFilters] = useState<LearningFilters>({
    tags: [],
    subjects: [],
    topics: [],
  })

  // Fetch strands from database API
  const { strands, loading: strandsLoading, error, filterOptions } = useAllStrands()

  // Convert to Learning Studio format
  const availableStrands = strands.map(toLearningSummary)

  // Tree selection for multi-strand mode
  const treeSelection = useTreeSelection()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch strand content if specified
  useEffect(() => {
    if (!currentStrand) return

    const fetchContent = async () => {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/OpenStrand/frame.codex/main/${currentStrand}`)
        if (res.ok) {
          setStrandContent(await res.text())
        }
      } catch (err) {
        console.warn('Failed to fetch strand content:', err)
      }
    }

    fetchContent()
  }, [currentStrand])

  // Fetch content for a strand (used by multi-strand mode)
  const handleFetchStrandContent = useCallback(async (strandPath: string): Promise<string | null> => {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/OpenStrand/frame.codex/main/${strandPath}`)
      if (res.ok) {
        return await res.text()
      }
      return null
    } catch (err) {
      console.warn('Failed to fetch strand content:', err)
      return null
    }
  }, [])

  const handleNavigate = (path: string) => {
    setCurrentStrand(path)
    // Update URL without navigation
    const url = new URL(window.location.href)
    url.searchParams.set('strand', path)
    window.history.pushState({}, '', url.toString())
  }

  const handleFiltersChange = useCallback((filters: LearningFilters) => {
    setActiveFilters(filters)
  }, [])

  // Ref for controlling LearningStudio from sidebar
  const learningStudioRef = useRef<LearningStudioRef>(null)

  // Left sidebar content with LearningSidebar
  const leftPanelContent = (
    <LearningSidebar
      theme={(theme || 'light') as ThemeName}
      strandsCount={availableStrands.length}
      selectedCount={treeSelection.selectedPaths.size}
      onSelectStrands={() => learningStudioRef.current?.openStrandSelector?.()}
      onStartFlashcards={() => learningStudioRef.current?.startFlashcards?.()}
      onStartQuiz={() => learningStudioRef.current?.startQuiz?.()}
      onStartMindmap={() => learningStudioRef.current?.startMindmap?.()}
      stats={{
        dueToday: 0,
        streak: 0,
        mastered: 0,
        totalReviewed: 0,
      }}
    />
  )

  // Right sidebar with clock, ambience controls, and jukebox
  const rightPanelContent = (
    <AmbienceRightSidebar
      theme={(theme || 'light') as ThemeName}
    />
  )

  return (
    <SelectedStrandsProvider>
      <QuarryPageLayout
        title="Learning Studio"
        description="Flashcards, quizzes, and AI-generated questions with spaced repetition"
        leftPanelContent={leftPanelContent}
        rightPanelContent={rightPanelContent}
        showRightPanel={true}
        forceSidebarSmall={true}
        rightPanelWidth={260}
      >
        {!isMounted || strandsLoading ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <LearningStudio
              ref={learningStudioRef}
              isOpen={true}
              onClose={() => router.push(resolvePath('/quarry'))}
              mode="page"
              strandSlug={currentStrand}
              content={strandContent}
              theme={theme || 'light'}
              initialViewMode={currentStrand ? 'single' : 'multi'}
              availableStrands={availableStrands}
              filterOptions={{ ...filterOptions, skills: [] }}
              treeSelectionStats={treeSelection.stats}
              selectedPaths={treeSelection.selectedPaths}
              onFiltersChange={handleFiltersChange}
              onFetchStrandContent={handleFetchStrandContent}
            />
          </div>
        )}
      </QuarryPageLayout>
    </SelectedStrandsProvider>
  )
}
