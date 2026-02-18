export interface WidgetPlanConfig {
  /** Plan identifier used in checkout requests. */
  id: string;
  /** Display label (e.g., "Pro"). */
  label: string;
  /** Price line (e.g., "$9.99/mo"). */
  price: string;
  /** Short description text. */
  description: string;
  /** Feature bullets displayed inside the card. */
  features: string[];
}

export interface WidgetTheme {
  /** Accent color used for active states. */
  accentHex?: string;
  /** Optional CTA label override (defaults to "Get started"). */
  ctaLabel?: string;
}

export interface GitPayWidgetRenderOptions {
  /** GitPayWidget project slug (org/site). */
  project: string;
  /** Plan definitions to display. */
  plans: WidgetPlanConfig[];
  /** Optional DOM element to mount into (defaults to new div appended to body). */
  mount?: HTMLElement;
  /** Theme overrides (colors, cta text). */
  theme?: WidgetTheme;
  /**
   * Automatically fetch theme settings from the GitPayWidget API.
   * When true, widget will call `/api/public/projects/:slug/settings`.
   */
  autoTheme?: boolean;
  /** Override theme endpoint (defaults to https://gitpaywidget.com/api/public/projects). */
  themeEndpoint?: string;
}
