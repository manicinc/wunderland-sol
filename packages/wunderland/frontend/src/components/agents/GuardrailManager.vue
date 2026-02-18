<template>
  <section class="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/60">
    <header class="mb-4 flex items-center justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Guardrails</p>
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {{ personaId ? `Active for ${personaId}` : 'Safety & Policy' }}
        </h3>
      </div>
      <button
        @click="showAddModal = true"
        class="inline-flex items-center gap-1 rounded-full border border-sky-500 px-3 py-1 text-xs text-sky-600 hover:bg-sky-50 dark:border-sky-400 dark:text-sky-300 dark:hover:bg-sky-950"
      >
        <PlusIcon class="h-3 w-3" />
        Add
      </button>
    </header>

    <div v-if="guardrails.length === 0" class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-400">
      No guardrails configured. Click "Add" to install from the registry.
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="guard in guardrails"
        :key="guard.id"
        class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-950/40"
      >
        <div
          class="flex h-8 w-8 items-center justify-center rounded-full"
          :style="{ backgroundColor: getCategoryColor(guard.uiMetadata?.category) + '20' }"
        >
          <ShieldCheckIcon class="h-4 w-4" :style="{ color: getCategoryColor(guard.uiMetadata?.category) }" />
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ guard.displayName }}</p>
          <p v-if="guard.description" class="text-xs text-slate-500 dark:text-slate-400">{{ guard.description }}</p>
          <span
            v-if="guard.uiMetadata?.category"
            class="mt-1 inline-block rounded-full bg-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          >
            {{ guard.uiMetadata.category }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="$emit('toggle', guard.id, !guard.enabled)"
            :class="[
              'rounded-md p-1 transition',
              guard.enabled
                ? 'bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-slate-200 text-slate-500 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400'
            ]"
            :title="guard.enabled ? 'Enabled' : 'Disabled'"
          >
            <PowerIcon class="h-4 w-4" />
          </button>
          <button
            @click="$emit('configure', guard.id)"
            class="rounded-md p-1 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Configure"
          >
            <Cog6ToothIcon class="h-4 w-4" />
          </button>
          <button
            @click="$emit('remove', guard.id)"
            class="rounded-md p-1 text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950"
            title="Remove"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-900">
        <h3 class="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Add Guardrail</h3>
        <p class="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Browse the guardrail registry and select one to install.
        </p>
        <div class="space-y-2">
          <p class="text-xs text-slate-500">Coming soon: Browse curated and community guardrails</p>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <button
            @click="showAddModal = false"
            class="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  PlusIcon,
  ShieldCheckIcon,
  PowerIcon,
  Cog6ToothIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline';

interface SerializableGuardrail {
  id: string;
  type: string;
  displayName: string;
  description?: string;
  enabled: boolean;
  config: Record<string, unknown>;
  priority?: number;
  uiMetadata?: {
    category?: 'safety' | 'privacy' | 'budget' | 'compliance' | 'quality' | 'custom';
    icon?: string;
    color?: string;
  };
}

interface GuardrailManagerProps {
  personaId?: string;
  guardrails: SerializableGuardrail[];
}

defineProps<GuardrailManagerProps>();
const emit = defineEmits<{
  toggle: [id: string, enabled: boolean];
  add: [guardrail: SerializableGuardrail];
  remove: [id: string];
  configure: [id: string];
}>();

const showAddModal = ref(false);

const CATEGORY_COLORS: Record<string, string> = {
  safety: '#ef4444',
  privacy: '#10b981',
  budget: '#f59e0b',
  compliance: '#3b82f6',
  quality: '#8b5cf6',
  custom: '#6b7280',
};

const getCategoryColor = (category?: string) => {
  return CATEGORY_COLORS[category || 'custom'];
};
</script>
