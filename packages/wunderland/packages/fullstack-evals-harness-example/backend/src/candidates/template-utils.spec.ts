import { renderTemplate, extractVariables } from './template-utils';

describe('renderTemplate', () => {
  it('replaces simple variables', () => {
    expect(renderTemplate('Hello {{name}}', { name: 'World' })).toBe('Hello World');
  });

  it('replaces multiple variables', () => {
    const result = renderTemplate('{{input}} and {{context}}', {
      input: 'question',
      context: 'background',
    });
    expect(result).toBe('question and background');
  });

  it('preserves unresolved variables', () => {
    expect(renderTemplate('{{input}} {{missing}}', { input: 'hi' })).toBe('hi {{missing}}');
  });

  it('handles dot notation for nested values', () => {
    const result = renderTemplate('{{metadata.field}}', {
      'metadata.field': 'nested', // flat key with dot
    } as any);
    expect(result).toBe('{{metadata.field}}');
    // Since the implementation walks object paths, a flat key won't match
    // but a nested object will:
    const result2 = renderTemplate('{{metadata.field}}', {
      metadata: { field: 'value' },
    } as any);
    expect(result2).toBe('value');
  });

  it('returns original template when no variables match', () => {
    expect(renderTemplate('no variables here', {})).toBe('no variables here');
  });

  it('handles empty template', () => {
    expect(renderTemplate('', { input: 'test' })).toBe('');
  });
});

describe('extractVariables', () => {
  it('extracts simple variables', () => {
    expect(extractVariables('{{input}}')).toEqual(['input']);
  });

  it('extracts multiple variables', () => {
    const vars = extractVariables('{{input}} and {{context}}');
    expect(vars).toContain('input');
    expect(vars).toContain('context');
    expect(vars).toHaveLength(2);
  });

  it('deduplicates variables', () => {
    expect(extractVariables('{{input}} {{input}}')).toEqual(['input']);
  });

  it('handles dot notation', () => {
    expect(extractVariables('{{metadata.field}}')).toEqual(['metadata.field']);
  });

  it('combines from multiple templates', () => {
    const vars = extractVariables('{{input}}', '{{context}}');
    expect(vars).toContain('input');
    expect(vars).toContain('context');
  });

  it('returns empty for no variables', () => {
    expect(extractVariables('no vars')).toEqual([]);
  });

  it('skips undefined templates', () => {
    expect(extractVariables('{{input}}', undefined)).toEqual(['input']);
  });
});
