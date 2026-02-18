/**
 * @file Example tool implementation
 * @description Demonstrates how to implement the ITool interface
 */

import type { 
  ITool, 
  ToolExecutionContext, 
  ToolExecutionResult,
  JSONSchemaObject 
} from '@framers/agentos';
import type { ExampleToolInput, ExampleToolOutput } from '../types';

export class ExampleTool implements ITool<ExampleToolInput, ExampleToolOutput> {
  readonly id = 'com.framers.ext.template.exampleTool';
  readonly name = 'exampleTool';
  readonly displayName = 'Example Tool';
  readonly description = 'An example tool that demonstrates the AgentOS tool pattern';
  readonly version = '1.0.0';
  
  private config: Record<string, any>;
  
  constructor(config: Record<string, any> = {}) {
    this.config = config;
  }

  public setApiKey(apiKey?: string): void {
    if (apiKey) {
      this.config.apiKey = apiKey;
    }
  }
  
  /**
   * Input schema for validation
   */
  readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'A message to process'
      },
      options: {
        type: 'object',
        properties: {
          uppercase: {
            type: 'boolean',
            description: 'Convert message to uppercase',
            default: false
          },
          repeat: {
            type: 'integer',
            description: 'Number of times to repeat the message',
            minimum: 1,
            maximum: 10,
            default: 1
          }
        }
      }
    },
    required: ['message']
  };
  
  /**
   * Output schema for validation
   */
  readonly outputSchema: JSONSchemaObject = {
    type: 'object',
    properties: {
      result: {
        type: 'string',
        description: 'The processed message'
      },
      metadata: {
        type: 'object',
        properties: {
          originalLength: { type: 'integer' },
          processedLength: { type: 'integer' },
          processingTime: { type: 'number' }
        }
      }
    }
  };
  
  /**
   * Required permissions and capabilities
   */
  readonly permissions = {
    requiredScopes: [],
    requiredCapabilities: []
  };
  
  /**
   * Execute the tool
   */
  async execute(
    input: ExampleToolInput,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult<ExampleToolOutput>> {
    const startTime = Date.now();
    
    try {
      // Validate configuration
      if (this.config.requiresApiKey && !this.config.apiKey) {
        return {
          success: false,
          error: 'API key is required but not configured',
          details: {
            code: 'MISSING_API_KEY',
            help: 'Set the API key in extension configuration or environment variables'
          }
        };
      }
      
      // Process the input
      let result = input.message;
      
      // Apply options
      if (input.options?.uppercase) {
        result = result.toUpperCase();
      }
      
      if (input.options?.repeat && input.options.repeat > 1) {
        result = Array(input.options.repeat).fill(result).join(' ');
      }
      
      // Simulate async operation
      await this.simulateApiCall();
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        output: {
          result,
          metadata: {
            originalLength: input.message.length,
            processedLength: result.length,
            processingTime
          }
        },
        contentType: 'application/json'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: {
          timestamp: new Date().toISOString(),
          input,
          stack: error instanceof Error ? error.stack : undefined
        }
      };
    }
  }
  
  /**
   * Simulate an API call for demonstration
   */
  private async simulateApiCall(): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Could make actual API calls here:
    // const response = await fetch(this.config.endpoint, {
    //   headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
    // });
  }
}
