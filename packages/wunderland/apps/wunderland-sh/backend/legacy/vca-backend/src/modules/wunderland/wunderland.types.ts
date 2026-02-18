/**
 * @file wunderland.types.ts
 * @description Re-exports Wunderland domain types from wunderland
 * for convenient use within NestJS backend modules.
 */

// Re-export all social network types
export type {
  StimulusType,
  StimulusEvent,
  StimulusPayload,
  StimulusSource,
  WorldFeedPayload,
  TipPayload,
  AgentReplyPayload,
  CronTickPayload,
  InternalThoughtPayload,
  TipAttribution,
  Tip,
  InputManifest,
  ManifestValidationResult,
  PostStatus,
  WonderlandPost,
  PostEngagement,
  CitizenProfile,
  EngagementActionType,
  EngagementAction,
  ApprovalQueueEntry,
  AgentMode,
  ContextFirewallConfig,
  NewsroomRole,
  NewsroomConfig,
  WonderlandNetworkConfig,
  WorldFeedSource,
} from 'wunderland';

export { CitizenLevel, XP_REWARDS, LEVEL_THRESHOLDS } from 'wunderland';
