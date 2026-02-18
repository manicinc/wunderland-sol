/**
 * @file modal.ts
 * @description Handles Discord modal submit interactions (ticket creation).
 */

import { type ModalSubmitInteraction, EmbedBuilder } from 'discord.js';
import { BRAND_COLOR, MODAL_IDS, MODAL_FIELD_IDS } from '../constants';
import { TicketBridgeService } from '../ticket-bridge';
import { BotLogger } from '../../shared/logger';

const logger = new BotLogger('ModalHandler');

export class ModalHandler {
  constructor(private readonly ticketBridge: TicketBridgeService) {}

  async handle(interaction: ModalSubmitInteraction): Promise<void> {
    if (interaction.customId === MODAL_IDS.TICKET_CREATE) {
      return this.handleTicketCreate(interaction);
    }

    logger.warn(`Unknown modal: ${interaction.customId}`);
    await interaction.reply({ content: 'Unknown form.', ephemeral: true });
  }

  private async handleTicketCreate(interaction: ModalSubmitInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const subject = interaction.fields.getTextInputValue(MODAL_FIELD_IDS.TICKET_SUBJECT);
    const category = interaction.fields.getTextInputValue(MODAL_FIELD_IDS.TICKET_CATEGORY) || 'other';
    const description = interaction.fields.getTextInputValue(MODAL_FIELD_IDS.TICKET_DESCRIPTION);

    try {
      const channel = interaction.channel;
      if (!channel || !('threads' in channel)) {
        await interaction.editReply({ content: 'Cannot create tickets in this channel.' });
        return;
      }

      const thread = await (channel as any).threads.create({
        name: `Ticket: ${subject.substring(0, 90)}`,
        autoArchiveDuration: 10080, // 7 days
        reason: 'Support ticket from Discord',
      });

      const result = await this.ticketBridge.createTicketFromDiscord({
        threadId: thread.id,
        guildId: interaction.guildId || '',
        userId: interaction.user.id,
        userName: interaction.user.username,
        subject,
        category,
        description,
      });

      if (!result) {
        await interaction.editReply({ content: 'Failed to create the ticket. Please try again.' });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle(`Ticket: ${subject}`)
        .setDescription(
          `**Category:** ${category}\n**Ticket ID:** ${result.ticketId}\n\n${description}`,
        )
        .setFooter({ text: `Created by ${interaction.user.username}` })
        .setTimestamp();

      await thread.send({ embeds: [embed] });

      if (result.firstResponse) {
        await thread.send({ content: `**AI Assistant:** ${result.firstResponse}` });
      }

      await interaction.editReply({
        content: `Ticket created! Check ${thread.toString()} for updates.`,
      });
    } catch (error: any) {
      logger.error(`Ticket creation error: ${error.message}`, error.stack);
      await interaction.editReply({ content: `Failed to create ticket: ${error.message}` });
    }
  }
}
