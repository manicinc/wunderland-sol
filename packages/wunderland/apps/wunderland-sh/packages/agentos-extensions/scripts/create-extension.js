#!/usr/bin/env node

/**
 * Script to create a new extension from template
 * Usage: npm run new:extension
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createExtension() {
  console.log('🚀 Create New AgentOS Extension\n');
  
  // Get extension details
  const name = await question('Extension name (e.g., weather): ');
  const displayName = await question('Display name (e.g., Weather Extension): ');
  const description = await question('Description: ');
  const author = await question('Author name: ');
  const email = await question('Author email: ');
  
  const extName = `ext-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const packageName = `@framers/agentos-${extName}`;
  const extensionId = `com.framers.ext.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  
  console.log('\n📦 Creating extension...');
  console.log(`  Directory: packages/${extName}`);
  console.log(`  Package: ${packageName}`);
  console.log(`  ID: ${extensionId}\n`);
  
  // Copy template
  const templateDir = path.join(__dirname, '../packages/ext-template');
  const targetDir = path.join(__dirname, '../packages', extName);
  
  if (fs.existsSync(targetDir)) {
    console.error('❌ Extension already exists!');
    process.exit(1);
  }
  
  // Copy directory recursively
  copyDirectory(templateDir, targetDir);
  
  // Update package.json
  const packageJsonPath = path.join(targetDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  packageJson.name = packageName;
  packageJson.description = description;
  packageJson.author = {
    name: author,
    email: email
  };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  // Update manifest.json
  const manifestPath = path.join(targetDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  manifest.id = extensionId;
  manifest.name = displayName;
  manifest.description = description;
  manifest.author = {
    name: author,
    email: email
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  // Update README
  const readmePath = path.join(targetDir, 'README.md');
  let readme = fs.readFileSync(readmePath, 'utf-8');
  readme = readme.replace(/Template Extension/g, displayName);
  readme = readme.replace(/ext-template/g, extName);
  readme = readme.replace(/@framers\/agentos-ext-template/g, packageName);
  fs.writeFileSync(readmePath, readme);
  
  console.log('✅ Extension created successfully!\n');
  console.log('Next steps:');
  console.log(`  1. cd packages/${extName}`);
  console.log('  2. npm install');
  console.log('  3. Implement your tools in src/tools/');
  console.log('  4. npm test');
  console.log('  5. Submit a PR!\n');
  
  rl.close();
}

function copyDirectory(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.name === 'node_modules' || entry.name === 'dist') {
      continue;
    }
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

createExtension().catch(console.error);
