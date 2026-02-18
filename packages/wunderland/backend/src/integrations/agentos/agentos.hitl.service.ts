import crypto from 'node:crypto';
import { HumanInteractionManager } from '@framers/agentos/core/hitl';
import type {
  HITLNotification,
  HITLNotificationHandler,
  IHumanInteractionManager,
  PendingAction,
  ClarificationRequest,
  DraftOutput,
  EscalationContext,
  WorkflowCheckpoint,
} from '@framers/agentos/core/hitl';

const parseBooleanEnv = (value: string | undefined): boolean | undefined => {
  if (!value) return undefined;
  const raw = value.trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true;
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false;
  return undefined;
};

const parsePositiveIntEnv = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const toUrlList = (value: string | undefined): string[] =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const sign = (secret: string, timestampMs: string, body: string): string => {
  return crypto.createHmac('sha256', secret).update(`${timestampMs}.${body}`).digest('hex');
};

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Webhook POST failed (${resp.status}) ${text}`.trim());
    }
  } finally {
    clearTimeout(timer);
  }
}

let hitlManagerSingleton: HumanInteractionManager | null = null;

export type HitlPendingSnapshot = {
  approvals: PendingAction[];
  clarifications: ClarificationRequest[];
  edits: DraftOutput[];
  escalations: EscalationContext[];
  checkpoints: WorkflowCheckpoint[];
};

const buildWebhookNotificationHandler = (
  getPendingSnapshot: () => Promise<HitlPendingSnapshot>
): HITLNotificationHandler => {
  const urls = toUrlList(process.env.AGENTOS_HITL_WEBHOOK_URL);
  const secret = process.env.AGENTOS_HITL_WEBHOOK_SECRET?.trim();
  const timeoutMs = parsePositiveIntEnv(process.env.AGENTOS_HITL_WEBHOOK_TIMEOUT_MS) ?? 5_000;

  if (urls.length === 0) {
    return async () => undefined;
  }

  return async (notification: HITLNotification) => {
    const timestampMs = String(Date.now());

    // Enrich with the full pending request payload when available so the webhook can render a UI
    // without needing a follow-up fetch.
    const pending = await getPendingSnapshot();
    const request =
      notification.type === 'approval_required'
        ? pending.approvals.find((a) => a.actionId === notification.requestId)
        : notification.type === 'clarification_needed'
          ? pending.clarifications.find((c) => c.requestId === notification.requestId)
          : notification.type === 'edit_requested'
            ? pending.edits.find((e) => e.draftId === notification.requestId)
            : notification.type === 'escalation'
              ? pending.escalations.find((e) => e.escalationId === notification.requestId)
              : pending.checkpoints.find((c) => c.checkpointId === notification.requestId);

    const payload = {
      notification,
      request: request ?? null,
    };

    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'x-agentos-hitl-timestamp-ms': timestampMs,
    };
    if (secret) {
      headers['x-agentos-hitl-signature'] = sign(secret, timestampMs, body);
    }

    await Promise.allSettled(urls.map((url) => postJson(url, payload, headers, timeoutMs)));
  };
};

export const getHitlManager = (): IHumanInteractionManager => {
  if (hitlManagerSingleton) return hitlManagerSingleton;

  const defaultTimeoutMs = parsePositiveIntEnv(process.env.AGENTOS_HITL_TIMEOUT_MS) ?? 30_000;
  const autoRejectOnTimeout =
    parseBooleanEnv(process.env.AGENTOS_HITL_AUTO_REJECT_ON_TIMEOUT) ?? true;
  const maxPendingPerType =
    parsePositiveIntEnv(process.env.AGENTOS_HITL_MAX_PENDING_PER_TYPE) ?? 200;

  const manager = new HumanInteractionManager({
    defaultTimeoutMs,
    autoRejectOnTimeout,
    maxPendingPerType,
  });

  manager.setNotificationHandler(
    buildWebhookNotificationHandler(async () => manager.getPendingRequests() as any)
  );

  hitlManagerSingleton = manager;
  return manager;
};

export const hitlAuthRequired = (): { enabled: boolean; secret?: string } => {
  const secret = process.env.AGENTOS_HITL_WEBHOOK_SECRET?.trim();
  return { enabled: Boolean(secret), secret };
};
