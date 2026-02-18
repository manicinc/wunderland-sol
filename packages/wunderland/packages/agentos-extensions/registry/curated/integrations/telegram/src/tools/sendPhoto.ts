import { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import { TelegramBotService } from '../services/telegramBot';

/**
 * Tool for sending photos via Telegram
 * 
 * @class SendPhotoTool
 * @implements {ITool}
 */
export class SendPhotoTool implements ITool {
  public readonly id = 'telegramSendPhoto';
  public readonly name = 'telegramSendPhoto';
  public readonly displayName = 'Send Telegram Photo';
  public readonly description = 'Send a photo to a Telegram chat. Supports URLs, file paths, and base64 encoded images with optional captions.';
  public readonly category = 'communication';
  public readonly version = '1.0.0';
  public readonly hasSideEffects = true;
  
  public readonly inputSchema = {
    type: 'object',
    required: ['chatId', 'photo'],
    properties: {
      chatId: {
        type: ['string', 'number'],
        description: 'Unique identifier for the target chat'
      },
      photo: {
        type: 'string',
        description: 'Photo URL, file path, or base64 encoded image'
      },
      caption: {
        type: 'string',
        description: 'Photo caption, 0-1024 characters'
      },
      parseMode: {
        type: 'string',
        enum: ['Markdown', 'HTML'],
        description: 'Mode for parsing entities in the caption'
      },
      replyToMessageId: {
        type: 'number',
        description: 'If the message is a reply, ID of the original message'
      }
    }
  };
  
  constructor(private telegramService: TelegramBotService) {}
  
  async execute(
    args: {
      chatId: string | number;
      photo: string;
      caption?: string;
      parseMode?: 'Markdown' | 'HTML';
      replyToMessageId?: number;
    },
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      // Convert base64 to buffer if needed
      let photoData: string | Buffer = args.photo;
      if (args.photo.startsWith('data:image/')) {
        const base64Data = args.photo.split(',')[1];
        photoData = Buffer.from(base64Data, 'base64');
      }
      
      const message = await this.telegramService.sendPhoto(
        args.chatId,
        photoData,
        {
          caption: args.caption,
          parseMode: args.parseMode,
          replyToMessageId: args.replyToMessageId
        }
      );
      
      return {
        success: true,
        output: {
          messageId: message.message_id,
          chatId: message.chat.id,
          date: message.date
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        details: { code: error.code }
      };
    }
  }
}
