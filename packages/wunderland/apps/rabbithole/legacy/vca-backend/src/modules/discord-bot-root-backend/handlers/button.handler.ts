/**
 * @file button.handler.ts
 * @description Handles button interactions (ticket creation, help menu actions).
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  type ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} from 'discord.js';
import { BUTTON_IDS, MODAL_IDS, MODAL_FIELD_IDS, PRICING_EMBED, BRAND_COLOR } from '../discord-bot.constants.js';

@Injectable()
export class ButtonHandler {
  private readonly logger = new Logger('ButtonHandler');

  async handle(interaction: ButtonInteraction): Promise<void> {
    switch (interaction.customId) {
      case BUTTON_IDS.TICKET_CREATE:
      case BUTTON_IDS.HELP_TICKET:
        return this.showTicketModal(interaction);

      case BUTTON_IDS.HELP_PRICING:
        return this.showPricing(interaction);

      case BUTTON_IDS.HELP_DOCS:
        return this.showDocsHelp(interaction);
    }
  }

  private async showTicketModal(interaction: ButtonInteraction): Promise<void> {
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

  private async showPricing(interaction: ButtonInteraction): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle(PRICING_EMBED.title)
      .setDescription(PRICING_EMBED.description)
      .setColor(PRICING_EMBED.color)
      .addFields(PRICING_EMBED.fields)
      .setFooter(PRICING_EMBED.footer);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  private async showDocsHelp(interaction: ButtonInteraction): Promise<void> {
    await interaction.reply({
      content: [
        '**Search our documentation:**',
        '- `/docs <topic>` — Search docs by keyword',
        '- `/faq <question>` — AI-powered FAQ (answers from docs)',
        '- `/ask <question>` — Ask anything about the platform',
        '',
        'Full documentation: https://docs.wunderland.sh',
      ].join('\n'),
      ephemeral: true,
    });
  }
}
