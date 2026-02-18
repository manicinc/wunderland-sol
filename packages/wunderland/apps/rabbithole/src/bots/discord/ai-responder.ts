/**
 * @file ai-responder.ts
 * @description LLM-powered response generation for the Discord bot.
 * Uses direct OpenAI SDK calls with personality-flavored system prompts + RAG context.
 */

import { BotLogger } from '../shared/logger';
import { callLlm, type ChatMessage } from '../shared/llm';
import { KnowledgeBaseService } from './knowledge-base';

const logger = new BotLogger('AiResponder');

export class AiResponderService {
  constructor(private readonly knowledgeBase: KnowledgeBaseService) {}

  async answerFaq(question: string): Promise<string> {
    const context = this.knowledgeBase.buildContext(question, 3);
    return this.chat(
      `You are the Rabbit Hole AI support assistant. Answer using ONLY the documentation context below. Be concise, professional, and direct. If you don't know, say so plainly.\n\n${context ? `Documentation:\n${context}` : 'No relevant docs found.'}`,
      question,
      0.3,
    );
  }

  async answerQuestion(question: string, moodLabel?: string, moodPrompt?: string): Promise<string> {
    const context = this.knowledgeBase.buildContext(question, 5);
    const personalityPart = moodLabel && moodPrompt
      ? `\n\nYour current mood is "${moodLabel}". ${moodPrompt}`
      : '';
    const gifInstruction = `\n\nYou can include a GIF/meme in your response when it fits the vibe — humor, celebration, reactions, or when someone explicitly asks for a meme. To include one, add [GIF:search terms] anywhere in your message. Examples: [GIF:mind blown], [GIF:celebration dance], [GIF:confused cat]. Use it naturally, not on every message — only when it genuinely adds to the conversation. For meme requests, always include a GIF.`;
    return this.chat(
      `You are the AI assistant for Rabbit Hole AI — an autonomous agent platform.\nBe professional, concise, and direct. No fluff. Use documentation context for accuracy.\n${context ? `\nDocumentation:\n${context}` : ''}${personalityPart}${gifInstruction}`,
      question,
      0.5,
    );
  }

  async searchDocs(query: string): Promise<string> {
    const results = this.knowledgeBase.searchDocs(query);
    if (results.length === 0) return 'No documentation found for that query.';
    return results
      .map((r, i) => `**${i + 1}. ${r.heading}** (${r.source})\n${r.excerpt}`)
      .join('\n\n');
  }

  async categorizeTicket(subject: string, description: string): Promise<{ category: string; priority: string }> {
    try {
      const response = await this.chat(
        'You categorize support tickets. Respond with JSON only: {"category":"billing|technical|account|feature|other","priority":"low|normal|high|urgent"}',
        `Subject: ${subject}\nDescription: ${description}`,
        0.1,
      );
      return JSON.parse(response);
    } catch {
      return { category: 'other', priority: 'normal' };
    }
  }

  async suggestFirstResponse(subject: string, description: string, category: string): Promise<string> {
    return this.chat(
      'You are a support agent for Rabbit Hole AI. Write a brief, professional first response acknowledging the issue and providing initial guidance. Keep it under 3 sentences. No filler.',
      `Category: ${category}\nSubject: ${subject}\nDescription: ${description}`,
      0.4,
    );
  }

  async shouldRespondProactively(conversationContext: string): Promise<{ respond: boolean; response: string }> {
    try {
      const answer = await this.chat(
        'You are the Rabbit Hole AI assistant monitoring a Discord conversation. Decide whether to chime in.\n\nRules:\n- Only respond if you can add genuine value — answer a question, correct misinformation, or share relevant technical info\n- Skip casual chitchat, greetings, and off-topic banter\n- If someone mentions agents, AI, deployment, or asks a question you can help with, respond\n- You can include a GIF by adding [GIF:search terms] in your response when it fits the vibe\n- Respond with [SKIP] if you should not chime in\n- Otherwise, respond with your message — 1-2 sentences max, professional and direct',
        `Recent conversation:\n${conversationContext}`,
        0.8,
      );
      if (answer.includes('[SKIP]')) return { respond: false, response: '' };
      return { respond: true, response: answer };
    } catch {
      return { respond: false, response: '' };
    }
  }

  private async chat(systemPrompt: string, userMessage: string, temperature: number): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await callLlm(messages, { temperature, max_tokens: 1024 });
      return response.text ?? 'I had trouble generating a response. Please try again.';
    } catch (error: any) {
      logger.error(`LLM call failed: ${error.message}`);
      return 'Sorry, I encountered an error processing your request.';
    }
  }
}
