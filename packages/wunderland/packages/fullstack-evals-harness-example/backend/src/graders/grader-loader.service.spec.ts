import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GraderLoaderService } from './grader-loader.service';

describe('GraderLoaderService', () => {
  let service: GraderLoaderService;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grader-test-'));
    // Create a test grader YAML file
    fs.writeFileSync(
      path.join(tmpDir, 'test-grader.yaml'),
      `name: Test Grader\ndescription: A test\ntype: exact-match\n`
    );

    // Override the graders directory
    service = new GraderLoaderService();
    (service as any).gradersDir = tmpDir;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should load graders from YAML files', () => {
    const { loaded } = service.loadAll();
    expect(loaded).toBe(1);
    const graders = service.findAll();
    expect(graders).toHaveLength(1);
    expect(graders[0].id).toBe('test-grader');
    expect(graders[0].name).toBe('Test Grader');
    expect(graders[0].type).toBe('exact-match');
  });

  it('should find a grader by id', () => {
    service.loadAll();
    const grader = service.findOne('test-grader');
    expect(grader.name).toBe('Test Grader');
  });

  it('should throw NotFoundException for unknown id', () => {
    service.loadAll();
    expect(() => service.findOne('nonexistent')).toThrow();
  });

  it('should create a new grader on disk', () => {
    service.loadAll();
    const grader = service.createGrader('new-grader', {
      name: 'New Grader',
      type: 'contains',
      config: { requiredStrings: ['hello'] },
    });
    expect(grader.id).toBe('new-grader');
    expect(fs.existsSync(path.join(tmpDir, 'new-grader.yaml'))).toBe(true);
    expect(service.findAll()).toHaveLength(2);
  });

  it('should update a grader on disk', () => {
    service.loadAll();
    const updated = service.updateGrader('test-grader', {
      name: 'Updated Name',
      description: 'Updated description',
    });
    expect(updated.name).toBe('Updated Name');
    expect(updated.description).toBe('Updated description');

    // Verify file was updated
    const content = fs.readFileSync(path.join(tmpDir, 'test-grader.yaml'), 'utf-8');
    expect(content).toContain('Updated Name');
  });

  it('should delete a grader from disk', () => {
    service.loadAll();
    service.deleteGrader('test-grader');
    expect(service.findAll()).toHaveLength(0);
    expect(fs.existsSync(path.join(tmpDir, 'test-grader.yaml'))).toBe(false);
  });

  it('should return raw YAML content', () => {
    service.loadAll();
    const yaml = service.getRawYaml('test-grader');
    expect(yaml).toContain('Test Grader');
    expect(yaml).toContain('exact-match');
  });

  it('should throw when getting raw YAML for nonexistent grader', () => {
    service.loadAll();
    expect(() => service.getRawYaml('nonexistent')).toThrow();
  });

  it('should handle empty directory gracefully', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));
    (service as any).gradersDir = emptyDir;
    const { loaded } = service.loadAll();
    expect(loaded).toBe(0);
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('should skip invalid YAML files', () => {
    fs.writeFileSync(path.join(tmpDir, 'bad.yaml'), 'invalid: yaml\nno name');
    const { loaded } = service.loadAll();
    // bad.yaml should fail (no name field), test-grader.yaml should succeed
    expect(loaded).toBe(1);
  });
});
