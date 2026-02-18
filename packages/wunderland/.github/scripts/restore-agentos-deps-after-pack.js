#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const agentosPkgPath = path.resolve('packages/agentos/package.json');
const backupPath = path.resolve('packages/agentos/package.json.bak');

function main() {
  if (!fs.existsSync(backupPath)) {
    console.log('No backup found for AgentOS package.json; nothing to restore.');
    return;
  }
  const original = fs.readFileSync(backupPath, 'utf8');
  fs.writeFileSync(agentosPkgPath, original);
  fs.unlinkSync(backupPath);
  console.log('Restored original AgentOS package.json from backup');
}

main();


