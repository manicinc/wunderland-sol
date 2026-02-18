const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '../apps/agentos.sh/messages');
const SOURCE_FILE = 'en.json';
const TARGET_FILES = ['de.json', 'es.json', 'fr.json', 'ja.json', 'ko.json', 'pt.json', 'zh.json'];

// Helper to deeply sort keys for consistent ordering
function sortKeys(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj;
  }
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = sortKeys(obj[key]);
    return acc;
  }, {});
}

// Helper to deep merge keys from source to target
// Returns true if changes were made
function deepMerge(source, target) {
  let modified = false;
  
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (!Object.prototype.hasOwnProperty.call(target, key)) {
        // Key missing in target, copy from source (fallback to English)
        target[key] = source[key];
        modified = true;
      } else if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        // Nested object, recurse
        if (typeof target[key] !== 'object' || target[key] === null || Array.isArray(target[key])) {
          // Target has different type, overwrite
          target[key] = source[key];
          modified = true;
        } else {
          if (deepMerge(source[key], target[key])) {
            modified = true;
          }
        }
      }
      // Note: Arrays are treated as atomic values here. 
      // If source has array and target has array, we assume target is correct or translated.
      // If target is missing array, it gets copied in the first if block.
    }
  }
  return modified;
}

function syncKeys() {
  const sourcePath = path.join(MESSAGES_DIR, SOURCE_FILE);
  
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found: ${sourcePath}`);
    process.exit(1);
  }

  const sourceContent = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  let hasChanges = false;

  for (const targetFile of TARGET_FILES) {
    const targetPath = path.join(MESSAGES_DIR, targetFile);
    
    let targetContent = {};
    if (fs.existsSync(targetPath)) {
      try {
        targetContent = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      } catch (e) {
        console.error(`Error parsing ${targetFile}, skipping...`);
        continue;
      }
    } else {
      console.log(`Creating new file: ${targetFile}`);
    }

    const modified = deepMerge(sourceContent, targetContent);
    
    // Always write back to sort keys and ensure consistency
    // But we only report "Modified" if actual keys were added/changed
    if (modified) {
        console.log(`Synced missing keys to ${targetFile}`);
        hasChanges = true;
    }

    // Sort keys to match source order roughly (alphabetical)
    // This helps with git diffs
    const sortedTarget = sortKeys(targetContent);
    
    fs.writeFileSync(targetPath, JSON.stringify(sortedTarget, null, 2) + '\n', 'utf8');
  }

  if (hasChanges) {
    console.log('Successfully synced keys to all language files.');
  } else {
    console.log('All language files are already in sync.');
  }
}

syncKeys();



