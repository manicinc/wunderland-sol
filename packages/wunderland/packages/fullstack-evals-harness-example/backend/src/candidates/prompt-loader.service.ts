import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface LoadedPrompt {
  id: string;
  name: string;
  description: string | null;
  runnerType: 'llm_prompt' | 'http_endpoint';
  systemPrompt: string | null;
  userPromptTemplate: string | null;
  modelConfig: Record<string, unknown> | null;
  endpointUrl: string | null;
  endpointMethod: string | null;
  endpointHeaders: Record<string, string> | null;
  endpointBodyTemplate: string | null;
  parentId: string | null;
  variantLabel: string | null;
  recommendedGraders: string[];
  graderWeights: Record<string, number>;
  recommendedDatasets: string[];
  graderRationale: string | null;
  notes: string | null;
  source: 'file';
  /** Absolute path to the .md file on disk */
  filePath: string;
}

@Injectable()
export class PromptLoaderService implements OnModuleInit {
  private readonly logger = new Logger(PromptLoaderService.name);
  private prompts = new Map<string, LoadedPrompt>();
  private promptsDir: string;

  constructor() {
    // prompts/ directory lives next to src/ in the backend package
    // In compiled dist: __dirname = dist/src/candidates/, so go up 3 levels
    // In tests (ts-jest): __dirname = src/candidates/, so go up 2 levels
    const candidate = path.resolve(__dirname, '..', '..', '..', 'prompts');
    const fallback = path.resolve(__dirname, '..', '..', 'prompts');
    this.promptsDir = fs.existsSync(candidate) ? candidate : fallback;
  }

  onModuleInit() {
    this.loadAll();
  }

  /**
   * Read all .md files from the prompts directory and parse them.
   * Supports both folder-per-family structure and flat files (backwards compat).
   *
   * Folder convention:
   *   prompts/{family}/base.md     → parent prompt, ID = folder name
   *   prompts/{family}/{name}.md   → variant, ID = {family}-{name}
   *   prompts/{name}.md            → flat file (backwards compat), ID = filename
   */
  loadAll(): { loaded: number } {
    this.prompts.clear();

    if (!fs.existsSync(this.promptsDir)) {
      this.logger.warn(`Prompts directory not found: ${this.promptsDir}`);
      return { loaded: 0 };
    }

    const entries = fs.readdirSync(this.promptsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Family folder — scan for .md files inside
        const familyId = entry.name;
        const familyDir = path.join(this.promptsDir, familyId);
        const mdFiles = fs.readdirSync(familyDir).filter((f) => f.endsWith('.md'));

        for (const file of mdFiles) {
          try {
            const filePath = path.join(familyDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const isBase = file === 'base.md';
            const prompt = this.parseMarkdown(
              file,
              content,
              filePath,
              familyId, // folderParentId
              isBase ? undefined : file.replace(/\.md$/, '') // folderVariantLabel
            );
            this.prompts.set(prompt.id, prompt);
          } catch (err) {
            this.logger.error(`Failed to parse ${familyId}/${file}: ${err}`);
          }
        }
      } else if (entry.name.endsWith('.md')) {
        // Flat file (backwards compat)
        try {
          const filePath = path.join(this.promptsDir, entry.name);
          const content = fs.readFileSync(filePath, 'utf-8');
          const prompt = this.parseMarkdown(entry.name, content, filePath);
          this.prompts.set(prompt.id, prompt);
        } catch (err) {
          this.logger.error(`Failed to parse ${entry.name}: ${err}`);
        }
      }
    }

    this.logger.log(`Loaded ${this.prompts.size} prompts from ${this.promptsDir}`);
    return { loaded: this.prompts.size };
  }

  findAll(): LoadedPrompt[] {
    return Array.from(this.prompts.values());
  }

  findOne(id: string): LoadedPrompt {
    const prompt = this.prompts.get(id);
    if (!prompt) {
      throw new NotFoundException(`Prompt "${id}" not found`);
    }
    return prompt;
  }

  findMany(ids: string[]): LoadedPrompt[] {
    return ids.map((id) => this.findOne(id));
  }

  /**
   * Normalize a variant label into a safe slug for prompt IDs/files.
   */
  normalizeVariantLabel(label: string): string {
    const normalized = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
    return normalized || 'variant';
  }

  buildVariantId(parentId: string, variantLabel: string): string {
    return `${parentId}-${this.normalizeVariantLabel(variantLabel)}`;
  }

  /**
   * Update a prompt's .md file on disk and reload it in memory.
   */
  updatePrompt(
    id: string,
    data: {
      name?: string;
      description?: string;
      runnerType?: 'llm_prompt' | 'http_endpoint';
      systemPrompt?: string;
      userPromptTemplate?: string;
      temperature?: number;
      maxTokens?: number;
      provider?: string;
      model?: string;
      endpointUrl?: string;
      endpointMethod?: string;
      endpointBodyTemplate?: string;
      recommendedGraders?: string[];
      graderWeights?: Record<string, number>;
      recommendedDatasets?: string[];
      graderRationale?: string;
      notes?: string;
    }
  ): LoadedPrompt {
    const existing = this.findOne(id);

    // Merge fields
    const name = data.name ?? existing.name;
    const description = data.description ?? existing.description;
    const runner = data.runnerType ?? existing.runnerType;
    const userTemplate = data.userPromptTemplate ?? existing.userPromptTemplate;
    const systemPrompt = data.systemPrompt ?? existing.systemPrompt ?? '';

    // Model config
    const temperature =
      data.temperature ?? (existing.modelConfig?.temperature as number | undefined);
    const maxTokens = data.maxTokens ?? (existing.modelConfig?.maxTokens as number | undefined);
    const provider = data.provider ?? (existing.modelConfig?.provider as string | undefined);
    const model = data.model ?? (existing.modelConfig?.model as string | undefined);

    // Endpoint fields
    const endpointUrl = data.endpointUrl ?? existing.endpointUrl;
    const endpointMethod = data.endpointMethod ?? existing.endpointMethod;
    const endpointBodyTemplate = data.endpointBodyTemplate ?? existing.endpointBodyTemplate;

    // Recommendations
    const recGraders = data.recommendedGraders ?? existing.recommendedGraders;
    const graderWeights = data.graderWeights ?? existing.graderWeights;
    const recDatasets = data.recommendedDatasets ?? existing.recommendedDatasets;
    const graderRationale = data.graderRationale ?? existing.graderRationale;
    const notes = data.notes ?? existing.notes;

    // Build frontmatter lines
    const lines: string[] = [];
    lines.push(`name: ${name}`);
    if (description) lines.push(`description: ${description}`);
    lines.push(`runner: ${runner}`);
    if (existing.parentId) lines.push(`parent_prompt: ${existing.parentId}`);
    if (existing.variantLabel) lines.push(`variant: ${existing.variantLabel}`);
    if (temperature !== undefined) lines.push(`temperature: ${temperature}`);
    if (maxTokens !== undefined) lines.push(`max_tokens: ${maxTokens}`);
    if (provider) lines.push(`provider: ${provider}`);
    if (model) lines.push(`model: ${model}`);
    if (userTemplate) lines.push(`user_template: "${userTemplate}"`);
    if (endpointUrl) lines.push(`endpoint_url: ${endpointUrl}`);
    if (endpointMethod) lines.push(`endpoint_method: ${endpointMethod}`);
    if (endpointBodyTemplate) lines.push(`endpoint_body_template: ${endpointBodyTemplate}`);

    // Serialize weighted grader list: "id:weight, id2:weight2"
    if (recGraders.length > 0) {
      const parts = recGraders.map((g) => {
        const w = graderWeights[g];
        return w != null && w !== 1 ? `${g}:${w}` : g;
      });
      lines.push(`recommended_graders: ${parts.join(', ')}`);
    }
    if (recDatasets.length > 0) {
      lines.push(`recommended_datasets: ${recDatasets.join(', ')}`);
    }
    if (graderRationale) lines.push(`grader_rationale: ${graderRationale}`);
    if (notes) lines.push(`notes: ${notes}`);

    // Assemble file content
    const content = `---\n${lines.join('\n')}\n---\n${systemPrompt}\n`;

    // Write to disk using stored file path
    const filePath = existing.filePath;
    fs.writeFileSync(filePath, content, 'utf-8');

    // Re-parse and store in memory (preserve filePath context)
    const updated = this.parseMarkdown(`${id}.md`, content, filePath);
    // Restore folder-derived fields if they were set
    if (existing.parentId && !updated.parentId) updated.parentId = existing.parentId;
    if (existing.variantLabel && !updated.variantLabel)
      updated.variantLabel = existing.variantLabel;
    this.prompts.set(id, updated);

    this.logger.log(`Updated prompt ${id} on disk`);
    return updated;
  }

  /**
   * Create a variant of an existing prompt. Clones the parent's system prompt
   * and config, sets parent_prompt/variant fields, writes a new .md file.
   */
  createVariant(
    parentId: string,
    data: {
      variantLabel: string;
      name?: string;
      description?: string;
      systemPrompt?: string;
    }
  ): LoadedPrompt {
    const parent = this.findOne(parentId);
    const label = this.normalizeVariantLabel(data.variantLabel);
    const newId = this.buildVariantId(parentId, label);

    if (this.prompts.has(newId)) {
      throw new ConflictException(`Prompt "${newId}" already exists`);
    }

    const name = data.name || `${parent.name} (${data.variantLabel})`;
    const description = data.description || parent.description;
    const systemPrompt = data.systemPrompt ?? parent.systemPrompt ?? '';

    // Build frontmatter
    const lines: string[] = [];
    lines.push(`name: ${name}`);
    if (description) lines.push(`description: ${description}`);
    lines.push(`runner: ${parent.runnerType}`);
    lines.push(`parent_prompt: ${parentId}`);
    lines.push(`variant: ${label}`);
    if (parent.userPromptTemplate) lines.push(`user_template: "${parent.userPromptTemplate}"`);

    // Copy model config
    if (parent.modelConfig?.temperature !== undefined)
      lines.push(`temperature: ${parent.modelConfig.temperature}`);
    if (parent.modelConfig?.maxTokens !== undefined)
      lines.push(`max_tokens: ${parent.modelConfig.maxTokens}`);
    if (parent.modelConfig?.provider) lines.push(`provider: ${parent.modelConfig.provider}`);
    if (parent.modelConfig?.model) lines.push(`model: ${parent.modelConfig.model}`);

    // Copy recommendations
    if (parent.recommendedGraders.length > 0) {
      const parts = parent.recommendedGraders.map((g) => {
        const w = parent.graderWeights[g];
        return w != null && w !== 1 ? `${g}:${w}` : g;
      });
      lines.push(`recommended_graders: ${parts.join(', ')}`);
    }
    if (parent.recommendedDatasets.length > 0) {
      lines.push(`recommended_datasets: ${parent.recommendedDatasets.join(', ')}`);
    }
    if (parent.graderRationale) lines.push(`grader_rationale: ${parent.graderRationale}`);

    const content = `---\n${lines.join('\n')}\n---\n${systemPrompt}\n`;

    // Write variant into parent's family folder if it exists, otherwise flat
    const parentDir = path.dirname(parent.filePath);
    const isInFamily = parentDir !== this.promptsDir;
    const filePath = isInFamily
      ? path.join(parentDir, `${label}.md`)
      : path.join(this.promptsDir, `${newId}.md`);
    fs.writeFileSync(filePath, content, 'utf-8');

    const created = this.parseMarkdown(`${newId}.md`, content, filePath);
    created.parentId = parentId;
    created.variantLabel = label;
    this.prompts.set(newId, created);

    this.logger.log(`Created variant "${newId}" of "${parentId}"`);
    return created;
  }

  /**
   * Delete a prompt's .md file from disk and remove from memory.
   */
  deletePrompt(id: string): { deleted: boolean } {
    const prompt = this.findOne(id); // throws if not found
    fs.unlinkSync(prompt.filePath);
    this.prompts.delete(id);
    this.logger.log(`Deleted prompt "${id}"`);
    return { deleted: true };
  }

  /**
   * Parse a markdown file with simple frontmatter into a LoadedPrompt.
   *
   * Format:
   * ---
   * key: value
   * key: value
   * ---
   * Body text (system prompt)
   *
   * @param filename - The .md filename (e.g. "base.md" or "concise.md")
   * @param content - Raw file content
   * @param resolvedFilePath - Absolute path to the file on disk
   * @param folderParentId - If in a family folder, the folder name (used as parent ID for base.md, or as parent reference for variants)
   * @param folderVariantLabel - If in a family folder and not base.md, the variant label derived from filename
   */
  private parseMarkdown(
    filename: string,
    content: string,
    resolvedFilePath: string,
    folderParentId?: string,
    folderVariantLabel?: string
  ): LoadedPrompt {
    // Derive ID from folder context or filename
    let id: string;
    if (folderParentId && !folderVariantLabel) {
      // base.md in a family folder → ID = folder name
      id = folderParentId;
    } else if (folderParentId && folderVariantLabel) {
      // variant file in a family folder → ID = folder-filename
      id = `${folderParentId}-${folderVariantLabel}`;
    } else {
      // Flat file (backwards compat) → ID = filename without .md
      id = filename.replace(/\.md$/, '');
    }

    // Split frontmatter from body
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!fmMatch) {
      throw new Error(`No frontmatter found in ${filename}`);
    }

    const frontmatterText = fmMatch[1];
    const body = fmMatch[2].trim();

    // Parse flat key: value pairs from frontmatter
    const fm: Record<string, string> = {};
    for (const line of frontmatterText.split('\n')) {
      const match = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
      if (match) {
        fm[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    }

    if (!fm.name) {
      throw new Error(`Missing "name" in frontmatter of ${filename}`);
    }
    if (!fm.runner) {
      throw new Error(`Missing "runner" in frontmatter of ${filename}`);
    }

    // Build model config from optional fields
    const modelConfig: Record<string, unknown> = {};
    if (fm.temperature !== undefined) modelConfig.temperature = parseFloat(fm.temperature);
    if (fm.max_tokens !== undefined) modelConfig.maxTokens = parseInt(fm.max_tokens, 10);
    if (fm.provider) modelConfig.provider = fm.provider;
    if (fm.model) modelConfig.model = fm.model;

    // Parse comma-separated recommendation lists
    const parseList = (val: string | undefined): string[] =>
      val
        ? val
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    // Parse weighted grader list: "grader-id:0.4, grader-id2:0.3" → ids + weights
    const parseWeightedList = (
      val: string | undefined
    ): { ids: string[]; weights: Record<string, number> } => {
      if (!val) return { ids: [], weights: {} };
      const ids: string[] = [];
      const weights: Record<string, number> = {};
      for (const item of val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)) {
        const colonIdx = item.lastIndexOf(':');
        if (colonIdx > 0) {
          const maybeWeight = parseFloat(item.slice(colonIdx + 1));
          if (!isNaN(maybeWeight)) {
            const id = item.slice(0, colonIdx);
            ids.push(id);
            weights[id] = maybeWeight;
            continue;
          }
        }
        ids.push(item);
        weights[item] = 1.0;
      }
      return { ids, weights };
    };

    const graderResult = parseWeightedList(fm.recommended_graders);

    return {
      id,
      name: fm.name,
      description: fm.description || null,
      runnerType: fm.runner as 'llm_prompt' | 'http_endpoint',
      systemPrompt: body || null,
      userPromptTemplate: fm.user_template || null,
      modelConfig: Object.keys(modelConfig).length > 0 ? modelConfig : null,
      endpointUrl: fm.endpoint_url || null,
      endpointMethod: fm.endpoint_method || null,
      endpointHeaders: null,
      endpointBodyTemplate: fm.endpoint_body_template || null,
      // Folder-derived parent/variant take precedence, frontmatter overrides
      parentId: fm.parent_prompt || (folderVariantLabel ? folderParentId! : null),
      variantLabel: fm.variant || folderVariantLabel || null,
      recommendedGraders: graderResult.ids,
      graderWeights: graderResult.weights,
      recommendedDatasets: parseList(fm.recommended_datasets),
      graderRationale: fm.grader_rationale || null,
      notes: fm.notes || null,
      source: 'file',
      filePath: resolvedFilePath,
    };
  }
}
