/**
 * Send message tool for Telegram Bot extension
 */

import { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import { TelegramBotService } from '../services/telegramBot';

/**
 * Tool for sending text messages via Telegram
 * 
 * @class SendMessageTool
 * @implements {ITool}
 */
export class SendMessageTool implements ITool {
  public readonly id = 'telegramSendMessage';
  public readonly name = 'telegramSendMessage';
  public readonly displayName = 'Send Telegram Message';
  public readonly description = 'Send a text message to a Telegram chat, channel, or user. Supports Markdown and HTML formatting.';
  
  public readonly inputSchema = {
    type: 'object',
    required: ['chatId', 'text'],
    properties: {
      chatId: {
        type: ['string', 'number'],
        description: 'Chat ID, username (@username), or channel (@channelname)'
      },
      text: {
        type: 'string',
        description: 'Message text to send (supports Markdown/HTML based on parseMode)'
      },
      parseMode: {
        type: 'string',
        enum: ['Markdown', 'HTML', 'MarkdownV2'],
        description: 'Text formatting mode'
      },
      disableNotification: {
        type: 'boolean',
        description: 'Send message silently',
        default: false
      },
      replyToMessageId: {
        type: 'number',
        description: 'ID of message to reply to'
      },
      buttons: {
        type: 'array',
        description: 'Inline keyboard buttons',
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              url: { type: 'string' },
              callbackData: { type: 'string' }
            }
          }
        }
      }
    }
  };
  
  public readonly outputSchema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      messageId: { type: 'number' },
      chatId: { type: ['string', 'number'] },
      date: { type: 'number' },
      error: { type: 'string' }
    }
  };
  
  public readonly requiredCapabilities = ['capability:network:telegram'];
  public readonly category = 'communications';
  public readonly version = '1.0.0';
  public readonly hasSideEffects = true;
  
  /**
   * Creates an instance of SendMessageTool
   * 
   * @param {TelegramBotService} botService - Telegram bot service
   */
  constructor(private botService: TelegramBotService) {}
  
  /**
   * Executes the send message operation
   * 
   * @param {any} args - Input arguments
   * @param {ToolExecutionContext} context - Execution context
   * @returns {Promise<ToolExecutionResult>} Execution result
   */
  async execute(
    args: any,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      // Prepare reply markup if buttons provided
      let replyMarkup;
      if (args.buttons && Array.isArray(args.buttons)) {
        replyMarkup = {
          inline_keyboard: args.buttons.map((row: any[]) =>
            row.map(btn => ({
              text: btn.text,
              url: btn.url,
              callback_data: btn.callbackData
            }))
          )
        };
      }
      
      const result = await this.botService.sendMessage({
        chatId: args.chatId,
        text: args.text,
        parseMode: args.parseMode,
        disableNotification: args.disableNotification,
        replyToMessageId: args.replyToMessageId,
        replyMarkup
      });
      
      return {
        success: result.success,
        output: result,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to send message: ${error.message}`
      };
    }
  }
  
  /**
   * Validates input arguments
   * 
   * @param {any} args - Arguments to validate
   * @returns {{isValid: boolean, errors?: string[]}} Validation result
   */
  validateArgs(args: any): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    
    if (!args.chatId) {
      errors.push('chatId is required');
    }
    
    if (!args.text) {
      errors.push('text is required');
    } else if (typeof args.text !== 'string') {
      errors.push('text must be a string');
    } else if (args.text.length > 4096) {
      errors.push('text must be 4096 characters or less');
    }
    
    if (args.parseMode && !['Markdown', 'HTML', 'MarkdownV2'].includes(args.parseMode)) {
      errors.push('parseMode must be Markdown, HTML, or MarkdownV2');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

