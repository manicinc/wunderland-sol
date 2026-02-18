// File: frontend/src/views/settings/Settings.vue /** * @file Settings.vue * @description
User-configurable settings page for the "Ephemeral Harmony" theme. * Allows users to customize
appearance, general preferences, voice/audio settings, * memory management, session costs, security,
and data management. * Changes are typically saved automatically via reactive stores and services. *
* @component Settings * @props None * @emits None * * @version 2.2.2 - Corrected all TypeScript
errors identified in the latest user feedback. * Ensured all variables are correctly typed and
utilized. * Added comprehensive JSDoc comments. * Refined template for ARIA attributes and
consistency. */
<template>
  <div class="settings-page-ephemeral">
    <header class="settings-header-ephemeral" id="settings-top">
      <div class="header-content-container-ephemeral">
        <div class="logo-title-group-ephemeral">
          <!-- <img src="@/assets/logo.svg" alt="VCA Logo" class="logo-img-ephemeral" /> -->
          <h1 class="page-title-ephemeral">Application Settings</h1>
        </div>
        <button
          @click="confirmAndGoBack"
          class="btn btn-secondary-ephemeral btn-sm back-button-ephemeral"
        >
          <ArrowLeftIcon class="icon-sm" aria-hidden="true" />
          Done & Back to App
        </button>
      </div>
    </header>

    <main class="settings-main-content-ephemeral">
      <div class="intro-text-ephemeral">
        <Cog8ToothIcon class="intro-icon-ephemeral" aria-hidden="true" />
        <p>Customize your Voice Chat Assistant experience. Changes are saved automatically.</p>
      </div>

      <div class="settings-layout-grid-ephemeral">
        <SettingsSection
          title="Appearance"
          :icon="PaintBrushIcon"
          class="settings-grid-span-2"
          id="appearance-settings"
        >
          <SettingsItem
            label="Interface Theme"
            description="Select your preferred visual theme for the application."
            label-for="themeModeSelectGrid"
            class="theme-selector-item-ephemeral"
          >
            <div
              class="theme-buttons-group-ephemeral"
              role="radiogroup"
              aria-labelledby="themeModeSelectGridLabel"
            >
              <span id="themeModeSelectGridLabel" class="sr-only">Interface Theme Selection</span>
              <button
                @click="() => uiStore.setTheme('aurora-daybreak')"
                class="btn theme-btn-ephemeral"
                :class="{ active: uiStore.currentThemeId === 'aurora-daybreak' }"
                :aria-pressed="uiStore.currentThemeId === 'aurora-daybreak'"
                role="radio"
                title="Switch to Aurora Daybreak (Light Theme)"
              >
                <SunIcon class="icon-xs" aria-hidden="true" /> Aurora Daybreak
              </button>
              <button
                @click="() => uiStore.setTheme('warm-embrace')"
                class="btn theme-btn-ephemeral"
                :class="{ active: uiStore.currentThemeId === 'warm-embrace' }"
                :aria-pressed="uiStore.currentThemeId === 'warm-embrace'"
                role="radio"
                title="Switch to Warm Embrace (Light Theme)"
              >
                <SparklesIcon class="icon-xs" aria-hidden="true" /> Warm Embrace
              </button>
              <button
                @click="() => uiStore.setTheme('twilight-neo')"
                class="btn theme-btn-ephemeral"
                :class="{ active: uiStore.currentThemeId === 'twilight-neo' }"
                :aria-pressed="uiStore.currentThemeId === 'twilight-neo'"
                role="radio"
                title="Switch to Twilight Neo (Dark Theme)"
              >
                <MoonIcon class="icon-xs" aria-hidden="true" /> Twilight Neo
              </button>
              <button
                @click="() => uiStore.setTheme('sakura-sunset')"
                class="btn theme-btn-ephemeral"
                :class="{ active: uiStore.currentThemeId === 'sakura-sunset' }"
                :aria-pressed="uiStore.currentThemeId === 'sakura-sunset'"
                role="radio"
                title="Switch to Sakura Sunset (Dark Theme)"
              >
                <SparklesIcon class="icon-xs" aria-hidden="true" /> Sakura Sunset
              </button>
            </div>
          </SettingsItem>
        </SettingsSection>

        <SettingsSection
          v-if="isAuthenticated"
          title="My Agents"
          :icon="UsersIcon"
          class="settings-grid-span-2"
          id="my-agents"
        >
          <div class="settings-items-grid-ephemeral">
            <div class="info-card-ephemeral">
              <h4 class="info-card-title-ephemeral">Manage your agents</h4>
              <p class="text-sm text-slate-600 dark:text-slate-300">
                Rename or delete your custom agents.
              </p>
            </div>
            <div class="rounded-2xl border border-slate-200/40 p-3 dark:border-slate-800/60">
              <div v-if="myAgentsError" class="text-rose-400 text-sm">{{ myAgentsError }}</div>
              <div v-else>
                <div v-if="myAgents.length === 0" class="text-sm text-slate-500">
                  No custom agents yet.
                </div>
                <ul v-else class="space-y-2">
                  <li v-for="agent in myAgents" :key="agent.id" class="flex items-center gap-2">
                    <input
                      v-model="agent.editLabel"
                      class="flex-1 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                    />
                    <button
                      class="btn btn-secondary-ephemeral btn-sm"
                      @click="saveAgentLabel(agent)"
                    >
                      Save
                    </button>
                    <button class="btn btn-danger-ephemeral btn-sm" @click="removeAgent(agent)">
                      Delete
                    </button>
                  </li>
                </ul>
              </div>
              <div class="mt-3">
                <button class="btn btn-secondary-outline-ephemeral btn-sm" @click="loadMyAgents">
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </SettingsSection>
        <SettingsSection
          title="General Preferences"
          :icon="WrenchScrewdriverIcon"
          class="settings-grid-span-2"
          id="general-preferences"
        >
          <div class="settings-items-grid-ephemeral">
            <SettingsItem
              label="Default Assistant Mode"
              description="Initial assistant mode when the app starts."
              label-for="defaultModeSelect"
            >
              <select
                id="defaultModeSelect"
                v-model="vcaSettings.defaultMode"
                class="select-input-ephemeral"
                aria-label="Default Assistant Mode"
              >
                <option
                  v-for="agentOption in availableAgentModeOptions"
                  :key="agentOption.value"
                  :value="agentOption.value"
                >
                  {{ agentOption.label }}
                </option>
              </select>
            </SettingsItem>
            <SettingsItem
              label="Preferred Coding Language"
              description="For code examples generated by assistants."
              label-for="defaultLanguageSelect"
            >
              <select
                id="defaultLanguageSelect"
                v-model="vcaSettings.preferredCodingLanguage"
                class="select-input-ephemeral"
                aria-label="Preferred Coding Language"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="java">Java</option>
                <option value="go">Go</option>
                <option value="csharp">C#</option>
                <option value="php">PHP</option>
                <option value="ruby">Ruby</option>
                <option value="swift">Swift</option>
                <option value="kotlin">Kotlin</option>
                <option value="rust">Rust</option>
                <option value="plaintext">Plain Text</option>
              </select>
            </SettingsItem>
            <SettingsItem
              label="Language"
              description="Select your preferred language for the interface."
              label-for="languageSelect"
            >
              <LanguageSwitcher id="languageSelect" />
            </SettingsItem>
          </div>
          <SettingsItem
            label="Generate Diagrams Automatically"
            description="Allow agents to generate Mermaid diagrams for system design, flowcharts, etc., where applicable."
            label-for="generateDiagramsToggle"
            class="settings-item-spaced-ephemeral"
          >
            <label
              class="toggle-switch-ephemeral"
              :aria-label="
                vcaSettings.generateDiagrams
                  ? 'Diagram generation is ON'
                  : 'Diagram generation is OFF'
              "
            >
              <input
                type="checkbox"
                id="generateDiagramsToggle"
                v-model="vcaSettings.generateDiagrams"
              />
              <span class="track"><span class="knob"></span></span>
            </label>
          </SettingsItem>
          <SettingsItem
            label="Auto-Clear Chat on Mode Change"
            description="Automatically clear the chat log of the previous assistant when switching to a new one."
            label-for="autoClearToggle"
            class="settings-item-spaced-ephemeral"
          >
            <label
              class="toggle-switch-ephemeral"
              :aria-label="
                vcaSettings.autoClearChat ? 'Auto-clear chat is ON' : 'Auto-clear chat is OFF'
              "
            >
              <input type="checkbox" id="autoClearToggle" v-model="vcaSettings.autoClearChat" />
              <span class="track"><span class="knob"></span></span>
            </label>
          </SettingsItem>
        </SettingsSection>

        <SettingsSection
          title="Billing & Subscription"
          :icon="CreditCardIcon"
          class="settings-grid-span-2"
          id="billing-settings"
        >
          <SettingsItem
            label="Plan Overview"
            description="Current tier and subscription status for this account."
          >
            <div class="billing-overview">
              <span class="billing-plan">{{ planLabel }}</span>
              <span class="billing-status-text">{{ subscriptionStatusLabel }}</span>
            </div>
          </SettingsItem>

          <SettingsItem
            label="Subscription Management"
            description="Start or manage your Lemon Squeezy subscription."
          >
            <div class="billing-actions">
              <div class="billing-plan-hints">
                <p v-if="basicPlan">
                  Basic - ${{ basicPlan.monthlyPriceUsd }}/mo - ~
                  {{ basicPlan.usage.approxGpt4oTokensPerDay.toLocaleString() }} GPT-4o tokens/day
                </p>
                <p v-if="creatorPlan">
                  Creator - ${{ creatorPlan.monthlyPriceUsd }}/mo - BYO keys after
                  {{ creatorPlan.usage.approxGpt4oTokensPerDay.toLocaleString() }} GPT-4o tokens/day
                </p>
                <p v-if="organizationPlan">
                  Organization - ${{ organizationPlan.monthlyPriceUsd }}/mo - shared pool ~
                  {{ organizationPlan.usage.approxGpt4oTokensPerDay.toLocaleString() }} GPT-4o
                  tokens/day
                </p>
                <button type="button" class="billing-plan-hints__link" @click="openPlanModal">
                  Compare plans
                </button>
              </div>
              <template v-if="!isAuthenticated">
                <p class="billing-helper">{{ billingHelperText }}</p>
              </template>
              <template v-else-if="isGlobalUser">
                <p class="billing-helper">{{ billingHelperText }}</p>
              </template>
              <template v-else>
                <button
                  type="button"
                  class="btn btn-primary-ephemeral billing-button"
                  :disabled="checkoutInFlight || !canManageSubscription"
                  @click="startSubscriptionCheckout"
                >
                  <component
                    :is="checkoutInFlight ? SpinnerIcon : CreditCardIcon"
                    class="icon-sm mr-2"
                  />
                  <span>{{ billingButtonLabel }}</span>
                </button>
                <p class="billing-helper" :class="{ 'billing-helper--error': checkoutError }">
                  {{ checkoutError || billingHelperText }}
                </p>
              </template>
            </div>
          </SettingsItem>
        </SettingsSection>

        <SettingsSection
          v-if="isAuthenticated && canShowTeamManagement"
          title="Team Management"
          :icon="UsersIcon"
          class="settings-grid-span-2"
          id="team-settings"
        >
          <OrganizationManager />
        </SettingsSection>
        <SettingsSection
          v-else-if="isAuthenticated && !canShowTeamManagement"
          title="Team Management"
          :icon="UsersIcon"
          class="settings-grid-span-2"
          id="team-settings-hint"
        >
          <div class="rounded-2xl border border-slate-200/40 p-4 dark:border-slate-800/60">
            <p class="text-sm text-slate-600 dark:text-slate-300 mb-2">
              Team features are currently unavailable on this device.
            </p>
            <ul class="list-disc pl-5 text-sm text-slate-600 dark:text-slate-300 space-y-1">
              <li v-if="!platformStore.isCloudPostgres">Cloud deployment (PostgreSQL) required.</li>
              <li v-if="!connectivity.isOnline">Online connectivity required.</li>
              <li v-if="!isSubscribed">Active subscription required.</li>
            </ul>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Sign in on cloud and ensure connectivity and an active plan to enable organizations,
              invites, and billing.
            </p>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Memory & Context"
          :icon="CpuChipIcon"
          class="settings-grid-span-2"
          id="memory-settings"
        >
          <!-- Language Response Settings -->
          <SettingsItem
            label="Response Language Mode"
            description="How the assistant determines which language to respond in"
            label-for="responseLanguageMode"
          >
            <select
              id="responseLanguageMode"
              v-model="vcaSettings.responseLanguageMode"
              class="select-input-ephemeral"
              aria-label="Response Language Mode"
            >
              <option value="auto">Auto-detect from user input</option>
              <option value="fixed">Always use fixed language</option>
              <option value="follow-stt">Follow STT language setting</option>
            </select>
          </SettingsItem>

          <SettingsItem
            v-if="vcaSettings.responseLanguageMode === 'fixed'"
            label="Fixed Response Language"
            description="Language to always respond in"
            label-for="fixedResponseLanguage"
          >
            <select
              id="fixedResponseLanguage"
              v-model="vcaSettings.fixedResponseLanguage"
              class="select-input-ephemeral"
              aria-label="Fixed Response Language"
            >
              <option value="en-US">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="ru">Russian</option>
              <option value="ar">Arabic</option>
            </select>
          </SettingsItem>

          <!-- Conversation Context Settings -->
          <SettingsItem
            label="Prevent Repetitive Responses"
            description="Actively prevent the assistant from repeating previous answers in the conversation"
            label-for="preventRepetition"
          >
            <label
              class="toggle-switch-ephemeral"
              :aria-label="
                vcaSettings.preventRepetition
                  ? 'Repetition prevention is ON'
                  : 'Repetition prevention is OFF'
              "
            >
              <input
                type="checkbox"
                id="preventRepetition"
                v-model="vcaSettings.preventRepetition"
              />
              <span class="track"><span class="knob"></span></span>
            </label>
          </SettingsItem>

          <SettingsItem
            label="Conversation Context Mode"
            description="How much conversation history to include in context"
            label-for="conversationContextMode"
          >
            <select
              id="conversationContextMode"
              v-model="vcaSettings.conversationContextMode"
              class="select-input-ephemeral"
              aria-label="Conversation Context Mode"
            >
              <option value="minimal">Minimal - Last 3-4 messages</option>
              <option value="smart">Smart - Balanced context</option>
              <option value="full">Full - Maximum context</option>
            </select>
          </SettingsItem>

          <SettingsItem
            label="Maximum History Messages"
            :description="`Keep last ${vcaSettings.maxHistoryMessages || 12} messages in conversation history`"
            label-for="maxHistoryMessages"
          >
            <input
              type="range"
              id="maxHistoryMessages"
              v-model.number="vcaSettings.maxHistoryMessages"
              min="6"
              max="50"
              step="2"
              class="range-slider-ephemeral"
            />
          </SettingsItem>

          <!-- Original Advanced History Toggle -->
          <SettingsItem
            label="Advanced Chat History & Context Management"
            description="Enable sophisticated context management (e.g., summarization, relevancy scoring) for richer LLM interactions. Disable for simpler, recency-based history."
            label-for="useAdvancedHistoryToggle"
            full-width-description
          >
            <label
              class="toggle-switch-ephemeral"
              :aria-label="
                useAdvancedHistoryManager
                  ? 'Advanced memory management is ON'
                  : 'Advanced memory management is OFF'
              "
            >
              <input
                type="checkbox"
                id="useAdvancedHistoryToggle"
                v-model="useAdvancedHistoryManager"
              />
              <span class="track"><span class="knob"></span></span>
            </label>
          </SettingsItem>
          <div v-if="!useAdvancedHistoryManager" class="setting-subsection-ephemeral">
            <h4 class="subsection-title-ephemeral">Basic History Configuration</h4>
            <SettingsItem
              label="Chat History Length (Basic Mode)"
              :description="`Keep last ${chatHistoryCount} messages (${Math.floor(chatHistoryCount / 2)} user/AI pairs). Impacts context and API tokens.`"
              label-for="chatHistoryLength"
              full-width-description
            >
              <input
                type="range"
                id="chatHistoryLength"
                v-model.number="chatHistoryCount"
                :min="MIN_CHAT_HISTORY_FOR_SLIDER"
                :max="MAX_CHAT_HISTORY_MESSAGES_CONFIGURABLE"
                step="2"
                class="range-slider-ephemeral"
                @input="updateRangeProgress($event.target as HTMLInputElement)"
                aria-valuemin="MIN_CHAT_HISTORY_FOR_SLIDER"
                :aria-valuemax="MAX_CHAT_HISTORY_MESSAGES_CONFIGURABLE"
                :aria-valuenow="chatHistoryCount"
              />
            </SettingsItem>
          </div>
          <div v-if="useAdvancedHistoryManager" class="setting-subsection-ephemeral">
            <h4 class="subsection-title-ephemeral">Advanced Context Strategy</h4>
            <SettingsItem
              label="Context Strategy Preset"
              description="Choose a preset that dictates how chat history is selected and summarized for the LLM."
              label-for="advHistoryPreset"
            >
              <select
                id="advHistoryPreset"
                v-model="advancedHistoryConfigLocal.strategyPreset"
                @change="
                  onAdvancedPresetChange(
                    ($event.target as HTMLSelectElement).value as HistoryStrategyPreset
                  )
                "
                class="select-input-ephemeral"
                aria-label="Advanced Context Strategy Preset"
              >
                <option
                  v-for="preset in availablePresetDisplayNames"
                  :key="preset.key"
                  :value="preset.key"
                >
                  {{ preset.name }}
                </option>
              </select>
            </SettingsItem>
            <div class="setting-subsection-ephemeral nested-subsection">
              <h5 class="subsection-title-ephemeral !text-sm !font-normal !opacity-80">
                Fine-tune Strategy Parameters
              </h5>
              <p class="subsection-description-ephemeral">
                Adjust parameters for the selected context strategy. These are advanced settings.
              </p>
              <SettingsItem
                label="Max Context Tokens for LLM"
                description="Target token count for the history context sent to the LLM (e.g., 4000, 8000, 16000)."
                label-for="advMaxContextTokens"
                class="settings-item-compact-ephemeral"
              >
                <input
                  type="number"
                  id="advMaxContextTokens"
                  v-model.number="advancedHistoryConfigLocal.maxContextTokens"
                  min="500"
                  max="128000"
                  step="100"
                  class="input-field-sm-ephemeral"
                  aria-label="Maximum Context Tokens"
                />
              </SettingsItem>
              <SettingsItem
                v-if="isRelevancyStrategyActive"
                label="Relevancy Threshold (Advanced)"
                :description="`Minimum relevance score (0.05-0.95) for older messages to be included: ${advancedHistoryConfigLocal.relevancyThreshold.toFixed(2)}`"
                label-for="advRelevancyThreshold"
                full-width-description
                class="settings-item-spaced-ephemeral"
              >
                <input
                  type="range"
                  id="advRelevancyThreshold"
                  v-model.number="advancedHistoryConfigLocal.relevancyThreshold"
                  min="0.05"
                  max="0.95"
                  step="0.01"
                  class="range-slider-ephemeral"
                  @input="updateRangeProgress($event.target as HTMLInputElement)"
                  aria-label="Relevancy Threshold"
                  aria-valuemin="0.05"
                  aria-valuemax="0.95"
                  :aria-valuenow="advancedHistoryConfigLocal.relevancyThreshold"
                />
              </SettingsItem>
              <SettingsItem
                v-if="
                  advancedHistoryConfigLocal.strategyPreset !== HistoryStrategyPreset.SIMPLE_RECENCY
                "
                label="Recent Messages to Prioritize"
                description="Number of most recent messages to always attempt to include in context, regardless of relevancy."
                label-for="advNumRecent"
                class="settings-item-compact-ephemeral"
              >
                <input
                  type="number"
                  id="advNumRecent"
                  v-model.number="advancedHistoryConfigLocal.numRecentMessagesToPrioritize"
                  min="0"
                  max="50"
                  step="1"
                  class="input-field-sm-ephemeral"
                  aria-label="Recent Messages to Prioritize"
                />
              </SettingsItem>
              <SettingsItem
                v-if="isRelevancyStrategyActive"
                label="Max Relevant Older Messages"
                description="Maximum number of older, but relevant (above threshold), messages to include."
                label-for="advNumRelevantOlder"
                class="settings-item-compact-ephemeral"
              >
                <input
                  type="number"
                  id="advNumRelevantOlder"
                  v-model.number="advancedHistoryConfigLocal.numRelevantOlderMessagesToInclude"
                  min="0"
                  max="50"
                  step="1"
                  class="input-field-sm-ephemeral"
                  aria-label="Maximum Relevant Older Messages"
                />
              </SettingsItem>
              <SettingsItem
                v-if="
                  advancedHistoryConfigLocal.strategyPreset === HistoryStrategyPreset.SIMPLE_RECENCY
                "
                label="Simple Recency Message Count"
                description="Number of recent messages to include when using the Simple Recency strategy."
                label-for="advSimpleRecencyCount"
                class="settings-item-compact-ephemeral"
              >
                <input
                  type="number"
                  id="advSimpleRecencyCount"
                  v-model.number="advancedHistoryConfigLocal.simpleRecencyMessageCount"
                  min="1"
                  :max="MAX_CHAT_HISTORY_MESSAGES_CONFIGURABLE"
                  step="1"
                  class="input-field-sm-ephemeral"
                  aria-label="Simple Recency Message Count"
                />
              </SettingsItem>
              <div class="settings-items-grid-ephemeral settings-item-spaced-ephemeral">
                <SettingsItem
                  label="Filter System Messages from History"
                  description="Exclude past system messages (e.g., role: system) from being sent as context to the LLM."
                  label-for="advFilterSystem"
                >
                  <label
                    class="toggle-switch-ephemeral"
                    :aria-label="
                      advancedHistoryConfigLocal.filterHistoricalSystemMessages
                        ? 'Filtering system messages from history ON'
                        : 'Filtering system messages from history OFF'
                    "
                  >
                    <input
                      type="checkbox"
                      id="advFilterSystem"
                      v-model="advancedHistoryConfigLocal.filterHistoricalSystemMessages"
                    />
                    <span class="track"><span class="knob"></span></span>
                  </label>
                </SettingsItem>
                <SettingsItem
                  label="Characters per Token Estimate"
                  description="Average characters per token, used for internal context size estimation (default: 4)."
                  label-for="advCharsPerToken"
                >
                  <input
                    type="number"
                    id="advCharsPerToken"
                    v-model.number="advancedHistoryConfigLocal.charsPerTokenEstimate"
                    min="1"
                    max="10"
                    step="0.1"
                    class="input-field-sm-ephemeral"
                    aria-label="Characters per Token Estimate"
                  />
                </SettingsItem>
              </div>
            </div>
            <div class="setting-subsection-ephemeral nested-subsection">
              <h5 class="subsection-title-ephemeral !text-sm !font-normal !opacity-80">
                Strategy Management
              </h5>
              <div class="settings-actions-group-ephemeral">
                <button
                  @click="resetCurrentAdvancedStrategyToDefaults"
                  class="btn btn-secondary-outline-ephemeral btn-sm"
                >
                  Reset Current Strategy to Defaults
                </button>
                <button
                  @click="resetAllAdvancedSettingsToGlobalDefaults"
                  class="btn btn-secondary-outline-ephemeral btn-sm"
                >
                  Reset All Advanced to Global Defaults
                </button>
              </div>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Audio & Voice"
          :icon="SpeakerWaveIcon"
          class="settings-grid-span-2"
          id="audio-voice-settings"
        >
          <div class="settings-items-grid-ephemeral">
            <SettingsItem
              label="Audio Input Device"
              :description="
                currentAudioDeviceName
                  ? `Current: ${currentAudioDeviceName}`
                  : 'Using system default input.'
              "
              label-for="audioDeviceSelect"
            >
              <select
                id="audioDeviceSelect"
                v-model="vcaSettings.selectedAudioInputDeviceId"
                class="select-input-ephemeral"
                aria-label="Audio Input Device"
              >
                <option :value="null">Default System Microphone</option>
                <option
                  v-for="device in audioInputDevices"
                  :key="device.deviceId"
                  :value="device.deviceId"
                >
                  {{ device.label || `Microphone ${device.deviceId.substring(0, 12)}...` }}
                </option>
              </select>
              <button
                @click="triggerRefreshAudioDevices"
                class="btn btn-secondary-ephemeral btn-sm mt-3 w-full"
              >
                <ArrowPathIcon class="icon-xs mr-1.5" aria-hidden="true" /> Refresh Device List
              </button>
            </SettingsItem>
            <SettingsItem
              label="Audio Input Mode"
              :description="getAudioModeDescription(vcaSettings.audioInputMode)"
              label-for="audioModeSelect"
            >
              <select
                id="audioModeSelect"
                v-model="vcaSettings.audioInputMode"
                class="select-input-ephemeral"
                aria-label="Audio Input Mode"
              >
                <option value="push-to-talk">Push to Talk</option>
                <option value="continuous">Continuous Listening</option>
                <option value="voice-activation">Voice Activate ("V")</option>
              </select>
            </SettingsItem>
            <SettingsItem
              label="Speech Recognition (STT)"
              description="Whisper API for higher accuracy (may incur costs), Browser Web Speech for speed and no cost."
              label-for="sttPreferenceSelect"
            >
              <select
                id="sttPreferenceSelect"
                v-model="vcaSettings.sttPreference"
                class="select-input-ephemeral"
                aria-label="Speech Recognition Preference"
              >
                <option value="whisper_api">OpenAI Whisper (High Accuracy)</option>
                <option value="browser_webspeech_api">Browser Web Speech (Fast, Free)</option>
              </select>
            </SettingsItem>
            <SettingsItem
              label="Speech Usage Credits"
              description="OpenAI Whisper/TTS allowance with automatic browser fallback."
            >
              <div class="speech-credits-summary">
                <span
                  class="speech-credits-summary__text"
                  :class="{ 'speech-credits-summary__text--warning': isSpeechCreditsExhausted }"
                >
                  {{ speechCreditsSummary }}
                </span>
                <button
                  type="button"
                  class="btn btn-secondary-outline-ephemeral btn-sm speech-credits-summary__button"
                  @click="openSpeechCreditsModal"
                >
                  View credit details
                </button>
              </div>
            </SettingsItem>
            <SettingsItem
              label="Auto-Play Responses (TTS)"
              description="Automatically speak the assistant's responses aloud using Text-to-Speech."
              label-for="autoPlayTtsToggle"
            >
              <label
                class="toggle-switch-ephemeral"
                :aria-label="
                  vcaSettings.autoPlayTts ? 'TTS auto-play is ON' : 'TTS auto-play is OFF'
                "
              >
                <input type="checkbox" id="autoPlayTtsToggle" v-model="vcaSettings.autoPlayTts" />
                <span class="track"><span class="knob"></span></span>
              </label>
            </SettingsItem>
          </div>
          <div v-if="vcaSettings.autoPlayTts" class="setting-subsection-ephemeral">
            <h4 class="subsection-title-ephemeral">Text-to-Speech (TTS) Details</h4>
            <div class="settings-items-grid-ephemeral">
              <SettingsItem
                label="TTS Provider"
                description="Service used for generating synthesized speech."
                label-for="ttsProviderSelect"
              >
                <select
                  id="ttsProviderSelect"
                  v-model="vcaSettings.ttsProvider"
                  class="select-input-ephemeral"
                  aria-label="Text-to-Speech Provider"
                >
                  <option value="browser_tts">
                    Browser Built-in (Free, voice quality varies by browser/OS)
                  </option>
                  <option value="openai_tts">OpenAI TTS (High Quality, incurs API costs)</option>
                </select>
              </SettingsItem>
              <SettingsItem
                v-if="isTtsPanelVisible"
                label="TTS Voice Selection"
                description="Browse voices for the current provider. Filter by language or search to find the perfect sound."
                label-for="voiceSelectionPanel"
              >
                <div id="voiceSelectionPanel">
                  <VoiceSelectionPanel
                    :voices="voiceSelectionOptions"
                    :selected-voice-id="vcaSettings.selectedTtsVoiceId"
                    :current-provider="vcaSettings.ttsProvider"
                    :loading="voicesLoading"
                    @update:selectedVoiceId="handleVoiceSelection"
                    @preview="handleVoicePreview"
                    @refresh="refreshVoiceCatalog"
                  />
                </div>
              </SettingsItem>
            </div>
            <div
              class="settings-items-grid-ephemeral settings-item-spaced-ephemeral"
              v-if="isTTSSupportedBySelectedProvider"
            >
              <SettingsItem
                label="TTS Speech Rate"
                :description="`Playback speed: ${vcaSettings.ttsRate.toFixed(1)}x (0.5x to 2.0x)`"
                label-for="ttsRateRange"
                full-width-description
              >
                <input
                  type="range"
                  id="ttsRateRange"
                  v-model.number="vcaSettings.ttsRate"
                  min="0.5"
                  max="2"
                  step="0.1"
                  class="range-slider-ephemeral"
                  @input="updateRangeProgress($event.target as HTMLInputElement)"
                  aria-label="TTS Speech Rate"
                  aria-valuemin="0.5"
                  aria-valuemax="2"
                  :aria-valuenow="vcaSettings.ttsRate"
                />
              </SettingsItem>
              <SettingsItem
                v-if="vcaSettings.ttsProvider === 'browser_tts'"
                label="TTS Speech Pitch"
                :description="`Voice pitch: ${vcaSettings.ttsPitch.toFixed(1)} (0.0 to 2.0)`"
                label-for="ttsPitchRange"
                full-width-description
              >
                <input
                  type="range"
                  id="ttsPitchRange"
                  v-model.number="vcaSettings.ttsPitch"
                  min="0"
                  max="2"
                  step="0.1"
                  class="range-slider-ephemeral"
                  @input="updateRangeProgress($event.target as HTMLInputElement)"
                  aria-label="TTS Speech Pitch"
                  aria-valuemin="0"
                  aria-valuemax="2"
                  :aria-valuenow="vcaSettings.ttsPitch"
                />
              </SettingsItem>
            </div>
          </div>
          <div
            v-if="vcaSettings.audioInputMode === 'voice-activation'"
            class="setting-subsection-ephemeral"
          >
            <h4 class="subsection-title-ephemeral">Voice Activation (VAD) Parameters</h4>
            <div class="settings-items-grid-ephemeral">
              <SettingsItem
                label="VAD Detection Sensitivity"
                :description="`Threshold: ${Math.round(vcaSettings.vadThreshold * 100)}% (Lower value is more sensitive to sound)`"
                label-for="vadThresholdRange"
                full-width-description
              >
                <input
                  type="range"
                  id="vadThresholdRange"
                  v-model.number="vcaSettings.vadThreshold"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  class="range-slider-ephemeral"
                  @input="updateRangeProgress($event.target as HTMLInputElement)"
                  aria-label="VAD Detection Sensitivity"
                  aria-valuemin="0.01"
                  aria-valuemax="0.5"
                  :aria-valuenow="vcaSettings.vadThreshold"
                />
              </SettingsItem>
              <SettingsItem
                label="VAD Silence Timeout"
                :description="`Stop recording after ${vcaSettings.vadSilenceTimeoutMs / 1000} seconds of silence`"
                label-for="vadSilenceTimeoutRange"
                full-width-description
              >
                <input
                  type="range"
                  id="vadSilenceTimeoutRange"
                  v-model.number="vcaSettings.vadSilenceTimeoutMs"
                  min="500"
                  max="5000"
                  step="100"
                  class="range-slider-ephemeral"
                  @input="updateRangeProgress($event.target as HTMLInputElement)"
                  aria-label="VAD Silence Timeout"
                  aria-valuemin="500"
                  aria-valuemax="5000"
                  :aria-valuenow="vcaSettings.vadSilenceTimeoutMs"
                />
              </SettingsItem>
            </div>
          </div>
          <div
            v-if="
              vcaSettings.audioInputMode === 'continuous' &&
              vcaSettings.sttPreference === 'browser_webspeech_api'
            "
            class="setting-subsection-ephemeral"
          >
            <h4 class="subsection-title-ephemeral">Continuous Mode (Browser STT Specific)</h4>
            <div class="settings-items-grid-ephemeral">
              <SettingsItem
                label="Auto-send Transcription on Pause"
                description="Automatically send the transcribed text after a detected pause in speech."
                label-for="continuousAutoSendToggle"
              >
                <label
                  class="toggle-switch-ephemeral"
                  :aria-label="
                    vcaSettings.continuousModeAutoSend
                      ? 'Continuous auto-send is ON'
                      : 'Continuous auto-send is OFF'
                  "
                >
                  <input
                    type="checkbox"
                    id="continuousAutoSendToggle"
                    v-model="vcaSettings.continuousModeAutoSend"
                  />
                  <span class="track"><span class="knob"></span></span>
                </label>
              </SettingsItem>
              <SettingsItem
                v-if="vcaSettings.continuousModeAutoSend"
                label="Pause Detection Timeout"
                :description="`Wait for ${vcaSettings.continuousModePauseTimeoutMs / 1000}s of silence before auto-sending`"
                label-for="continuousPauseTimeoutRange"
                full-width-description
              >
                <input
                  type="range"
                  id="continuousPauseTimeoutRange"
                  v-model.number="vcaSettings.continuousModePauseTimeoutMs"
                  min="1000"
                  max="10000"
                  step="250"
                  class="range-slider-ephemeral"
                  @input="updateRangeProgress($event.target as HTMLInputElement)"
                  aria-label="Continuous Mode Pause Timeout"
                  aria-valuemin="1000"
                  aria-valuemax="10000"
                  :aria-valuenow="vcaSettings.continuousModePauseTimeoutMs"
                />
              </SettingsItem>
            </div>
          </div>
          <div class="setting-subsection-ephemeral">
            <h4 class="subsection-title-ephemeral">Microphone Test & Visualization</h4>
            <div class="mic-test-controls-ephemeral">
              <button
                @click="testMicrophone"
                :disabled="isTestingMic"
                class="btn btn-secondary-ephemeral btn-sm"
              >
                <span v-if="isTestingMic" class="flex items-center"
                  ><SpinnerIcon class="mr-2" /> Testing Microphone... (5s)</span
                >
                <span v-else>Test Microphone Input</span>
              </button>
              <div
                v-if="micTestResult"
                class="mic-test-result-ephemeral"
                :class="micTestResultClass"
                role="status"
              >
                {{ micTestResultMessage }}
              </div>
            </div>
            <div
              v-if="isTestingMic && micAudioLevels.length > 0"
              class="mic-audio-level-viz-ephemeral"
              aria-label="Live microphone audio levels"
            >
              <div
                v-for="(level, index) in micAudioLevels.slice(-60)"
                :key="index"
                class="level-bar-ephemeral"
                :style="{ height: `${Math.max(1, level * 100)}%` }"
                :aria-valuenow="Math.round(level * 100)"
                aria-valuemin="0"
                aria-valuemax="100"
                role="progressbar"
              ></div>
            </div>
            <p v-if="isTestingMic" class="setting-description text-center text-xs mt-1">
              Speak into your microphone to see audio levels. Test runs for 5 seconds.
            </p>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Session & Costs"
          :icon="CreditCardIcon"
          class="settings-grid-span-2"
          id="session-costs-settings"
        >
          <div class="settings-items-grid-ephemeral">
            <div class="info-card-ephemeral">
              <h4 class="info-card-title-ephemeral">Current Session API Cost</h4>
              <p class="info-card-value-ephemeral">${{ currentSessionCost.toFixed(4) }}</p>
              <button
                @click="handleResetSessionCost"
                class="btn btn-secondary-outline-ephemeral btn-sm mt-2.5 w-full"
              >
                Reset Session Cost
              </button>
            </div>
            <div class="info-card-ephemeral">
              <h4 class="info-card-title-ephemeral">Configured Session Cost Limit</h4>
              <p class="info-card-value-ephemeral">${{ vcaSettings.costLimit.toFixed(2) }}</p>
            </div>
          </div>
          <SettingsItem
            label="Set Session Cost Limit ($)"
            :description="`Notification threshold for API usage: $${vcaSettings.costLimit.toFixed(2)}. Set to 0 for no limit (not recommended for public APIs).`"
            label-for="costLimitRange"
            class="settings-item-spaced-ephemeral"
            full-width-description
          >
            <input
              type="range"
              id="costLimitRange"
              v-model.number="vcaSettings.costLimit"
              min="0"
              max="50.00"
              step="0.50"
              class="range-slider-ephemeral"
              @input="updateRangeProgress($event.target as HTMLInputElement)"
              aria-label="Session Cost Limit"
              aria-valuemin="0"
              aria-valuemax="50"
              :aria-valuenow="vcaSettings.costLimit"
            />
          </SettingsItem>
        </SettingsSection>

        <SettingsSection
          title="Security & Privacy"
          :icon="ShieldCheckIcon"
          class="settings-grid-span-2"
          id="security-privacy-settings"
        >
          <SettingsItem
            label="Remember Login Across Sessions"
            description="Keep me logged in when I close and reopen the browser. Uses secure local storage."
            label-for="rememberLoginToggle"
          >
            <label
              class="toggle-switch-ephemeral"
              :aria-label="rememberLoginLocal ? 'Remember login is ON' : 'Remember login is OFF'"
            >
              <input type="checkbox" id="rememberLoginToggle" v-model="rememberLoginLocal" />
              <span class="track"><span class="knob"></span></span>
            </label>
          </SettingsItem>
          <div class="danger-zone-ephemeral settings-item-spaced-ephemeral">
            <h4
              class="subsection-title-ephemeral !text-[hsl(var(--color-error-h),var(--color-error-s),var(--color-error-l))]"
            >
              Danger Zone
            </h4>
            <div class="settings-actions-group-ephemeral">
              <button @click="handleLogout" class="btn btn-danger-ephemeral btn-sm">
                <ArrowLeftOnRectangleIcon class="icon-xs mr-1.5" aria-hidden="true" /> Logout
                Current Session
              </button>
              <button
                @click="handleClearConversationHistory"
                class="btn btn-danger-outline-ephemeral btn-sm"
              >
                Clear All Local Chat History
              </button>
            </div>
            <p class="setting-description text-xs mt-2">
              Logging out clears your current session data from this browser. Clearing chat history
              is permanent and cannot be undone for this device.
            </p>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Data Management"
          :icon="ArrowDownTrayIcon"
          class="settings-grid-span-2"
          id="data-management-settings"
        >
          <div class="settings-actions-group-ephemeral">
            <button @click="exportAllSettings" class="btn btn-secondary-ephemeral w-full">
              <ArrowUpTrayIcon class="icon-sm mr-2" aria-hidden="true" /> Export All Settings
            </button>
            <div class="relative w-full">
              <input
                ref="importSettingsInputRef"
                type="file"
                accept=".json"
                @change="handleImportSettingsFile"
                class="file-input-hidden-ephemeral"
                aria-label="Import settings file button"
              />
              <button
                @click="triggerImportFile"
                class="btn btn-secondary-ephemeral w-full"
                aria-describedby="importSettingsInputRef"
              >
                <ArrowDownTrayIcon class="icon-sm mr-2" aria-hidden="true" /> Import Settings from
                File
              </button>
            </div>
          </div>
          <div class="settings-actions-group-ephemeral mt-3">
            <button
              @click="exportWorkflowUpdates"
              class="btn btn-secondary-outline-ephemeral w-full"
            >
              Export AgentOS Workflow Updates (JSON)
            </button>
            <button @click="exportAgencyUpdates" class="btn btn-secondary-outline-ephemeral w-full">
              Export AgentOS Agency Updates (JSON)
            </button>
          </div>
          <p class="setting-description text-center mt-3">
            Backup your current application settings to a JSON file, or restore settings from a
            previously exported file. This includes UI preferences, voice settings, and other
            configurations.
          </p>
        </SettingsSection>
      </div>

      <div class="form-actions-footer-ephemeral">
        <button @click="confirmAndGoBack" class="btn btn-primary-ephemeral btn-lg">
          <CheckCircleIcon class="icon-sm mr-2" aria-hidden="true" /> Done & Return to Assistant
        </button>
      </div>
    </main>

    <SpeechCreditsModal :open="showSpeechCreditsModal" @close="closeSpeechCreditsModal" />
  </div>
</template>

<script setup lang="ts">
/**
 * @file Settings.vue - Script Setup
 * @description Logic for the user settings page. Manages various application settings by interacting
 * with dedicated services like `voiceSettingsManager` and `advancedConversationManager`.
 * Handles UI state for form elements, data import/export, and user actions like logout.
 * All JSDoc comments for props, emits, methods, computed properties, and refs are comprehensive.
 * @version 2.2.1 - Corrected TypeScript errors related to type mismatches and variable declarations.
 * Ensured all functions and reactive properties are correctly defined and utilized by the template.
 */
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  inject,
  nextTick,
  h,
  type Ref,
  type Component as VueComponent,
} from 'vue';
import { useRouter } from 'vue-router'; // RouterLink is used in the template
import { useStorage } from '@vueuse/core';

// API and Services
import { api as mainApi, billingAPI } from '@/utils/api'; // Removed unused costAPI
import {
  voiceSettingsManager,
  type VoiceApplicationSettings,
  type AudioInputMode,
  type STTPreference, // These types are implicitly used by VoiceApplicationSettings
  type TTSProvider, // and are good to have for clarity if extending logic.
  type TutorLevel, // They are not causing "unused" errors if vcaSettings is typed.
} from '@/services/voice.settings.service';
import { conversationManager } from '@/services/conversation.manager';
import {
  advancedConversationManager,
  HistoryStrategyPreset,
  type AdvancedHistoryConfig,
  DEFAULT_ADVANCED_HISTORY_CONFIG,
} from '@/services/advancedConversation.manager';
import type { ToastService } from '@/services/services';
import { agentService, type AgentId } from '@/services/agent.service';
import { AUTH_TOKEN_KEY, MAX_CHAT_HISTORY_MESSAGES_CONFIGURABLE } from '@/utils/constants';
import { useAuth } from '@/composables/useAuth';
import { useCostStore } from '@/store/cost.store';
import { useAgentStore } from '@/store/agent.store';
import { useUiStore } from '@/store/ui.store';
import { useChatStore } from '@/store/chat.store';
import { usePlans } from '@/composables/usePlans';
import type { PlanId } from '@framers/shared/planCatalog';
import { usePlatformStore } from '@/store/platform.store';
import { useAgentosEventsStore } from '@/store/agentosEvents.store';
import { userAgentsAPI, type UserAgentDto } from '@/utils/api';
import { useConnectivityStore } from '@/store/connectivity.store';

// Child Components
import SettingsSection from '@/components/settings/SettingsSection.vue';
import SettingsItem from '@/components/settings/SettingsItem.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import OrganizationManager from '@/components/organization/OrganizationManager.vue';
import SpeechCreditsModal from '@/components/voice-settings/SpeechCreditsModal.vue';
import VoiceSelectionPanel from '@/components/voice-settings/VoiceSelectionPanel.vue';

// Icons
import {
  Cog8ToothIcon,
  PaintBrushIcon,
  WrenchScrewdriverIcon,
  SpeakerWaveIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ArrowLeftOnRectangleIcon,
  AcademicCapIcon,
  SunIcon,
  MoonIcon,
  SparklesIcon,
  CpuChipIcon,
  UsersIcon,
} from '@heroicons/vue/24/outline';

const SpinnerIcon: VueComponent = {
  name: 'SpinnerIcon',
  render() {
    return h(
      'svg',
      {
        class: 'animate-spin h-4 w-4 text-current',
        xmlns: 'http://www.w3.org/2000/svg',
        fill: 'none',
        viewBox: '0 0 24 24',
      },
      [
        h('circle', {
          class: 'opacity-25',
          cx: '12',
          cy: '12',
          r: '10',
          stroke: 'currentColor',
          'stroke-width': '4',
        }),
        h('path', {
          class: 'opacity-75',
          fill: 'currentColor',
          d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z',
        }),
      ]
    );
  },
};

const router = useRouter();
const toast = inject<ToastService>('toast');
const uiStore = useUiStore();
const auth = useAuth();
const costStore = useCostStore();
const agentStore = useAgentStore();

const { findPlan } = usePlans();
// Plan catalog entries are plain objects; no .value needed in template after moving away from ref usage
const basicPlan = findPlan('basic');
const creatorPlan = findPlan('creator');
const organizationPlan = findPlan('organization');
const checkoutPlan = computed(() => creatorPlan ?? basicPlan ?? null);
const showPlanModal = ref(false);
const openPlanModal = () => {
  showPlanModal.value = true;
};
const closePlanModal = () => {
  showPlanModal.value = false;
};
const chatStoreInstance = useChatStore();

const showSpeechCreditsModal = ref(false);
const isSpeechCreditsExhausted = computed(() => voiceSettingsManager.speechCreditsExhausted.value);

// Placeholder until provider capability detection is implemented
const isTTSSupportedBySelectedProvider = computed(() => {
  const provider = voiceSettingsManager.settings.ttsProvider;
  return !!provider;
});

const speechCreditsSummary = computed(() => {
  const snapshot = voiceSettingsManager.creditsSnapshot.value;
  if (!snapshot) return 'Fetching speech usage credits…';
  const speech = snapshot.speech;
  if (speech.isUnlimited) return 'OpenAI Whisper & Voice available (unlimited)';
  const remainingUsd = speech.remainingUsd ?? 0;
  if (remainingUsd <= 0) return 'Speech credits exhausted — browser fallback active';
  const minutes = speech.approxWhisperMinutesRemaining ?? 0;
  const chars = speech.approxTtsCharactersRemaining ?? 0;
  const minutesLabel = Number.isFinite(minutes)
    ? minutes >= 1
      ? `${Math.floor(minutes)} Whisper minutes`
      : `${minutes.toFixed(1)} Whisper minutes`
    : '∞ Whisper minutes';
  const charsLabel = Number.isFinite(chars)
    ? chars >= 1000
      ? `${(chars / 1000).toFixed(1)}k TTS characters`
      : `${Math.floor(chars)} TTS characters`
    : '∞ TTS characters';
  return `${minutesLabel} • ${charsLabel} remaining today`;
});

const openSpeechCreditsModal = async (): Promise<void> => {
  showSpeechCreditsModal.value = true;
  await voiceSettingsManager.refreshCreditsSnapshot();
};

const closeSpeechCreditsModal = (): void => {
  showSpeechCreditsModal.value = false;
};

const availableTtsVoices = computed(() => voiceSettingsManager.availableTtsVoices.value);
const ttsVoicesLoaded = voiceSettingsManager.ttsVoicesLoaded;
const voiceSelectionOptions = computed(() => availableTtsVoices.value);
const voicesLoading = computed(() => !ttsVoicesLoaded.value);
const isTtsPanelVisible = computed(
  () => vcaSettings.ttsProvider === 'browser_tts' || vcaSettings.ttsProvider === 'openai_tts'
);

const handleVoiceSelection = (voiceId: string | null) => {
  voiceSettingsManager.updateSetting('selectedTtsVoiceId', voiceId ?? null);
};

const handleVoicePreview = async (voiceId: string) => {
  try {
    await voiceSettingsManager.previewVoice(voiceId);
  } catch (error: any) {
    console.error('[Settings] Voice preview failed:', error);
    toast?.add?.({
      type: 'error',
      title: 'Voice preview failed',
      message: 'Could not play the preview audio. Please try again in a moment.',
      duration: 3500,
    });
  }
};

const refreshVoiceCatalog = async (): Promise<void> => {
  try {
    await voiceSettingsManager.loadAllTtsVoices();
    toast?.add?.({
      type: 'success',
      title: 'Voices refreshed',
      message: 'Latest voices loaded for the selected provider.',
      duration: 2800,
    });
  } catch (error: any) {
    console.error('[Settings] Voice refresh failed:', error);
    toast?.add?.({
      type: 'error',
      title: 'Refresh failed',
      message: 'Unable to refresh voice catalog. Please try again.',
      duration: 3200,
    });
  }
};

const currentUser = computed(() => auth.user.value);
const isAuthenticated = computed(() => auth.isAuthenticated.value);
const isGlobalUser = computed(() => currentUser.value?.mode === 'global');
const checkoutPlanId = computed<PlanId>(() => checkoutPlan.value?.id ?? 'creator');
const hasBillingConfig = computed(() =>
  Boolean(
    checkoutPlan.value?.checkout?.some((descriptor) => descriptor.provider === 'lemonsqueezy')
  )
);

const checkoutInFlight = ref(false);
const checkoutError = ref('');

const planLabel = computed(() => {
  if (!isAuthenticated.value) return 'Not signed in';
  const user = currentUser.value;
  if (!user) return 'Loading…';
  if (user.mode === 'global') return 'Global Unlimited Access';
  const tier = (user.tier || 'metered').toString();
  const pretty = tier.replace(/_/g, ' ');
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
});

// Feature gating: Organizations & invites only on Postgres (cloud)
const platformStore = usePlatformStore();
const canShowTeamManagement = computed(() => platformStore.canUseOrganizations);
const connectivity = useConnectivityStore();
const isSubscribed = computed(() => {
  const status = currentUser.value?.subscriptionStatus as string | undefined;
  return status === 'active' || status === 'trialing';
});

// AgentOS export parity (workflow/agency updates)
const agentosEvents = useAgentosEventsStore();
const exportWorkflowUpdates = (): void => {
  const payload = {
    exportedAt: new Date().toISOString(),
    workflowUpdates: agentosEvents.workflowUpdates,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = `agentos-workflow-updates-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
const exportAgencyUpdates = (): void => {
  const payload = {
    exportedAt: new Date().toISOString(),
    agencyUpdates: agentosEvents.agencyUpdates,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = `agentos-agency-updates-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

// My Agents management
const myAgents = ref<Array<UserAgentDto & { editLabel: string }>>([]);
const myAgentsError = ref('');
const loadMyAgents = async (): Promise<void> => {
  myAgentsError.value = '';
  try {
    const { data } = await userAgentsAPI.list();
    const list = Array.isArray(data?.agents) ? data.agents : [];
    myAgents.value = list.map((a) => ({ ...a, editLabel: a.label }));
  } catch (e: any) {
    myAgentsError.value = e?.message || 'Failed to load your agents.';
  }
};
const saveAgentLabel = async (agent: UserAgentDto & { editLabel: string }): Promise<void> => {
  try {
    const updated = await userAgentsAPI.update(agent.id, { label: agent.editLabel });
    const res = updated?.data;
    if (res && res.label) agent.label = res.label as any;
  } catch (e: any) {
    myAgentsError.value = e?.message || 'Failed to save agent.';
  }
};
const removeAgent = async (agent: UserAgentDto & { editLabel: string }): Promise<void> => {
  if (!confirm(`Delete agent "${agent.label}"?`)) return;
  try {
    await userAgentsAPI.remove(agent.id);
    myAgents.value = myAgents.value.filter((a) => a.id !== agent.id);
  } catch (e: any) {
    myAgentsError.value = e?.message || 'Failed to delete agent.';
  }
};

onMounted(() => {
  if (isAuthenticated.value) void loadMyAgents();
});

const subscriptionStatusLabel = computed(() => {
  if (!isAuthenticated.value)
    return 'Sign in with your personal account to view subscription details.';
  const user = currentUser.value;
  if (!user) return 'Loading subscription status…';
  if (user.mode === 'global')
    return 'Shared global access is active. Billing is not required for this session.';
  const status = (user.subscriptionStatus || 'none').toString();
  switch (status) {
    case 'active':
      return 'Subscription active and in good standing.';
    case 'trialing':
      return 'Trial period is active.';
    case 'past_due':
      return 'Payment is past due. Update billing to avoid interruption.';
    case 'canceled':
      return 'Subscription canceled. Start a new checkout to resume access.';
    default:
      return 'No active subscription on file.';
  }
});

const canManageSubscription = computed(
  () => isAuthenticated.value && !isGlobalUser.value && hasBillingConfig.value
);

const billingButtonLabel = computed(() => {
  if (!isAuthenticated.value) return 'Sign in to manage';
  if (isGlobalUser.value) return 'Global access enabled';
  const status = currentUser.value?.subscriptionStatus;
  if (status === 'active' || status === 'trialing') return 'Manage Subscription';
  return 'Start Subscription';
});

const billingHelperText = computed(() => {
  if (!isAuthenticated.value) return 'Use your personal login to manage billing and subscription.';
  if (isGlobalUser.value)
    return 'This session uses the shared global passphrase. Personal billing is not required.';
  if (!hasBillingConfig.value)
    return 'Billing integration is not configured. Confirm Lemon Squeezy product and variant environment variables for the selected plan.';
  const status = currentUser.value?.subscriptionStatus;
  if (status === 'active') return 'Your subscription renews automatically until canceled.';
  if (status === 'trialing')
    return 'Trial active — finish checkout to keep access after the trial ends.';
  if (status === 'past_due')
    return 'Your billing payment is past due. Complete checkout to restore service.';
  return 'Start a subscription to unlock personal usage and billing controls.';
});

const startSubscriptionCheckout = async (): Promise<void> => {
  if (!canManageSubscription.value) {
    checkoutError.value = !hasBillingConfig.value
      ? 'Billing integration is not configured.'
      : isGlobalUser.value
        ? 'Global access sessions do not require subscriptions.'
        : 'Sign in to manage billing.';
    return;
  }

  checkoutError.value = '';
  checkoutInFlight.value = true;
  try {
    const successUrl = `${window.location.origin}/billing/success`;
    const cancelUrl = `${window.location.origin}${window.location.pathname}#billing-settings`;
    const { data } = await billingAPI.createCheckoutSession({
      planId: checkoutPlanId.value,
      successUrl,
      cancelUrl,
    });
    const checkoutUrl = data?.checkoutUrl;
    if (!checkoutUrl) {
      throw new Error('Checkout URL missing from server response.');
    }
    window.open(checkoutUrl, '_blank', 'noopener');
    toast?.add({
      type: 'info',
      title: 'Redirecting to Billing',
      message: 'Checkout opened in a new tab.',
    });
  } catch (error: any) {
    const message =
      error?.response?.data?.message || error?.message || 'Unable to start subscription checkout.';
    checkoutError.value = message;
    toast?.add({ type: 'error', title: 'Checkout Failed', message });
  } finally {
    checkoutInFlight.value = false;
  }
};

/** @type {VoiceApplicationSettings} vcaSettings - Reactive settings from the service. */
const vcaSettings: VoiceApplicationSettings = voiceSettingsManager.settings;

const MIN_CHAT_HISTORY_FOR_SLIDER = 2;

const chatHistoryCount: Ref<number> = ref(conversationManager.getHistoryMessageCount());
watch(chatHistoryCount, (newVal) => {
  if (!vcaSettings.useAdvancedMemory) {
    conversationManager.setHistoryMessageCount(newVal);
  }
});

const useAdvancedHistoryManager: Ref<boolean> = ref(vcaSettings.useAdvancedMemory);
watch(useAdvancedHistoryManager, (newVal) => {
  if (vcaSettings.useAdvancedMemory !== newVal) {
    voiceSettingsManager.updateSetting('useAdvancedMemory', newVal);
  }
  if (!newVal) {
    chatHistoryCount.value = conversationManager.getHistoryMessageCount();
    nextTick(() => {
      const el = document.getElementById('chatHistoryLength') as HTMLInputElement | null;
      if (el) updateRangeProgress(el);
    });
  } else {
    advancedHistoryConfigLocal.value = { ...advancedConversationManager.getHistoryConfig() };
    nextTick(() => {
      document
        .querySelectorAll<HTMLInputElement>('input[type="range"].range-slider-ephemeral')
        .forEach((el) => updateRangeProgress(el));
    });
  }
});
watch(
  () => vcaSettings.useAdvancedMemory,
  (serviceVal) => {
    if (useAdvancedHistoryManager.value !== serviceVal) {
      useAdvancedHistoryManager.value = serviceVal;
    }
  }
);

const advancedHistoryConfigLocal: Ref<AdvancedHistoryConfig> = ref({
  ...advancedConversationManager.getHistoryConfig(),
});

const availablePresetDisplayNames = computed<Array<{ key: HistoryStrategyPreset; name: string }>>(
  () => {
    return (Object.values(HistoryStrategyPreset) as HistoryStrategyPreset[]).map((value) => {
      let name = value
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
      name = name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase())
        .join(' ');
      return { key: value, name: name.trim() };
    });
  }
);

const availableAgentModeOptions = computed(() => {
  return agentService
    .getAllAgents()
    .filter((agent) => {
      const isPubliclyDesignated = agent.isPublic === true;
      const coreAgentIds: AgentId[] = [
        'general_chat' as AgentId,
        'diary' as AgentId,
        'business_meeting' as AgentId,
        'system_designer' as AgentId, // Corrected typo
        'coding_interviewer' as AgentId,
        'coding_assistant' as AgentId,
        'tutor_agent' as AgentId,
      ];
      return isPubliclyDesignated || coreAgentIds.includes(agent.id);
    })
    .map((agent) => ({ value: agent.id, label: agent.label }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

watch(
  () => advancedConversationManager.config.value,
  (managerConfig) => {
    if (JSON.stringify(advancedHistoryConfigLocal.value) !== JSON.stringify(managerConfig)) {
      advancedHistoryConfigLocal.value = { ...managerConfig };
    }
    nextTick(() => {
      document
        .querySelectorAll<HTMLInputElement>('input[type="range"].range-slider-ephemeral')
        .forEach((el) => updateRangeProgress(el));
    });
  },
  { deep: true, immediate: true }
);

watch(
  advancedHistoryConfigLocal,
  (localConfigUpdate) => {
    advancedConversationManager.updateConfig(localConfigUpdate);
  },
  { deep: true }
);

const onAdvancedPresetChange = (newPresetValue: HistoryStrategyPreset) => {
  advancedConversationManager.setHistoryStrategyPreset(newPresetValue);
  const presetName =
    availablePresetDisplayNames.value.find((p) => p.key === newPresetValue)?.name || newPresetValue;
  toast?.add({
    type: 'info',
    title: 'Context Strategy Updated',
    message: `Switched to "${presetName}". Settings adjusted.`,
  });
};
const resetCurrentAdvancedStrategyToDefaults = () => {
  const currentPreset = advancedHistoryConfigLocal.value.strategyPreset;
  advancedConversationManager.setHistoryStrategyPreset(currentPreset);
  toast?.add({
    type: 'success',
    title: 'Strategy Reset',
    message: `Settings for "${currentPreset}" strategy reset to defaults.`,
  });
};
const resetAllAdvancedSettingsToGlobalDefaults = () => {
  const globalDefaultConfig = { ...DEFAULT_ADVANCED_HISTORY_CONFIG };
  advancedConversationManager.updateConfig(globalDefaultConfig);
  toast?.add({
    type: 'success',
    title: 'Advanced Settings Reset',
    message: 'All advanced memory settings reset to global defaults.',
  });
};

const rememberLoginLocal: Ref<boolean> = useStorage('vcaRememberLoginSettings_v2', true);

const audioInputDevices = computed(() => voiceSettingsManager.audioInputDevices.value);
const currentSessionCost = ref(0.0);
const importSettingsInputRef = ref<HTMLInputElement | null>(null);

// --- Microphone Test State & Logic ---
const isTestingMic = ref(false);
const micTestResult = ref<
  | ''
  | 'success'
  | 'error_permission'
  | 'error_notfound'
  | 'error_overconstrained'
  | 'error_generic'
  | 'warning'
>('');
const micTestLocalMessage = ref(''); // Used to set custom messages for micTestResultMessage
const micAudioLevels = ref<number[]>([]);
let micTestAudioContext: AudioContext | null = null;
let micTestAnalyser: AnalyserNode | null = null;
let micTestMicrophone: MediaStreamAudioSourceNode | null = null;
let micTestStreamLocal: MediaStream | null = null;
let micTestAnimationRequest: number | null = null;

const currentAudioDeviceName = computed<string>(() => {
  if (!vcaSettings.selectedAudioInputDeviceId) return 'Default System Microphone';
  const device = audioInputDevices.value.find(
    (d) => d.deviceId === vcaSettings.selectedAudioInputDeviceId
  );
  return device?.label || `Microphone (...${vcaSettings.selectedAudioInputDeviceId.slice(-6)})`;
});

const micTestResultMessage = computed<string>(() => {
  if (micTestLocalMessage.value) return micTestLocalMessage.value;
  const messages = {
    success: 'Microphone test active. Speak to see levels below.',
    error_permission:
      'Permission denied. Please enable microphone access in browser/system settings.',
    error_notfound: 'No microphone found or selected device is unavailable.',
    error_overconstrained: 'Microphone is busy or currently in use by another application.',
    error_generic: 'An unknown error occurred during the microphone test. Check console.',
    warning:
      "Mic test complete, but very little sound was detected. Check mic levels and ensure it's not muted.",
    '': '',
  };
  return messages[micTestResult.value];
});
const micTestResultClass = computed<string>(() => {
  const classes = {
    success: 'text-[hsl(var(--color-success-h),var(--color-success-s),var(--color-success-l))]',
    error_permission: 'text-[hsl(var(--color-error-h),var(--color-error-s),var(--color-error-l))]',
    error_notfound: 'text-[hsl(var(--color-error-h),var(--color-error-s),var(--color-error-l))]',
    error_overconstrained:
      'text-[hsl(var(--color-warning-h),var(--color-warning-s),var(--color-warning-l))]',
    error_generic: 'text-[hsl(var(--color-error-h),var(--color-error-s),var(--color-error-l))]',
    warning: 'text-[hsl(var(--color-warning-h),var(--color-warning-s),var(--color-warning-l))]',
    '': 'text-[hsl(var(--color-text-muted-h),var(--color-text-muted-s),var(--color-text-muted-l))]',
  };
  return (
    classes[micTestResult.value] ||
    'text-[hsl(var(--color-text-muted-h),var(--color-text-muted-s),var(--color-text-muted-l))]'
  );
});
const isRelevancyStrategyActive = computed<boolean>(() => {
  const preset = advancedHistoryConfigLocal.value.strategyPreset;
  return (
    preset === HistoryStrategyPreset.BALANCED_HYBRID ||
    preset === HistoryStrategyPreset.RELEVANCE_FOCUSED ||
    preset === HistoryStrategyPreset.MAX_CONTEXT_HYBRID
  );
});

const confirmAndGoBack = (): void => {
  toast?.add({
    type: 'info',
    title: 'Settings Saved',
    message: 'Your preferences are saved locally.',
    duration: 3000,
  });
  router.push({ name: auth.isAuthenticated.value ? 'AuthenticatedHome' : 'PublicHome' });
};

const getLanguageDisplayName = (langCode?: string): string => {
  if (!langCode) return 'Default';
  try {
    return (
      new Intl.DisplayNames([langCode.split('-')[0]], { type: 'language' }).of(langCode) || langCode
    );
  } catch (e) {
    return langCode;
  }
};

const updateRangeProgress = (target: HTMLInputElement | null): void => {
  if (!target) return;
  const value = parseFloat(target.value);
  const min = parseFloat(target.min);
  const max = parseFloat(target.max);
  const percentage = ((value - min) / (max - min)) * 100;
  target.style.setProperty(
    '--range-progress-ephemeral',
    `${Math.max(0, Math.min(100, percentage))}%`
  );
};

const getAudioModeDescription = (mode: AudioInputMode): string => {
  const descriptions: Record<AudioInputMode, string> = {
    'push-to-talk':
      '🎤 Hold the mic button to record. Release to review and send. Best for precise control and privacy.',
    continuous:
      '🔴 Microphone stays on and transcribes continuously. Good for hands-free dictation.',
    'voice-activation':
      '🗣�~ Say "V" or "Hey V" to wake, then speak your command. Hands-free with wake word activation.',
  };
  return descriptions[mode] || 'Select your preferred audio input method.';
};

const triggerRefreshAudioDevices = async (): Promise<void> => {
  toast?.add({
    type: 'info',
    title: 'Refreshing Devices',
    message: 'Updating microphone list... Permissions may be requested.',
  });
  await voiceSettingsManager.loadAudioInputDevices(true);
  if (voiceSettingsManager.audioInputDevices.value.length === 0) {
    toast?.add({
      type: 'warning',
      title: 'No Microphones',
      message: 'No microphones found. Ensure one is connected and enabled.',
    });
  }
};

const testMicrophone = async (): Promise<void> => {
  if (isTestingMic.value) return;
  isTestingMic.value = true;
  micTestResult.value = '';
  micAudioLevels.value = [];
  micTestLocalMessage.value = '';
  try {
    if (micTestStreamLocal) {
      micTestStreamLocal.getTracks().forEach((track) => track.stop());
      micTestStreamLocal = null;
    }
    if (micTestAudioContext && micTestAudioContext.state !== 'closed') {
      await micTestAudioContext.close();
      micTestAudioContext = null;
    }
    micTestStreamLocal = await navigator.mediaDevices.getUserMedia({
      audio: vcaSettings.selectedAudioInputDeviceId
        ? { deviceId: { exact: vcaSettings.selectedAudioInputDeviceId } }
        : true,
    });
    micTestResult.value = 'success';
    micTestAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    micTestAnalyser = micTestAudioContext.createAnalyser();
    micTestMicrophone = micTestAudioContext.createMediaStreamSource(micTestStreamLocal);
    micTestAnalyser.fftSize = 256;
    micTestMicrophone.connect(micTestAnalyser);
    const dataArray = new Uint8Array(micTestAnalyser.frequencyBinCount);
    const draw = () => {
      if (!isTestingMic.value || !micTestAnalyser) return; // Added !micTestAnalyser check
      micTestAnimationRequest = requestAnimationFrame(draw);
      micTestAnalyser.getByteFrequencyData(dataArray);
      let sum = 0;
      dataArray.forEach((v) => (sum += v));
      micAudioLevels.value.push(sum / dataArray.length / 255);
    };
    draw();
    setTimeout(() => {
      stopMicrophoneTest();
      if (
        micAudioLevels.value.reduce((s: number, v: number) => s + v, 0) <
          micAudioLevels.value.length * 0.01 &&
        micTestResult.value === 'success'
      ) {
        micTestResult.value = 'warning';
        micTestLocalMessage.value =
          "Mic test complete, but very little sound was detected. Check mic levels and ensure it's not muted.";
        toast?.add({
          type: 'warning',
          title: 'Low Audio Detected',
          message: micTestLocalMessage.value,
          duration: 6000,
        });
      } else if (micTestResult.value === 'success') {
        micTestLocalMessage.value = 'Microphone test finished. Levels displayed above.';
        toast?.add({
          type: 'success',
          title: 'Mic Test Complete',
          message: micTestLocalMessage.value,
          duration: 4000,
        });
      }
    }, 5000);
  } catch (err: any) {
    console.error('Mic test error:', err);
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      micTestResult.value = 'error_permission';
    else if (err.name === 'NotFoundError') micTestResult.value = 'error_notfound';
    else if (err.name === 'OverconstrainedError') micTestResult.value = 'error_overconstrained';
    else micTestResult.value = 'error_generic';
    isTestingMic.value = false;
  }
};

const stopMicrophoneTest = (): void => {
  isTestingMic.value = false;
  if (micTestAnimationRequest) cancelAnimationFrame(micTestAnimationRequest);
  micTestAnimationRequest = null;
  if (micTestStreamLocal) {
    micTestStreamLocal.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    micTestStreamLocal = null;
  }
  if (micTestMicrophone) micTestMicrophone.disconnect();
  if (micTestAudioContext && micTestAudioContext.state !== 'closed') micTestAudioContext.close();
  micTestMicrophone = null;
  micTestAnalyser = null;
  micTestAudioContext = null;
};

const fetchCurrentSessionCost = async (): Promise<void> => {
  try {
    if (auth.isAuthenticated.value) {
      await costStore.fetchSessionCost();
      currentSessionCost.value = costStore.totalSessionCost;
    }
  } catch (error) {
    console.error('SettingsPage: Error fetching cost:', error);
    toast?.add({ type: 'error', title: 'Cost Error', message: 'Could not retrieve session cost.' });
  }
};
const handleResetSessionCost = async (): Promise<void> => {
  if (!confirm("Reset current session's API cost to $0.00? This doesn't affect overall billing."))
    return;
  try {
    await costStore.resetSessionCost();
    currentSessionCost.value = costStore.totalSessionCost;
    toast?.add({
      type: 'success',
      title: 'Session Cost Reset',
      message: 'Tracked session cost reset.',
    });
  } catch (error) {
    console.error('SettingsPage: Error resetting cost:', error);
    toast?.add({ type: 'error', title: 'Reset Failed', message: 'Could not reset cost.' });
  }
};

const handleLogout = (): void => {
  if (!confirm('Are you sure you want to log out?')) return;
  auth.logout('').then(() => {
    costStore.$reset();
    chatStoreInstance.$reset();
    agentStore.$reset();
    toast?.add({
      type: 'success',
      title: 'Logged Out',
      message: 'You have been successfully logged out.',
    });
    router.push({ name: 'Login' });
  });
};
const handleClearConversationHistory = async (): Promise<void> => {
  if (confirm('DANGER: Delete ALL local chat history for ALL assistants? This cannot be undone.')) {
    try {
      await chatStoreInstance.clearAllAgentData();
      toast?.add({
        type: 'success',
        title: 'History Cleared',
        message: 'All local chats deleted.',
      });
    } catch (error) {
      console.error('SettingsPage: Error clearing history:', error);
      toast?.add({ type: 'error', title: 'Clear Failed', message: 'Could not clear history.' });
    }
  }
};

const exportAllSettings = (): void => {
  try {
    const settingsToExport = {
      voiceAppSettings: voiceSettingsManager.settings,
      advancedMemoryConfig: advancedConversationManager.getHistoryConfig(),
    };
    const jsonString = JSON.stringify(settingsToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vca_settings_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast?.add({ type: 'success', title: 'Settings Exported', message: 'Settings downloaded.' });
  } catch (error) {
    console.error('SettingsPage: Error exporting:', error);
    toast?.add({ type: 'error', title: 'Export Failed', message: 'Could not export settings.' });
  }
};
const triggerImportFile = (): void => {
  importSettingsInputRef.value?.click();
};
const handleImportSettingsFile = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) {
    toast?.add({ type: 'warning', title: 'No File', message: 'Please select a settings file.' });
    return;
  }
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const result = e.target?.result;
      if (typeof result !== 'string') throw new Error('File not string.');
      const importedData = JSON.parse(result);
      let applied = false;
      if (importedData.voiceAppSettings && typeof importedData.voiceAppSettings === 'object') {
        const validVoiceSettings: Partial<VoiceApplicationSettings> = {};
        // Use initialDefaultSettings from voice.settings.service, not locally defined one
        for (const key in voiceSettingsManager.defaultSettings) {
          const K = key as keyof VoiceApplicationSettings;
          if (Object.prototype.hasOwnProperty.call(importedData.voiceAppSettings, K)) {
            (validVoiceSettings as any)[K] = importedData.voiceAppSettings[K];
          }
        }
        voiceSettingsManager.updateSettings(validVoiceSettings);
        applied = true;
      }
      if (
        importedData.advancedMemoryConfig &&
        typeof importedData.advancedMemoryConfig === 'object'
      ) {
        const validAdvancedConfig: Partial<AdvancedHistoryConfig> = {};
        for (const key in DEFAULT_ADVANCED_HISTORY_CONFIG) {
          const K = key as keyof AdvancedHistoryConfig;
          if (Object.prototype.hasOwnProperty.call(importedData.advancedMemoryConfig, K)) {
            (validAdvancedConfig as any)[K] = importedData.advancedMemoryConfig[K];
          }
        }
        advancedConversationManager.updateConfig(validAdvancedConfig);
        applied = true;
      }
      if (applied) {
        toast?.add({
          type: 'success',
          title: 'Settings Imported',
          message: 'Settings successfully imported.',
        });
        nextTick(() => {
          document
            .querySelectorAll<HTMLInputElement>('input[type="range"].range-slider-ephemeral')
            .forEach((el) => updateRangeProgress(el));
          useAdvancedHistoryManager.value = voiceSettingsManager.settings.useAdvancedMemory;
          if (!useAdvancedHistoryManager.value)
            chatHistoryCount.value = conversationManager.getHistoryMessageCount();
        });
      } else throw new Error('Invalid settings structure.');
    } catch (error: any) {
      console.error('SettingsPage: Import error:', error);
      toast?.add({
        type: 'error',
        title: 'Import Failed',
        message: `Import error: ${error.message}`,
      });
    } finally {
      input.value = '';
    }
  };
  reader.onerror = () => {
    toast?.add({
      type: 'error',
      title: 'File Read Error',
      message: 'Could not read settings file.',
    });
    input.value = '';
  };
  reader.readAsText(file);
};

onMounted(async () => {
  if (!auth.isAuthenticated.value) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      auth.checkAuthStatus();
    } // Not async!
    if (!auth.isAuthenticated.value && !router.currentRoute.value.path.startsWith('/public')) {
      toast?.add({ type: 'warning', title: 'Auth Required', message: 'Login to access settings.' });
      router.push({ name: 'Login', query: { redirect: router.currentRoute.value.fullPath } });
      return;
    }
  }
  if (
    auth.isAuthenticated.value &&
    auth.currentToken.value &&
    (!mainApi.defaults.headers.common['Authorization'] ||
      mainApi.defaults.headers.common['Authorization'] !== `Bearer ${auth.currentToken.value}`)
  ) {
    mainApi.defaults.headers.common['Authorization'] = `Bearer ${auth.currentToken.value}`;
  }
  useAdvancedHistoryManager.value = vcaSettings.useAdvancedMemory;
  if (!useAdvancedHistoryManager.value)
    chatHistoryCount.value = conversationManager.getHistoryMessageCount();
  advancedHistoryConfigLocal.value = { ...advancedConversationManager.getHistoryConfig() };
  await fetchCurrentSessionCost();
  if (!voiceSettingsManager.audioInputDevicesLoaded.value)
    await voiceSettingsManager.loadAudioInputDevices();
  if (!voiceSettingsManager.ttsVoicesLoaded.value && vcaSettings.autoPlayTts)
    await voiceSettingsManager.loadAllTtsVoices();
  void voiceSettingsManager.refreshCreditsSnapshot();
  nextTick(() => {
    document
      .querySelectorAll<HTMLInputElement>('input[type="range"].range-slider-ephemeral')
      .forEach((el) => updateRangeProgress(el));
  });
});

onBeforeUnmount(() => {
  stopMicrophoneTest();
});

watch(
  [
    () => vcaSettings.vadThreshold,
    () => vcaSettings.vadSilenceTimeoutMs,
    () => vcaSettings.continuousModePauseTimeoutMs,
    () => vcaSettings.ttsRate,
    () => vcaSettings.ttsPitch,
    () => vcaSettings.costLimit,
    chatHistoryCount,
    () => advancedHistoryConfigLocal.value.relevancyThreshold,
  ],
  () => {
    nextTick(() => {
      document
        .querySelectorAll<HTMLInputElement>('input[type="range"].range-slider-ephemeral')
        .forEach((el) => updateRangeProgress(el));
    });
  },
  { deep: true }
);
</script>

<style lang="scss">
// Styles for Settings.vue are in frontend/src/styles/views/settings/_settings-page.scss
.speech-credits-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.speech-credits-summary__text {
  font-size: 0.9rem;
  color: hsla(
    var(--color-text-primary-h),
    var(--color-text-primary-s),
    var(--color-text-primary-l),
    0.85
  );
  flex: 1 1 auto;
}

.speech-credits-summary__text--warning {
  color: rgba(234, 179, 8, 0.95);
  font-weight: 600;
}

.speech-credits-summary__button {
  flex: 0 0 auto;
  white-space: nowrap;
}
</style>
