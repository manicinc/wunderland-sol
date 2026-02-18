import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import { SettingsService, LlmSettings, AppSettings } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  /**
   * Get all application settings.
   */
  @Get()
  async getAll(): Promise<AppSettings> {
    return this.settingsService.getAll();
  }

  /**
   * Get LLM-specific settings.
   */
  @Get('llm')
  async getLlmSettings(): Promise<LlmSettings> {
    return this.settingsService.getLlmSettings();
  }

  /**
   * Update LLM settings.
   */
  @Put('llm')
  async updateLlmSettings(@Body() body: Partial<LlmSettings>): Promise<LlmSettings> {
    return this.settingsService.updateLlmSettings(body);
  }

  /**
   * Test LLM connection with current settings.
   */
  @Post('llm/test')
  async testLlmConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    return this.settingsService.testLlmConnection();
  }

  /**
   * Reset all settings to defaults.
   */
  @Post('reset')
  async resetToDefaults(): Promise<AppSettings> {
    return this.settingsService.resetToDefaults();
  }
}
