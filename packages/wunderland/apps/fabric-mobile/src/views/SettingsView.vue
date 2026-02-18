<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { configureSync, getSyncConfig, sync, testConnection, disconnectSync } from '../capacitor/sync';
import { preloadModels, getModelStatus } from '../ml/transformers';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const backendUrl = ref('');
const apiKey = ref('');
const isSynced = ref(false);
const isTesting = ref(false);
const testResult = ref<'success' | 'error' | null>(null);
const isSyncing = ref(false);
const syncResult = ref<{ uploaded: number; downloaded: number } | null>(null);
const isLoadingModels = ref(false);
const modelStatus = ref(getModelStatus());

onMounted(() => {
  const config = getSyncConfig();
  if (config) {
    backendUrl.value = config.backendUrl;
    apiKey.value = config.apiKey || '';
    isSynced.value = true;
  }
  modelStatus.value = getModelStatus();
});

async function testBackend() {
  if (!backendUrl.value) return;

  isTesting.value = true;
  testResult.value = null;

  try {
    const success = await testConnection(backendUrl.value, apiKey.value || undefined);
    testResult.value = success ? 'success' : 'error';

    if (success) {
      await Haptics.notification({ type: NotificationType.Success });
    } else {
      await Haptics.notification({ type: NotificationType.Error });
    }
  } catch {
    testResult.value = 'error';
    await Haptics.notification({ type: NotificationType.Error });
  } finally {
    isTesting.value = false;
  }
}

async function saveConfig() {
  if (!backendUrl.value) return;

  configureSync({
    backendUrl: backendUrl.value,
    apiKey: apiKey.value || undefined,
    autoSync: true,
    syncIntervalMs: 5 * 60 * 1000, // 5 minutes
  });

  isSynced.value = true;
  await Haptics.impact({ style: ImpactStyle.Medium });
}

async function performSync() {
  isSyncing.value = true;
  syncResult.value = null;

  try {
    const result = await sync();
    if (result.success) {
      syncResult.value = {
        uploaded: result.strandsUploaded,
        downloaded: result.strandsDownloaded,
      };
      await Haptics.notification({ type: NotificationType.Success });
    } else {
      await Haptics.notification({ type: NotificationType.Error });
    }
  } catch {
    await Haptics.notification({ type: NotificationType.Error });
  } finally {
    isSyncing.value = false;
  }
}

function disconnect() {
  disconnectSync();
  backendUrl.value = '';
  apiKey.value = '';
  isSynced.value = false;
  syncResult.value = null;
  testResult.value = null;
}

async function loadModels() {
  isLoadingModels.value = true;
  try {
    await preloadModels();
    await Haptics.notification({ type: NotificationType.Success });
  } catch (error) {
    console.error('[Settings] Model loading error:', error);
    await Haptics.notification({ type: NotificationType.Error });
  } finally {
    isLoadingModels.value = false;
    modelStatus.value = getModelStatus();
  }
}
</script>

<template>
  <div class="settings-view">
    <header class="header">
      <h1 class="title">Settings</h1>
    </header>

    <!-- Sync Configuration -->
    <section class="section">
      <h2 class="section-title">Backend Sync</h2>
      <p class="section-desc">
        Connect to a FABRIC backend (frame.dev, self-hosted, or custom)
      </p>

      <div class="form-group">
        <label class="label">Backend URL</label>
        <input
          v-model="backendUrl"
          type="url"
          placeholder="https://your-backend.com"
          class="input"
          :disabled="isSynced"
        />
      </div>

      <div class="form-group">
        <label class="label">API Key (optional)</label>
        <input
          v-model="apiKey"
          type="password"
          placeholder="Enter API key"
          class="input"
          :disabled="isSynced"
        />
      </div>

      <div v-if="!isSynced" class="button-group">
        <button class="btn btn-secondary" :disabled="!backendUrl || isTesting" @click="testBackend">
          {{ isTesting ? 'Testing...' : 'Test Connection' }}
        </button>
        <button class="btn btn-primary" :disabled="!backendUrl || testResult !== 'success'" @click="saveConfig">
          Save & Connect
        </button>
      </div>

      <div v-else class="button-group">
        <button class="btn btn-primary" :disabled="isSyncing" @click="performSync">
          {{ isSyncing ? 'Syncing...' : 'Sync Now' }}
        </button>
        <button class="btn btn-danger" @click="disconnect">
          Disconnect
        </button>
      </div>

      <div v-if="testResult" class="status-message" :class="testResult">
        {{ testResult === 'success' ? '✓ Connection successful' : '✗ Connection failed' }}
      </div>

      <div v-if="syncResult" class="sync-result">
        Synced: {{ syncResult.uploaded }} uploaded, {{ syncResult.downloaded }} downloaded
      </div>
    </section>

    <!-- AI Models -->
    <section class="section">
      <h2 class="section-title">AI Models</h2>
      <p class="section-desc">
        On-device ML for semantic search and Q&A
      </p>

      <div class="model-status">
        <div class="model-item">
          <span class="model-name">Embedding Model</span>
          <span class="model-badge" :class="{ loaded: modelStatus.embedding }">
            {{ modelStatus.embedding ? 'Loaded' : 'Not loaded' }}
          </span>
        </div>
        <div class="model-item">
          <span class="model-name">Q&A Model</span>
          <span class="model-badge" :class="{ loaded: modelStatus.qa }">
            {{ modelStatus.qa ? 'Loaded' : 'Not loaded' }}
          </span>
        </div>
      </div>

      <button class="btn btn-secondary full-width" :disabled="isLoadingModels" @click="loadModels">
        {{ isLoadingModels ? 'Loading Models...' : 'Preload All Models' }}
      </button>

      <p class="note">
        Models load automatically when needed. Preloading ensures faster first queries.
      </p>
    </section>

    <!-- About -->
    <section class="section">
      <h2 class="section-title">About</h2>
      <div class="about-info">
        <p><strong>FABRIC</strong></p>
        <p>AI-Native Personal Knowledge Management</p>
        <p class="version">Version {{ __FABRIC_VERSION__ }}</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-view {
  flex: 1;
  padding: 16px;
  padding-bottom: 100px;
  overflow-y: auto;
}

.header {
  margin-bottom: 24px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #e5e5e5;
}

.section {
  margin-bottom: 32px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(64, 224, 208, 0.1);
  border-radius: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #e5e5e5;
  margin-bottom: 8px;
}

.section-desc {
  font-size: 14px;
  color: rgba(229, 229, 229, 0.6);
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.label {
  display: block;
  font-size: 13px;
  color: rgba(229, 229, 229, 0.7);
  margin-bottom: 8px;
}

.input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(64, 224, 208, 0.2);
  border-radius: 10px;
  color: #e5e5e5;
  font-size: 15px;
  outline: none;
}

.input:focus {
  border-color: #40e0d0;
}

.input:disabled {
  opacity: 0.5;
}

.button-group {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.btn {
  flex: 1;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #40e0d0;
  border: none;
  color: #0a0a0f;
}

.btn-secondary {
  background: transparent;
  border: 1px solid rgba(64, 224, 208, 0.3);
  color: #40e0d0;
}

.btn-danger {
  background: transparent;
  border: 1px solid rgba(255, 100, 100, 0.3);
  color: #ff6464;
}

.full-width {
  width: 100%;
  margin-top: 16px;
}

.status-message {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
}

.status-message.success {
  background: rgba(64, 224, 208, 0.1);
  color: #40e0d0;
}

.status-message.error {
  background: rgba(255, 100, 100, 0.1);
  color: #ff6464;
}

.sync-result {
  margin-top: 16px;
  padding: 12px;
  background: rgba(64, 224, 208, 0.1);
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  color: #40e0d0;
}

.model-status {
  margin-bottom: 16px;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.model-item:last-child {
  border-bottom: none;
}

.model-name {
  font-size: 14px;
  color: rgba(229, 229, 229, 0.8);
}

.model-badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(229, 229, 229, 0.5);
}

.model-badge.loaded {
  background: rgba(64, 224, 208, 0.2);
  color: #40e0d0;
}

.note {
  margin-top: 12px;
  font-size: 12px;
  color: rgba(229, 229, 229, 0.4);
  text-align: center;
}

.about-info {
  text-align: center;
  color: rgba(229, 229, 229, 0.7);
  font-size: 14px;
  line-height: 1.6;
}

.version {
  margin-top: 8px;
  color: rgba(229, 229, 229, 0.4);
  font-size: 12px;
}
</style>
