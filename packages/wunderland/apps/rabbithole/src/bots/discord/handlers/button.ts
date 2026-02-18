/**
 * @file button.ts
 * @description Handles Discord button interactions.
 */

import {
  type ButtonInteraction,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import {
  BUTTON_IDS,
  MODAL_IDS,
  MODAL_FIELD_IDS,
  PRICING_EMBED,
} from '../constants';
import { AiResponderService } from '../ai-responder';
import { BotLogger } from '../../shared/logger';

const logger = new BotLogger('ButtonHandler');

export class ButtonHandler {
  constructor(private readonly aiResponder: AiResponderService) {}

  async handle(interaction: ButtonInteraction): Promise<void> {
    const { customId } = interaction;

    switch (customId) {
      case BUTTON_IDS.TICKET_CREATE:
        return this.handleTicketCreate(interaction);
      case BUTTON_IDS.HELP_PRICING:
        return this.handleHelpPricing(interaction);
      case BUTTON_IDS.HELP_DOCS:
        return this.handleHelpDocs(interaction);
      case BUTTON_IDS.HELP_TICKET:
        return this.handleTicketCreate(interaction);
      case BUTTON_IDS.HELP_FAQ:
        return this.handleHelpFaq(interaction);
      default:
        logger.warn(`Unknown button: ${customId}`);
        await interaction.reply({ content: 'Unknown button action.', ephemeral: true });
    }
  }

  private async handleTicketCreate(interaction: ButtonInteraction): Promise<void> {
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

  private async handleHelpPricing(interaction: ButtonInteraction): Promise<void> {
    await interaction.reply({ embeds: [PRICING_EMBED], ephemeral: true });
  }

  private async handleHelpDocs(interaction: ButtonInteraction): Promise<void> {
    await interaction.reply({
      content: 'Use `/docs <topic>` to search the documentation, or visit https://wunderland.sh/docs',
      ephemeral: true,
    });
  }

  private async handleHelpFaq(interaction: ButtonInteraction): Promise<void> {
    await interaction.reply({
      content: 'Use `/faq <question>` to search frequently asked questions.',
      ephemeral: true,
    });
  }
}
