/**
 * @file Unit tests for ExampleTool
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExampleTool } from '../../src/tools/exampleTool';
import type { ToolExecutionContext } from '@framers/agentos';

describe('ExampleTool', () => {
  let tool: ExampleTool;
  let context: ToolExecutionContext;
  
  beforeEach(() => {
    tool = new ExampleTool({ debug: true });
    context = {
      configuration: {},
      userContext: {
        userId: 'test-user',
        subscriptionTier: 'free'
      }
    } as ToolExecutionContext;
  });
  
  describe('metadata', () => {
    it('has correct tool metadata', () => {
      expect(tool.id).toBe('com.framers.ext.template.exampleTool');
      expect(tool.name).toBe('exampleTool');
      expect(tool.displayName).toBe('Example Tool');
      expect(tool.version).toBe('1.0.0');
    });
    
    it('defines input schema correctly', () => {
      expect(tool.inputSchema).toMatchObject({
        type: 'object',
        required: ['message']
      });
    });
    
    it('defines output schema correctly', () => {
      expect(tool.outputSchema).toMatchObject({
        type: 'object',
        properties: {
          result: { type: 'string' }
        }
      });
    });
  });
  
  describe('execute', () => {
    it('processes basic message', async () => {
      const result = await tool.execute(
        { message: 'Hello World' },
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.output?.result).toBe('Hello World');
      expect(result.output?.metadata.originalLength).toBe(11);
    });
    
    it('applies uppercase option', async () => {
      const result = await tool.execute(
        { 
          message: 'hello',
          options: { uppercase: true }
        },
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.output?.result).toBe('HELLO');
    });
    
    it('applies repeat option', async () => {
      const result = await tool.execute(
        { 
          message: 'hi',
          options: { repeat: 3 }
        },
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.output?.result).toBe('hi hi hi');
    });
    
    it('handles missing API key when required', async () => {
      const toolWithKey = new ExampleTool({ requiresApiKey: true });
      const result = await toolWithKey.execute(
        { message: 'test' },
        context
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('API key');
      expect(result.details?.code).toBe('MISSING_API_KEY');
    });
    
    it('includes processing time in metadata', async () => {
      const result = await tool.execute(
        { message: 'test' },
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.output?.metadata.processingTime).toBeGreaterThan(0);
    });
  });
  
  describe('error handling', () => {
    it('handles execution errors gracefully', async () => {
      // Force an error by passing invalid options
      const result = await tool.execute(
        { 
          message: 'test',
          options: { repeat: -1 } as any
        },
        context
      );
      
      // Tool should handle this gracefully
      expect(result.success).toBeDefined();
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.details).toBeDefined();
      }
    });
  });
});
