/**
 * Theme Builder Tests
 */

import { describe, it, expect } from 'vitest';
import { ThemeBuilder, DEFAULT_THEMES } from '../src/themes/ThemeBuilder';

describe('ThemeBuilder', () => {
  describe('constructor', () => {
    it('should create with default light theme', () => {
      const builder = new ThemeBuilder();
      const theme = builder.setId('test').setName('Test').build();
      expect(theme.manifest.category).toBe('light');
    });

    it('should create from category', () => {
      const builder = new ThemeBuilder('dark');
      const theme = builder.setId('test').setName('Test').build();
      expect(theme.colors.bgPrimary).toBe(DEFAULT_THEMES.dark.colors.bgPrimary);
    });

    it('should create from existing theme', () => {
      const existingTheme = new ThemeBuilder('terminal')
        .setId('existing')
        .setName('Existing')
        .build();
      
      const builder = new ThemeBuilder(existingTheme);
      const theme = builder.setId('clone').setName('Clone').build();
      
      expect(theme.colors.textPrimary).toBe(existingTheme.colors.textPrimary);
    });
  });

  describe('setters', () => {
    it('should set manifest properties', () => {
      const theme = new ThemeBuilder()
        .setId('com.test.theme')
        .setName('Test Theme')
        .setDescription('A test theme')
        .setAuthor({ name: 'Tester', email: 'test@test.com' })
        .setCategory('dark')
        .build();

      expect(theme.manifest.id).toBe('com.test.theme');
      expect(theme.manifest.name).toBe('Test Theme');
      expect(theme.manifest.description).toBe('A test theme');
      expect(theme.manifest.author.name).toBe('Tester');
      expect(theme.manifest.category).toBe('dark');
    });

    it('should set colors', () => {
      const theme = new ThemeBuilder()
        .setId('test')
        .setName('Test')
        .setColors({
          bgPrimary: '#ff0000',
          accent: '#00ff00',
        })
        .build();

      expect(theme.colors.bgPrimary).toBe('#ff0000');
      expect(theme.colors.accent).toBe('#00ff00');
    });

    it('should set individual color methods', () => {
      const theme = new ThemeBuilder()
        .setId('test')
        .setName('Test')
        .setBgPrimary('#123456')
        .setAccent('#abcdef')
        .setTextColors('#ffffff', '#cccccc', '#888888')
        .build();

      expect(theme.colors.bgPrimary).toBe('#123456');
      expect(theme.colors.accent).toBe('#abcdef');
      expect(theme.colors.textPrimary).toBe('#ffffff');
      expect(theme.colors.textSecondary).toBe('#cccccc');
      expect(theme.colors.textMuted).toBe('#888888');
    });

    it('should set typography', () => {
      const theme = new ThemeBuilder()
        .setId('test')
        .setName('Test')
        .setTypography({
          fontFamily: {
            sans: '"Custom Font", sans-serif',
          },
        })
        .build();

      expect(theme.typography.fontFamily.sans).toBe('"Custom Font", sans-serif');
    });

    it('should set font family', () => {
      const theme = new ThemeBuilder()
        .setId('test')
        .setName('Test')
        .setFontFamily('mono', '"Hack", monospace')
        .build();

      expect(theme.typography.fontFamily.mono).toBe('"Hack", monospace');
    });

    it('should set custom CSS', () => {
      const css = '.custom { color: red; }';
      const theme = new ThemeBuilder()
        .setId('test')
        .setName('Test')
        .setCss(css)
        .build();

      expect(theme.css).toBe(css);
    });

    it('should set variables', () => {
      const theme = new ThemeBuilder()
        .setId('test')
        .setName('Test')
        .setVariables({
          '--custom-var': '10px',
          'another-var': '20px',
        })
        .build();

      expect(theme.variables?.['--custom-var']).toBe('10px');
      expect(theme.variables?.['another-var']).toBe('20px');
    });
  });

  describe('build', () => {
    it('should throw if ID is missing', () => {
      expect(() => new ThemeBuilder().setName('Test').build()).toThrow('Theme ID is required');
    });

    it('should throw if name is missing', () => {
      expect(() => new ThemeBuilder().setId('test').build()).toThrow('Theme name is required');
    });

    it('should set default version', () => {
      const theme = new ThemeBuilder()
        .setId('test')
        .setName('Test')
        .build();

      expect(theme.manifest.version).toBe('1.0.0');
    });
  });

  describe('export', () => {
    it('should export to JSON', () => {
      const json = new ThemeBuilder()
        .setId('test')
        .setName('Test')
        .toJSON();

      const parsed = JSON.parse(json);
      expect(parsed.manifest.id).toBe('test');
      expect(parsed.colors).toBeDefined();
    });

    it('should export to CSS', () => {
      const css = new ThemeBuilder()
        .setId('test')
        .setName('Test')
        .setAccent('#ff0000')
        .toCSS();

      expect(css).toContain(':root');
      expect(css).toContain('--codex-accent: #ff0000');
    });
  });

  describe('fromJSON', () => {
    it('should create from JSON', () => {
      const original = new ThemeBuilder()
        .setId('test')
        .setName('Test')
        .setAccent('#ff0000')
        .build();

      const json = JSON.stringify(original);
      const restored = ThemeBuilder.fromJSON(json).build();

      expect(restored.manifest.id).toBe('test');
      expect(restored.colors.accent).toBe('#ff0000');
    });
  });
});

describe('DEFAULT_THEMES', () => {
  it('should have light theme', () => {
    expect(DEFAULT_THEMES.light).toBeDefined();
    expect(DEFAULT_THEMES.light.colors.bgPrimary).toBeDefined();
  });

  it('should have dark theme', () => {
    expect(DEFAULT_THEMES.dark).toBeDefined();
    expect(DEFAULT_THEMES.dark.colors.bgPrimary).toBeDefined();
  });

  it('should have terminal theme', () => {
    expect(DEFAULT_THEMES.terminal).toBeDefined();
    expect(DEFAULT_THEMES.terminal.colors.textPrimary).toBe('#00ff41');
  });

  it('should have sepia theme', () => {
    expect(DEFAULT_THEMES.sepia).toBeDefined();
  });
});

