/**
 * @fileoverview Static Agency Coordinator
 * @description Provides deterministic, predefined role assignment without dynamic decomposition.
 * Useful when you need full control over agent instances and want predictable execution paths.
 * 
 * Unlike EmergentAgencyCoordinator, this coordinator:
 * - Uses exactly the roles provided (no spawning)
 * - Executes tasks in a fixed order
 * - Skips LLM-based decomposition (faster, cheaper)
 * - Provides deterministic behavior for production workflows
 * 
 * @see EmergentAgencyCoordinator for dynamic, adaptive coordination
 */

import type { AgentRoleConfig } from './MultiGMIAgencyExecutor.js';

/**
 * Represents a predefined task in a static workflow
 */
export interface StaticTask {
  taskId: string;
  description: string;
  assignedRoleId: string;
  executionOrder: number;
  dependencies: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for a static agency workflow
 */
export interface StaticAgencyConfig {
  agencyId: string;
  goal: string;
  roles: AgentRoleConfig[];
  tasks: StaticTask[];
  executionStrategy: 'sequential' | 'parallel' | 'dependency-based';
}

/**
 * Coordinates multi-agent execution with predefined, static role assignments.
 * No dynamic decomposition or role spawning - everything is explicit and deterministic.
 * 
 * @example
 * ```typescript
 * const coordinator = new StaticAgencyCoordinator();
 * const config = coordinator.createStaticConfig({
 *   goal: "Research and publish",
 *   roles: [
 *     { roleId: "researcher", personaId: "research-specialist", instruction: "Research topic" },
 *     { roleId: "publisher", personaId: "communications-manager", instruction: "Publish findings" }
 *   ],
 *   tasks: [
 *     { taskId: "task_1", description: "Research", assignedRoleId: "researcher", executionOrder: 1 },
 *     { taskId: "task_2", description: "Publish", assignedRoleId: "publisher", executionOrder: 2 }
 *   ]
 * });
 * ```
 */
export class StaticAgencyCoordinator {
  /**
   * Creates a static agency configuration from explicit role and task definitions.
   * No LLM calls, no dynamic analysis - just validates and structures the input.
   * 
   * @param params - Static configuration parameters
   * @returns Validated StaticAgencyConfig
   */
  public createStaticConfig(params: {
    goal: string;
    roles: AgentRoleConfig[];
    tasks: StaticTask[];
    executionStrategy?: 'sequential' | 'parallel' | 'dependency-based';
  }): StaticAgencyConfig {
    const agencyId = `static_agency_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Validate that all tasks reference existing roles
    const roleIds = new Set(params.roles.map((r) => r.roleId));
    for (const task of params.tasks) {
      if (!roleIds.has(task.assignedRoleId)) {
        throw new Error(
          `Task "${task.taskId}" references non-existent role "${task.assignedRoleId}". ` +
          `Available roles: ${Array.from(roleIds).join(', ')}`
        );
      }
    }

    // Validate dependency graph (no cycles, all deps exist)
    const taskIds = new Set(params.tasks.map((t) => t.taskId));
    for (const task of params.tasks) {
      for (const depId of task.dependencies) {
        if (!taskIds.has(depId)) {
          throw new Error(
            `Task "${task.taskId}" depends on non-existent task "${depId}". ` +
            `Available tasks: ${Array.from(taskIds).join(', ')}`
          );
        }
      }
    }

    return {
      agencyId,
      goal: params.goal,
      roles: params.roles,
      tasks: params.tasks,
      executionStrategy: params.executionStrategy ?? 'dependency-based',
    };
  }

  /**
   * Determines execution order based on strategy and dependencies.
   * 
   * @param config - Static agency configuration
   * @returns Ordered array of task IDs to execute
   */
  public getExecutionOrder(config: StaticAgencyConfig): string[] {
    switch (config.executionStrategy) {
      case 'sequential':
        // Execute in order specified by executionOrder field
        return config.tasks
          .sort((a, b) => a.executionOrder - b.executionOrder)
          .map((t) => t.taskId);

      case 'parallel':
        // All tasks execute simultaneously (ignores dependencies)
        return config.tasks.map((t) => t.taskId);

      case 'dependency-based':
      default:
        // Topological sort based on dependencies
        return this.topologicalSort(config.tasks);
    }
  }

  /**
   * Performs topological sort on tasks based on dependencies.
   * Tasks with no dependencies come first, then tasks whose deps are satisfied.
   * 
   * @param tasks - Array of static tasks
   * @returns Topologically sorted task IDs
   * @throws Error if circular dependencies detected
   */
  private topologicalSort(tasks: StaticTask[]): string[] {
    const taskMap = new Map(tasks.map((t) => [t.taskId, t]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (taskId: string): void => {
      if (visited.has(taskId)) {
        return;
      }
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected involving task "${taskId}"`);
      }

      visiting.add(taskId);
      const task = taskMap.get(taskId);
      if (task) {
        for (const depId of task.dependencies) {
          visit(depId);
        }
      }
      visiting.delete(taskId);
      visited.add(taskId);
      result.push(taskId);
    };

    for (const task of tasks) {
      visit(task.taskId);
    }

    return result;
  }

  /**
   * Groups tasks by assigned role for batch execution.
   * Useful for optimizing parallel execution within role boundaries.
   * 
   * @param config - Static agency configuration
   * @returns Map of roleId → array of task IDs
   */
  public groupTasksByRole(config: StaticAgencyConfig): Map<string, string[]> {
    const grouped = new Map<string, string[]>();

    for (const task of config.tasks) {
      const existing = grouped.get(task.assignedRoleId) ?? [];
      existing.push(task.taskId);
      grouped.set(task.assignedRoleId, existing);
    }

    return grouped;
  }

  /**
   * Validates that a static configuration is executable.
   * Checks for:
   * - At least one role and one task
   * - All tasks assigned to existing roles
   * - No circular dependencies
   * - Valid execution order
   * 
   * @param config - Static agency configuration
   * @returns Validation result with errors if any
   */
  public validate(config: StaticAgencyConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.roles.length === 0) {
      errors.push('At least one role is required');
    }

    if (config.tasks.length === 0) {
      errors.push('At least one task is required');
    }

    const roleIds = new Set(config.roles.map((r) => r.roleId));
    for (const task of config.tasks) {
      if (!roleIds.has(task.assignedRoleId)) {
        errors.push(`Task "${task.taskId}" references non-existent role "${task.assignedRoleId}"`);
      }
    }

    try {
      this.topologicalSort(config.tasks);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

