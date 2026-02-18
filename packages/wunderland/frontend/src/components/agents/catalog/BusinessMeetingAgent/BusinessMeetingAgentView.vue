<template>
  <div class="business-meeting-agent-view">
    <!-- Main Content Container -->
    <div class="meeting-content-wrapper">
      <!-- Header with Controls -->
      <div class="meeting-header">
        <div class="header-left">
          <h2 class="meeting-title">🎙️ {{ t('meeting.title') }}</h2>
          <button @click="startNewRecording" class="btn-primary-meeting" :disabled="isRecording">
            <MicrophoneIcon class="w-5 h-5" />
            {{ isRecording ? t('meeting.recording') : t('meeting.newRecording') }}
          </button>
        </div>
        <div class="header-right">
          <button @click="showFilters = !showFilters" class="btn-icon-meeting" :title="'Toggle Filters'">
            <AdjustmentsHorizontalIcon class="w-5 h-5" />
          </button>
          <button @click="exportAllMeetings" class="btn-icon-meeting" :title="'Export All'">
            <ArrowDownTrayIcon class="w-5 h-5" />
          </button>
          <button @click="importMeetings" class="btn-icon-meeting" :title="'Import Meetings'">
            <ArrowUpTrayIcon class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Recording Session -->
      <Transition name="recording-slide">
        <div v-if="isRecording || showRecordingInterface" class="recording-session">
          <div class="recording-header">
            <h3>{{ currentMeeting.title || 'New Meeting Recording' }}</h3>
            <div class="recording-timer">
              <div class="recording-indicator"></div>
              <span>{{ formatTime(recordingTime) }}</span>
            </div>
          </div>

          <div class="recording-controls">
            <div class="audio-visualizer">
              <canvas ref="visualizerCanvas" width="800" height="100"></canvas>
            </div>

            <div class="control-buttons">
              <button v-if="!isRecording && !isPaused" @click="startRecording" class="btn-record">
                <MicrophoneIcon class="w-8 h-8" />
                {{ t('meeting.startRecording') }}
              </button>

              <button v-if="isRecording && !isPaused" @click="pauseRecording" class="btn-pause">
                <PauseIcon class="w-8 h-8" />
                {{ t('meeting.pauseRecording') }}
              </button>

              <button v-if="isPaused" @click="resumeRecording" class="btn-resume">
                <PlayIcon class="w-8 h-8" />
                {{ t('meeting.resumeRecording') }}
              </button>

              <button v-if="isRecording || isPaused" @click="stopRecording" class="btn-stop">
                <StopIcon class="w-8 h-8" />
                {{ t('meeting.stopRecording') }}
              </button>
            </div>

            <div class="meeting-metadata">
              <input
                v-model="currentMeeting.title"
                :placeholder="t('meeting.meetingTitle')"
                class="metadata-input"
              />
              <input
                v-model="currentMeeting.participants"
                :placeholder="t('meeting.participants')"
                class="metadata-input"
              />
              <textarea
                v-model="currentMeeting.notes"
                :placeholder="t('meeting.quickNotes')"
                rows="3"
                class="metadata-input"
              />
            </div>
          </div>

          <!-- Processing Status -->
          <div v-if="isProcessing" class="processing-status">
            <div class="processing-spinner"></div>
            <p>{{ processingStatus }}</p>
          </div>
        </div>
      </Transition>

      <!-- Filters Section -->
      <Transition name="filter-slide">
        <div v-if="showFilters" class="filter-section">
          <div class="filter-controls">
            <input
              type="text"
              v-model="searchTerm"
              :placeholder="t('meeting.searchMeetings')"
              class="search-input"
            />
            <div class="filter-grid">
              <div class="filter-item">
                <label>Date Range</label>
                <input type="date" v-model="filterDateFrom" class="filter-input" />
                <input type="date" v-model="filterDateTo" class="filter-input" />
              </div>
              <div class="filter-item">
                <label>Participants</label>
                <input type="text" v-model="filterParticipants" placeholder="Filter by participant" class="filter-input" />
              </div>
              <div class="filter-item">
                <label>Sort By</label>
                <select v-model="sortBy" class="filter-select">
                  <option value="date">Date</option>
                  <option value="title">Title</option>
                  <option value="duration">Duration</option>
                </select>
              </div>
            </div>
            <button @click="clearFilters" class="btn-clear-filters">Clear Filters</button>
          </div>
        </div>
      </Transition>

      <!-- Meeting Summaries Grid -->
      <div class="meetings-container">
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading meetings...</p>
        </div>

        <div v-else-if="filteredMeetings.length === 0" class="empty-state">
          <div class="empty-icon">🎙️</div>
          <h3>{{ t('meeting.noRecordings') }}</h3>
          <p>{{ t('meeting.noRecordingsDesc') }}</p>
          <button @click="startNewRecording" class="btn-primary-meeting mt-4">
            <MicrophoneIcon class="w-5 h-5" />
            {{ t('meeting.startRecording') }}
          </button>
        </div>

        <div v-else class="meetings-grid">
          <div
            v-for="meeting in filteredMeetings"
            :key="meeting.id"
            @click="selectMeeting(meeting)"
            class="meeting-card"
            :class="{ 'active': selectedMeeting?.id === meeting.id }"
          >
            <div class="card-header">
              <div class="card-status" :class="meeting.status">
                {{ meeting.status === 'processed' ? '✓' : '⏳' }}
              </div>
              <div class="card-actions">
                <button @click.stop="playRecording(meeting)" class="btn-card-action" title="Play Recording">
                  <PlayIcon class="w-4 h-4"/>
                </button>
                <button @click.stop="downloadMeeting(meeting)" class="btn-card-action" title="Download">
                  <ArrowDownTrayIcon class="w-4 h-4"/>
                </button>
                <button @click.stop="deleteMeeting(meeting.id)" class="btn-card-action danger" title="Delete">
                  <TrashIcon class="w-4 h-4"/>
                </button>
              </div>
            </div>
            <div class="card-body">
              <h3 class="card-title">{{ meeting.title }}</h3>
              <p class="card-date">
                <CalendarIcon class="w-4 h-4" />
                {{ formatDate(meeting.date) }}
              </p>
              <p class="card-duration">
                <ClockIcon class="w-4 h-4" />
                {{ formatDuration(meeting.duration) }}
              </p>
              <div v-if="meeting.participants" class="card-participants">
                <UsersIcon class="w-4 h-4" />
                {{ meeting.participants }}
              </div>
              <div v-if="meeting.summary" class="card-summary">
                {{ meeting.summary.substring(0, 100) }}...
              </div>
            </div>
          </div>
        </div>

        <!-- Clear All Button -->
        <div v-if="meetings.length > 0" class="clear-all-section">
          <button @click="clearAllMeetings" class="btn-danger-outline">
            <TrashIcon class="w-5 h-5" />
            Clear All Meetings
          </button>
        </div>
      </div>

      <!-- Meeting Details Modal -->
      <Transition name="modal">
        <div v-if="selectedMeeting" class="meeting-modal" @click.self="selectedMeeting = null">
          <div class="modal-content">
            <div class="modal-header">
              <h2>{{ selectedMeeting.title }}</h2>
              <button @click="selectedMeeting = null" class="btn-close">
                <XMarkIcon class="w-6 h-6" />
              </button>
            </div>

            <div class="modal-body">
              <div class="meeting-info">
                <p><strong>Date:</strong> {{ formatDate(selectedMeeting.date) }}</p>
                <p><strong>Duration:</strong> {{ formatDuration(selectedMeeting.duration) }}</p>
                <p v-if="selectedMeeting.participants"><strong>Participants:</strong> {{ selectedMeeting.participants }}</p>
              </div>

              <div class="tabs">
                <button
                  @click="activeTab = 'transcript'"
                  :class="{ active: activeTab === 'transcript' }"
                  class="tab-button"
                >
                  Transcript
                </button>
                <button
                  @click="activeTab = 'summary'"
                  :class="{ active: activeTab === 'summary' }"
                  class="tab-button"
                >
                  Summary
                </button>
                <button
                  @click="activeTab = 'actionItems'"
                  :class="{ active: activeTab === 'actionItems' }"
                  class="tab-button"
                >
                  Action Items
                </button>
              </div>

              <div class="tab-content">
                <div v-if="activeTab === 'transcript'" class="transcript">
                  <pre>{{ selectedMeeting.transcript || 'No transcript available' }}</pre>
                </div>
                <div v-if="activeTab === 'summary'" class="summary">
                  <p>{{ selectedMeeting.summary || 'No summary available' }}</p>
                </div>
                <div v-if="activeTab === 'actionItems'" class="action-items">
                  <ul v-if="selectedMeeting.actionItems?.length">
                    <li v-for="(item, index) in selectedMeeting.actionItems" :key="index">
                      {{ item }}
                    </li>
                  </ul>
                  <p v-else>No action items identified</p>
                </div>
              </div>

              <div class="modal-actions">
                <button @click="copyToClipboard(selectedMeeting)" class="btn-secondary">
                  <ClipboardIcon class="w-5 h-5" />
                  Copy to Clipboard
                </button>
                <button @click="downloadMeeting(selectedMeeting)" class="btn-primary">
                  <ArrowDownTrayIcon class="w-5 h-5" />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  AdjustmentsHorizontalIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  PlusIcon,
  CalendarIcon,
  MicrophoneIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ClockIcon,
  UsersIcon,
  XMarkIcon,
  ClipboardIcon
} from '@heroicons/vue/24/solid';
import { useChatStore } from '@/store/chat.store';
import { chatAPI, type ChatMessagePayloadFE, type ChatMessageFE } from '@/utils/api';
import type { AgentId } from '@/services/agent.service';

const { t } = useI18n();
const chatStore = useChatStore();
const MEETING_AGENT_ID = 'meeting_summarizer' as AgentId;
const MEETING_AGENT_MODE = 'meeting';

interface Meeting {
  id: string;
  title: string;
  date: Date;
  duration: number; // in seconds
  participants: string;
  notes: string;
  transcript: string;
  summary: string;
  actionItems: string[];
  audioBlob?: Blob;
  status: 'recording' | 'processing' | 'processed';
}

// State
const meetings = ref<Meeting[]>([]);
const selectedMeeting = ref<Meeting | null>(null);
const isRecording = ref(false);
const isPaused = ref(false);
const showRecordingInterface = ref(false);
const isProcessing = ref(false);
const isLoading = ref(false);
const showFilters = ref(false);
const activeTab = ref<'transcript' | 'summary' | 'actionItems'>('transcript');
const processingStatus = ref('');
const recordingTime = ref(0);

// Current meeting being recorded
const currentMeeting = reactive<Partial<Meeting>>({
  title: '',
  participants: '',
  notes: ''
});

// Filters
const searchTerm = ref('');
const filterDateFrom = ref('');
const filterDateTo = ref('');
const filterParticipants = ref('');
const sortBy = ref<'date' | 'title' | 'duration'>('date');

// Audio recording
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: BlobPart[] = [];
let recordingInterval: number | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
const visualizerCanvas = ref<HTMLCanvasElement | null>(null);
let animationId: number | null = null;
let audioSource: MediaStreamAudioSourceNode | null = null;

// Local storage key
const STORAGE_KEY = 'business_meeting_recordings';

// Load meetings from localStorage on mount
onMounted(() => {
  loadMeetingsFromStorage();
});

onUnmounted(() => {
  if (recordingInterval) {
    clearInterval(recordingInterval);
  }
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
});

// Computed
const filteredMeetings = computed(() => {
  let filtered = [...meetings.value];

  // Apply search filter
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase();
    filtered = filtered.filter(m =>
      m.title.toLowerCase().includes(search) ||
      m.participants?.toLowerCase().includes(search) ||
      m.summary?.toLowerCase().includes(search) ||
      m.transcript?.toLowerCase().includes(search)
    );
  }

  // Apply date filter
  if (filterDateFrom.value) {
    filtered = filtered.filter(m => new Date(m.date) >= new Date(filterDateFrom.value));
  }
  if (filterDateTo.value) {
    filtered = filtered.filter(m => new Date(m.date) <= new Date(filterDateTo.value));
  }

  // Apply participant filter
  if (filterParticipants.value) {
    filtered = filtered.filter(m =>
      m.participants?.toLowerCase().includes(filterParticipants.value.toLowerCase())
    );
  }

  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'duration':
        return b.duration - a.duration;
      default: // date
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  return filtered;
});

// Methods
function loadMeetingsFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      meetings.value = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load meetings from storage:', e);
    }
  }
}

function saveMeetingsToStorage() {
  try {
    // Don't save audio blobs to localStorage, they're too large
    const toSave = meetings.value.map(m => ({
      ...m,
      audioBlob: undefined
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save meetings to storage:', e);
  }
}

// Audio context will be created when needed in startRecording()

function startNewRecording() {
  showRecordingInterface.value = true;
  currentMeeting.title = `Meeting ${new Date().toLocaleString()}`;
  currentMeeting.date = new Date();
  currentMeeting.participants = '';
  currentMeeting.notes = '';
}

async function startRecording() {
  try {
    console.log('[BusinessMeetingAgent] Requesting microphone access...');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Determine the best mime type for recording
    const mimeTypes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg'
    ];

    let selectedMimeType = 'audio/webm'; // Default fallback
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType;
        console.log('[BusinessMeetingAgent] Using mime type:', mimeType);
        break;
      }
    }

    mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
        console.log('[BusinessMeetingAgent] Audio chunk received:', event.data.size, 'bytes');
      }
    };

    mediaRecorder.onstop = async () => {
      console.log('[BusinessMeetingAgent] Recording stopped. Total chunks:', audioChunks.length);
      const audioBlob = new Blob(audioChunks, { type: selectedMimeType });
      console.log('[BusinessMeetingAgent] Created audio blob:', {
        size: audioBlob.size,
        type: audioBlob.type
      });

      if (audioBlob.size === 0) {
        console.error('[BusinessMeetingAgent] Warning: Audio blob is empty!');
        alert('Recording appears to be empty. Please try again.');
        return;
      }

      await processRecording(audioBlob);
    };

    // Start recording with timeslice to get periodic data
    mediaRecorder.start(1000); // Get data every second
    console.log('[BusinessMeetingAgent] Recording started');
    isRecording.value = true;
    isPaused.value = false;
    recordingTime.value = 0;

    // Start timer
    recordingInterval = setInterval(() => {
      if (!isPaused.value) {
        recordingTime.value++;
      }
    }, 1000);

    // Start visualizer
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioContext && visualizerCanvas.value) {
      console.log('[BusinessMeetingAgent] Setting up visualizer');

      // Clean up previous source if it exists
      if (audioSource) {
        audioSource.disconnect();
        audioSource = null;
      }

      audioSource = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      audioSource.connect(analyser);
      // Don't connect to destination to avoid echo

      console.log('[BusinessMeetingAgent] Visualizer connected, starting animation');
      drawVisualizer();
    } else {
      console.warn('[BusinessMeetingAgent] Could not start visualizer', {
        audioContext: !!audioContext,
        canvas: !!visualizerCanvas.value
      });
    }
  } catch (error) {
    console.error('Failed to start recording:', error);
    alert('Failed to access microphone. Please ensure you have granted permission.');
  }
}

function pauseRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
    isPaused.value = true;
  }
}

function resumeRecording() {
  if (mediaRecorder && mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
    isPaused.value = false;
  }
}

function stopRecording() {
  if (mediaRecorder) {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    isRecording.value = false;
    isPaused.value = false;

    if (recordingInterval) {
      clearInterval(recordingInterval);
      recordingInterval = null;
    }

    // Stop visualizer animation
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    // Disconnect audio source
    if (audioSource) {
      audioSource.disconnect();
      audioSource = null;
    }

    // Clear the canvas
    if (visualizerCanvas.value) {
      const ctx = visualizerCanvas.value.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgb(30, 41, 59)';
        ctx.fillRect(0, 0, visualizerCanvas.value.width, visualizerCanvas.value.height);
      }
    }

    console.log('[BusinessMeetingAgent] Recording stopped and visualization cleaned up');
  }
}

async function processRecording(audioBlob: Blob) {
  isProcessing.value = true;
  processingStatus.value = t('meeting.transcribing');

  console.log('[BusinessMeetingAgent] Starting to process recording:', {
    blobSize: audioBlob.size,
    blobType: audioBlob.type,
    duration: recordingTime.value
  });

  try {
    // Create meeting object
    const meeting: Meeting = {
      id: generateId(),
      title: currentMeeting.title || `Meeting ${new Date().toLocaleString()}`,
      date: new Date(),
      duration: recordingTime.value,
      participants: currentMeeting.participants || '',
      notes: currentMeeting.notes || '',
      transcript: '',
      summary: '',
      actionItems: [],
      audioBlob,
      status: 'processing'
    };

    // Add to meetings list
    meetings.value.unshift(meeting);

    // Call actual transcription API
    await transcribeAudio(meeting, audioBlob);

    processingStatus.value = t('meeting.generatingSummary');

    // Generate real AI summary based on actual transcript
    await generateSummaryAndActionItems(meeting);

    meeting.status = 'processed';
    saveMeetingsToStorage();

    // Show the meeting details
    selectedMeeting.value = meeting;

  } catch (error) {
    console.error('[BusinessMeetingAgent] Failed to process recording:', error);
    alert('Failed to process recording. Please try again.');
  } finally {
    isProcessing.value = false;
    showRecordingInterface.value = false;
    processingStatus.value = '';
  }
}

async function transcribeAudio(meeting: Meeting, audioBlob: Blob) {
  console.log('[BusinessMeetingAgent] Sending audio to transcription API...', {
    audioSize: audioBlob.size,
    audioType: audioBlob.type
  });

  try {
    // Create FormData to send the audio file
    const formData = new FormData();

    // Convert blob to file with appropriate extension based on mime type
    const fileExtension = audioBlob.type.split('/')[1] || 'webm';
    const fileName = `recording_${Date.now()}.${fileExtension}`;
    const audioFile = new File([audioBlob], fileName, { type: audioBlob.type });

    formData.append('audio', audioFile);
    formData.append('language', 'en'); // Can be made configurable
    formData.append('responseFormat', 'verbose_json');

    console.log('[BusinessMeetingAgent] Sending transcription request with file:', fileName);

    // Call the backend STT API
    const response = await fetch('/api/stt', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[BusinessMeetingAgent] Transcription API error:', errorData);
      throw new Error(errorData.message || 'Failed to transcribe audio');
    }

    const result = await response.json();
    console.log('[BusinessMeetingAgent] Transcription successful:', {
      textLength: result.transcription?.length,
      duration: result.durationSeconds,
      cost: result.cost,
      language: result.language
    });

    // Update meeting with real transcription
    meeting.transcript = result.transcription || 'No transcription available';

    // If segments are available, format them nicely
    if (result.segments && Array.isArray(result.segments)) {
      const formattedTranscript = result.segments.map(segment => {
        const startTime = formatSegmentTime(segment.start);
        const speaker = meeting.participants ? meeting.participants.split(',')[0].trim() : 'Speaker';
        return `[${startTime}] ${speaker}: ${segment.text}`;
      }).join('\n');

      meeting.transcript = formattedTranscript;
    }

    return result;
  } catch (error) {
    console.error('[BusinessMeetingAgent] Failed to transcribe audio:', error);
    // Fallback to placeholder text if transcription fails
    meeting.transcript = `[Transcription failed: ${error.message}]\n\nPlease ensure:\n1. Your OpenAI API key is configured\n2. The audio quality is sufficient\n3. The recording is not empty`;
    throw error;
  }
}

// Helper function to format segment timestamps
function formatSegmentTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

async function generateSummaryAndActionItems(meeting: Meeting) {
  console.log('[BusinessMeetingAgent] Generating summary from transcript...');

  if (!meeting.transcript || meeting.transcript.includes('Transcription failed')) {
    console.log('[BusinessMeetingAgent] No valid transcript to summarize');
    meeting.summary = 'No transcript available to generate summary.';
    meeting.actionItems = [];
    return;
  }

  try {
    // Prepare the prompt for AI to analyze the transcript
    const systemPrompt = `You are a meeting assistant that analyzes transcripts. You MUST:
1. Read and analyze the ACTUAL transcript content provided
2. Respond ONLY with valid JSON that can be parsed with JSON.parse()
3. Base your summary on what was ACTUALLY said in the transcript
4. Extract real action items from the conversation if any exist

DO NOT:
- Generate generic summaries
- Ask for more information
- Add any text outside the JSON structure
- Ignore the actual transcript content

Required JSON format:
{
  "summary": "A specific summary of what was discussed in THIS transcript",
  "actionItems": ["specific action items mentioned", "or empty array if none"]
}`;

    const userPrompt = `Analyze this specific meeting transcript and provide a JSON response with a summary of what was actually discussed and any action items mentioned:

TRANSCRIPT:
${meeting.transcript}

Remember: Analyze the ACTUAL content above. If someone said "And food's here!" then mention that food arrived. If someone said "Hello there" and "Fluff up and get it", summarize those specific statements. Do not provide generic meeting summaries.`;

    console.log('[BusinessMeetingAgent] Sending prompt to AI:', {
      transcriptLength: meeting.transcript.length,
      transcriptPreview: meeting.transcript.substring(0, 100)
    });

    const messages: ChatMessageFE[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt, timestamp: Date.now(), agentId: MEETING_AGENT_ID },
    ];

    const basePayload: ChatMessagePayloadFE = {
      messages,
      mode: MEETING_AGENT_MODE,
      userId: `meeting_agent_user_${meeting.id}`,
      conversationId: chatStore.getCurrentConversationId(MEETING_AGENT_ID),
      agentId: MEETING_AGENT_ID,
    };

    const payload = chatStore.attachPersonaToPayload
      ? chatStore.attachPersonaToPayload(MEETING_AGENT_ID, basePayload)
      : basePayload;

    const response = await chatAPI.sendMessage(payload);
    chatStore.syncPersonaFromResponse(MEETING_AGENT_ID, response.data);
    const result = response.data;
    console.log('[BusinessMeetingAgent] AI response received:', result);

    // Parse the AI response - backend returns {content: string, ...}
    let parsedResponse;
    try {
      // The backend returns the assistant's response in the 'content' field
      const responseContent = result.content || '';

      console.log('[BusinessMeetingAgent] Raw AI response content:', responseContent);

      // Try to extract JSON from the response
      // First check if the entire response is valid JSON
      try {
        parsedResponse = JSON.parse(responseContent);
        console.log('[BusinessMeetingAgent] Successfully parsed response as direct JSON');
      } catch {
        // If not direct JSON, try to extract JSON from markdown code blocks
        const jsonMatch = responseContent.match(/```json\n?([\s\S]*?)\n?```/) ||
                          responseContent.match(/```\n?([\s\S]*?)\n?```/) ||
                          responseContent.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const jsonString = jsonMatch[1] || jsonMatch[0];
          console.log('[BusinessMeetingAgent] Attempting to parse extracted JSON:', jsonString);
          parsedResponse = JSON.parse(jsonString);
          console.log('[BusinessMeetingAgent] Successfully parsed extracted JSON');
        } else {
          throw new Error('No JSON structure found in response');
        }
      }
    } catch (parseError) {
      console.warn('[BusinessMeetingAgent] Could not parse AI response as JSON:', parseError);
      console.log('[BusinessMeetingAgent] Full response object:', JSON.stringify(result, null, 2));

      // Fallback: Try to extract meaningful content from the response
      const responseContent = result.content || 'Could not generate summary';

      // Check if the response contains common phrases that indicate the AI didn't process the transcript
      const genericResponses = [
        'provide the transcript',
        'once I have that',
        'please provide',
        'analyze the meeting',
        'I can generate'
      ];

      const isGenericResponse = genericResponses.some(phrase =>
        responseContent.toLowerCase().includes(phrase)
      );

      if (isGenericResponse) {
        // AI didn't process the transcript properly - try to create a basic summary
        meeting.summary = `Meeting transcript recorded with ${meeting.transcript.split('\n').length} lines of conversation. The AI assistant was unable to process the content properly. Manual review recommended.`;
        meeting.actionItems = [];
        console.error('[BusinessMeetingAgent] AI provided generic response instead of analyzing transcript');
      } else {
        // Use the raw response as-is
        meeting.summary = `Note: AI response was not in expected JSON format.\n\n${responseContent}`;
        meeting.actionItems = [];
      }
      return;
    }

    // Apply the parsed summary and action items
    meeting.summary = parsedResponse.summary || 'No summary could be generated from this transcript.';
    meeting.actionItems = Array.isArray(parsedResponse.actionItems) ? parsedResponse.actionItems : [];

    console.log('[BusinessMeetingAgent] Summary generated:', {
      summaryLength: meeting.summary.length,
      actionItemsCount: meeting.actionItems.length
    });

  } catch (error) {
    console.error('[BusinessMeetingAgent] Failed to generate summary:', error);
    meeting.summary = 'Failed to generate summary from transcript.';
    meeting.actionItems = [];
  }
}

function drawVisualizer() {
  if (!analyser || !visualizerCanvas.value) {
    console.warn('[BusinessMeetingAgent] Cannot draw visualizer - missing components');
    return;
  }

  const canvas = visualizerCanvas.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('[BusinessMeetingAgent] Could not get canvas context');
    return;
  }

  console.log('[BusinessMeetingAgent] Starting visualizer animation');

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const draw = () => {
    if (!isRecording.value || isPaused.value) {
      // Stop animation if not recording or paused
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      // Clear canvas
      ctx.fillStyle = 'rgb(30, 41, 59)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    animationId = requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    // Dark background
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw waveform
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgb(59, 130, 246)';
    ctx.beginPath();

    const sliceWidth = (canvas.width * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Draw center line
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  };

  draw();
}

function selectMeeting(meeting: Meeting) {
  selectedMeeting.value = meeting;
  activeTab.value = 'transcript';
}

function playRecording(meeting: Meeting) {
  if (meeting.audioBlob) {
    const audioUrl = URL.createObjectURL(meeting.audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
  } else {
    alert('Audio recording not available');
  }
}

function downloadMeeting(meeting: Meeting) {
  const data = {
    title: meeting.title,
    date: meeting.date,
    duration: meeting.duration,
    participants: meeting.participants,
    notes: meeting.notes,
    transcript: meeting.transcript,
    summary: meeting.summary,
    actionItems: meeting.actionItems
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}_${meeting.date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function deleteMeeting(id: string) {
  if (confirm('Are you sure you want to delete this meeting?')) {
    meetings.value = meetings.value.filter(m => m.id !== id);
    saveMeetingsToStorage();
    if (selectedMeeting.value?.id === id) {
      selectedMeeting.value = null;
    }
  }
}

function clearAllMeetings() {
  if (confirm('Are you sure you want to delete all meetings? This cannot be undone.')) {
    meetings.value = [];
    localStorage.removeItem(STORAGE_KEY);
    selectedMeeting.value = null;
  }
}

function exportAllMeetings() {
  const data = meetings.value.map(m => ({
    title: m.title,
    date: m.date,
    duration: m.duration,
    participants: m.participants,
    notes: m.notes,
    transcript: m.transcript,
    summary: m.summary,
    actionItems: m.actionItems
  }));

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `all_meetings_${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importMeetings() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (Array.isArray(data)) {
            data.forEach(m => {
              meetings.value.push({
                ...m,
                id: generateId(),
                date: new Date(m.date),
                status: 'processed'
              });
            });
            saveMeetingsToStorage();
          }
        } catch (error) {
          alert('Failed to import meetings. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

function copyToClipboard(meeting: Meeting) {
  const content = `${meeting.title}
Date: ${formatDate(meeting.date)}
Duration: ${formatDuration(meeting.duration)}
${meeting.participants ? `Participants: ${meeting.participants}\n` : ''}

Summary:
${meeting.summary}

Transcript:
${meeting.transcript}

Action Items:
${meeting.actionItems?.map(item => `- ${item}`).join('\n')}`;

  navigator.clipboard.writeText(content).then(() => {
    alert('Copied to clipboard!');
  });
}

function clearFilters() {
  searchTerm.value = '';
  filterDateFrom.value = '';
  filterDateTo.value = '';
  filterParticipants.value = '';
  sortBy.value = 'date';
}

// Utility functions
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>

<style lang="scss" scoped>
.business-meeting-agent-view {
  @apply h-full w-full flex flex-col overflow-hidden;
  background: linear-gradient(135deg,
    hsl(var(--color-bg-primary-h), var(--color-bg-primary-s), var(--color-bg-primary-l)) 0%,
    hsl(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l)) 100%);
}

.meeting-content-wrapper {
  @apply flex flex-col h-full w-full p-6 mx-auto overflow-y-auto;
  max-width: 1400px;
}

// Header
.meeting-header {
  @apply flex justify-between items-center mb-6 pb-4 border-b;
  border-color: hsl(var(--color-border-secondary-h), var(--color-border-secondary-s), var(--color-border-secondary-l));

  .header-left {
    @apply flex items-center gap-4;
  }

  .header-right {
    @apply flex items-center gap-2;
  }

  .meeting-title {
    @apply text-2xl font-bold;
    color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  }
}

// Recording Session
.recording-session {
  @apply rounded-xl p-6 mb-6 shadow-xl;
  background-color: hsl(var(--color-bg-tertiary-h), var(--color-bg-tertiary-s), var(--color-bg-tertiary-l));

  .recording-header {
    @apply flex justify-between items-center mb-4;

    h3 {
      @apply text-xl font-semibold text-white;
    }

    .recording-timer {
      @apply flex items-center gap-2 text-white;

      .recording-indicator {
        @apply w-3 h-3 bg-red-500 rounded-full animate-pulse;
      }
    }
  }

  .recording-controls {
    @apply space-y-4;

    .audio-visualizer {
      @apply bg-gray-900 rounded-lg p-2 overflow-hidden;

      canvas {
        @apply w-full h-24;
      }
    }

    .control-buttons {
      @apply flex justify-center gap-4;

      button {
        @apply flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200;

        &.btn-record {
          @apply bg-red-600 text-white hover:bg-red-700;
        }

        &.btn-pause {
          @apply bg-yellow-600 text-white hover:bg-yellow-700;
        }

        &.btn-resume {
          @apply bg-green-600 text-white hover:bg-green-700;
        }

        &.btn-stop {
          @apply bg-gray-600 text-white hover:bg-gray-700;
        }
      }
    }

    .meeting-metadata {
      @apply space-y-3;

      .metadata-input {
        @apply w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none;
      }
    }
  }

  .processing-status {
    @apply flex items-center gap-3 mt-4 p-4 bg-gray-900 rounded-lg;

    .processing-spinner {
      @apply w-6 h-6 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin;
    }

    p {
      @apply text-white;
    }
  }
}

// Filter Section
.filter-section {
  @apply bg-gray-800 rounded-xl p-6 mb-6 shadow-xl;

  .filter-controls {
    @apply space-y-4;
  }

  .search-input {
    @apply w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none;
  }

  .filter-grid {
    @apply grid grid-cols-3 gap-4;
  }

  .filter-item {
    @apply flex flex-col gap-2;

    label {
      @apply text-sm font-medium text-gray-300;
    }
  }

  .filter-input,
  .filter-select {
    @apply px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none;
  }
}

// Buttons
.btn-primary-meeting {
  @apply flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium;
  // Darker background for better contrast with white text
  background-color: hsl(var(--color-accent-primary-h), calc(var(--color-accent-primary-s) * 0.9), calc(var(--color-accent-primary-l) * 0.5));
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  border: 1px solid hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), calc(var(--color-accent-primary-l) * 0.4), 0.3);

  &:hover:not(:disabled) {
    background-color: hsl(var(--color-accent-primary-h), calc(var(--color-accent-primary-s) * 0.95), calc(var(--color-accent-primary-l) * 0.45));
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
    transform: translateY(-1px);
  }
}

.btn-icon-meeting {
  @apply p-2 rounded-lg transition-colors duration-200;
  background-color: hsla(var(--color-bg-tertiary-h), var(--color-bg-tertiary-s), var(--color-bg-tertiary-l), 0.6);
  color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));

  &:hover {
    background-color: hsl(var(--color-bg-tertiary-h), var(--color-bg-tertiary-s), calc(var(--color-bg-tertiary-l) + 5%));
    color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  }
}

.btn-card-action {
  @apply p-1 rounded hover:bg-gray-600 transition-colors duration-200;

  &.danger:hover {
    @apply bg-red-500 text-white;
  }
}

.btn-clear-filters {
  @apply w-full px-4 py-2 mt-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200;
}

.btn-danger-outline {
  @apply flex items-center justify-center gap-2 px-4 py-2 border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all duration-200;
}

.btn-close {
  @apply p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200;
}

.btn-primary,
.btn-secondary {
  @apply flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.btn-secondary {
  @apply bg-gray-600 text-white hover:bg-gray-700;
}

// Meeting Grid
.meetings-container {
  @apply flex-1 overflow-y-auto;
}

.meetings-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4;
}

.meeting-card {
  @apply bg-gray-800 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105;

  &.active {
    @apply ring-2 ring-blue-500;
  }

  .card-header {
    @apply relative p-3 flex justify-between items-center;

    .card-status {
      @apply text-sm font-medium;

      &.processed {
        @apply text-green-500;
      }

      &.processing {
        @apply text-yellow-500;
      }
    }

    .card-actions {
      @apply flex gap-1 opacity-0 transition-opacity duration-200;
    }
  }

  &:hover .card-actions {
    @apply opacity-100;
  }

  .card-body {
    @apply p-4 pt-0;
  }

  .card-title {
    @apply text-lg font-semibold text-white mb-2 line-clamp-2;
  }

  .card-date,
  .card-duration,
  .card-participants {
    @apply flex items-center gap-2 text-sm text-gray-400 mb-1;
  }

  .card-summary {
    @apply text-sm text-gray-500 mt-2;
  }
}

// Empty & Loading States
.loading-state,
.empty-state {
  @apply flex flex-col items-center justify-center h-64 text-center;

  .loading-spinner {
    @apply w-12 h-12 mb-4 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin;
  }

  .empty-icon {
    @apply text-6xl mb-4 opacity-50;
  }

  h3 {
    @apply text-xl font-semibold text-white mb-2;
  }

  p {
    @apply text-gray-400;
  }
}

.clear-all-section {
  @apply mt-6 flex justify-center;
}

// Modal
.meeting-modal {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4;

  .modal-content {
    @apply bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col;
  }

  .modal-header {
    @apply flex justify-between items-center p-6 border-b border-gray-700;

    h2 {
      @apply text-2xl font-bold text-white;
    }
  }

  .modal-body {
    @apply flex-1 overflow-y-auto p-6;

    .meeting-info {
      @apply mb-6 space-y-2;

      p {
        color: #d1d5db !important;

        strong {
          color: #ffffff !important;
        }
      }
    }

    .tabs {
      @apply flex gap-2 mb-4 border-b border-gray-700;

      .tab-button {
        @apply px-4 py-2 text-gray-400 hover:text-white transition-colors duration-200 border-b-2 border-transparent;

        &.active {
          @apply text-white border-blue-500;
        }
      }
    }

    .tab-content {
      @apply min-h-[200px];

      .transcript {
        @apply bg-gray-900 rounded-lg p-4;

        pre {
          @apply whitespace-pre-wrap font-mono text-sm;
          color: #e5e5e5 !important;
          background-color: transparent !important;
        }
      }

      .summary {
        @apply text-gray-200;
        color: #e5e5e5 !important;
      }

      .action-items {
        ul {
          @apply list-disc list-inside space-y-2;
          color: #d1d5db !important;

          li {
            color: #d1d5db !important;
          }
        }

        p {
          color: #9ca3af !important;
        }
      }
    }

    .modal-actions {
      @apply flex justify-end gap-3 mt-6;
    }
  }
}

// Transitions
.recording-slide-enter-active,
.recording-slide-leave-active,
.filter-slide-enter-active,
.filter-slide-leave-active {
  transition: all 0.3s ease-out;
}

.recording-slide-enter-from,
.filter-slide-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.recording-slide-leave-to,
.filter-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-content {
  transform: scale(0.9);
}

.modal-leave-to .modal-content {
  transform: scale(0.9);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
