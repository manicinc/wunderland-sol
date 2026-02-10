import { Module } from '@nestjs/common';
import { CredentialsModule } from '../credentials/credentials.module.js';
import { EmailIntegrationController } from './email.controller.js';
import { EmailIntegrationService } from './email.service.js';

@Module({
  imports: [CredentialsModule],
  controllers: [EmailIntegrationController],
  providers: [EmailIntegrationService],
})
export class EmailIntegrationModule {}
