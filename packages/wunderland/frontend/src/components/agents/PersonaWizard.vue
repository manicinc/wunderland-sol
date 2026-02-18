<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-white/10">
        <div>
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Create New Persona</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Define AI agent personality, config, guardrails, and extensions</p>
        </div>
        <button @click="$emit('close')" class="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
          <XMarkIcon class="h-5 w-5 text-slate-500" />
        </button>
      </div>

      <!-- Step Progress -->
      <div class="flex items-center border-b border-slate-200 px-6 py-3 dark:border-white/10">
        <div v-for="(s, idx) in STEPS" :key="s.key" class="flex flex-1 items-center">
          <button
            @click="currentStep = s.key"
            :class="[
              'flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition',
              s.key === currentStep
                ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                : idx < currentStepIndex
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-400'
            ]"
          >
            <component :is="idx < currentStepIndex ? CheckIcon : s.icon" class="h-3 w-3" />
            {{ s.label }}
          </button>
          <div v-if="idx < STEPS.length - 1" class="mx-2 h-px flex-1 bg-slate-200 dark:bg-white/10" />
        </div>
      </div>

      <!-- Step Content -->
      <div class="p-6">
        <!-- Step 1: Basics -->
        <div v-if="currentStep === 'basics'" class="space-y-4">
          <label class="block">
            <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Display Name *</span>
            <input
              v-model="draft.displayName"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950"
              placeholder="Research Assistant"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</span>
            <textarea
              v-model="draft.description"
              rows="3"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950"
              placeholder="Expert at gathering information and synthesizing findings..."
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Tags (comma-separated)</span>
            <input
              v-model="tagsInput"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950"
              placeholder="research, analysis, web-search"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Traits (comma-separated)</span>
            <input
              v-model="traitsInput"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950"
              placeholder="analytical, thorough, curious"
            />
          </label>
        </div>

        <!-- Step 2: Config -->
        <div v-if="currentStep === 'config'" class="space-y-4">
          <label class="block">
            <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Base System Prompt</span>
            <textarea
              v-model="draft.baseSystemPrompt"
              rows="6"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono dark:border-white/10 dark:bg-slate-950"
              placeholder="You are a helpful research assistant specialized in..."
            />
            <p class="mt-1 text-xs text-slate-500">Core instructions for the LLM (optional—AgentOS provides defaults)</p>
          </label>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Model Preference</span>
              <select
                v-model="draft.modelPreference"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950"
              >
                <option value="">System default</option>
                <option value="gpt-4o">gpt-4o (powerful)</option>
                <option value="gpt-4o-mini">gpt-4o-mini (fast, cheap)</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                <option value="openai/gpt-4o">OpenRouter: GPT-4o</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Cost Strategy</span>
              <select
                v-model="draft.costSavingStrategy"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950"
              >
                <option value="">Default</option>
                <option value="prefer_free">Prefer free models</option>
                <option value="balance_quality_cost">Balance quality/cost</option>
                <option value="quality_first">Quality first</option>
              </select>
            </label>
          </div>
          <label class="block">
            <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Max Tokens</span>
            <input
              v-model.number="draft.maxTokens"
              type="number"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950"
              placeholder="8192"
            />
            <p class="mt-1 text-xs text-slate-500">Maximum context window (optional)</p>
          </label>
        </div>

        <!-- Step 3: Guardrails -->
        <div v-if="currentStep === 'guardrails'" class="space-y-4">
          <p class="text-sm text-slate-600 dark:text-slate-400">
            Attach guardrails to enforce safety, privacy, and compliance policies for this persona.
          </p>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/40">
            <p class="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Available Guardrails</p>
            <div v-for="g in availableGuardrails" :key="g.id" class="mb-2">
              <label class="flex items-start gap-3 rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-900">
                <input
                  v-model="selectedGuardrails"
                  :value="g.id"
                  type="checkbox"
                  class="mt-0.5"
                />
                <div>
                  <p class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ g.name }}</p>
                  <p class="text-xs text-slate-500">{{ g.desc }}</p>
                </div>
              </label>
            </div>
          </div>
          <div v-if="selectedGuardrails.length > 0" class="text-xs text-slate-500">
            {{ selectedGuardrails.length }} guardrail(s) selected
          </div>
        </div>

        <!-- Step 4: Extensions -->
        <div v-if="currentStep === 'extensions'" class="space-y-4">
          <p class="text-sm text-slate-600 dark:text-slate-400">
            Select which extensions (tools, integrations) this persona can use.
          </p>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/40">
            <p class="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Available Extensions</p>
            <div v-for="ext in availableExtensions" :key="ext.id" class="mb-2">
              <label class="flex items-start gap-3 rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-900">
                <input
                  v-model="selectedExtensions"
                  :value="ext.id"
                  type="checkbox"
                  class="mt-0.5"
                />
                <div>
                  <p class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ ext.name }}</p>
                  <p class="text-xs text-slate-500">{{ ext.desc }}</p>
                  <p class="text-[10px] font-mono text-slate-400">{{ ext.id }}</p>
                </div>
              </label>
            </div>
          </div>
          <div v-if="selectedExtensions.length > 0" class="text-xs text-slate-500">
            {{ selectedExtensions.length }} extension(s) selected
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-white/10">
        <button
          @click="handleBack"
          :disabled="currentStepIndex === 0"
          class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30 dark:border-white/10 dark:text-slate-300"
        >
          <ChevronLeftIcon class="h-4 w-4" />
          Back
        </button>
        <div class="text-xs text-slate-500">
          Step {{ currentStepIndex + 1 }} of {{ STEPS.length }}
        </div>
        <button
          @click="handleNext"
          class="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
        >
          <template v-if="isLastStep">
            <CheckIcon class="h-4 w-4" />
            Create Persona
          </template>
          <template v-else>
            Next
            <ChevronRightIcon class="h-4 w-4" />
          </template>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  XMarkIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  PuzzlePieceIcon,
} from '@heroicons/vue/24/outline';

interface PersonaWizardProps {
  open: boolean;
}

interface PersonaDraft {
  displayName: string;
  description: string;
  baseSystemPrompt: string;
  modelPreference: string;
  costSavingStrategy: string;
  maxTokens: number | null;
}

const props = defineProps<PersonaWizardProps>();
const emit = defineEmits<{
  close: [];
  created: [persona: any];
}>();

const STEPS = [
  { key: 'basics', label: 'Basics', icon: DocumentTextIcon },
  { key: 'config', label: 'Config', icon: Cog6ToothIcon },
  { key: 'guardrails', label: 'Guardrails', icon: ShieldCheckIcon },
  { key: 'extensions', label: 'Extensions', icon: PuzzlePieceIcon },
] as const;

type StepKey = typeof STEPS[number]['key'];

const currentStep = ref<StepKey>('basics');
const draft = ref<PersonaDraft>({
  displayName: '',
  description: '',
  baseSystemPrompt: '',
  modelPreference: '',
  costSavingStrategy: '',
  maxTokens: null,
});

const tagsInput = ref('');
const traitsInput = ref('');
const selectedGuardrails = ref<string[]>([]);
const selectedExtensions = ref<string[]>([]);

const availableGuardrails = [
  { id: 'pii-protection', name: 'PII Protection', desc: 'Redact SSN, email, phone' },
  { id: 'cost-ceiling', name: 'Cost Ceiling', desc: 'Limit response cost' },
  { id: 'sensitive-topic', name: 'Sensitive Topics', desc: 'Block harmful content' },
];

const availableExtensions = [
  { id: '@framersai/ext-web-search', name: 'Web Search', desc: 'Search the web, fact-check, research' },
  { id: '@framersai/ext-telegram', name: 'Telegram Bot', desc: 'Send messages, manage groups' },
  { id: '@framersai/ext-code-executor', name: 'Code Executor', desc: 'Run Python, JS in sandbox' },
];

const currentStepIndex = computed(() => STEPS.findIndex((s) => s.key === currentStep.value));
const isLastStep = computed(() => currentStepIndex.value === STEPS.length - 1);

const handleNext = () => {
  if (isLastStep.value) {
    handleFinish();
  } else {
    currentStep.value = STEPS[currentStepIndex.value + 1].key;
  }
};

const handleBack = () => {
  if (currentStepIndex.value > 0) {
    currentStep.value = STEPS[currentStepIndex.value - 1].key;
  }
};

const handleFinish = () => {
  if (!draft.value.displayName?.trim()) {
    alert('Display name is required');
    return;
  }

  const persona = {
    id: draft.value.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `persona-${Date.now()}`,
    displayName: draft.value.displayName.trim(),
    description: draft.value.description?.trim(),
    tags: tagsInput.value.split(',').map((t) => t.trim()).filter(Boolean),
    traits: traitsInput.value.split(',').map((t) => t.trim()).filter(Boolean),
    metadata: {
      baseSystemPrompt: draft.value.baseSystemPrompt,
      modelPreference: draft.value.modelPreference,
      costSavingStrategy: draft.value.costSavingStrategy,
      maxTokens: draft.value.maxTokens,
      guardrails: selectedGuardrails.value.map((id) => ({
        id,
        type: `@framersai/guardrail-${id}`,
        displayName: availableGuardrails.find((g) => g.id === id)?.name || id,
        enabled: true,
        config: {},
      })),
      extensions: selectedExtensions.value,
    },
    source: 'local',
  };

  emit('created', persona);
  emit('close');
  
  // Reset form
  draft.value = {
    displayName: '',
    description: '',
    baseSystemPrompt: '',
    modelPreference: '',
    costSavingStrategy: '',
    maxTokens: null,
  };
  tagsInput.value = '';
  traitsInput.value = '';
  selectedGuardrails.value = [];
  selectedExtensions.value = [];
  currentStep.value = 'basics';
};

// Reset form when modal closes
watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    currentStep.value = 'basics';
  }
});
</script>
