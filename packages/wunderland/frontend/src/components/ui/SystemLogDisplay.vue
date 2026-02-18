// File: frontend/src/components/ui/SystemLogDisplay.vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
// This component would ideally subscribe to a global logging service or event bus.
// For simplicity, using a local log array for now.

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'API_REQ' | 'API_RES';
  message: string;
  details?: any;
}

const logs = ref<LogEntry[]>([]);
let logIdCounter = 0;
let demoInterval: number | undefined;

const MAX_LOGS = 100;

const addLog = (level: LogEntry['level'], message: string, details?: any) => {
  logs.value.unshift({
    id: logIdCounter++,
    timestamp: new Date().toLocaleTimeString([], { hour12: false }),
    level,
    message,
    details
  });
  if (logs.value.length > MAX_LOGS) {
    logs.value.pop();
  }
};

const logLevelClass = (level: LogEntry['level']) => {
  switch (level) {
    case 'ERROR': return 'text-red-400';
    case 'WARN': return 'text-yellow-400';
    case 'INFO': return 'text-sky-400';
    case 'DEBUG': return 'text-purple-400';
    case 'API_REQ': return 'text-emerald-400';
    case 'API_RES': return 'text-teal-400';
    default: return 'text-slate-400';
  }
};

// Demo: Add some logs
onMounted(() => {
  addLog('INFO', 'System Log Display initialized.');
  // Replace with actual log subscription from a service
  // For demonstration:
  demoInterval = window.setInterval(() => {
    const levels: LogEntry['level'][] = ['INFO', 'DEBUG', 'API_REQ', 'API_RES', 'WARN'];
    const randomLevel = levels[Math.floor(Math.random() * levels.length)];
    addLog(randomLevel, `Sample log message #${logIdCounter}`, Math.random() > 0.7 ? { data: 'some details', value: Math.random() } : undefined);
  }, 5000);

  // Example of subscribing to a global event for API calls
  // window.addEventListener('api-call-start', (event: CustomEvent) => {
  //   addLog('API_REQ', `${event.detail.method} ${event.detail.url}`, event.detail.payload);
  // });
  // window.addEventListener('api-call-end', (event: CustomEvent) => {
  //   addLog(event.detail.error ? 'ERROR' : 'API_RES', `${event.detail.method} ${event.detail.url} - Status: ${event.detail.status}`, event.detail.response);
  // });
});

onUnmounted(() => {
  if (demoInterval) clearInterval(demoInterval);
});

const clearLogs = () => {
  logs.value = [];
  addLog('INFO', 'Logs cleared by user.');
};

const downloadLogs = () => {
  const logContent = logs.value.map(log =>
    `${log.timestamp} [${log.level}] ${log.message}${log.details ? ' - Details: ' + JSON.stringify(log.details) : ''}`
  ).reverse().join('\n'); // Reverse to get chronological order for download

  const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vca-system-logs-${new Date().toISOString().slice(0,10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  addLog('INFO', 'System logs downloaded.');
};

</script>

<template>
  <div class="system-log-display-container">
    <div class="log-header">
      <h3 class="log-title">System & API Logs</h3>
      <div class="log-actions">
        <button @click="downloadLogs" class="log-action-btn" title="Download Logs">Download</button>
        <button @click="clearLogs" class="log-action-btn clear" title="Clear Logs">Clear</button>
      </div>
    </div>
    <div class="log-entries-area">
      <p v-if="logs.length === 0" class="empty-log-message">No system logs yet. Activity will appear here.</p>
      <div v-else>
        <div v-for="log in logs" :key="log.id" class="log-entry-item">
          <span class="log-timestamp shrink-0">{{ log.timestamp }}</span>
          <span class="log-level shrink-0" :class="logLevelClass(log.level)">[{{ log.level }}]</span>
          <span class="log-message grow break-all">{{ log.message }}</span>
          <details v-if="log.details" class="log-details">
            <summary class="details-summary">Details</summary>
            <pre class="details-pre">{{ JSON.stringify(log.details, null, 2) }}</pre>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.system-log-display-container {
  @apply bg-slate-800 text-xs font-mono rounded-t-lg border border-b-0 border-slate-700 text-slate-300 flex flex-col;
  max-height: 300px; /* Or whatever max height is desired */
}
.log-header {
  @apply flex items-center justify-between p-2 sm:p-3 border-b border-slate-700 bg-slate-950 rounded-t-lg sticky top-0 z-10;
}
.log-title {
  @apply text-sm font-semibold text-slate-200;
}
.log-actions {
  @apply flex items-center gap-2;
}
.log-action-btn {
  @apply px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors;
}
.log-action-btn.clear {
  @apply hover:bg-red-700/50 hover:text-red-300;
}
.log-entries-area {
  @apply flex-grow overflow-y-auto p-2 sm:p-3 space-y-1;
  scrollbar-width: thin;
  scrollbar-color: theme('colors.slate.600') theme('colors.slate.800');
}
.log-entries-area::-webkit-scrollbar { width: 6px; }
.log-entries-area::-webkit-scrollbar-track { @apply bg-slate-800; }
.log-entries-area::-webkit-scrollbar-thumb { @apply bg-slate-600 rounded; }

.empty-log-message {
  @apply h-full flex items-center justify-center text-slate-500 italic p-4;
}
.log-entry-item {
  @apply flex items-baseline gap-x-2 leading-relaxed hover:bg-slate-700/50 p-0.5 rounded-sm;
}
.log-timestamp {
  @apply text-slate-500;
}
.log-level {
  @apply font-medium w-[7ch] text-right; /* Fixed width for alignment */
}
.log-message {
  /* Takes remaining space */
}
.log-details {
  @apply text-xs ml-auto pl-2;
}
.details-summary {
  @apply cursor-pointer text-slate-500 hover:text-slate-300 text-[0.7rem] outline-none;
}
.details-pre {
  @apply mt-1 p-1.5 bg-slate-900/70 rounded text-slate-400 max-h-32 overflow-auto text-[0.65rem];
}
</style>