#!/usr/bin/env node

/**
 * Clear Codex Cache Script
 * 
 * This script clears all IndexedDB databases used by Quarry Codex.
 * Run this in the browser console or use the browser version below.
 * 
 * Databases cleared:
 * - fabric_codex_db (main codex database with strand_blocks table)
 * - quarry-codex-local (local codex storage)
 * - openstrand (general storage)
 * 
 * Usage:
 * 1. Open your browser to quarry.space/app or localhost:3000/quarry
 * 2. Open DevTools (F12) → Console
 * 3. Paste and run the code below
 */

// ============================================================================
// BROWSER CONSOLE VERSION - Copy/paste this into browser DevTools Console
// ============================================================================

const CLEAR_CACHE_SCRIPT = `
(async function clearCodexCache() {
  const databases = [
    'fabric_codex_db',
    'quarry-codex-local', 
    'openstrand'
  ];
  
  console.log('🗑️ Clearing Quarry Codex caches...');
  
  for (const dbName of databases) {
    try {
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => {
          console.log(\`✅ Deleted: \${dbName}\`);
          resolve();
        };
        request.onerror = () => {
          console.warn(\`⚠️ Failed to delete: \${dbName}\`, request.error);
          resolve(); // Continue even if one fails
        };
        request.onblocked = () => {
          console.warn(\`⏳ Blocked: \${dbName} - close other tabs using this site\`);
          resolve();
        };
      });
    } catch (error) {
      console.error(\`❌ Error deleting \${dbName}:\`, error);
    }
  }
  
  // Also clear relevant localStorage items
  const lsKeys = Object.keys(localStorage).filter(k => 
    k.startsWith('quarry-') || 
    k.startsWith('codex-') ||
    k.startsWith('fabric-')
  );
  
  lsKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(\`🧹 Removed localStorage: \${key}\`);
  });
  
  console.log('');
  console.log('✨ Cache cleared! Refresh the page to regenerate block tags.');
  console.log('💡 Tip: After refresh, click "Parse Blocks" on any strand to generate tags.');
})();
`;

console.log('='.repeat(70));
console.log('QUARRY CODEX CACHE CLEAR SCRIPT');
console.log('='.repeat(70));
console.log('');
console.log('To clear the IndexedDB cache and regenerate block tags:');
console.log('');
console.log('1. Open your browser to quarry.space/app (or localhost:3000/quarry)');
console.log('2. Open DevTools: Press F12 (or Cmd+Option+I on Mac)');
console.log('3. Go to the Console tab');
console.log('4. Copy and paste this code:');
console.log('');
console.log('-'.repeat(70));
console.log(CLEAR_CACHE_SCRIPT);
console.log('-'.repeat(70));
console.log('');
console.log('5. Press Enter to run');
console.log('6. Refresh the page');
console.log('7. Navigate to any strand and click "Parse Blocks" in the Blocks tab');
console.log('');
console.log('='.repeat(70));

