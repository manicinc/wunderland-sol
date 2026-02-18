/**
 * @file agent.store.ts
 * @description Pinia store for managing the currently active AI agent and its context.
 * @version 1.2.2 - Fully corrected based on TS errors and updated agent.service.ts.
 */
import { defineStore } from 'pinia';
import { ref, computed, watch, readonly, type Component as VueComponentType } from 'vue';
import { agentService, type AgentId, type IAgentDefinition } from '@/services/agent.service';
import { voiceSettingsManager, type VoiceApplicationSettings, type TutorLevel } from '@/services/voice.settings.service';
import { useChatStore } from './chat.store';

type VoicePersonaObject = { name?: string; voiceId?: string; lang?: string };

export const useAgentStore = defineStore('agent', () => {
  const _activeAgentId = ref<AgentId>(getInitialActiveAgentId());
  const isLoadingAgent = ref<boolean>(false);
  const agentError = ref<string | null>(null);
  const currentAgentContextInternal = ref<Record<string, any>>({});

  function getInitialActiveAgentId(): AgentId {
    const modeFromSettings = voiceSettingsManager.settings.currentAppMode as AgentId;
    if (modeFromSettings && agentService.getAgentById(modeFromSettings)) {
      return modeFromSettings;
    }
    
    // Defaulting logic relies on agentService methods which should now be robust
    // App.vue might set this more definitively after auth check.
    const defaultPublic = agentService.getDefaultPublicAgent();
    if (defaultPublic) {
      if (voiceSettingsManager.settings.currentAppMode !== defaultPublic.id) {
        voiceSettingsManager.updateSetting('currentAppMode', defaultPublic.id);
      }
      return defaultPublic.id;
    }
    
    const anyDefault = agentService.getDefaultAgent();
    if (anyDefault) {
      if (voiceSettingsManager.settings.currentAppMode !== anyDefault.id) {
        voiceSettingsManager.updateSetting('currentAppMode', anyDefault.id);
      }
      return anyDefault.id;
    }

    console.error("[AgentStore] Critical: No initial or default agent could be determined. Defaulting to 'general_chat'.");
    return 'general_chat'; // Ensure 'general_chat' is a defined AgentId
  }

  const activeAgent = computed<Readonly<IAgentDefinition> | undefined>(() => {
    return agentService.getAgentById(_activeAgentId.value);
  });

  const activeAgentSystemPromptKey = computed<string>(() => {
    return activeAgent.value?.systemPromptKey || 
           (agentService.getDefaultAgent()?.systemPromptKey) || 
           'general_chat';
  });

  const activeAgentInputPlaceholder = computed<string>(() => {
    return activeAgent.value?.inputPlaceholder || 'How can I assist you today?';
  });

  // Corrected: iconPath and avatar are optional on IAgentDefinition
  const activeAgentIcon = computed<{ component: VueComponentType | string | undefined, class?: string, path?: string }>(() => {
    const agent = activeAgent.value;
    if (!agent) return { component: undefined };
    if (agent.iconComponent) {
        return { component: agent.iconComponent, class: agent.iconClass };
    }
    // Fallback to iconPath or avatar if iconComponent is not provided
    const path = agent.iconPath || agent.avatar;
    return { component: undefined, path: path, class: agent.iconClass };
  });
  
  const activeAgentThemeColor = computed<string | undefined>(() => {
    return activeAgent.value?.themeColor; // Added to IAgentDefinition
  });

  const activeAgentHolographicElement = computed<string | undefined>(() => {
    return activeAgent.value?.holographicElement; // Added to IAgentDefinition
  });

  const currentAgentPersonaVoice = computed<string | VoicePersonaObject | undefined>(() => {
    return activeAgent.value?.defaultVoicePersona; // Added to IAgentDefinition
  });


  async function setActiveAgent(agentIdParam: AgentId | null | undefined): Promise<void> {
    let agentIdToSet = agentIdParam;

    if (!agentIdToSet) {
        // Determine default based on auth, assuming auth status is available or App.vue calls this appropriately
        // This is a simplified default setting; App.vue has more context for auth.
        const defaultAgent = agentService.getDefaultAgent(); 
        if (defaultAgent) {
            agentIdToSet = defaultAgent.id;
        } else {
            agentError.value = "No valid agent ID provided and no default agent available.";
            console.error(agentError.value);
            isLoadingAgent.value = false;
            return;
        }
    }
    
    if (_activeAgentId.value === agentIdToSet && activeAgent.value) {
      isLoadingAgent.value = false;
      return; 
    }

    isLoadingAgent.value = true;
    agentError.value = null;
    const chatStoreInstance = useChatStore();
    const previousAgentId = _activeAgentId.value;

    if (previousAgentId && previousAgentId !== agentIdToSet) {
        chatStoreInstance.clearMainContentForAgent(previousAgentId);
        // Consider clearing chat history for previous agent too, or make it configurable
        // chatStoreInstance.clearAgentData(previousAgentId); 
    }
    
    currentAgentContextInternal.value = {}; 

    const newAgent = agentService.getAgentById(agentIdToSet);

    if (newAgent) {
      _activeAgentId.value = newAgent.id;
      if (voiceSettingsManager.settings.currentAppMode !== newAgent.id) {
        voiceSettingsManager.updateSetting('currentAppMode', newAgent.id);
      }
      if (newAgent.defaultVoicePersona) {
        const persona = newAgent.defaultVoicePersona;
        if (typeof persona === 'object' && (persona.name || persona.voiceId)) {
          if (persona.voiceId) voiceSettingsManager.updateSetting('selectedTtsVoiceId', persona.voiceId);
          if (persona.lang) voiceSettingsManager.updateSetting('speechLanguage', persona.lang);
        }
      }
    } else {
      agentError.value = `Agent with ID "${agentIdToSet}" not found. Reverting to default.`;
      console.error(agentError.value);
      const fallbackAgent = agentService.getDefaultAgent();
      if (fallbackAgent) {
        _activeAgentId.value = fallbackAgent.id;
        if (voiceSettingsManager.settings.currentAppMode !== fallbackAgent.id) {
          voiceSettingsManager.updateSetting('currentAppMode', fallbackAgent.id);
        }
      } else {
        _activeAgentId.value = 'general_chat'; // Hard fallback if no default agent
        console.error("[AgentStore] CRITICAL: No default agent available.");
      }
    }
    chatStoreInstance.ensureMainContentForAgent(_activeAgentId.value);
    isLoadingAgent.value = false;
  }

  function updateAgentContext(contextData: Record<string, any>): void {
    currentAgentContextInternal.value = { ...currentAgentContextInternal.value, ...contextData };
  }

  function getAgentContext(agentIdParam?: AgentId): Readonly<Record<string, any>> {
    // This store currently only holds context for the *active* agent.
    // If an agentId is passed and it's not the active one, it returns an empty object.
    if (agentIdParam && agentIdParam !== _activeAgentId.value) {
        return readonly({});
    }
    return readonly(currentAgentContextInternal.value);
  }

  function clearAgentContext(): void {
    currentAgentContextInternal.value = {};
  }

  watch(() => voiceSettingsManager.settings.currentAppMode, (newMode) => {
    const currentModeAsAgentId = newMode as AgentId;
    if (newMode && currentModeAsAgentId !== _activeAgentId.value) {
      // setActiveAgent handles if agentExists internally
      setActiveAgent(currentModeAsAgentId);
    }
  });
  
  return {
    activeAgentId: readonly(_activeAgentId),
    isLoadingAgent: readonly(isLoadingAgent),
    agentError: readonly(agentError),
    currentAgentContext: computed(() => getAgentContext(_activeAgentId.value)),
    activeAgent, // Readonly computed
    activeAgentSystemPromptKey,
    activeAgentInputPlaceholder,
    activeAgentIcon,
    activeAgentThemeColor,
    activeAgentHolographicElement,
    currentAgentPersonaVoice,
    setActiveAgent,
    updateAgentContext,
    clearAgentContext,
    getAgentContext,
  };
});