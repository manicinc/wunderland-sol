import type { GitPayWidgetRenderOptions, WidgetPlanConfig } from './types';

const DEFAULT_THEME = {
  accentHex: '#8b5cf6',
  ctaLabel: 'Get started',
};

function createFeatureList(features: string[]) {
  const ul = document.createElement('ul');
  ul.className = 'gpw-feature-list';
  features.forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    ul.appendChild(li);
  });
  return ul;
}

function createPlanCard(
  plan: WidgetPlanConfig,
  project: string,
  accentHex: string,
  ctaLabel: string
) {
  const card = document.createElement('article');
  card.className = 'gpw-plan-card';

  const title = document.createElement('h3');
  title.textContent = plan.label;
  card.appendChild(title);

  const price = document.createElement('p');
  price.className = 'gpw-plan-price';
  price.textContent = plan.price;
  card.appendChild(price);

  const desc = document.createElement('p');
  desc.className = 'gpw-plan-description';
  desc.textContent = plan.description;
  card.appendChild(desc);

  card.appendChild(createFeatureList(plan.features));

  const button = document.createElement('button');
  button.className = 'gpw-plan-button';
  button.style.background = accentHex;
  button.dataset.gpwProject = project;
  button.dataset.gpwPlan = plan.id;
  button.textContent = ctaLabel;
  card.appendChild(button);

  return card;
}

function getAssetBaseUrl(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const current = document.currentScript;
  if (!current) return undefined;
  if (!(current instanceof HTMLScriptElement)) return undefined;
  return current.src || undefined;
}

async function injectStyles() {
  if (document.getElementById('gpw-widget-styles')) return;
  const style = document.createElement('style');
  style.id = 'gpw-widget-styles';
  const href = new URL('./styles.css', getAssetBaseUrl() ?? window.location.href).toString();
  const css = await fetch(href, { cache: 'force-cache' }).then(res => res.text());
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * Render an embeddable widget with plan cards that trigger GitPayWidget checkout.
 */
export async function renderGitPayWidget(options: GitPayWidgetRenderOptions): Promise<HTMLElement> {
  const { project, plans, theme = {}, mount, autoTheme, themeEndpoint } = options;
  await injectStyles();

  let resolvedTheme = theme;
  if (autoTheme) {
    try {
      const endpoint = themeEndpoint || 'https://gitpaywidget.com/api/public/projects';
      const response = await fetch(`${endpoint}/${encodeURIComponent(project)}/settings`);
      if (response.ok) {
        const json = (await response.json()) as { accent_hex?: string; cta_label?: string };
        resolvedTheme = {
          accentHex: json.accent_hex ?? theme.accentHex,
          ctaLabel: json.cta_label ?? theme.ctaLabel,
        };
      }
    } catch {
      // ignore theme fetch errors; fallback to provided theme.
    }
  }

  const accentHex = resolvedTheme.accentHex ?? DEFAULT_THEME.accentHex;
  const ctaLabel = resolvedTheme.ctaLabel ?? DEFAULT_THEME.ctaLabel;

  const root = mount ?? document.createElement('div');
  root.className = 'gpw-widget-root';
  plans.forEach(plan => {
    root.appendChild(createPlanCard(plan, project, accentHex, ctaLabel));
  });

  const { initWidget } = await import('@gitpaywidget/sdk');
  initWidget({ project, plan: plans[0].id });
  return root;
}

declare global {
  interface Window {
    GitPayWidget?: typeof renderGitPayWidget;
  }
}

if (typeof window !== 'undefined') {
  window.GitPayWidget = renderGitPayWidget;
}

export * from './types';
