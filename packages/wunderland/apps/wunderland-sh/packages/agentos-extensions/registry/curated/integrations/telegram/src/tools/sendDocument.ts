import { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import { TelegramBotService } from '../services/telegramBot';

/**
 * Tool for sending documents via Telegram
 * 
 * @class SendDocumentTool
 * @implements {ITool}
 */
export class SendDocumentTool implements ITool {
  public readonly id = 'telegramSendDocument';
  public readonly name = 'telegramSendDocument';
  public readonly displayName = 'Send Telegram Document';
  public readonly description = 'Send a document file to a Telegram chat. Supports various file types including PDFs, archives, and office documents.';
  public readonly category = 'communication';
  public readonly version = '1.0.0';
  public readonly hasSideEffects = true;
  
  public readonly inputSchema = {
    type: 'object',
    required: ['chatId', 'document'],
    properties: {
      chatId: {
        type: ['string', 'number'],
        description: 'Unique identifier for the target chat'
      },
      document: {
        type: 'string',
        description: 'Document URL, file path, or base64 encoded file'
      },
      caption: {
        type: 'string',
        description: 'Document caption, 0-1024 characters'
      },
      filename: {
        type: 'string',
        description: 'Original filename to display'
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
      document: string;
      caption?: string;
      filename?: string;
      parseMode?: 'Markdown' | 'HTML';
      replyToMessageId?: number;
    },
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      // Convert base64 to buffer if needed
      let documentData: string | Buffer = args.document;
      if (args.document.startsWith('data:')) {
        const base64Data = args.document.split(',')[1];
        documentData = Buffer.from(base64Data, 'base64');
      }
      
      const message = await this.telegramService.sendDocument(
        args.chatId,
        documentData,
        {
          caption: args.caption,
          filename: args.filename,
          parseMode: args.parseMode,
          replyToMessageId: args.replyToMessageId
        }
      );
      
      return {
        success: true,
        output: {
          messageId: message.message_id,
          chatId: message.chat.id,
          date: message.date,
          documentId: message.document?.file_id
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
