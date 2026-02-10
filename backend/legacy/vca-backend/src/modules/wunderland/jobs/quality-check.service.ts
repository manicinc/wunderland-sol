/**
 * @file quality-check.service.ts
 * @description Validates deliverable quality before Solana submission.
 */

import { Injectable, Logger } from '@nestjs/common';
import type { Deliverable } from './deliverable-manager.service.js';

export interface QualityCheckResult {
  passed: boolean;
  score: number; // 0-1
  issues: string[];
  suggestions: string[];
}

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
}

@Injectable()
export class QualityCheckService {
  private readonly logger = new Logger(QualityCheckService.name);
  private readonly threshold: number;

  constructor() {
    this.threshold = parseFloat(process.env.JOB_QUALITY_THRESHOLD || '0.7');
    this.logger.log(`QualityCheckService initialized with threshold: ${this.threshold}`);
  }

  /**
   * Check deliverable quality across multiple dimensions
   */
  async checkDeliverable(deliverable: Deliverable, job: Job): Promise<QualityCheckResult> {
    const checks = [
      this.checkCompleteness(deliverable, job),
      this.checkRelevance(deliverable, job),
      this.checkFormat(deliverable, job),
    ];

    const results = await Promise.all(checks);
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    return {
      passed: avgScore >= this.threshold,
      score: avgScore,
      issues: results.flatMap((r) => r.issues),
      suggestions: results.flatMap((r) => r.suggestions),
    };
  }

  /**
   * Check if deliverable has sufficient content
   */
  private async checkCompleteness(deliverable: Deliverable, job: Job): Promise<QualityCheckResult> {
    const minLengths: Record<Deliverable['type'], number> = {
      code: 50,
      report: 200,
      data: 10,
      url: 10,
      ipfs: 10,
    };

    const minLength = minLengths[deliverable.type] || 100;
    const hasContent = deliverable.content.length >= minLength;

    if (!hasContent) {
      return {
        passed: false,
        score: 0.3,
        issues: [
          `Deliverable is too short (${deliverable.content.length} chars, minimum: ${minLength})`,
        ],
        suggestions: ['Provide more detailed output', 'Include complete implementation/analysis'],
      };
    }

    return {
      passed: true,
      score: 1.0,
      issues: [],
      suggestions: [],
    };
  }

  /**
   * Check if deliverable addresses job requirements using keyword matching
   * (LLM-based relevance check is TODO for future enhancement)
   */
  private async checkRelevance(deliverable: Deliverable, job: Job): Promise<QualityCheckResult> {
    // Extract keywords from job description
    const jobKeywords = this.extractKeywords(job.description + ' ' + job.title);
    const deliverableText = deliverable.content.toLowerCase();

    // Count how many job keywords appear in deliverable
    const matchedKeywords = jobKeywords.filter((keyword) =>
      deliverableText.includes(keyword.toLowerCase())
    );

    const relevanceScore =
      jobKeywords.length > 0 ? matchedKeywords.length / jobKeywords.length : 0.5;

    const passed = relevanceScore >= 0.3; // At least 30% keyword overlap

    if (!passed) {
      return {
        passed: false,
        score: relevanceScore,
        issues: [
          `Deliverable may not address job requirements (${Math.round(relevanceScore * 100)}% keyword match)`,
        ],
        suggestions: [
          `Expected to see references to: ${jobKeywords.slice(0, 5).join(', ')}`,
          'Ensure deliverable directly addresses the job description',
        ],
      };
    }

    return {
      passed: true,
      score: Math.min(relevanceScore + 0.3, 1.0), // Boost score (but cap at 1.0)
      issues: [],
      suggestions: [],
    };
  }

  /**
   * Extract important keywords from text (simple implementation)
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'can',
      'may',
      'might',
      'must',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'this',
      'that',
      'these',
      'those',
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    // Return unique keywords
    return [...new Set(words)];
  }

  /**
   * Check deliverable format (category-specific)
   */
  private async checkFormat(deliverable: Deliverable, job: Job): Promise<QualityCheckResult> {
    // Category-specific format checks
    if (job.category === 'development' && deliverable.type === 'code') {
      // Check for valid code structure
      const hasCodeStructure =
        deliverable.content.includes('function') ||
        deliverable.content.includes('class') ||
        deliverable.content.includes('def') ||
        deliverable.content.includes('const') ||
        deliverable.content.includes('let') ||
        deliverable.content.includes('var') ||
        deliverable.content.includes('export') ||
        deliverable.content.includes('import');

      if (!hasCodeStructure) {
        return {
          passed: false,
          score: 0.5,
          issues: ['Code deliverable lacks recognizable programming constructs'],
          suggestions: ['Ensure deliverable contains actual code (functions, classes, etc.)'],
        };
      }
    }

    if (job.category === 'research' && deliverable.type === 'report') {
      // Check for report structure
      const hasReportStructure =
        deliverable.content.includes('summary') ||
        deliverable.content.includes('introduction') ||
        deliverable.content.includes('conclusion') ||
        deliverable.content.includes('findings') ||
        deliverable.content.includes('analysis');

      if (!hasReportStructure) {
        return {
          passed: false,
          score: 0.6,
          issues: ['Report lacks standard structure (summary, findings, conclusion)'],
          suggestions: ['Include standard report sections'],
        };
      }
    }

    // Default: pass format check
    return {
      passed: true,
      score: 1.0,
      issues: [],
      suggestions: [],
    };
  }

  /**
   * TODO: LLM-based relevance check (future enhancement)
   *
   * This would use an LLM to score how well the deliverable addresses
   * the job requirements on a scale of 0-10.
   */
  private async checkRelevanceLLM(deliverable: Deliverable, job: Job): Promise<QualityCheckResult> {
    /*
    const prompt = `
      Job description: ${job.description}
      Job category: ${job.category}

      Agent deliverable: ${deliverable.content.substring(0, 1000)}

      Does this deliverable address the job requirements? Answer with a score from 0-10 and brief explanation.
    `;

    const response = await callLlm([{ role: 'user', content: prompt }], 'gpt-4o-mini', {
      temperature: 0.1,
      max_tokens: 100,
    });

    // Parse score from response
    const scoreMatch = response.text.match(/(\d+)\/10/);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) / 10 : 0.5;

    return {
      passed: score >= 0.7,
      score,
      issues: score < 0.7 ? ['Deliverable may not fully address job requirements'] : [],
      suggestions: score < 0.7 ? [response.text] : [],
    };
    */

    throw new Error('LLM-based relevance check not implemented');
  }
}
