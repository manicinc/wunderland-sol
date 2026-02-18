import { creditAllocationService } from '../../core/cost/creditAllocation.service.js';
import type { AgentOSAccessLevel, AgentOSToolset, AgentOSPersonaDefinition } from './agentos.persona-registry.js';

const ACCESS_ORDER: AgentOSAccessLevel[] = ['public', 'metered', 'global', 'unlimited'];

export const compareAccessLevels = (userLevel: AgentOSAccessLevel, required: AgentOSAccessLevel): boolean => {
  return ACCESS_ORDER.indexOf(userLevel) >= ACCESS_ORDER.indexOf(required);
};

export const resolveUserAccessLevel = (userId: string): AgentOSAccessLevel => {
  if (process.env.NODE_ENV === 'development' || process.env.AGENTOS_DEV_ACCESS === 'unlimited') {
    return 'unlimited';
  }
  try {
    const snapshot = creditAllocationService.getSnapshot(userId);
    switch (snapshot.allocationKey) {
      case 'metered':
        return 'metered';
      case 'global':
        return 'global';
      case 'unlimited':
        return 'unlimited';
      default:
        return 'public';
    }
  } catch {
    return 'public';
  }
};

export const assertPersonaAccess = (persona: AgentOSPersonaDefinition, userLevel: AgentOSAccessLevel): void => {
  if (!persona.minAccessLevel) return;
  if (!compareAccessLevels(userLevel, persona.minAccessLevel)) {
    throw Object.assign(
      new Error(`Persona ${persona.personaId} requires ${persona.minAccessLevel} access or higher.`),
      { statusCode: 403, code: 'PERSONA_ACCESS_DENIED' },
    );
  }
};

export const filterToolsetsByAccess = (
  toolsets: AgentOSToolset[],
  userLevel: AgentOSAccessLevel,
): AgentOSToolset[] => {
  return toolsets.filter((toolset) => !toolset.minAccessLevel || compareAccessLevels(userLevel, toolset.minAccessLevel));
};
