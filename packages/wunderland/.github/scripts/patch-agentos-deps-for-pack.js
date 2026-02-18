#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const agentosPkgPath = path.resolve('packages/agentos/package.json');
const adapterPkgPath = path.resolve('packages/sql-storage-adapter/package.json');
const backupPath = path.resolve('packages/agentos/package.json.bak');

function main() {
  console.log('Patching AgentOS package.json to replace workspace deps before pack...');
  const agentosPkg = JSON.parse(fs.readFileSync(agentosPkgPath, 'utf8'));
  const adapterPkg = JSON.parse(fs.readFileSync(adapterPkgPath, 'utf8'));

  // Backup original
  fs.writeFileSync(backupPath, JSON.stringify(agentosPkg, null, 2));
  console.log(`Backup written: ${backupPath}`);

  if (!agentosPkg.dependencies) agentosPkg.dependencies = {};

  // Replace nested workspace dependency with real semver so npm can resolve against our file: tarball (version inside tarball will satisfy semver)
  const adapterVersion = adapterPkg.version;
  if (agentosPkg.dependencies['@framers/sql-storage-adapter']) {
    agentosPkg.dependencies['@framers/sql-storage-adapter'] = `^${adapterVersion}`;
    console.log(`Set @framers/sql-storage-adapter to ^${adapterVersion} in AgentOS deps`);
  }

  fs.writeFileSync(agentosPkgPath, JSON.stringify(agentosPkg, null, 2));
  console.log('Patched AgentOS package.json');
}

main();


