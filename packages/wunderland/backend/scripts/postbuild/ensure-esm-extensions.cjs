const fs = require('fs');
const path = require('path');

async function main() {
  const distDir = path.resolve(__dirname, '..', '..', 'dist');

  if (!fs.existsSync(distDir)) {
    console.warn('[ensure-esm-extensions] Dist directory not found, skipping.');
    return;
  }

  const { init, parse } = await import('es-module-lexer');
  await init;

  const filesToProcess = collectJsFiles(distDir);
  const knownExtensions = ['.js', '.mjs', '.cjs', '.json', '.node', '.wasm'];
  let filesModified = 0;

  for (const filePath of filesToProcess) {
    const source = fs.readFileSync(filePath, 'utf8');
    const [imports] = parse(source);

    if (!imports.length) {
      continue;
    }

    const modifications = [];

    for (const record of imports) {
      const specifier = record.n;
      if (!specifier) {
        continue;
      }

      if (!specifier.startsWith('.')) {
        continue;
      }

      if (specifier.includes('?') || specifier.includes('#')) {
        continue;
      }

      if (knownExtensions.some((ext) => specifier.endsWith(ext))) {
        continue;
      }

      const resolvedWithoutExt = path.resolve(path.dirname(filePath), specifier);
      let suffix = findExistingSuffix(resolvedWithoutExt, knownExtensions);

      if (!suffix) {
        continue;
      }

      modifications.push({ start: record.s, end: record.e, replacement: specifier + suffix });
    }

    if (modifications.length === 0) {
      continue;
    }

    modifications.sort((a, b) => b.start - a.start);

    let updated = source;
    for (const mod of modifications) {
      updated = `${updated.slice(0, mod.start)}${mod.replacement}${updated.slice(mod.end)}`;
    }

    if (updated !== source) {
      fs.writeFileSync(filePath, updated);
      filesModified += 1;
      console.log(`[ensure-esm-extensions] Updated ${path.relative(distDir, filePath)} (${modifications.length} specifier${modifications.length > 1 ? 's' : ''})`);
    }
  }

  console.log(`[ensure-esm-extensions] Completed. Modified ${filesModified} file${filesModified === 1 ? '' : 's'}.`);
}

function collectJsFiles(rootDir) {
  const results = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        stack.push(path.join(current, entry.name));
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        results.push(path.join(current, entry.name));
      }
    }
  }

  return results;
}

function findExistingSuffix(basePathWithoutExt, extensions) {
  for (const ext of extensions) {
    if (fs.existsSync(basePathWithoutExt + ext)) {
      return ext;
    }
  }

  for (const ext of extensions) {
    const indexCandidate = path.join(basePathWithoutExt, `index${ext}`);
    if (fs.existsSync(indexCandidate)) {
      return `/index${ext}`;
    }
  }

  return null;
}

main().catch((error) => {
  console.error('[ensure-esm-extensions] Failed to update import specifiers:', error);
  process.exit(1);
});
