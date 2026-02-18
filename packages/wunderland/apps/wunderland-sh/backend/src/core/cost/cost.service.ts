// File: backend/src/core/cost/cost.service.ts
/**
 * @file Manages and tracks API usage costs for different services.
 * @version 1.2.0 - Enhanced trackCost to include detailed units and metadata.
 * @description This service provides a centralized way to record costs
 * associated with LLM interactions, STT transcriptions, TTS synthesis,
 * and other potentially costly API calls. It supports per-user session
 * cost tracking and global thresholds.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { creditAllocationService } from './creditAllocation.service.js';
import { usagePersistenceService } from './usagePersistence.service.js';

const __filename = fileURLToPath(import.meta.url);
const __projectRoot = path.resolve(path.dirname(__filename), '../../../../');
dotenv.config({ path: path.join(__projectRoot, '.env'), override: true });


/**
 * Represents a single cost entry.
 */
export interface ICostEntry {
  /** Unique identifier for the cost entry (e.g., timestamp or UUID). */
  id: string;
  /** Identifier for the user associated with this cost. */
  userId: string;
  /** Type of service that incurred the cost (e.g., 'llm', 'stt', 'tts', 'diagram'). */
  serviceType: 'llm' | 'stt' | 'tts' | 'diagram' | 'general_api' | string;
  /** Specific model or sub-service used, if applicable (e.g., 'gpt-4o-mini', 'whisper-1'). */
  modelOrSubType?: string;
  /** The cost incurred for this specific entry in USD. */
  costUSD: number;
  /** Timestamp of when the cost was incurred. */
  timestamp: Date;
  /** Number of input units (e.g., tokens for LLM, characters for TTS, bytes or seconds for STT). */
  inputUnits?: number;
  /** Label for input units (e.g., 'tokens', 'characters', 'bytes', 'seconds'). */
  inputUnitType?: string;
  /** Number of output units (e.g., tokens for LLM, bytes for TTS audio, characters for STT text). */
  outputUnits?: number;
  /** Label for output units. */
  outputUnitType?: string;
  /** Additional metadata related to the cost entry. */
  metadata?: Record<string, any>;
}

/**
 * Represents the detailed cost breakdown for a user's session.
 */
export interface ISessionCostDetail {
  /** Identifier for the user. */
  userId: string;
  /** Total cost accumulated in the current session in USD. */
  totalCost: number;
  /** Breakdown of costs by service type. */
  costsByService: {
    [serviceType: string]: {
        totalCost: number;
        count: number;
        details?: Array<{model?: string, cost: number, timestamp: Date}>; // Optional: store recent transactions per service
    };
  };
  /** List of individual cost entries for the session. Limited for performance. */
  entries: ICostEntry[]; // Consider limiting the size of this array in memory
  /** Timestamp of when the session tracking started or last reset. */
  sessionStartTime: Date;
}

const sessionCosts: Map<string, ISessionCostDetail> = new Map();
let globalMonthlyCostUSD: number = 0;
const GLOBAL_COST_THRESHOLD_USD_PER_MONTH = parseFloat(
  process.env.GLOBAL_COST_THRESHOLD_USD_PER_MONTH || '100.00'
);
const DEFAULT_SESSION_COST_THRESHOLD_USD = parseFloat(
  process.env.COST_THRESHOLD_USD_PER_SESSION || '2.00'
);
const MAX_SESSION_ENTRIES_TO_STORE = 100; // Limit how many detailed entries are kept in memory per session

export class CostService {
  /**
   * Tracks a cost entry for a specific user and service.
   *
   * @static
   * @param {string} userId - The identifier of the user.
   * @param {'llm' | 'stt' | 'tts' | 'diagram' | string} serviceType - The type of service.
   * @param {number} costUSD - The cost incurred in USD.
   * @param {string} [modelOrSubType] - The specific model or sub-service used.
   * @param {number} [inputUnits] - Number of input units.
   * @param {string} [inputUnitType='units'] - Label for input units.
   * @param {number} [outputUnits] - Number of output units.
   * @param {string} [outputUnitType='units'] - Label for output units.
   * @param {Record<string, any>} [metadata] - Additional metadata (e.g., provider, specific parameters).
   * @returns {ICostEntry} The created cost entry.
   */
  public static trackCost(
    userId: string,
    serviceType: 'llm' | 'stt' | 'tts' | 'diagram' | string,
    costUSD: number,
    modelOrSubType?: string,
    inputUnits?: number,
    inputUnitType: string = 'units', // Default unit type
    outputUnits?: number,
    outputUnitType: string = 'units', // Default unit type
    metadata?: Record<string, any>
  ): ICostEntry {
    if (costUSD < 0) {
      console.warn(`CostService: Attempted to track negative cost ($${costUSD}) for user ${userId}, service ${serviceType}. Cost will be treated as 0.`);
      costUSD = 0;
    }

    const entry: ICostEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId,
      serviceType,
      modelOrSubType,
      costUSD,
      timestamp: new Date(),
      inputUnits,
      inputUnitType,
      outputUnits,
      outputUnitType,
      metadata,
    };

    if (!sessionCosts.has(userId)) {
      sessionCosts.set(userId, {
        userId,
        totalCost: 0,
        costsByService: {},
        entries: [],
        sessionStartTime: new Date(),
      });
    }

    const userSession = sessionCosts.get(userId)!;
    userSession.totalCost += costUSD;
    
    if (!userSession.costsByService[serviceType]) {
        userSession.costsByService[serviceType] = { totalCost: 0, count: 0, details: [] };
    }
    userSession.costsByService[serviceType].totalCost += costUSD;
    userSession.costsByService[serviceType].count += 1;
    // Optionally, add a summary of this transaction to details (be mindful of memory)
    // userSession.costsByService[serviceType].details?.push({ model: modelOrSubType, cost: costUSD, timestamp: entry.timestamp });


    userSession.entries.push(entry);
    if (userSession.entries.length > MAX_SESSION_ENTRIES_TO_STORE) {
        userSession.entries.shift(); // Keep only the most recent entries
    }

    globalMonthlyCostUSD += costUSD;
    try {
      creditAllocationService.recordCost(userId, serviceType, costUSD);
      // Persist usage to DB (fire-and-forget)
      const dateKey = new Date().toISOString().slice(0, 10);
      const profile = creditAllocationService.getProfile(userId);
      usagePersistenceService.persistUsage(
        userId, dateKey, profile.allocationKey,
        profile.usage.llmUsd, profile.usage.speechUsd, profile.usage.requestCount,
      ).catch((err) => console.warn('[CostService] Async persist failed:', err));
    } catch (allocationError) {
      console.warn(`CostService: Failed to record credit usage for user ${userId}:`, allocationError);
    }

    // Construct a detailed log message
    let logMessage = `CostService: User [${userId}] Service [${serviceType}]`;
    if (modelOrSubType) logMessage += ` Model [${modelOrSubType}]`;
    if (metadata?.provider) logMessage += ` Provider [${metadata.provider}]`;
    logMessage += ` Cost [$${costUSD.toFixed(6)}]`;
    if (inputUnits !== undefined) logMessage += ` Input [${inputUnits} ${inputUnitType}]`;
    if (outputUnits !== undefined) logMessage += ` Output [${outputUnits} ${outputUnitType}]`;
    if (metadata) {
        const printableMeta = {...metadata}; // Clone to avoid modifying original
        delete printableMeta.provider; // Already logged
        if(Object.keys(printableMeta).length > 0) {
            logMessage += ` Meta ${JSON.stringify(printableMeta)}`;
        }
    }
    logMessage += ` || SessionTotal [$${userSession.totalCost.toFixed(6)}] GlobalMonthly [$${globalMonthlyCostUSD.toFixed(2)}]`;
    
    console.log(logMessage);
    
    if (process.env.DISABLE_COST_LIMITS !== 'true' && globalMonthlyCostUSD > GLOBAL_COST_THRESHOLD_USD_PER_MONTH) {
        console.warn(`CostService: GLOBAL MONTHLY COST THRESHOLD EXCEEDED! Current: $${globalMonthlyCostUSD.toFixed(2)}, Threshold: $${GLOBAL_COST_THRESHOLD_USD_PER_MONTH.toFixed(2)}`);
        // Implement alerting or service degradation logic here for production
    }

    return entry;
  }

  /**
   * Retrieves the current session cost details for a user.
   *
   * @static
   * @param {string} userId - The identifier of the user.
   * @returns {ISessionCostDetail} The session cost details. If no costs tracked, returns a zeroed detail object.
   */
  public static getSessionCost(userId: string): ISessionCostDetail {
    if (!sessionCosts.has(userId)) {
      return {
        userId,
        totalCost: 0,
        costsByService: {},
        entries: [],
        sessionStartTime: new Date(),
      };
    }
    return sessionCosts.get(userId)!;
  }

  /**
   * Checks if the user's current session cost has reached or exceeded a given threshold.
   * Respects the `DISABLE_COST_LIMITS` environment variable.
   *
   * @static
   * @param {string} userId - The identifier of the user.
   * @param {number} [explicitThresholdUSD] - The specific threshold to check against. If not provided, `DEFAULT_SESSION_COST_THRESHOLD_USD` is used.
   * @returns {boolean} True if the threshold is reached, false otherwise or if limits are disabled.
   */
  public static isSessionCostThresholdReached(userId: string, explicitThresholdUSD?: number): boolean {
    if (process.env.DISABLE_COST_LIMITS === 'true') {
      // console.log("CostService: Cost limit checks are disabled via DISABLE_COST_LIMITS=true."); // Can be noisy
      return false;
    }

    const thresholdToUse = explicitThresholdUSD ?? DEFAULT_SESSION_COST_THRESHOLD_USD;
    const userSession = sessionCosts.get(userId);

    if (!userSession) {
      return false; // No costs tracked yet, so threshold not reached.
    }
    
    const reached = userSession.totalCost >= thresholdToUse;
    if (reached) {
        console.warn(`CostService: User [${userId}] session cost $${userSession.totalCost.toFixed(4)} has reached/exceeded threshold $${thresholdToUse.toFixed(2)}.`);
    }
    return reached;
  }

  /**
   * Resets the session cost for a specific user.
   *
   * @static
   * @param {string} userId - The identifier of the user.
   * @returns {void}
   */
  public static resetSessionCost(userId: string): void {
    if (sessionCosts.has(userId)) {
      sessionCosts.set(userId, {
        userId,
        totalCost: 0,
        costsByService: {},
        entries: [],
        sessionStartTime: new Date(),
      });
      console.log(`CostService: Session cost reset for user ${userId}.`);
    } else {
      console.log(`CostService: No session found for user ${userId} to reset.`);
    }
  }

  /**
   * Retrieves the current global monthly accumulated cost.
   * @static
   * @returns {number} The total global cost in USD tracked this month.
   */
  public static getGlobalMonthlyCost(): number {
    return globalMonthlyCostUSD;
  }

  /**
   * Resets the global monthly cost.
   * Typically called at the beginning of a new billing cycle.
   * @static
   */
  public static resetGlobalMonthlyCost(): void {
    globalMonthlyCostUSD = 0;
    console.log("CostService: Global monthly cost reset.");
  }

  /**
   * Clears all tracked session costs.
   * Useful for development or specific reset scenarios.
   * @static
   */
  public static clearAllSessionCosts(): void {
    sessionCosts.clear();
    console.log("CostService: All session costs cleared.");
  }
}
