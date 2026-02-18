import { PromptLoaderService } from './prompt-loader.service';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

function writePromptFile(dir: string, id: string, frontmatterLines: string[], body: string) {
  const content = `---\n${frontmatterLines.join('\n')}\n---\n${body}\n`;
  fs.writeFileSync(path.join(dir, `${id}.md`), content, 'utf-8');
}

function writeFamilyPrompt(
  baseDir: string,
  family: string,
  filename: string,
  frontmatterLines: string[],
  body: string
) {
  const familyDir = path.join(baseDir, family);
  fs.mkdirSync(familyDir, { recursive: true });
  const content = `---\n${frontmatterLines.join('\n')}\n---\n${body}\n`;
  fs.writeFileSync(path.join(familyDir, filename), content, 'utf-8');
}

describe('PromptLoaderService', () => {
  let service: PromptLoaderService;
  let tmpDir: string;

  beforeEach(() => {
    service = new PromptLoaderService();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-test-'));
    // Use an isolated fixtures directory so tests don't depend on repo seed data.
    (service as any).promptsDir = tmpDir;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads flat prompts (backwards compat), parses variants and grader weights', () => {
    const parentId = 'test-parent';
    const variantId = 'test-parent-formal';

    writePromptFile(
      tmpDir,
      parentId,
      [
        'name: Test Parent',
        'runner: llm_prompt',
        'user_template: "{{input}}"',
        'recommended_graders: g1:0.4, g2:0.6',
        'recommended_datasets: ds1, ds2',
        'grader_rationale: Because.',
      ],
      'You are the parent.'
    );

    writePromptFile(
      tmpDir,
      variantId,
      [
        'name: Test Variant',
        'runner: llm_prompt',
        `parent_prompt: ${parentId}`,
        'variant: formal',
        'user_template: "{{input}}"',
        'recommended_graders: g1:0.5, g2:0.5',
      ],
      'You are the formal variant.'
    );

    const result = service.loadAll();
    expect(result.loaded).toBe(2);

    const parent = service.findOne(parentId);
    expect(parent.parentId).toBeNull();
    expect(parent.variantLabel).toBeNull();
    expect(parent.recommendedGraders).toEqual(['g1', 'g2']);
    expect(parent.graderWeights['g1']).toBe(0.4);
    expect(parent.graderWeights['g2']).toBe(0.6);
    expect(parent.filePath).toBe(path.join(tmpDir, `${parentId}.md`));

    const variant = service.findOne(variantId);
    expect(variant.parentId).toBe(parentId);
    expect(variant.variantLabel).toBe('formal');
    expect(variant.recommendedGraders).toEqual(['g1', 'g2']);
    expect(variant.graderWeights['g1']).toBe(0.5);
    expect(variant.graderWeights['g2']).toBe(0.5);
    expect(variant.filePath).toBe(path.join(tmpDir, `${variantId}.md`));
  });

  it('loads folder-per-family structure with auto-derived IDs', () => {
    writeFamilyPrompt(
      tmpDir,
      'summarizer',
      'base.md',
      [
        'name: Text Summarizer',
        'runner: llm_prompt',
        'user_template: "{{input}}"',
        'recommended_graders: faithfulness:0.4, similarity:0.3',
      ],
      'You are a summarizer.'
    );

    writeFamilyPrompt(
      tmpDir,
      'summarizer',
      'concise.md',
      ['name: Concise Summarizer', 'runner: llm_prompt', 'user_template: "{{input}}"'],
      'Be concise.'
    );

    writeFamilyPrompt(
      tmpDir,
      'summarizer',
      'bullets.md',
      ['name: Bullet Summarizer', 'runner: llm_prompt'],
      'Use bullets.'
    );

    const result = service.loadAll();
    expect(result.loaded).toBe(3);

    // Parent: base.md → ID = folder name
    const parent = service.findOne('summarizer');
    expect(parent.id).toBe('summarizer');
    expect(parent.name).toBe('Text Summarizer');
    expect(parent.parentId).toBeNull();
    expect(parent.variantLabel).toBeNull();
    expect(parent.recommendedGraders).toEqual(['faithfulness', 'similarity']);
    expect(parent.filePath).toBe(path.join(tmpDir, 'summarizer', 'base.md'));

    // Variant: concise.md → ID = summarizer-concise
    const concise = service.findOne('summarizer-concise');
    expect(concise.id).toBe('summarizer-concise');
    expect(concise.parentId).toBe('summarizer');
    expect(concise.variantLabel).toBe('concise');
    expect(concise.filePath).toBe(path.join(tmpDir, 'summarizer', 'concise.md'));

    // Variant: bullets.md → ID = summarizer-bullets
    const bullets = service.findOne('summarizer-bullets');
    expect(bullets.id).toBe('summarizer-bullets');
    expect(bullets.parentId).toBe('summarizer');
    expect(bullets.variantLabel).toBe('bullets');
  });

  it('createVariant writes into family folder when parent is in a folder', () => {
    writeFamilyPrompt(
      tmpDir,
      'test-family',
      'base.md',
      ['name: Test Family Parent', 'runner: llm_prompt', 'user_template: "{{input}}"'],
      'You are the parent.'
    );

    service.loadAll();

    const created = service.createVariant('test-family', {
      variantLabel: 'My Variant',
      systemPrompt: 'You are the variant.',
    });

    expect(created.id).toBe('test-family-my-variant');
    expect(created.parentId).toBe('test-family');
    expect(created.variantLabel).toBe('my-variant');
    // Should be written into the family folder, not flat
    expect(created.filePath).toBe(path.join(tmpDir, 'test-family', 'my-variant.md'));
    expect(fs.existsSync(created.filePath)).toBe(true);

    // Reload to prove the file is valid and lineage fields persist
    service.loadAll();
    const reloaded = service.findOne(created.id);
    expect(reloaded.parentId).toBe('test-family');
    expect(reloaded.variantLabel).toBe('my-variant');
  });

  it('createVariant writes flat file when parent is a flat file', () => {
    const parentId = 'test-parent';

    writePromptFile(
      tmpDir,
      parentId,
      [
        'name: Test Parent',
        'runner: llm_prompt',
        'user_template: "{{input}}"',
        'recommended_graders: g1:0.4, g2:0.6',
      ],
      'You are the parent.'
    );

    service.loadAll();

    const created = service.createVariant(parentId, {
      variantLabel: 'My Variant',
      systemPrompt: 'You are the variant.',
    });

    expect(created.id).toBe('test-parent-my-variant');
    expect(created.parentId).toBe(parentId);
    expect(created.variantLabel).toBe('my-variant');
    expect(fs.existsSync(path.join(tmpDir, `${created.id}.md`))).toBe(true);

    // Reload to prove the file is valid and lineage fields persist.
    service.loadAll();
    const reloaded = service.findOne(created.id);
    expect(reloaded.parentId).toBe(parentId);
    expect(reloaded.variantLabel).toBe('my-variant');
  });

  it('throws NotFoundException for unknown ID', () => {
    service.loadAll();
    expect(() => service.findOne('nonexistent')).toThrow();
  });
});
