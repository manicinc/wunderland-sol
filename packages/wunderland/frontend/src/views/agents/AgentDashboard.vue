<template>
  <div class="agent-dashboard">
    <header class="agent-dashboard__header">
      <div>
        <h1>Agent Workspace</h1>
        <p class="agent-dashboard__subtitle">
          Create and manage your custom assistants. Knowledge uploads and advanced features depend on your plan.
        </p>
      </div>
      <RouterLink
        :to="{ name: 'AuthenticatedHome', params: { locale: currentLocale } }"
        class="btn btn-secondary-ephemeral btn-sm-ephemeral"
      >
        Back to App
      </RouterLink>
    </header>

    <section class="plan-overview-card">
      <header>
        <h2>Plan Usage</h2>
        <span v-if="planSnapshot" class="plan-overview-card__label">{{ planSnapshot.planId }}</span>
      </header>
      <div v-if="planLoading" class="plan-overview-card__loading shimmer">Fetching plan limits…</div>
      <div v-else-if="planSnapshot" class="plan-overview-card__grid">
        <div>
          <span class="plan-overview-card__metric">{{ planSnapshot.usage.activeAgents }}</span>
          <span class="plan-overview-card__hint">Active agents</span>
          <span class="plan-overview-card__limit">Limit: {{ planSnapshot.limits.maxActiveAgents }}</span>
        </div>
        <div>
          <span class="plan-overview-card__metric">{{ planSnapshot.usage.monthlyCreations }}</span>
          <span class="plan-overview-card__hint">Agents created (30d)</span>
          <span class="plan-overview-card__limit">Allowance: {{ planSnapshot.limits.monthlyCreationAllowance }}</span>
        </div>
        <div>
          <span class="plan-overview-card__metric">{{ planSnapshot.limits.knowledgeDocumentsPerAgent }}</span>
          <span class="plan-overview-card__hint">Knowledge docs / agent</span>
          <span class="plan-overview-card__limit">Per-plan allowance</span>
        </div>
        <div>
          <span class="plan-overview-card__metric">{{ planSnapshot.limits.agencySeats }}</span>
          <span class="plan-overview-card__hint">Agency seats</span>
          <span class="plan-overview-card__limit">Advanced collaboration capacity</span>
        </div>
        <div>
          <span class="plan-overview-card__metric">{{ planSnapshot.limits.agencyLaunchesPerWeek ?? 0 }}</span>
          <span class="plan-overview-card__hint">Agency launches / week</span>
          <span class="plan-overview-card__limit">Per-plan allowance</span>
        </div>
      </div>
      <p v-else class="plan-overview-card__empty">
        Plan information unavailable. Refresh the page or contact support if this persists.
      </p>
    </section>

    <section class="create-agent-card">
      <header>
        <h2>Create a Custom Agent</h2>
        <p>
          Provide a label and optional slug. Configuration accepts JSON describing prompts, capabilities, or any
          metadata your workflow expects.
        </p>
      </header>

      <form class="create-agent-form" @submit.prevent="handleCreateAgent">
        <div class="form-field">
          <label for="agentLabel">Label</label>
          <input
            id="agentLabel"
            v-model="creationForm.label"
            type="text"
            placeholder="e.g. Design Review Assistant"
            required
          />
        </div>
        <div class="form-field">
          <label for="agentSlug">Slug (optional)</label>
          <input
            id="agentSlug"
            v-model="creationForm.slug"
            type="text"
            placeholder="design-review"
          />
        </div>
        <div class="form-field">
          <label for="agentConfig">Configuration JSON</label>
          <textarea
            id="agentConfig"
            v-model="creationForm.config"
            rows="6"
            placeholder='{ "prompt": "You are a helpful agent." }'
          ></textarea>
        </div>
        <div class="create-agent-form__actions">
          <span v-if="creationForm.error" class="form-error">{{ creationForm.error }}</span>
          <button
            class="btn btn-primary-ephemeral"
            type="submit"
            :disabled="creationForm.submitting"
          >
            {{ creationForm.submitting ? 'Creating…' : 'Create Agent' }}
          </button>
        </div>
      </form>
    </section>

    <section class="agent-list-card">
      <header class="agent-list-card__header">
        <h2>Agents</h2>
        <div class="agent-list-card__meta">
          <span v-if="isLoading" class="shimmer">Loading agents…</span>
          <span v-else>{{ agents.length }} total ({{ activeAgents.length }} active)</span>
        </div>
      </header>
      <div v-if="errorMessage" class="form-error">{{ errorMessage }}</div>
      <div v-if="isLoading" class="agent-list-card__loading shimmer">Fetching agents…</div>
      <div v-else-if="!agents.length" class="agent-list-card__empty">
        Create your first custom agent to see it here.
      </div>
      <div v-else class="agent-list">
        <article
          v-for="agent in agents"
          :key="agent.id"
          :class="['agent-item', { 'agent-item--selected': agent.id === selectedAgentId }]"
          @click="selectAgent(agent.id)"
        >
          <header>
            <div>
              <h3>{{ agent.label }}</h3>
              <p class="agent-item__slug">{{ agent.slug || '—' }}</p>
            </div>
            <span class="agent-item__status" :data-status="agent.status">{{ agent.status }}</span>
          </header>
          <p class="agent-item__meta">
            Created {{ formatDate(agent.createdAt) }} · Updated {{ formatDate(agent.updatedAt) }}
          </p>
          <div class="agent-item__actions">
            <button
              class="btn btn-tertiary-ephemeral btn-xs"
              type="button"
              @click.stop="archiveAgent(agent)"
              :disabled="agent.status !== 'active'"
            >
              Archive
            </button>
            <button
              class="btn btn-tertiary-ephemeral btn-xs"
              type="button"
              @click.stop="deleteAgent(agent)"
            >
              Delete
            </button>
          </div>
        </article>
      </div>
    </section>

    <section v-if="selectedAgent" class="knowledge-panel">
      <header class="knowledge-panel__header">
        <div>
          <h2>Knowledge for {{ selectedAgent.label }}</h2>
          <p class="knowledge-panel__hint">
            Attach focused documents or snippets this agent can reference. Keep sensitive data out of public agents.
          </p>
        </div>
        <span class="knowledge-panel__usage">
          {{ knowledgeItems.length }} / {{ knowledgeLimit }} documents
        </span>
      </header>

      <div v-if="knowledgeError" class="form-error">{{ knowledgeError }}</div>

      <form class="knowledge-form" @submit.prevent="handleCreateKnowledge" v-if="canAddKnowledge">
        <div class="form-field">
          <label for="knowledgeType">Type</label>
          <input
            id="knowledgeType"
            v-model="knowledgeForm.type"
            type="text"
            required
            placeholder="notes"
          />
        </div>
        <div class="form-field">
          <label for="knowledgeTags">Tags (comma separated)</label>
          <input
            id="knowledgeTags"
            v-model="knowledgeForm.tags"
            type="text"
            placeholder="review, design"
          />
        </div>
        <div class="form-field">
          <label for="knowledgeContent">Content</label>
          <textarea
            id="knowledgeContent"
            v-model="knowledgeForm.content"
            rows="5"
            placeholder="Paste Markdown, notes, or JSON context."
            required
          ></textarea>
        </div>
        <div class="form-field">
          <label for="knowledgeMetadata">Metadata JSON (optional)</label>
          <textarea
            id="knowledgeMetadata"
            v-model="knowledgeForm.metadata"
            rows="3"
            placeholder='{ "source": "Notion doc" }'
          ></textarea>
        </div>
        <div class="knowledge-form__actions">
          <span v-if="knowledgeForm.error" class="form-error">{{ knowledgeForm.error }}</span>
          <button class="btn btn-primary-ephemeral btn-sm-ephemeral" type="submit" :disabled="knowledgeForm.submitting">
            {{ knowledgeForm.submitting ? 'Adding…' : 'Add Knowledge' }}
          </button>
        </div>
      </form>
      <p v-else class="knowledge-panel__limit">
        You’ve reached the knowledge document limit for this agent.
      </p>

      <div v-if="knowledgeLoading" class="knowledge-list knowledge-list--loading shimmer">
        Loading knowledge…
      </div>
      <div v-else-if="!knowledgeItems.length" class="knowledge-list knowledge-list--empty">
        No knowledge attached yet.
      </div>
      <ul v-else class="knowledge-list">
        <li v-for="item in knowledgeItems" :key="item.id" class="knowledge-item">
          <div>
            <h3>{{ item.type }}</h3>
            <p class="knowledge-item__tags" v-if="item.tags && item.tags.length">
              {{ item.tags.join(', ') }}
            </p>
            <p class="knowledge-item__timestamp">
              Updated {{ formatDate(item.updatedAt) }}
            </p>
          </div>
          <button class="btn btn-tertiary-ephemeral btn-xs" type="button" @click="deleteKnowledge(item.id)">
            Remove
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { RouterLink } from 'vue-router';
import { useUserAgentsStore } from '@/store/userAgents.store';
import { useAuth } from '@/composables/useAuth';
import {
  userAgentKnowledgeAPI,
  type UserAgentDto,
  type UserAgentKnowledgeDto,
} from '@/utils/api';
import { useI18n } from 'vue-i18n';

const auth = useAuth();
const { locale } = useI18n();
const currentLocale = computed(() => locale.value);
const userAgentsStore = useUserAgentsStore();
const { agents, planSnapshot, isLoading, planLoading, error } = storeToRefs(userAgentsStore);

const isAuthenticated = computed(() => auth.isAuthenticated.value);
const activeAgents = computed(() => userAgentsStore.activeAgents);

const creationForm = reactive({
  label: '',
  slug: '',
  config: '{\\n  "prompt": "You are a helpful assistant."\\n}',
  submitting: false,
  error: '',
});

const selectedAgentId = ref<string | null>(null);
const knowledgeItems = ref<UserAgentKnowledgeDto[]>([]);
const knowledgeLoading = ref(false);
const knowledgeError = ref<string | null>(null);

const knowledgeForm = reactive({
  type: 'document',
  tags: '',
  content: '',
  metadata: '',
  submitting: false,
  error: '',
});

const knowledgeLimit = computed(() => planSnapshot.value?.limits.knowledgeDocumentsPerAgent ?? 0);
const canAddKnowledge = computed(() => knowledgeItems.value.length < knowledgeLimit.value);
const errorMessage = computed(() => error.value);
const selectedAgent = computed<UserAgentDto | undefined>(() =>
  agents.value.find((agent) => agent.id === selectedAgentId.value),
);

const formatDate = (value: number | string): string => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '';
  }
};

const ensureSelectedAgent = () => {
  if (!selectedAgentId.value && agents.value.length > 0) {
    selectedAgentId.value = agents.value[0].id;
  }
};

const fetchKnowledge = async () => {
  if (!selectedAgentId.value || !isAuthenticated.value) {
    knowledgeItems.value = [];
    return;
  }
  try {
    knowledgeLoading.value = true;
    knowledgeError.value = null;
    const { data } = await userAgentKnowledgeAPI.list(selectedAgentId.value);
    knowledgeItems.value = (data?.knowledge ?? []).map((item) => ({
      ...item,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  } catch (err: any) {
    knowledgeError.value = err?.response?.data?.message ?? err?.message ?? 'Failed to load knowledge.';
  } finally {
    knowledgeLoading.value = false;
  }
};

const selectAgent = (agentId: string) => {
  selectedAgentId.value = agentId;
};

const parseJsonField = (value: string, fallback: Record<string, unknown> | null = null) => {
  if (!value || !value.trim()) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error('Invalid JSON format.');
  }
};

const handleCreateAgent = async () => {
  creationForm.error = '';
  if (!creationForm.label.trim()) {
    creationForm.error = 'Label is required.';
    return;
  }
  let parsedConfig: Record<string, unknown> = {};
  try {
    parsedConfig = parseJsonField(creationForm.config, {}) ?? {};
  } catch (error: any) {
    creationForm.error = error.message;
    return;
  }

  creationForm.submitting = true;
  try {
    const created = await userAgentsStore.createAgent({
      label: creationForm.label.trim(),
      slug: creationForm.slug.trim() || undefined,
      config: parsedConfig,
    });
    creationForm.label = '';
    creationForm.slug = '';
    creationForm.config = '{\\n  "prompt": "You are a helpful assistant."\\n}';
    selectedAgentId.value = created.id;
    await fetchKnowledge();
  } catch (error: any) {
    creationForm.error = error?.response?.data?.message ?? error?.message ?? 'Unable to create agent.';
  } finally {
    creationForm.submitting = false;
  }
};

const archiveAgent = async (agent: UserAgentDto) => {
  try {
    await userAgentsStore.updateAgent(agent.id, { status: 'archived' });
    if (selectedAgentId.value === agent.id) {
      selectedAgentId.value = null;
      ensureSelectedAgent();
      await fetchKnowledge();
    }
  } catch (error: any) {
    knowledgeError.value = error?.response?.data?.message ?? error?.message ?? 'Failed to archive agent.';
  }
};

const deleteAgent = async (agent: UserAgentDto) => {
  if (!confirm(`Delete agent “${agent.label}”? This cannot be undone.`)) return;
  try {
    await userAgentsStore.removeAgent(agent.id);
    if (selectedAgentId.value === agent.id) {
      selectedAgentId.value = null;
      knowledgeItems.value = [];
      ensureSelectedAgent();
      await fetchKnowledge();
    }
  } catch (error: any) {
    knowledgeError.value = error?.response?.data?.message ?? error?.message ?? 'Failed to delete agent.';
  }
};

const handleCreateKnowledge = async () => {
  if (!selectedAgentId.value) return;
  knowledgeForm.error = '';
  let metadata: Record<string, unknown> | undefined;
  try {
    metadata = parseJsonField(knowledgeForm.metadata ?? '', undefined) ?? undefined;
  } catch (error: any) {
    knowledgeForm.error = error.message;
    return;
  }
  const tags = knowledgeForm.tags
    ? knowledgeForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    : [];

  knowledgeForm.submitting = true;
  try {
    const { data } = await userAgentKnowledgeAPI.create(selectedAgentId.value, {
      type: knowledgeForm.type,
      content: knowledgeForm.content,
      tags,
      metadata,
    });
    knowledgeItems.value = [data, ...knowledgeItems.value];
    knowledgeForm.type = 'document';
    knowledgeForm.tags = '';
    knowledgeForm.content = '';
    knowledgeForm.metadata = '';
  } catch (error: any) {
    knowledgeForm.error = error?.response?.data?.message ?? error?.message ?? 'Failed to add knowledge.';
  } finally {
    knowledgeForm.submitting = false;
  }
};

const deleteKnowledge = async (knowledgeId: string) => {
  if (!selectedAgentId.value) return;
  if (!confirm('Remove this knowledge document?')) return;
  try {
    await userAgentKnowledgeAPI.remove(selectedAgentId.value, knowledgeId);
    knowledgeItems.value = knowledgeItems.value.filter((item) => item.id !== knowledgeId);
  } catch (error: any) {
    knowledgeError.value = error?.response?.data?.message ?? error?.message ?? 'Failed to delete knowledge.';
  }
};

watch(
  () => agents.value.length,
  () => {
    ensureSelectedAgent();
  },
  { immediate: true },
);

watch(
  () => selectedAgentId.value,
  async () => {
    await fetchKnowledge();
  },
);

watch(
  () => isAuthenticated.value,
  async (authed) => {
    if (authed) {
      await userAgentsStore.fetchAgents(true);
      await userAgentsStore.refreshPlanSnapshot();
      ensureSelectedAgent();
      await fetchKnowledge();
    } else {
      knowledgeItems.value = [];
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.agent-dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  padding: 1.5rem 0 3rem;
}

.agent-dashboard__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
}

.agent-dashboard__header h1 {
  font-size: 1.75rem;
  margin: 0;
}

.agent-dashboard__subtitle {
  margin: 0.35rem 0 0;
  color: rgba(255, 255, 255, 0.7);
}

.plan-overview-card,
.create-agent-card,
.agent-list-card,
.knowledge-panel {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1.5rem;
  backdrop-filter: blur(8px);
}

.plan-overview-card header,
.create-agent-card header,
.agent-list-card__header,
.knowledge-panel__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.plan-overview-card header h2,
.create-agent-card header h2,
.knowledge-panel__header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.plan-overview-card__label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.plan-overview-card__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.plan-overview-card__grid > div {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.plan-overview-card__metric {
  font-size: 1.5rem;
  font-weight: 600;
}

.plan-overview-card__hint {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.plan-overview-card__limit {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.plan-overview-card__loading,
.plan-overview-card__empty {
  color: rgba(255, 255, 255, 0.7);
}

.create-agent-form,
.knowledge-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem 1.5rem;
}

.create-agent-form .form-field,
.knowledge-form .form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-weight: 600;
  font-size: 0.9rem;
}

.form-field input,
.form-field textarea {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0.65rem 0.8rem;
  color: inherit;
}

.create-agent-form__actions,
.knowledge-form__actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  align-items: center;
}

.form-error {
  color: #ff8c93;
  font-size: 0.85rem;
}

.agent-list-card__header {
  margin-bottom: 1rem;
}

.agent-list-card__meta {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.65);
}

.agent-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.agent-item {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.agent-item--selected {
  border-color: rgba(255, 255, 255, 0.35);
  transform: translateY(-2px);
}

.agent-item header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.agent-item__slug {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0.15rem 0 0;
}

.agent-item__status {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.6);
}

.agent-item__meta {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.agent-item__actions {
  display: flex;
  gap: 0.75rem;
}

.knowledge-panel__header {
  margin-bottom: 1.25rem;
}

.knowledge-panel__hint {
  color: rgba(255, 255, 255, 0.7);
  margin: 0.35rem 0 0;
}

.knowledge-panel__usage {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.65);
}

.knowledge-panel__limit {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.75rem;
}

.knowledge-list {
  display: grid;
  gap: 0.75rem;
}

.knowledge-list--empty,
.knowledge-list--loading {
  color: rgba(255, 255, 255, 0.6);
}

.knowledge-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  padding: 0.9rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.knowledge-item h3 {
  margin: 0 0 0.2rem;
  font-size: 1rem;
}

.knowledge-item__tags {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.65);
}

.knowledge-item__timestamp {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.55);
}

@media (max-width: 768px) {
  .agent-dashboard__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
