/**
 * @file server-setup.ts
 * @description Sets up Discord server structure: roles, categories, channels.
 * Handles duplicate detection with base-name matching and cleanup.
 *
 * CRITICAL FIXES:
 * - Uses \p{Extended_Pictographic} NOT \p{Emoji} (the latter matches digits 0-9)
 * - normalizeCategoryName strips ALL emoji (not just variation selectors)
 * - Duplicate cleanup scores channels to keep the correct one
 */

import {
  Guild,
  ChannelType,
  PermissionsBitField,
  type GuildChannel,
  type TextChannel,
  type CategoryChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import {
  CATEGORIES,
  ROLES,
  KNOWN_CHANNELS,
  BUTTON_IDS,
  WELCOME_EMBED,
  TICKET_EMBED,
  VERIFY_EMBED,
  FAQ_EMBEDS,
  GETTING_STARTED_EMBED,
  ONBOARDING_EMBED,
  NPM_PACKAGE_EMBED,
  LINKS_EMBED,
  LOCAL_DEV_EMBED,
  type CategoryDefinition,
  type ChannelDefinition,
} from './constants';
import { KnowledgeBaseService } from './knowledge-base';
import { BotLogger } from '../shared/logger';

const logger = new BotLogger('ServerSetup');

export interface SetupResult {
  rolesCreated: string[];
  rolesSkipped: string[];
  categoriesCreated: string[];
  channelsCreated: string[];
  channelsSkipped: string[];
  channelsRenamed: string[];
  channelsMoved: string[];
  channelsDeleted: string[];
  errors: string[];
}

export class ServerSetupService {
  constructor(private readonly knowledgeBase: KnowledgeBaseService) {}

  // --- Main Entry ---

  async setupServer(guild: Guild): Promise<SetupResult> {
    const result: SetupResult = {
      rolesCreated: [],
      rolesSkipped: [],
      categoriesCreated: [],
      channelsCreated: [],
      channelsSkipped: [],
      channelsRenamed: [],
      channelsMoved: [],
      channelsDeleted: [],
      errors: [],
    };

    try {
      await this.createRoles(guild, result);
      await this.createCategoriesAndChannels(guild, result);
      await this.cleanupDuplicateChannels(guild, result);
      await this.cleanupOrphanedDefaults(guild, result);
      await this.postEmbeds(guild);
    } catch (error: any) {
      logger.error(`Setup failed: ${error.message}`, error.stack);
      result.errors.push(error.message);
    }

    return result;
  }

  // --- Name Utils ---

  private extractBaseName(channelName: string): string {
    return channelName
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/[\u{FE0F}\u{200D}\u{20E3}]/gu, '')
      .replace(/[|│┃ǀ]/g, '')
      .replace(/[-\s]+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
      .toLowerCase();
  }

  private normalizeCategoryName(name: string): string {
    return name
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/[\u{FE0F}\u{200D}]/gu, '')
      .trim();
  }

  // --- Roles ---

  private async createRoles(guild: Guild, result: SetupResult): Promise<void> {
    for (const roleDef of ROLES) {
      const existing = guild.roles.cache.find((r) => r.name === roleDef.name);
      if (existing) {
        result.rolesSkipped.push(roleDef.name);
        continue;
      }

      try {
        await guild.roles.create({
          name: roleDef.name,
          color: roleDef.color,
          hoist: roleDef.hoist,
          reason: roleDef.reason || 'Rabbit Hole AI server setup',
        });
        result.rolesCreated.push(roleDef.name);
      } catch (error: any) {
        result.errors.push(`Failed to create role ${roleDef.name}: ${error.message}`);
      }
    }
  }

  // --- Categories & Channels ---

  private async createCategoriesAndChannels(guild: Guild, result: SetupResult): Promise<void> {
    for (const catDef of CATEGORIES) {
      const category = await this.findOrCreateCategory(guild, catDef, result);
      if (!category) continue;

      for (const chanDef of catDef.channels) {
        await this.createChannel(guild, category, chanDef, catDef, result);
      }
    }
  }

  private async findOrCreateCategory(
    guild: Guild,
    catDef: CategoryDefinition,
    result: SetupResult,
  ): Promise<CategoryChannel | null> {
    const normalizedTarget = this.normalizeCategoryName(catDef.name);

    const existing = guild.channels.cache.find(
      (ch) =>
        ch.type === ChannelType.GuildCategory &&
        this.normalizeCategoryName(ch.name) === normalizedTarget,
    ) as CategoryChannel | undefined;

    if (existing) {
      if (existing.name !== catDef.name) {
        try {
          await existing.setName(catDef.name);
          logger.log(`Renamed category "${existing.name}" -> "${catDef.name}"`);
        } catch (error: any) {
          logger.warn(`Failed to rename category: ${error.message}`);
        }
      }
      return existing;
    }

    try {
      const permissionOverwrites: any[] = [];

      if (catDef.roleGate) {
        const gateRole = guild.roles.cache.find((r) => r.name === catDef.roleGate);
        permissionOverwrites.push(
          {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          ...(gateRole
            ? [{ id: gateRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }]
            : []),
        );
      }

      const category = (await guild.channels.create({
        name: catDef.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites,
        reason: 'Rabbit Hole AI server setup',
      })) as CategoryChannel;

      result.categoriesCreated.push(catDef.name);
      return category;
    } catch (error: any) {
      result.errors.push(`Failed to create category ${catDef.name}: ${error.message}`);
      return null;
    }
  }

  private async createChannel(
    guild: Guild,
    category: CategoryChannel,
    chanDef: ChannelDefinition,
    catDef: CategoryDefinition,
    result: SetupResult,
  ): Promise<void> {
    const targetBaseName = this.extractBaseName(chanDef.name);
    const channelType = chanDef.voice ? ChannelType.GuildVoice : ChannelType.GuildText;

    // 1. Exact match in correct category
    const exact = guild.channels.cache.find(
      (ch) => ch.name === chanDef.name && ch.parentId === category.id,
    );
    if (exact) {
      result.channelsSkipped.push(chanDef.name);
      return;
    }

    // 2. Fuzzy match in correct category -> rename
    const fuzzyInCategory = guild.channels.cache.find(
      (ch) =>
        ch.parentId === category.id &&
        this.extractBaseName(ch.name) === targetBaseName,
    ) as GuildChannel | undefined;

    if (fuzzyInCategory) {
      if (fuzzyInCategory.name !== chanDef.name) {
        try {
          await fuzzyInCategory.setName(chanDef.name);
          result.channelsRenamed.push(`${fuzzyInCategory.name} -> ${chanDef.name}`);
        } catch (error: any) {
          result.errors.push(`Failed to rename ${fuzzyInCategory.name}: ${error.message}`);
        }
      } else {
        result.channelsSkipped.push(chanDef.name);
      }
      return;
    }

    // 3. Fuzzy match in wrong category -> move + rename
    const orphan = guild.channels.cache.find(
      (ch) =>
        ch.parentId !== category.id &&
        this.extractBaseName(ch.name) === targetBaseName &&
        ch.type !== ChannelType.GuildCategory,
    ) as GuildChannel | undefined;

    if (orphan) {
      try {
        await orphan.setParent(category.id);
        if (orphan.name !== chanDef.name) {
          await orphan.setName(chanDef.name);
        }
        result.channelsMoved.push(`${orphan.name} -> ${catDef.name}/${chanDef.name}`);
      } catch (error: any) {
        result.errors.push(`Failed to move ${orphan.name}: ${error.message}`);
      }
      return;
    }

    // 4. Create new channel
    try {
      const permissionOverwrites: any[] = [];

      if (chanDef.readonly) {
        permissionOverwrites.push({
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.SendMessages],
        });
      }

      await guild.channels.create({
        name: chanDef.name,
        type: channelType,
        parent: category.id,
        permissionOverwrites,
        reason: 'Rabbit Hole AI server setup',
      });
      result.channelsCreated.push(chanDef.name);
    } catch (error: any) {
      result.errors.push(`Failed to create channel ${chanDef.name}: ${error.message}`);
    }
  }

  // --- Duplicate Cleanup ---

  async cleanupDuplicateChannels(guild: Guild, result: SetupResult): Promise<void> {
    await guild.channels.fetch();

    const baseNameMap = new Map<string, GuildChannel[]>();

    for (const [, ch] of guild.channels.cache) {
      if (ch.type === ChannelType.GuildCategory) continue;

      const baseName = this.extractBaseName(ch.name);
      if (!baseName) continue;

      const list = baseNameMap.get(baseName) || [];
      list.push(ch as GuildChannel);
      baseNameMap.set(baseName, list);
    }

    for (const [baseName, channels] of baseNameMap) {
      if (channels.length <= 1) continue;

      const correctDef = this.findDefinitionByBaseName(baseName);

      let best: GuildChannel | null = null;
      let bestScore = -1;

      for (const ch of channels) {
        let score = 0;

        if (correctDef) {
          const { channelDef, categoryDef } = correctDef;
          const normalizedCatName = this.normalizeCategoryName(categoryDef.name);
          if (ch.name === channelDef.name) score += 10;
          if (ch.parent && this.normalizeCategoryName(ch.parent.name) === normalizedCatName) score += 5;
        }

        // Prefer emoji-dash format over pipe or plain
        if (/\p{Extended_Pictographic}/u.test(ch.name) && ch.name.includes('-') && !ch.name.includes('|')) score += 3;
        if (/\p{Extended_Pictographic}/u.test(ch.name)) score += 1;
        if (ch.type === ChannelType.GuildText && ch.parentId) score += 1;

        if (score > bestScore) {
          bestScore = score;
          best = ch;
        }
      }

      for (const ch of channels) {
        if (ch.id === best?.id) continue;
        logger.log(`Deleting duplicate "${ch.name}" (keeping "${best?.name}")`);
        await this.safeDeleteChannel(guild, ch, result);
      }
    }

    await this.cleanupDuplicateCategories(guild, result);
  }

  private async cleanupDuplicateCategories(guild: Guild, result: SetupResult): Promise<void> {
    const catMap = new Map<string, CategoryChannel[]>();

    for (const [, ch] of guild.channels.cache) {
      if (ch.type !== ChannelType.GuildCategory) continue;
      const normalized = this.normalizeCategoryName(ch.name);
      const list = catMap.get(normalized) || [];
      list.push(ch as CategoryChannel);
      catMap.set(normalized, list);
    }

    for (const [, categories] of catMap) {
      if (categories.length <= 1) continue;

      const defCat = CATEGORIES.find(
        (def) => this.normalizeCategoryName(def.name) === this.normalizeCategoryName(categories[0].name),
      );

      let best: CategoryChannel | null = null;
      let bestScore = -1;

      for (const cat of categories) {
        let score = 0;
        if (defCat && cat.name === defCat.name) score += 10;
        const children = guild.channels.cache.filter((ch) => ch.parentId === cat.id);
        score += children.size;

        if (score > bestScore) {
          bestScore = score;
          best = cat;
        }
      }

      for (const cat of categories) {
        if (cat.id === best?.id) continue;

        const children = guild.channels.cache.filter((ch) => ch.parentId === cat.id);
        for (const [, child] of children) {
          try {
            await (child as GuildChannel).setParent(best!.id);
            result.channelsMoved.push(`${child.name} -> ${best!.name}`);
          } catch (error: any) {
            logger.warn(`Failed to move ${child.name}: ${error.message}`);
          }
        }

        try {
          const name = cat.name;
          await cat.delete('Duplicate category cleanup');
          result.channelsDeleted.push(`${name} (category)`);
        } catch (error: any) {
          logger.warn(`Failed to delete category ${cat.name}: ${error.message}`);
        }
      }
    }
  }

  private findDefinitionByBaseName(baseName: string): { channelDef: ChannelDefinition; categoryDef: CategoryDefinition } | null {
    for (const cat of CATEGORIES) {
      for (const ch of cat.channels) {
        if (this.extractBaseName(ch.name) === baseName) {
          return { channelDef: ch, categoryDef: cat };
        }
      }
    }
    return null;
  }

  private async safeDeleteChannel(guild: Guild, channel: GuildChannel, result: SetupResult): Promise<void> {
    if (guild.systemChannelId && channel.id === guild.systemChannelId) {
      logger.warn(`Skipping delete of system channel: ${channel.name}`);
      return;
    }

    try {
      const name = channel.name;
      await channel.delete('Rabbit Hole AI duplicate cleanup');
      result.channelsDeleted.push(name);
    } catch (error: any) {
      logger.warn(`Failed to delete channel ${channel.name}: ${error.message}`);
    }
  }

  // --- Orphaned Defaults ---

  private async cleanupOrphanedDefaults(guild: Guild, result: SetupResult): Promise<void> {
    const communityCategory = guild.channels.cache.find(
      (ch) => ch.type === ChannelType.GuildCategory && this.normalizeCategoryName(ch.name) === 'COMMUNITY',
    ) as CategoryChannel | undefined;

    if (communityCategory) {
      const bareGeneral = guild.channels.cache.find(
        (ch) =>
          ch.name === 'general' &&
          ch.type === ChannelType.GuildText &&
          ch.parentId !== communityCategory.id,
      );

      if (bareGeneral) {
        const existingGeneral = guild.channels.cache.find(
          (ch) =>
            ch.parentId === communityCategory.id &&
            this.extractBaseName(ch.name) === 'general',
        );

        if (existingGeneral) {
          await this.safeDeleteChannel(guild, bareGeneral as GuildChannel, result);
        } else {
          await (bareGeneral as GuildChannel).setParent(communityCategory.id);
          result.channelsMoved.push('general (orphan -> COMMUNITY)');
        }
      }
    }

    for (const defaultName of ['Text Channels', 'Voice Channels']) {
      const cat = guild.channels.cache.find(
        (ch) => ch.type === ChannelType.GuildCategory && ch.name === defaultName,
      );
      if (cat) {
        const children = guild.channels.cache.filter((ch) => ch.parentId === cat.id);
        if (children.size === 0) {
          try {
            await cat.delete('Removing empty default category');
            result.channelsDeleted.push(`${defaultName} (empty category)`);
          } catch (error: any) {
            logger.warn(`Failed to delete empty ${defaultName} category: ${error.message}`);
          }
        }
      }
    }
  }

  // --- Channel Lookup ---

  findChannelByKnownName(guild: Guild, knownName: string): TextChannel | null {
    const targetName = KNOWN_CHANNELS[knownName];
    if (!targetName) return null;

    const exact = guild.channels.cache.find(
      (ch) => ch.name === targetName && ch.type === ChannelType.GuildText,
    ) as TextChannel | undefined;
    if (exact) return exact;

    const targetBase = this.extractBaseName(targetName);
    const baseFallback = guild.channels.cache.find(
      (ch) =>
        ch.type === ChannelType.GuildText &&
        this.extractBaseName(ch.name) === targetBase,
    ) as TextChannel | undefined;

    return baseFallback ?? null;
  }

  // --- Embeds ---

  private async postEmbeds(guild: Guild): Promise<void> {
    await this.postWelcomeEmbed(guild);
    await this.postTicketEmbed(guild);
    await this.postFaqEmbeds(guild);
    await this.postVerifyEmbed(guild);
    await this.postOnboardingGuides(guild);
  }

  async postWelcomeEmbed(guild: Guild): Promise<void> {
    const channel = this.findChannelByKnownName(guild, 'rules');
    if (!channel) return;

    const messages = await channel.messages.fetch({ limit: 10 });
    const alreadyPosted = messages.some(
      (m) => m.author.id === guild.client.user?.id && m.embeds.some((e) => e.title === WELCOME_EMBED.data.title),
    );
    if (alreadyPosted) return;

    await channel.send({ embeds: [WELCOME_EMBED] });
    logger.log('Posted welcome embed.');
  }

  async postTicketEmbed(guild: Guild): Promise<void> {
    const channel = this.findChannelByKnownName(guild, 'createTicket');
    if (!channel) return;

    const messages = await channel.messages.fetch({ limit: 10 });
    const alreadyPosted = messages.some(
      (m) => m.author.id === guild.client.user?.id && m.embeds.some((e) => e.title === TICKET_EMBED.data.title),
    );
    if (alreadyPosted) return;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(BUTTON_IDS.TICKET_CREATE)
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('\uD83C\uDF9F\uFE0F'),
    );

    await channel.send({ embeds: [TICKET_EMBED], components: [row] });
    logger.log('Posted ticket embed.');
  }

  async postFaqEmbeds(guild: Guild): Promise<void> {
    const channel = this.findChannelByKnownName(guild, 'faq');
    if (!channel) return;

    const messages = await channel.messages.fetch({ limit: 10 });
    const alreadyPosted = messages.some(
      (m) => m.author.id === guild.client.user?.id && m.embeds.some((e) => e.title === FAQ_EMBEDS[0]?.data.title),
    );
    if (alreadyPosted) return;

    for (const embed of FAQ_EMBEDS) {
      await channel.send({ embeds: [embed] });
    }
    logger.log('Posted FAQ embeds.');
  }

  async postVerifyEmbed(guild: Guild): Promise<void> {
    const channel = this.findChannelByKnownName(guild, 'verify');
    if (!channel) return;

    const messages = await channel.messages.fetch({ limit: 10 });
    const alreadyPosted = messages.some(
      (m) => m.author.id === guild.client.user?.id && m.embeds.some((e) => e.title === VERIFY_EMBED.data.title),
    );
    if (alreadyPosted) return;

    await channel.send({ embeds: [VERIFY_EMBED] });
    logger.log('Posted verify embed.');
  }

  async postOnboardingGuides(guild: Guild): Promise<void> {
    const introChannel = this.findChannelByKnownName(guild, 'introductions');
    if (introChannel) {
      const msgs = await introChannel.messages.fetch({ limit: 10 });
      const posted = msgs.some(
        (m) => m.author.id === guild.client.user?.id && m.embeds.some((e) => e.title === GETTING_STARTED_EMBED.data.title),
      );
      if (!posted) {
        await introChannel.send({ embeds: [GETTING_STARTED_EMBED, ONBOARDING_EMBED] });
      }
    }

    const npmChannel = this.findChannelByKnownName(guild, 'npmPackage');
    if (npmChannel) {
      const msgs = await npmChannel.messages.fetch({ limit: 10 });
      const posted = msgs.some(
        (m) => m.author.id === guild.client.user?.id && m.embeds.some((e) => e.title === NPM_PACKAGE_EMBED.data.title),
      );
      if (!posted) {
        await npmChannel.send({ embeds: [NPM_PACKAGE_EMBED] });
      }
    }

    const linksChannel = this.findChannelByKnownName(guild, 'links');
    if (linksChannel) {
      const msgs = await linksChannel.messages.fetch({ limit: 10 });
      const posted = msgs.some(
        (m) => m.author.id === guild.client.user?.id && m.embeds.some((e) => e.title === LINKS_EMBED.data.title),
      );
      if (!posted) {
        await linksChannel.send({ embeds: [LINKS_EMBED] });
      }
    }

    const localDevChannel = this.findChannelByKnownName(guild, 'localDev');
    if (localDevChannel) {
      const msgs = await localDevChannel.messages.fetch({ limit: 10 });
      const posted = msgs.some(
        (m) => m.author.id === guild.client.user?.id && m.embeds.some((e) => e.title === LOCAL_DEV_EMBED.data.title),
      );
      if (!posted) {
        await localDevChannel.send({ embeds: [LOCAL_DEV_EMBED] });
      }
    }

    logger.log('Posted onboarding guides.');
  }
}
