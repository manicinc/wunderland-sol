/**
 * AgentOS Skills Extension
 *
 * Tools for discovering and enabling curated `SKILL.md` prompt modules.
 *
 * @module @framers/agentos-ext-skills
 * @version 1.0.0
 * @license MIT
 */

import type { ExtensionContext, ExtensionPack } from '@framers/agentos';

import { SkillsEnableTool } from './tools/skillsEnable.js';
import { SkillsInstallTool } from './tools/skillsInstall.js';
import { SkillsListTool } from './tools/skillsList.js';
import { SkillsReadTool } from './tools/skillsRead.js';
import { SkillsStatusTool } from './tools/skillsStatus.js';

export interface SkillsExtensionOptions {
  /** Extension priority in the stack */
  priority?: number;
}

export function createExtensionPack(context: ExtensionContext): ExtensionPack {
  const options = (context.options as SkillsExtensionOptions) || {};

  const listTool = new SkillsListTool();
  const readTool = new SkillsReadTool();
  const statusTool = new SkillsStatusTool();
  const enableTool = new SkillsEnableTool();
  const installTool = new SkillsInstallTool();

  const priority = options.priority ?? 30;

  return {
    name: '@framers/agentos-ext-skills',
    version: '1.0.0',
    descriptors: [
      { id: listTool.name, kind: 'tool', priority, payload: listTool },
      { id: readTool.name, kind: 'tool', priority, payload: readTool },
      { id: statusTool.name, kind: 'tool', priority, payload: statusTool },
      { id: enableTool.name, kind: 'tool', priority, payload: enableTool },
      { id: installTool.name, kind: 'tool', priority, payload: installTool },
    ],
    onActivate: async () => {
      if (context.onActivate) await context.onActivate();
      context.logger?.info('Skills Extension activated');
    },
    onDeactivate: async () => {
      if (context.onDeactivate) await context.onDeactivate();
      context.logger?.info('Skills Extension deactivated');
    },
  };
}

export { SkillsListTool } from './tools/skillsList.js';
export { SkillsReadTool } from './tools/skillsRead.js';
export { SkillsStatusTool } from './tools/skillsStatus.js';
export { SkillsEnableTool } from './tools/skillsEnable.js';
export { SkillsInstallTool } from './tools/skillsInstall.js';

export * from './catalog.js';

export default createExtensionPack;
