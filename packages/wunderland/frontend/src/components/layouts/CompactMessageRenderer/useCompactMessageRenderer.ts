// File: frontend/src/components/layouts/CompactMessageRenderer/useCompactMessageRenderer.ts
/**
 * @file useCompactMessageRenderer.ts
 * @description Composable logic for the CompactMessageRenderer component.
 * @version 1.1.1 - Exposed title animation refs, cleaned unused variables.
 */
import { ref, computed, watch, nextTick, onBeforeUnmount, type Ref } from 'vue'; // Use Ref directly
import { marked, type MarkedOptions } from 'marked';
import mermaid from 'mermaid';
import hljs from 'highlight.js';
import { themeManager } from '@/theme/ThemeManager';
import { useTextAnimation, type TextRevealConfig, type TextAnimationUnit } from '@/composables/useTextAnimation';

import {
  type Slide,
  type ContentAnalysisResult,
  type EnhancedMarkedOptions,
  type NonSlideDiagram,
  type CompactMessageRendererComposable,
  DEFAULT_SLIDE_READING_TIME_MS,
  MIN_SLIDE_DURATION_MS,
  WORDS_PER_MINUTE_READING_SPEED,
} from './CompactMessageRendererTypes';

interface RendererProps {
  content: string;
  mode: string;
  language?: string;
  initialSlideIndex?: number;
  disableInternalAutoplay?: boolean;
}

type RendererEmit = {
  (e: 'toggle-fullscreen'): void;
  (e: 'interaction', payload: { type: string; data?: any }): void;
  (e: 'slide-changed', payload: { newIndex: number; totalSlides: number; navigatedManually: boolean }): void;
  (e: 'internal-autoplay-status-changed', payload: { isPlaying: boolean; isPaused: boolean }): void;
  (e: 'rendered'): void;
};

const SVG_ICON_COPY_STRING = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon-xs"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>`;
const SVG_ICON_CHECK_STRING = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="icon-xs text-[var(--color-success-500)]"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`;


export function useCompactMessageRenderer(
  props: Readonly<RendererProps>,
  emit: RendererEmit
): CompactMessageRendererComposable {

  const isLoadingContent = ref<boolean>(false);
  const analyzedContent = ref<ContentAnalysisResult | null>(null);
  const slides = ref<Slide[]>([]);
  const currentSlideIndex = ref<number>(0);
  const nonSlideDiagrams = ref<NonSlideDiagram[]>([]); // Used in logic, not directly in template by parent

  const isAutoplayActive = ref<boolean>(!props.disableInternalAutoplay);
  const isAutoplayEffectivelyPaused = ref<boolean>(true);
  const autoplayProgress = ref<number>(0);
  const currentSlideTargetDurationMs = ref(DEFAULT_SLIDE_READING_TIME_MS);
  const currentSlideTimeElapsedMs = ref(0);
  let internalAutoplayTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let internalProgressIntervalId: ReturnType<typeof setInterval> | null = null;

  const isComponentFullscreen = ref<boolean>(false);
  const currentContentFontScale = ref<number>(1);

  const contentDisplayRootRef = ref<HTMLElement | null>(null);

  const {
    animatedUnits: animatedSlideTitleUnits, // Exposed for template
    animateText: animateSlideTitleText,
    resetAnimation: resetSlideTitleAnimation,
    isAnimating: isSlideTitleAnimating, // Exposed for template
  } = useTextAnimation();

  const currentMermaidTheme = computed<'dark' | 'default'>(() => themeManager.getCurrentTheme().value?.isDark ? 'dark' : 'default');

  const configuredMarkedOptions: EnhancedMarkedOptions = {
    breaks: true, gfm: true, pedantic: false,
    highlight: (code, lang) => {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      try {
        return hljs.highlight(code, { language, ignoreIllegals: true }).value;
      } catch (e) {
        console.warn(`[CMR] Highlight.js error for lang ${lang}:`, e);
        return hljs.highlight(code, { language: 'plaintext', ignoreIllegals: true }).value;
      }
    },
  };
  marked.setOptions(configuredMarkedOptions as MarkedOptions);

  const _mermaidInitialize = () => {
    mermaid.initialize({
      startOnLoad: false, theme: currentMermaidTheme.value, securityLevel: 'loose',
      fontSize: isComponentFullscreen.value ? 15 : 13,
      fontFamily: "var(--font-family-sans, 'Inter', sans-serif)",
      flowchart: { useMaxWidth: !isComponentFullscreen.value, htmlLabels: true },
    });
  };

  const isSlideshowMode = computed<boolean>(() => !!analyzedContent.value?.shouldCreateSlideshow && slides.value.length > 0);
  const currentSlideData = computed<Slide | null>(() => isSlideshowMode.value ? slides.value[currentSlideIndex.value] || null : null);
  const totalSlides = computed<number>(() => slides.value.length);
  const canGoNext = computed<boolean>(() => isSlideshowMode.value && currentSlideIndex.value < totalSlides.value - 1);
  const canGoPrev = computed<boolean>(() => isSlideshowMode.value && currentSlideIndex.value > 0);

  const _calculateReadingTimeMs = (text: string): number => {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return Math.max(MIN_SLIDE_DURATION_MS, Math.ceil((wordCount / WORDS_PER_MINUTE_READING_SPEED) * 60 * 1000));
  };

  const _analyzeProvidedContent = (content: string): ContentAnalysisResult => {
    // ... (implementation remains the same)
     const analysis: ContentAnalysisResult = {
      contentType: 'general', displayTitle: 'Content Analysis',
      estimatedTotalReadingTimeMs: _calculateReadingTimeMs(content),
      shouldCreateSlideshow: false, diagramCount: 0, hasCodeBlocks: false,
    };
    if (props.mode?.toLowerCase().includes('lc_audit')) analysis.contentType = 'leetcode';
    else if (props.mode?.toLowerCase().includes('systemdesign') || props.mode?.toLowerCase().includes('architectron')) analysis.contentType = 'systemDesign';

    const firstHeadingMatch = content.match(/^\s*#{1,3}\s+(.*)/m);
    if (firstHeadingMatch?.[1]) analysis.displayTitle = firstHeadingMatch[1].trim();
    else analysis.displayTitle = props.mode || 'Formatted Content';

    analysis.diagramCount = (content.match(/```mermaid\n([\s\S]*?)\n```/g) || []).length;
    const codeBlockMatches = content.match(/```([a-zA-Z0-9\-_#+.]*)\n([\s\S]*?)```/g) || [];
    analysis.hasCodeBlocks = codeBlockMatches.filter(match => !match.startsWith('```mermaid')).length > 0;


    const slideChunks = content.split(/\n---\s*SLIDE_BREAK\s*---\n/i);
    analysis.shouldCreateSlideshow =
        props.mode === 'lc_audit_aide' || slideChunks.length > 1 ||
        (analysis.contentType === 'leetcode' && (content.length > 700 || analysis.diagramCount > 0)) ||
        (analysis.contentType === 'systemDesign' && (content.length > 600 || analysis.diagramCount > 0)) ||
        (analysis.diagramCount > 1 && content.length > 400);

    if (analysis.contentType === 'leetcode') {
        const diffMatch = content.match(/(?:Difficulty:\s*)?(Easy|Medium|Hard)/i);
        if (diffMatch) analysis.difficulty = diffMatch[1] as 'Easy' | 'Medium' | 'Hard';
        const timeMatch = content.match(/(?:Time Complexity|TC):\s*(O\([^\)]+\w*\))/i);
        if (timeMatch) analysis.complexity = { ...analysis.complexity, time: timeMatch[1] };
        const spaceMatch = content.match(/(?:Space Complexity|SC):\s*(O\([^\)]+\w*\))/i);
        if (spaceMatch) analysis.complexity = { ...analysis.complexity, space: spaceMatch[1] };
    }
    return analysis;
  };

  const _formatCodeForDisplay = (rawCodeBlockMatch: string, langOverride?: string): string => {
    // ... (implementation remains the same)
    const langMatch = rawCodeBlockMatch.match(/^```([a-zA-Z0-9\-_#+.]*)\n/);
    const lang = langOverride || (langMatch && langMatch[1] ? langMatch[1].toLowerCase() : props.language || 'plaintext');
    let code = rawCodeBlockMatch.replace(/^```[a-zA-Z0-9\-_#+.]*\n?/, '').replace(/\n```$/, '');
    code = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); // Basic unescaping

    const highlightedHtml = (configuredMarkedOptions.highlight as Function)(code, lang);
    const lines = highlightedHtml.split('\n');

    const numberedLinesHtml: string = lines.map((line: string, index: number): string =>
      `<span class="cmr__line-number" aria-hidden="true">${index + 1}</span><span class="cmr__line-content">${line || '&nbsp;'}</span>`
    ).join('\n');

    return `
      <div class="cmr__code-block" data-lang="${lang}" data-raw-code="${encodeURIComponent(code)}">
        <div class="cmr__code-header">
          <span class="cmr__code-lang-tag">${lang}</span>
          <button class="cmr__copy-code-btn" title="Copy code" aria-label="Copy code snippet">
            ${SVG_ICON_COPY_STRING}
          </button>
        </div>
        <pre><code class="language-${lang} hljs">${numberedLinesHtml}</code></pre>
      </div>`;
  };

  const _parseContentToSlides = (fullMarkdownContent: string): Slide[] => {
    // ... (implementation remains the same, but ensure 'matchFull' is used or renamed if unused)
    if (!fullMarkdownContent || !fullMarkdownContent.trim()) return [];
    const slideMarkdownChunks = fullMarkdownContent.split(/\n---\s*SLIDE_BREAK\s*---\n/i);

    return slideMarkdownChunks.map((chunk, index) => {
      let title = `Slide ${index + 1}`;
      let slideType: Slide['slideType'] = 'general';
      let mainContentMarkdown = chunk.trim();
      const headingMatch = mainContentMarkdown.match(/^\s*#{1,3}\s+(.*)/m);
      if (headingMatch?.[1]) {
        title = headingMatch[1].trim();
        mainContentMarkdown = mainContentMarkdown.replace(headingMatch[0], '').trim();
      }

      let diagramMermaidCode: string | undefined = undefined;
      const DIAGRAM_PLACEHOLDER = `__MERMAID_DIAGRAM_PLACEHOLDER_${index}__`;
      let tempContentForMarked = mainContentMarkdown.replace(/```mermaid\n([\s\S]*?)\n```/g, (_matchFull, mermaidBody) => { // _matchFull to denote unused
        if (!diagramMermaidCode) diagramMermaidCode = mermaidBody.trim();
        return DIAGRAM_PLACEHOLDER;
      });

      const CODE_BLOCK_PLACEHOLDERS: string[] = [];
      tempContentForMarked = tempContentForMarked.replace(/```([a-zA-Z0-9\-_#+.]*)\n([\s\S]*?)```/g, (matchFullCodeBlock) => {
        const placeholder = `__CODE_BLOCK_PLACEHOLDER_${CODE_BLOCK_PLACEHOLDERS.length}__`;
        CODE_BLOCK_PLACEHOLDERS.push(_formatCodeForDisplay(matchFullCodeBlock));
        return placeholder;
      });

      let htmlContent = marked.parse(tempContentForMarked);
      CODE_BLOCK_PLACEHOLDERS.forEach((codeHtml, i) => {
        htmlContent = htmlContent.replace(`__CODE_BLOCK_PLACEHOLDER_${i}__`, codeHtml);
      });
      if (diagramMermaidCode) {
        htmlContent = htmlContent.replace(DIAGRAM_PLACEHOLDER, `<div class="cmr__slide-diagram-wrapper" data-slide-diagram-id="slide-${index}-diagram"></div>`);
      }

      const estimatedReadingTimeMs = _calculateReadingTimeMs(mainContentMarkdown || title);
      if (index === 0 && slideMarkdownChunks.length > 1) slideType = 'intro';
      else if (diagramMermaidCode) slideType = 'diagram';
      else if (CODE_BLOCK_PLACEHOLDERS.length > 0 && mainContentMarkdown.length < 200) slideType = 'code';
      else if (index === slideMarkdownChunks.length - 1 && slideMarkdownChunks.length > 1 && mainContentMarkdown.length > 100) slideType = 'summary';
      else slideType = 'concept';

      return {
        id: `slide-${index}-${Date.now()}${Math.random().toString(16).slice(2)}`,
        title, rawContent: chunk, htmlContent, diagramMermaidCode, slideType, estimatedReadingTimeMs,
      };
    }).filter(slide => slide.htmlContent.trim() !== '' || !!slide.diagramMermaidCode);
  };

  const _renderSingleMermaidDiagram = async (container: HTMLElement, diagramCode: string, diagramId: string) => {
    // ... (implementation remains the same)
     if (!container || !diagramCode.trim()) {
      container.innerHTML = '<p class="cmr__mermaid-status cmr__mermaid-status--empty">(No diagram content to render)</p>'; return;
    }
    container.innerHTML = '<div class="cmr__mermaid-status cmr__mermaid-status--loading"></div>';
    await nextTick();
    try {
      _mermaidInitialize();
      const uniqueDiagramDomId = `mermaid-graph-${diagramId.replace(/[^a-zA-Z0-9_-]/g, '') || Date.now() + Math.random()}`;
      const { svg, bindFunctions } = await mermaid.render(uniqueDiagramDomId, diagramCode.trim());
      container.innerHTML = svg;
      if (bindFunctions) bindFunctions(container);
    } catch (error: any) {
      console.error(`[CMR] Error rendering Mermaid diagram (ID: ${diagramId}):`, error.str || error.message, error);
      container.innerHTML = `<div class="cmr__mermaid-status cmr__mermaid-status--error"><p class="cmr__error-title">Diagram Rendering Error</p><p class="cmr__error-message">${error.str || error.message}</p><pre class="cmr__error-code-preview">${diagramCode.substring(0,200)}...</pre></div>`;
    }
  };

  const _renderAllDiagramsInElement = async (element: HTMLElement | null) => {
    // ... (implementation remains the same)
     if (!element) return;
    slides.value.forEach(slide => {
        if (slide.diagramMermaidCode && slide.id.startsWith(`slide-${currentSlideIndex.value}-`)) {
            const diagramContainer = element.querySelector(`.cmr__slide-diagram-wrapper[data-slide-diagram-id="slide-${currentSlideIndex.value}-diagram"]`);
            if (diagramContainer) _renderSingleMermaidDiagram(diagramContainer as HTMLElement, slide.diagramMermaidCode, `slide-${currentSlideIndex.value}-active`);
        }
    });
    nonSlideDiagrams.value.forEach(diag => {
      const placeholder = element.querySelector(`.cmr__diagram-placeholder[data-diagram-id="${diag.id}"]`);
      if (placeholder) _renderSingleMermaidDiagram(placeholder as HTMLElement, diag.mermaidCode, diag.id);
    });
  };

  const _addCopyButtonListeners = (containerElement: HTMLElement | null) => {
    // ... (implementation remains the same)
     if (!containerElement) return;
    containerElement.querySelectorAll('.cmr__copy-code-btn').forEach(buttonEl => {
      const button = buttonEl as HTMLElement;
      if (button.dataset.cmrListenerAttached === 'true') return;

      const codeBlockWrapper = button.closest('.cmr__code-block');
      if (!codeBlockWrapper) return;
      const rawCode = decodeURIComponent(codeBlockWrapper.getAttribute('data-raw-code') || '');
      if (!rawCode) return;

      const clickHandler = async (event: Event) => {
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(rawCode);
          button.innerHTML = SVG_ICON_CHECK_STRING;
          emit('interaction', { type: 'toast', data: { type: 'success', title: 'Code Copied!', duration: 2000 } });
          setTimeout(() => { button.innerHTML = SVG_ICON_COPY_STRING; }, 2000);
        } catch (err) {
          console.error('[CMR] Failed to copy code:', err);
          emit('interaction', { type: 'toast', data: { type: 'error', title: 'Copy Failed', message: 'Could not copy code.' } });
        }
      };
      button.addEventListener('click', clickHandler);
      button.dataset.cmrListenerAttached = 'true';
    });
  };

  const _clearInternalAutoplayTimers = () => {
    // ... (implementation remains the same)
    if (internalAutoplayTimeoutId) clearTimeout(internalAutoplayTimeoutId);
    if (internalProgressIntervalId) clearInterval(internalProgressIntervalId);
    internalAutoplayTimeoutId = null; internalProgressIntervalId = null;
    autoplayProgress.value = 0; currentSlideTimeElapsedMs.value = 0;
  };

  const _startOrResumeAutoplayLogic = (isNewSlideshowSetup: boolean = false) => {
    // ... (implementation remains the same)
    if (props.disableInternalAutoplay || !isAutoplayActive.value) {
      isAutoplayEffectivelyPaused.value = true;
      emit('internal-autoplay-status-changed', {isPlaying: false, isPaused: true }); return;
    }
    if (slides.value.length === 0 || (currentSlideIndex.value >= slides.value.length - 1 && !isNewSlideshowSetup)) {
      isAutoplayEffectivelyPaused.value = true; _clearInternalAutoplayTimers();
      isAutoplayActive.value = false;
      emit('internal-autoplay-status-changed', {isPlaying: false, isPaused: true }); return;
    }

    isAutoplayEffectivelyPaused.value = false;
    emit('internal-autoplay-status-changed', {isPlaying: true, isPaused: false });

    const slideData = slides.value[currentSlideIndex.value];
    currentSlideTargetDurationMs.value = Math.max(MIN_SLIDE_DURATION_MS, slideData?.estimatedReadingTimeMs || DEFAULT_SLIDE_READING_TIME_MS);
    if(isNewSlideshowSetup) currentSlideTimeElapsedMs.value = 0;
    autoplayProgress.value = Math.min(100, (currentSlideTimeElapsedMs.value / currentSlideTargetDurationMs.value) * 100);
    _clearInternalAutoplayTimers();

    const timeRemainingMs = currentSlideTargetDurationMs.value - currentSlideTimeElapsedMs.value;
    if (timeRemainingMs > 0) {
      internalAutoplayTimeoutId = setTimeout(() => {
        if (isAutoplayActive.value && !isAutoplayEffectivelyPaused.value) {
            navigateToSlide(currentSlideIndex.value + 1, 'autoplay');
        }
      }, timeRemainingMs);

      internalProgressIntervalId = setInterval(() => {
        if (!isAutoplayActive.value || isAutoplayEffectivelyPaused.value) {
            _clearInternalAutoplayTimers();
            return;
        }
        currentSlideTimeElapsedMs.value += 100;
        autoplayProgress.value = Math.min(100, (currentSlideTimeElapsedMs.value / currentSlideTargetDurationMs.value) * 100);
        if (currentSlideTimeElapsedMs.value >= currentSlideTargetDurationMs.value) {
          if(internalProgressIntervalId) clearInterval(internalProgressIntervalId);
        }
      }, 100);
    } else if (currentSlideIndex.value < slides.value.length - 1) {
        navigateToSlide(currentSlideIndex.value + 1, 'autoplay');
    } else {
        isAutoplayEffectivelyPaused.value = true;
        isAutoplayActive.value = false;
        emit('internal-autoplay-status-changed', {isPlaying: false, isPaused: true });
    }
  };

  const _animateCurrentSlideTitle = async () => {
    resetSlideTitleAnimation();
    const titleToAnimate = currentSlideData.value?.title;
    if (titleToAnimate && isSlideshowMode.value) {
      await nextTick();
      const animationConfig: Partial<TextRevealConfig> = {
        mode: 'word', durationPerUnit: 60, staggerDelay: 35, animationStyle: 'organic',
      };
      // Ensure titleToAnimate is not undefined before passing
      if (typeof titleToAnimate === 'string') {
        animateSlideTitleText(titleToAnimate, animationConfig);
      }
    }
  };

  const processAndRenderContent = async (fullMarkdownContent: string, initialSlideIdxOverride?: number) => {
    // ... (implementation remains the same)
    isLoadingContent.value = true; _clearInternalAutoplayTimers(); isAutoplayEffectivelyPaused.value = true;
    resetSlideTitleAnimation();

    if (!fullMarkdownContent || !fullMarkdownContent.trim()) {
      slides.value = []; nonSlideDiagrams.value = []; analyzedContent.value = null; currentSlideIndex.value = 0;
      isLoadingContent.value = false; emit('rendered'); return;
    }

    analyzedContent.value = _analyzeProvidedContent(fullMarkdownContent);

    if (analyzedContent.value.shouldCreateSlideshow) {
      slides.value = _parseContentToSlides(fullMarkdownContent);
      nonSlideDiagrams.value = [];
      const initialIdx = initialSlideIdxOverride ?? (typeof props.initialSlideIndex === 'number' && props.initialSlideIndex < slides.value.length ? props.initialSlideIndex : 0);
      currentSlideIndex.value = slides.value.length > 0 ? Math.max(0, Math.min(initialIdx, slides.value.length - 1)) : 0;

      if (slides.value.length === 0 && analyzedContent.value) {
          console.warn("[CMR] ShouldCreateSlideshow was true, but no slides were parsed. Falling back to single view.");
          analyzedContent.value.shouldCreateSlideshow = false;
          await processAndRenderContent(fullMarkdownContent);
          return;
      }
    } else {
      slides.value = [];
      let tempContent = fullMarkdownContent;
      const diagramMatches = [...tempContent.matchAll(/```mermaid\n([\s\S]*?)\n```/g)];
      nonSlideDiagrams.value = diagramMatches.map((match, i) => ({ id: `nsd-${Date.now()}-${i}`, mermaidCode: match[1].trim() }));
      let placeholderIndex = 0;
      tempContent = tempContent.replace(/```mermaid\n([\s\S]*?)\n```/g, () => {
        const diagramId = nonSlideDiagrams.value[placeholderIndex]?.id || `nsd-fallback-${placeholderIndex}`;
        placeholderIndex++; return `<div class="cmr__diagram-placeholder" data-diagram-id="${diagramId}"></div>`;
      });
      tempContent = tempContent.replace(/```([a-zA-Z0-9\-_#+.]*)\n([\s\S]*?)```/g, (match) => _formatCodeForDisplay(match));
      slides.value = [{ // Create a single "slide" for non-slideshow content for template consistency
        id: 'single-content-view', title: analyzedContent.value?.displayTitle || '',
        rawContent: fullMarkdownContent, htmlContent: marked.parse(tempContent),
        slideType: 'general', estimatedReadingTimeMs: analyzedContent.value?.estimatedTotalReadingTimeMs || 0
      }];
      currentSlideIndex.value = 0;
    }

    await nextTick();
    if (contentDisplayRootRef.value) {
        _addCopyButtonListeners(contentDisplayRootRef.value);
        await _renderAllDiagramsInElement(contentDisplayRootRef.value);
    }
    isLoadingContent.value = false;
    emit('rendered');

    if (isSlideshowMode.value && slides.value.length > 0) {
      emit('slide-changed', { newIndex: currentSlideIndex.value, totalSlides: totalSlides.value, navigatedManually: false });
      _animateCurrentSlideTitle();
      if (isAutoplayActive.value && !props.disableInternalAutoplay) {
        _startOrResumeAutoplayLogic(true);
      }
    }
  };

  const navigateToSlide = (index: number, source: 'user' | 'autoplay' | 'init' = 'user') => {
    if (!isSlideshowMode.value || index < 0 || index >= totalSlides.value || (currentSlideIndex.value === index && source !== 'init')) return;
    
    // Removed unused 'oldIndex'
    currentSlideIndex.value = index;

    if (source === 'user') {
      isAutoplayActive.value = false; isAutoplayEffectivelyPaused.value = true; _clearInternalAutoplayTimers();
      emit('internal-autoplay-status-changed', {isPlaying: false, isPaused: true });
    }
    emit('slide-changed', { newIndex: index, totalSlides: totalSlides.value, navigatedManually: source === 'user' });

    _animateCurrentSlideTitle();

    if (isAutoplayActive.value && !props.disableInternalAutoplay && !isAutoplayEffectivelyPaused.value) {
      _clearInternalAutoplayTimers(); currentSlideTimeElapsedMs.value = 0; autoplayProgress.value = 0;
      _startOrResumeAutoplayLogic(false);
    }

    nextTick(async () => {
      if (contentDisplayRootRef.value) {
        _addCopyButtonListeners(contentDisplayRootRef.value);
        const currentSlide = slides.value[index];
        if (currentSlide?.diagramMermaidCode) {
          const diagramContainer = contentDisplayRootRef.value.querySelector(`.cmr__slide-diagram-wrapper[data-slide-diagram-id="slide-${index}-diagram"]`);
          if (diagramContainer) { // Check if diagramContainer is found
            await _renderSingleMermaidDiagram(diagramContainer as HTMLElement, currentSlide.diagramMermaidCode, `slide-${currentSlide.id}-active`);
          }
        }
      }
    });
  };

  const nextSlide = () => { if (canGoNext.value) navigateToSlide(currentSlideIndex.value + 1, 'user'); };
  const prevSlide = () => { if (canGoPrev.value) navigateToSlide(currentSlideIndex.value - 1, 'user'); };

  const toggleInternalAutoplay = () => {
    // ... (implementation remains the same)
    if (props.disableInternalAutoplay) return;
    isAutoplayActive.value = !isAutoplayActive.value;
    if (isAutoplayActive.value) {
      isAutoplayEffectivelyPaused.value = false; _startOrResumeAutoplayLogic(false);
    } else {
      isAutoplayEffectivelyPaused.value = true; _clearInternalAutoplayTimers();
      emit('internal-autoplay-status-changed', {isPlaying: false, isPaused: true });
    }
  };
  const pauseInternalAutoplay = () => {
    // ... (implementation remains the same)
    if (props.disableInternalAutoplay || !isAutoplayActive.value) return;
    isAutoplayEffectivelyPaused.value = true; _clearInternalAutoplayTimers();
    emit('internal-autoplay-status-changed', {isPlaying: isAutoplayActive.value, isPaused: true });
  };
  const resumeInternalAutoplay = () => {
    // ... (implementation remains the same)
    if (props.disableInternalAutoplay || !isAutoplayActive.value) return;
    isAutoplayEffectivelyPaused.value = false;
    _startOrResumeAutoplayLogic(false);
  };

  const reRenderMermaidDiagramsScoped = async () => {
    // ... (implementation remains the same)
    await nextTick();
    _mermaidInitialize();
    await _renderAllDiagramsInElement(contentDisplayRootRef.value);
  };

  const toggleComponentFullscreen = () => {
    // ... (implementation remains the same)
    isComponentFullscreen.value = !isComponentFullscreen.value;
    emit('toggle-fullscreen');
    nextTick(() => reRenderMermaidDiagramsScoped());
  };

  const adjustFontSize = (delta: number) => {
    // ... (implementation remains the same)
    const newScale = Math.max(0.5, Math.min(2.5, currentContentFontScale.value + (delta * 0.1)));
    currentContentFontScale.value = newScale;
    emit('interaction', {type: 'fontSizeAdjusted', data: { newScale }});
    nextTick(() => reRenderMermaidDiagramsScoped());
  };

  const copyAllCodeBlocks = async (rootElement: HTMLElement | null) => {
    // ... (implementation remains the same)
    if (!rootElement) { emit('interaction', { type: 'toast', data: { type: 'error', title: 'Copy Error', message: 'Content area not found.' } }); return; }
    const codeElements = rootElement.querySelectorAll<HTMLElement>('.cmr__code-block[data-raw-code]');
    if (codeElements.length === 0) { emit('interaction', { type: 'toast', data: { type: 'info', title: 'No Code', message: 'No code blocks to copy.' } }); return; }
    let allCode = '';
    codeElements.forEach(el => {
      const rawCode = decodeURIComponent(el.dataset.rawCode || '');
      const lang = el.dataset.lang || 'code';
      allCode += `// ----- ${lang} -----\n${rawCode}\n// ----- END ${lang} -----\n\n`;
    });
    try {
      await navigator.clipboard.writeText(allCode.trim());
      emit('interaction', { type: 'toast', data: { type: 'success', title: 'All Code Copied!', duration: 2500 } });
    } catch (err) { console.error('[CMR] Failed to copy all code:', err); emit('interaction', { type: 'toast', data: { type: 'error', title: 'Copy Failed' } }); }
  };

  const exportDiagrams = (): { id: string, code?: string }[] => {
    // ... (implementation remains the same)
    const diagramsToExport: { id: string, code?: string }[] = [];
    if (isSlideshowMode.value) {
        slides.value.forEach(slide => { if (slide.diagramMermaidCode) diagramsToExport.push({ id: slide.id, code: slide.diagramMermaidCode }); });
    } else {
        nonSlideDiagrams.value.forEach(diag => diagramsToExport.push({ id: diag.id, code: diag.mermaidCode }));
    }
    if (diagramsToExport.length === 0) emit('interaction', { type: 'toast', data: { type: 'info', title: 'No Diagrams', message:'No diagrams found to export.' } });
    else emit('interaction', { type: 'exportRequested', data: { type: 'diagrams', items: diagramsToExport } });
    return diagramsToExport;
  };

  const exportSlidesContent = (): { title: string, rawContent: string, diagram?: string }[] => {
    // ... (implementation remains the same)
    if (!isSlideshowMode.value || slides.value.length === 0) { emit('interaction', { type: 'toast', data: { type: 'info', title: 'No Slides', message: 'No slides to export.' } }); return []; }
    const slideData = slides.value.map(s => ({ title: s.title, rawContent: s.rawContent, diagram: s.diagramMermaidCode }));
    emit('interaction', { type: 'exportRequested', data: { type: 'slides', items: slideData } });
    return slideData;
  };
  
  watch(() => props.content, (newContent = '') => {
      processAndRenderContent(newContent, props.initialSlideIndex);
  }, { immediate: true });

  watch(() => props.initialSlideIndex, (newInitialIndex) => {
    if (isSlideshowMode.value && typeof newInitialIndex === 'number' && newInitialIndex >= 0 && newInitialIndex < totalSlides.value) {
        navigateToSlide(newInitialIndex, 'init');
    }
  });

  watch(currentMermaidTheme, () => reRenderMermaidDiagramsScoped());
  watch(isComponentFullscreen, () => {
    nextTick(() => reRenderMermaidDiagramsScoped());
  });

  onBeforeUnmount(() => { _clearInternalAutoplayTimers(); });

  return {
    isLoadingContent, analyzedContent, slides, currentSlideIndex, isSlideshowMode,
    isAutoplayActive, isAutoplayEffectivelyPaused, autoplayProgress,
    isComponentFullscreen, currentContentFontScale, nonSlideDiagrams, contentDisplayRootRef,
    currentSlideData, totalSlides, /* overallProgressPercent removed */ canGoNext, canGoPrev,
    currentMermaidTheme,
    currentSlideTargetDurationMs, currentSlideTimeElapsedMs,

    // Exposed for title animation
    animatedSlideTitleUnits,
    isSlideTitleAnimating,

    processAndRenderContent, navigateToSlide, nextSlide, prevSlide,
    toggleInternalAutoplay, pauseInternalAutoplay, resumeInternalAutoplay,
    toggleComponentFullscreen, adjustFontSize, copyAllCodeBlocks,
    exportDiagrams, exportSlidesContent,
    reRenderMermaidDiagrams: reRenderMermaidDiagramsScoped,
  };
}