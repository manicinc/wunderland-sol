/**
 * @file modal.handler.ts
 * @description Handles modal submissions (ticket creation form).
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  type ModalSubmitInteraction,
  type TextChannel,
  ChannelType,
  EmbedBuilder,
} from 'discord.js';
import { TicketBridgeService } from '../services/ticket-bridge.service.js';
import { MODAL_IDS, MODAL_FIELD_IDS, BRAND_COLOR, KNOWN_CHANNELS } from '../discord-bot.constants.js';

@Injectable()
export class ModalHandler {
  private readonly logger = new Logger('ModalHandler');

  constructor(@Inject(TicketBridgeService) private readonly ticketBridge: TicketBridgeService) {}

  async handle(interaction: ModalSubmitInteraction): Promise<void> {
    if (interaction.customId === MODAL_IDS.TICKET_CREATE) {
      return this.handleTicketCreate(interaction);
    }
  }

  private async handleTicketCreate(interaction: ModalSubmitInteraction): Promise<void> {
    const subject = interaction.fields.getTextInputValue(MODAL_FIELD_IDS.TICKET_SUBJECT);
    const category = interaction.fields.getTextInputValue(MODAL_FIELD_IDS.TICKET_CATEGORY) || '';
    const description = interaction.fields.getTextInputValue(MODAL_FIELD_IDS.TICKET_DESCRIPTION);

    if (!interaction.guild) {
      await interaction.reply({ content: 'Tickets can only be created in a server.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Find the #create-ticket channel (or use the current channel)
      let ticketChannel = interaction.guild.channels.cache.find(
        c => c.name === KNOWN_CHANNELS.CREATE_TICKET.toLowerCase() && c.type === ChannelType.GuildText,
      ) as TextChannel | undefined;

      if (!ticketChannel) {
        // Fallback: use current channel if it's a text channel
        if (interaction.channel?.type === ChannelType.GuildText) {
          ticketChannel = interaction.channel as TextChannel;
        } else {
          await interaction.editReply({ content: 'Could not find a channel to create the ticket thread in.' });
          return;
        }
      }

      const { ticketId, thread } = await this.ticketBridge.createTicketFromDiscord(
        interaction.user,
        interaction.guild,
        ticketChannel,
        subject,
        category,
        description,
      );

      const embed = new EmbedBuilder()
        .setTitle('Ticket Created')
        .setDescription([
          `Your ticket has been created and a private thread has been opened.`,
          '',
          `**Ticket ID:** \`${ticketId.slice(0, 8)}\``,
          `**Thread:** <#${thread.id}>`,
          '',
          'Our AI assistant will provide an initial response, and the team will follow up.',
        ].join('\n'))
        .setColor(BRAND_COLOR);

      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      this.logger.error(`Ticket creation failed: ${error.message}`, error.stack);
      await interaction.editReply({
        content: 'Failed to create the ticket. Please try again or contact us at hi@rabbithole.inc.',
      });
    }
  }
}
