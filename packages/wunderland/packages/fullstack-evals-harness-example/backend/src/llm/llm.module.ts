import { Module, Global, forwardRef } from '@nestjs/common';
import { LlmService } from './llm.service';
import { SettingsModule } from '../settings/settings.module';

@Global()
@Module({
  imports: [forwardRef(() => SettingsModule)],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
