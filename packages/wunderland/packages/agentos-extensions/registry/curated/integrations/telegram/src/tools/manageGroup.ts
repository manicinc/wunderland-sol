import { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import { TelegramBotService } from '../services/telegramBot';

/**
 * Tool for managing Telegram groups
 * 
 * @class ManageGroupTool
 * @implements {ITool}
 */
export class ManageGroupTool implements ITool {
  public readonly id = 'telegramManageGroup';
  public readonly name = 'telegramManageGroup';
  public readonly displayName = 'Manage Telegram Group';
  public readonly description = 'Manage Telegram group settings including pinning messages, setting descriptions, and managing members (requires admin rights).';
  public readonly category = 'communication';
  public readonly version = '1.0.0';
  public readonly hasSideEffects = true;
  
  public readonly inputSchema = {
    type: 'object',
    required: ['chatId', 'action'],
    properties: {
      chatId: {
        type: ['string', 'number'],
        description: 'Unique identifier for the target group'
      },
      action: {
        type: 'string',
        enum: ['pinMessage', 'unpinMessage', 'setDescription', 'setTitle'],
        description: 'Management action to perform'
      },
      messageId: {
        type: 'number',
        description: 'Message ID (for pin/unpin actions)'
      },
      text: {
        type: 'string',
        description: 'Text content (for setDescription, setTitle)'
      },
      disableNotification: {
        type: 'boolean',
        description: 'Disable notification for pin action'
      }
    }
  };
  
  constructor(private telegramService: TelegramBotService) {}
  
  async execute(
    args: {
      chatId: string | number;
      action: 'pinMessage' | 'unpinMessage' | 'setDescription' | 'setTitle';
      messageId?: number;
      text?: string;
      disableNotification?: boolean;
    },
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const bot = this.telegramService.getBotInstance();
      if (!bot) {
        throw new Error('Bot not initialized');
      }
      
      let result: any;
      
      switch (args.action) {
        case 'pinMessage':
          if (!args.messageId) {
            throw new Error('messageId required for pinMessage');
          }
          result = await this.telegramService.pinMessage(
            args.chatId,
            args.messageId,
            args.disableNotification
          );
          break;
          
        case 'unpinMessage':
          if (!args.messageId) {
            throw new Error('messageId required for unpinMessage');
          }
          result = await bot.unpinChatMessage(args.chatId, { message_id: args.messageId });
          break;
          
        case 'setDescription':
          if (!args.text) {
            throw new Error('text required for setDescription');
          }
          result = await bot.setChatDescription(args.chatId, args.text);
          break;
          
        case 'setTitle':
          if (!args.text) {
            throw new Error('text required for setTitle');
          }
          result = await bot.setChatTitle(args.chatId, args.text);
          break;
          
        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
      
      return {
        success: true,
        output: {
          action: args.action,
          chatId: args.chatId,
          success: result === true
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          description: error.description || 'Bot may not have required admin rights'
        }
      };
    }
  }
}
