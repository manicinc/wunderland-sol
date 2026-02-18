# Telegram Bot Extension for AgentOS

Professional Telegram Bot API integration for AgentOS agents.

## Features

- 📤 **Message Sending**: Text, photos, documents with formatting
- 📊 **Group Management**: Pin messages, change settings (requires admin)
- 🔍 **Chat Information**: Get chat details and member counts
- 🎛️ **Inline Keyboards**: Handle callback queries from buttons
- 🔐 **Flexible Auth**: Multiple ways to provide bot token
- ⚡ **Rate Limiting**: Automatic queue management
- 🔄 **Webhook/Polling**: Both modes supported

## Installation

```bash
npm install @framers/agentos-ext-telegram
```

## Configuration

### Environment Variables

The extension supports multiple ways to provide your bot token:

```bash
# .env file

# Method 1: Default environment variable
TELEGRAM_BOT_TOKEN=your-bot-token-here

# Method 2: Custom environment variable
MY_TELEGRAM_TOKEN=your-bot-token-here

# Method 3: Multiple bot support
TELEGRAM_MAIN_BOT=token1
TELEGRAM_SUPPORT_BOT=token2
```

### Usage Examples

#### Basic Setup

```typescript
import { createExtensionPack } from '@framers/agentos-ext-telegram';

// Auto-detect from environment
const telegramExt = createExtensionPack({
  options: {
    // Automatically reads TELEGRAM_BOT_TOKEN
  },
  logger: console
});

// Custom environment variable
const telegramExt = createExtensionPack({
  options: {
    botTokenEnv: 'MY_TELEGRAM_TOKEN'
  }
});

// Direct token (not recommended for production)
const telegramExt = createExtensionPack({
  options: {
    botToken: 'your-token-here'
  }
});
```

#### Advanced Configuration

```typescript
const telegramExt = createExtensionPack({
  options: {
    // Webhook mode (for production)
    webhookUrl: 'https://your-domain.com/telegram-webhook',
    
    // Or polling mode (for development)
    pollingInterval: 300,
    
    // Message formatting
    defaultParseMode: 'Markdown', // or 'HTML'
    enableTypingAction: true,     // Show "typing..." indicator
    
    // Rate limiting
    rateLimit: {
      maxRequests: 30,  // Telegram's limit
      windowMs: 1000    // Per second
    }
  }
});
```

## Available Tools

### 1. Send Message

Send formatted text messages with optional keyboards.

```typescript
const result = await telegramSendMessage.execute({
  chatId: '@mychannel',  // or numeric chat ID
  text: '*Bold* _italic_ `code`',
  parseMode: 'Markdown',
  replyMarkup: {
    inline_keyboard: [[
      { text: 'Button 1', callback_data: 'btn1' },
      { text: 'Button 2', callback_data: 'btn2' }
    ]]
  }
});
```

### 2. Send Photo

Send images with captions.

```typescript
const result = await telegramSendPhoto.execute({
  chatId: '@mychannel',
  photo: 'https://example.com/image.jpg', // URL, file path, or base64
  caption: 'Check out this image!',
  parseMode: 'Markdown'
});
```

### 3. Send Document

Send files of any type.

```typescript
const result = await telegramSendDocument.execute({
  chatId: '@mychannel',
  document: './report.pdf', // URL, file path, or base64
  caption: 'Monthly Report',
  filename: 'Report_December_2024.pdf'
});
```

### 4. Get Chat Info

Retrieve information about a chat.

```typescript
const result = await telegramGetChatInfo.execute({
  chatId: '@mychannel',
  includeMemberCount: true
});

// Returns: { id, type, title, username, memberCount }
```

### 5. Manage Group

Perform admin actions (requires bot to be admin).

```typescript
// Pin a message
await telegramManageGroup.execute({
  chatId: -123456789,
  action: 'pinMessage',
  messageId: 42,
  disableNotification: false
});

// Set group description
await telegramManageGroup.execute({
  chatId: -123456789,
  action: 'setDescription',
  text: 'Welcome to our awesome group!'
});
```

### 6. Handle Callbacks

Respond to inline keyboard button presses.

```typescript
const result = await telegramHandleCallback.execute({
  callbackQueryId: 'query123',
  text: 'Button clicked!',
  showAlert: true  // Shows as popup
});
```

## Agency Integration

### Multi-GMI Collaboration

```typescript
// Research GMI finds information
const researcher = await createGMI({
  tools: ['webSearch', 'factCheck']
});

// Communications GMI sends to Telegram
const communicator = await createGMI({
  tools: ['telegramSendMessage', 'telegramSendPhoto']
});

// Workflow orchestrates both
const workflow = {
  tasks: [
    {
      executor: 'researcher',
      tool: 'webSearch',
      inputs: { query: '{{topic}}' }
    },
    {
      executor: 'communicator',
      tool: 'telegramSendMessage',
      inputs: {
        chatId: '{{telegram_channel}}',
        text: '📊 Research Results:\n{{results.research}}'
      }
    }
  ]
};
```

## Error Handling

The extension handles common Telegram API errors gracefully:

```typescript
try {
  const result = await tool.execute(args);
  if (!result.success) {
    console.error('Telegram error:', result.error);
    // Handle specific error codes
    if (result.details?.code === 403) {
      console.log('Bot was blocked by user');
    }
  }
} catch (error) {
  console.error('System error:', error);
}
```

## Rate Limiting

The extension automatically manages rate limits:

- Queues messages to respect Telegram's 30 msg/sec limit
- Configurable rate limiting per chat
- Automatic retry with exponential backoff

## Security Best Practices

1. **Never hardcode bot tokens** - Use environment variables
2. **Validate webhook signatures** in production
3. **Sanitize user input** before sending
4. **Use HTTPS** for webhooks
5. **Restrict bot permissions** to minimum needed
6. **Monitor for abuse** and implement user rate limits

## Bot Setup

1. Create a bot with [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Set bot commands (optional):
```
/start - Start the bot
/help - Show help
/status - Check status
```
4. Configure privacy mode as needed
5. Add bot to groups/channels with appropriate permissions

## Testing

```typescript
// Mock the Telegram service for testing
const mockService = {
  sendMessage: jest.fn().mockResolvedValue({
    message_id: 1,
    chat: { id: 123 },
    date: Date.now(),
    text: 'Test'
  })
};

const tool = new SendMessageTool(mockService);
const result = await tool.execute({
  chatId: 123,
  text: 'Test message'
}, context);
```

## Troubleshooting

### Bot not responding
- Check bot token is correct
- Ensure bot is not blocked
- Verify network connectivity
- Check webhook URL is accessible

### Rate limit errors
- Reduce message frequency
- Implement message batching
- Use queue management

### Permission errors
- Ensure bot is admin for group management
- Check channel posting permissions
- Verify user hasn't blocked bot

## Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [BotFather](https://t.me/botfather) - Create and manage bots
- [Telegram Bot Examples](https://github.com/telegram-bot-sdk/telegram-bot-sdk)

## License

MIT - See LICENSE file
