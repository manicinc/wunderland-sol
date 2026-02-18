/**
 * @file ai-responder.service.ts
 * @description GPT-4o integration for the Discord bot. Handles FAQ answers,
 * ticket categorization, first-response suggestions, and thread conversations.
 * Uses the existing callLlm() factory for cost tracking and provider fallback.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { callLlm } from '../../../core/llm/llm.factory.js';
import { LlmProviderId } from '../../../core/llm/llm.config.service.js';
import type { IChatMessage } from '../../../core/llm/llm.interfaces.js';
import { KnowledgeBaseService } from './knowledge-base.service.js';

const MODEL_ID = 'gpt-4o';
const COST_USER = 'discord_bot';

const SYSTEM_PROMPT_FAQ = `You are Rabbit, the official AI support assistant for Rabbit Hole Inc.
You answer questions about the Wunderland platform, Rabbit Hole control plane, and the Wunderbot agent framework.

RULES:
- Answer ONLY from the documentation provided below. Do not make up information.
- If the answer is not in the documentation, say so honestly and suggest creating a support ticket with /ticket create.
- Keep answers concise (under 1500 characters for Discord limits).
- Use markdown formatting that works in Discord (bold, code blocks, bullet lists).
- Be friendly and helpful. Sign off as "— Rabbit 🐇" on longer answers.

DOCUMENTATION:
{context}`;

const SYSTEM_PROMPT_ASK = `You are Rabbit, the official AI support assistant for Rabbit Hole Inc.
You help users with questions about:
- Rabbit Hole (rabbithole.inc) — the control plane for building and managing AI agents
- Wunderland (wunderland.sh) — the autonomous AI agent social network on Solana
- Wunderbots — personality-driven AI agents with HEXACO traits
- Self-hosting, Docker deployment, channel integrations, security tiers
- Pricing: Starter ($19/mo), Pro ($49/mo), Enterprise (custom)

Use the documentation below as your primary source. You may provide general guidance beyond the docs,
but be transparent when you're not sure. Keep answers under 1500 characters.

DOCUMENTATION:
{context}`;

const SYSTEM_PROMPT_CATEGORIZE = `You are a support ticket classifier. Given a ticket subject and description,
output a JSON object with exactly two fields:
- "category": one of "bug", "feature", "billing", "account", "integration", "general"
- "priority": one of "normal", "urgent"

Only mark as "urgent" if the user reports a security issue, data loss, or complete service outage.
Respond ONLY with the JSON object, no markdown or explanation.`;

const SYSTEM_PROMPT_FIRST_RESPONSE = `You are Rabbit, the support assistant for Rabbit Hole Inc.
A user just created a support ticket. Write a helpful first response that:
1. Acknowledges their issue
2. Asks any clarifying questions if the description is vague
3. Suggests immediate steps they can try (if applicable)
4. Lets them know the team will follow up

Keep it under 1000 characters. Be warm and professional. Use Discord markdown.

DOCUMENTATION:
{context}`;

const SYSTEM_PROMPT_THREAD = `You are Rabbit, the support assistant for Rabbit Hole Inc, continuing a support thread.
Help the user with their issue. Reference the documentation below when relevant.
Keep responses under 1000 characters. Be concise and helpful.

DOCUMENTATION:
{context}`;

const SYSTEM_PROMPT_PERSONALITY = `You are Rabbit 🐇, the official Wunderbot for Rabbit Hole Inc's Discord server.
You are an AI agent powered by the Wunderland platform — and you're proud of it.

You are a community member, not just a support bot. You hang out in channels, chat naturally,
share thoughts, and engage with what people are talking about.

RULES:
- Keep responses under 800 characters (Discord-friendly).
- Use Discord markdown formatting.
- Be conversational and natural — NOT corporate or robotic.
- Reference documentation when relevant but don't force it.
- If someone asks about Rabbit Hole / Wunderland / Wunderbots, use docs context.
- You can be opinionated, funny, and have takes. You're a personality, not a FAQ bot.
- Never pretend to be human.

DOCUMENTATION (use when relevant):
{context}

{personality}`;

const SYSTEM_PROMPT_PROACTIVE = `You are Rabbit 🐇, the official Wunderbot for Rabbit Hole Inc's Discord server.
You're naturally participating in a community conversation. You're jumping in because something caught your attention.

RULES:
- Keep responses SHORT — under 500 characters. This is casual chat, not a support response.
- Be natural, witty, and engaging. Match the energy of the conversation.
- If you genuinely have nothing valuable to add, respond with exactly "[SKIP]" and nothing else.
- Don't be preachy or always redirect to docs/support. You're a community member.
- You CAN: share opinions, make jokes, ask questions, celebrate wins, offer quick tips.
- You SHOULD NOT: give long explanations, repeat yourself, or interrupt serious conversations.
- Reference docs only if someone actually needs help with something specific.
- Never start with "As an AI" or apologize for being AI.

RECENT CONVERSATION:
{conversationContext}

DOCUMENTATION (use only if directly relevant):
{context}

{personality}`;


@Injectable()
export class AiResponderService {
  private readonly logger = new Logger('DiscordAI');

  constructor(@Inject(KnowledgeBaseService) private readonly knowledgeBase: KnowledgeBaseService) {}

  /**
   * Answer a FAQ question using documentation context.
   */
  async answerFaq(question: string): Promise<string> {
    const context = this.knowledgeBase.buildContext(question);
    const systemPrompt = SYSTEM_PROMPT_FAQ.replace('{context}', context);

    return this.chat(systemPrompt, question, 0.3);
  }

  /**
   * Answer a general question (broader scope than FAQ).
   */
  async answerGeneral(question: string): Promise<string> {
    const context = this.knowledgeBase.buildContext(question);
    const systemPrompt = SYSTEM_PROMPT_ASK.replace('{context}', context);

    return this.chat(systemPrompt, question, 0.5);
  }

  /**
   * Categorize a support ticket using AI.
   */
  async categorizeTicket(
    subject: string,
    description: string,
  ): Promise<{ category: string; priority: string }> {
    const userMessage = `Subject: ${subject}\nDescription: ${description}`;

    try {
      const response = await this.chat(SYSTEM_PROMPT_CATEGORIZE, userMessage, 0.1);
      const parsed = JSON.parse(response.trim());
      return {
        category: parsed.category || 'general',
        priority: parsed.priority || 'normal',
      };
    } catch {
      return { category: 'general', priority: 'normal' };
    }
  }

  /**
   * Generate an AI first-response for a newly created ticket.
   */
  async suggestFirstResponse(ticket: {
    subject: string;
    description: string;
    category: string;
  }): Promise<string> {
    const context = this.knowledgeBase.buildContext(ticket.subject + ' ' + ticket.description);
    const systemPrompt = SYSTEM_PROMPT_FIRST_RESPONSE.replace('{context}', context);
    const userMessage = `Ticket Subject: ${ticket.subject}\nCategory: ${ticket.category}\nDescription: ${ticket.description}`;

    return this.chat(systemPrompt, userMessage, 0.5);
  }

  /**
   * Generate a response in a support thread conversation.
   */
  async generateThreadResponse(
    threadHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    userMessage: string,
  ): Promise<string> {
    const context = this.knowledgeBase.buildContext(userMessage);
    const systemPrompt = SYSTEM_PROMPT_THREAD.replace('{context}', context);

    const messages: IChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...threadHistory.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];

    try {
      const response = await callLlm(messages, MODEL_ID, { temperature: 0.5 }, LlmProviderId.OPENAI, COST_USER);
      return response.text || 'I wasn\'t able to generate a response. Please try again.';
    } catch (error: any) {
      this.logger.error(`Thread response error: ${error.message}`);
      return 'I\'m having trouble thinking right now. A team member will help you shortly.';
    }
  }

  /**
   * Generate a personality-driven response when the bot is @mentioned.
   * Uses RAG context + mood personality prompt.
   */
  async generatePersonalityResponse(
    userMessage: string,
    personalityPrompt: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ): Promise<string> {
    const context = this.knowledgeBase.buildContext(userMessage);
    const systemPrompt = SYSTEM_PROMPT_PERSONALITY
      .replace('{context}', context)
      .replace('{personality}', personalityPrompt);

    const messages: IChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];

    try {
      const response = await callLlm(messages, MODEL_ID, { temperature: 0.7 }, LlmProviderId.OPENAI, COST_USER);
      return response.text || 'My brain went blank for a sec. Try again? 🐇';
    } catch (error: any) {
      this.logger.error(`Personality response error: ${error.message}`);
      return 'Hmm, something went sideways in my neural pathways. Give me another shot! 🐇';
    }
  }

  /**
   * Generate a proactive response for community channel engagement.
   * May return "[SKIP]" if the AI decides it has nothing valuable to add.
   */
  async generateProactiveResponse(
    triggerMessage: string,
    conversationContext: string,
    personalityPrompt: string,
  ): Promise<string | null> {
    const context = this.knowledgeBase.buildContext(triggerMessage);
    const systemPrompt = SYSTEM_PROMPT_PROACTIVE
      .replace('{conversationContext}', conversationContext)
      .replace('{context}', context)
      .replace('{personality}', personalityPrompt);

    try {
      const response = await callLlm(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: triggerMessage },
        ],
        MODEL_ID,
        { temperature: 0.8 },
        LlmProviderId.OPENAI,
        COST_USER,
      );

      const text = response.text?.trim();
      if (!text || text === '[SKIP]') return null;
      return text;
    } catch (error: any) {
      this.logger.warn(`Proactive response error: ${error.message}`);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private async chat(systemPrompt: string, userMessage: string, temperature: number): Promise<string> {
    const messages: IChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await callLlm(messages, MODEL_ID, { temperature }, LlmProviderId.OPENAI, COST_USER);
      return response.text || 'I wasn\'t able to generate a response. Please try again.';
    } catch (error: any) {
      this.logger.error(`AI response error: ${error.message}`);
      return 'I\'m having trouble thinking right now. Please try again or create a support ticket with `/ticket create`.';
    }
  }
}
