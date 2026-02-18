// File: backend/src/features/auth/va-admin.service.ts
/**
 * @file va-admin.service.ts
 * @description Loads VA (Virtual Assistant) admin emails from a CSV file,
 * caches them in memory, and exposes helpers for auth checks.
 */

import fs from 'fs';
import path from 'path';

let vaAdminEmails: Set<string> = new Set();
let loaded = false;

/**
 * Load VA admin emails from CSV file specified by VA_ADMIN_CSV_PATH env var.
 * CSV format: header row "email", then one email per line.
 * Called once on startup; results cached in memory.
 */
export const loadVaAdminCsv = (): void => {
  const csvPath = process.env.VA_ADMIN_CSV_PATH;
  if (!csvPath) {
    console.info('[VaAdmin] VA_ADMIN_CSV_PATH not set. VA admin system disabled.');
    loaded = true;
    return;
  }

  const resolved = path.isAbsolute(csvPath) ? csvPath : path.resolve(process.cwd(), csvPath);

  if (!fs.existsSync(resolved)) {
    console.warn(`[VaAdmin] CSV file not found at ${resolved}. No VA admins loaded.`);
    loaded = true;
    return;
  }

  try {
    const content = fs.readFileSync(resolved, 'utf-8');
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Skip header row if it looks like a header
    const startIndex = lines[0]?.toLowerCase() === 'email' ? 1 : 0;

    const emails = new Set<string>();
    for (let i = startIndex; i < lines.length; i++) {
      const email = lines[i].toLowerCase().trim();
      if (email && email.includes('@')) {
        emails.add(email);
      }
    }

    vaAdminEmails = emails;
    loaded = true;
    console.info(`[VaAdmin] Loaded ${emails.size} VA admin email(s) from ${resolved}`);
  } catch (error) {
    console.error(`[VaAdmin] Failed to load CSV from ${resolved}:`, error);
    loaded = true;
  }
};

/**
 * Check if the given email belongs to a VA admin.
 */
export const isVaAdmin = (email: string | undefined | null): boolean => {
  if (!loaded) loadVaAdminCsv();
  if (!email) return false;
  return vaAdminEmails.has(email.toLowerCase().trim());
};

/**
 * Get all VA admin emails.
 */
export const getVaAdminEmails = (): string[] => {
  if (!loaded) loadVaAdminCsv();
  return Array.from(vaAdminEmails);
};
