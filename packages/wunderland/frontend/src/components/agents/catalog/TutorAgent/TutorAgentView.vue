<template>
  <div class="tutor-agent-view professor-astra-view">
    <div class="professor-astra-header">
      <div class="header-title-group">
        <AcademicCapIcon class="header-icon" :class="props.agentConfig.iconClass" />
        <span class="header-title">{{ agentDisplayName }}</span>
      </div>
      <div class="relative" ref="internalLevelSelectorRef">
        <button @click="showLevelSelector = !showLevelSelector"
                class="btn-futuristic-toggle level-selector-button" aria-haspopup="true" :aria-expanded="showLevelSelector" aria-controls="level-dropdown-menu">
          Level: <span class="font-medium">{{ currentTutorLevel }}</span>
          <ChevronDownIcon class="w-4 h-4 transition-transform icon-chevron" :class="{'rotate-180': showLevelSelector}" />
        </button>
        <transition name="dropdown-fade-futuristic">
          <div v-if="showLevelSelector" id="level-dropdown-menu"
               class="dropdown-menu-futuristic tutor-level-dropdown">
            <div class="p-1.5" role="menu">
              <button
                v-for="level in tutorLevels"
                :key="level.id"
                @click="setTutorLevel(level.id)"
                class="dropdown-item-futuristic group"
                :class="{ 'active': currentTutorLevel === level.id }"
                role="menuitemradio" :aria-checked="currentTutorLevel === level.id"
              >
                <div class="text-left">
                  <span class="item-label">{{ level.label }}</span>
                  <p class="item-description">{{ level.description }}</p>
                </div>
              </button>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <div class="tutor-main-content-area" :id="mainContentDisplayAreaId">
      <div v-if="isLoadingResponse && !chatStore.isMainContentStreaming && !(mainContentToDisplay && mainContentToDisplay.data)" class="loading-overlay-futuristic">
        <div class="spinner-futuristic large"></div>
        <p class="loading-text-futuristic">Professor Astra is preparing your lesson...</p>
      </div>
      <div v-else-if="!mainContentToDisplay?.data && !isLoadingResponse && !activeQuizItem && !activeFlashcard" class="tutor-empty-state">
        <SparklesIcon class="empty-state-icon"/>
        <p class="empty-state-text">{{ props.agentConfig.inputPlaceholder || `What would you like to learn about with ${agentDisplayName}?` }}</p>
      </div>
    </div>

    <div v-if="!isLoadingResponse && (activeQuizItem || activeFlashcard)" class="tool-interaction-footer">
      <div v-if="activeQuizItem" class="tool-display-area quiz-item-display-v1">
        <h3 class="tool-title">Quiz Time: {{ activeQuizItem.topic }}</h3>
        <p class="quiz-question">{{ activeQuizItem.question }}</p>

        <div v-if="activeQuizItem.questionType === 'multiple-choice' || !activeQuizItem.questionType" class="quiz-options">
          <label v-for="(option, index) in activeQuizItem.options" :key="index"
                 class="quiz-option-label"
                 :class="{
                   'selected': selectedQuizOption === index,
                   'answered': activeQuizItem.isAnswered
                 }">
            <input type="radio" :name="'quiz_option_' + activeQuizItem.tool_call_id" :value="index"
                   v-model="selectedQuizOption" :disabled="activeQuizItem.isAnswered" class="sr-only">
            {{ option.text }}
          </label>
        </div>
        <div v-else-if="activeQuizItem.questionType === 'short-answer'" class="my-2">
          <textarea v-model="quizShortAnswer" rows="2"
                    :disabled="activeQuizItem.isAnswered"
                    placeholder="Your answer..."
                    class="form-input-futuristic w-full text-sm"></textarea>
        </div>

        <div v-if="activeQuizItem.explanation && activeQuizItem.isAnswered" class="quiz-explanation">
          <h4 class="font-semibold text-xs mb-0.5">Explanation:</h4>
          <p>{{ activeQuizItem.explanation }}</p>
        </div>
        <div v-if="activeQuizItem.feedbackGiven" class="quiz-feedback"
             :class="{
               'feedback-correct': activeQuizItem.isCorrect,
               'feedback-incorrect': !activeQuizItem.isCorrect && activeQuizItem.isCorrect !== undefined
             }">
            <CheckCircleIcon v-if="activeQuizItem.isCorrect" class="feedback-icon"/>
            <XCircleIcon v-else-if="activeQuizItem.isCorrect === false" class="feedback-icon"/>
          {{ activeQuizItem.feedbackGiven }}
        </div>

        <button v-if="!activeQuizItem.isAnswered" @click="handleQuizSubmit"
                class="btn-futuristic-primary btn-sm w-full mt-2">
          Submit Answer
        </button>
        <button v-else @click="activeQuizItem = null"
                class="btn-futuristic-secondary btn-sm w-full mt-2">
          Close Quiz
        </button>
      </div>

      <div v-if="activeFlashcard" class="tool-display-area flashcard-item-display-v1">
        <h3 class="tool-title">Flashcard: {{ activeFlashcard.topic }}</h3>
        <div class="flashcard-content"
             @click="handleFlashcardFlip"
             :aria-live="activeFlashcard.isFlipped ? 'polite' : 'off'"
             :title="activeFlashcard.isFlipped ? 'Click to see front' : 'Click to see back'"
             tabindex="0" role="button">
          <p v-if="!activeFlashcard.isFlipped">{{ activeFlashcard.frontContent }}</p>
          <p v-else>{{ activeFlashcard.backContent }}</p>
        </div>
        <button @click="handleFlashcardAcknowledge" class="btn-futuristic-primary btn-sm w-full mt-2">
          Got it!
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Script content remains the same as the version you provided in the previous turn.
// For brevity, I'm not repeating it here. Ensure it's the corrected one.
import { inject, onMounted, onUnmounted, type PropType, toRef, watch, nextTick, ref as vueRef } from 'vue';
import { useChatStore } from '@/store/chat.store';
import { useAgentStore } from '@/store/agent.store';
import type { IAgentDefinition, AgentId } from '@/services/agent.service';
import type { ToastService } from '@/services/services';
import { AcademicCapIcon, ChevronDownIcon, SparklesIcon, CheckCircleIcon, XCircleIcon, LightBulbIcon } from '@heroicons/vue/24/solid';
import { useTutorAgent } from './useTutorAgent';
import type { TutorLevel, QuizItemContent, FlashcardContent } from './TutorAgentTypes';
import { generateId } from '@/utils/ids';

declare var mermaid: any;

const props = defineProps({
  agentId: { type: String as PropType<AgentId>, required: true },
  agentConfig: { type: Object as PropType<IAgentDefinition>, required: true }
});

const emit = defineEmits<{
  (e: 'agent-event', event: { type: 'view_mounted' | string; agentId: string; label?: string }): void;
}>();

const toast = inject<ToastService>('toast');
const chatStore = useChatStore();
const agentStore = useAgentStore();
const agentConfigAsRef = toRef(props, 'agentConfig');

const {
  isLoadingResponse,
  currentTutorLevel,
  showLevelSelector,
  levelSelectorRef,
  agentDisplayName,
  mainContentDisplayAreaId,
  mainContentToDisplay,
  activeQuizItem,
  activeFlashcard,
  initialize,
  cleanup,
  setTutorLevel,
  handleNewUserInput,
  renderMarkdownForTutorView,
  addAllCopyButtonListenersToCodeBlocks,
  handleClickOutsideLevelSelector,
  submitQuizAnswer,
  acknowledgeFlashcard,
} = useTutorAgent(agentConfigAsRef, toast);

const tutorLevels: { id: TutorLevel; label: string; description: string }[] = [
  { id: 'beginner', label: 'Beginner', description: 'Foundational concepts, simple language.' },
  { id: 'intermediate', label: 'Intermediate', description: 'Detailed explanations, assumes some knowledge.' },
  { id: 'expert', label: 'Expert', description: 'Advanced topics, concise & technical.' },
];

const internalLevelSelectorRef = vueRef<HTMLElement | null>(null);
watch(internalLevelSelectorRef, (newEl) => {
  if (newEl && levelSelectorRef) {
    levelSelectorRef.value = newEl;
  }
});

watch(mainContentToDisplay, async (newContentObj, _oldContentObj, onCleanup) => {
    let observer: MutationObserver | null = null;
    const processContent = async () => {
        const markdownData = newContentObj?.data && typeof newContentObj.data === 'string'
          ? newContentObj.data
          : '';

        const isStreaming = chatStore.isMainContentStreaming && agentStore.activeAgentId === props.agentId;
        const contentToRender = isStreaming ? chatStore.streamingMainContentText + '▋' : markdownData;
        const renderedHtml = renderMarkdownForTutorView(contentToRender, activeQuizItem.value, activeFlashcard.value);

        const mainDisplayElement = document.getElementById(mainContentDisplayAreaId.value);
        if (mainDisplayElement) {
            if (mainDisplayElement.innerHTML !== renderedHtml) {
                mainDisplayElement.innerHTML = renderedHtml;
            }
            addAllCopyButtonListenersToCodeBlocks(mainDisplayElement);

            if (typeof mermaid !== 'undefined' && (markdownData.includes('class="mermaid"') || activeQuizItem.value || activeFlashcard.value) ) {
                const mermaidElements = mainDisplayElement.querySelectorAll('div.mermaid');
                const nodesToRun: Element[] = [];
                mermaidElements.forEach(el => {
                    if (!(el as HTMLElement).dataset.mermaidProcessed) {
                        nodesToRun.push(el);
                        if(!el.id) el.id = `mermaid-runtime-${generateId().substring(0,8)}`;
                        (el as HTMLElement).dataset.mermaidProcessed = 'true';
                    }
                });
                if (nodesToRun.length > 0) {
                    try { await mermaid.run({ nodes: nodesToRun }); }
                    catch (e) {
                        console.error("Mermaid run error in watcher:", e);
                        nodesToRun.forEach(node => { node.innerHTML = `<p class="text-error-default">Error rendering diagram</p>`; });
                    }
                }
            }
        }
    };

    await processContent();

    const mainDisplayElementForObserver = document.getElementById(mainContentDisplayAreaId.value);
    if (mainDisplayElementForObserver) {
        observer = new MutationObserver(async () => {
            await processContent();
        });
        observer.observe(mainDisplayElementForObserver, { childList: true, subtree: true, characterData: true, attributes: true });
    }
    onCleanup(() => { if (observer) observer.disconnect(); });
}, { deep: true, immediate: true, flush: 'post' });


onMounted(async () => {
  await initialize(props.agentConfig);
  document.addEventListener('click', handleClickOutsideLevelSelector, true);
  emit('agent-event', { type: 'view_mounted', agentId: props.agentId, label: agentDisplayName.value });

  if (!mainContentToDisplay.value?.data || mainContentToDisplay.value.title === `${props.agentConfig.label} Ready`) {
    const placeholder = props.agentConfig.inputPlaceholder || `What topic shall we explore today?`;
    const welcomeHTML = `
<div class="professor-astra-welcome-container">
  <div class="astra-icon-wrapper"><AcademicCapIcon class="professor-astra-main-icon" /></div>
  <h2 class="professor-astra-welcome-title">Greetings! I am ${agentDisplayName.value}.</h2>
  <p class="professor-astra-welcome-subtitle">Teaching at the <strong>${currentTutorLevel.value}</strong> level. ${props.agentConfig.description || 'Ready to guide your learning exploration!'}</p>
  <p class="professor-astra-welcome-prompt">${placeholder}</p>
</div>`;
    chatStore.updateMainContent({
      agentId: props.agentId, type: 'markdown', data: welcomeHTML,
      title: `${agentDisplayName.value} Ready`, timestamp: Date.now(),
    });
    chatStore.setMainContentStreaming(false);
  } else {
      await nextTick();
      const currentMainContent = mainContentToDisplay.value;
      if (currentMainContent && currentMainContent.data) {
          const mainDisplayElement = document.getElementById(mainContentDisplayAreaId.value);
          if(mainDisplayElement){
            mainDisplayElement.innerHTML = renderMarkdownForTutorView(currentMainContent.data as string, activeQuizItem.value, activeFlashcard.value);
            addAllCopyButtonListenersToCodeBlocks(mainDisplayElement);
              if (typeof mermaid !== 'undefined' && (currentMainContent.data as string).includes('class="mermaid"')) {
                const unprocessedMermaidNodes = mainDisplayElement.querySelectorAll('.mermaid:not([data-mermaid-processed="true"])');
                if (unprocessedMermaidNodes.length > 0) {
                    await mermaid.run({nodes: unprocessedMermaidNodes});
                    unprocessedMermaidNodes.forEach(el => (el as HTMLElement).dataset.mermaidProcessed = 'true');
                }
              }
          }
      }
  }
});

onUnmounted(() => {
  cleanup();
  document.removeEventListener('click', handleClickOutsideLevelSelector, true);
});

const selectedQuizOption = vueRef<number | null>(null);
const quizShortAnswer = vueRef<string>('');

const handleQuizSubmit = async () => {
  if (activeQuizItem.value) {
    let answerToSubmit: string | number;
    if (activeQuizItem.value.questionType === 'short-answer') {
      answerToSubmit = quizShortAnswer.value;
    } else if (selectedQuizOption.value !== null) {
      answerToSubmit = selectedQuizOption.value;
    } else {
      toast?.add({ type: 'warning', title: 'No Answer', message: 'Please select an option or enter an answer.' });
      return;
    }
    await submitQuizAnswer(answerToSubmit);
    selectedQuizOption.value = null;
    quizShortAnswer.value = '';
  }
};

const handleFlashcardAcknowledge = async () => {
  if (activeFlashcard.value) {
    await acknowledgeFlashcard();
  }
};

const handleFlashcardFlip = () => {
  if (activeFlashcard.value) {
    activeFlashcard.value.isFlipped = !activeFlashcard.value.isFlipped;
  }
};

defineExpose({ handleNewUserInput });
</script>

<style lang="scss" scoped>
// CORRECTED: Changed @import to @use and aliased appropriately.
// This ensures that `var` and `mixins` namespaces are correctly available.
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.tutor-agent-view { // Main container
  --tutor-accent-h: var(--color-accent-primary-h, #{var.$default-color-accent-primary-h});
  --tutor-accent-s: var(--color-accent-primary-s, #{var.$default-color-accent-primary-s});
  --tutor-accent-l: calc(var(--color-accent-primary-l, #{var.$default-color-accent-primary-l}) + 5%);
  --tutor-bg-h: var(--color-bg-primary-h, #{var.$default-color-bg-primary-h});
  --tutor-bg-s: var(--color-bg-primary-s, #{var.$default-color-bg-primary-s});
  --tutor-bg-l: var(--color-bg-primary-l, #{var.$default-color-bg-primary-l});

  color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  @apply flex flex-col h-full w-full overflow-hidden;
  background-color: hsl(var(--tutor-bg-h), var(--tutor-bg-s), var(--tutor-bg-l));
  background-image:
    linear-gradient(hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.03) 1px, transparent 1px),
    linear-gradient(90deg, hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.03) 1px, transparent 1px),
    radial-gradient(ellipse at 10% 10%, hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.05) 0%, transparent 40%),
    radial-gradient(ellipse at 90% 90%, hsla(var(--tutor-accent-h), var(--tutor-accent-s), calc(var(--tutor-accent-l) - 10%), 0.04) 0%, transparent 50%);
  background-size: 30px 30px, 30px 30px, cover, cover;
}

.professor-astra-header {
  @apply p-3 px-4 border-b flex items-center justify-between gap-3 text-sm shadow-lg backdrop-blur-sm shrink-0 z-10;
  background-color: hsla(var(--tutor-bg-h), var(--tutor-bg-s), calc(var(--tutor-bg-l) + 4%), 0.85);
  border-bottom-color: hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.2);

  .header-title-group { @apply flex items-center gap-2.5; }
  .header-icon {
    @apply w-7 h-7 shrink-0;
    color: hsl(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l));
    filter: drop-shadow(0 0 8px hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.6));
  }
  .header-title {
    @apply font-semibold tracking-wide text-lg; // Using Tailwind's text-lg
    color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  }
}

.level-selector-button {
  // This button already has `btn-futuristic-toggle` class in the template.
  // Styles here should be overrides or specific additions for this context.
  @apply py-1.5 px-3 text-sm flex items-center gap-1.5;
  // Example: Ensure it uses tutor-specific accent if `btn-futuristic-toggle` doesn't already do so.
  border-color: hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.4);
  color: hsl(var(--tutor-accent-h), var(--tutor-accent-s), calc(var(--tutor-accent-l) + 10%)); // Brighter text

  &:hover {
    background-color: hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.1);
    border-color: hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.6);
  }
  .icon-chevron { @apply w-4 h-4 transition-transform duration-200; }
}

.tutor-level-dropdown.dropdown-menu-futuristic {
  @apply w-72;
  // Assuming .dropdown-menu-futuristic provides base structure (positioning, z-index etc.)
  // Apply tutor-specific theme for background and border
  background-color: hsla(var(--color-bg-tertiary-h, var.$default-color-bg-tertiary-h), var(--color-bg-tertiary-s, var.$default-color-bg-tertiary-s), calc(var(--color-bg-tertiary-l, #{var.$default-color-bg-tertiary-l})), 0.98); // Slightly less adjustment to L
  border: 1px solid hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.4);
  box-shadow: var.$shadow-depth-lg; // Use SASS variable for shadow

  .dropdown-item-futuristic {
    // Assuming .dropdown-item-futuristic provides base item styles
    .item-label { color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l)); }
    .item-description {
      color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
      @apply text-xxs normal-case font-normal; // Use defined .text-xxs
    }
    &.active {
      background-color: hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.2); // More prominent active state
      .item-label { color: hsl(var(--tutor-accent-h), var(--tutor-accent-s), calc(var(--tutor-accent-l) + 15%)); }
    }
  }
}

.tutor-main-content-area {
  @apply flex-grow relative min-h-0 overflow-y-auto;
  // CORRECTED: Call mixin with SASS module syntax
  @include mixins.custom-scrollbar(
    $thumb-color-var-prefix: '--tutor-accent',
    $thumb-base-alpha: 0.5, // Slightly more visible
    $thumb-hover-alpha: 0.7,
    $track-color-var-prefix: '--tutor-bg',
    $track-alpha: 0.2, // Slightly less visible track for contrast
    $width: 7px, // Slightly thinner
    $border-radius: var.$radius-sm, // Use SASS variable with correct namespace
    $fb-thumb-h: var.$default-color-accent-primary-h,
    $fb-thumb-s: var.$default-color-accent-primary-s,
    $fb-thumb-l: var.$default-color-accent-primary-l,
    $fb-track-h: var.$default-color-bg-primary-h,
    $fb-track-s: var.$default-color-bg-primary-s,
    $fb-track-l: var.$default-color-bg-primary-l
  );

  // Base styles for content rendered via innerHTML
  // These :deep selectors target classes that your renderMarkdownForTutorView function should add.
  :deep(.prose-futuristic.tutor-prose-content) { // Ensure this class is applied by renderMarkdownForTutorView
    @apply p-4 md:p-6 h-full;
    font-size: var(--font-size-base, #{var.$font-size-base-default});
    line-height: var(--line-height-base, #{var.$line-height-base-default});

    h1, h2, h3 {
      color: hsl(var(--tutor-accent-h), var(--tutor-accent-s), calc(var(--tutor-accent-l) + 10%));
      @apply mt-5 mb-2.5 font-semibold; // Adjusted margins
    }
    h1 { @apply text-2xl; } h2 { @apply text-xl; } h3 { @apply text-lg; }

    p, li {
      color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
      @apply mb-3 leading-relaxed;
    }
    li > p { @apply mb-1; }
    a {
      color: hsl(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l));
      @apply hover:underline;
    }
    strong { color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l)); }
    blockquote {
      @apply border-l-4 pl-4 italic my-3 text-sm;
      border-color: hsl(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l));
      color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
      background-color: hsla(var(--tutor-bg-h), var(--tutor-bg-s), calc(var(--tutor-bg-l) + 2%), 0.5);
    }
    // Ensure .enhanced-code-block-ephemeral and its children are styled according to theme
    .enhanced-code-block-ephemeral {
      // Styles for code blocks, ensure they use tutor theme variables if needed
    }
    div.mermaid {
      // Styles for mermaid diagrams, ensure they use tutor theme variables
    }
  }
}

.loading-overlay-futuristic { /* Copied from previous, seems okay */ }
.spinner-futuristic.large { /* Copied from previous, ensure definition exists */ }
.loading-text-futuristic { /* Copied from previous, seems okay */ }
.tutor-empty-state { /* Copied from previous, seems okay */ }
.professor-astra-welcome-container { /* Copied from previous, seems okay */ }

// Tool Interaction Area Styles (Quiz, Flashcard) - Revamped
.tool-interaction-footer {
  @apply p-3 border-t shrink-0 backdrop-blur-sm;
  background-color: hsla(var(--tutor-bg-h), var(--tutor-bg-s), calc(var(--tutor-bg-l) + 2%), 0.95);
  border-top-color: hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.2);
}

.tool-display-area {
  @apply p-3 mb-2 rounded-lg shadow-md; // mb-2 if multiple tools can appear
  background-color: hsla(var(--tutor-bg-h), var(--tutor-bg-s), calc(var(--tutor-bg-l) + 5%), 0.98);
  border: 1px solid hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.25);

  .tool-title {
    @apply text-sm font-semibold mb-2;
    color: hsl(var(--tutor-accent-h), var(--tutor-accent-s), calc(var(--tutor-accent-l) + 10%));
  }

  &.quiz-item-display-v1 {
    .quiz-question {
      @apply mb-2.5 text-sm;
      color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
    }
    .quiz-options { @apply space-y-2 mb-2.5; }
    .quiz-option-label {
      @apply block p-2.5 rounded-md border-2 transition-all duration-150 cursor-pointer text-xs;
      background-color: hsla(var(--tutor-bg-h), var(--tutor-bg-s), calc(var(--tutor-bg-l) + 8%), 0.7);
      border-color: hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.3);
      color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));

      &:hover {
        border-color: hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.7);
        background-color: hsla(var(--tutor-bg-h), var(--tutor-bg-s), calc(var(--tutor-bg-l) + 10%), 0.8);
      }
      &.selected {
        border-color: hsl(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l));
        background-color: hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.2);
        color: hsl(var(--tutor-accent-h), var(--tutor-accent-s), calc(var(--tutor-accent-l) + 15%));
        font-weight: 600; // Use semibold or 600
        box-shadow: 0 0 8px hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.3);
      }
      &.answered { @apply opacity-70 pointer-events-none; }
    }
    .form-input-futuristic { // For short answer textarea
      // Ensure .form-input-futuristic is defined globally with theme variables
      // Override specific aspects for this context if needed:
      background-color: hsla(var(--tutor-bg-h), var(--tutor-bg-s), calc(var(--tutor-bg-l) + 2%), 0.9);
      border-color: hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.5);
       &:focus {
          border-color: hsl(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l));
          box-shadow: 0 0 0 2.5px hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.4);
       }
    }
    .quiz-explanation, .quiz-feedback {
      @apply text-xs p-2.5 rounded-md mt-2.5 mb-2 border;
      background-color: hsla(var(--tutor-bg-h), var(--tutor-bg-s), calc(var(--tutor-bg-l) + 6%), 0.7);
      border-color: hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.25);
      color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
    }
    .feedback-icon { @apply inline w-4 h-4 mr-1.5 align-middle; } // Slightly larger icon
    .feedback-correct {
      background-color: hsla(var(--color-success-h, var.$default-color-success-h), var(--color-success-s, var.$default-color-success-s), var(--color-success-l, var.$default-color-success-l), 0.15);
      border-color: hsla(var(--color-success-h, var.$default-color-success-h), var(--color-success-s, var.$default-color-success-s), var(--color-success-l, var.$default-color-success-l), 0.5);
      color: hsl(var(--color-success-h, var.$default-color-success-h), var(--color-success-s, var.$default-color-success-s), calc(var(--color-success-l, #{var.$default-color-success-l}) - 15%));
    }
     .feedback-incorrect {
      background-color: hsla(var(--color-error-h, var.$default-color-error-h), var(--color-error-s, var.$default-color-error-s), var(--color-error-l, var.$default-color-error-l), 0.15);
      border-color: hsla(var(--color-error-h, var.$default-color-error-h), var(--color-error-s, var.$default-color-error-s), var(--color-error-l, var.$default-color-error-l), 0.5);
      color: hsl(var(--color-error-h, var.$default-color-error-h), var(--color-error-s, var.$default-color-error-s), calc(var(--color-error-l, #{var.$default-color-error-l}) - 10%));
    }
  }

  &.flashcard-item-display-v1 {
    .flashcard-content {
      @apply p-4 rounded-lg border-2 min-h-[100px] flex items-center justify-center text-center mb-2.5 cursor-pointer transition-all duration-200 ease-out text-sm;
      background-color: hsla(var(--tutor-bg-h), var(--tutor-bg-s), calc(var(--tutor-bg-l) + 10%), 0.8);
      border-color: hsla(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l), 0.4);
      color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
      box-shadow: var.$shadow-depth-sm;
      &:hover {
        border-color: hsl(var(--tutor-accent-h), var(--tutor-accent-s), var(--tutor-accent-l));
        transform: scale(1.03);
        box-shadow: var.$shadow-depth-md;
      }
    }
  }
}

// Ensure these general button classes are defined in _buttons.scss and provide full styling
.btn-futuristic-primary, .btn-futuristic-secondary, .btn-futuristic-toggle, .btn-futuristic-link { /* ... */ }
.btn-sm, .btn-xs { /* ... */ }
.btn-icon-sm { /* ... */ }
</style>