import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller.js';
import { ChannelsService } from './channels.service.js';
import { ChannelBridgeService } from './channel-bridge.service.js';
import { ChannelOAuthController } from './channel-oauth.controller.js';
import { ChannelOAuthService } from './channel-oauth.service.js';
import { CredentialsModule } from '../credentials/credentials.module.js';

@Module({
  imports: [CredentialsModule],
  controllers: [ChannelsController, ChannelOAuthController],
  providers: [ChannelsService, ChannelBridgeService, ChannelOAuthService],
  exports: [ChannelsService, ChannelBridgeService, ChannelOAuthService],
})
export class ChannelsModule {}
