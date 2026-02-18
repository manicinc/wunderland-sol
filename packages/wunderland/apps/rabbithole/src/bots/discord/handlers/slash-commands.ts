/**
 * @file slash-commands.ts
 * @description Handles all Discord slash command interactions.
 * /verify uses HTTP API to check user accounts instead of direct DB access.
 */

import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import {
  BRAND_COLOR,
  PRICING_EMBED,
  BUTTON_IDS,
  MODAL_IDS,
  MODAL_FIELD_IDS,
} from '../constants';
import { ServerSetupService, type SetupResult } from '../server-setup';
import { AiResponderService } from '../ai-responder';
import { KnowledgeBaseService } from '../knowledge-base';
import { BotLogger } from '../../shared/logger';

const logger = new BotLogger('SlashCommands');

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:3001';
}

export class SlashCommandsHandler {
  constructor(
    private readonly serverSetup: ServerSetupService,
    private readonly aiResponder: AiResponderService,
    private readonly knowledgeBase: KnowledgeBaseService,
  ) {}

  async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const { commandName } = interaction;

    switch (commandName) {
      case 'setup': return this.handleSetup(interaction);
      case 'faq': return this.handleFaq(interaction);
      case 'help': return this.handleHelp(interaction);
      case 'ticket': return this.handleTicket(interaction);
      case 'pricing': return this.handlePricing(interaction);
      case 'docs': return this.handleDocs(interaction);
      case 'ask': return this.handleAsk(interaction);
      case 'verify': return this.handleVerify(interaction);
      case 'clear': return this.handleClear(interaction);
      default:
        await interaction.reply({ content: `Unknown command: ${commandName}`, ephemeral: true });
    }
  }

  // --- /setup ---

  private async handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.memberPermissions?.has('Administrator')) {
      await interaction.reply({ content: 'Only administrators can run /setup.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    try {
      const guild = interaction.guild!;
      const result = await this.serverSetup.setupServer(guild);

      const nothingHappened =
        result.rolesCreated.length === 0 &&
        result.categoriesCreated.length === 0 &&
        result.channelsCreated.length === 0 &&
        result.channelsRenamed.length === 0 &&
        result.channelsMoved.length === 0 &&
        result.channelsDeleted.length === 0;

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle('Server Setup Complete')
        .setDescription(nothingHappened ? 'Server is already fully set up!' : 'Server structure has been updated.')
        .setTimestamp();

      const trunc = (items: string[], sep: string) => {
        const joined = items.join(sep);
        return joined.length > 1000 ? joined.slice(0, 997) + '...' : joined;
      };

      if (result.rolesCreated.length > 0) {
        embed.addFields({ name: 'Roles Created', value: trunc(result.rolesCreated, ', '), inline: true });
      }
      if (result.categoriesCreated.length > 0) {
        embed.addFields({ name: 'Categories Created', value: trunc(result.categoriesCreated, ', '), inline: true });
      }
      if (result.channelsCreated.length > 0) {
        embed.addFields({ name: 'Channels Created', value: trunc(result.channelsCreated, ', '), inline: false });
      }
      if (result.channelsRenamed.length > 0) {
        embed.addFields({ name: `Channels Renamed (${result.channelsRenamed.length})`, value: trunc(result.channelsRenamed, '\n'), inline: false });
      }
      if (result.channelsMoved.length > 0) {
        embed.addFields({ name: `Channels Moved (${result.channelsMoved.length})`, value: trunc(result.channelsMoved, '\n'), inline: false });
      }
      if (result.channelsDeleted.length > 0) {
        embed.addFields({ name: `Duplicates Removed (${result.channelsDeleted.length})`, value: trunc(result.channelsDeleted, ', '), inline: false });
      }
      if (result.errors.length > 0) {
        embed.addFields({ name: 'Errors', value: trunc(result.errors.slice(0, 5), '\n'), inline: false });
      }

      const summary = [
        `${result.rolesCreated.length} roles`,
        `${result.categoriesCreated.length} categories`,
        `${result.channelsCreated.length} channels created`,
        `${result.channelsRenamed.length} renamed`,
        `${result.channelsMoved.length} moved`,
        `${result.channelsDeleted.length} duplicates removed`,
      ].join(' | ');

      embed.setFooter({ text: summary });

      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      logger.error(`/setup error: ${error.message}`, error.stack);
      await interaction.editReply({ content: `Setup failed: ${error.message}` });
    }
  }

  // --- /faq ---

  private async handleFaq(interaction: ChatInputCommandInteraction): Promise<void> {
    const query = interaction.options.getString('query', true);
    await interaction.deferReply();

    try {
      const answer = await this.aiResponder.answerFaq(query);
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle('FAQ')
        .setDescription(answer)
        .setFooter({ text: `Knowledge base: ${this.knowledgeBase.getChunkCount()} chunks` });

      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.editReply({ content: 'Sorry, I had trouble answering that.' });
    }
  }

  // --- /help ---

  private async handleHelp(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle('Rabbit Hole AI - Help')
      .setDescription('Here are the available commands:')
      .addFields(
        { name: '/setup', value: 'Set up the server (Admin only)', inline: true },
        { name: '/faq <query>', value: 'Search frequently asked questions', inline: true },
        { name: '/help', value: 'Show this help message', inline: true },
        { name: '/ticket', value: 'Create a support ticket', inline: true },
        { name: '/pricing', value: 'View pricing tiers', inline: true },
        { name: '/docs <query>', value: 'Search the documentation', inline: true },
        { name: '/ask <question>', value: 'Ask the AI assistant', inline: true },
        { name: '/verify <email>', value: 'Link your account for tier roles', inline: true },
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(BUTTON_IDS.HELP_PRICING).setLabel('Pricing').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(BUTTON_IDS.HELP_DOCS).setLabel('Docs').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(BUTTON_IDS.HELP_TICKET).setLabel('Create Ticket').setStyle(ButtonStyle.Success),
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  // --- /ticket ---

  private async handleTicket(interaction: ChatInputCommandInteraction): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId(MODAL_IDS.TICKET_CREATE)
      .setTitle('Create Support Ticket');

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(MODAL_FIELD_IDS.TICKET_SUBJECT)
          .setLabel('Subject')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(200),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(MODAL_FIELD_IDS.TICKET_CATEGORY)
          .setLabel('Category (billing/technical/account/other)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder('technical'),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(MODAL_FIELD_IDS.TICKET_DESCRIPTION)
          .setLabel('Description')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(4000),
      ),
    );

    await interaction.showModal(modal);
  }

  // --- /pricing ---

  private async handlePricing(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ embeds: [PRICING_EMBED], ephemeral: true });
  }

  // --- /docs ---

  private async handleDocs(interaction: ChatInputCommandInteraction): Promise<void> {
    const query = interaction.options.getString('query', true);
    await interaction.deferReply();

    try {
      const results = await this.aiResponder.searchDocs(query);
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle(`Docs: "${query}"`)
        .setDescription(results || 'No results found.');

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ content: 'Sorry, doc search failed.' });
    }
  }

  // --- /ask ---

  private async handleAsk(interaction: ChatInputCommandInteraction): Promise<void> {
    const question = interaction.options.getString('question', true);
    await interaction.deferReply();

    try {
      const answer = await this.aiResponder.answerQuestion(question);
      await interaction.editReply({ content: answer });
    } catch {
      await interaction.editReply({ content: 'Sorry, I had trouble with that question.' });
    }
  }

  // --- /verify ---

  private async handleVerify(interaction: ChatInputCommandInteraction): Promise<void> {
    const email = interaction.options.getString('email', true);
    await interaction.deferReply({ ephemeral: true });

    try {
      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/api/auth/verify-discord`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          await interaction.editReply({ content: `No account found for \`${email}\`. Please sign up at wunderland.sh first.` });
          return;
        }
        await interaction.editReply({ content: 'Verification failed. Please try again or contact support.' });
        return;
      }

      const data = (await response.json()) as { roleName?: string; subscriptionStatus?: string };
      const roleName = data.roleName || 'Starter';

      const guild = interaction.guild!;
      const member = await guild.members.fetch(interaction.user.id);

      const role = guild.roles.cache.find((r) => r.name === roleName);
      if (role && !member.roles.cache.has(role.id)) {
        await member.roles.add(role);
      }

      await interaction.editReply({
        content: `Verified! You've been assigned the **${roleName}** role. Welcome to Rabbit Hole AI!`,
      });
    } catch (error: any) {
      logger.error(`/verify error: ${error.message}`);
      await interaction.editReply({ content: 'Verification failed. Please try again or contact support.' });
    }
  }

  // --- /clear ---

  private async handleClear(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.memberPermissions?.has('ManageMessages')) {
      await interaction.reply({ content: 'Only moderators can use /clear.', ephemeral: true });
      return;
    }

    const count = Math.min(Math.max(interaction.options.getInteger('count') ?? 50, 1), 100);
    await interaction.deferReply({ ephemeral: true });

    try {
      const channel = interaction.channel;
      if (!channel || !('bulkDelete' in channel)) {
        await interaction.editReply({ content: 'Cannot bulk delete in this channel type.' });
        return;
      }

      const deleted = await (channel as any).bulkDelete(count, true);
      await interaction.editReply({ content: `Deleted ${deleted.size} messages.` });
    } catch (error: any) {
      logger.error(`/clear error: ${error.message}`);
      await interaction.editReply({ content: `Failed to clear messages: ${error.message}` });
    }
  }
}
