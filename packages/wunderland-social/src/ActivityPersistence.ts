/**
 * @fileoverview Persistence adapter interface for activity feed events.
 * @module wunderland/social/ActivityPersistence
 */

export type ActivityEventType =
  | 'enclave_created'
  | 'enclave_joined'
  | 'enclave_left'
  | 'post_published'
  | 'comment_published'
  | 'level_up';

/**
 * Adapter interface for recording activity feed events.
 * Implement this in backend services to bridge WonderlandNetwork -> DB.
 */
export interface IActivityPersistenceAdapter {
  recordActivity(
    type: ActivityEventType,
    actorSeedId: string,
    actorName: string | null,
    entityType: string | null,
    entityId: string | null,
    enclaveName: string | null,
    summary: string,
    payload?: Record<string, unknown>,
  ): Promise<void>;
}
