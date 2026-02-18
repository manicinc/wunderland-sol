// File: frontend/src/utils/api.ts
/**
 * @file API Utility
 * @description Centralized Axios instance and API endpoint definitions for frontend-backend communication.
 * Handles base URL configuration, authentication token injection, and basic error interception.
 * All functions are designed to be type-safe and adhere to modern TypeScript practices.
 * @version 1.4.1 - Corrected sendMessageStream callback references and ensured full file content.
 */
import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import type { PlanId } from '@framers/shared/planCatalog';
import type { RateLimitInfo } from '@framers/shared/rateLimitTypes';
import type {
  WorkflowDefinitionFE,
  WorkflowInstanceFE,
  WorkflowProgressUpdateFE,
  WorkflowUpdateEventDetail,
  WorkflowInvocationRequestFE,
  StartWorkflowPayloadFE,
} from '@/types/workflow';
import type { AgencyUpdateEventDetail } from '@/types/agency';

// Environment variables for API configuration.
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

type AgentOSClientMode = 'proxy' | 'direct';

const AGENTOS_FRONTEND_ENABLED: boolean =
  String(import.meta.env.VITE_AGENTOS_ENABLED ?? 'false').toLowerCase() === 'true';
const AGENTOS_CLIENT_MODE: AgentOSClientMode = (
  import.meta.env.VITE_AGENTOS_CLIENT_MODE ?? 'proxy'
).toLowerCase() as AgentOSClientMode;

const normalizeAgentOSPath = (value: string): string => {
  if (!value) return '/agentos/chat';
  return value.startsWith('/') ? value : `/${value}`;
};

const AGENTOS_CHAT_PATH = normalizeAgentOSPath(
  import.meta.env.VITE_AGENTOS_CHAT_PATH ?? '/agentos/chat'
);
const AGENTOS_STREAM_PATH = normalizeAgentOSPath(
  import.meta.env.VITE_AGENTOS_STREAM_PATH ?? '/agentos/stream'
);
const SHOULD_USE_AGENTOS_ROUTES = AGENTOS_FRONTEND_ENABLED && AGENTOS_CLIENT_MODE === 'direct';

/**
 * Key used for storing the authentication token in localStorage or sessionStorage.
 * @constant {string}
 */
export const AUTH_TOKEN_KEY: string = 'vcaAuthToken';

/**
 * Main Axios instance for API communication.
 * Configured with a base URL, timeout, and default headers.
 * @type {AxiosInstance}
 */
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000, // 90 seconds timeout for potentially long operations
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Version': '1.4.1', // Updated client version
  },
});

console.log(`[API Service] Initialized. Base URL: ${api.defaults.baseURL}`);

const joinWithApiBase = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL.replace(/\/$/, '')}${normalizedPath}`;
};

const emitSessionCostUpdate = (detail?: SessionCostDetailsFE): void => {
  if (!detail || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<SessionCostDetailsFE>('vca:session-cost', { detail }));
};

const emitWorkflowUpdate = (detail: WorkflowUpdateEventDetail): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<WorkflowUpdateEventDetail>('vca:workflow-update', { detail })
  );
};

const emitAgencyUpdate = (detail: AgencyUpdateEventDetail): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent<AgencyUpdateEventDetail>('vca:agency-update', { detail }));
};

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    if (!config.headers.Authorization) {
      const authHeaders = getAuthHeaders();
      if (authHeaders.Authorization) {
        config.headers.Authorization = authHeaders.Authorization;
      }
    }
    return config;
  },
  (error: any): Promise<any> => {
    console.error('[API Service] Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  (error: any): Promise<any> => {
    const status: number | undefined = error.response?.status;
    const url: string | undefined = error.config?.url;
    const method: string = (error.config?.method || 'GET').toUpperCase();
    const baseURL: string | undefined = error.config?.baseURL || api.defaults.baseURL;
    const responseData = error.response?.data; // Renamed to avoid conflict in other scopes

    if (typeof status === 'undefined') {
      console.error(`[API Service] Network error for ${method} ${url ?? '(unknown URL)'}`, {
        baseURL,
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error(
        `[API Service] Response Error: Status ${status} from ${method} ${url}`,
        responseData || error.message,
        {
          baseURL,
          headers: error.response?.headers,
        }
      );

      if (status >= 500) {
        console.warn('[API Service] Upstream server responded with an error status.', {
          status,
          method,
          url,
          baseURL,
          data: responseData,
        });
        if (status === 502) {
          const resolvedUrl = baseURL
            ? `${baseURL.replace(/\/$/, '')}/${(url || '').replace(/^\//, '')}`
            : url;
          console.warn(
            '[API Service] 502 Bad Gateway detected. Verify the backend/API host is reachable and VITE_API_BASE_URL is correct.',
            { baseURL, resolvedUrl }
          );
        }
      }
    }

    if (status === 401 && typeof window !== 'undefined') {
      const currentToken = getAuthToken();
      if (currentToken) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        if (api.defaults.headers.common['Authorization']) {
          delete api.defaults.headers.common['Authorization'];
        }
        console.warn(
          '[API Service] Unauthorized (401) with existing token. Cleared token. Redirecting to login.'
        );
        if (
          window.location.pathname !== '/login' &&
          !window.location.pathname.startsWith('/welcome')
        ) {
          window.location.href = `/login?sessionExpired=true&reason=unauthorized&redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }
      } else {
        console.warn('[API Service] Unauthorized (401) but no token was present.');
      }
    }
    return Promise.reject(error);
  }
);

// --- Shared Type Definitions for API Payloads & Responses ---

export interface ILlmUsageFE {
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
}

export interface ILlmToolCallFunctionFE {
  name: string;
  arguments: string; // JSON string
}

export interface ILlmToolCallFE {
  id: string;
  type: 'function';
  function: ILlmToolCallFunctionFE;
}

export interface LlmToolFE {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: object; // JSON Schema object
  };
}

export interface AuthResponseFE {
  token?: string;
  user: { id: string; [key: string]: any };
  message: string;
  authenticated?: boolean;
  /**
   * Indicates the origin/provider of the issued auth token (e.g. 'global', 'standard', 'supabase').
   * Frontend uses this to branch UX flows and feature gating. Optional for backward compatibility.
   */
  tokenProvider?: string;
}

export interface LogoutResponseFE {
  message: string;
}

export const authAPI = {
  loginGlobal: (payload: {
    password: string;
    rememberMe?: boolean;
  }): Promise<AxiosResponse<AuthResponseFE>> => api.post('/auth/global', payload),
  loginStandard: (payload: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }): Promise<AxiosResponse<AuthResponseFE>> => api.post('/auth/login', payload),
  register: (payload: {
    email: string;
    password: string;
  }): Promise<AxiosResponse<AuthResponseFE>> => api.post('/auth/register', payload),
  checkStatus: (): Promise<AxiosResponse<AuthResponseFE>> => api.get('/auth'),
  logout: (): Promise<AxiosResponse<LogoutResponseFE>> => api.delete('/auth'),
};

export interface BillingCheckoutResponseFE {
  checkoutUrl: string;
  checkoutSessionId: string;
}

export interface BillingCheckoutRequest {
  planId: PlanId;
  successUrl?: string;
  cancelUrl?: string;
  clientSessionId?: string;
}

export interface BillingCheckoutStatusResponseFE {
  status: 'created' | 'pending' | 'paid' | 'complete' | 'failed' | 'expired';
  planId: string;
  token?: string;
  user?: Record<string, any>;
}

export const billingAPI = {
  createCheckoutSession: (
    payload: BillingCheckoutRequest,
    options?: { token?: string }
  ): Promise<AxiosResponse<BillingCheckoutResponseFE>> => {
    const config: AxiosRequestConfig | undefined = options?.token
      ? { headers: { Authorization: `Bearer ${options.token}` } }
      : undefined;
    return api.post('/billing/checkout', payload, config);
  },
  getCheckoutStatus: (
    checkoutId: string,
    options?: { token?: string }
  ): Promise<AxiosResponse<BillingCheckoutStatusResponseFE>> => {
    const config: AxiosRequestConfig | undefined = options?.token
      ? { headers: { Authorization: `Bearer ${options.token}` } }
      : undefined;
    return api.get(`/billing/status/${checkoutId}`, config);
  },
};

export interface UserAgentDto {
  id: string;
  userId?: string;
  label: string;
  slug: string | null;
  planId: string | null;
  status: string;
  config: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export interface AgentPlanSnapshotDto {
  planId: PlanId;
  limits: {
    maxActiveAgents: number;
    monthlyCreationAllowance: number;
    knowledgeDocumentsPerAgent: number;
    agencySeats: number;
  };
  usage: {
    activeAgents: number;
    monthlyCreations: number;
  };
}

export const userAgentsAPI = {
  list: (): Promise<AxiosResponse<{ agents: UserAgentDto[] }>> => api.get('/agents'),
  get: (agentId: string): Promise<AxiosResponse<UserAgentDto>> => api.get('/agents/' + agentId),
  snapshot: (): Promise<AxiosResponse<AgentPlanSnapshotDto>> => api.get('/agents/plan/snapshot'),
  create: (payload: {
    label: string;
    slug?: string | null;
    config: Record<string, unknown>;
  }): Promise<AxiosResponse<UserAgentDto>> => api.post('/agents', payload),
  update: (
    agentId: string,
    payload: Partial<{
      label: string;
      slug: string | null;
      status: string;
      config: Record<string, unknown>;
      archived: boolean;
    }>
  ): Promise<AxiosResponse<UserAgentDto>> => api.patch('/agents/' + agentId, payload),
  remove: (agentId: string): Promise<AxiosResponse<void>> => api.delete('/agents/' + agentId),
};

export interface UserAgentKnowledgeDto {
  id: string;
  type: string;
  tags: string[];
  content: string;
  metadata?: Record<string, unknown> | null;
  agentId?: string | null;
  ownerUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const userAgentKnowledgeAPI = {
  list: (agentId: string): Promise<AxiosResponse<{ knowledge: UserAgentKnowledgeDto[] }>> =>
    api.get(`/agents/${agentId}/knowledge`),
  create: (
    agentId: string,
    payload: { type: string; content: string; tags?: string[]; metadata?: Record<string, unknown> }
  ): Promise<AxiosResponse<UserAgentKnowledgeDto>> =>
    api.post(`/agents/${agentId}/knowledge`, payload),
  remove: (agentId: string, knowledgeId: string): Promise<AxiosResponse<void>> =>
    api.delete(`/agents/${agentId}/knowledge/${knowledgeId}`),
};

export const rateLimitAPI = {
  getStatus: (): Promise<AxiosResponse<RateLimitInfo>> => api.get('/rate-limit/status'),
};

export interface ChatMessageFE {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'error';
  content: string | null;
  timestamp?: number;
  agentId?: string;
  tool_call_id?: string;
  tool_calls?: ILlmToolCallFE[];
  name?: string;
}

export interface ProcessedHistoryMessageFE extends ChatMessageFE {
  id?: string;
  estimatedTokenCount?: number;
  processedTokens?: string[];
  relevanceScore?: number;
}

export interface ChatMessagePayloadFE {
  messages: ChatMessageFE[];
  processedHistory?: ProcessedHistoryMessageFE[];
  mode: string;
  organizationId?: string | null;
  language?: string;
  generateDiagram?: boolean;
  userId?: string;
  conversationId?: string;
  agentId?: string;
  systemPromptOverride?: string;
  tutorMode?: boolean;
  tutorLevel?: string;
  interviewMode?: boolean;
  stream?: boolean;
  personaOverride?: string | null;
  /**
   * Controls AgentOS long-term memory persistence (per conversation).
   * This is forwarded to AgentOS when routing through `/api/agentos/*` or `/api/chat` (AgentOS proxy).
   */
  memoryControl?: {
    longTermMemory?: {
      enabled?: boolean;
      scopes?: Partial<Record<'conversation' | 'user' | 'persona' | 'organization', boolean>>;
      shareWithOrganization?: boolean;
      storeAtomicDocs?: boolean;
      allowedCategories?: string[];
    };
  } | null;
  tool_response?: {
    tool_call_id: string;
    tool_name: string;
    output: string;
  };
  workflowRequest?: WorkflowInvocationRequestFE | null;
  tools?: LlmToolFE[];
  tool_choice?: 'none' | 'auto' | { type: 'function'; function: { name: string } };
}

export interface PersonaUpdatePayloadFE {
  agentId: string;
  conversationId: string;
  persona: string | null;
  userId?: string;
}

export interface SessionCostDetailsFE {
  userId: string;
  sessionCost: number;
  costsByService: Record<
    string,
    {
      totalCost: number;
      count: number;
      details?: Array<{ model?: string; cost: number; timestamp: string }>;
    }
  >;
  sessionStartTime: string;
  entryCount: number;
  globalMonthlyCost: number;
  threshold: number;
  isThresholdReached: boolean;
}

interface BaseChatResponseDataFE {
  model: string;
  usage?: ILlmUsageFE;
  metadata?: Record<string, any> | null;
  sessionCost: SessionCostDetailsFE | null;
  costOfThisCall: number | null;
  conversationId: string;
  persona?: string | null;
}

export interface TextResponseDataFE extends BaseChatResponseDataFE {
  type?: 'text_response' | undefined;
  content: string | null;
  discernment?: 'RESPOND' | 'ACTION_ONLY' | 'IGNORE' | 'CLARIFY' | Record<string, any>;
  message?: string;
  tool_calls?: ILlmToolCallFE[];
}

export interface FunctionCallResponseDataFE extends BaseChatResponseDataFE {
  type: 'function_call_data';
  toolName: string;
  toolArguments: Record<string, any>;
  toolCallId: string;
  discernment?: 'TOOL_CALL_PENDING' | Record<string, any>;
  assistantMessageText?: string | null;
}

export type ChatResponseDataFE = TextResponseDataFE | FunctionCallResponseDataFE;

interface AgentOSChatAdapterResult {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  conversationId: string;
  persona?: string | null;
  personaLabel?: string | null;
  metadata?: Record<string, any>;
}

interface AgentOSChatPayload {
  userId: string;
  organizationId?: string | null;
  conversationId: string;
  mode: string;
  messages: Array<Pick<ChatMessageFE, 'role' | 'content' | 'name' | 'tool_call_id'>>;
  workflowRequest?: WorkflowInvocationRequestFE | null;
  memoryControl?: ChatMessagePayloadFE['memoryControl'];
}

const isAgentOSAdapterResult = (value: any): value is AgentOSChatAdapterResult => {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.content === 'string' &&
    typeof value.model === 'string' &&
    typeof value.conversationId === 'string'
  );
};

const adaptAgentOSResponse = (
  result: AgentOSChatAdapterResult,
  mode?: string
): ChatResponseDataFE => {
  const usage = result.usage
    ? {
        prompt_tokens: result.usage.promptTokens ?? null,
        completion_tokens: result.usage.completionTokens ?? null,
        total_tokens: result.usage.totalTokens ?? null,
      }
    : undefined;
  return {
    type: 'text_response',
    content: result.content,
    message: result.content,
    model: result.model,
    usage,
    metadata: result.metadata ?? null,
    conversationId: result.conversationId,
    sessionCost: null,
    costOfThisCall: null,
    persona: result.persona ?? null,
    discernment: { provider: 'agentos', mode },
  };
};

const isAgentOSFinalResponseChunk = (
  value: any
): value is {
  type: 'final_response';
  streamId: string;
  finalResponseText: string | null;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    totalCostUSD?: number;
  };
  metadata?: Record<string, any>;
  personaId?: string;
  activePersonaDetails?: { id?: string } | null;
} => {
  return (
    value &&
    typeof value === 'object' &&
    value.type === 'final_response' &&
    typeof value.streamId === 'string' &&
    Object.prototype.hasOwnProperty.call(value, 'finalResponseText')
  );
};

const adaptAgentOSStreamFinalResponse = (chunk: any, mode?: string): ChatResponseDataFE => {
  const usage = chunk?.usage
    ? {
        prompt_tokens: chunk.usage.promptTokens ?? null,
        completion_tokens: chunk.usage.completionTokens ?? null,
        total_tokens: chunk.usage.totalTokens ?? null,
      }
    : undefined;

  const personaId = chunk?.activePersonaDetails?.id ?? chunk?.personaId ?? null;

  return {
    type: 'text_response',
    content: typeof chunk?.finalResponseText === 'string' ? chunk.finalResponseText : null,
    message: typeof chunk?.finalResponseText === 'string' ? chunk.finalResponseText : undefined,
    model: chunk?.metadata?.modelId ?? 'agentos',
    usage,
    metadata: chunk?.metadata ?? null,
    conversationId: chunk?.streamId ?? '',
    sessionCost: null,
    costOfThisCall:
      typeof chunk?.usage?.totalCostUSD === 'number' ? chunk.usage.totalCostUSD : null,
    persona: typeof personaId === 'string' ? personaId : null,
    discernment: { provider: 'agentos', mode, stream: true },
  };
};

const ensureAgentOSPayload = (payload: ChatMessagePayloadFE): AgentOSChatPayload => {
  const fallbackMode = payload.mode || 'default';
  const userId = (payload.userId && payload.userId.trim()) || `agentos-user-${fallbackMode}`;
  const conversationId =
    (payload.conversationId && payload.conversationId.trim()) ||
    `agentos-conv-${fallbackMode}-${Date.now()}`;

  const simplifiedMessages = (payload.messages || [])
    .filter((msg): msg is ChatMessageFE => Boolean(msg && msg.role))
    .map((msg) => ({
      role: msg.role,
      content: msg.content ?? '',
      name: msg.name,
      tool_call_id: msg.tool_call_id,
    }));

  return {
    userId,
    organizationId: payload.organizationId ?? null,
    conversationId,
    mode: fallbackMode,
    messages: simplifiedMessages,
    workflowRequest: payload.workflowRequest ?? null,
    memoryControl: payload.memoryControl ?? null,
  };
};

const shouldRouteThroughAgentOS = (payload: ChatMessagePayloadFE): boolean => {
  return (
    SHOULD_USE_AGENTOS_ROUTES &&
    Boolean(payload?.mode) &&
    Array.isArray(payload?.messages) &&
    payload.messages.length > 0
  );
};

const buildAgentOSStreamQuery = (payload: AgentOSChatPayload): string => {
  const params = new URLSearchParams();
  params.set('userId', payload.userId);
  params.set('conversationId', payload.conversationId);
  params.set('mode', payload.mode);
  params.set('messages', JSON.stringify(payload.messages));
  if (payload.organizationId) {
    params.set('organizationId', payload.organizationId);
  }
  if (payload.workflowRequest) {
    params.set('workflowRequest', JSON.stringify(payload.workflowRequest));
  }
  if (payload.memoryControl) {
    params.set('memoryControl', JSON.stringify(payload.memoryControl));
  }
  return params.toString();
};

const postAgentOSChat = async (
  payload: ChatMessagePayloadFE
): Promise<AxiosResponse<ChatResponseDataFE>> => {
  const agentosPayload = ensureAgentOSPayload(payload);
  const response = await api.post<AgentOSChatAdapterResult>(AGENTOS_CHAT_PATH, agentosPayload);
  const normalized = adaptAgentOSResponse(response.data, agentosPayload.mode);
  const normalizedResponse: AxiosResponse<ChatResponseDataFE> = {
    ...response,
    data: normalized,
  };
  emitSessionCostUpdate(normalized.sessionCost ?? undefined);
  return normalizedResponse;
};

export const chatAPI = {
  sendMessage: async (data: ChatMessagePayloadFE): Promise<AxiosResponse<ChatResponseDataFE>> => {
    if (shouldRouteThroughAgentOS(data)) {
      return postAgentOSChat(data);
    }
    const response = await api.post('/chat', data);
    emitSessionCostUpdate(response.data?.sessionCost);
    return response;
  },

  updatePersona: (
    payload: PersonaUpdatePayloadFE
  ): Promise<AxiosResponse<{ persona: string | null; agentId: string; conversationId: string }>> =>
    api.post('/chat/persona', payload),

  detectLanguage: (
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<AxiosResponse<{ language: string | null; confidence: number | null }>> =>
    api.post('/chat/detect-language', { messages }),

  sendMessageStream: async (
    payloadData: ChatMessagePayloadFE,
    onChunkReceived: (chunk: string) => void,
    onStreamEnd: () => void,
    onStreamError: (error: Error) => void
  ): Promise<ChatResponseDataFE | undefined> => {
    const payload = { ...payloadData, stream: true };
    const directAgentOS = shouldRouteThroughAgentOS(payload);
    const agentosPayload = directAgentOS ? ensureAgentOSPayload(payload) : null;
    const streamUrl = directAgentOS ? joinWithApiBase(AGENTOS_STREAM_PATH) : `${API_BASE_URL}/chat`;

    const fetchOptions: RequestInit = directAgentOS
      ? {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            'X-Client-Version': '1.4.1',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(agentosPayload),
        }
      : {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            'X-Client-Version': '1.4.1',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(payload),
        };

    try {
      const response = await fetch(streamUrl, fetchOptions);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({
          message: `Request failed with status ${response.status}`,
          error: response.statusText,
        }));
        throw new Error(
          `API Error: ${response.status} ${errorBody.message || errorBody.error || response.statusText}`
        );
      }
      if (!response.body) {
        throw new Error(
          'Stream body is null, which is unexpected for a successful stream response.'
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResponseData: any;
      let emittedText = false;
      let agentosMetadata: Record<string, any> = {};
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            try {
              const finalDataObject = JSON.parse(buffer);
              finalResponseData = finalDataObject;
              if (
                finalDataObject &&
                typeof finalDataObject === 'object' &&
                finalDataObject.content
              ) {
                onChunkReceived(finalDataObject.content);
              } else if (
                finalDataObject &&
                typeof finalDataObject === 'object' &&
                !finalDataObject.content
              ) {
                console.info(
                  '[API Service] Stream ended with metadata (from buffer):',
                  finalDataObject
                );
              } else {
                onChunkReceived(buffer);
              }
            } catch (e) {
              onChunkReceived(buffer);
            }
          }
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.substring(0, newlineIndex).trim();
          buffer = buffer.substring(newlineIndex + 1);

          if (line.startsWith('data: ')) {
            const jsonData = line.substring('data: '.length);
            try {
              const parsedChunk = JSON.parse(jsonData);
              if (parsedChunk.type === 'workflow_update') {
                if (parsedChunk.workflow) {
                  emitWorkflowUpdate({
                    workflow: parsedChunk.workflow as WorkflowProgressUpdateFE,
                    metadata: parsedChunk.metadata,
                  });
                }
              } else if (parsedChunk.type === 'agency_update') {
                if (parsedChunk.agency) {
                  emitAgencyUpdate({
                    agency: {
                      ...parsedChunk.agency,
                      updatedAt: Date.now(),
                    },
                  });
                }
              } else if (parsedChunk.type === 'metadata_update') {
                if (parsedChunk.updates && typeof parsedChunk.updates === 'object') {
                  agentosMetadata = { ...agentosMetadata, ...parsedChunk.updates };
                }
              } else if (
                parsedChunk.type === 'text_delta' &&
                typeof parsedChunk.textDelta === 'string'
              ) {
                emittedText = emittedText || parsedChunk.textDelta.trim().length > 0;
                onChunkReceived(parsedChunk.textDelta);
              } else if (isAgentOSFinalResponseChunk(parsedChunk)) {
                finalResponseData = adaptAgentOSStreamFinalResponse(
                  parsedChunk,
                  agentosPayload?.mode
                );
                if (finalResponseData && typeof finalResponseData === 'object') {
                  finalResponseData.metadata = {
                    ...agentosMetadata,
                    ...(parsedChunk.metadata && typeof parsedChunk.metadata === 'object'
                      ? parsedChunk.metadata
                      : {}),
                  };
                }
                if (
                  !emittedText &&
                  typeof parsedChunk.finalResponseText === 'string' &&
                  parsedChunk.finalResponseText.trim().length > 0
                ) {
                  emittedText = true;
                  onChunkReceived(parsedChunk.finalResponseText);
                }
              } else if (parsedChunk.type === 'chunk' && typeof parsedChunk.content === 'string') {
                onChunkReceived(parsedChunk.content);
              } else if (parsedChunk.type === 'error' && typeof parsedChunk.message === 'string') {
                throw new Error(parsedChunk.message);
              } else if (parsedChunk.type === 'tool_call_delta') {
                console.log('[API Service] Stream: Tool call delta received:', parsedChunk);
              } else if (parsedChunk.type === 'final_response_metadata') {
                console.info('[API Service] Stream: Final response metadata:', parsedChunk);
              } else if (parsedChunk.content && typeof parsedChunk.content === 'string') {
                onChunkReceived(parsedChunk.content);
              } else if (directAgentOS && isAgentOSAdapterResult(parsedChunk)) {
                finalResponseData = adaptAgentOSResponse(parsedChunk as any, agentosPayload?.mode);
                if (parsedChunk.content) {
                  onChunkReceived(parsedChunk.content);
                }
              } else {
                console.warn('[API Service] Stream: Received unknown JSON structure:', parsedChunk);
              }
            } catch (e) {
              console.warn('[API Service] Stream: Failed to parse JSON data event:', jsonData, e);
              if (
                jsonData &&
                !line.startsWith('event:') &&
                !line.startsWith('id:') &&
                !line.startsWith(':')
              ) {
                onChunkReceived(jsonData);
              }
            }
          } else if (
            line &&
            !line.startsWith('event:') &&
            !line.startsWith('id:') &&
            !line.startsWith(':')
          ) {
            console.warn('[API Service] Stream: Received non-SSE formatted line:', line);
            onChunkReceived(line);
          }
        }
      }
      if (onStreamEnd) onStreamEnd();

      let normalizedFinalResponse: ChatResponseDataFE | undefined = finalResponseData;
      if (directAgentOS && finalResponseData && isAgentOSAdapterResult(finalResponseData)) {
        normalizedFinalResponse = adaptAgentOSResponse(finalResponseData, agentosPayload?.mode);
      }

      emitSessionCostUpdate(normalizedFinalResponse?.sessionCost ?? undefined);
      return normalizedFinalResponse;
    } catch (error: any) {
      console.error('[API Service] sendMessageStream encountered an error:', error);
      if (onStreamError) onStreamError(error);
      else throw error;
      return undefined;
    }
  },
};

export interface CreditBucketLlmFE {
  totalUsd: number | null;
  usedUsd: number;
  remainingUsd: number | null;
  isUnlimited: boolean;
  approxGpt4oTokensTotal: number | null;
  approxGpt4oTokensRemaining: number | null;
  approxGpt4oMiniTokensTotal: number | null;
  approxGpt4oMiniTokensRemaining: number | null;
}

export interface CreditBucketSpeechFE {
  totalUsd: number | null;
  usedUsd: number;
  remainingUsd: number | null;
  isUnlimited: boolean;
  approxWhisperMinutesTotal: number | null;
  approxWhisperMinutesRemaining: number | null;
  approxTtsCharactersTotal: number | null;
  approxTtsCharactersRemaining: number | null;
}

export interface CreditSnapshotFE {
  allocationKey: string;
  llm: CreditBucketLlmFE;
  speech: CreditBucketSpeechFE;
}

export interface TranscriptionResponseFE {
  transcription: string;
  durationSeconds?: number;
  cost: number;
  sessionCost: SessionCostDetailsFE;
  message?: string;
  analysis?: any;
  metadata?: any;
  credits?: CreditSnapshotFE;
}

export interface SttStatsResponseFE {
  sttProvider: string;
  defaultTtsProvider: string;
  availableTtsProviders: string[];
  whisperCostPerMinute: string;
  openAITTSCostInfo: string;
  openaiTtsDefaultModel: string;
  openaiTtsDefaultVoice: string;
  openaiTtsDefaultSpeed: number;
  currentSessionCost: number;
  sessionCostThreshold: number;
  costsByService: SessionCostDetailsFE['costsByService'];
  credits: CreditSnapshotFE;
}

export const speechAPI = {
  transcribe: async (audioData: FormData): Promise<AxiosResponse<TranscriptionResponseFE>> => {
    const response = await api.post('/stt', audioData, {
      headers: { 'Content-Type': 'multipart/form-data', ...getAuthHeaders() },
      timeout: 90000,
    });
    emitSessionCostUpdate(response.data?.sessionCost);
    return response;
  },
  getStats: (): Promise<AxiosResponse<SttStatsResponseFE>> => api.get('/stt/stats'),
};

export type TTSRequestPayloadFE = {
  text: string;
  voice?: string;
  model?: string;
  outputFormat?: 'mp3' | 'opus' | 'aac' | 'flac' | string;
  speed?: number;
  languageCode?: string;
  providerId?: string;
};

export interface TTSVoiceFE {
  id: string;
  name: string;
  lang?: string;
  gender?: string;
  provider?: string;
  isDefault?: boolean;
  description?: string;
}

export interface TTSAvailableVoicesResponseFE {
  voices: TTSVoiceFE[];
  count: number;
  message: string;
}

export const ttsAPI = {
  synthesize: (data: TTSRequestPayloadFE, signal?: AbortSignal): Promise<AxiosResponse<Blob>> =>
    api.post('/tts', data, { responseType: 'blob', headers: { ...getAuthHeaders() }, signal }),
  getAvailableVoices: (): Promise<AxiosResponse<TTSAvailableVoicesResponseFE>> =>
    api.get('/tts/voices', { headers: getAuthHeaders() }),
};

export interface ResetCostPayloadFE {
  action?: 'reset' | 'reset_global';
  userId?: string;
}

export interface ResetCostResponseFE {
  message: string;
  sessionCost: number;
  sessionStartTime: string;
  costsByService: Record<string, { totalCost: number; count: number }>;
  globalMonthlyCost?: number;
}

export const costAPI = {
  getSessionCost: (): Promise<AxiosResponse<SessionCostDetailsFE>> => api.get('/cost'),
  resetSessionCost: (
    data: ResetCostPayloadFE = { action: 'reset' }
  ): Promise<AxiosResponse<ResetCostResponseFE>> => api.post('/cost', data),
};

export interface DiagramRequestPayloadFE {
  description: string;
  type?: string;
  userId?: string;
}

export interface DiagramResponseFE {
  diagramCode: string;
  type: string;
  model: string;
  usage?: ILlmUsageFE;
  sessionCost: SessionCostDetailsFE;
  cost: number;
}

export const diagramAPI = {
  generate: async (data: DiagramRequestPayloadFE): Promise<AxiosResponse<DiagramResponseFE>> => {
    const response = await api.post('/diagram', data);
    emitSessionCostUpdate(response.data?.sessionCost);
    return response;
  },
};

export interface PromptResponseFE {
  content: string;
  message: string;
  filename: string;
}

export const promptAPI = {
  getPrompt: (filename: string): Promise<AxiosResponse<PromptResponseFE>> =>
    api.get(`/prompts/${filename}`),
};

export interface OrganizationMemberFE {
  id: string;
  userId: string;
  email: string | null;
  role: 'admin' | 'builder' | 'viewer';
  status: 'active' | 'invited' | 'suspended';
  seatUnits: number;
  dailyUsageCapUsd: number | null;
  createdAt: number;
  updatedAt: number;
  isSelf: boolean;
}

export interface OrganizationInviteFE {
  id: string;
  email: string;
  role: 'admin' | 'builder' | 'viewer';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt: number;
  expiresAt: number | null;
  inviterUserId: string | null;
  acceptedAt: number | null;
  revokedAt: number | null;
  token?: string;
}

export interface OrganizationSummaryFE {
  id: string;
  name: string;
  slug: string | null;
  planId: string;
  ownerUserId: string;
  seatLimit: number;
  createdAt: number;
  updatedAt: number;
  stats: {
    activeSeats: number;
    pendingInvites: number;
    availableSeats: number;
  };
  membership: OrganizationMemberFE | null;
  permissions: {
    canInvite: boolean;
    canManageSeats: boolean;
    canModifyMembers: boolean;
    canLeave: boolean;
  };
  members: OrganizationMemberFE[];
  invites: OrganizationInviteFE[];
}

export const organizationAPI = {
  list: (): Promise<AxiosResponse<{ organizations: OrganizationSummaryFE[] }>> =>
    api.get('/organizations'),
  create: (data: {
    name: string;
    seatLimit?: number;
    planId?: string;
    slug?: string | null;
  }): Promise<AxiosResponse<{ organization: OrganizationSummaryFE }>> =>
    api.post('/organizations', data),
  update: (
    organizationId: string,
    data: { name?: string; seatLimit?: number }
  ): Promise<AxiosResponse<{ organization: OrganizationSummaryFE }>> =>
    api.patch(`/organizations/${organizationId}`, data),
  createInvite: (
    organizationId: string,
    data: { email: string; role?: 'admin' | 'builder' | 'viewer'; expiresAt?: number | null }
  ): Promise<
    AxiosResponse<{ organization: OrganizationSummaryFE; invite: OrganizationInviteFE }>
  > => api.post(`/organizations/${organizationId}/invites`, data),
  revokeInvite: (
    organizationId: string,
    inviteId: string
  ): Promise<AxiosResponse<{ organization: OrganizationSummaryFE }>> =>
    api.delete(`/organizations/${organizationId}/invites/${inviteId}`),
  updateMember: (
    organizationId: string,
    memberId: string,
    data: {
      role?: 'admin' | 'builder' | 'viewer';
      dailyUsageCapUsd?: number | null;
      seatUnits?: number;
    }
  ): Promise<AxiosResponse<{ organization: OrganizationSummaryFE }>> =>
    api.patch(`/organizations/${organizationId}/members/${memberId}`, data),
  removeMember: (
    organizationId: string,
    memberId: string
  ): Promise<AxiosResponse<{ organization: OrganizationSummaryFE | null }>> =>
    api.delete(`/organizations/${organizationId}/members/${memberId}`),
  acceptInvite: (
    token: string
  ): Promise<
    AxiosResponse<{ organization: OrganizationSummaryFE; invite: OrganizationInviteFE }>
  > => api.post(`/organizations/invites/${token}/accept`, {}),
};

export interface MarketplaceAgentSummaryFE {
  id: string;
  personaId: string;
  label: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  accessLevel: string | null;
  pricing: {
    model: string | null;
    priceCents: number | null;
    currency: string | null;
  };
  featured: boolean;
  heroImage: string | null;
  metrics: {
    downloads?: number;
    rating?: number;
    revenueMonthlyUsd?: number;
    customers?: number;
  };
  metadata: Record<string, unknown> | null;
  visibility: 'public' | 'unlisted' | 'org' | 'invite';
  status: 'draft' | 'pending' | 'published' | 'retired';
  ownerUserId?: string | null;
  organizationId?: string | null;
  inviteToken?: string | null;
  artifactPath?: string | null;
  approval: {
    approvedAt: number | null;
    reviewNotes?: string | null;
  };
  createdAt: number;
  updatedAt: number;
}

export const marketplaceAPI = {
  list: (): Promise<AxiosResponse<{ agents: MarketplaceAgentSummaryFE[] }>> =>
    api.get('/marketplace/agents'),
  get: (id: string): Promise<AxiosResponse<{ agent: MarketplaceAgentSummaryFE }>> =>
    api.get(`/marketplace/agents/${id}`),
};

export interface ProviderStatusSummaryFE {
  available: boolean;
  reason?: string;
  hint?: string;
  envVar?: string;
}

export interface LlmStatusResponseFE {
  status: 'ready' | 'unavailable';
  ready: boolean;
  code?: string;
  message?: string;
  timestamp: string;
  providers: Record<string, ProviderStatusSummaryFE>;
}

export const workflowAPI = {
  listDefinitions: (): Promise<AxiosResponse<{ definitions: WorkflowDefinitionFE[] }>> =>
    api.get('/agentos/workflows/definitions'),
  start: (data: StartWorkflowPayloadFE): Promise<AxiosResponse<{ workflow: WorkflowInstanceFE }>> =>
    api.post('/agentos/workflows/start', data),
};

export const systemAPI = {
  getLlmStatus: (): Promise<AxiosResponse<LlmStatusResponseFE>> => api.get('/system/llm-status'),
  getStorageStatus: (): Promise<
    AxiosResponse<{
      status: 'ok' | 'degraded';
      kind: string;
      capabilities: string[];
      persistence: boolean;
      message?: string;
    }>
  > => api.get('/system/storage-status'),
};

// ============================================================================
// RAG (Retrieval Augmented Generation) API
// ============================================================================

/**
 * Request payload for document ingestion into RAG memory.
 */
export interface RagIngestPayloadFE {
  /** Unique identifier for the document (auto-generated if not provided) */
  documentId?: string;
  /** Text content to ingest */
  content: string;
  /** Collection/namespace to store the document in */
  collectionId?: string;
  /** Document metadata for filtering and attribution */
  metadata?: {
    agentId?: string;
    userId?: string;
    type?: string;
    tags?: string[];
    source?: string;
    [key: string]: unknown;
  };
  /** Category of memory */
  category?: 'conversation_memory' | 'knowledge_base' | 'user_notes' | 'system' | 'custom';
  /** Chunking configuration */
  chunkingOptions?: {
    chunkSize?: number;
    chunkOverlap?: number;
    strategy?: 'fixed' | 'semantic' | 'sentence';
  };
}

/**
 * Response from document ingestion.
 */
export interface RagIngestResponseFE {
  success: boolean;
  documentId: string;
  chunksCreated: number;
  collectionId: string;
  message?: string;
}

/**
 * Request payload for querying RAG memory.
 */
export interface RagQueryPayloadFE {
  /** The query text to find relevant context for */
  query: string;
  /** Collection(s) to search in */
  collectionIds?: string[];
  /** Maximum number of chunks to retrieve */
  topK?: number;
  /** Minimum similarity score threshold (0-1) */
  similarityThreshold?: number;
  /** Metadata filters */
  filters?: {
    agentId?: string;
    userId?: string;
    category?: string;
    tags?: string[];
    [key: string]: unknown;
  };
  /** Include document metadata in results */
  includeMetadata?: boolean;
}

/**
 * A single retrieved chunk from RAG query.
 */
export interface RagRetrievedChunkFE {
  /** Unique chunk identifier */
  chunkId: string;
  /** Parent document identifier */
  documentId: string;
  /** The text content of the chunk */
  content: string;
  /** Similarity score (0-1) */
  score: number;
  /** Chunk metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Response from RAG query.
 */
export interface RagQueryResponseFE {
  success: boolean;
  query: string;
  chunks: RagRetrievedChunkFE[];
  totalResults: number;
  processingTimeMs: number;
}

/**
 * Document summary for listing.
 */
export interface RagDocumentSummaryFE {
  documentId: string;
  collectionId: string;
  chunkCount: number;
  category?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * RAG memory statistics.
 */
export interface RagStatsResponseFE {
  success: boolean;
  totalDocuments: number;
  totalChunks: number;
  collections: Array<{
    collectionId: string;
    documentCount: number;
    chunkCount: number;
  }>;
  storageUsedBytes?: number;
  lastIngestionAt?: string;
  message?: string;
}

/**
 * RAG health check response.
 */
export interface RagHealthResponseFE {
  status: 'ready' | 'disabled' | 'error';
  ragServiceInitialized: boolean;
  vectorStoreConnected: boolean;
  embeddingServiceAvailable: boolean;
  message?: string;
}

/**
 * RAG API client for frontend-backend communication.
 * Provides methods for document ingestion, retrieval queries, and memory management.
 *
 * @example
 * // Ingest a document
 * const result = await ragAPI.ingest({
 *   content: 'Some important information...',
 *   metadata: { agentId: 'my-agent', tags: ['important'] }
 * });
 *
 * @example
 * // Query for relevant context
 * const context = await ragAPI.query({
 *   query: 'What is the important information?',
 *   topK: 5
 * });
 */
export const ragAPI = {
  /**
   * Ingest a document into RAG memory.
   * @param payload - Document content and metadata
   * @returns Ingestion result with document ID and chunk count
   */
  ingest: (payload: RagIngestPayloadFE): Promise<AxiosResponse<RagIngestResponseFE>> =>
    api.post('/agentos/rag/ingest', payload),

  /**
   * Query RAG memory for relevant context.
   * @param payload - Query text and search parameters
   * @returns Retrieved chunks with similarity scores
   */
  query: (payload: RagQueryPayloadFE): Promise<AxiosResponse<RagQueryResponseFE>> =>
    api.post('/agentos/rag/query', payload),

  /**
   * List documents in RAG memory.
   * @param params - Optional filters (collectionId, agentId, userId, limit, offset)
   * @returns Paginated list of document summaries
   */
  listDocuments: (params?: {
    collectionId?: string;
    agentId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<
    AxiosResponse<{ success: boolean; documents: RagDocumentSummaryFE[]; total: number }>
  > => api.get('/agentos/rag/documents', { params }),

  /**
   * Delete a document from RAG memory.
   * @param documentId - ID of the document to delete
   * @returns Deletion confirmation
   */
  deleteDocument: (
    documentId: string
  ): Promise<AxiosResponse<{ success: boolean; documentId: string }>> =>
    api.delete(`/agentos/rag/documents/${documentId}`),

  /**
   * Get RAG memory statistics.
   * @param agentId - Optional agent ID to filter stats
   * @returns Memory usage statistics
   */
  getStats: (agentId?: string): Promise<AxiosResponse<RagStatsResponseFE>> =>
    api.get('/agentos/rag/stats', { params: agentId ? { agentId } : undefined }),

  /**
   * Create a new collection/namespace in RAG memory.
   * @param collectionId - Unique collection identifier
   * @param displayName - Human-readable name
   * @param metadata - Optional collection metadata
   * @returns Created collection info
   */
  createCollection: (
    collectionId: string,
    displayName?: string,
    metadata?: Record<string, unknown>
  ): Promise<AxiosResponse<{ success: boolean; collectionId: string; displayName: string }>> =>
    api.post('/agentos/rag/collections', { collectionId, displayName, metadata }),

  /**
   * List all collections in RAG memory.
   * @returns List of collections
   */
  listCollections: (): Promise<
    AxiosResponse<{
      success: boolean;
      collections: Array<{ collectionId: string; displayName?: string; documentCount?: number }>;
    }>
  > => api.get('/agentos/rag/collections'),

  /**
   * Delete a collection and all its documents.
   * @param collectionId - ID of the collection to delete
   * @returns Deletion confirmation
   */
  deleteCollection: (
    collectionId: string
  ): Promise<AxiosResponse<{ success: boolean; collectionId: string }>> =>
    api.delete(`/agentos/rag/collections/${collectionId}`),

  /**
   * Check RAG service health.
   * @returns Health status of RAG components
   */
  getHealth: (): Promise<AxiosResponse<RagHealthResponseFE>> => api.get('/agentos/rag/health'),
};

// ============================================================================
// Human-in-the-Loop (HITL) API
// ============================================================================

/**
 * Severity levels for HITL requests.
 */
export type HitlSeverityFE = 'low' | 'medium' | 'high' | 'critical';

/**
 * Status of a HITL request.
 */
export type HitlStatusFE =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'clarified'
  | 'escalated'
  | 'completed'
  | 'timed_out';

/**
 * Types of HITL interactions.
 */
export type HitlTypeFE =
  | 'approval'
  | 'clarification'
  | 'output_review'
  | 'escalation'
  | 'feedback'
  | 'workflow_checkpoint';

/**
 * Base interface for all HITL interactions.
 */
export interface HitlInteractionFE {
  /** Unique interaction ID */
  interactionId: string;
  /** ID of the initiating agent/GMI */
  initiatorId: string;
  /** Type of interaction */
  type: HitlTypeFE;
  /** Current status */
  status: HitlStatusFE;
  /** Severity level */
  severity?: HitlSeverityFE;
  /** Short title/summary */
  title?: string;
  /** Detailed instructions */
  instructions?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Assigned user ID */
  assigneeId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Due date */
  dueDate?: string;
}

/**
 * Approval request with proposed content.
 */
export interface HitlApprovalRequestFE extends HitlInteractionFE {
  type: 'approval';
  /** Content requiring approval */
  proposedContent: string | Record<string, unknown>;
  /** Alternative options */
  alternatives?: Array<string | Record<string, unknown>>;
  /** Justification */
  justification?: string;
  /** Expected impact */
  expectedImpact?: string;
}

/**
 * Clarification request with optional choices.
 */
export interface HitlClarificationRequestFE extends HitlInteractionFE {
  type: 'clarification';
  /** Question to answer */
  question: string;
  /** Context for the question */
  context?: string | Record<string, unknown>;
  /** Multiple choice options */
  options?: string[];
}

/**
 * Escalation request with problem details.
 */
export interface HitlEscalationRequestFE extends HitlInteractionFE {
  type: 'escalation';
  /** Reason for escalation */
  reason: string;
  /** Problem description */
  problemDescription: string;
  /** Suggested actions */
  suggestedActions?: string[];
  /** Relevant data */
  relevantData?: Record<string, unknown>;
}

/**
 * Response payload for approval.
 */
export interface HitlApprovalResponseFE {
  interactionId: string;
  approved: boolean;
  comments?: string;
  chosenAlternative?: string | Record<string, unknown>;
}

/**
 * Response payload for clarification.
 */
export interface HitlClarificationResponseFE {
  interactionId: string;
  answer: string;
  selectedOption?: string;
}

/**
 * Response payload for escalation.
 */
export interface HitlEscalationResponseFE {
  interactionId: string;
  resolution: string;
  resolvedSuccessfully?: boolean;
}

/**
 * Feedback submission payload.
 */
export interface HitlFeedbackPayloadFE {
  agentId: string;
  feedbackType: 'correction' | 'positive' | 'negative' | 'suggestion';
  aspect?: string;
  content: string;
  importance?: number;
  context?: Record<string, unknown>;
}

/**
 * HITL statistics response.
 */
export interface HitlStatsResponseFE {
  totalInteractions: number;
  pendingInteractions: number;
  approvedInteractions: number;
  rejectedInteractions: number;
  clarifiedInteractions: number;
  escalatedInteractions: number;
  completedInteractions: number;
  timedOutInteractions: number;
  averageResolutionTimeMs: number;
  interactionsByType: Record<HitlTypeFE, number>;
  interactionsByStatus: Record<HitlStatusFE, number>;
}

/**
 * HITL API client for Human-in-the-Loop operations.
 *
 * @example
 * // List pending approvals
 * const pending = await hitlAPI.listPendingInteractions({ type: 'approval' });
 *
 * @example
 * // Approve a request
 * await hitlAPI.approve({ interactionId: 'abc123', approved: true, comments: 'Looks good!' });
 */
export const hitlAPI = {
  /**
   * List all pending HITL interactions.
   * @param params - Optional filters (type, assigneeId, limit)
   * @returns List of pending interactions
   */
  listPendingInteractions: (params?: {
    type?: HitlTypeFE;
    assigneeId?: string;
    limit?: number;
  }): Promise<AxiosResponse<{ success: boolean; interactions: HitlInteractionFE[] }>> =>
    api.get('/agentos/hitl/approvals', { params }),

  /**
   * Get a specific interaction by ID.
   * @param interactionId - The interaction ID
   * @returns The interaction details
   */
  getInteraction: (
    interactionId: string
  ): Promise<AxiosResponse<{ success: boolean; interaction: HitlInteractionFE }>> =>
    api.get(`/agentos/hitl/approvals/${interactionId}`),

  /**
   * Approve or reject an approval request.
   * @param response - Approval response with decision
   * @returns Updated interaction
   */
  approve: (
    response: HitlApprovalResponseFE
  ): Promise<AxiosResponse<{ success: boolean; interaction: HitlApprovalRequestFE }>> =>
    response.approved
      ? api.post(`/agentos/hitl/approvals/${response.interactionId}/approve`, response)
      : api.post(`/agentos/hitl/approvals/${response.interactionId}/reject`, response),

  /**
   * Respond to a clarification request.
   * @param response - Clarification response with answer
   * @returns Updated interaction
   */
  clarify: (
    response: HitlClarificationResponseFE
  ): Promise<AxiosResponse<{ success: boolean; interaction: HitlClarificationRequestFE }>> =>
    api.post(`/agentos/hitl/clarifications/${response.interactionId}/respond`, response),

  /**
   * Resolve an escalation.
   * @param response - Resolution details
   * @returns Updated interaction
   */
  resolveEscalation: (
    response: HitlEscalationResponseFE
  ): Promise<AxiosResponse<{ success: boolean; interaction: HitlEscalationRequestFE }>> =>
    api.post(`/agentos/hitl/escalations/${response.interactionId}/resolve`, response),

  /**
   * Submit feedback for an agent.
   * @param payload - Feedback details
   * @returns Submitted feedback confirmation
   */
  submitFeedback: (
    payload: HitlFeedbackPayloadFE
  ): Promise<AxiosResponse<{ success: boolean; feedbackId: string }>> =>
    api.post('/agentos/hitl/feedback', payload),

  /**
   * Get HITL statistics.
   * @returns Statistics about HITL interactions
   */
  getStats: (): Promise<AxiosResponse<HitlStatsResponseFE>> => api.get('/agentos/hitl/stats'),
};

// ============================================================================
// Planning Engine API
// ============================================================================

/**
 * Plan status.
 */
export type PlanStatusFE = 'draft' | 'executing' | 'paused' | 'completed' | 'failed';

/**
 * Plan step action type.
 */
export type PlanStepActionTypeFE =
  | 'tool_call'
  | 'gmi_action'
  | 'human_input'
  | 'sub_plan'
  | 'reflection'
  | 'communication';

/**
 * A single step in an execution plan.
 */
export interface PlanStepFE {
  stepId: string;
  description: string;
  actionType: PlanStepActionTypeFE;
  toolId?: string;
  toolArgs?: Record<string, unknown>;
  targetGmiIdOrRole?: string;
  instructions?: string;
  dependsOn?: string[];
  estimatedCost?: { tokens?: number; usd?: number };
  status?: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  result?: unknown;
  error?: string;
}

/**
 * An execution plan.
 */
export interface ExecutionPlanFE {
  planId: string;
  goal: string;
  steps: PlanStepFE[];
  status: PlanStatusFE;
  confidenceScore?: number;
  estimatedTokens?: number;
  estimatedCostUSD?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  currentStepIndex?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Request to generate a plan.
 */
export interface GeneratePlanRequestFE {
  goal: string;
  context?: Record<string, unknown>;
  constraints?: string[];
  maxSteps?: number;
}

/**
 * Planning statistics.
 */
export interface PlanningStatsFE {
  totalPlans: number;
  byStatus: Record<PlanStatusFE, number>;
  avgConfidence: number;
  avgSteps: number;
}

/**
 * Planning Engine API client.
 *
 * @example
 * // Generate a plan
 * const plan = await planningAPI.generatePlan({ goal: 'Research and summarize AI trends' });
 *
 * @example
 * // Execute a plan
 * await planningAPI.execute(plan.data.plan.planId);
 */
export const planningAPI = {
  /**
   * List all plans.
   * @param params - Optional filters (status, limit)
   * @returns List of plans
   */
  listPlans: (params?: {
    status?: PlanStatusFE;
    limit?: number;
  }): Promise<AxiosResponse<{ success: boolean; plans: ExecutionPlanFE[] }>> =>
    api.get('/agentos/planning/plans', { params }),

  /**
   * Get a specific plan by ID.
   * @param planId - The plan ID
   * @returns The plan details
   */
  getPlan: (planId: string): Promise<AxiosResponse<{ success: boolean; plan: ExecutionPlanFE }>> =>
    api.get(`/agentos/planning/plans/${planId}`),

  /**
   * Generate a new execution plan.
   * @param request - Plan generation parameters
   * @returns Generated plan
   */
  generatePlan: (
    request: GeneratePlanRequestFE
  ): Promise<AxiosResponse<{ success: boolean; plan: ExecutionPlanFE }>> =>
    api.post('/agentos/planning/plans', request),

  /**
   * Start executing a plan.
   * @param planId - The plan ID
   * @returns Updated plan with execution status
   */
  execute: (planId: string): Promise<AxiosResponse<{ success: boolean; plan: ExecutionPlanFE }>> =>
    api.post(`/agentos/planning/plans/${planId}/execute`),

  /**
   * Pause plan execution.
   * @param planId - The plan ID
   * @returns Updated plan
   */
  pause: (planId: string): Promise<AxiosResponse<{ success: boolean; plan: ExecutionPlanFE }>> =>
    api.post(`/agentos/planning/plans/${planId}/pause`),

  /**
   * Refine a plan with feedback.
   * @param planId - The plan ID
   * @param feedback - Refinement feedback
   * @returns Refined plan
   */
  refine: (
    planId: string,
    feedback: {
      stepId?: string;
      feedback: string;
    }
  ): Promise<AxiosResponse<{ success: boolean; plan: ExecutionPlanFE }>> =>
    api.post(`/agentos/planning/plans/${planId}/refine`, feedback),

  /**
   * Delete a plan.
   * @param planId - The plan ID
   * @returns Deletion confirmation
   */
  deletePlan: (planId: string): Promise<AxiosResponse<{ success: boolean; planId: string }>> =>
    api.delete(`/agentos/planning/plans/${planId}`),

  /**
   * Get planning statistics.
   * @returns Statistics about plans
   */
  getStats: (): Promise<AxiosResponse<{ success: boolean; stats: PlanningStatsFE }>> =>
    api.get('/agentos/planning/stats'),
};

// ============================================================================
// Admin Metrics API
// ============================================================================

/**
 * System metrics summary.
 */
export interface SystemMetricsFE {
  activeUsers: number;
  totalConversations: number;
  totalMessages: number;
  avgResponseTimeMs: number;
  agentsDeployed: number;
  evaluationRunsTotal: number;
  evaluationPassRate: number;
  marketplaceInstalls: number;
  errorRate: number;
  uptime: number;
}

/**
 * Evaluation run summary.
 */
export interface EvaluationRunSummaryFE {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageScore: number;
  duration?: number;
}

/**
 * Usage metrics for a time period.
 */
export interface UsageMetricsFE {
  period: string;
  conversations: number;
  messages: number;
  tokensUsed: number;
  costUSD: number;
}

/**
 * Admin API client for system metrics and evaluation management.
 *
 * @example
 * // Get system metrics
 * const metrics = await adminAPI.getSystemMetrics();
 *
 * @example
 * // Run an evaluation
 * const run = await adminAPI.runEvaluation('agent-id', ['test-1', 'test-2']);
 */
export const adminAPI = {
  /**
   * Get system-wide metrics.
   * @returns System metrics summary
   */
  getSystemMetrics: (): Promise<AxiosResponse<SystemMetricsFE>> => api.get('/admin/metrics/system'),

  /**
   * Get evaluation run history.
   * @param params - Optional filters (limit, status)
   * @returns List of evaluation runs
   */
  getEvaluationRuns: (params?: {
    limit?: number;
    status?: string;
  }): Promise<AxiosResponse<EvaluationRunSummaryFE[]>> =>
    api.get('/admin/metrics/evaluations', { params }),

  /**
   * Get usage history over time.
   * @param period - Time period granularity
   * @returns Usage metrics by period
   */
  getUsageHistory: (period?: 'day' | 'week' | 'month'): Promise<AxiosResponse<UsageMetricsFE[]>> =>
    api.get('/admin/metrics/usage', { params: { period } }),

  /**
   * Start a new evaluation run.
   * @param agentId - Agent to evaluate
   * @param testCaseIds - Test cases to run
   * @returns Started evaluation run
   */
  runEvaluation: (
    agentId: string,
    testCaseIds: string[]
  ): Promise<AxiosResponse<EvaluationRunSummaryFE>> =>
    api.post('/admin/evaluation/run', { agentId, testCaseIds }),

  /**
   * Get detailed results for an evaluation run.
   * @param runId - Evaluation run ID
   * @returns Detailed test results
   */
  getEvaluationResults: (
    runId: string
  ): Promise<
    AxiosResponse<{
      runId: string;
      results: Array<{
        testCaseId: string;
        testCaseName: string;
        passed: boolean;
        score: number;
        actualOutput?: string;
        error?: string;
        duration: number;
        metrics: Array<{
          name: string;
          score: number;
          threshold: number;
          passed: boolean;
        }>;
      }>;
    }>
  > => api.get(`/admin/evaluation/runs/${runId}/results`),
};

export default api;
