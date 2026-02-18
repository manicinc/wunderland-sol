/**
 * @fileoverview Emergent Agency Coordinator
 * @description Enables dynamic role assignment, task decomposition, and adaptive coordination
 * for multi-agent workflows. Agents can spawn new roles, delegate subtasks, and share context.
 */

import { generateUniqueId as uuidv4 } from '../../utils/ids.js';
import type { AgentOS, AgentOSInput } from '@framers/agentos';
import type { AgentRoleConfig, AgencyExecutionInput } from './MultiGMIAgencyExecutor.js';
import { jsonrepair } from 'jsonrepair';

/**
 * Represents a decomposed task with dependencies and assignment
 */
export interface EmergentTask {
  taskId: string;
  description: string;
  assignedRoleId?: string;
  dependencies: string[];
  priority: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Represents a dynamically spawned role
 */
export interface EmergentRole extends AgentRoleConfig {
  spawnedBy?: string;
  capabilities: string[];
  taskIds: string[];
}

/**
 * Shared context that agents can read/write to coordinate
 */
export interface SharedAgencyContext {
  agencyId: string;
  goal: string;
  tasks: Map<string, EmergentTask>;
  roles: Map<string, EmergentRole>;
  sharedKnowledge: Map<string, unknown>;
  coordinationLog: Array<{
    timestamp: string;
    roleId: string;
    action: string;
    details: Record<string, unknown>;
  }>;
}

export interface EmergentAgencyCoordinatorDeps {
  agentOS: AgentOS;
}

/**
 * Coordinates emergent multi-agent behavior with dynamic task decomposition and role spawning
 */
const PLANNER_PERSONA_ID = process.env.AGENTOS_PLANNER_PERSONA_ID ?? 'v_researcher';
const COORDINATOR_PERSONA_ID = process.env.AGENTOS_COORDINATOR_PERSONA_ID ?? 'v_researcher';
const DEFAULT_EMERGENT_PERSONA_ID = process.env.AGENTOS_EMERGENT_DEFAULT_PERSONA_ID ?? 'v_researcher';

function sanitizeJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json/i, '').replace(/^```/, '');
    cleaned = cleaned.replace(/```$/, '');
  }
  cleaned = cleaned.replace(/Turn processing sequence complete\.?/gi, '').trim();
  return cleaned;
}

function tryParseStructuredJson<T>(raw: string): T | null {
  const cleaned = sanitizeJsonResponse(raw);
  if (!cleaned) return null;

  const candidates = new Set<string>();
  candidates.add(cleaned);

  const braceMatch = cleaned.match(/({[\s\S]+})/m);
  if (braceMatch?.[1]) {
    candidates.add(braceMatch[1]);
  }

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    try {
      return JSON.parse(trimmed);
    } catch {
      try {
        const repaired = jsonrepair(trimmed);
        return JSON.parse(repaired);
      } catch {
        continue;
      }
    }
  }

  return null;
}

export class EmergentAgencyCoordinator {
  private readonly deps: EmergentAgencyCoordinatorDeps;
  private readonly contexts = new Map<string, SharedAgencyContext>();

  constructor(deps: EmergentAgencyCoordinatorDeps) {
    this.deps = deps;
  }

  /**
   * Analyzes a goal and decomposes it into emergent tasks
   */
  public async decomposeGoal(goal: string, userId: string): Promise<EmergentTask[]> {
    const decompositionPrompt = `Analyze this goal and break it down into concrete, actionable tasks.
For each task, specify:
- A clear description
- Dependencies (which tasks must complete first)
- Priority (1-10, where 10 is highest)
- Required capabilities (e.g., "webSearch", "dataAnalysis", "communication")

Goal: ${goal}

Return a JSON array of tasks with this structure:
[
  {
    "description": "Task description",
    "dependencies": ["taskId1", "taskId2"],
    "priority": 8,
    "requiredCapabilities": ["capability1", "capability2"]
  }
]`;

    const decompositionInput: AgentOSInput = {
      userId,
      sessionId: `decompose_${uuidv4()}`,
      conversationId: `decompose_${uuidv4()}`,
      selectedPersonaId: PLANNER_PERSONA_ID,
      textInput: decompositionPrompt,
      // TODO: add responseFormat once ProcessingOptions supports it
      options: {},
    };

    let responseText = '';
    const stream = this.deps.agentOS.processRequest(decompositionInput);
    for await (const chunk of stream) {
      if (chunk.type === 'text_delta') {
        responseText += chunk.textDelta ?? '';
      } else if (chunk.type === 'final_response') {
        responseText = chunk.finalResponseText ?? responseText;
      }
    }

    try {
      const parsed = JSON.parse(responseText);
      const tasksArray = Array.isArray(parsed) ? parsed : parsed.tasks ?? [];
      
      return tasksArray.map((task: any, index: number) => ({
        taskId: `task_${index + 1}`,
        description: task.description ?? '',
        dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
        priority: typeof task.priority === 'number' ? task.priority : 5,
        status: 'pending' as const,
        metadata: {
          requiredCapabilities: Array.isArray(task.requiredCapabilities) ? task.requiredCapabilities : [],
        },
      }));
    } catch (error) {
      console.error('Failed to parse task decomposition:', error);
      // Fallback: create a single task for the entire goal
      return [
        {
          taskId: 'task_1',
          description: goal,
          dependencies: [],
          priority: 10,
          status: 'pending',
          metadata: { requiredCapabilities: [] },
        },
      ];
    }
  }

  /**
   * Determines optimal roles needed based on tasks and spawns them
   */
  public async assignRolesToTasks(
    tasks: EmergentTask[],
    existingRoles: AgentRoleConfig[],
    goal: string,
    userId: string,
  ): Promise<EmergentRole[]> {
    const taskDescriptions = tasks.map((t) => `- ${t.description} (capabilities: ${(t.metadata?.requiredCapabilities as string[] ?? []).join(', ')})`).join('\n');
    
    const roleAssignmentPrompt = `Given these tasks and existing roles, determine the optimal role assignments.
You can:
1. Assign tasks to existing roles
2. Suggest new roles if needed (with specific capabilities)

Goal: ${goal}

Tasks:
${taskDescriptions}

Existing Roles:
${existingRoles.map((r) => `- ${r.roleId}: ${r.instruction}`).join('\n')}

Return a JSON object with:
{
  "assignments": [
    {
      "taskId": "task_1",
      "roleId": "existing_role_id or new_role_id",
      "reason": "Why this role is suitable"
    }
  ],
  "newRoles": [
    {
      "roleId": "new_role_id",
      "personaId": "suggested_persona",
      "instruction": "Role instruction",
      "capabilities": ["capability1", "capability2"]
    }
  ]
}`;

    const assignmentInput: AgentOSInput = {
      userId,
      sessionId: `assign_${uuidv4()}`,
      conversationId: `assign_${uuidv4()}`,
      selectedPersonaId: COORDINATOR_PERSONA_ID,
      textInput: roleAssignmentPrompt,
      // TODO: add responseFormat once ProcessingOptions supports it
      options: {},
    };

    let responseText = '';
    const stream = this.deps.agentOS.processRequest(assignmentInput);
    for await (const chunk of stream) {
      if (chunk.type === 'text_delta') {
        responseText += chunk.textDelta ?? '';
      } else if (chunk.type === 'final_response') {
        responseText = chunk.finalResponseText ?? responseText;
      }
    }

    try {
      const parsed = tryParseStructuredJson<{
        assignments?: Array<{ taskId: string; roleId: string; reason?: string }>;
        newRoles?: Array<{ roleId?: string; personaId?: string; instruction?: string; capabilities?: string[] }>;
      }>(responseText);
      if (!parsed) {
        throw new Error('Role assignment response did not contain valid JSON.');
      }
      const assignments = Array.isArray(parsed.assignments) ? parsed.assignments : [];
      const newRoles = Array.isArray(parsed.newRoles) ? parsed.newRoles : [];

      // Apply assignments to tasks
      for (const assignment of assignments) {
        const task = tasks.find((t) => t.taskId === assignment.taskId);
        if (task) {
          task.assignedRoleId = assignment.roleId;
          task.status = 'assigned';
        }
      }

      // Create emergent roles
      const emergentRoles: EmergentRole[] = existingRoles.map((role) => ({
        ...role,
        capabilities: [],
        taskIds: tasks.filter((t) => t.assignedRoleId === role.roleId).map((t) => t.taskId),
      }));

      for (const newRole of newRoles) {
        emergentRoles.push({
          roleId: newRole.roleId ?? `role_${uuidv4()}`,
          personaId: newRole.personaId ?? DEFAULT_EMERGENT_PERSONA_ID,
          instruction: newRole.instruction ?? '',
          capabilities: Array.isArray(newRole.capabilities) ? newRole.capabilities : [],
          taskIds: tasks.filter((t) => t.assignedRoleId === newRole.roleId).map((t) => t.taskId),
        });
      }

      return emergentRoles;
    } catch (error) {
      console.error('Failed to parse role assignments:', error);
      // Fallback: distribute tasks evenly across existing roles
      return existingRoles.map((role, index) => ({
        ...role,
        capabilities: [],
        taskIds: tasks.filter((_, i) => i % existingRoles.length === index).map((t) => t.taskId),
      }));
    }
  }

  /**
   * Creates a shared context for an agency
   */
  public createSharedContext(agencyId: string, goal: string, tasks: EmergentTask[], roles: EmergentRole[]): SharedAgencyContext {
    const context: SharedAgencyContext = {
      agencyId,
      goal,
      tasks: new Map(tasks.map((t) => [t.taskId, t])),
      roles: new Map(roles.map((r) => [r.roleId, r])),
      sharedKnowledge: new Map(),
      coordinationLog: [],
    };

    this.contexts.set(agencyId, context);
    return context;
  }

  /**
   * Gets shared context for an agency
   */
  public getSharedContext(agencyId: string): SharedAgencyContext | undefined {
    return this.contexts.get(agencyId);
  }

  /**
   * Logs a coordination action
   */
  public logCoordination(agencyId: string, roleId: string, action: string, details: Record<string, unknown>): void {
    const context = this.contexts.get(agencyId);
    if (context) {
      context.coordinationLog.push({
        timestamp: new Date().toISOString(),
        roleId,
        action,
        details,
      });
    }
  }

  /**
   * Updates shared knowledge
   */
  public updateSharedKnowledge(agencyId: string, key: string, value: unknown): void {
    const context = this.contexts.get(agencyId);
    if (context) {
      context.sharedKnowledge.set(key, value);
    }
  }

  /**
   * Transforms a basic agency input into an emergent one with decomposed tasks and dynamic roles
   */
  public async transformToEmergentAgency(input: AgencyExecutionInput): Promise<{
    tasks: EmergentTask[];
    roles: EmergentRole[];
    context: SharedAgencyContext;
  }> {
    const agencyId = `agency_${uuidv4()}`;

    // Step 1: Decompose goal into tasks
    const tasks = await this.decomposeGoal(input.goal, input.userId);

    // Step 2: Assign roles to tasks (may spawn new roles)
    const roles = await this.assignRolesToTasks(tasks, input.roles, input.goal, input.userId);

    // Step 3: Create shared context
    const context = this.createSharedContext(agencyId, input.goal, tasks, roles);

    return { tasks, roles, context };
  }

  /**
   * Cleans up context after agency completes
   */
  public cleanupContext(agencyId: string): void {
    this.contexts.delete(agencyId);
  }
}

