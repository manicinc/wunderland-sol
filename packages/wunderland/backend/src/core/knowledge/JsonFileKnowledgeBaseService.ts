// File: backend/src/core/knowledge/JsonFileKnowledgeBaseService.ts
/**
 * @file JsonFileKnowledgeBaseService.ts
 * @version 1.0.1
 * @description Implements the IKnowledgeBaseService interface using a local JSON file
 * as the data source for the shared agent knowledge base.
 *
 * @notes
 * - v1.0.1: Corrected path resolution for ES module scope.
 * Added more robust file loading and default file creation.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url'; // Import for ES module path resolution
import { IKnowledgeBaseService, IKnowledgeItem } from './IKnowledgeBaseService.js';

const DEFAULT_KNOWLEDGE_BASE_FILE_PATH = 'config/knowledge_base.json';

export class JsonFileKnowledgeBaseService implements IKnowledgeBaseService {
  private knowledgeItems: IKnowledgeItem[] = [];
  private filePath: string;
  private isInitialized: boolean = false;

  constructor() {
    // Correct way to get __dirname equivalent in ES modules
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Resolve project root based on this file's location:
    // backend/src/core/knowledge/JsonFileKnowledgeBaseService.ts
    // __dirname is backend/src/core/knowledge
    // ../../.. goes up to backend/
    // ../../../../ goes up to project root
    const projectRoot = path.resolve(__dirname, '../../../../');
    const relativePath = process.env.KNOWLEDGE_BASE_PATH || DEFAULT_KNOWLEDGE_BASE_FILE_PATH;
    this.filePath = path.join(projectRoot, relativePath);
    console.log(`[JsonFileKnowledgeBaseService] Using knowledge base file: ${this.filePath}`);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[JsonFileKnowledgeBaseService] Already initialized.');
      return;
    }
    try {
      await this.loadKnowledgeFromFile();
      this.isInitialized = true;
      console.log(`[JsonFileKnowledgeBaseService] Initialized successfully. Loaded ${this.knowledgeItems.length} items from ${this.filePath}.`);
    } catch (error) {
      console.error(`[JsonFileKnowledgeBaseService] Failed to initialize from ${this.filePath}:`, error);
      this.knowledgeItems = [];
      // Decide if you want to create a default empty file if it doesn't exist
      // await this.ensureFileExists(); // Optional: create default if missing
    }
  }

  private async ensureFileExists(): Promise<void> {
    try {
        await fs.access(this.filePath);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.warn(`[JsonFileKnowledgeBaseService] Knowledge base file not found at ${this.filePath}. Creating a default empty file.`);
            try {
                await fs.mkdir(path.dirname(this.filePath), { recursive: true }); // Ensure directory exists
                await fs.writeFile(this.filePath, JSON.stringify({ knowledgeBase: [] }, null, 2), 'utf-8');
                console.log(`[JsonFileKnowledgeBaseService] Created default knowledge base file at ${this.filePath}`);
            } catch (writeError) {
                console.error(`[JsonFileKnowledgeBaseService] Failed to create default knowledge base file:`, writeError);
            }
        }
    }
  }


  private async loadKnowledgeFromFile(): Promise<void> {
    try {
      const fileContent = await fs.readFile(this.filePath, 'utf-8');
      const parsedData = JSON.parse(fileContent);
      if (Array.isArray(parsedData)) {
        this.knowledgeItems = parsedData.filter(item => this.isValidKnowledgeItem(item));
      } else if (parsedData && typeof parsedData === 'object' && Array.isArray(parsedData.knowledgeBase)) {
        this.knowledgeItems = parsedData.knowledgeBase.filter((item: any) => this.isValidKnowledgeItem(item));
      } else {
        console.warn(`[JsonFileKnowledgeBaseService] Knowledge base file (${this.filePath}) does not contain a valid array or a root 'knowledgeBase' array. Initializing empty.`);
        this.knowledgeItems = [];
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.warn(`[JsonFileKnowledgeBaseService] Knowledge base file not found at ${this.filePath}. Initializing empty.`);
        this.knowledgeItems = [];
        await this.ensureFileExists(); // Attempt to create it if it doesn't exist
      } else {
        console.error(`[JsonFileKnowledgeBaseService] Error reading or parsing knowledge base file: ${this.filePath}`, error);
        throw new Error(`Error reading or parsing knowledge base file: ${error.message}`);
      }
    }
  }

  private isValidKnowledgeItem(item: any): item is IKnowledgeItem {
    return (
      item &&
      typeof item.id === 'string' &&
      typeof item.type === 'string' &&
      Array.isArray(item.tags) &&
      item.tags.every((tag: any) => typeof tag === 'string') &&
      typeof item.content === 'string'
    );
  }

  public async getKnowledgeItemById(id: string): Promise<IKnowledgeItem | null> {
    if (!this.isInitialized) await this.initialize();
    return this.knowledgeItems.find(item => item.id === id) || null;
  }

  public async findKnowledgeItemsByTags(tags: string[]): Promise<IKnowledgeItem[]> {
    if (!this.isInitialized) await this.initialize();
    if (!tags || tags.length === 0) return [];
    const lowerCaseTags = tags.map(tag => tag.toLowerCase());
    return this.knowledgeItems.filter(item =>
      item.tags.some(itemTag => lowerCaseTags.includes(itemTag.toLowerCase()))
    );
  }

  public async searchKnowledgeBase(query: string, limit: number = 5): Promise<IKnowledgeItem[]> {
    if (!this.isInitialized) await this.initialize();
    if (!query || typeof query !== 'string') return [];

    const lowerCaseQuery = query.toLowerCase();
    const queryTerms = lowerCaseQuery.split(/\s+/).filter(term => term.length > 1);
    if (queryTerms.length === 0) return [];

    const scoredItems = this.knowledgeItems.map(item => {
      let score = 0;
      const contentLower = item.content.toLowerCase();
      const tagsStringLower = item.tags.join(' ').toLowerCase();
      const idLower = item.id.toLowerCase();
      const typeLower = item.type.toLowerCase();

      queryTerms.forEach(term => {
        if (idLower.includes(term)) score += 5;
        if (tagsStringLower.includes(term)) score += 3;
        if (contentLower.includes(term)) score += 1;
        if (typeLower.includes(term)) score += 2;
      });
      return { item, score };
    });

    return scoredItems
      .filter(si => si.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(si => si.item);
  }

  public async addKnowledgeItem(itemData: Omit<IKnowledgeItem, 'id'> | IKnowledgeItem): Promise<IKnowledgeItem> {
    if (!this.isInitialized) await this.initialize();

    const newItem: IKnowledgeItem = {
      id: ('id' in itemData ? itemData.id : `gen_${Date.now()}_${Math.random().toString(36).substring(2,9)}`),
      type: itemData.type, // Ensure all required fields are present
      tags: itemData.tags,
      content: itemData.content,
      metadata: itemData.metadata, // Optional
      createdAt: ('createdAt' in itemData && itemData.createdAt ? itemData.createdAt : new Date()), // Default createdAt
      updatedAt: new Date(), // Always set/update updatedAt
    };

    if (!this.isValidKnowledgeItem(newItem)) {
      throw new Error("Invalid knowledge item data provided.");
    }

    const existingIndex = this.knowledgeItems.findIndex(item => item.id === newItem.id);
    if (existingIndex !== -1) {
      this.knowledgeItems[existingIndex] = newItem;
      console.log(`[JsonFileKnowledgeBaseService] Updated knowledge item (in-memory): ${newItem.id}`);
    } else {
      this.knowledgeItems.push(newItem);
      console.log(`[JsonFileKnowledgeBaseService] Added new knowledge item (in-memory): ${newItem.id}`);
    }
    await this.persistKnowledgeToFile();
    return newItem;
  }

  private async persistKnowledgeToFile(): Promise<void> {
    try {
      const dataToWrite = { knowledgeBase: this.knowledgeItems };
      await fs.writeFile(this.filePath, JSON.stringify(dataToWrite, null, 2), 'utf-8');
      console.log(`[JsonFileKnowledgeBaseService] Knowledge base successfully persisted to ${this.filePath}`);
    } catch (error) {
      console.error(`[JsonFileKnowledgeBaseService] Error persisting knowledge base to file:`, error);
      throw new Error(`Failed to write knowledge base to file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async reloadKnowledgeBase(): Promise<void> {
    console.log('[JsonFileKnowledgeBaseService] Reloading knowledge base from file...');
    this.isInitialized = false;
    await this.initialize();
  }
}

export const jsonFileKnowledgeBaseService = new JsonFileKnowledgeBaseService();
// Initialization should be handled at application startup, e.g., in server.ts
// (async () => {
//   await jsonFileKnowledgeBaseService.initialize();
// })();