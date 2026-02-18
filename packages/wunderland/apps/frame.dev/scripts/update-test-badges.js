#!/usr/bin/env node
/**
 * Update Test Badges Script
 *
 * Updates the README.md badges with current test count and coverage percentage.
 * Run after tests to keep badges in sync.
 *
 * Usage: node scripts/update-test-badges.js
 * Or via npm: npm run test:badges
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const README_PATH = path.join(__dirname, '..', 'README.md');
const COVERAGE_SUMMARY_PATH = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');

/**
 * Run tests and get test count
 */
function getTestCount() {
  console.log('🧪 Running tests...\n');

  const result = spawnSync('npm', ['run', 'test', '--', '--run', '--reporter=json'], {
    encoding: 'utf-8',
    cwd: path.join(__dirname, '..'),
    maxBuffer: 50 * 1024 * 1024,
    shell: true,
  });

  const output = result.stdout + result.stderr;

  // Look for test summary in output
  // Match: "Tests  11603 passed" or similar
  const match = output.match(/Tests\s+(\d+)\s+passed/i);
  if (match) {
    return parseInt(match[1], 10);
  }

  // Try parsing JSON output
  try {
    const jsonMatch = output.match(/\{[\s\S]*"numPassedTests"\s*:\s*(\d+)[\s\S]*\}/);
    if (jsonMatch) {
      return parseInt(jsonMatch[1], 10);
    }
  } catch (e) {
    // Ignore JSON parse errors
  }

  // Fallback: run with dot reporter and parse
  const dotResult = spawnSync('npm', ['run', 'test', '--', '--run', '--reporter=dot'], {
    encoding: 'utf-8',
    cwd: path.join(__dirname, '..'),
    maxBuffer: 50 * 1024 * 1024,
    shell: true,
  });

  const dotOutput = dotResult.stdout + dotResult.stderr;
  const dotMatch = dotOutput.match(/(\d+)\s+passed/i);
  if (dotMatch) {
    return parseInt(dotMatch[1], 10);
  }

  return null;
}

/**
 * Run coverage and get percentage
 */
function getCoverage() {
  console.log('📊 Running coverage analysis...\n');

  const result = spawnSync('npm', ['run', 'test:coverage', '--', '--coverage.reporter=json-summary'], {
    encoding: 'utf-8',
    cwd: path.join(__dirname, '..'),
    maxBuffer: 50 * 1024 * 1024,
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const output = result.stdout + result.stderr;

  // Try to read from coverage summary file
  try {
    if (fs.existsSync(COVERAGE_SUMMARY_PATH)) {
      const summary = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_PATH, 'utf-8'));
      if (summary.total && summary.total.lines) {
        return Math.round(summary.total.lines.pct);
      }
    }
  } catch (e) {
    // Fall through to parsing output
  }

  // Parse from output: "All files          |   40.38 |"
  const match = output.match(/All files\s+\|\s+([\d.]+)\s+\|/);
  if (match) {
    return Math.round(parseFloat(match[1]));
  }

  // Try alternative format
  const altMatch = output.match(/Statements\s+:\s+([\d.]+)%/);
  if (altMatch) {
    return Math.round(parseFloat(altMatch[1]));
  }

  return null;
}

/**
 * Format number with comma separators for URL
 */
function formatNumber(num) {
  return num.toLocaleString('en-US').replace(/,/g, '%2C');
}

/**
 * Get color based on coverage percentage
 */
function getCoverageColor(percentage) {
  if (percentage >= 80) return 'brightgreen';
  if (percentage >= 60) return 'green';
  if (percentage >= 40) return 'yellowgreen';
  if (percentage >= 20) return 'yellow';
  return 'red';
}

/**
 * Update README badges
 */
function updateReadmeBadges(testCount, coverage) {
  console.log(`\n📈 Results:`);
  console.log(`   Tests: ${testCount.toLocaleString()} passing`);
  console.log(`   Coverage: ${coverage}%\n`);

  let readme = fs.readFileSync(README_PATH, 'utf-8');

  // Update test count badge
  const testBadgePattern = /\[!\[Tests\]\(https:\/\/img\.shields\.io\/badge\/tests-[\d%2C,]+_passing-\w+/g;
  const newTestBadge = `[![Tests](https://img.shields.io/badge/tests-${formatNumber(testCount)}_passing-brightgreen`;

  if (testBadgePattern.test(readme)) {
    readme = readme.replace(testBadgePattern, newTestBadge);
    console.log('✅ Updated test count badge');
  } else {
    console.log('⚠️  Test badge pattern not found in README');
  }

  // Update coverage badge
  const coverageBadgePattern = /\[!\[Coverage\]\(https:\/\/img\.shields\.io\/badge\/coverage-\d+%25-\w+/g;
  const coverageColor = getCoverageColor(coverage);
  const newCoverageBadge = `[![Coverage](https://img.shields.io/badge/coverage-${coverage}%25-${coverageColor}`;

  if (coverageBadgePattern.test(readme)) {
    readme = readme.replace(coverageBadgePattern, newCoverageBadge);
    console.log('✅ Updated coverage badge');
  } else {
    console.log('⚠️  Coverage badge pattern not found in README');
  }

  fs.writeFileSync(README_PATH, readme);
}

/**
 * Main function
 */
function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    📊 Test Badge Updater                       ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get test count
  const testCount = getTestCount();
  if (testCount === null) {
    console.error('❌ Could not determine test count');
    process.exit(1);
  }

  // Get coverage
  const coverage = getCoverage();
  if (coverage === null) {
    console.error('❌ Could not determine coverage percentage');
    console.error('   Using last known value from README');

    // Read current coverage from README as fallback
    const readme = fs.readFileSync(README_PATH, 'utf-8');
    const match = readme.match(/coverage-(\d+)%25/);
    if (match) {
      updateReadmeBadges(testCount, parseInt(match[1], 10));
    } else {
      process.exit(1);
    }
    return;
  }

  updateReadmeBadges(testCount, coverage);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  ✅ README.md updated: ${testCount.toLocaleString()} tests, ${coverage}% coverage`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main();
