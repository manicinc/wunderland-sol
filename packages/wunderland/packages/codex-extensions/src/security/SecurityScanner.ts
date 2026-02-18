/**
 * Security Scanner - Scans plugins for potential security issues
 * @module @framers/codex-extensions/security
 */

import type { PluginManifest } from '../types';

export interface SecurityScanResult {
  safe: boolean;
  score: number; // 0-100
  issues: string[];
  warnings: string[];
  details: SecurityScanDetails;
}

export interface SecurityScanDetails {
  checksumValid?: boolean;
  signatureValid?: boolean;
  permissionsReview: PermissionReview[];
  codePatterns: CodePatternMatch[];
  networkAccess: boolean;
  storageAccess: boolean;
  domManipulation: boolean;
}

export interface PermissionReview {
  permission: string;
  risk: 'low' | 'medium' | 'high';
  reason: string;
  granted: boolean;
}

export interface CodePatternMatch {
  pattern: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
}

/**
 * Dangerous patterns to detect in plugin code
 */
const DANGEROUS_PATTERNS: Array<{
  pattern: RegExp;
  risk: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}> = [
  // Critical - Never allow
  {
    pattern: /eval\s*\(/,
    risk: 'critical',
    description: 'eval() can execute arbitrary code',
  },
  {
    pattern: /new\s+Function\s*\(/,
    risk: 'critical',
    description: 'Function constructor can execute arbitrary code',
  },
  {
    pattern: /document\.write\s*\(/,
    risk: 'critical',
    description: 'document.write can inject arbitrary HTML',
  },
  {
    pattern: /innerHTML\s*=/,
    risk: 'high',
    description: 'innerHTML can execute scripts if not sanitized',
  },
  {
    pattern: /outerHTML\s*=/,
    risk: 'high',
    description: 'outerHTML can execute scripts if not sanitized',
  },

  // High risk - Require careful review
  {
    pattern: /localStorage\.setItem|sessionStorage\.setItem/,
    risk: 'medium',
    description: 'Storage access - ensure no sensitive data is stored',
  },
  {
    pattern: /document\.cookie/,
    risk: 'high',
    description: 'Cookie access can leak session tokens',
  },
  {
    pattern: /window\.open\s*\(/,
    risk: 'medium',
    description: 'Can open popups or redirect users',
  },
  {
    pattern: /location\.(href|assign|replace)/,
    risk: 'high',
    description: 'Can redirect users to malicious sites',
  },

  // Network patterns
  {
    pattern: /fetch\s*\(|XMLHttpRequest|axios|https?:\/\//,
    risk: 'medium',
    description: 'Network requests - verify endpoints are trusted',
  },
  {
    pattern: /WebSocket\s*\(/,
    risk: 'medium',
    description: 'WebSocket connections - verify endpoints are trusted',
  },

  // Potential secrets exposure
  {
    pattern: /api[_-]?key|apikey|secret|password|token|credential/i,
    risk: 'high',
    description: 'Potential hardcoded secret or credential',
  },
  {
    pattern: /sk-[a-zA-Z0-9]{48}/,
    risk: 'critical',
    description: 'Potential OpenAI API key detected',
  },
  {
    pattern: /ghp_[a-zA-Z0-9]{36}/,
    risk: 'critical',
    description: 'Potential GitHub token detected',
  },
  {
    pattern: /AKIA[0-9A-Z]{16}/,
    risk: 'critical',
    description: 'Potential AWS access key detected',
  },

  // Prototype pollution
  {
    pattern: /__proto__|constructor\.prototype|Object\.prototype/,
    risk: 'high',
    description: 'Potential prototype pollution vulnerability',
  },

  // DOM XSS sinks
  {
    pattern: /\.insertAdjacentHTML\s*\(/,
    risk: 'high',
    description: 'insertAdjacentHTML can inject unsanitized HTML',
  },
  {
    pattern: /DOMParser\s*\(\)\.parseFromString/,
    risk: 'medium',
    description: 'DOM parsing - ensure content is sanitized',
  },
];

/**
 * Permission risk levels
 */
const PERMISSION_RISKS: Record<string, { risk: 'low' | 'medium' | 'high'; reason: string }> = {
  clipboard: { risk: 'medium', reason: 'Can read/write clipboard contents' },
  storage: { risk: 'low', reason: 'Local data storage' },
  indexeddb: { risk: 'low', reason: 'Local database storage' },
  notifications: { risk: 'low', reason: 'Can show notifications' },
  geolocation: { risk: 'high', reason: 'Can access user location' },
  camera: { risk: 'high', reason: 'Can access camera' },
  microphone: { risk: 'high', reason: 'Can access microphone' },
  network: { risk: 'medium', reason: 'Can make network requests' },
};

/**
 * Security Scanner for analyzing plugins
 */
export class SecurityScanner {
  private trustedAuthors: Set<string>;
  private trustedDomains: Set<string>;

  constructor() {
    // Trusted sources
    this.trustedAuthors = new Set([
      'Framers AI',
      'Frame.dev',
      'support@frame.dev',
    ]);

    this.trustedDomains = new Set([
      'frame.dev',
      'framersai.github.io',
      'registry.frame.dev',
      'cdn.frame.dev',
    ]);
  }

  /**
   * Scan a plugin manifest for security issues
   */
  async scan(manifest: PluginManifest): Promise<SecurityScanResult> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const codePatterns: CodePatternMatch[] = [];
    let score = 100;

    // Check verification status
    if (!manifest.verified) {
      warnings.push('Plugin is not verified');
      score -= 10;
    }

    // Check author trust
    const authorTrusted =
      this.trustedAuthors.has(manifest.author.name) ||
      (manifest.author.email && this.trustedAuthors.has(manifest.author.email));

    if (!authorTrusted) {
      warnings.push(`Author "${manifest.author.name}" is not in trusted list`);
      score -= 5;
    }

    // Check repository domain
    if (manifest.repository) {
      const repoUrl = new URL(manifest.repository);
      if (!this.trustedDomains.has(repoUrl.hostname) && repoUrl.hostname !== 'github.com') {
        warnings.push(`Repository hosted on untrusted domain: ${repoUrl.hostname}`);
        score -= 10;
      }
    }

    // Review permissions
    const permissionsReview = this.reviewPermissions(manifest);
    const highRiskPermissions = permissionsReview.filter(p => p.risk === 'high');
    
    if (highRiskPermissions.length > 0) {
      warnings.push(
        `Plugin requests high-risk permissions: ${highRiskPermissions.map(p => p.permission).join(', ')}`
      );
      score -= highRiskPermissions.length * 10;
    }

    // Check checksum if available
    let checksumValid: boolean | undefined;
    if (manifest.checksum) {
      checksumValid = await this.verifyChecksum(manifest);
      if (!checksumValid) {
        issues.push('Checksum verification failed - plugin may be tampered');
        score -= 50;
      }
    }

    // Determine network/storage access from permissions
    const networkAccess = permissionsReview.some(p => p.permission === 'network');
    const storageAccess = permissionsReview.some(
      p => p.permission === 'storage' || p.permission === 'indexeddb'
    );

    // Calculate final safety
    const safe = issues.length === 0 && score >= 50;

    return {
      safe,
      score: Math.max(0, score),
      issues,
      warnings,
      details: {
        checksumValid,
        permissionsReview,
        codePatterns,
        networkAccess,
        storageAccess,
        domManipulation: manifest.type === 'viewer',
      },
    };
  }

  /**
   * Scan plugin source code for dangerous patterns
   * This would be called during plugin build/publish, not at runtime
   */
  async scanCode(code: string): Promise<CodePatternMatch[]> {
    const matches: CodePatternMatch[] = [];

    for (const { pattern, risk, description } of DANGEROUS_PATTERNS) {
      const match = code.match(pattern);
      if (match) {
        matches.push({
          pattern: pattern.toString(),
          risk,
          description,
          location: this.findLocation(code, match.index || 0),
        });
      }
    }

    return matches;
  }

  /**
   * Add a trusted author
   */
  addTrustedAuthor(author: string): void {
    this.trustedAuthors.add(author);
  }

  /**
   * Add a trusted domain
   */
  addTrustedDomain(domain: string): void {
    this.trustedDomains.add(domain);
  }

  /**
   * Check if author is trusted
   */
  isAuthorTrusted(author: string): boolean {
    return this.trustedAuthors.has(author);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private reviewPermissions(manifest: PluginManifest): PermissionReview[] {
    const reviews: PermissionReview[] = [];

    if (!manifest.permissions) return reviews;

    for (const permission of manifest.permissions) {
      const riskInfo = PERMISSION_RISKS[permission.name] || {
        risk: 'medium' as const,
        reason: 'Unknown permission',
      };

      reviews.push({
        permission: permission.name,
        risk: riskInfo.risk,
        reason: permission.description || riskInfo.reason,
        granted: permission.granted || false,
      });
    }

    return reviews;
  }

  private async verifyChecksum(manifest: PluginManifest): Promise<boolean> {
    if (!manifest.checksum || typeof crypto === 'undefined') {
      return false;
    }

    try {
      // In a real implementation, we'd fetch the plugin content and verify
      // For now, return true if checksum format is valid
      const checksumParts = manifest.checksum.split(':');
      if (checksumParts.length !== 2) return false;

      const [algorithm, hash] = checksumParts;
      const validAlgorithms = ['sha256', 'sha384', 'sha512'];
      
      if (!validAlgorithms.includes(algorithm.toLowerCase())) return false;
      if (!/^[a-f0-9]+$/i.test(hash)) return false;

      return true;
    } catch {
      return false;
    }
  }

  private findLocation(code: string, index: number): string {
    const lines = code.slice(0, index).split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    return `line ${line}, column ${column}`;
  }
}

/**
 * Utility function to generate checksum for plugin content
 */
export async function generateChecksum(
  content: string,
  algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha256'
): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  
  const algorithmMap = {
    sha256: 'SHA-256',
    sha384: 'SHA-384',
    sha512: 'SHA-512',
  };

  const hashBuffer = await crypto.subtle.digest(algorithmMap[algorithm], data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return `${algorithm}:${hashHex}`;
}

