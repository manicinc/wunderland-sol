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
  public readonly description = 'Send a text message to a Telegram chat or user. Supports Markdown and HTML formatting, reply to messages, and custom keyboards.';
  public readonly category = 'communication';
  public readonly version = '1.0.0';
  public readonly hasSideEffects = true;
  
  public readonly inputSchema = {
    type: 'object',
    required: ['chatId', 'text'],
    properties: {
      chatId: {
        type: ['string', 'number'],
        description: 'Unique identifier for the target chat or username of the target channel'
      },
      text: {
        type: 'string',
        description: 'Text of the message to be sent, 1-4096 characters'
      },
      parseMode: {
        type: 'string',
        enum: ['Markdown', 'HTML'],
        description: 'Mode for parsing entities in the message text'
      },
      replyToMessageId: {
        type: 'number',
        description: 'If the message is a reply, ID of the original message'
      },
      disableNotification: {
        type: 'boolean',
        description: 'Sends the message silently'
      },
      replyMarkup: {
        type: 'object',
        description: 'Additional interface options (inline keyboard, custom reply keyboard, etc.)'
      }
    }
  };
  
  public readonly outputSchema = {
    type: 'object',
    properties: {
      messageId: {
        type: 'number',
        description: 'Unique message identifier'
      },
      chatId: {
        type: ['string', 'number'],
        description: 'Chat where the message was sent'
      },
      date: {
        type: 'number',
        description: 'Date the message was sent in Unix time'
      },
      text: {
        type: 'string',
        description: 'The actual text of the message'
      }
    }
  };
  
  /**
   * Creates an instance of SendMessageTool
   * @param {TelegramBotService} telegramService - The Telegram service
   */
  constructor(private telegramService: TelegramBotService) {}
  
  /**
   * Executes the message sending
   */
  async execute(
    args: {
      chatId: string | number;
      text: string;
      parseMode?: 'Markdown' | 'HTML';
      replyToMessageId?: number;
      disableNotification?: boolean;
      replyMarkup?: any;
    },
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      // Validate text length
      if (args.text.length > 4096) {
        throw new Error('Message text too long (max 4096 characters)');
      }
      
      const message = await this.telegramService.sendMessage({
        chatId: args.chatId,
        text: args.text,
        parseMode: args.parseMode,
        replyToMessageId: args.replyToMessageId,
        disableNotification: args.disableNotification,
        replyMarkup: args.replyMarkup
      });
      
      return {
        success: true,
        output: {
          messageId: message.message_id,
          chatId: message.chat.id,
          date: message.date,
          text: message.text
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          description: error.description
        }
      };
    }
  }
  
  /**
   * Validates input arguments
   */
  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    
    if (!args.chatId) {
      errors.push('chatId is required');
    }
    
    if (!args.text) {
      errors.push('text is required');
    } else if (typeof args.text !== 'string') {
      errors.push('text must be a string');
    } else if (args.text.length > 4096) {
      errors.push('text exceeds maximum length of 4096 characters');
    }
    
    if (args.parseMode && !['Markdown', 'HTML'].includes(args.parseMode)) {
      errors.push('parseMode must be either "Markdown" or "HTML"');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
