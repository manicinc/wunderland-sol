<template>
  <div class="coding-interviewer-view">
    <div class="interviewer-header">
      <div class="header-title-group">
        <UserCircleIcon class="header-icon" />
        <span class="header-title">{{ agentDisplayName }}</span>
        <span class="stage-chip">{{ currentStage.replace(/_/g, ' ') }}</span>
      </div>
      <div class="header-actions">
        <div v-if="isTimerRunning || (timerValueSeconds > 0 && isInterviewInProgress)" class="timer-display">
          <ClockIcon class="timer-icon" />
          <span>{{ formatTime(timerValueSeconds) }}</span>
        </div>

        <button
          v-if="currentStage === 'initial' || currentStage === 'interview_ended'"
          @click="handleStartNewInterview"
          class="btn-futuristic-primary btn-sm"
          :disabled="isLoadingLLM"
        >
          <PlayIcon class="btn-icon-sm" /> Start New Interview
        </button>
        <button
          v-if="currentStage === 'feedback_displayed' || currentStage === 'session_summary'"
          @click="handleRequestNextProblem"
          class="btn-futuristic-primary btn-sm"
          :disabled="isLoadingLLM"
        >
          <PlayIcon class="btn-icon-sm" /> Next Problem
        </button>
         <button
          v-if="isInterviewInProgress && currentStage !== 'problem_requesting' && currentStage !== 'solution_evaluation_pending'"
          @click="handleSkipProblem"
          class="btn-futuristic-secondary btn-sm"
          title="Skip to next problem"
          :disabled="isLoadingLLM"
        >
          <ArrowRightCircleIcon class="btn-icon-sm" /> Skip Problem
        </button>
        <button
          v-if="isInterviewInProgress"
          @click="handleEndCurrentInterview"
          class="btn-futuristic-danger btn-sm"
          :disabled="isLoadingLLM"
        >
          <StopIcon class="btn-icon-sm" /> End Interview
        </button>
        <button @click="() => toggleSessionList()" class="btn-futuristic-toggle btn-sm" title="Toggle Past Sessions">
          <FolderOpenIcon class="btn-icon-sm" /> History ({{ pastInterviewSessions.length }})
        </button>
      </div>
    </div>

    <div class="interviewer-main-layout">
      <Transition name="slide-fade-left-interview">
        <CodingInterviewerSessionPanel
          v-if="showSessionList"
          :sessions="pastInterviewSessions"
          :active-review-session-id="selectedSessionForReviewId"
          :is-loading="isProcessingLocal"
          :is-editing-title="isEditingSessionTitle"
          :title-edit-buffer="sessionTitleEditBuffer"
          @select-session="handleSelectSessionForReview"
          @delete-session="handleDeleteSession"
          @clear-all="handleClearAllHistory"
          @edit-title-start="handleEditTitleStart"
          @edit-title-confirm="confirmEditSessionTitle"
          @edit-title-cancel="cancelEditSessionTitle"
          @update:title-edit-buffer="val => sessionTitleEditBuffer = val"
        />
      </Transition>

      <CodingInterviewerWorkspace
        :active-display-markdown="activeDisplayMarkdown"
        :interview-stage="currentStage"
        :current-problem="currentProblemDisplay"
        :is-loading-llm="isLoadingLLM"
        :user-solution="userSolutionInput"
        @update:user-solution="(val: string) => userSolutionInput = val"
        @submit-solution="handleSubmitSolution"
        @request-hint="handleRequestHint"
        @send-clarification="handleSendClarification"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, onMounted, onUnmounted, type PropType, toRef } from 'vue';
import type { IAgentDefinition, AgentId } from '@/services/agent.service';
import type { ToastService } from '@/services/services';
import { useCodingInterviewerAgent } from './useCodingInterviewerAgent';
import CodingInterviewerSessionPanel from './CodingInterviewerSessionPanel.vue';
import CodingInterviewerWorkspace from './CodingInterviewerWorkspace.vue';
// Removed FullInterviewSession as it's handled by the composable

import {
  UserCircleIcon, PlayIcon, StopIcon, FolderOpenIcon, ClockIcon, ArrowRightCircleIcon
} from '@heroicons/vue/24/solid';

const props = defineProps({
  agentId: { type: String as PropType<AgentId>, required: true },
  agentConfig: { type: Object as PropType<IAgentDefinition>, required: true },
});

const emit = defineEmits<{
  (e: 'agent-event', event: { type: string, agentId: string, label?: string, data?: any }): void;
  (e: 'request-interview-input'): void;
}>();

const toast = inject<ToastService>('toast');

const agentConfigAsRef = toRef(props, 'agentConfig');

const {
  isLoadingLLM, isProcessingLocal, currentStage,
  currentProblemDisplay, userSolutionInput, pastInterviewSessions,
  selectedSessionForReviewId, showSessionList, isEditingSessionTitle,
  sessionTitleEditBuffer, timerValueSeconds, isTimerRunning,

  agentDisplayName, activeDisplayMarkdown, isInterviewInProgress,

  initialize, cleanup, startNewInterview, requestNextProblem, submitSolution,
  requestHint, endCurrentInterview, skipProblem,
  deleteInterviewSession, selectSessionForReview,
  beginEditSessionTitle, confirmEditSessionTitle, cancelEditSessionTitle,
  clearAllInterviewHistory, callInterviewerLLM,
  toggleSessionList,
} = useCodingInterviewerAgent(agentConfigAsRef, toast);

const handleStartNewInterview = () => {
  startNewInterview({}); // Pass empty object for default settings
  emit('request-interview-input');
};

const handleRequestNextProblem = async () => {
  await requestNextProblem();
  emit('request-interview-input');
};

const handleSubmitSolution = async () => {
  await submitSolution();
};

const handleRequestHint = async () => {
    await requestHint();
};

const handleSkipProblem = async () => {
    await skipProblem();
    emit('request-interview-input');
};

const handleEndCurrentInterview = async () => {
  await endCurrentInterview();
};

const handleSelectSessionForReview = (sessionId: string) => {
  selectSessionForReview(sessionId);
  toggleSessionList(false);
};

const handleDeleteSession = async (sessionId: string) => {
  if (window.confirm("Are you sure you want to delete this interview session?")) {
    await deleteInterviewSession(sessionId);
  }
};

const handleClearAllHistory = async () => {
    if(window.confirm("Are you sure you want to delete ALL interview history? This is irreversible.")){
        if(window.confirm("Second confirmation: This will delete everything. Proceed?")){
            await clearAllInterviewHistory();
        }
    }
};

const handleEditTitleStart = (sessionId: string) => {
    beginEditSessionTitle(sessionId);
};

const handleSendClarification = async (text: string) => {
    if(isInterviewInProgress.value && (currentStage.value === 'problem_presented' || currentStage.value === 'feedback_displayed' || currentStage.value === 'solution_input')){
        await callInterviewerLLM(text, 'clarification');
    } else {
        toast?.add({type: 'info', title: 'Not Applicable', message: 'Clarifications can be sent during an active problem or feedback review.'});
    }
};

const formatTime = (totalSeconds: number): string => {
  if (totalSeconds < 0) totalSeconds = 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

onMounted(async () => {
  await initialize(props.agentConfig);
  emit('agent-event', { type: 'view_mounted', agentId: props.agentId, label: agentDisplayName.value });
});

onUnmounted(() => {
  cleanup();
});

defineExpose({
    handleNewUserInput: async (text: string) => {
        if(isInterviewInProgress.value && (currentStage.value === 'problem_presented' || currentStage.value === 'solution_input' || currentStage.value === 'feedback_displayed')){
            await callInterviewerLLM(text, 'clarification');
        } else {
            toast?.add({type: 'info', title: 'No Active Interview', message: 'Please start an interview to provide input.'});
        }
    },
    startNewInterview,
});

</script>

<style lang="scss" scoped>
@use 'sass:math';
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.coding-interviewer-view {
  --interviewer-accent-h: var(--color-accent-secondary-h, #{var.$default-color-accent-secondary-h});
  --interviewer-accent-s: var(--color-accent-secondary-s, #{var.$default-color-accent-secondary-s});
  --interviewer-accent-l: var(--color-accent-secondary-l, #{var.$default-color-accent-secondary-l});
  --interviewer-bg-h: var(--color-bg-primary-h, #{var.$default-color-bg-primary-h});
  --interviewer-bg-s: var(--color-bg-primary-s, #{var.$default-color-bg-primary-s});
  --interviewer-bg-l: calc(var(--color-bg-primary-l, #{var.$default-color-bg-primary-l}) - 2%);

  color: var(--color-text-primary);
  @apply flex flex-col h-full w-full overflow-hidden;
  background-color: hsl(var(--interviewer-bg-h), var(--interviewer-bg-s), var(--interviewer-bg-l));
   background-image:
    linear-gradient(hsla(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l), 0.03) 0.8px, transparent 0.8px),
    linear-gradient(90deg, hsla(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l), 0.03) 0.8px, transparent 0.8px);
  background-size: 22px 22px;
}

.interviewer-header {
  @apply flex items-center justify-between p-2.5 px-4 border-b shadow-lg backdrop-blur-md z-10 shrink-0;
  background-color: hsla(var(--interviewer-bg-h), var(--interviewer-bg-s), calc(var(--interviewer-bg-l) + 5%), 0.9);
  border-bottom-color: hsla(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l), 0.25);

  .header-title-group { @apply flex items-center gap-2 min-w-0; }
  .header-icon {
    @apply w-6 h-6 shrink-0;
    color: hsl(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l));
  }
  .header-title { @apply font-semibold text-base tracking-wide truncate; color: var(--color-text-primary); }
  .stage-chip {
    @apply text-xs px-2.5 py-1 rounded-full ml-2 font-medium capitalize shadow-sm;
    background-color: hsla(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l), 0.15);
    color: hsl(var(--interviewer-accent-h), var(--interviewer-accent-s), calc(var(--interviewer-accent-l) + 25%));
    border: 1px solid hsla(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l), 0.2);
  }
  .header-actions { @apply flex items-center gap-2; }
  .timer-display {
    @apply flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg shadow-inner;
    background-color: hsla(var(--interviewer-bg-h), var(--interviewer-bg-s), calc(var(--interviewer-bg-l) + 10%), 0.6);
    color: var(--color-text-secondary);
    font-family: var(--font-family-mono);
    border: 1px solid hsla(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l), 0.1);
    .timer-icon { @apply w-4 h-4 opacity-75; color: hsl(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l));}
  }
}

.interviewer-main-layout {
  @apply flex-grow flex flex-row overflow-hidden;
  & > .session-list-panel-interview + .interview-workspace-panel { // Assuming these are the class names for new components
    border-left: 1px solid hsla(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l), 0.12);
  }
}

.btn-futuristic-primary, .btn-futuristic-secondary, .btn-futuristic-danger, .btn-futuristic-toggle {
    @apply px-3 py-1.5 rounded-md font-medium transition-all duration-150 ease-out flex items-center justify-center shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed;
}
.btn-sm { @apply text-xs px-2.5 py-1; }
.btn-icon-sm { @apply w-4 h-4 mr-1.5; }


.slide-fade-left-interview-enter-active,
.slide-fade-left-interview-leave-active {
  transition: opacity 0.3s var(--ease-out-quad), transform 0.35s var(--ease-out-cubic);
}
.slide-fade-left-interview-enter-from,
.slide-fade-left-interview-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

.interviewer-spinner.large {
  @apply w-12 h-12 border-4 rounded-full animate-spin;
  border-color: hsla(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l), 0.2);
  border-top-color: hsl(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l));
}
@keyframes spin { to { transform: rotate(360deg); } }

.interviewer-welcome-container {
  @apply text-center p-6 flex flex-col items-center justify-center h-full;
  .icon-wrapper { @apply p-3 rounded-full mb-4 shadow-xl; background: radial-gradient(circle, hsla(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l), 0.1) 0%, transparent 65%); }
  .main-icon { @apply w-16 h-16 sm:w-20 sm:h-20 mx-auto; color: hsl(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l)); filter: drop-shadow(0 0 12px hsla(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l), 0.5)); animation: subtlePulse 3.5s infinite ease-in-out; }
  .welcome-title { @apply text-xl sm:text-2xl font-bold mt-3 mb-1.5 tracking-wide; color: var(--color-text-primary); }
  .welcome-subtitle { @apply text-sm sm:text-base mb-4 max-w-md opacity-90; color: var(--color-text-secondary); }
}

@keyframes subtlePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.02); }
}

</style>

