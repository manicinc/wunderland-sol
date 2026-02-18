/**
 * @file slash-commands.handler.ts
 * @description Dispatches slash command interactions to the appropriate service methods.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from 'discord.js';
import { ServerSetupService } from '../services/server-setup.service.js';
import { KnowledgeBaseService } from '../services/knowledge-base.service.js';
import { AiResponderService } from '../services/ai-responder.service.js';
import { TicketBridgeService } from '../services/ticket-bridge.service.js';
import { BRAND_COLOR, PRICING_EMBED, BUTTON_IDS, MODAL_IDS, MODAL_FIELD_IDS, TIER_HIERARCHY } from '../discord-bot.constants.js';
import { getAppDatabase } from '../../../core/database/appDatabase.js';
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

@Injectable()
export class SlashCommandsHandler {
  private readonly logger = new Logger('SlashCommands');

  constructor(
    @Inject(ServerSetupService) private readonly setupService: ServerSetupService,
    @Inject(KnowledgeBaseService) private readonly knowledgeBase: KnowledgeBaseService,
    @Inject(AiResponderService) private readonly aiResponder: AiResponderService,
    @Inject(TicketBridgeService) private readonly ticketBridge: TicketBridgeService,
  ) {}

  async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    switch (interaction.commandName) {
      case 'setup':   return this.handleSetup(interaction);
      case 'faq':     return this.handleFaq(interaction);
      case 'help':    return this.handleHelp(interaction);
      case 'ticket':  return this.handleTicket(interaction);
      case 'pricing': return this.handlePricing(interaction);
      case 'docs':    return this.handleDocs(interaction);
      case 'ask':     return this.handleAsk(interaction);
      case 'verify':  return this.handleVerify(interaction);
    }
  }

  // ---------------------------------------------------------------------------
  // /setup
  // ---------------------------------------------------------------------------

  private async handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
    // Admin check: user must have Administrator permission or Founder role
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      const member = interaction.guild?.members.cache.get(interaction.user.id);
      const hasFounderRole = member?.roles.cache.some(r => r.name === 'Founder');
      if (!hasFounderRole) {
        await interaction.reply({ content: 'Only admins and Founders can run /setup.', ephemeral: true });
        return;
      }
    }

    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const result = await this.setupService.setupGuild(interaction.guild);

    // If setup failed with permission errors before creating anything, show a clear diagnostic
    const nothingCreated =
      result.rolesCreated.length === 0 &&
      result.categoriesCreated.length === 0 &&
      result.channelsCreated.length === 0;

    if (nothingCreated && result.errors.length > 0) {
      const embed = new EmbedBuilder()
        .setTitle('Setup Failed — Missing Permissions')
        .setDescription(result.errors.join('\n\n'))
        .setColor(0xFF0000)
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Server Setup Complete')
      .setColor(BRAND_COLOR)
      .addFields(
        {
          name: 'Roles Created',
          value: result.rolesCreated.length > 0 ? result.rolesCreated.join(', ') : 'None (all existed)',
          inline: false,
        },
        {
          name: 'Categories Created',
          value: result.categoriesCreated.length > 0 ? result.categoriesCreated.join(', ') : 'None (all existed)',
          inline: false,
        },
        {
          name: 'Channels Created',
          value: result.channelsCreated.length > 0
            ? result.channelsCreated.join(', ')
            : 'None (all existed)',
          inline: false,
        },
      )
      .setTimestamp();

    if (result.errors.length > 0) {
      embed.addFields({
        name: 'Errors',
        value: result.errors.slice(0, 5).join('\n'),
        inline: false,
      });
    }

    const summary =
      `${result.rolesCreated.length} roles, ` +
      `${result.categoriesCreated.length} categories, ` +
      `${result.channelsCreated.length} channels created. ` +
      `${result.rolesSkipped.length + result.channelsSkipped.length} items already existed.`;

    embed.setDescription(summary);

    await interaction.editReply({ embeds: [embed] });
  }

  // ---------------------------------------------------------------------------
  // /faq <question>
  // ---------------------------------------------------------------------------

  private async handleFaq(interaction: ChatInputCommandInteraction): Promise<void> {
    const question = interaction.options.getString('question', true);
    await interaction.deferReply();

    const answer = await this.aiResponder.answerFaq(question);

    const embed = new EmbedBuilder()
      .setTitle('FAQ')
      .setDescription(answer)
      .setColor(BRAND_COLOR)
      .setFooter({ text: 'Powered by Rabbit Hole AI docs' });

    await interaction.editReply({ embeds: [embed] });
  }

  // ---------------------------------------------------------------------------
  // /help
  // ---------------------------------------------------------------------------

  private async handleHelp(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('Rabbit Hole AI — Help')
      .setDescription([
        'Here\'s what I can do:',
        '',
        '**Commands**',
        '`/faq <question>` \u2014 AI-powered FAQ from our docs',
        '`/ask <question>` \u2014 Ask me anything about the platform',
        '`/docs <topic>` \u2014 Search the documentation',
        '`/ticket create` \u2014 Create a support ticket',
        '`/ticket status <id>` \u2014 Check ticket status',
        '`/verify <email>` \u2014 Link your account & get your tier role',
        '`/pricing` \u2014 View pricing tiers',
        '`/setup` \u2014 Set up the server (admin only)',
        '',
        '**Quick Actions**',
        'Use the buttons below for common tasks.',
      ].join('\n'))
      .setColor(BRAND_COLOR);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(BUTTON_IDS.HELP_TICKET)
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫'),
      new ButtonBuilder()
        .setCustomId(BUTTON_IDS.HELP_PRICING)
        .setLabel('View Pricing')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('💰'),
      new ButtonBuilder()
        .setCustomId(BUTTON_IDS.HELP_DOCS)
        .setLabel('Search Docs')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📖'),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  // ---------------------------------------------------------------------------
  // /ticket
  // ---------------------------------------------------------------------------

  private async handleTicket(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
      return this.showTicketModal(interaction);
    }

    if (subcommand === 'status') {
      const ticketId = interaction.options.getString('id', true);
      await interaction.deferReply({ ephemeral: true });

      const result = await this.ticketBridge.getTicketStatus(ticketId);

      if (!result.found) {
        await interaction.editReply({ content: `No ticket found matching ID \`${ticketId}\`.` });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`Ticket Status`)
        .addFields(
          { name: 'Subject', value: result.subject || 'N/A', inline: false },
          { name: 'Status', value: result.status || 'unknown', inline: true },
          { name: 'Category', value: result.category || 'general', inline: true },
          { name: 'Priority', value: result.priority || 'normal', inline: true },
        )
        .setColor(BRAND_COLOR)
        .setTimestamp(result.createdAt ? new Date(result.createdAt) : undefined);

      await interaction.editReply({ embeds: [embed] });
    }
  }

  private async showTicketModal(interaction: ChatInputCommandInteraction): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId(MODAL_IDS.TICKET_CREATE)
      .setTitle('Create Support Ticket');

    const subjectInput = new TextInputBuilder()
      .setCustomId(MODAL_FIELD_IDS.TICKET_SUBJECT)
      .setLabel('Subject')
      .setPlaceholder('Brief description of your issue')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(200);

    const categoryInput = new TextInputBuilder()
      .setCustomId(MODAL_FIELD_IDS.TICKET_CATEGORY)
      .setLabel('Category (bug/feature/billing/integration/general)')
      .setPlaceholder('general')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(20);

    const descriptionInput = new TextInputBuilder()
      .setCustomId(MODAL_FIELD_IDS.TICKET_DESCRIPTION)
      .setLabel('Description')
      .setPlaceholder('Describe your issue in detail. Include steps to reproduce if it\'s a bug.')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(2000);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(subjectInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(categoryInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
    );

    await interaction.showModal(modal);
  }

  // ---------------------------------------------------------------------------
  // /pricing
  // ---------------------------------------------------------------------------

  private async handlePricing(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle(PRICING_EMBED.title)
      .setDescription(PRICING_EMBED.description)
      .setColor(PRICING_EMBED.color)
      .addFields(PRICING_EMBED.fields)
      .setFooter(PRICING_EMBED.footer);

    await interaction.reply({ embeds: [embed] });
  }

  // ---------------------------------------------------------------------------
  // /docs <topic>
  // ---------------------------------------------------------------------------

  private async handleDocs(interaction: ChatInputCommandInteraction): Promise<void> {
    const topic = interaction.options.getString('topic', true);
    const results = this.knowledgeBase.searchDocs(topic, 3);

    if (results.length === 0) {
      await interaction.reply({
        content: `No documentation found for "${topic}". Try a different search term or use \`/faq\` for AI-powered answers.`,
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Docs: "${topic}"`)
      .setColor(BRAND_COLOR)
      .setFooter({ text: 'Full docs at docs.wunderland.sh' });

    for (const r of results) {
      embed.addFields({
        name: `${r.title} > ${r.section}`,
        value: r.excerpt,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  }

  // ---------------------------------------------------------------------------
  // /ask <question>
  // ---------------------------------------------------------------------------

  private async handleAsk(interaction: ChatInputCommandInteraction): Promise<void> {
    const question = interaction.options.getString('question', true);
    await interaction.deferReply();

    const answer = await this.aiResponder.answerGeneral(question);

    const embed = new EmbedBuilder()
      .setDescription(answer)
      .setColor(BRAND_COLOR)
      .setFooter({ text: 'Rabbit Hole AI' });

    await interaction.editReply({ embeds: [embed] });
  }

  // ---------------------------------------------------------------------------
  // /verify <email>
  // ---------------------------------------------------------------------------

  private async handleVerify(interaction: ChatInputCommandInteraction): Promise<void> {
    const email = interaction.options.getString('email', true).trim().toLowerCase();
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.guild || !interaction.member) {
      await interaction.editReply({ content: 'This command can only be used in a server.' });
      return;
    }

    try {
      const db = getAppDatabase();
      const user = await db.get(
        'SELECT id, email, subscription_status, subscription_tier FROM app_users WHERE LOWER(email) = ?',
        [email],
      );

      if (!user) {
        await interaction.editReply({
          content: [
            `No Rabbit Hole account found for **${email}**.`,
            '',
            'Make sure you\'re using the same email you signed up with at [rabbithole.inc](https://rabbithole.inc).',
          ].join('\n'),
        });
        return;
      }

      const status = (user as any).subscription_status as string;
      const tier = (user as any).subscription_tier as string;

      // Store discord user ID on the account
      await db.run(
        'UPDATE app_users SET discord_user_id = ? WHERE id = ?',
        [interaction.user.id, (user as any).id],
      );

      // Map subscription tier to role name
      const tierToRole: Record<string, string> = {
        starter: 'Starter',
        pro: 'Pro',
        enterprise: 'Enterprise',
      };

      const isActive = status === 'active' || status === 'trialing';
      const roleName = tierToRole[tier];

      if (!isActive || !roleName) {
        const embed = new EmbedBuilder()
          .setTitle('\u2705 Account Linked')
          .setDescription([
            `Your Discord account is now linked to **${email}**.`,
            '',
            `**Subscription:** ${status || 'none'}`,
            `**Tier:** ${tier || 'none'}`,
            '',
            isActive
              ? 'Your tier doesn\'t have a matching role.'
              : 'Your subscription is not currently active. Subscribe at [rabbithole.inc/pricing](https://rabbithole.inc/pricing) to get a tier role.',
          ].join('\n'))
          .setColor(BRAND_COLOR);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Assign the role
      const member = interaction.guild.members.cache.get(interaction.user.id)
        || await interaction.guild.members.fetch(interaction.user.id);

      const role = interaction.guild.roles.cache.find(r => r.name === roleName);
      if (!role) {
        await interaction.editReply({
          content: `Account linked, but the **${roleName}** role doesn't exist yet. Ask an admin to run \`/setup\` first.`,
        });
        return;
      }

      // Remove any existing tier roles first, then add the new one
      const tierRoleNames = Object.values(tierToRole);
      const existingTierRoles = member.roles.cache.filter(r => tierRoleNames.includes(r.name));
      for (const [, existing] of existingTierRoles) {
        await member.roles.remove(existing, 'Tier role update via /verify');
      }
      await member.roles.add(role, `Verified as ${tier} subscriber`);

      const embed = new EmbedBuilder()
        .setTitle('\u2705 Verified!')
        .setDescription([
          `Your Discord account is now linked to **${email}**.`,
          '',
          `**Subscription:** ${status}`,
          `**Role assigned:** ${roleName}`,
          '',
          'You now have access to your tier-gated support channels.',
        ].join('\n'))
        .setColor(BRAND_COLOR);

      await interaction.editReply({ embeds: [embed] });
      this.logger.log(`Verified ${interaction.user.tag} as ${roleName} (${email})`);
    } catch (error: any) {
      this.logger.error(`Verify failed: ${error.message}`);
      await interaction.editReply({ content: 'Verification failed. Please try again or contact support.' });
    }
  }
}
