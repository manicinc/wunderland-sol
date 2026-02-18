// File: frontend/src/components/layouts/CompactMessageRenderer/CompactMessageRenderer.vue
/**
 * @file CompactMessageRenderer.vue
 * @description A component for rendering structured content, potentially as a slideshow with
 * autoplay, code blocks, Mermaid diagrams, and rich text. Features responsive design,
 * theming, text animation for titles, and slide transitions.
 *
 * @component CompactMessageRenderer
 * @props {string} content - The raw Markdown/structured content to render.
 * @props {string} [mode='general'] - Rendering mode (e.g., 'general', 'lc_audit_aide').
 * @props {string} [language='plaintext'] - Default language for code blocks.
 * @props {number} [initialSlideIndex=0] - Starting slide index for slideshows.
 * @props {boolean} [disableInternalAutoplay=false] - Disables the built-in autoplay feature.
 *
 * @emits toggle-fullscreen - When fullscreen is toggled.
 * @emits interaction - For various user interactions (e.g., copy, export requests, toasts).
 * @emits slide-changed - When the current slide changes in slideshow mode.
 * @emits internal-autoplay-status-changed - When internal autoplay status changes.
 * @emits rendered - When content processing and initial rendering are complete.
 *
 * @version 1.1.2 - Revamped SCSS to inline prose styles and utilize shared button mixins for theming consistency.
 */
<script setup lang="ts">
import { ref, onMounted, watch, type PropType } from 'vue';
import {
  ChevronLeftIcon, ChevronRightIcon, PlayIcon as PlaySolidIcon, PauseIcon as PauseSolidIcon,
  ArrowsPointingOutIcon, ArrowsPointingInIcon, DocumentDuplicateIcon, PhotoIcon,
  PresentationChartLineIcon, PlusCircleIcon, MinusCircleIcon,
} from '@heroicons/vue/24/solid';

import { useCompactMessageRenderer } from './useCompactMessageRenderer';
import { type CompactMessageRendererPublicMethods, MIN_SLIDE_DURATION_MS } from './CompactMessageRendererTypes'; // Import MIN_SLIDE_DURATION_MS

const props = defineProps({
  content: { type: String as PropType<string>, required: true },
  mode: { type: String as PropType<string>, default: 'general' },
  language: { type: String as PropType<string>, default: 'plaintext' },
  initialSlideIndex: { type: Number as PropType<number>, default: 0 },
  disableInternalAutoplay: { type: Boolean as PropType<boolean>, default: false },
});

const emit = defineEmits<{
  (e: 'toggle-fullscreen'): void;
  (e: 'interaction', payload: { type: string; data?: any }): void;
  (e: 'slide-changed', payload: { newIndex: number; totalSlides: number; navigatedManually: boolean }): void;
  (e: 'internal-autoplay-status-changed', payload: { isPlaying: boolean; isPaused: boolean }): void;
  (e: 'rendered'): void;
}>();

const localContentDisplayRootRef = ref<HTMLElement | null>(null);

const {
  isLoadingContent,
  analyzedContent,
  slides,
  currentSlideIndex,
  isSlideshowMode,
  isAutoplayActive,
  isAutoplayEffectivelyPaused,
  autoplayProgress,
  isComponentFullscreen,
  currentContentFontScale,
  nonSlideDiagrams, // Destructured, used in composable logic even if not directly in this template's v-for

  currentSlideData,
  totalSlides,
  canGoNext,
  canGoPrev,
  currentSlideTargetDurationMs,
  currentSlideTimeElapsedMs,

  // Title Animation states from composable
  animatedSlideTitleUnits,
  isSlideTitleAnimating,

  navigateToSlide,
  nextSlide,
  prevSlide,
  toggleInternalAutoplay,
  toggleComponentFullscreen,
  adjustFontSize,
  copyAllCodeBlocks,
  exportDiagrams,
  exportSlidesContent,
  contentDisplayRootRef,
} = useCompactMessageRenderer(props, emit);

watch(localContentDisplayRootRef, (newEl) => {
  contentDisplayRootRef.value = newEl;
});

onMounted(() => {
  const rootEl = localContentDisplayRootRef.value;
    if (rootEl && !getComputedStyle(rootEl).getPropertyValue('--content-font-scale')) {
      rootEl.style.setProperty('--content-font-scale', '1');
    }
});

defineExpose<CompactMessageRendererPublicMethods>({
  navigateToSlide: (index: number) => navigateToSlide(index, 'user'),
  next: nextSlide,
  prev: prevSlide,
  pauseAutoplay: () => { if (!props.disableInternalAutoplay) isAutoplayActive.value = false; },
  resumeAutoplay: () => { if (!props.disableInternalAutoplay) isAutoplayActive.value = true; },
  toggleFullscreen: toggleComponentFullscreen,
  getCurrentSlideIndex: () => currentSlideIndex.value,
  getTotalSlides: () => totalSlides.value,
});

</script>

<template>
  <div
    class="cmr"
    ref="localContentDisplayRootRef"
    :class="[
      `cmr--mode-${props.mode.replace(/[^a-z0-9-_]/gi, '-').toLowerCase()}`,
      {
        'cmr--fullscreen': isComponentFullscreen,
        'cmr--slideshow-active': isSlideshowMode,
      },
      `cmr--analysis-type-${analyzedContent?.contentType || 'general'}`
    ]"
    :style="{ '--content-font-scale': currentContentFontScale }"
    role="region"
    aria-label="Compact Message Content"
  >
    <div v-if="isLoadingContent" class="cmr__loading-overlay" role="status" aria-live="polite">
      <div class="cmr__spinner"></div>
      <p>Processing Content...</p>
    </div>

    <div v-if="analyzedContent && !isSlideshowMode && !isLoadingContent" class="cmr__analysis-banner">
      <div class="cmr__banner-info-group">
        <span class="cmr__banner-title">{{ analyzedContent.displayTitle }}</span>
        <span v-if="analyzedContent.difficulty" :class="`cmr__difficulty-badge cmr__difficulty--${analyzedContent.difficulty.toLowerCase()}`">
          {{ analyzedContent.difficulty }}
        </span>
      </div>
      <div class="cmr__banner-meta-group">
        <span v-if="analyzedContent.estimatedTotalReadingTimeMs > 0 && analyzedContent.estimatedTotalReadingTimeMs > MIN_SLIDE_DURATION_MS" class="cmr__meta-item">
          ~{{ Math.ceil(analyzedContent.estimatedTotalReadingTimeMs / 60000) }} min read
        </span>
        <span v-if="analyzedContent.complexity?.time" :class="['cmr__complexity-tag', 'cmr__complexity--time']" class="cmr__meta-item">Time: {{ analyzedContent.complexity.time }}</span>
        <span v-if="analyzedContent.complexity?.space" :class="['cmr__complexity-tag', 'cmr__complexity--space']" class="cmr__meta-item">Space: {{ analyzedContent.complexity.space }}</span>
      </div>
    </div>

    <div class="cmr__content-area" :class="{'cmr__content-area--slideshow': isSlideshowMode}">
      <Transition name="slide-fade" mode="out-in">
        <div v-if="isSlideshowMode && currentSlideData"
             class="cmr__slide-content-wrapper"
             :key="currentSlideData.id"
             role="tabpanel"
             :aria-labelledby="`slide-title-${currentSlideData.id}`"
             tabindex="0"
        >
          <div v-if="analyzedContent && currentSlideIndex === 0" class="cmr__analysis-banner cmr__analysis-banner--slide-header">
            <span class="cmr__banner-title">{{ analyzedContent.displayTitle }}</span>
            <span v-if="analyzedContent.difficulty" :class="`cmr__difficulty-badge cmr__difficulty--${analyzedContent.difficulty.toLowerCase()}`">
              {{ analyzedContent.difficulty }}
            </span>
          </div>
          
          <h3 v-if="currentSlideData.title && !(currentSlideIndex === 0 && currentSlideData.title === analyzedContent?.displayTitle)"
              :id="`slide-title-${currentSlideData.id}`"
              class="cmr__slide-title">
            <template v-if="isSlideTitleAnimating || (animatedSlideTitleUnits.length > 0 && currentSlideData.title === animatedSlideTitleUnits[0]?.content?.slice(0, currentSlideData.title.length))">
              <span
                v-for="unit in animatedSlideTitleUnits"
                :key="unit.key"
                :style="unit.style"
                :class="unit.classes"
                class="animated-slide-title-unit"
              >{{ unit.content }}</span>
            </template>
            <template v-else>
              {{ currentSlideData.title }}
            </template>
          </h3>

          <div
            :class="['cmr__slide-html-content', `cmr__slide-type--${currentSlideData.slideType}`]"
            v-html="currentSlideData.htmlContent"
          ></div>
        </div>

        <div v-else-if="!isSlideshowMode && analyzedContent && slides.length > 0"
             class="cmr__single-content-wrapper"
             :key="'single-content-view'"
        >
          <div class="cmr__single-content-html" v-html="slides[0].htmlContent"></div>
        </div>
        <p v-else-if="!isLoadingContent && (!analyzedContent || slides.length === 0)"
           class="cmr__status-text cmr__status-text--empty"
           :key="'empty-content-message'">
          No structured content to display.
        </p>
      </Transition>
    </div>

    <div class="cmr__control-bar" v-if="analyzedContent && !isLoadingContent">
      <div class="cmr__controls-group cmr__controls-group--nav" v-if="isSlideshowMode && totalSlides > 1">
        <button @click="prevSlide" :disabled="!canGoPrev" class="cmr__control-btn cmr__control-btn--icon-only" title="Previous Slide" aria-label="Previous Slide"><ChevronLeftIcon class="cmr__icon" /></button>
        <div class="cmr__slide-indicator">
          <span class="cmr__slide-counter">{{ currentSlideIndex + 1 }} / {{ totalSlides }}</span>
          <div class="cmr__progress-dots" role="tablist" aria-label="Slide Navigation">
            <button
              v-for="(_, index) in slides" :key="`dot-${index}`"
              @click="() => navigateToSlide(index, 'user')"
              class="cmr__dot" :class="{ 'cmr__dot--active': index === currentSlideIndex }"
              :aria-label="`Go to slide ${index + 1}`" role="tab" :aria-selected="index === currentSlideIndex"
            ></button>
          </div>
        </div>
        <button @click="nextSlide" :disabled="!canGoNext" class="cmr__control-btn cmr__control-btn--icon-only" title="Next Slide" aria-label="Next Slide"><ChevronRightIcon class="cmr__icon" /></button>
        <button
          v-if="!disableInternalAutoplay"
          @click="toggleInternalAutoplay"
          class="cmr__control-btn cmr__control-btn--icon-only"
          :title="isAutoplayActive && !isAutoplayEffectivelyPaused ? 'Pause Autoplay' : 'Start/Resume Autoplay'"
          :aria-pressed="isAutoplayActive && !isAutoplayEffectivelyPaused">
          <PauseSolidIcon v-if="isAutoplayActive && !isAutoplayEffectivelyPaused" class="cmr__icon" />
          <PlaySolidIcon v-else class="cmr__icon" />
        </button>
      </div>
      <div class="cmr__controls-group cmr__controls-group--actions">
        <button @click="copyAllCodeBlocks(contentDisplayRootRef)" class="cmr__control-btn" title="Copy All Code Blocks">
          <DocumentDuplicateIcon class="cmr__icon" /><span class="cmr__btn-label">Copy Code</span>
        </button>
        <button @click="exportDiagrams" v-if="analyzedContent?.diagramCount > 0" class="cmr__control-btn" title="Export Diagrams as SVG">
          <PhotoIcon class="cmr__icon" /><span class="cmr__btn-label">Diagrams</span>
        </button>
        <button @click="exportSlidesContent" v-if="isSlideshowMode" class="cmr__control-btn" title="Export Slides Content">
          <PresentationChartLineIcon class="cmr__icon" /><span class="cmr__btn-label">Slides</span>
        </button>
      </div>
      <div class="cmr__controls-group cmr__controls-group--view">
        <button @click="adjustFontSize(-1)" class="cmr__control-btn cmr__control-btn--icon-only" title="Decrease Font Size" aria-label="Decrease Font Size"><MinusCircleIcon class="cmr__icon" /></button>
        <button @click="adjustFontSize(1)" class="cmr__control-btn cmr__control-btn--icon-only" title="Increase Font Size" aria-label="Increase Font Size"><PlusCircleIcon class="cmr__icon" /></button>
        <button @click="toggleComponentFullscreen" class="cmr__control-btn cmr__control-btn--icon-only" :title="isComponentFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'" :aria-label="isComponentFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'">
          <component :is="isComponentFullscreen ? ArrowsPointingInIcon : ArrowsPointingOutIcon" class="cmr__icon" />
        </button>
      </div>
    </div>
    <div v-if="isSlideshowMode && isAutoplayActive && !disableInternalAutoplay && totalSlides > 1 && !isAutoplayEffectivelyPaused" class="cmr__autoplay-progress">
        <div class="cmr__progress-track"><div class="cmr__progress-fill" :style="{ width: `${autoplayProgress}%` }"></div></div>
        <p v-if="autoplayProgress < 100" class="cmr__progress-label">Next slide in {{ Math.max(0, Math.ceil((currentSlideTargetDurationMs - currentSlideTimeElapsedMs) / 1000)) }}s</p>
    </div>
  </div>
</template>

<style lang="scss">
/**
 * @file _compact-message-renderer.scss (styles part of CompactMessageRenderer.vue)
 * @description Thematic and responsive styles for CompactMessageRenderer.vue.
 * Adheres to "Ephemeral Harmony" design system using CSS custom properties and SCSS variables.
 * @version 1.1.1 - Inlined prose styles, utilize shared button mixins.
 */

@use '../../../styles/abstracts/variables' as var;
@use '../../../styles/abstracts/mixins' as mixins;

.cmr { // Root element
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: hsl(var(--color-bg-primary-h), var(--color-bg-primary-s), var(--color-bg-primary-l));
  color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  font-size: calc(#{var.$font-size-base-default} * var(--content-font-scale, 1));
  position: relative;
  border: 1px solid hsl(var(--color-border-secondary-h), var(--color-border-secondary-s), var(--color-border-secondary-l), 0.2);
  border-radius: var.$radius-lg; // Consistent rounded corners

  &--fullscreen {
    position: fixed;
    inset: 0;
    z-index: var.$z-index-modal; // Ensure it's above other content
    border-radius: 0; // No rounded corners in true fullscreen
    border: none;
  }

  // Example mode-specific styling
  &.cmr--mode-lc_audit_aide {
    // border-left: 3px solid hsl(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l));
  }
  &.cmr--slideshow-active {
    // Specific styles when slideshow is active, if any
  }
}

.cmr__loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: hsla(var(--color-bg-primary-h),var(--color-bg-primary-s),var(--color-bg-primary-l), 0.85);
  backdrop-filter: blur(3px);
  z-index: 100; // Ensure above content during load

  .cmr__spinner {
    width: 48px; height: 48px; // Slightly larger spinner
    border: 5px solid hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.25);
    border-top-color: hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l));
    border-radius: 50%;
    animation: cmr-spin 0.7s linear infinite;
  }
  p {
    margin-top: var.$spacing-md;
    font-size: var.$font-size-sm;
    color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
    font-weight: 500;
  }
}

@keyframes cmr-spin { to { transform: rotate(360deg); } }

.cmr__analysis-banner {
  padding: var.$spacing-xs var.$spacing-md; // Consistent padding
  background-color: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.7);
  border-bottom: 1px solid hsl(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap; // Allow wrapping for multiple meta items
  gap: var.$spacing-sm var.$spacing-md; // Row and column gap
  font-size: var.$font-size-sm;
  flex-shrink: 0;

  &--slide-header { // Banner when used as a header on the first slide
    border-bottom-width: 2px; // More prominent separator
    margin-bottom: var.$spacing-sm;
    padding-top: var.$spacing-sm;
    padding-bottom: var.$spacing-sm;
  }

  .cmr__banner-info-group { display: flex; align-items: center; gap: var.$spacing-sm; }
  .cmr__banner-title {
    font-weight: 600;
    color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
    font-size: var.$font-size-base-default; // Larger title
  }
  .cmr__difficulty-badge {
    padding: calc(var.$spacing-xs / 2) var.$spacing-xs;
    border-radius: var.$radius-sm;
    font-size: calc(#{var.$font-size-xs} * 0.9); // Slightly smaller badge text
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    // Themed difficulty badges
    &.cmr__difficulty--easy { background-color: hsla(var(--color-success-h), var(--color-success-s), var(--color-success-l), 0.15); color: hsl(var(--color-success-h), var(--color-success-s), calc(var(--color-success-l) - 10%)); }
    &.cmr__difficulty--medium { background-color: hsla(var(--color-warning-h), var(--color-warning-s), var(--color-warning-l), 0.15); color: hsl(var(--color-warning-h), var(--color-warning-s), calc(var(--color-warning-l) - 10%)); }
    &.cmr__difficulty--hard { background-color: hsla(var(--color-error-h), var(--color-error-s), var(--color-error-l), 0.15); color: hsl(var(--color-error-h), var(--color-error-s), calc(var(--color-error-l) - 10%)); }
  }
  .cmr__banner-meta-group { display: flex; align-items: center; flex-wrap: wrap; gap: var.$spacing-sm; color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l)); }
  .cmr__meta-item { font-size: var.$font-size-xs; }
  .cmr__complexity-tag {
    font-size: calc(#{var.$font-size-xs} * 0.9);
    padding: calc(var.$spacing-xs / 2) var.$spacing-xs;
    border-radius: var.$radius-xs;
    background-color: hsla(var(--color-bg-tertiary-h), var(--color-bg-tertiary-s), var(--color-bg-tertiary-l), 0.8);
    color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
  }
}

.cmr__content-area {
  flex-grow: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative; // For slide transitions
  padding: var.$spacing-sm; // Base padding for content area, slides might override
  @include mixins.custom-scrollbar('--color-accent-interactive', 0.4, 0.65, '--color-bg-secondary', 0.1, 6px, var.$radius-sm);

  @media (min-width: var.$breakpoint-md) {
    padding: var.$spacing-md;
  }

  // When slideshow mode is active, the direct child .cmr__slide-content-wrapper handles its own padding
  &--slideshow {
    padding: 0; // Remove padding from content-area itself
  }
}

.cmr__slide-content-wrapper,
.cmr__single-content-wrapper {
  padding: var.$spacing-md; // Default padding for slide/single content
  min-height: 150px; // Ensure content area has some height
  outline: none; // For focus management if needed
  width: 100%; // Ensure it takes full width for transitions

  @media (min-width: var.$breakpoint-md) {
    padding: var.$spacing-lg;
  }
}

// Animated slide title units
.cmr__slide-title {
  font-size: calc(1.5em * var(--content-font-scale, 1)); // Prominent title
  font-weight: 600;
  color: hsl(var(--color-text-accent-h), var(--color-text-accent-s), var(--color-text-accent-l));
  margin-bottom: 0.85em;
  border-bottom: 1px solid hsla(var(--color-border-primary-h),var(--color-border-primary-s),var(--color-border-primary-l), 0.3);
  padding-bottom: 0.35em;
  line-height: 1.3;

  .animated-slide-title-unit {
    display: inline-block; // For potential transform animations per unit
  }
}

.cmr__slide-html-content,
.cmr__single-content-html {
  line-height: 1.65;
  font-size: inherit;
  color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));

  // Inlined Prose styling
  h1, h2, h3, h4, h5, h6 {
    margin-top: calc(1.3em * var(--content-font-scale, 1));
    margin-bottom: calc(0.65em * var(--content-font-scale, 1));
    line-height: 1.35;
    font-weight: 600;
    color: hsl(var(--color-text-heading-h, var.$default-color-text-primary-h), var(--color-text-heading-s, var.$default-color-text-primary-s), var(--color-text-heading-l, var.$default-color-text-primary-l));
  }
  p { margin-bottom: calc(1.1em * var(--content-font-scale, 1)); }
  ul, ol {
    margin-bottom: calc(1.1em * var(--content-font-scale, 1));
    padding-left: calc(1.8em * var(--content-font-scale, 1));
  }
  li { margin-bottom: calc(0.55em * var(--content-font-scale, 1)); }
  a {
    color: hsl(var(--color-text-accent-h, var.$default-color-accent-interactive-h), var(--color-text-accent-s, var.$default-color-accent-interactive-s), var(--color-text-accent-l, var.$default-color-accent-interactive-l));
    text-decoration: none;
    border-bottom: 1px solid hsla(var(--color-text-accent-h), var(--color-text-accent-s), var(--color-text-accent-l), 0.4);
    transition: color 0.15s ease, border-color 0.15s ease;
    &:hover {
      color: hsl(var(--color-accent-primary-light-h), var(--color-accent-primary-light-s), var(--color-accent-primary-light-l));
      border-bottom-color: hsla(var(--color-accent-primary-light-h), var(--color-accent-primary-light-s), var(--color-accent-primary-light-l), 0.7);
    }
  }
  blockquote {
    border-left: 4px solid hsl(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l), 0.7);
    padding-left: calc(1.2em * var(--content-font-scale, 1));
    margin-left: 0; margin-right: 0;
    font-style: italic;
    color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), calc(var(--color-text-secondary-l) + 5%));
    background-color: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.3);
    padding-top: var.$spacing-xs;
    padding-bottom: var.$spacing-xs;
    border-radius: var.$radius-sm;
  }
  hr {
    border: none;
    border-top: 1px solid hsl(var(--color-border-secondary-h), var(--color-border-secondary-s), var(--color-border-secondary-l), 0.3);
    margin: var.$spacing-lg 0;
  }
  table {
    width: 100%;
    margin-bottom: calc(1.2em * var(--content-font-scale, 1));
    border-collapse: collapse;
    font-size: 0.9em;
  }
  th, td {
    border: 1px solid hsl(var(--color-border-secondary-h), var(--color-border-secondary-s), var(--color-border-secondary-l), 0.3);
    padding: calc(0.5em * var(--content-font-scale, 1)) calc(0.7em * var(--content-font-scale, 1));
    text-align: left;
  }
  th {
    background-color: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.5);
    font-weight: 600;
    color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  }
  code:not(pre > code) { // Inline code
    background-color: hsla(var(--color-bg-code-inline-h),var(--color-bg-code-inline-s),var(--color-bg-code-inline-l), var(--color-bg-code-inline-a, 0.7));
    color: hsl(var(--color-text-code-inline-h), var(--color-text-code-inline-s), var(--color-text-code-inline-l), var(--color-text-code-inline-a, 1));
    padding: 0.15em 0.4em;
    border-radius: var.$radius-xs;
    font-size: 0.85em;
    border: 1px solid hsla(var(--color-border-code-inline-h),var(--color-border-code-inline-s),var(--color-border-code-inline-l), var(--color-border-code-inline-a, 0.3));
  }
}


.cmr__slide-diagram-wrapper,
.cmr__diagram-placeholder { // For non-slide diagrams
  margin-top: var.$spacing-md;
  padding: var.$spacing-sm;
  border: 1px solid hsl(var(--color-border-secondary-h), var(--color-border-secondary-s), var(--color-border-secondary-l), 0.3);
  border-radius: var.$radius-lg; // Consistent radius
  background-color: hsla(var(--color-bg-secondary-h),var(--color-bg-secondary-s),calc(var(--color-bg-secondary-l) - 2%), 0.6); // Slightly darker secondary
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 150px;
  overflow: auto; // For very large diagrams

  .mermaid-diagram-slide-wrapper { // If an inner div is used for mermaid specifically
    width: 100%;
    svg { max-width: 100%; height: auto; display: block; margin: 0 auto;}
  }
}


.cmr__control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var.$spacing-xs var.$spacing-md; // Balanced padding
  border-top: 1px solid hsl(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.2);
  background-color: hsla(var(--color-bg-secondary-h),var(--color-bg-secondary-s),calc(var(--color-bg-secondary-l) - 3%), 0.8); // Darker secondary
  backdrop-filter: blur(5px);
  flex-wrap: wrap;
  gap: var.$spacing-sm; // Gap between control groups
  flex-shrink: 0;
}
.cmr__controls-group {
  display: flex;
  align-items: center;
  gap: var.$spacing-xs; // Space between buttons in a group
}
.cmr__control-btn {
  @include mixins.button-ghost(
    $text-color-var-prefix: '--color-text-secondary',
    $accent-color-var-prefix: '--color-accent-interactive',
    $padding: var.$spacing-xs, // Consistent padding for control buttons
    $border-radius: var.$radius-md
  );
  // Additional styles or overrides
  line-height: 1; // Ensure icon and text align well
  transition: background-color var.$duration-quick ease-out, color var.$duration-quick ease-out, transform var.$duration-quick ease-out, border-color var.$duration-quick ease-out;


  &:hover:not(:disabled) {
    // transform is an addition to the mixin's hover
    transform: translateY(-1px);
    // Keep mixin's background-color and color for hover
  }
  &:active:not(:disabled) {
    // transform is an addition/reset for active state
    transform: translateY(0px);
    // Keep mixin's background-color for active
  }

  .cmr__icon { width: 1.15rem; height: 1.15rem; } // Standardized icon size in controls
  .cmr__btn-label {
    font-size: calc(#{var.$font-size-xs} * 0.95);
    margin-left: calc(var.$spacing-xs / 1.5);
    display: none; // Hidden on mobile by default
    @media (min-width: var.$breakpoint-sm) { display: inline; } // Show on SM screens and up
  }
  // Modifier for icon-only buttons for consistent sizing
  &--icon-only {
    // Padding is handled by the mixin parameter.
    // If specific override needed for icon-only and it differs from other .cmr__control-btn, it would go here.
    // For now, assuming var.$spacing-xs is suitable for both.
    .cmr__icon { margin: 0; } // No margin if only icon
    .cmr__btn-label { display: none !important; } // Always hide label
  }
}
.cmr__slide-indicator {
  display: flex;
  align-items: center;
  gap: var.$spacing-sm;
  color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
  font-size: var.$font-size-xs; // Smaller indicator text
}
.cmr__progress-dots {
  display: flex;
  gap: calc(var.$spacing-xs / 1.5);
  .cmr__dot {
    width: 7px; height: 7px; border-radius: 50%;
    background-color: hsla(var(--color-text-muted-h),var(--color-text-muted-s),var(--color-text-muted-l), 0.35);
    border: none; padding: 0; cursor: pointer;
    transition: background-color 0.2s ease, transform 0.2s ease;
    &:hover { background-color: hsla(var(--color-accent-primary-h),var(--color-accent-primary-s),var(--color-accent-primary-l), 0.75); transform: scale(1.1); }
    &.cmr__dot--active {
      background-color: hsl(var(--color-accent-primary-h),var(--color-accent-primary-s),var(--color-accent-primary-l));
      transform: scale(1.2);
      box-shadow: 0 0 5px hsla(var(--color-accent-primary-h),var(--color-accent-primary-s),var(--color-accent-primary-l),0.5);
    }
  }
}

.cmr__autoplay-progress {
  padding: calc(var.$spacing-xs / 2) var.$spacing-md;
  background-color: hsla(var(--color-bg-tertiary-h),var(--color-bg-tertiary-s),calc(var(--color-bg-tertiary-l) + 5%), 0.6); // Brighter tertiary
  font-size: calc(#{var.$font-size-xs} * 0.9);
  color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
  text-align: center;
  flex-shrink: 0;
  .cmr__progress-track {
    height: 4px; background-color: hsla(var(--color-text-muted-h),var(--color-text-muted-s),var(--color-text-muted-l), 0.15);
    border-radius: var.$radius-full; overflow: hidden; margin-bottom: calc(var.$spacing-xs / 2);
  }
  .cmr__progress-fill {
    height: 100%;
    background-color: hsl(var(--color-accent-primary-h),var(--color-accent-primary-s),var(--color-accent-primary-l));
    transition: width 0.1s linear;
    border-radius: var.$radius-full;
  }
  .cmr__progress-label {
    line-height: 1.2;
  }
}

// Enhanced Code Block Styling
.cmr__code-block {
  position: relative;
  background-color: hsl(var(--color-bg-code-block-h), var(--color-bg-code-block-s), var(--color-bg-code-block-l), var(--color-bg-code-block-a));
  border-radius: var.$radius-lg; // Softer radius
  margin: var.$spacing-md 0;
  box-shadow: var(--shadow-depth-sm); // Subtle shadow
  border: 1px solid hsl(var(--color-border-code-block-h), var(--color-border-code-block-s), var(--color-border-code-block-l), calc(var(--color-border-code-block-a) * 0.7)); // Themed border
  overflow: hidden; // Ensure header and pre respect border-radius

  .cmr__code-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: var.$spacing-xs var.$spacing-sm;
    background-color: hsla(var(--color-bg-code-block-h),var(--color-bg-code-block-s),calc(var(--color-bg-code-block-l) + 4%), 0.8); // Slightly lighter header
    border-bottom: 1px solid hsl(var(--color-border-code-block-h), var(--color-border-code-block-s), var(--color-border-code-block-l), calc(var(--color-border-code-block-a) * 0.5));
    font-size: var.$font-size-xs;
  }
  .cmr__code-lang-tag {
    color: hsl(var(--color-text-code-meta-h), var(--color-text-code-meta-s), var(--color-text-code-meta-l));
    text-transform: uppercase;
    font-weight: 500;
    letter-spacing: 0.05em;
  }
  .cmr__copy-code-btn {
    @include mixins.button-ghost(
      $text-color-var-prefix: '--color-text-code-meta',
      $accent-color-var-prefix: '--color-accent-interactive',
      $padding: calc(var.$spacing-xs / 2),
      $border-radius: var.$radius-sm
    );
    // Specific icon size for this button
    .cmr__icon { // Standardized to use .cmr__icon, ensure this matches the icon component class if different
      width: 1rem; height: 1rem;
    }
  }
  pre {
    margin: 0; padding: var.$spacing-sm; overflow-x: auto;
    font-size: calc(0.875em * var(--content-font-scale, 1)); // Slightly larger base code font
    line-height: 1.55;
    @include mixins.custom-scrollbar(
      '--color-accent-secondary', 0.35, 0.55, // Thumb
      '--color-bg-code-block', 0.2, // Track (use code block bg for track base)
      5px, var.$radius-xs // Width, radius
    );
  }
  code.hljs { padding: 0 !important; background: transparent !important; } // Override hljs default styles
  .cmr__line-number {
    display: inline-block;
    width: 2.75em; // More space for line numbers
    padding-right: 1em;
    text-align: right;
    color: hsla(var(--color-text-code-meta-h), var(--color-text-code-meta-s), var(--color-text-code-meta-l), 0.45); // Softer line numbers
    user-select: none;
    border-right: 1px solid hsla(var(--color-border-code-block-h),var(--color-border-code-block-s),var(--color-border-code-block-l),0.2);
    margin-right: 1em;
    font-size: 0.9em; // Slightly smaller line numbers
  }
  .cmr__line-content { white-space: pre; } // Use pre for code lines to maintain all whitespace
}

// Mermaid Diagram Status/Error Styling
.cmr__mermaid-status {
  font-style: italic; text-align: center; padding: var.$spacing-lg;
  &--empty { color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l)); }
  &--loading {
    min-height: 100px; display: flex; align-items: center; justify-content: center;
    color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
    &::before { /* Spinner */
      content: ''; display: block; width: 28px; height: 28px; margin-right: var.$spacing-sm;
      border: 3px solid hsla(var(--color-accent-primary-h),var(--color-accent-primary-s),var(--color-accent-primary-l),0.25);
      border-top-color: hsl(var(--color-accent-primary-h),var(--color-accent-primary-s),var(--color-accent-primary-l));
      border-radius: 50%; animation: cmr-spin 0.75s linear infinite;
    }
  }
  &--error {
    color: hsl(var(--color-error-text-h), var(--color-error-text-s), var(--color-error-text-l));
    background-color: hsla(var(--color-error-h),var(--color-error-s),var(--color-error-l), 0.1);
    border: 1px solid hsla(var(--color-error-h),var(--color-error-s),var(--color-error-l), 0.35);
    border-radius: var.$radius-md;
    .cmr__error-title { font-weight: 600; margin-bottom: var.$spacing-xs; color: hsl(var(--color-error-h),var(--color-error-s),calc(var(--color-error-l) - 5%));}
    .cmr__error-message { font-size: var.$font-size-sm; margin-bottom: var.$spacing-xs; }
    .cmr__error-code-preview {
      margin-top: var.$spacing-sm; padding: var.$spacing-xs var.$spacing-sm;
      background-color: hsla(var(--color-bg-primary-h),var(--color-bg-primary-s),var(--color-bg-primary-l),0.08);
      border-radius: var.$radius-xs; font-size: var.$font-size-xs;
      max-height: 80px; overflow-y: auto; text-align: left;
      white-space: pre-wrap; word-break: break-all;
      @include mixins.custom-scrollbar('--color-error', 0.3, 0.5, '--color-bg-primary', 0.05, 4px);
    }
  }
}

.cmr__status-text { // For "No content to display" etc.
  padding: var.$spacing-lg; text-align: center;
  &--empty {
    color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
    font-style: italic;
    font-size: var.$font-size-base-default;
  }
}

// Slide transitions
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 0.3s var.$ease-out-quad, transform 0.3s var.$ease-out-quad;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

// Specific styling for animated title units (if further needed beyond what useTextAnimation classes provide)
.animated-slide-title-unit {
  display: inline-block; // Or 'inline' if preferred by animation
}

</style>