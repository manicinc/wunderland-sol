/**
 * @file Type definitions for the template extension
 */

/**
 * Input type for the example tool
 */
export interface ExampleToolInput {
  message: string;
  options?: {
    uppercase?: boolean;
    repeat?: number;
  };
}

/**
 * Output type for the example tool
 */
export interface ExampleToolOutput {
  result: string;
  metadata: {
    originalLength: number;
    processedLength: number;
    processingTime: number;
  };
}

/**
 * Configuration options for the extension
 */
export interface ExtensionConfig {
  apiKey?: string;
  endpoint?: string;
  requiresApiKey?: boolean;
  debug?: boolean;
}
