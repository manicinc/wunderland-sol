/**
 * GitPayWidget client SDK.
 *
 * @packageDocumentation
 */

export interface GitPayWidgetOptions {
  /** Unique project slug (e.g. "org/repo") configured in the GitPayWidget dashboard. */
  project: string;
  /** Plan identifier, such as "free", "pro", or a custom slug. */
  plan: string;
  /** Override checkout API endpoint (defaults to GitPayWidget cloud API). */
  endpoint?: string;
  /** Callback when checkout completes successfully. */
  onSuccess?: (sessionId: string) => void;
  /** Callback when checkout is cancelled or fails. */
  onCancel?: () => void;
}

/**
 * Initialise the widget (dynamic script loader).
 *
 * ```js
 * import { initWidget } from '@gitpaywidget/sdk'
 * initWidget({ project: 'my-org/site', plan: 'pro' })
 * ```
 */
export function initWidget(opts: GitPayWidgetOptions): void {
  const { project, plan } = opts;
  if (!project) {
    throw new Error('[gitpaywidget] project is required');
  }

  const buttons = document.querySelectorAll<HTMLButtonElement>(`[data-gpw-project="${project}"]`);
  if (buttons.length === 0) {
    console.warn('[gitpaywidget] no widget buttons found');
    return;
  }

  const endpoint = opts.endpoint || 'https://api.gitpaywidget.com/v0/checkout';

  buttons.forEach(button => {
    const planId = button.dataset.gpwPlan || plan;
    if (!planId) return;
    button.addEventListener('click', async () => {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project, plan: planId }),
        });
        if (!res.ok) throw new Error('Failed to create checkout session');
        const { checkoutUrl, sessionId } = (await res.json()) as {
          checkoutUrl: string;
          sessionId: string;
        };
        window.open(checkoutUrl, '_blank');
        opts.onSuccess?.(sessionId);
      } catch (err) {
        console.error('[gitpaywidget] checkout error', err);
        opts.onCancel?.();
      }
    });
  });
}
