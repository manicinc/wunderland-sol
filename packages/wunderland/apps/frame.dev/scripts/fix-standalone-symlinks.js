#!/usr/bin/env node
/**
 * Fix pnpm symlinks in Next.js standalone output
 * 
 * pnpm creates symlinks to the store which break when copied by electron-builder.
 * This script resolves the symlinks by copying the actual content.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const monorepoRoot = path.join(projectRoot, '..', '..');
const standaloneNodeModules = path.join(projectRoot, '.next', 'standalone', 'node_modules');

console.log('[fix-standalone-symlinks] Checking:', standaloneNodeModules);

if (!fs.existsSync(standaloneNodeModules)) {
  console.log('[fix-standalone-symlinks] No standalone node_modules found, skipping');
  process.exit(0);
}

const entries = fs.readdirSync(standaloneNodeModules, { withFileTypes: true });

for (const entry of entries) {
  const entryPath = path.join(standaloneNodeModules, entry.name);
  
  if (entry.isSymbolicLink()) {
    const target = fs.readlinkSync(entryPath);
    
    // Try multiple possible locations for the symlink target
    let resolvedTarget = null;
    const possiblePaths = [
      path.resolve(standaloneNodeModules, target),  // Relative from standalone
      path.resolve(projectRoot, target.replace(/^\.\.\/\.\.\/\.\.\//, '')),  // Relative from project root
      path.resolve(monorepoRoot, target.replace(/^\.\.\/\.\.\/\.\.\//, '')),  // From monorepo root
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        resolvedTarget = possiblePath;
        break;
      }
    }
    
    // Also try the actual resolved path using realpath
    if (!resolvedTarget) {
      try {
        // For pnpm, try finding the package in the monorepo node_modules
        const packageName = entry.name;
        const monorepoPackage = path.join(monorepoRoot, 'node_modules', packageName);
        if (fs.existsSync(monorepoPackage)) {
          resolvedTarget = fs.realpathSync(monorepoPackage);
        }
      } catch (e) {
        // Ignore
      }
    }
    
    console.log(`[fix-standalone-symlinks] Resolving symlink: ${entry.name} -> ${target}`);
    
    if (!resolvedTarget) {
      console.log(`[fix-standalone-symlinks] Warning: Could not resolve symlink for ${entry.name}`);
      continue;
    }
    
    console.log(`[fix-standalone-symlinks] Found at: ${resolvedTarget}`);
    
    // Remove the symlink
    fs.unlinkSync(entryPath);
    
    // Copy the actual directory/file
    const stat = fs.statSync(resolvedTarget);
    if (stat.isDirectory()) {
      copyDir(resolvedTarget, entryPath);
    } else {
      fs.copyFileSync(resolvedTarget, entryPath);
    }
    
    console.log(`[fix-standalone-symlinks] Copied: ${entry.name}`);
  }
}

console.log('[fix-standalone-symlinks] Done');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      // Resolve symlinks during copy
      try {
        const realPath = fs.realpathSync(srcPath);
        if (fs.existsSync(realPath)) {
          const targetStat = fs.statSync(realPath);
          if (targetStat.isDirectory()) {
            copyDir(realPath, destPath);
          } else {
            fs.copyFileSync(realPath, destPath);
          }
        }
      } catch (e) {
        console.log(`[fix-standalone-symlinks] Warning: Could not resolve nested symlink: ${srcPath}`);
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
