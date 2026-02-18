/**
 * @file server-setup.service.ts
 * @description Idempotent guild auto-setup: creates roles, categories, channels,
 * permission overwrites, and welcome/ticket embeds for the Rabbit Hole Inc server.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  type Guild,
  type Role,
  ChannelType,
  PermissionFlagsBits,
  OverwriteType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import {
  ROLES,
  CATEGORIES,
  TIER_HIERARCHY,
  WELCOME_EMBED,
  TICKET_EMBED,
  BRAND_COLOR,
  BUTTON_IDS,
  KNOWN_CHANNELS,
  FAQ_EMBEDS,
  VERIFY_EMBED,
  GETTING_STARTED_EMBED,
  NPM_PACKAGE_EMBED,
  LINKS_EMBED,
  LOCAL_DEV_EMBED,
  type RoleDefinition,
  type CategoryDefinition,
  type ChannelDefinition,
} from '../discord-bot.constants.js';

interface SetupResult {
  rolesCreated: string[];
  rolesSkipped: string[];
  categoriesCreated: string[];
  channelsCreated: string[];
  channelsSkipped: string[];
  errors: string[];
}

@Injectable()
export class ServerSetupService {
  private readonly logger = new Logger('DiscordSetup');

  async setupGuild(guild: Guild): Promise<SetupResult> {
    const result: SetupResult = {
      rolesCreated: [],
      rolesSkipped: [],
      categoriesCreated: [],
      channelsCreated: [],
      channelsSkipped: [],
      errors: [],
    };

    // Pre-check: ensure the bot has required permissions
    const me = guild.members.me;
    if (!me) {
      result.errors.push('Bot member not found in guild cache. Try again in a moment.');
      return result;
    }

    const missing: string[] = [];
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) missing.push('Manage Roles');
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) missing.push('Manage Channels');
    if (!me.permissions.has(PermissionFlagsBits.SendMessages)) missing.push('Send Messages');

    if (missing.length > 0) {
      result.errors.push(
        `Bot is missing permissions: ${missing.join(', ')}. ` +
        `Go to Server Settings → Integrations → Rabbit Hole AI → ` +
        `enable these permissions, or re-invite with Administrator.`,
      );
      this.logger.warn(`Missing permissions: ${missing.join(', ')}`);
      return result;
    }

    this.logger.log(`Bot permissions OK. Highest role: "${me.roles.highest.name}" (pos ${me.roles.highest.position})`);

    // 1. Create roles
    const roleMap = await this.createRoles(guild, result);

    // 2. Create categories and channels
    for (const categoryDef of CATEGORIES) {
      await this.createCategory(guild, categoryDef, roleMap, result);
    }

    // 2b. Clean up orphaned default channels (e.g. bare "general" outside any category)
    await this.cleanupOrphanedDefaults(guild, result);

    // 3. Post welcome embed in #rules-and-info
    await this.postWelcomeEmbed(guild, result);

    // 4. Post ticket embed in #create-ticket
    await this.postTicketEmbed(guild, result);

    // 5. Post FAQ embeds in #faq
    await this.postFaqEmbeds(guild, result);

    // 6. Post verify embed in #verify
    await this.postVerifyEmbed(guild, result);

    // 7. Post Wunderland onboarding guides
    await this.postOnboardingGuides(guild, result);

    this.logger.log(
      `Setup complete: ${result.rolesCreated.length} roles created, ` +
      `${result.categoriesCreated.length} categories created, ` +
      `${result.channelsCreated.length} channels created, ` +
      `${result.errors.length} errors`,
    );

    return result;
  }

  // ---------------------------------------------------------------------------
  // Roles
  // ---------------------------------------------------------------------------

  private async createRoles(
    guild: Guild,
    result: SetupResult,
  ): Promise<Map<string, Role>> {
    const roleMap = new Map<string, Role>();
    const existingRoles = guild.roles.cache;

    for (const roleDef of ROLES) {
      const existing = existingRoles.find(r => r.name === roleDef.name);
      if (existing) {
        roleMap.set(roleDef.name, existing);
        result.rolesSkipped.push(roleDef.name);
        continue;
      }

      try {
        const role = await guild.roles.create({
          name: roleDef.name,
          color: roleDef.color,
          hoist: roleDef.hoist,
          reason: 'Rabbit Hole AI server setup',
        });
        roleMap.set(roleDef.name, role);
        result.rolesCreated.push(roleDef.name);
      } catch (error: any) {
        result.errors.push(`Role "${roleDef.name}": ${error.message}`);
      }
    }

    return roleMap;
  }

  // ---------------------------------------------------------------------------
  // Categories & Channels
  // ---------------------------------------------------------------------------

  private async createCategory(
    guild: Guild,
    categoryDef: CategoryDefinition,
    roleMap: Map<string, Role>,
    result: SetupResult,
  ): Promise<void> {
    // Check if category already exists
    let category = guild.channels.cache.find(
      c => c.name === categoryDef.name && c.type === ChannelType.GuildCategory,
    );

    if (!category) {
      try {
        const permissionOverwrites = this.buildCategoryOverwrites(guild, categoryDef, roleMap);
        category = await guild.channels.create({
          name: categoryDef.name,
          type: ChannelType.GuildCategory,
          permissionOverwrites,
          reason: 'Rabbit Hole AI server setup',
        });
        result.categoriesCreated.push(categoryDef.name);
      } catch (error: any) {
        result.errors.push(`Category "${categoryDef.name}": ${error.message}`);
        return;
      }
    }

    // Create channels within the category
    for (const channelDef of categoryDef.channels) {
      await this.createChannel(guild, channelDef, category.id, categoryDef, roleMap, result);
    }
  }

  private buildCategoryOverwrites(
    guild: Guild,
    categoryDef: CategoryDefinition,
    roleMap: Map<string, Role>,
  ): Array<{ id: string; type: OverwriteType; allow?: bigint; deny?: bigint }> {
    const overwrites: Array<{ id: string; type: OverwriteType; allow?: bigint; deny?: bigint }> = [];

    if (categoryDef.roleGate) {
      // Deny @everyone from viewing this category
      overwrites.push({
        id: guild.id, // @everyone role ID = guild ID
        type: OverwriteType.Role,
        deny: PermissionFlagsBits.ViewChannel,
      });

      // Allow the gated role and all higher-tier roles
      const gateIndex = TIER_HIERARCHY.indexOf(categoryDef.roleGate as typeof TIER_HIERARCHY[number]);
      if (gateIndex !== -1) {
        for (let i = 0; i <= gateIndex; i++) {
          const role = roleMap.get(TIER_HIERARCHY[i]);
          if (role) {
            overwrites.push({
              id: role.id,
              type: OverwriteType.Role,
              allow: PermissionFlagsBits.ViewChannel,
            });
          }
        }
      }

      // Also allow Wunderbot role to see (the bot needs access)
      const botRole = roleMap.get('Wunderbot');
      if (botRole) {
        overwrites.push({
          id: botRole.id,
          type: OverwriteType.Role,
          allow: PermissionFlagsBits.ViewChannel,
        });
      }
    }

    return overwrites;
  }

  private async createChannel(
    guild: Guild,
    channelDef: ChannelDefinition,
    parentId: string,
    categoryDef: CategoryDefinition,
    roleMap: Map<string, Role>,
    result: SetupResult,
  ): Promise<void> {
    const isVoice = channelDef.type === 'voice';
    const channelType = isVoice ? ChannelType.GuildVoice : ChannelType.GuildText;

    // Check if channel already exists in this category
    const existing = guild.channels.cache.find(
      c => c.name === channelDef.name.toLowerCase().replace(/\s+/g, '-') && c.parentId === parentId,
    );
    if (existing) {
      result.channelsSkipped.push(channelDef.name);
      return;
    }

    // Also check with the original name for voice channels
    if (isVoice) {
      const existingVoice = guild.channels.cache.find(
        c => c.name === channelDef.name && c.parentId === parentId,
      );
      if (existingVoice) {
        result.channelsSkipped.push(channelDef.name);
        return;
      }
    }

    try {
      const permissionOverwrites: Array<{ id: string; type: OverwriteType; allow?: bigint; deny?: bigint }> = [];

      // Read-only channels: deny @everyone SendMessages
      if (channelDef.readOnly && !isVoice) {
        permissionOverwrites.push({
          id: guild.id,
          type: OverwriteType.Role,
          deny: PermissionFlagsBits.SendMessages,
        });
      }

      await guild.channels.create({
        name: channelDef.name,
        type: channelType,
        parent: parentId,
        topic: channelDef.topic,
        permissionOverwrites: permissionOverwrites.length > 0 ? permissionOverwrites : undefined,
        reason: 'Rabbit Hole AI server setup',
      });
      result.channelsCreated.push(channelDef.name);
    } catch (error: any) {
      result.errors.push(`Channel "${channelDef.name}": ${error.message}`);
    }
  }

  /**
   * Handle orphaned default channels (e.g. bare "general" outside any category).
   * Discord's default "general" is often the system channel and can't be deleted,
   * so we MOVE it into the COMMUNITY category and RENAME it with the emoji prefix.
   * If a duplicate emoji-prefixed version already exists, we delete that one instead
   * and keep the system channel (just renamed and moved).
   */
  private async cleanupOrphanedDefaults(guild: Guild, result: SetupResult): Promise<void> {
    // Find the COMMUNITY category
    const communityCategory = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.includes('COMMUNITY'),
    );

    // Handle orphaned "general" channel
    const orphanGeneral = guild.channels.cache.find(
      c => c.name === 'general' && (!c.parentId || c.parent?.name === 'Text Channels') && c.type === ChannelType.GuildText,
    );

    if (orphanGeneral && communityCategory) {
      const emojiName = '\u{1F4AC}-general'; // 💬-general
      const emojiNameLower = emojiName.toLowerCase();

      // Check if there's already an emoji-prefixed duplicate inside COMMUNITY
      const duplicate = guild.channels.cache.find(
        c => c.name === emojiNameLower && c.parentId === communityCategory.id && c.id !== orphanGeneral.id,
      );

      // Delete the duplicate if it exists (keep the system channel)
      if (duplicate) {
        try {
          await duplicate.delete('Rabbit Hole AI cleanup: moving system channel into its place');
          this.logger.log('Deleted duplicate emoji-prefixed #general');
        } catch (error: any) {
          result.errors.push(`Cleanup duplicate general: ${error.message}`);
        }
      }

      // Move and rename the orphaned system channel
      try {
        await orphanGeneral.edit({
          name: emojiName,
          parent: communityCategory.id,
          topic: 'Main chat \u2014 talk about anything',
          reason: 'Rabbit Hole AI: moving default general into COMMUNITY category',
        });
        this.logger.log('Moved and renamed orphaned #general → 💬-general in COMMUNITY');
      } catch (error: any) {
        result.errors.push(`Move general: ${error.message}`);
      }
    }

    // Clean up empty "Text Channels" default category
    const defaultCategory = guild.channels.cache.find(
      c => c.name === 'Text Channels' && c.type === ChannelType.GuildCategory,
    );
    if (defaultCategory) {
      // Re-fetch to see updated parents after moving channels
      await guild.channels.fetch();
      const childCount = guild.channels.cache.filter(c => c.parentId === defaultCategory.id).size;
      if (childCount === 0) {
        try {
          await defaultCategory.delete('Rabbit Hole AI cleanup: empty default category');
          this.logger.log('Cleaned up empty "Text Channels" default category');
        } catch (error: any) {
          result.errors.push(`Cleanup "Text Channels": ${error.message}`);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Welcome & Ticket Embeds
  // ---------------------------------------------------------------------------

  private findChannelByKnownName(guild: Guild, knownName: string): ReturnType<typeof guild.channels.cache.find> {
    // Discord lowercases text channel names, so compare lowercased
    const lower = knownName.toLowerCase();
    return guild.channels.cache.find(
      c => c.name === lower && c.type === ChannelType.GuildText,
    );
  }

  private async postWelcomeEmbed(guild: Guild, result: SetupResult): Promise<void> {
    const channel = this.findChannelByKnownName(guild, KNOWN_CHANNELS.RULES_AND_INFO);
    if (!channel || !channel.isTextBased()) return;

    try {
      const messages = await channel.messages.fetch({ limit: 10 });
      const botMessage = messages.find(
        m => m.author.id === guild.client.user?.id && m.embeds.some(e => e.title === WELCOME_EMBED.title),
      );
      if (botMessage) return;

      const embed = new EmbedBuilder()
        .setTitle(WELCOME_EMBED.title)
        .setDescription(WELCOME_EMBED.description)
        .setColor(WELCOME_EMBED.color)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error: any) {
      result.errors.push(`Welcome embed: ${error.message}`);
    }
  }

  private async postTicketEmbed(guild: Guild, result: SetupResult): Promise<void> {
    const channel = this.findChannelByKnownName(guild, KNOWN_CHANNELS.CREATE_TICKET);
    if (!channel || !channel.isTextBased()) return;

    try {
      const messages = await channel.messages.fetch({ limit: 10 });
      const botMessage = messages.find(
        m => m.author.id === guild.client.user?.id && m.embeds.some(e => e.title === TICKET_EMBED.title),
      );
      if (botMessage) return;

      const embed = new EmbedBuilder()
        .setTitle(TICKET_EMBED.title)
        .setDescription(TICKET_EMBED.description)
        .setColor(TICKET_EMBED.color)
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(BUTTON_IDS.TICKET_CREATE)
          .setLabel('Create Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('\u{1F3AB}'),
      );

      await channel.send({ embeds: [embed], components: [row] });
    } catch (error: any) {
      result.errors.push(`Ticket embed: ${error.message}`);
    }
  }

  private async postFaqEmbeds(guild: Guild, result: SetupResult): Promise<void> {
    const channel = this.findChannelByKnownName(guild, KNOWN_CHANNELS.FAQ);
    if (!channel || !channel.isTextBased()) return;

    try {
      // Check if bot already posted FAQ (check for first FAQ title)
      const messages = await channel.messages.fetch({ limit: 20 });
      const botMessage = messages.find(
        m => m.author.id === guild.client.user?.id && m.embeds.some(e => e.title === FAQ_EMBEDS[0]?.title),
      );
      if (botMessage) return;

      // Post each FAQ as a separate embed message
      for (const faq of FAQ_EMBEDS) {
        const embed = new EmbedBuilder()
          .setTitle(faq.title)
          .setDescription(faq.description)
          .setColor(BRAND_COLOR);
        await channel.send({ embeds: [embed] });
      }

      this.logger.log(`Posted ${FAQ_EMBEDS.length} FAQ embeds`);
    } catch (error: any) {
      result.errors.push(`FAQ embeds: ${error.message}`);
    }
  }

  private async postOnboardingGuides(guild: Guild, result: SetupResult): Promise<void> {
    const guideMap: Array<{ channelName: string; embed: { title: string; description: string; color: number } }> = [
      { channelName: KNOWN_CHANNELS.GETTING_STARTED, embed: GETTING_STARTED_EMBED },
      { channelName: KNOWN_CHANNELS.NPM_PACKAGE, embed: NPM_PACKAGE_EMBED },
      { channelName: KNOWN_CHANNELS.LINKS, embed: LINKS_EMBED },
      { channelName: KNOWN_CHANNELS.LOCAL_DEV, embed: LOCAL_DEV_EMBED },
    ];

    for (const { channelName, embed: embedData } of guideMap) {
      const channel = this.findChannelByKnownName(guild, channelName);
      if (!channel || !channel.isTextBased()) continue;

      try {
        const messages = await channel.messages.fetch({ limit: 5 });
        const alreadyPosted = messages.find(
          m => m.author.id === guild.client.user?.id && m.embeds.some(e => e.title === embedData.title),
        );
        if (alreadyPosted) continue;

        const embed = new EmbedBuilder()
          .setTitle(embedData.title)
          .setDescription(embedData.description)
          .setColor(embedData.color)
          .setTimestamp();
        await channel.send({ embeds: [embed] });
      } catch (error: any) {
        result.errors.push(`Guide "${channelName}": ${error.message}`);
      }
    }
  }

  private async postVerifyEmbed(guild: Guild, result: SetupResult): Promise<void> {
    const channel = this.findChannelByKnownName(guild, KNOWN_CHANNELS.VERIFY);
    if (!channel || !channel.isTextBased()) return;

    try {
      const messages = await channel.messages.fetch({ limit: 10 });
      const botMessage = messages.find(
        m => m.author.id === guild.client.user?.id && m.embeds.some(e => e.title === VERIFY_EMBED.title),
      );
      if (botMessage) return;

      const embed = new EmbedBuilder()
        .setTitle(VERIFY_EMBED.title)
        .setDescription(VERIFY_EMBED.description)
        .setColor(VERIFY_EMBED.color)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error: any) {
      result.errors.push(`Verify embed: ${error.message}`);
    }
  }
}
