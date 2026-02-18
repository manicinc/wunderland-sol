/**
 * Configuration Module
 *
 * Unified exports for deployment mode, feature flags, and feature gates.
 *
 * @module lib/config
 */

// Deployment mode types and utilities
export {
  type DeploymentMode,
  type Edition,
  type StorageBackendType,
  type ContentSourceType,
  type PlatformType,
  type FeatureFlags,
  COMMUNITY_DEFAULTS,
  PREMIUM_DEFAULTS,
  isBrowser,
  isElectron,
  isCapacitor,
  isPWA,
  detectPlatform,
  isOnline,
  getDeploymentMode,
  getEdition,
  isPremiumBuild,
  getLicenseServerUrl,
} from './deploymentMode'

// Feature flags resolver
export {
  type FeatureFlagOverrides,
  type LicenseStatus,
  getFeatureFlags,
  refreshFlags,
  updateLicenseStatus,
  isFeatureEnabled,
  getStaticFeatureFlags,
  useFeatureFlags,
  BUILD_FLAGS,
} from './featureFlags'

// Feature gates
export {
  Features,
  type Feature,
  PREMIUM_FEATURES,
  FREE_FEATURES,
  isFeatureEnabled as isFeatureGateEnabled,
  hasPremiumAccess,
  isOfflineMode,
  getEnabledFeatures,
  getDisabledFeatures,
  FeatureGate,
  type FeatureGateProps,
  PremiumGate,
  type PremiumGateProps,
  useFeature,
  useFeatures,
  usePremiumStatus,
  getFeatureInfo,
  getPremiumFeatureList,
  type FeatureInfo,
} from './featureGates'

// Instance configuration (customizable Fabric name)
export {
  type InstanceConfig,
  type InstanceConfigContextValue,
  DEFAULT_INSTANCE_CONFIG,
  INSTANCE_PRESETS,
  InstanceConfigProvider,
  useInstanceConfig,
  getInstanceConfig,
  getDisplayName,
} from './instanceConfig'

// Traveler configuration (customizable user name)
export {
  type TravelerConfig,
  DEFAULT_TRAVELER_CONFIG,
  PRESET_TRAVELERS,
  TRAVELER_ACCENT_COLORS,
  getTravelerConfig,
  setTravelerConfig,
  resetTravelerConfig,
  getTravelerGreeting,
  canEditTravelerConfig,
} from './travelerConfig'

// Security configuration (local password protection)
export {
  type SecurityConfig,
  type SecuritySession,
  type SecurityContextValue,
  DEFAULT_SECURITY_CONFIG,
  SecurityProvider,
  useSecurity,
  getSecurityConfig,
  getSecurityConfigAsync,
  isPasswordProtected,
  isPasswordProtectedAsync,
} from './securityConfig'

// Repository configuration (plugin registry & Codex source)
export {
  type RepositoryConfig,
  type PluginRepoInfo,
  getPluginRepo,
  getPluginRegistryUrl,
  getCodexRepo,
  getRepositoryConfig,
  getPluginRepoInfo,
  getCodexRepoUrl,
  isUsingOfficialRepos,
  getEffectivePluginRepo,
  getEffectivePluginRegistryUrl,
  getEffectiveCodexRepo,
  saveStoredConfig,
  clearStoredConfig,
} from './repositoryConfig'
