// File: backend/src/core/knowledge/IKnowledgeBaseService.ts
/**
 * @file IKnowledgeBaseService.ts
 * @version 1.0.1
 * @description Interface for a service that provides access to a shared knowledge base
 * for AI agents. This knowledge base contains foundational information about the
 * site, platform, or any common data agents might need to reference.
 *
 * @notes
 * - v1.0.1: Added optional `createdAt` and `updatedAt` fields to `IKnowledgeItem`.
 */

/**
 * Represents a single item or entry within the knowledge base.
 * The structure is flexible to accommodate various types of information.
 */
export interface IKnowledgeItem {
  /**
   * A unique identifier for the knowledge item.
   * @type {string}
   * @example "platform_overview", "feature_X_details"
   */
  id: string;

  /**
   * The type of knowledge item, helping to categorize and process it.
   * @type {string}
   * @example "general_info", "faq", "technical_spec", "user_guide_section"
   */
  type: string;

  /**
   * A list of keywords or tags associated with this item for easier searching or relevance matching.
   * @type {string[]}
   * @example ["platform", "introduction", "overview"]
   */
  tags: string[];

  /**
   * The main content of the knowledge item.
   * This could be plain text, Markdown, or a stringified JSON object depending on the 'type'.
   * @type {string}
   */
  content: string;

  /**
   * Optional metadata, such as source, last updated date, or version.
   * @type {Record<string, any>}
   * @optional
   */
  metadata?: Record<string, any>;

  /**
   * Optional timestamp indicating when the knowledge item was created.
   * Represented as a Date object in runtime, potentially an ISO string in storage.
   * @type {Date}
   * @optional
   */
  createdAt?: Date;

  /**
   * Optional timestamp indicating when the knowledge item was last updated.
   * Represented as a Date object in runtime, potentially an ISO string in storage.
   * @type {Date}
   * @optional
   */
  updatedAt?: Date;
}

/**
 * @interface IKnowledgeBaseService
 * @description Defines the contract for services that manage and provide access
 * to the shared knowledge base.
 */
export interface IKnowledgeBaseService {
  /**
   * Retrieves a specific knowledge item by its ID.
   * @async
   * @param {string} id - The unique identifier of the knowledge item to retrieve.
   * @returns {Promise<IKnowledgeItem | null>} A promise that resolves to the knowledge item
   * if found, or null otherwise.
   */
  getKnowledgeItemById(id: string): Promise<IKnowledgeItem | null>;

  /**
   * Retrieves all knowledge items that match a given set of tags.
   * @async
   * @param {string[]} tags - An array of tags to filter by. Items matching any of the tags may be returned.
   * @returns {Promise<IKnowledgeItem[]>} A promise that resolves to an array of matching knowledge items.
   */
  findKnowledgeItemsByTags(tags: string[]): Promise<IKnowledgeItem[]>;

  /**
   * Searches the knowledge base for items whose content or tags match a query string.
   * @async
   * @param {string} query - The search query string.
   * @param {number} [limit=5] - Optional limit on the number of items to return.
   * @returns {Promise<IKnowledgeItem[]>} A promise that resolves to an array of relevant knowledge items.
   */
  searchKnowledgeBase(query: string, limit?: number): Promise<IKnowledgeItem[]>;

  /**
   * Adds a new knowledge item to the knowledge base or updates an existing one.
   * @async
   * @param {Omit<IKnowledgeItem, 'id'> | IKnowledgeItem} itemData - The data for the knowledge item.
   * If 'id' is omitted for a new item, the service should generate one.
   * If 'id' is provided and exists, the item should be updated.
   * @returns {Promise<IKnowledgeItem>} A promise that resolves to the added or updated knowledge item.
   * @throws {Error} If the item cannot be added or updated.
   */
  addKnowledgeItem(itemData: Omit<IKnowledgeItem, 'id' | 'updatedAt' | 'createdAt'> & { id?: string; createdAt?: Date; updatedAt?: Date }): Promise<IKnowledgeItem>;


  /**
   * Reloads the knowledge base from its source.
   * @async
   * @returns {Promise<void>} A promise that resolves when the knowledge base has been reloaded.
   * @throws {Error} If reloading fails.
   */
  reloadKnowledgeBase(): Promise<void>;
}