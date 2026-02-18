import { DatasetLoaderService } from './dataset-loader.service';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('DatasetLoaderService', () => {
  let service: DatasetLoaderService;
  let tmpDir: string;

  beforeEach(() => {
    service = new DatasetLoaderService();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dataset-test-'));
    // Use an isolated fixtures directory so tests don't depend on repo seed data.
    (service as any).datasetsDir = tmpDir;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads datasets from subdirectories (data.csv + meta.yaml + custom columns)', () => {
    const subDir = path.join(tmpDir, 'demo');
    fs.mkdirSync(subDir);
    fs.writeFileSync(
      path.join(subDir, 'data.csv'),
      [
        'input,expected_output,context,metadata,difficulty',
        '"q1","a1","ctx","{""k"":1}","hard"',
      ].join('\n') + '\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(subDir, 'meta.yaml'),
      'name: Demo Dataset\ndescription: For tests\n',
      'utf-8'
    );

    const result = service.loadAll();
    expect(result.loaded).toBe(1);

    const dataset = service.findOne('demo');
    expect(dataset.name).toBe('Demo Dataset');
    expect(dataset.description).toBe('For tests');
    expect(dataset.source).toBe('file');
    expect(dataset.filePath).toBe('datasets/demo/data.csv');
    expect(dataset.metaPath).toBe('datasets/demo/meta.yaml');
    expect(dataset.testCaseCount).toBe(1);

    const tc = dataset.testCases[0];
    expect(tc.id).toBe('demo-0');
    expect(tc.datasetId).toBe('demo');
    expect(tc.input).toBe('q1');
    expect(tc.expectedOutput).toBe('a1');
    expect(tc.context).toBe('ctx');
    expect(tc.metadata).toEqual({ k: 1 });
    expect(tc.customFields).toEqual({ difficulty: 'hard' });
  });

  it('skips subdirectories without data.csv', () => {
    const subDir = path.join(tmpDir, 'empty-dir');
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(subDir, 'meta.yaml'), 'name: No CSV\n', 'utf-8');

    const result = service.loadAll();
    expect(result.loaded).toBe(0);
  });

  it('throws NotFoundException for unknown ID', () => {
    service.loadAll();
    expect(() => service.findOne('nonexistent')).toThrow();
  });

  it('imports a dataset into a subfolder', () => {
    const csv = 'input,expected_output\n"q1","a1"\n';
    const dataset = service.importCsv('my-import', csv, {
      name: 'Imported',
      description: 'From upload',
    });

    expect(dataset.id).toBe('my-import');
    expect(dataset.name).toBe('Imported');
    expect(dataset.filePath).toBe('datasets/my-import/data.csv');
    expect(dataset.metaPath).toBe('datasets/my-import/meta.yaml');

    // Verify files on disk
    expect(fs.existsSync(path.join(tmpDir, 'my-import', 'data.csv'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'my-import', 'meta.yaml'))).toBe(true);
  });

  it('updates a dataset in its subfolder', () => {
    // Setup initial dataset
    const subDir = path.join(tmpDir, 'updatable');
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(subDir, 'data.csv'), 'input,expected_output\n"q1","a1"\n', 'utf-8');
    fs.writeFileSync(
      path.join(subDir, 'meta.yaml'),
      'name: Original\ndescription: Before update\n',
      'utf-8'
    );
    service.loadAll();

    // Update name and test cases
    const updated = service.updateDataset('updatable', {
      name: 'Updated',
      testCases: [{ input: 'new-q', expectedOutput: 'new-a' }],
    });

    expect(updated.name).toBe('Updated');
    expect(updated.testCaseCount).toBe(1);
    expect(updated.testCases[0].input).toBe('new-q');
    expect(updated.filePath).toBe('datasets/updatable/data.csv');
  });

  describe('CSV parsing', () => {
    it('handles quoted fields with commas', () => {
      const csv = 'input,expected_output,context,metadata\n"Hello, world","output","ctx",""';
      const result = service.parseCsv('test', csv);
      expect(result[0].input).toBe('Hello, world');
    });

    it('handles escaped double quotes', () => {
      const csv = 'input,expected_output,context,metadata\n"She said ""hello""","out","",""';
      const result = service.parseCsv('test', csv);
      expect(result[0].input).toBe('She said "hello"');
    });

    it('handles newlines within quoted fields', () => {
      const csv = 'input,expected_output,context,metadata\n"Line 1\nLine 2","out","",""';
      const result = service.parseCsv('test', csv);
      expect(result[0].input).toBe('Line 1\nLine 2');
    });

    it('skips empty rows', () => {
      const csv = 'input,expected_output,context,metadata\n"q1","a1","",""\n\n"q2","a2","",""';
      const result = service.parseCsv('test', csv);
      expect(result).toHaveLength(2);
    });

    it('generates deterministic IDs', () => {
      const csv = 'input,expected_output,context,metadata\n"q1","a1","",""\n"q2","a2","",""';
      const result = service.parseCsv('my-ds', csv);
      expect(result[0].id).toBe('my-ds-0');
      expect(result[1].id).toBe('my-ds-1');
    });

    it('parses metadata JSON', () => {
      const csv =
        'input,expected_output,context,metadata\n"q1","a1","","{""difficulty"":""hard""}"';
      const result = service.parseCsv('test', csv);
      expect(result[0].metadata).toEqual({ difficulty: 'hard' });
    });

    it('ignores invalid metadata JSON', () => {
      const csv = 'input,expected_output,context,metadata\n"q1","a1","","not json"';
      const result = service.parseCsv('test', csv);
      expect(result[0].metadata).toBeNull();
    });

    it('parses custom columns into customFields', () => {
      const csv = 'input,expected_output,difficulty,topic\n"q1","a1","hard","math"';
      const result = service.parseCsv('test', csv);
      expect(result[0].customFields).toEqual({
        difficulty: 'hard',
        topic: 'math',
      });
    });

    it('throws if input column is missing', () => {
      const csv = 'question,answer\n"q1","a1"';
      expect(() => service.parseCsv('test', csv)).toThrow('missing required "input" column');
    });
  });
});
