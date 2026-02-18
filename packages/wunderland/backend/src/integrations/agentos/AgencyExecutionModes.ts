/**
 * @fileoverview Agency Execution Modes
 * @description Defines two execution paradigms for multi-agent workflows:
 * 
 * 1. **STREAMING MODE** (Real-time, On-Demand):
 *    - Agents process tasks as they arrive
 *    - Results stream back immediately
 *    - Higher processing power, more complex
 *    - Best for: Interactive workflows, real-time user feedback, exploratory tasks
 * 
 * 2. **QUEUE MODE** (Batch, Dependency-Aware):
 *    - Pre-analyze entire workflow to determine optimal execution order
 *    - Build dependency graph and identify parallel opportunities
 *    - Execute in batches with maximum parallelism
 *    - Best for: Background jobs, batch processing, cost optimization
 * 
 * @see MultiGMIAgencyExecutor for the executor that supports both modes
 * @see DependencyGraphAnalyzer for task ordering logic
 */

import type { AgentRoleConfig } from './MultiGMIAgencyExecutor.js';
import type { EmergentTask } from './EmergentAgencyCoordinator.js';
import type { StaticTask } from './StaticAgencyCoordinator.js';

/**
 * Execution mode for agency workflows.
 * 
 * **STREAMING** (default):
 * - Real-time processing with immediate feedback
 * - Tasks execute as soon as dependencies are satisfied
 * - Results stream back via SSE as they complete
 * - Higher resource usage (keeps connections open)
 * - More complex to implement and debug
 * - Best for: Interactive UIs, real-time monitoring, exploratory work
 * 
 * **QUEUE**:
 * - Pre-analyze entire workflow before execution
 * - Build dependency graph and determine optimal batches
 * - Execute in waves with maximum parallelism
 * - Results returned only when entire agency completes
 * - Lower resource usage (no long-lived connections)
 * - Simpler to implement and debug
 * - Best for: Background jobs, scheduled workflows, cost optimization
 * 
 * @example Streaming mode
 * ```typescript
 * const result = await executor.executeAgency({
 *   goal: "Research and publish",
 *   roles: [...],
 *   executionMode: 'streaming', // Real-time feedback
 *   onProgress: (update) => console.log(update)
 * });
 * ```
 * 
 * @example Queue mode
 * ```typescript
 * const result = await executor.executeAgency({
 *   goal: "Process 1000 documents",
 *   roles: [...],
 *   executionMode: 'queue', // Batch processing
 *   queueConfig: {
 *     maxParallelBatches: 3,
 *     batchSize: 10
 *   }
 * });
 * ```
 */
export type AgencyExecutionMode = 'streaming' | 'queue';

/**
 * Configuration for queue-based execution.
 */
export interface QueueExecutionConfig {
  /**
   * Maximum number of parallel batches to execute simultaneously.
   * Higher values = more parallelism but more resource usage.
   * @default 3
   */
  maxParallelBatches?: number;

  /**
   * Maximum number of tasks per batch.
   * Larger batches = fewer round trips but longer wait times.
   * @default 10
   */
  batchSize?: number;

  /**
   * Strategy for ordering tasks within a batch.
   * - 'priority': Execute high-priority tasks first
   * - 'cost': Execute cheapest tasks first (optimize for budget)
   * - 'duration': Execute fastest tasks first (optimize for throughput)
   * - 'dependency': Execute tasks with most dependents first (unblock others)
   * @default 'dependency'
   */
  batchOrderingStrategy?: 'priority' | 'cost' | 'duration' | 'dependency';

  /**
   * Whether to continue execution if a batch fails.
   * - true: Skip failed tasks and continue with remaining batches
   * - false: Abort entire workflow on first batch failure
   * @default true
   */
  continueOnBatchFailure?: boolean;

  /**
   * Delay between batches in milliseconds.
   * Useful for rate limiting or allowing resources to recover.
   * @default 0
   */
  batchDelayMs?: number;
}

/**
 * Progress update for streaming mode execution.
 */
export interface StreamingProgressUpdate {
  type: 'task_start' | 'task_progress' | 'task_complete' | 'task_error' | 'batch_complete' | 'agency_complete';
  timestamp: string;
  agencyId: string;
  taskId?: string;
  roleId?: string;
  progress?: number;
  message?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Batch execution result for queue mode.
 */
export interface BatchExecutionResult {
  batchId: string;
  taskIds: string[];
  startedAt: number;
  completedAt: number;
  durationMs: number;
  successCount: number;
  failureCount: number;
  totalCost: number;
  errors: Array<{ taskId: string; error: string }>;
}

/**
 * Represents a node in the task dependency graph.
 */
export interface TaskNode {
  task: EmergentTask | StaticTask;
  dependencies: Set<string>;
  dependents: Set<string>;
  depth: number;
  estimatedCost?: number;
  estimatedDuration?: number;
  priority: number;
}

/**
 * Dependency graph for task execution planning.
 */
export interface DependencyGraph {
  nodes: Map<string, TaskNode>;
  roots: string[]; // Tasks with no dependencies
  leaves: string[]; // Tasks with no dependents
  maxDepth: number;
  criticalPath: string[]; // Longest path through the graph
  parallelizableBatches: string[][]; // Tasks that can execute in parallel
}

/**
 * Analyzes task dependencies and builds an execution plan.
 * 
 * **Responsibilities:**
 * - Build directed acyclic graph (DAG) from task dependencies
 * - Detect cycles and throw errors
 * - Calculate task depths (distance from roots)
 * - Identify critical path (longest chain)
 * - Group tasks into parallelizable batches
 * - Optimize batch ordering based on strategy
 * 
 * @example
 * ```typescript
 * const analyzer = new DependencyGraphAnalyzer();
 * const graph = analyzer.buildGraph(tasks);
 * const batches = analyzer.getBatches(graph, { maxParallelBatches: 3 });
 * 
 * // Execute batches in order
 * for (const batch of batches) {
 *   await executeBatch(batch); // All tasks in batch run in parallel
 * }
 * ```
 */
export class DependencyGraphAnalyzer {
  /**
   * Builds a dependency graph from a list of tasks.
   * 
   * @param tasks - Array of tasks with dependencies
   * @returns Dependency graph with nodes, roots, leaves, and batches
   * @throws Error if circular dependencies detected
   */
  public buildGraph(tasks: (EmergentTask | StaticTask)[]): DependencyGraph {
    const nodes = new Map<string, TaskNode>();

    // Initialize nodes
    for (const task of tasks) {
      // All task variants share taskId & dependencies, no need for conditional narrowing
      const taskId = task.taskId;
      const deps = task.dependencies ?? [];
      const priority = 'priority' in task ? task.priority : 5;

      nodes.set(taskId, {
        task,
        dependencies: new Set(deps),
        dependents: new Set(),
        depth: 0,
        priority,
      });
    }

    // Build dependent relationships
    for (const [taskId, node] of nodes.entries()) {
      for (const depId of node.dependencies) {
        const depNode = nodes.get(depId);
        if (!depNode) {
          throw new Error(`Task "${taskId}" depends on non-existent task "${depId}"`);
        }
        depNode.dependents.add(taskId);
      }
    }

    // Detect cycles using DFS
    this.detectCycles(nodes);

    // Calculate depths (topological levels)
    this.calculateDepths(nodes);

    // Find roots and leaves
    const roots = Array.from(nodes.entries())
      .filter(([_, node]) => node.dependencies.size === 0)
      .map(([id]) => id);

    const leaves = Array.from(nodes.entries())
      .filter(([_, node]) => node.dependents.size === 0)
      .map(([id]) => id);

    const maxDepth = Math.max(...Array.from(nodes.values()).map((n) => n.depth));

    // Find critical path (longest path)
    const criticalPath = this.findCriticalPath(nodes, roots, leaves);

    // Group into parallelizable batches
    const parallelizableBatches = this.groupIntoBatches(nodes);

    return {
      nodes,
      roots,
      leaves,
      maxDepth,
      criticalPath,
      parallelizableBatches,
    };
  }

  /**
   * Detects circular dependencies using depth-first search.
   * @throws Error if cycle detected
   */
  private detectCycles(nodes: Map<string, TaskNode>): void {
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (taskId: string, path: string[]): void => {
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected: ${[...path, taskId].join(' → ')}`);
      }
      if (visited.has(taskId)) {
        return;
      }

      visiting.add(taskId);
      const node = nodes.get(taskId);
      if (node) {
        for (const depId of node.dependencies) {
          visit(depId, [...path, taskId]);
        }
      }
      visiting.delete(taskId);
      visited.add(taskId);
    };

    for (const taskId of nodes.keys()) {
      visit(taskId, []);
    }
  }

  /**
   * Calculates depth for each task (distance from roots).
   * Tasks at depth 0 have no dependencies.
   * Tasks at depth N depend on tasks at depth N-1.
   */
  private calculateDepths(nodes: Map<string, TaskNode>): void {
    const queue: string[] = [];

    // Start with roots (depth 0)
    for (const [taskId, node] of nodes.entries()) {
      if (node.dependencies.size === 0) {
        node.depth = 0;
        queue.push(taskId);
      }
    }

    // BFS to calculate depths
    while (queue.length > 0) {
      const taskId = queue.shift()!;
      const node = nodes.get(taskId)!;

      for (const dependentId of node.dependents) {
        const dependentNode = nodes.get(dependentId)!;
        const newDepth = node.depth + 1;

        if (newDepth > dependentNode.depth) {
          dependentNode.depth = newDepth;
        }

        // Add to queue if all dependencies processed
        const allDepsProcessed = Array.from(dependentNode.dependencies).every((depId) => {
          const depNode = nodes.get(depId);
          return depNode && depNode.depth < dependentNode.depth;
        });

        if (allDepsProcessed && !queue.includes(dependentId)) {
          queue.push(dependentId);
        }
      }
    }
  }

  /**
   * Finds the critical path (longest path through the graph).
   * This represents the minimum time needed to complete the workflow.
   */
  private findCriticalPath(
    nodes: Map<string, TaskNode>,
    roots: string[],
    leaves: string[]
  ): string[] {
    let longestPath: string[] = [];

    const dfs = (taskId: string, currentPath: string[]): void => {
      const node = nodes.get(taskId);
      if (!node) return;

      const newPath = [...currentPath, taskId];

      if (node.dependents.size === 0) {
        // Reached a leaf
        if (newPath.length > longestPath.length) {
          longestPath = newPath;
        }
      } else {
        for (const dependentId of node.dependents) {
          dfs(dependentId, newPath);
        }
      }
    };

    for (const rootId of roots) {
      dfs(rootId, []);
    }

    return longestPath;
  }

  /**
   * Groups tasks into parallelizable batches based on depth.
   * All tasks at the same depth can execute in parallel.
   */
  private groupIntoBatches(nodes: Map<string, TaskNode>): string[][] {
    const batches: string[][] = [];
    const tasksByDepth = new Map<number, string[]>();

    // Group by depth
    for (const [taskId, node] of nodes.entries()) {
      const existing = tasksByDepth.get(node.depth) ?? [];
      existing.push(taskId);
      tasksByDepth.set(node.depth, existing);
    }

    // Convert to array of batches (sorted by depth)
    const depths = Array.from(tasksByDepth.keys()).sort((a, b) => a - b);
    for (const depth of depths) {
      batches.push(tasksByDepth.get(depth)!);
    }

    return batches;
  }

  /**
   * Optimizes batch ordering based on strategy.
   * 
   * @param batch - Array of task IDs in a batch
   * @param nodes - Dependency graph nodes
   * @param strategy - Ordering strategy
   * @returns Optimally ordered task IDs
   */
  public optimizeBatchOrder(
    batch: string[],
    nodes: Map<string, TaskNode>,
    strategy: QueueExecutionConfig['batchOrderingStrategy'] = 'dependency'
  ): string[] {
    const taskNodes = batch.map((id) => ({ id, node: nodes.get(id)! }));

    switch (strategy) {
      case 'priority':
        return taskNodes
          .sort((a, b) => b.node.priority - a.node.priority)
          .map((t) => t.id);

      case 'cost':
        return taskNodes
          .sort((a, b) => (a.node.estimatedCost ?? 0) - (b.node.estimatedCost ?? 0))
          .map((t) => t.id);

      case 'duration':
        return taskNodes
          .sort((a, b) => (a.node.estimatedDuration ?? 0) - (b.node.estimatedDuration ?? 0))
          .map((t) => t.id);

      case 'dependency':
      default:
        // Tasks with more dependents first (unblock others)
        return taskNodes
          .sort((a, b) => b.node.dependents.size - a.node.dependents.size)
          .map((t) => t.id);
    }
  }

  /**
   * Estimates the minimum time needed to complete the workflow.
   * Based on critical path and estimated task durations.
   */
  public estimateMinimumDuration(graph: DependencyGraph): number {
    let totalDuration = 0;

    for (const taskId of graph.criticalPath) {
      const node = graph.nodes.get(taskId);
      if (node) {
        totalDuration += node.estimatedDuration ?? 10000; // Default 10s per task
      }
    }

    return totalDuration;
  }

  /**
   * Estimates the maximum parallelism available in the workflow.
   * Returns the size of the largest batch.
   */
  public estimateMaxParallelism(graph: DependencyGraph): number {
    return Math.max(...graph.parallelizableBatches.map((batch) => batch.length));
  }

  /**
   * Generates a human-readable execution plan.
   */
  public generateExecutionPlan(graph: DependencyGraph, config?: QueueExecutionConfig): string {
    const lines: string[] = [];
    lines.push('# Agency Execution Plan\n');
    lines.push(`**Total Tasks**: ${graph.nodes.size}`);
    lines.push(`**Batches**: ${graph.parallelizableBatches.length}`);
    lines.push(`**Max Parallelism**: ${this.estimateMaxParallelism(graph)} tasks`);
    lines.push(`**Critical Path**: ${graph.criticalPath.length} tasks`);
    lines.push(`**Estimated Duration**: ${(this.estimateMinimumDuration(graph) / 1000).toFixed(1)}s\n`);

    lines.push('## Execution Order\n');
    for (let i = 0; i < graph.parallelizableBatches.length; i++) {
      const batch = graph.parallelizableBatches[i];
      const optimized = config
        ? this.optimizeBatchOrder(batch, graph.nodes, config.batchOrderingStrategy)
        : batch;

      lines.push(`**Batch ${i + 1}** (${batch.length} tasks in parallel):`);
      for (const taskId of optimized) {
        const node = graph.nodes.get(taskId);
        if (node) {
          const taskDesc = 'description' in node.task ? node.task.description : taskId;
          const assignedRole = 'assignedRoleId' in node.task ? node.task.assignedRoleId : 'unassigned';
          lines.push(`  - ${taskId}: ${taskDesc} (role: ${assignedRole})`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * Execution mode configuration for agency workflows.
 */
export interface ExecutionModeConfig {
  /**
   * Execution mode: streaming (real-time) or queue (batch).
   * @default 'streaming'
   */
  mode?: AgencyExecutionMode;

  /**
   * Configuration for queue mode (ignored in streaming mode).
   */
  queueConfig?: QueueExecutionConfig;

  /**
   * Callback for progress updates (streaming mode only).
   * Called for each significant event during execution.
   */
  onProgress?: (update: StreamingProgressUpdate) => void | Promise<void>;

  /**
   * Whether to pre-analyze the workflow before execution.
   * - true: Build dependency graph and show execution plan
   * - false: Start execution immediately
   * @default false (streaming), true (queue)
   */
  preAnalyze?: boolean;
}

/**
 * Result of pre-execution analysis.
 */
export interface WorkflowAnalysisResult {
  graph: DependencyGraph;
  executionPlan: string;
  estimatedDuration: number;
  estimatedCost: number;
  maxParallelism: number;
  recommendations: string[];
}

