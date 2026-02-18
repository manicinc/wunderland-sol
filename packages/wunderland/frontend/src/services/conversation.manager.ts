/**
 * @file Conversation History Manager
 * @description Manages the conversation history for the chat interface,
 * including truncation and formatting for API requests. It provides a mechanism
 * to prepare a segment of the conversation history, typically the most recent messages,
 * to be sent to the LLM backend. The size of this history segment is configurable
 * by the user via settings, with sensible defaults.
 * @version 1.1.1 - Added clearHistory method stub.
 */
import { ref, watch, Ref } from 'vue'; // Added Ref
import { useStorage } from '@vueuse/core';

/**
 * Represents a single message in the conversation.
 * This structure should be consistent with what the backend expects (IChatMessage)
 * and how messages are handled in the frontend views (e.g., Home.vue).
 */
export interface ConversationMessage {
  /**
   * The role of the entity that produced the message.
   * 'system' messages provide context or instructions to the LLM.
   * 'user' messages are input from the end-user.
   * 'assistant' messages are responses from the LLM.
   */
  role: 'user' | 'assistant' | 'system';
  /**
   * The textual content of the message.
   */
  content: string;
  /**
   * Optional Unix timestamp (in milliseconds) when the message was created or received.
   * Useful for ordering or displaying time information.
   */
  timestamp?: number;
  /**
   * Optional analysis object, if frontend analysis was performed on this message.
   * This is typically not sent to the backend for history purposes.
   */
  analysis?: Record<string, any> | null; // Align with Home.vue Message type
  /**
   * Optional detected intent from user input.
   * This is typically not sent to the backend for history purposes.
   */
  detectedIntent?: string;
}

// Default number of individual messages (user + assistant) to keep.
const DEFAULT_INDIVIDUAL_MESSAGES_COUNT = parseInt(
  useStorage('defaultIndividualMessagesCount', 12).value.toString() // Reduced from 20 to 12
);

// Maximum number of individual messages the user can configure.
const MAX_INDIVIDUAL_MESSAGES_COUNT = parseInt(
  useStorage('maxIndividualMessagesCount', 100).value.toString() // Reduced from 200 to 100
);

// Rough estimate: characters per token. This can be refined based on the tokenizer used.
const CHARS_PER_TOKEN_ESTIMATE = 3.5;

/**
 * @class ConversationManager
 * @description Manages conversation history for API requests.
 * This class helps in selecting the relevant portion of the conversation
 * to send to the LLM, based on configured limits (number of messages or estimated tokens).
 */
class ConversationManager {
  /**
   * The current number of individual messages to retain for API requests.
   * This value is configurable by the user and stored using useStorage.
   * @private
   */
  private currentMessagesToKeepCount: Ref<number>;

  /**
   * Initializes a new instance of the ConversationManager.
   * It loads the user's preferred history size from local storage or uses defaults.
   */
  constructor() {
    const storedHistorySize = useStorage('chatHistoryIndividualMessageCount', DEFAULT_INDIVIDUAL_MESSAGES_COUNT);
    this.currentMessagesToKeepCount = ref(this.validateHistorySize(storedHistorySize.value));

    // Watch for changes in stored history size and update the reactive ref.
    watch(storedHistorySize, (newSize) => {
      this.currentMessagesToKeepCount.value = this.validateHistorySize(newSize);
      console.log(`ConversationManager: History messages to keep count updated to ${this.currentMessagesToKeepCount.value}.`);
    });
  }

  /**
   * Validates and sanitizes the desired history size to ensure it's within acceptable bounds.
   * @param {number | string} size - The desired history size (number of individual messages).
   * @returns {number} A valid history size, clamped between 1 and MAX_INDIVIDUAL_MESSAGES_COUNT.
   */
  private validateHistorySize(size: number | string): number {
    let numSize = typeof size === 'string' ? parseInt(size, 10) : size;
    if (isNaN(numSize) || numSize < 1) {
      console.warn(`ConversationManager: Invalid history size detected (${size}). Defaulting to ${DEFAULT_INDIVIDUAL_MESSAGES_COUNT}.`);
      numSize = DEFAULT_INDIVIDUAL_MESSAGES_COUNT;
    }
    return Math.min(Math.max(numSize, 1), MAX_INDIVIDUAL_MESSAGES_COUNT);
  }

  /**
   * Sets the maximum number of individual messages to keep in the history segment for API calls.
   * This method updates the reactive currentMessagesToKeepCount and persists the value.
   * @param {number} count - The number of individual messages to keep.
   */
  public setHistoryMessageCount(count: number): void {
    const validatedCount = this.validateHistorySize(count);
    this.currentMessagesToKeepCount.value = validatedCount;
    const storedHistorySize = useStorage('chatHistoryIndividualMessageCount', DEFAULT_INDIVIDUAL_MESSAGES_COUNT);
    storedHistorySize.value = validatedCount;
  }

  /**
   * Gets the current maximum number of individual messages configured to be kept for API history.
   * @returns {number} The current history message count (individual messages).
   */
  public getHistoryMessageCount(): number {
    return this.currentMessagesToKeepCount.value;
  }

  /**
   * Prepares the conversation history for sending to the LLM API.
   * @param {ConversationMessage[]} allMessages - The complete list of messages in the current session.
   * @param {number} [maxMessagesToSend] - Override for the number of individual messages to send.
   * @param {number} [maxTokenEstimate] - Optional: An estimated maximum token count for the history payload.
   * @returns {ConversationMessage[]} A slice of the allMessages array.
   */
  public prepareHistoryForApi(
    allMessages: ConversationMessage[],
    maxMessagesToSend?: number,
    maxTokenEstimate?: number
  ): ConversationMessage[] {
    const numMessages = maxMessagesToSend
      ? this.validateHistorySize(maxMessagesToSend)
      : this.currentMessagesToKeepCount.value;

    let historySlice = allMessages.slice(-numMessages);

    if (maxTokenEstimate && maxTokenEstimate > 0) {
      let currentTokenEstimate = 0;
      const tokenLimitedHistory: ConversationMessage[] = [];
      for (let i = historySlice.length - 1; i >= 0; i--) {
        const message = historySlice[i];
        const messageTokens = Math.ceil(message.content.length / CHARS_PER_TOKEN_ESTIMATE);
        if (currentTokenEstimate + messageTokens <= maxTokenEstimate) {
          tokenLimitedHistory.unshift(message);
          currentTokenEstimate += messageTokens;
        } else {
          console.warn(
            `ConversationManager: History truncated due to token limit. Estimated ${
              currentTokenEstimate + messageTokens
            } > ${maxTokenEstimate}. Last message considered: "${message.content.substring(0,30)}..."`
          );
          break;
        }
      }
      historySlice = tokenLimitedHistory;
    }

    if (historySlice.length > 1) {
      historySlice = historySlice.filter(msg => msg.role !== 'system');
    } else if (historySlice.length === 1 && historySlice[0].role === 'system') {
      // Keep if only message is system
    }

    console.log(`ConversationManager: Prepared ${historySlice.length} messages for API.`);
    return historySlice;
  }

  /**
   * Utility function to add a new message to a conversation history array
   * and ensure the history does not exceed the configured maximum size.
   * @param {ConversationMessage[]} currentHistory - The current array of messages.
   * @param {ConversationMessage} newMessage - The new message to add.
   * @returns {ConversationMessage[]} The updated history array, truncated if necessary.
   */
  public addMessageAndMaintainSize(
    currentHistory: ConversationMessage[],
    newMessage: ConversationMessage
  ): ConversationMessage[] {
    const updatedHistory = [...currentHistory, newMessage];
    if (updatedHistory.length > this.currentMessagesToKeepCount.value) {
      return updatedHistory.slice(-this.currentMessagesToKeepCount.value);
    }
    return updatedHistory;
  }

  /**
   * Clears the conversation history.
   * IMPORTANT: The actual implementation of clearing history depends on how
   * messages are stored (e.g., Pinia store, localStorage, global ref).
   * This is a placeholder and needs to be adapted to your application's state management.
   */
  public clearHistory(): void {
    console.log('ConversationManager: clearHistory() called. Implement actual history clearing logic here.');
    // Example: If messages are in localStorage under 'chatMessages'
    // localStorage.removeItem('chatMessages');
    // Or if you use a Pinia store, dispatch an action:
    // import { useMessageStore } from '@/stores/messageStore'; // Adjust path
    // const messageStore = useMessageStore();
    // messageStore.clearAllMessages();

    // For now, this method serves to resolve the TypeScript error.
    // You MUST implement the logic specific to your application.
  }
}

/**
 * Singleton instance of the ConversationManager.
 */
export const conversationManager = new ConversationManager();