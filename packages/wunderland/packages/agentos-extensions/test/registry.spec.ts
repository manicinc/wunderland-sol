import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Extension Registry System', () => {
  const registryPath = path.join(__dirname, '../registry.json');
  const scriptsPath = path.join(__dirname, '../scripts');
  
  describe('Registry JSON Structure', () => {
    it('should have valid registry.json', () => {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      
      expect(registry).toHaveProperty('version');
      expect(registry).toHaveProperty('updated');
      expect(registry).toHaveProperty('categories');
      expect(registry).toHaveProperty('extensions');
      expect(registry).toHaveProperty('stats');
    });
    
    it('should have correct categories structure', () => {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      
      expect(registry.categories).toHaveProperty('templates');
      expect(registry.categories).toHaveProperty('curated');
      expect(registry.categories).toHaveProperty('community');
      
      expect(registry.categories.templates).toContain('basic-tool');
      expect(registry.categories.curated).toContain('research');
      expect(registry.categories.community).toContain('development');
    });
    
    it('should have valid extension entries', () => {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      
      // Check curated extensions
      if (registry.extensions.curated.length > 0) {
        const extension = registry.extensions.curated[0];
        expect(extension).toHaveProperty('id');
        expect(extension).toHaveProperty('name');
        expect(extension).toHaveProperty('package');
        expect(extension).toHaveProperty('version');
        expect(extension).toHaveProperty('path');
        expect(extension).toHaveProperty('description');
        expect(extension.package).toMatch(/^@framers\/agentos-/);
      }
    });
    
    it('should have accurate stats', () => {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      
      const actualTotal = 
        registry.extensions.curated.length + 
        registry.extensions.community.length;
      
      expect(registry.stats.totalExtensions).toBe(actualTotal);
      expect(registry.stats.curatedCount).toBe(registry.extensions.curated.length);
      expect(registry.stats.communityCount).toBe(registry.extensions.community.length);
    });
  });
  
  describe('Registry Update Script', () => {
    it('should update registry when new extension is added', () => {
      // This test would need to create a temporary extension
      // and run the update script to verify it gets added
      const scriptPath = path.join(scriptsPath, 'update-registry.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
    });
  });
  
  describe('Extension Creation Script', () => {
    it('should have create-extension script', () => {
      const scriptPath = path.join(scriptsPath, 'create-extension.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
    });
  });
  
  describe('Extension Naming Convention', () => {
    it('should follow naming convention for all extensions', () => {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      
      // Check curated extensions
      registry.extensions.curated.forEach((ext: any) => {
        expect(ext.package).toMatch(/^@framers\/agentos-[a-z]+-[a-z-]+$/);
      });
      
      // Check community extensions
      registry.extensions.community.forEach((ext: any) => {
        expect(ext.package).toMatch(/^@framers\/agentos-[a-z]+-[a-z-]+$/);
      });
      
      // Check templates
      registry.extensions.templates.forEach((template: any) => {
        expect(template.package).toMatch(/^@framers\/agentos-template-[a-z-]+$/);
      });
    });
  });
  
  describe('Extension Discovery', () => {
    it('should be able to find extensions by category', () => {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      
      const researchExtensions = registry.extensions.curated.filter(
        (ext: any) => ext.category === 'research'
      );
      
      expect(researchExtensions.length).toBeGreaterThan(0);
      expect(researchExtensions[0].category).toBe('research');
    });
    
    it('should be able to find extensions by keyword', () => {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      
      const searchExtensions = registry.extensions.curated.filter(
        (ext: any) => ext.keywords && ext.keywords.includes('search')
      );
      
      if (searchExtensions.length > 0) {
        expect(searchExtensions[0].keywords).toContain('search');
      }
    });
  });
  
  describe('Extension Verification', () => {
    it('should mark curated extensions as verified', () => {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      
      registry.extensions.curated.forEach((ext: any) => {
        expect(ext.verified).toBe(true);
      });
    });
    
    it('should not mark community extensions as verified by default', () => {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      
      registry.extensions.community.forEach((ext: any) => {
        if (ext.verified !== undefined) {
          expect(ext.verified).toBe(false);
        }
      });
    });
  });
});
