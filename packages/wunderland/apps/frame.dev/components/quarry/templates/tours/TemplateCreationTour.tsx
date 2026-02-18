/**
 * Template Creation Tour
 * @module codex/templates/tours/TemplateCreationTour
 *
 * @remarks
 * Guided tour for creating new templates in the Template Builder.
 * Walks users through:
 * - Naming and categorizing templates
 * - Adding and configuring fields
 * - Writing template content with placeholders
 * - Previewing and testing templates
 * - Exporting or publishing
 */

'use client'

import React, { useEffect } from 'react'
import { useTour, TourDefinition } from '../../ui/tour/useTour'
import { TourGuide } from '../../ui/tour/TourGuide'

/* ═══════════════════════════════════════════════════════════════════════════
   TOUR DEFINITION
═══════════════════════════════════════════════════════════════════════════ */

export const TEMPLATE_CREATION_TOUR: TourDefinition = {
  id: 'template-creation',
  name: 'Create Your First Template',
  description: 'Learn how to create custom templates step by step',
  version: 1,
  showOnFirstVisit: true,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Template Builder',
      content: 'Templates help you create consistent, structured documents quickly. Let\'s walk through how to build your own custom template.',
      placement: 'center',
      spotlight: false,
    },
    {
      id: 'template-name',
      target: '[data-tour="template-name"]',
      title: 'Name Your Template',
      content: 'Start with a clear, descriptive name. Use title case (e.g., "Meeting Notes", "Project Brief"). This name appears in the template picker.',
      placement: 'bottom',
      spotlight: true,
    },
    {
      id: 'template-category',
      target: '[data-tour="template-category"]',
      title: 'Choose a Category',
      content: 'Pick the category that best fits your template. This helps users find templates when browsing by type.',
      placement: 'bottom',
      spotlight: true,
    },
    {
      id: 'template-description',
      target: '[data-tour="template-description"]',
      title: 'Add a Description',
      content: 'Write a brief description explaining what this template is for. Users will see this when previewing templates.',
      placement: 'bottom',
      spotlight: true,
    },
    {
      id: 'template-fields',
      target: '[data-tour="template-fields"]',
      title: 'Define Your Fields',
      content: 'Fields are the inputs users fill out when using your template. Each field becomes a placeholder you can use in the template content.',
      placement: 'right',
      spotlight: true,
    },
    {
      id: 'field-type',
      target: '[data-tour="field-type"]',
      title: 'Choose Field Types',
      content: 'Select the right type for each input: Text for short entries, Textarea for paragraphs, Select for dropdown choices, Date for calendar picking.',
      placement: 'right',
      spotlight: true,
    },
    {
      id: 'field-validation',
      target: '[data-tour="field-validation"]',
      title: 'Add Validation (Optional)',
      content: 'You can require fields, set length limits, or add pattern matching to ensure quality input.',
      placement: 'right',
      spotlight: true,
    },
    {
      id: 'template-content',
      target: '[data-tour="template-content"]',
      title: 'Write Your Template',
      content: 'This is where the magic happens! Write your template content using {fieldName} placeholders. They\'ll be replaced with user input.',
      placement: 'top',
      spotlight: true,
    },
    {
      id: 'placeholder-insertion',
      target: '[data-tour="placeholder-toolbar"]',
      title: 'Insert Placeholders',
      content: 'Click any field button to insert its placeholder at your cursor. Or type { to trigger autocomplete and find fields quickly.',
      placement: 'bottom',
      spotlight: true,
    },
    {
      id: 'live-preview',
      target: '[data-tour="live-preview"]',
      title: 'Live Preview',
      content: 'See your template come to life in real-time. The preview shows sample data so you can visualize the final output.',
      placement: 'left',
      spotlight: true,
    },
    {
      id: 'template-preview-step',
      target: '[data-tour="preview-step"]',
      title: 'Test Your Template',
      content: 'In the Preview step, fill out the form with real data to see exactly how your template will work for users.',
      placement: 'bottom',
      spotlight: true,
    },
    {
      id: 'export-options',
      target: '[data-tour="export-step"]',
      title: 'Export or Publish',
      content: 'Download your template as JSON to share, or publish directly to a GitHub repository for others to use.',
      placement: 'bottom',
      spotlight: true,
    },
    {
      id: 'complete',
      title: 'You\'re Ready!',
      content: 'You now know how to create custom templates. Start with something simple and build up complexity as you go. Happy templating!',
      placement: 'center',
      spotlight: false,
    },
  ],
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */

export function useTemplateCreationTour() {
  const tour = useTour()

  const startTour = () => {
    tour.startTour(TEMPLATE_CREATION_TOUR)
  }

  const shouldShowTour = !tour.hasCompletedTour(TEMPLATE_CREATION_TOUR.id) &&
                         !tour.hasSkippedTour(TEMPLATE_CREATION_TOUR.id)

  return {
    ...tour,
    startTour,
    shouldShowTour,
    tourId: TEMPLATE_CREATION_TOUR.id,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface TemplateCreationTourProps {
  /** Whether to auto-start on first visit */
  autoStart?: boolean
  /** Dark mode */
  isDark?: boolean
}

export default function TemplateCreationTour({
  autoStart = false,
  isDark = true,
}: TemplateCreationTourProps) {
  const tour = useTemplateCreationTour()

  // Auto-start on first visit if enabled
  useEffect(() => {
    if (autoStart && tour.shouldShowTour && tour.isFirstVisit) {
      // Delay slightly to let the page render
      const timer = setTimeout(() => {
        tour.startTour()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [autoStart, tour.shouldShowTour, tour.isFirstVisit])

  return (
    <TourGuide
      isActive={tour.isActive}
      currentStep={tour.currentStep}
      currentStepIndex={tour.currentStepIndex}
      totalSteps={tour.totalSteps}
      progress={tour.progress}
      currentTour={tour.currentTour}
      onNext={tour.nextStep}
      onPrev={tour.prevStep}
      onSkip={tour.skipTour}
      onComplete={tour.completeTour}
      onGoToStep={tour.goToStep}
      isDark={isDark}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOUR TRIGGER BUTTON
═══════════════════════════════════════════════════════════════════════════ */

interface TourTriggerButtonProps {
  className?: string
}

export function TemplateCreationTourTrigger({ className }: TourTriggerButtonProps) {
  const { startTour, hasCompletedTour } = useTemplateCreationTour()
  const isCompleted = hasCompletedTour(TEMPLATE_CREATION_TOUR.id)

  return (
    <button
      onClick={startTour}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
        isCompleted
          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
      } ${className || ''}`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {isCompleted ? 'Replay Tour' : 'Take the Tour'}
    </button>
  )
}
