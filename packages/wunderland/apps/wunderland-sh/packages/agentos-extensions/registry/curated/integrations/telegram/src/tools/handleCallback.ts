import { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import { TelegramBotService } from '../services/telegramBot';

/**
 * Tool for handling Telegram callback queries
 * 
 * @class HandleCallbackTool
 * @implements {ITool}
 */
export class HandleCallbackTool implements ITool {
  public readonly id = 'telegramHandleCallback';
  public readonly name = 'telegramHandleCallback';
  public readonly displayName = 'Handle Telegram Callback';
  public readonly description = 'Handle callback queries from inline keyboard buttons in Telegram messages.';
  public readonly category = 'communication';
  public readonly version = '1.0.0';
  public readonly hasSideEffects = true;
  
  public readonly inputSchema = {
    type: 'object',
    required: ['callbackQueryId'],
    properties: {
      callbackQueryId: {
        type: 'string',
        description: 'Unique identifier for the callback query'
      },
      text: {
        type: 'string',
        description: 'Text of the notification to show to the user'
      },
      showAlert: {
        type: 'boolean',
        description: 'If true, shows an alert instead of a notification',
        default: false
      },
      url: {
        type: 'string',
        description: 'URL that will be opened by the user client'
      },
      cacheTime: {
        type: 'number',
        description: 'Maximum time in seconds the result can be cached',
        default: 0
      }
    }
  };
  
  constructor(private telegramService: TelegramBotService) {}
  
  async execute(
    args: {
      callbackQueryId: string;
      text?: string;
      showAlert?: boolean;
      url?: string;
      cacheTime?: number;
    },
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.telegramService.answerCallbackQuery(
        args.callbackQueryId,
        {
          text: args.text,
          showAlert: args.showAlert,
          url: args.url,
          cacheTime: args.cacheTime
        }
      );
      
      return {
        success: true,
        output: {
          answered: result,
          callbackQueryId: args.callbackQueryId
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
}
