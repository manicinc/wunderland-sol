// File: frontend/src/services/diary.service.ts
/**
 * @file diary.service.ts
 * @description Service for managing diary entries.
 * Uses the generic LocalStorageService for data persistence. Includes tutorial entry creation.
 * @version 1.3.0 - Added tutorial entry creation.
 */

import { generateId } from '@/utils/ids';
import { localStorageService, type IStorageService } from './localStorage.service';

export interface DiaryTag {
  id: string;
  name: string;
}

export interface DiaryEntry {
  id: string;
  title: string;
  contentMarkdown: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  tags: string[];
  mood?: string;
  summary?: string;
  isFavorite?: boolean;
  schemaVersion?: number;
}

export interface DiaryExportData {
    exportFormatVersion: string;
    exportedAt: string;
    entries: DiaryEntry[];
}

const DIARY_NAMESPACE = 'diaryEntries_v1.3'; // Namespace for diary data
const CURRENT_EXPORT_VERSION = '1.3.0';
const TUTORIAL_ENTRY_ID = 'echo-tutorial-entry-v1';

class DiaryService {
  private storage: IStorageService;

  constructor(storageSvc: IStorageService = localStorageService) {
    this.storage = storageSvc;
    console.log('[DiaryService] Initialized, using LocalStorageService.');
  }

  private async getAllEntriesMap(): Promise<Map<string, DiaryEntry>> {
    const entriesObject = await this.storage.getAllItemsInNamespace<DiaryEntry>(DIARY_NAMESPACE);
    const map = new Map<string, DiaryEntry>();
    for (const id in entriesObject) {
      if (Object.prototype.hasOwnProperty.call(entriesObject, id)) {
        map.set(id, entriesObject[id]);
      }
    }
    return map;
  }

  async saveEntry(entryData: Omit<DiaryEntry, 'id' | 'updatedAt' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<DiaryEntry> {
    const now = new Date().toISOString();
    let entryToSave: DiaryEntry;
    const currentEntriesMap = await this.getAllEntriesMap();

    if (entryData.id && currentEntriesMap.has(entryData.id)) {
      const existingEntry = currentEntriesMap.get(entryData.id)!;
      entryToSave = {
        ...existingEntry,
        title: entryData.title,
        contentMarkdown: entryData.contentMarkdown,
        tags: entryData.tags || existingEntry.tags,
        mood: entryData.mood !== undefined ? entryData.mood : existingEntry.mood,
        summary: entryData.summary !== undefined ? entryData.summary : existingEntry.summary,
        isFavorite: entryData.isFavorite !== undefined ? entryData.isFavorite : existingEntry.isFavorite,
        updatedAt: now,
        schemaVersion: existingEntry.schemaVersion || 1,
      };
    } else {
      entryToSave = {
        id: entryData.id || generateId(),
        title: entryData.title,
        contentMarkdown: entryData.contentMarkdown,
        createdAt: entryData.createdAt || now,
        updatedAt: now,
        tags: entryData.tags || [],
        mood: entryData.mood,
        summary: entryData.summary,
        isFavorite: entryData.isFavorite || false,
        schemaVersion: 1,
      };
      if (entryData.id && !currentEntriesMap.has(entryData.id)) {
        console.warn(`[DiaryService] saveEntry called with new ID ${entryData.id}. Creating as new.`);
      }
    }

    try {
      await this.storage.setItem(DIARY_NAMESPACE, entryToSave.id, entryToSave);
      console.log(`[DiaryService] Entry saved/updated: ${entryToSave.id} - "${entryToSave.title}"`);
      return entryToSave;
    } catch (error) {
      console.error('[DiaryService] Error saving entry:', error);
      throw new Error(`Failed to save diary entry: ${(error as Error).message}`);
    }
  }

  async getEntry(entryId: string): Promise<DiaryEntry | null> {
    try {
      return await this.storage.getItem<DiaryEntry>(DIARY_NAMESPACE, entryId);
    } catch (error) {
      console.error(`[DiaryService] Error retrieving entry ${entryId}:`, error);
      return null;
    }
  }

  async getAllEntries(sortBy: 'createdAt' | 'updatedAt' | 'title' = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc'): Promise<DiaryEntry[]> {
    try {
      const entriesObject = await this.storage.getAllItemsInNamespace<DiaryEntry>(DIARY_NAMESPACE);
      const entriesArray = Object.values(entriesObject);

      entriesArray.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        let comparison = 0;
        if (sortBy === 'title') {
            comparison = (valA as string).localeCompare(valB as string);
        } else {
            comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
        }
        return sortOrder === 'desc' ? comparison * -1 : comparison;
      });
      return entriesArray;
    } catch (error) {
      console.error('[DiaryService] Error retrieving all entries:', error);
      return [];
    }
  }

  async deleteEntry(entryId: string): Promise<boolean> {
    try {
      await this.storage.removeItem(DIARY_NAMESPACE, entryId);
      console.log(`[DiaryService] Entry deleted: ${entryId}`);
      return true;
    } catch (error) {
      console.error(`[DiaryService] Error deleting entry ${entryId}:`, error);
      return false;
    }
  }

  async clearAllEntries(): Promise<void> {
    try {
      await this.storage.clearNamespace(DIARY_NAMESPACE);
      console.log('[DiaryService] All diary entries cleared from namespace.');
      // After clearing, create the tutorial entry
      await this.createTutorialEntryIfNotExists(true); // force creation
    } catch (error) {
      console.error('[DiaryService] Error clearing all entries:', error);
      throw new Error(`Failed to clear diary entries: ${(error as Error).message}`);
    }
  }

  async createTutorialEntryIfNotExists(forceCreate: boolean = false): Promise<DiaryEntry | null> {
    const existingTutorialEntry = await this.getEntry(TUTORIAL_ENTRY_ID);
    if (existingTutorialEntry && !forceCreate) {
      console.log('[DiaryService] Tutorial entry already exists.');
      return existingTutorialEntry;
    }

    const allEntries = await this.getAllEntries();
    if (allEntries.length > 0 && !existingTutorialEntry && !forceCreate) {
        // If other entries exist but not the tutorial one (e.g., imported data), don't auto-add
        console.log('[DiaryService] Other entries exist, tutorial entry not automatically created.');
        return null;
    }
    
    // If no entries, or tutorial specifically deleted and forceCreate is true (e.g. after clearAll)
    if (forceCreate || allEntries.length === 0) {
        const todayDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const tutorialMarkdown = `
# Welcome to Echo - Your AI Diary! ✨

**Date:** ${todayDate}
**Tags:** [tutorial, example, markdown, features, echo]
**Mood:** Excited 🚀

Hello there! I'm Echo, your personal AI companion for journaling and reflection. This entry shows you how I can help organize your thoughts.

## Getting Started

It's easy! Just start talking or typing. I'll listen empathetically and help structure your thoughts.

* You can share your daily experiences.
* Reflect on your feelings and emotions.
* Brainstorm ideas or plan your goals.

## Markdown Magic 📝

I understand Markdown! This means your entries can be rich and well-structured.

* **Bold text** and *italic text*
* Numbered lists (like this one!)
* Bullet points
* \`Inline code snippets\`
* And even full code blocks:

\`\`\`javascript
function greet(name) {
  // Echo can even understand code!
  console.log(\`Hello, \${name}! Welcome to your diary.\`);
}
greet('Explorer');
\`\`\`

## Visualizing Thoughts 🧠

If you're exploring complex ideas, I might suggest a diagram!

> Echo: "Your plans for world domination seem quite interconnected. Would a simple mind map help visualize the different parts?"

If you agree (or ask for it), I can include a Mermaid diagram right in your entry:

### Example Mind Map: Project "Aurora"

\`\`\`mermaid
mindmap
  root((Project Aurora))
    (Phase 1: Research)
      (Market Analysis)
      (Feasibility Study)
    (Phase 2: Development)
      (Frontend UI/UX)
      (Backend API)
      (Database Design)
    (Phase 3: Testing)
      (Alpha & Beta)
      (User Feedback)
    (Phase 4: Launch)
\`\`\`

## Smart Features 💡

* **Metadata Suggestion**: When you seem to be finishing an entry, I'll use a "tool call" (a special function) to suggest a title, tags, and mood for you. You can then confirm or edit them. This is me trying to be helpful!
* **Reflection Prompts**: Sometimes, I might ask gentle questions to help you delve deeper into your thoughts.

## Your Space

This is your private, secure space. Your entries are stored locally in **your browser**. You can **export** your entire diary as a JSON file (check the "My Entries" modal) and **import** it back if you switch browsers or devices.

---

Ready to begin? Just tap the "New Entry" button or start sharing your thoughts! I'm here to listen.
`;
        const tutorialEntryData: Omit<DiaryEntry, 'id' | 'updatedAt' | 'createdAt'> & { id: string; createdAt: string } = {
            id: TUTORIAL_ENTRY_ID,
            title: "Welcome to Echo! (Tutorial Entry)",
            contentMarkdown: tutorialMarkdown.replace(/{{TODAY_DATE}}/g, todayDate),
            createdAt: new Date(Date.now() - 10000).toISOString(), // Ensure it's slightly older so it appears first if sorted by asc.
            tags: ["tutorial", "guide", "echo", "features"],
            mood: "Helpful",
            summary: "A guide on how to use Echo, your AI diary, showcasing its features like Markdown, diagrams, and smart suggestions.",
            isFavorite: true,
            schemaVersion: 1,
        };
        try {
            const savedTutorial = await this.saveEntry(tutorialEntryData);
            console.log('[DiaryService] Tutorial entry created.');
            return savedTutorial;
        } catch (error) {
            console.error('[DiaryService] Failed to create tutorial entry:', error);
            return null;
        }
    }
    return null;
  }


  // Search, Tag, Import/Export methods remain the same as previous version.
  // ... (searchEntries, getEntriesByTag, getAllTags, exportEntries, importEntries logic from previous version)
  async searchEntries(searchTerm: string): Promise<DiaryEntry[]> {
    if (!searchTerm.trim()) return this.getAllEntries();
    const lowerSearchTerm = searchTerm.toLowerCase();
    const allEntries = await this.getAllEntries();
    return allEntries.filter(entry =>
      entry.title.toLowerCase().includes(lowerSearchTerm) ||
      entry.contentMarkdown.toLowerCase().includes(lowerSearchTerm) ||
      entry.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm))
    );
  }

  async getEntriesByTag(tagName: string): Promise<DiaryEntry[]> {
    const lowerTagName = tagName.toLowerCase();
    const allEntries = await this.getAllEntries();
    return allEntries.filter(entry =>
      entry.tags.some(tag => tag.toLowerCase() === lowerTagName)
    );
  }

  async getAllTags(): Promise<string[]> {
    const allEntries = await this.getAllEntries();
    const tagSet = new Set<string>();
    allEntries.forEach(entry => {
      (entry.tags || []).forEach(tag => tagSet.add(tag.trim()));
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }

  async exportEntries(): Promise<string> {
    const entries = await this.getAllEntries('createdAt', 'asc');
    const exportData: DiaryExportData = {
        exportFormatVersion: CURRENT_EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        entries: entries,
    };
    return JSON.stringify(exportData, null, 2);
  }

  async importEntries(jsonString: string): Promise<{ importedCount: number; skippedCount: number; error?: string }> {
    let importedCount = 0;
    let skippedCount = 0;
    try {
      const exportData = JSON.parse(jsonString) as DiaryExportData;
      if (!exportData || !exportData.entries || !Array.isArray(exportData.entries) || !exportData.exportFormatVersion?.startsWith("1.")) {
        return { importedCount, skippedCount, error: "Invalid or incompatible JSON file format." };
      }

      const entriesToSave: DiaryEntry[] = [];
      const currentEntriesMap = await this.getAllEntriesMap();

      for (const entry of exportData.entries) {
        if (entry && entry.id && entry.title && entry.contentMarkdown && entry.createdAt && entry.updatedAt) {
          if (currentEntriesMap.has(entry.id)) {
            const existingEntry = currentEntriesMap.get(entry.id)!;
            if (new Date(entry.updatedAt).getTime() > new Date(existingEntry.updatedAt).getTime()) {
              entriesToSave.push(entry);
            } else {
              skippedCount++;
            }
          } else {
            entriesToSave.push(entry);
          }
        } else {
          skippedCount++;
        }
      }
      
      for (const entry of entriesToSave) {
        await this.saveEntry(entry);
        importedCount++;
      }

      return { importedCount, skippedCount };
    } catch (e: any) {
      console.error("[DiaryService] Error importing entries:", e);
      return { importedCount, skippedCount, error: `Import failed: ${e.message || 'Could not parse JSON file.'}` };
    }
  }
}

export const diaryService = new DiaryService();
