/**
 * @fileoverview Multi-GMI Agency Workflow Executor
 * @description Coordinates multiple persona seats by invoking AgentOS for each role and
 * streaming back Agency/Workflow chunks in real time. Supports emergent behavior with
 * dynamic task decomposition and adaptive role spawning.
 */

import { generateUniqueId as uuidv4 } from '../../utils/ids.js';
import type { AgentOS, AgentOSInput, AgentOSResponse } from '@framers/agentos';
import { AgentOSResponseChunkType, type AgentOSAgencyUpdateChunk } from '@framers/agentos';
import type { CostAggregator } from '@framers/agentos/cognitive_substrate/IGMI';
import { EmergentAgencyCoordinator, type EmergentTask, type EmergentRole } from './EmergentAgencyCoordinator.js';
import { StaticAgencyCoordinator, type StaticAgencyConfig, type StaticTask } from './StaticAgencyCoordinator.js';
import {
  createAgencyExecution,
  updateAgencyExecution,
  markAgencyExecutionFailed,
  createAgencySeat,
  updateAgencySeat,
} from './agencyPersistence.service.js';
import {
  DependencyGraphAnalyzer,
  type AgencyExecutionMode,
  type ExecutionModeConfig,
  type StreamingProgressUpdate,
  type BatchExecutionResult,
  type WorkflowAnalysisResult,
} from './AgencyExecutionModes.js';

/** Captures the configuration for a single agency seat. */
export interface AgentRoleConfig {
  roleId: string;
  personaId: string;
  instruction: string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Coordination strategy for agency execution.
 * 
 * - **emergent** (default): LLM analyzes goal, decomposes tasks, spawns roles adaptively.
 *   Best for complex, open-ended goals where optimal structure is unclear.
 *   Higher latency and cost due to planning steps.
 * 
 * - **static**: Uses exactly the roles/tasks provided, no decomposition or spawning.
 *   Best for production workflows with well-defined structures.
 *   Lower latency and cost, fully deterministic.
 */
export type AgencyCoordinationStrategy = 'emergent' | 'static';

/** Input payload when launching a multi-seat execution. */
export interface AgencyExecutionInput {
  goal: string;
  roles: AgentRoleConfig[];
  userId: string;
  conversationId: string;
  workflowDefinitionId?: string;
  outputFormat?: 'json' | 'csv' | 'markdown' | 'text';
  metadata?: Record<string, unknown>;
  /**
   * Coordination strategy for this agency execution.
   * @default 'emergent'
   */
  coordinationStrategy?: AgencyCoordinationStrategy;
  /**
   * @deprecated Use coordinationStrategy instead. Kept for backwards compatibility.
   */
  enableEmergentBehavior?: boolean;
  /**
   * For static coordination: predefined task definitions.
   * Ignored if coordinationStrategy is 'emergent'.
   */
  staticTasks?: StaticTask[];
  /**
   * Execution mode configuration.
   * @see AgencyExecutionModes for detailed comparison
   */
  executionMode?: ExecutionModeConfig;
}

interface GmiExecutionResult {
  roleId: string;
  personaId: string;
  gmiInstanceId: string;
  output: string;
  usage?: CostAggregator;
  metadata?: Record<string, unknown>;
  error?: string;
}

/** Aggregated result returned to callers. */
export interface AgencyExecutionResult {
  agencyId: string;
  goal: string;
  gmiResults: GmiExecutionResult[];
  consolidatedOutput: string;
  formattedOutput?: {
    format: 'json' | 'csv' | 'markdown' | 'text';
    content: string;
  };
  durationMs: number;
  totalUsage: CostAggregator;
  /** Emergent behavior metadata */
  emergentMetadata?: {
    tasksDecomposed: EmergentTask[];
    rolesSpawned: EmergentRole[];
    coordinationLog: Array<{ timestamp: string; roleId: string; action: string; details: Record<string, unknown> }>;
  };
  /** Queue mode execution metadata */
  queueMetadata?: {
    batchResults: BatchExecutionResult[];
    totalBatches: number;
    maxParallelism: number;
    criticalPathLength: number;
  };
  /** Workflow analysis (if pre-analyze was enabled) */
  workflowAnalysis?: WorkflowAnalysisResult;
}

export interface MultiGMIAgencyExecutorDependencies {
  agentOS: AgentOS;
  onChunk?: (chunk: AgentOSResponse) => Promise<void> | void;
  /** Maximum retry attempts for failed tasks (default: 2) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelayMs?: number;
}

interface SeatSnapshot {
  roleId: string;
  personaId: string;
  gmiInstanceId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  metadata?: Record<string, unknown>;
}

/** Utility function limiting concurrency for async tasks. */
async function runWithConcurrency<T>(factories: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = new Array(factories.length);
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const current = cursor++;
      if (current >= factories.length) {
        break;
      }
      results[current] = await factories[current]();
    }
  };

  const workers = Array.from({ length: Math.min(limit, factories.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Orchestrates multi-agent agency execution with support for both emergent and static coordination.
 * 
 * **Emergent Mode** (default):
 * - LLM decomposes goal into tasks
 * - Adaptively spawns roles based on capabilities
 * - Higher latency/cost, more flexible
 * 
 * **Static Mode**:
 * - Uses predefined roles and tasks
 * - No LLM decomposition
 * - Lower latency/cost, fully deterministic
 * 
 * @example Emergent execution
 * ```typescript
 * const executor = new MultiGMIAgencyExecutor({ agentOS });
 * const result = await executor.executeAgency({
 *   goal: "Research and publish quantum computing news",
 *   roles: [{ roleId: "lead", personaId: "generalist", instruction: "Coordinate" }],
 *   userId: "user123",
 *   conversationId: "conv456",
 *   coordinationStrategy: 'emergent' // or omit (default)
 * });
 * ```
 * 
 * @example Static execution
 * ```typescript
 * const result = await executor.executeAgency({
 *   goal: "Execute predefined workflow",
 *   roles: [
 *     { roleId: "researcher", personaId: "research-specialist", instruction: "Research" },
 *     { roleId: "publisher", personaId: "communications-manager", instruction: "Publish" }
 *   ],
 *   userId: "user123",
 *   conversationId: "conv456",
 *   coordinationStrategy: 'static',
 *   staticTasks: [
 *     { taskId: "task_1", description: "Research", assignedRoleId: "researcher", executionOrder: 1, dependencies: [] },
 *     { taskId: "task_2", description: "Publish", assignedRoleId: "publisher", executionOrder: 2, dependencies: ["task_1"] }
 *   ]
 * });
 * ```
 */
export class MultiGMIAgencyExecutor {
  private readonly deps: MultiGMIAgencyExecutorDependencies;
  private readonly emergentCoordinator: EmergentAgencyCoordinator;
  private readonly staticCoordinator: StaticAgencyCoordinator;
  private readonly dependencyAnalyzer: DependencyGraphAnalyzer;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(deps: MultiGMIAgencyExecutorDependencies) {
    this.deps = deps;
    this.emergentCoordinator = new EmergentAgencyCoordinator({ agentOS: deps.agentOS });
    this.staticCoordinator = new StaticAgencyCoordinator();
    this.dependencyAnalyzer = new DependencyGraphAnalyzer();
    this.maxRetries = deps.maxRetries ?? 2;
    this.retryDelayMs = deps.retryDelayMs ?? 1000;
  }

  /**
   * Pre-analyzes a workflow to generate an execution plan.
   * Useful for preview, cost estimation, or validation before execution.
   * 
   * @param input - Agency execution configuration
   * @returns Workflow analysis with dependency graph and recommendations
   */
  public async analyzeWorkflow(input: AgencyExecutionInput): Promise<WorkflowAnalysisResult> {
    let tasks: (EmergentTask | StaticTask)[] = [];

    // Get tasks based on coordination strategy
    const strategy: AgencyCoordinationStrategy = 
      input.coordinationStrategy ?? 
      (input.enableEmergentBehavior ? 'emergent' : 'emergent');

    if (strategy === 'emergent') {
      const emergentResult = await this.emergentCoordinator.transformToEmergentAgency(input);
      tasks = emergentResult.tasks;
    } else if (strategy === 'static' && input.staticTasks) {
      tasks = input.staticTasks;
    } else {
      // No tasks to analyze
      throw new Error('Cannot analyze workflow: no tasks available. Provide staticTasks or use emergent strategy.');
    }

    const graph = this.dependencyAnalyzer.buildGraph(tasks);
    const executionPlan = this.dependencyAnalyzer.generateExecutionPlan(graph, input.executionMode?.queueConfig);
    const estimatedDuration = this.dependencyAnalyzer.estimateMinimumDuration(graph);
    const maxParallelism = this.dependencyAnalyzer.estimateMaxParallelism(graph);

    // Estimate cost based on task count and average per-task cost
    const estimatedCost = tasks.length * 0.005; // Rough estimate: $0.005 per task

    const recommendations: string[] = [];
    if (maxParallelism > 4) {
      recommendations.push(`High parallelism (${maxParallelism} tasks). Consider increasing concurrency limit for faster execution.`);
    }
    if (graph.criticalPath.length > 5) {
      recommendations.push(`Long critical path (${graph.criticalPath.length} tasks). Consider breaking into smaller workflows.`);
    }
    if (estimatedCost > 0.1) {
      recommendations.push(`High estimated cost ($${estimatedCost.toFixed(4)}). Consider using cheaper models or caching.`);
    }

    return {
      graph,
      executionPlan,
      estimatedDuration,
      estimatedCost,
      maxParallelism,
      recommendations,
    };
  }

  /**
   * Executes an agency workflow by invoking AgentOS for every seat.
   * Supports both emergent (adaptive) and static (deterministic) coordination strategies.
   * Supports both streaming (real-time) and queue (batch) execution modes.
   * 
   * @param input - Agency execution configuration
   * @returns Complete execution result with outputs, costs, and metadata
   */
  public async executeAgency(input: AgencyExecutionInput): Promise<AgencyExecutionResult> {
    const startTime = Date.now();
    const agencyId = `agency_${uuidv4()}`;
    
    // Determine coordination strategy (backwards compatible with enableEmergentBehavior)
    const strategy: AgencyCoordinationStrategy = 
      input.coordinationStrategy ?? 
      (input.enableEmergentBehavior ? 'emergent' : 'emergent'); // Default to emergent

    console.log(`[MultiGMIAgencyExecutor] Starting agency ${agencyId} with ${strategy} coordination`);

    // Persist initial agency state
    try {
      await createAgencyExecution({
        agencyId,
        userId: input.userId,
        conversationId: input.conversationId,
        goal: input.goal,
        workflowDefinitionId: input.workflowDefinitionId,
      });
    } catch (error) {
      console.error(`[MultiGMIAgencyExecutor] Failed to persist agency ${agencyId}:`, error);
      // Continue execution even if persistence fails
    }

    let tasks: EmergentTask[] = [];
    let effectiveRoles: AgentRoleConfig[] = input.roles;
    let emergentMetadata: AgencyExecutionResult['emergentMetadata'];

    // Apply coordination strategy
    if (strategy === 'emergent') {
      console.log(`[MultiGMIAgencyExecutor] Using emergent coordination for agency ${agencyId}`);
      const emergentResult = await this.emergentCoordinator.transformToEmergentAgency(input);
      tasks = emergentResult.tasks;
      effectiveRoles = emergentResult.roles;
      
      emergentMetadata = {
        tasksDecomposed: tasks,
        rolesSpawned: emergentResult.roles,
        coordinationLog: emergentResult.context.coordinationLog,
      };

      console.log(`[MultiGMIAgencyExecutor] Decomposed into ${tasks.length} tasks, spawned ${effectiveRoles.length} roles`);
    } else if (strategy === 'static') {
      console.log(`[MultiGMIAgencyExecutor] Using static coordination for agency ${agencyId}`);
      
      if (!input.staticTasks || input.staticTasks.length === 0) {
        console.warn(`[MultiGMIAgencyExecutor] Static strategy requested but no staticTasks provided. Using roles as-is.`);
      } else {
        // Validate static configuration
        const staticConfig = this.staticCoordinator.createStaticConfig({
          goal: input.goal,
          roles: input.roles,
          tasks: input.staticTasks,
        });
        
        const validation = this.staticCoordinator.validate(staticConfig);
        if (!validation.valid) {
          throw new Error(`Static agency configuration invalid: ${validation.errors.join('; ')}`);
        }
        
        console.log(`[MultiGMIAgencyExecutor] Validated ${staticConfig.tasks.length} static tasks`);
      }
    }

    const seatMap = new Map<string, SeatSnapshot>();
    effectiveRoles.forEach((role) => {
      seatMap.set(role.roleId, {
        roleId: role.roleId,
        personaId: role.personaId,
        status: 'pending',
        metadata: role.metadata,
      });
    });

    // Create seat records in database
    for (const role of effectiveRoles) {
      try {
        await createAgencySeat({ agencyId, roleId: role.roleId, personaId: role.personaId });
      } catch (error) {
        console.error(`[MultiGMIAgencyExecutor] Failed to persist seat ${role.roleId}:`, error);
      }
    }

    await this.emitAgencyUpdate(agencyId, input.conversationId, seatMap, { goal: input.goal, status: 'pending' });

    const participants = effectiveRoles.map((role) => ({ roleId: role.roleId, personaId: role.personaId }));
    
    // Determine execution mode
    const executionMode: AgencyExecutionMode = input.executionMode?.mode ?? 'streaming';
    let gmiResults: GmiExecutionResult[];
    let queueMetadata: AgencyExecutionResult['queueMetadata'];
    let workflowAnalysis: WorkflowAnalysisResult | undefined;

    console.log(`[MultiGMIAgencyExecutor] Executing in ${executionMode} mode`);

    if (executionMode === 'queue') {
      // QUEUE MODE: Pre-analyze dependencies and execute in optimized batches
      const analysisResult = tasks.length > 0 
        ? await this.analyzeWorkflow(input)
        : undefined;

      if (analysisResult) {
        workflowAnalysis = analysisResult;
        console.log(`[MultiGMIAgencyExecutor] Workflow Analysis:\n${analysisResult.executionPlan}`);
        
        // Execute in dependency-aware batches
        const batchResults = await this.executeQueueMode({
          tasks,
          roles: effectiveRoles,
          agencyId,
          input,
          participants,
          seatMap,
          graph: analysisResult.graph,
        });

        gmiResults = batchResults.results;
        queueMetadata = {
          batchResults: batchResults.batches,
          totalBatches: batchResults.batches.length,
          maxParallelism: analysisResult.maxParallelism,
          criticalPathLength: analysisResult.graph.criticalPath.length,
        };
      } else {
        // Fallback to streaming if no tasks to analyze
        console.warn(`[MultiGMIAgencyExecutor] Queue mode requested but no tasks available. Falling back to streaming.`);
        gmiResults = await this.executeStreamingMode({
          roles: effectiveRoles,
          agencyId,
          input,
          participants,
          seatMap,
        });
      }
    } else {
      // STREAMING MODE: Execute all seats in parallel immediately (current behavior)
      gmiResults = await this.executeStreamingMode({
        roles: effectiveRoles,
        agencyId,
        input,
        participants,
        seatMap,
      });
    }

    const consolidatedOutput = this.consolidateOutputs(gmiResults, input.outputFormat ?? 'markdown');
    const formattedOutput = this.formatOutput(gmiResults, input.outputFormat ?? 'markdown');
    const totalUsage = this.aggregateUsage(gmiResults);

    await this.emitAgencyUpdate(agencyId, input.conversationId, seatMap, {
      goal: input.goal,
      status: 'completed',
    });

    const result: AgencyExecutionResult = {
      agencyId,
      goal: input.goal,
      gmiResults,
      consolidatedOutput,
      formattedOutput,
      durationMs: Date.now() - startTime,
      totalUsage,
      emergentMetadata,
      queueMetadata,
      workflowAnalysis,
    };

    // Persist final results
    try {
      await updateAgencyExecution(result);
    } catch (error) {
      console.error(`[MultiGMIAgencyExecutor] Failed to persist results for agency ${agencyId}:`, error);
    }

    // Cleanup emergent context if used
    if (strategy === 'emergent') {
      this.emergentCoordinator.cleanupContext(agencyId);
    }

    return result;
  }

  /**
   * Executes a seat with automatic retry logic on failure
   */
  private async executeSeatWithRetry(params: {
    role: AgentRoleConfig;
    agencyId: string;
    goal: string;
    userId: string;
    conversationId: string;
    workflowDefinitionId?: string;
    participants: Array<{ roleId: string; personaId?: string }>;
    metadata?: Record<string, unknown>;
    seatMap: Map<string, SeatSnapshot>;
  }): Promise<GmiExecutionResult> {
    const { role, agencyId, conversationId, seatMap } = params;
    const seatId = `seat_${agencyId}_${role.roleId}`;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await this.updateSeatStatus(agencyId, conversationId, seatMap, role.roleId, 'running');
        
        // Persist seat status update
        try {
          await updateAgencySeat({
            seatId,
            status: 'running',
            startedAt: Date.now(),
            retryCount: attempt,
          });
        } catch (error) {
          console.error(`[MultiGMIAgencyExecutor] Failed to persist seat status for ${seatId}:`, error);
        }

        const result = await this.executeSeat({
          role: params.role,
          agencyId: params.agencyId,
          goal: params.goal,
          userId: params.userId,
          conversationId: params.conversationId,
          workflowDefinitionId: params.workflowDefinitionId,
          participants: params.participants,
          metadata: params.metadata,
        });

        // Success - update seat status
        seatMap.set(role.roleId, {
          roleId: role.roleId,
          personaId: role.personaId,
          gmiInstanceId: result.gmiInstanceId,
          status: result.error ? 'failed' : 'completed',
          metadata: { ...role.metadata, error: result.error, attempts: attempt + 1 },
        });
        await this.updateSeatStatus(agencyId, conversationId, seatMap, role.roleId, result.error ? 'failed' : 'completed');
        
        // Persist seat results
        try {
          await updateAgencySeat({
            seatId,
            gmiInstanceId: result.gmiInstanceId,
            status: result.error ? 'failed' : 'completed',
            completedAt: Date.now(),
            output: result.output,
            error: result.error,
            usageTokens: result.usage?.totalTokens,
            usageCostUsd: result.usage?.totalCostUSD,
            retryCount: attempt,
          });
        } catch (error) {
          console.error(`[MultiGMIAgencyExecutor] Failed to persist seat results for ${seatId}:`, error);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[MultiGMIAgencyExecutor] Seat ${role.roleId} failed (attempt ${attempt + 1}/${this.maxRetries + 1}):`, lastError.message);

        if (attempt < this.maxRetries) {
          console.log(`[MultiGMIAgencyExecutor] Retrying seat ${role.roleId} after ${this.retryDelayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
        }
      }
    }

    // All retries exhausted - mark as failed
    const errorMessage = lastError?.message ?? 'Unknown error';
    seatMap.set(role.roleId, {
      roleId: role.roleId,
      personaId: role.personaId,
      status: 'failed',
      metadata: { ...role.metadata, error: errorMessage, attempts: this.maxRetries + 1 },
    });
    await this.updateSeatStatus(agencyId, conversationId, seatMap, role.roleId, 'failed');

    // Persist final failure state
    try {
      await updateAgencySeat({
        seatId,
        status: 'failed',
        completedAt: Date.now(),
        error: errorMessage,
        retryCount: this.maxRetries,
      });
    } catch (error) {
      console.error(`[MultiGMIAgencyExecutor] Failed to persist seat failure for ${seatId}:`, error);
    }

    return {
      roleId: role.roleId,
      personaId: role.personaId,
      gmiInstanceId: `gmi_failed_${uuidv4()}`,
      output: '',
      error: errorMessage,
      metadata: { attempts: this.maxRetries + 1 },
    };
  }

  private async executeSeat(params: {
    role: AgentRoleConfig;
    agencyId: string;
    goal: string;
    userId: string;
    conversationId: string;
    workflowDefinitionId?: string;
    participants: Array<{ roleId: string; personaId?: string }>;
    metadata?: Record<string, unknown>;
  }): Promise<GmiExecutionResult> {
    const { role, agencyId, goal, userId, conversationId } = params;
    const seatSessionId = `${conversationId}:${role.roleId}:${uuidv4()}`;
    const instruction = `You are participating in a multi-agent agency.
Goal: ${goal}
Role (${role.roleId}): ${role.instruction}`;

    const agentosInput: AgentOSInput = {
      userId,
      sessionId: seatSessionId,
      conversationId,
      selectedPersonaId: role.personaId,
      textInput: instruction,
      options: { streamUICommands: true },
      agencyRequest: {
        agencyId,
        goal,
        metadata: params.metadata,
        participants: params.participants,
      },
      workflowRequest: params.workflowDefinitionId
        ? {
            definitionId: params.workflowDefinitionId,
            workflowId: `${params.workflowDefinitionId}-${agencyId}`,
            conversationId,
          }
        : undefined,
    };

    let aggregatedText = '';
    let finalResponseText: string | null = null;
    let usage: CostAggregator | undefined;
    let gmiInstanceId = `gmi_${role.roleId}_${uuidv4()}`;

    const stream = this.deps.agentOS.processRequest(agentosInput);
    for await (const chunk of stream) {
      gmiInstanceId = chunk.gmiInstanceId ?? gmiInstanceId;

      switch (chunk.type) {
        case AgentOSResponseChunkType.TEXT_DELTA:
          aggregatedText += chunk.textDelta ?? '';
          break;
        case AgentOSResponseChunkType.FINAL_RESPONSE:
          finalResponseText = chunk.finalResponseText ?? finalResponseText;
          usage = chunk.usage ?? usage;
          break;
        default:
          break;
      }

      await this.deps.onChunk?.(chunk);
    }

    const output = (finalResponseText ?? aggregatedText).trim();
    return {
      roleId: role.roleId,
      personaId: role.personaId,
      gmiInstanceId,
      output,
      usage,
      metadata: role.metadata,
    };
  }

  private async updateSeatStatus(
    agencyId: string,
    conversationId: string,
    seatMap: Map<string, SeatSnapshot>,
    roleId: string,
    status: SeatSnapshot['status'],
  ): Promise<void> {
    const snapshot = seatMap.get(roleId);
    if (!snapshot) {
      return;
    }
    snapshot.status = status;
    seatMap.set(roleId, snapshot);
    await this.emitAgencyUpdate(agencyId, conversationId, seatMap);
  }

  private async emitAgencyUpdate(
    agencyId: string,
    conversationId: string,
    seatMap: Map<string, SeatSnapshot>,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.deps.onChunk) {
      return;
    }

    const seats = Array.from(seatMap.values()).map((seat) => ({
      roleId: seat.roleId,
      personaId: seat.personaId,
      gmiInstanceId: seat.gmiInstanceId ?? 'pending',
      metadata: { ...seat.metadata, status: seat.status },
    }));

    const allTerminal = seats.every((seat) => {
      const status = (seat.metadata?.status as string | undefined) ?? 'pending';
      return status === 'completed' || status === 'failed';
    });

    const chunk: AgentOSAgencyUpdateChunk = {
      type: AgentOSResponseChunkType.AGENCY_UPDATE,
      streamId: conversationId,
      gmiInstanceId: `agency:${agencyId}`,
      personaId: `agency:${agencyId}`,
      isFinal: allTerminal,
      timestamp: new Date().toISOString(),
      agency: {
        agencyId,
        workflowId: (typeof metadata?.workflowId === 'string' ? (metadata!.workflowId as string) : `workflow:${agencyId}`),
        conversationId,
        seats,
        metadata,
      },
    };

    await this.deps.onChunk(chunk);
  }

  private consolidateOutputs(results: GmiExecutionResult[], format: string): string {
    const sections = results.map((result) => {
      const header = `## ${result.roleId.toUpperCase().replace(/_/g, ' ')}`;
      const persona = `*Persona: ${result.personaId}*`;
      const body = result.error ? `**Warning:** ${result.error}` : result.output;
      return `${header}\n${persona}\n\n${body}`;
    });
    return `# Agency Coordination Results\n\n${sections.join('\n\n---\n\n')}`;
  }

  private formatOutput(results: GmiExecutionResult[], format: 'json' | 'csv' | 'markdown' | 'text') {
    switch (format) {
      case 'json':
        return { format: 'json' as const, content: JSON.stringify(results, null, 2) };
      case 'csv': {
        const rows = results.map(
          (r) =>
            `"${r.roleId.replace(/"/g, '""')}","${r.personaId.replace(/"/g, '""')}","${
              r.error ? 'failed' : 'success'
            }","${(r.output || r.error || '').replace(/"/g, '""')}"`,
        );
        return {
          format: 'csv' as const,
          content: ['roleId,personaId,status,output', ...rows].join('\n'),
        };
      }
      case 'markdown':
        return { format: 'markdown' as const, content: this.consolidateOutputs(results, 'markdown') };
      case 'text':
      default:
        return {
          format: 'text' as const,
          content: results.map((r) => `[${r.roleId}] ${r.output || r.error || ''}`).join('\n\n'),
        };
    }
  }

  private aggregateUsage(results: GmiExecutionResult[]): CostAggregator {
    return results.reduce<CostAggregator>(
      (acc, result) => ({
        promptTokens: (acc.promptTokens ?? 0) + (result.usage?.promptTokens ?? 0),
        completionTokens: (acc.completionTokens ?? 0) + (result.usage?.completionTokens ?? 0),
        totalTokens: (acc.totalTokens ?? 0) + (result.usage?.totalTokens ?? 0),
        totalCostUSD: (acc.totalCostUSD ?? 0) + (result.usage?.totalCostUSD ?? 0),
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0, totalCostUSD: 0 },
    );
  }

  /**
   * STREAMING MODE execution: All seats execute in parallel immediately.
   * Results stream back as they complete via SSE.
   * 
   * **Characteristics:**
   * - Real-time feedback
   * - Higher resource usage (keeps connections open)
   * - More complex error handling
   * - Best for: Interactive UIs, exploratory work
   * 
   * @private
   */
  private async executeStreamingMode(params: {
    roles: AgentRoleConfig[];
    agencyId: string;
    input: AgencyExecutionInput;
    participants: Array<{ roleId: string; personaId?: string }>;
    seatMap: Map<string, SeatSnapshot>;
  }): Promise<GmiExecutionResult[]> {
    console.log(`[MultiGMIAgencyExecutor] Starting streaming mode execution for ${params.roles.length} seats`);

    const factories = params.roles.map((role) => async () => {
      return await this.executeSeatWithRetry({
        role,
        agencyId: params.agencyId,
        goal: params.input.goal,
        userId: params.input.userId,
        conversationId: params.input.conversationId,
        workflowDefinitionId: params.input.workflowDefinitionId,
        participants: params.participants,
        metadata: params.input.metadata,
        seatMap: params.seatMap,
      });
    });

    const concurrencyLimit = Math.min(4, Math.max(1, factories.length));
    return await runWithConcurrency(factories, concurrencyLimit);
  }

  /**
   * QUEUE MODE execution: Pre-analyze dependencies, execute in optimized batches.
   * Results returned only when all batches complete.
   * 
   * **Characteristics:**
   * - Batch processing with maximum parallelism
   * - Lower resource usage (no long-lived connections)
   * - Optimal task ordering based on dependencies
   * - Best for: Background jobs, scheduled workflows
   * 
   * **Process:**
   * 1. Build dependency graph
   * 2. Group tasks into batches (by depth)
   * 3. Optimize task order within each batch
   * 4. Execute batches sequentially (tasks within batch run in parallel)
   * 5. Track batch-level metrics
   * 
   * @private
   */
  private async executeQueueMode(params: {
    tasks: (EmergentTask | StaticTask)[];
    roles: AgentRoleConfig[];
    agencyId: string;
    input: AgencyExecutionInput;
    participants: Array<{ roleId: string; personaId?: string }>;
    seatMap: Map<string, SeatSnapshot>;
    graph: import('./AgencyExecutionModes.js').DependencyGraph;
  }): Promise<{ results: GmiExecutionResult[]; batches: BatchExecutionResult[] }> {
    console.log(`[MultiGMIAgencyExecutor] Starting queue mode execution: ${params.graph.parallelizableBatches.length} batches`);

    const queueConfig = params.input.executionMode?.queueConfig ?? {};
    const maxParallelBatches = queueConfig.maxParallelBatches ?? 3;
    const batchDelayMs = queueConfig.batchDelayMs ?? 0;
    const continueOnFailure = queueConfig.continueOnBatchFailure ?? true;

    const allResults: GmiExecutionResult[] = [];
    const batchResults: BatchExecutionResult[] = [];
    const taskToRoleMap = new Map<string, string>();

    // Map tasks to roles
    for (const task of params.tasks) {
      const assignedRoleId = 'assignedRoleId' in task ? task.assignedRoleId : undefined;
      if (assignedRoleId) {
        taskToRoleMap.set(task.taskId, assignedRoleId);
      }
    }

    // Execute batches sequentially
    for (let batchIndex = 0; batchIndex < params.graph.parallelizableBatches.length; batchIndex++) {
      const batch = params.graph.parallelizableBatches[batchIndex];
      const batchId = `batch_${params.agencyId}_${batchIndex + 1}`;
      const batchStartTime = Date.now();

      console.log(`[MultiGMIAgencyExecutor] Executing batch ${batchIndex + 1}/${params.graph.parallelizableBatches.length}: ${batch.length} tasks`);

      // Optimize task order within batch
      const optimizedBatch = this.dependencyAnalyzer.optimizeBatchOrder(
        batch,
        params.graph.nodes,
        queueConfig.batchOrderingStrategy
      );

      // Emit progress update
      if (params.input.executionMode?.onProgress) {
        await params.input.executionMode.onProgress({
          type: 'batch_complete',
          timestamp: new Date().toISOString(),
          agencyId: params.agencyId,
          progress: (batchIndex / params.graph.parallelizableBatches.length) * 100,
          message: `Starting batch ${batchIndex + 1}/${params.graph.parallelizableBatches.length}`,
        });
      }

      // Execute tasks in this batch (in parallel, up to maxParallelBatches limit)
      const batchFactories = optimizedBatch.slice(0, maxParallelBatches).map((taskId) => async () => {
        const roleId = taskToRoleMap.get(taskId);
        if (!roleId) {
          console.warn(`[MultiGMIAgencyExecutor] Task ${taskId} has no assigned role. Skipping.`);
          return null;
        }

        const role = params.roles.find((r) => r.roleId === roleId);
        if (!role) {
          console.warn(`[MultiGMIAgencyExecutor] Role ${roleId} not found. Skipping task ${taskId}.`);
          return null;
        }

        return await this.executeSeatWithRetry({
          role,
          agencyId: params.agencyId,
          goal: params.input.goal,
          userId: params.input.userId,
          conversationId: params.input.conversationId,
          workflowDefinitionId: params.input.workflowDefinitionId,
          participants: params.participants,
          metadata: { ...params.input.metadata, taskId },
          seatMap: params.seatMap,
        });
      });

      try {
        const batchGmiResults = await Promise.all(batchFactories.map((f) => f()));
        const validResults = batchGmiResults.filter((r): r is GmiExecutionResult => r !== null);
        allResults.push(...validResults);

        const batchErrors = validResults.filter((r) => r.error).map((r) => ({ taskId: r.roleId, error: r.error! }));

        batchResults.push({
          batchId,
          taskIds: optimizedBatch,
          startedAt: batchStartTime,
          completedAt: Date.now(),
          durationMs: Date.now() - batchStartTime,
          successCount: validResults.filter((r) => !r.error).length,
          failureCount: batchErrors.length,
          totalCost: validResults.reduce((sum, r) => sum + (r.usage?.totalCostUSD ?? 0), 0),
          errors: batchErrors,
        });

        console.log(`[MultiGMIAgencyExecutor] Batch ${batchIndex + 1} complete: ${validResults.length} tasks, ${batchErrors.length} errors`);

        // Stop if batch failed and continueOnFailure is false
        if (batchErrors.length > 0 && !continueOnFailure) {
          console.error(`[MultiGMIAgencyExecutor] Batch ${batchIndex + 1} failed. Aborting remaining batches.`);
          break;
        }

        // Delay between batches if configured
        if (batchDelayMs > 0 && batchIndex < params.graph.parallelizableBatches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
        }
      } catch (error) {
        console.error(`[MultiGMIAgencyExecutor] Batch ${batchIndex + 1} failed:`, error);
        
        batchResults.push({
          batchId,
          taskIds: optimizedBatch,
          startedAt: batchStartTime,
          completedAt: Date.now(),
          durationMs: Date.now() - batchStartTime,
          successCount: 0,
          failureCount: optimizedBatch.length,
          totalCost: 0,
          errors: [{ taskId: 'batch', error: error instanceof Error ? error.message : String(error) }],
        });

        if (!continueOnFailure) {
          break;
        }
      }
    }

    return { results: allResults, batches: batchResults };
  }
}

