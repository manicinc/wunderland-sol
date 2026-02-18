/**
 * Core type definitions for Codex Extensions
 * @module @framers/codex-extensions/types
 */

// ============================================================================
// Plugin Types
// ============================================================================

export type PluginType = 'codex' | 'viewer';

export type CodexPluginCategory =
  | 'indexer'
  | 'validator'
  | 'transformer'
  | 'analyzer'
  | 'exporter';

export type ViewerPluginCategory =
  | 'ui-component'
  | 'visualization'
  | 'navigation'
  | 'search'
  | 'accessibility'
  | 'integration';

export type PluginCategory = CodexPluginCategory | ViewerPluginCategory;

export type PluginStatus =
  | 'active'
  | 'inactive'
  | 'error'
  | 'loading'
  | 'incompatible'
  | 'conflict';

export type PluginPriority = 'low' | 'normal' | 'high' | 'critical';

export interface PluginAuthor {
  name: string;
  email?: string;
  url?: string;
}

export interface PluginVersion {
  current: string;
  minimum?: string;
  maximum?: string;
}

export interface PluginDependency {
  id: string;
  version: string;
  optional?: boolean;
}

export interface PluginConflict {
  id: string;
  reason: string;
  resolution?: 'disable' | 'upgrade' | 'manual';
}

export interface PluginPermission {
  name: string;
  description: string;
  required: boolean;
  granted?: boolean;
}

export interface PluginHook {
  name: string;
  priority?: PluginPriority;
  handler: (...args: unknown[]) => unknown | Promise<unknown>;
}

export interface PluginSlot {
  name: string;
  component: React.ComponentType<unknown>;
  priority?: number;
}

/**
 * Base plugin manifest - shared by all plugin types
 */
export interface PluginManifest {
  // Identity
  id: string;
  name: string;
  version: string;
  description: string;
  author: PluginAuthor;

  // Classification
  type: PluginType;
  category: PluginCategory;
  tags?: string[];

  // Compatibility
  compatibility: {
    codexViewer?: PluginVersion;
    codex?: PluginVersion;
    node?: PluginVersion;
    browser?: string[]; // e.g., ['chrome >= 90', 'firefox >= 88']
  };

  // Dependencies & Conflicts
  dependencies?: PluginDependency[];
  conflicts?: PluginConflict[];
  peerDependencies?: Record<string, string>;

  // Permissions
  permissions?: PluginPermission[];

  // Loading
  lazy?: boolean;
  loadCondition?: string; // JS expression evaluated at load time
  priority?: PluginPriority;

  // Entry points
  main?: string;
  browser?: string;
  style?: string;

  // Repository
  repository?: string;
  homepage?: string;
  bugs?: string;
  license?: string;

  // Verification
  verified?: boolean;
  verifiedAt?: string;
  verifiedBy?: PluginAuthor;
  checksum?: string;

  // Stats
  downloads?: number;
  rating?: number;
}

/**
 * Codex plugin - extends the data processing pipeline
 */
export interface CodexPlugin {
  manifest: PluginManifest & { type: 'codex' };

  // Lifecycle
  onLoad?: () => void | Promise<void>;
  onUnload?: () => void | Promise<void>;
  onActivate?: () => void | Promise<void>;
  onDeactivate?: () => void | Promise<void>;

  // Codex-specific capabilities
  indexer?: CodexIndexer;
  validator?: CodexValidator;
  transformer?: CodexTransformer;
  analyzer?: CodexAnalyzer;
  exporter?: CodexExporter;
}

/**
 * Viewer plugin - extends the UI/UX
 */
export interface ViewerPlugin {
  manifest: PluginManifest & { type: 'viewer' };

  // Lifecycle
  onLoad?: () => void | Promise<void>;
  onUnload?: () => void | Promise<void>;
  onActivate?: () => void | Promise<void>;
  onDeactivate?: () => void | Promise<void>;

  // React component slots
  slots?: PluginSlot[];

  // Hook registrations
  hooks?: PluginHook[];

  // CSS injection
  styles?: string | string[];

  // Viewer-specific capabilities
  component?: React.ComponentType<unknown>;
  toolbar?: ViewerToolbarExtension;
  sidebar?: ViewerSidebarExtension;
  contextMenu?: ViewerContextMenuExtension;
  commands?: ViewerCommand[];
  keybindings?: ViewerKeybinding[];
}

export type Plugin = CodexPlugin | ViewerPlugin;

// ============================================================================
// Codex Plugin Interfaces
// ============================================================================

export interface CodexIndexer {
  name: string;
  description?: string;
  fileTypes?: string[];
  index(content: string, metadata: StrandMetadata): Promise<IndexResult>;
}

export interface CodexValidator {
  name: string;
  description?: string;
  severity: 'error' | 'warning' | 'info';
  validate(content: string, metadata: StrandMetadata): Promise<ValidationResult>;
}

export interface CodexTransformer {
  name: string;
  description?: string;
  inputFormat?: string;
  outputFormat?: string;
  transform(content: string, options?: Record<string, unknown>): Promise<string>;
}

export interface CodexAnalyzer {
  name: string;
  description?: string;
  analyze(content: string, metadata: StrandMetadata): Promise<AnalysisResult>;
}

export interface CodexExporter {
  name: string;
  description?: string;
  format: string;
  mimeType: string;
  export(strands: StrandData[], options?: ExportOptions): Promise<ExportResult>;
}

// ============================================================================
// Zettelkasten Workflow Types
// ============================================================================

export type NoteMaturityStatus = 'fleeting' | 'literature' | 'permanent' | 'evergreen';

export interface NoteMaturity {
  status: NoteMaturityStatus;
  lastRefinedAt?: string;
  refinementCount?: number;
  futureValue?: 'low' | 'medium' | 'high' | 'core';
}

export interface NoteQualityChecks {
  hasContext?: boolean;
  hasConnections?: boolean;
  isAtomic?: boolean;
  isSelfContained?: boolean;
  isVerified?: boolean;
  hasSources?: boolean;
}

export type MOCScope = 'subject' | 'topic' | 'project' | 'custom';

export interface MOCConfig {
  topic: string;
  scope: MOCScope;
  autoUpdate?: boolean;
  sections?: string[];
  strandOrder?: string[];
}

export type StrandType = 'file' | 'folder' | 'supernote' | 'moc';

export type StrandRelationType =
  | 'extends'
  | 'contrasts'
  | 'supports'
  | 'example-of'
  | 'implements'
  | 'questions'
  | 'refines'
  | 'applies'
  | 'summarizes'
  | 'prerequisite'
  | 'related'
  | 'follows'
  | 'references'
  | 'contradicts'
  | 'updates'
  | 'custom';

export interface StrandRelationship {
  type: StrandRelationType;
  target: string;
  context?: string;
}

export interface StrandMetadata {
  path: string;
  title?: string;
  tags?: string[];
  frontmatter?: Record<string, unknown>;
  weave?: string;
  loom?: string;

  // Vocabulary classification fields
  /** Vocabulary-classified skills (e.g., react, python, docker) */
  skills?: string[];
  /** Vocabulary-classified subjects (e.g., technology, science) */
  subjects?: string[];
  /** Vocabulary-classified topics (e.g., architecture, troubleshooting) */
  topics?: string[];

  // Zettelkasten workflow fields
  strandType?: StrandType;
  maturity?: NoteMaturity;
  qualityChecks?: NoteQualityChecks;
  isMOC?: boolean;
  mocConfig?: MOCConfig;
  relationships?: StrandRelationship[];
}

export interface StrandData extends StrandMetadata {
  content: string;
  html?: string;
}

export interface IndexResult {
  success: boolean;
  tokens?: string[];
  embeddings?: Float32Array;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface ValidationWarning extends ValidationError {
  severity: 'warning';
}

export interface AnalysisResult {
  summary?: string;
  keywords?: string[];
  entities?: NamedEntity[];
  sentiment?: number;
  readability?: ReadabilityScore;
  /** Vocabulary-classified skills (e.g., react, python, docker) */
  skills?: string[];
  /** Vocabulary-classified subjects (e.g., technology, science) */
  subjects?: string[];
  /** Vocabulary-classified topics (e.g., architecture, troubleshooting) */
  topics?: string[];
  /** Vocabulary-classified difficulty level */
  difficulty?: string;
  custom?: Record<string, unknown>;
}

export interface NamedEntity {
  text: string;
  type: string;
  confidence: number;
}

export interface ReadabilityScore {
  grade: number;
  ease: number;
  metric: string;
}

export interface ExportOptions {
  format?: string;
  includeMetadata?: boolean;
  includeToc?: boolean;
  template?: string;
}

export interface ExportResult {
  success: boolean;
  data: Blob | string;
  filename?: string;
  mimeType: string;
  error?: string;
}

// ============================================================================
// Viewer Plugin Interfaces
// ============================================================================

export interface ViewerToolbarExtension {
  position: 'left' | 'center' | 'right';
  items: ToolbarItem[];
}

export interface ToolbarItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
  onClick?: () => void;
  component?: React.ComponentType<unknown>;
}

export interface ViewerSidebarExtension {
  position: 'left' | 'right';
  title: string;
  icon?: React.ReactNode;
  component: React.ComponentType<unknown>;
  defaultOpen?: boolean;
}

export interface ViewerContextMenuExtension {
  items: ContextMenuItem[];
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  condition?: (context: ContextMenuContext) => boolean;
  onClick: (context: ContextMenuContext) => void;
  submenu?: ContextMenuItem[];
}

export interface ContextMenuContext {
  selection?: string;
  node?: unknown;
  path?: string;
  position?: { x: number; y: number };
}

export interface ViewerCommand {
  id: string;
  name: string;
  description?: string;
  execute: (...args: unknown[]) => void | Promise<void>;
}

export interface ViewerKeybinding {
  command: string;
  key: string;
  when?: string;
  description?: string;
}

// ============================================================================
// Theme Types
// ============================================================================

export type ThemeCategory =
  | 'light'
  | 'dark'
  | 'sepia'
  | 'terminal'
  | 'high-contrast'
  | 'custom';

export interface ThemeColors {
  // Background
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgPaper: string;
  bgOverlay: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Accent
  accent: string;
  accentHover: string;
  accentMuted: string;

  // Semantic
  success: string;
  warning: string;
  error: string;
  info: string;

  // Borders
  border: string;
  borderMuted: string;
  borderFocus: string;

  // Syntax highlighting (code blocks)
  syntax?: {
    keyword: string;
    string: string;
    number: string;
    comment: string;
    function: string;
    variable: string;
    operator: string;
  };
}

export interface ThemeTypography {
  fontFamily: {
    sans: string;
    serif: string;
    mono: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface ThemeSpacing {
  unit: number;
  scale: number[];
}

export interface ThemeEffects {
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadow: {
    none: string;
    sm: string;
    md: string;
    lg: string;
  };
  transition: {
    fast: string;
    normal: string;
    slow: string;
  };
}

export interface ThemeManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: PluginAuthor;
  category: ThemeCategory;
  preview?: string;
  tags?: string[];

  // Compatibility
  compatibility?: {
    codexViewer?: PluginVersion;
  };

  // Verification
  verified?: boolean;
  verifiedAt?: string;
  verifiedBy?: PluginAuthor;

  // Stats
  downloads?: number;
  rating?: number;
}

export interface Theme {
  manifest: ThemeManifest;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing?: ThemeSpacing;
  effects?: ThemeEffects;

  // Raw CSS for injection
  css?: string;

  // CSS variables map
  variables?: Record<string, string>;
}

// ============================================================================
// Plugin Manager Types
// ============================================================================

export interface PluginState {
  id: string;
  status: PluginStatus;
  enabled: boolean;
  loadedAt?: Date;
  error?: string;
  config?: Record<string, unknown>;
}

export interface PluginManagerConfig {
  registryUrl?: string;
  cacheDir?: string;
  autoUpdate?: boolean;
  lazyLoad?: boolean;
  maxConcurrentLoads?: number;
  timeout?: number;
}

export interface PluginLoadResult {
  success: boolean;
  plugin?: Plugin;
  error?: string;
  warnings?: string[];
}

export interface PluginCompatibilityResult {
  compatible: boolean;
  issues: CompatibilityIssue[];
}

export interface CompatibilityIssue {
  type: 'version' | 'dependency' | 'conflict' | 'permission' | 'browser';
  severity: 'error' | 'warning';
  message: string;
  resolution?: string;
}

export interface PluginSearchOptions {
  query?: string;
  type?: PluginType;
  category?: PluginCategory;
  tags?: string[];
  verified?: boolean;
  sortBy?: 'name' | 'downloads' | 'rating' | 'updated';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PluginSearchResult {
  plugins: PluginManifest[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// Events
// ============================================================================

export type PluginEventType =
  | 'plugin:load'
  | 'plugin:unload'
  | 'plugin:activate'
  | 'plugin:deactivate'
  | 'plugin:error'
  | 'plugin:update'
  | 'theme:change'
  | 'registry:sync';

export interface PluginEvent {
  type: PluginEventType;
  pluginId?: string;
  themeId?: string;
  timestamp: Date;
  data?: unknown;
}

export type PluginEventHandler = (event: PluginEvent) => void | Promise<void>;

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> =
  T extends (...args: unknown[]) => Promise<infer R> ? R : never;
