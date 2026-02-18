import { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import { TelegramBotService } from '../services/telegramBot';

/**
 * Tool for getting Telegram chat information
 * 
 * @class GetChatInfoTool
 * @implements {ITool}
 */
export class GetChatInfoTool implements ITool {
  public readonly id = 'telegramGetChatInfo';
  public readonly name = 'telegramGetChatInfo';
  public readonly displayName = 'Get Telegram Chat Info';
  public readonly description = 'Retrieve information about a Telegram chat including type, title, member count, and settings.';
  public readonly category = 'communication';
  public readonly version = '1.0.0';
  public readonly hasSideEffects = false;
  
  public readonly inputSchema = {
    type: 'object',
    required: ['chatId'],
    properties: {
      chatId: {
        type: ['string', 'number'],
        description: 'Unique identifier for the target chat or username of the target channel'
      },
      includeMemberCount: {
        type: 'boolean',
        description: 'Whether to include member count (requires additional API call)',
        default: false
      }
    }
  };
  
  public readonly outputSchema = {
    type: 'object',
    properties: {
      id: {
        type: ['string', 'number'],
        description: 'Unique chat identifier'
      },
      type: {
        type: 'string',
        enum: ['private', 'group', 'supergroup', 'channel'],
        description: 'Type of chat'
      },
      title: {
        type: 'string',
        description: 'Title for groups/channels'
      },
      username: {
        type: 'string',
        description: 'Username for private chats and channels'
      },
      firstName: {
        type: 'string',
        description: 'First name for private chats'
      },
      lastName: {
        type: 'string',
        description: 'Last name for private chats'
      },
      memberCount: {
        type: 'number',
        description: 'Number of members (if requested)'
      }
    }
  };
  
  constructor(private telegramService: TelegramBotService) {}
  
  async execute(
    args: {
      chatId: string | number;
      includeMemberCount?: boolean;
    },
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      const chatInfo = await this.telegramService.getChatInfo(args.chatId);
      
      const output: any = {
        id: chatInfo.id,
        type: chatInfo.type,
        title: chatInfo.title,
        username: chatInfo.username,
        firstName: chatInfo.first_name,
        lastName: chatInfo.last_name
      };
      
      if (args.includeMemberCount && ['group', 'supergroup', 'channel'].includes(chatInfo.type)) {
        try {
          const memberCount = await this.telegramService.getChatMemberCount(args.chatId);
          output.memberCount = memberCount;
        } catch (err) {
          // Member count might not be available for all chats
          console.warn('Could not get member count:', err);
        }
      }
      
      return {
        success: true,
        output
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
  
  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    
    if (!args.chatId) {
      errors.push('chatId is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
