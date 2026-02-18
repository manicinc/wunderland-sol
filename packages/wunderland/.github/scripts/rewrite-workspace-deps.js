#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Get paths from arguments or use defaults
const pkgPath = path.resolve(process.argv[2] || 'deployment/backend/package.json');
const packsDir = path.resolve(process.argv[3] || 'deployment/backend/packs');

console.log(`Rewriting workspace dependencies in ${pkgPath}`);
console.log(`Looking for packed tarballs in ${packsDir}`);

try {
  // Read package.json
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  console.log('Current dependencies:', pkg.dependencies);

  // List files in packs directory
  const files = fs.readdirSync(packsDir);
  console.log('Found pack files:', files);

  // Find tarball files (be lenient: allow prereleases or custom tags)
  const agentosTgz = files.find(f => f.includes('framers-agentos') && f.endsWith('.tgz'));
  const adapterTgz = files.find(f => f.includes('framers-sql-storage-adapter') && f.endsWith('.tgz'));
  const sharedTgz = files.find(f => f.includes('framers-shared') && f.endsWith('.tgz'));

  console.log('AgentOS tarball:', agentosTgz);
  console.log('SQL Storage Adapter tarball:', adapterTgz);

  // Initialize dependencies if needed
  if (!pkg.dependencies) {
    pkg.dependencies = {};
  }

  // Helper to find a tgz for a given scoped package name as fallback
  function findTarballForScopedName(scopedName) {
    // Convert @framers/pkg or @framers/namespace-pkg to framers-pkg
    const base = scopedName.replace(/^@/, '').replace('/', '-');
    return files.find(f => f.startsWith(base) && f.endsWith('.tgz'));
  }

  // Rewrite workspace dependencies
  let rewritten = false;
  const targets = [
    ['@framers/agentos', agentosTgz],
    ['@framers/sql-storage-adapter', adapterTgz],
    ['@framers/shared', sharedTgz],
  ];

  for (const [depName, explicitTgz] of targets) {
    if (!pkg.dependencies[depName]) continue;

    const current = String(pkg.dependencies[depName]);
    if (current.startsWith('file:./packs/') && current.endsWith('.tgz')) {
      continue; // already rewritten
    }

    let chosenTgz = explicitTgz || findTarballForScopedName(depName);
    if (!chosenTgz) {
      console.warn(`No tarball found for ${depName} in ${packsDir}. Will keep as-is for now.`);
      continue;
    }

    pkg.dependencies[depName] = `file:./packs/${chosenTgz}`;
    console.log(`Rewrote ${depName} -> file:./packs/${chosenTgz}`);
    rewritten = true;
  }

  // Always write the package.json back (so that debug step can show exact state)
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log('Updated package.json written.');
  console.log('New dependencies:', pkg.dependencies);

  // Hard fail if any of the target deps still use workspace: protocol
  const offenders = Object.entries(pkg.dependencies || {})
    .filter(([name, value]) =>
      ['@framers/agentos', '@framers/sql-storage-adapter', '@framers/shared'].includes(name) &&
      typeof value === 'string' && value.startsWith('workspace:'));

  if (offenders.length > 0) {
    console.error('Found unresolved workspace:* dependencies after rewrite:', offenders);
    process.exit(1);
  }
} catch (error) {
  console.error('Error rewriting dependencies:', error);
  process.exit(1);
}
