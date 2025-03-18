#!/usr/bin/env node

/**
 * Test Documentation Checker
 *
 * This script scans test files to verify they have proper documentation headers.
 * It helps maintain the documentation standard defined in TEST_DOCUMENTATION_GUIDE.md.
 *
 * Usage:
 *   node check-test-docs.js [directory]
 *
 * If no directory is specified, it will check all test files in __tests__/.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const TEST_FILE_PATTERN = /\.test\.(ts|js)$/;
const REQUIRED_SECTIONS = [
  'Test Suite:',
  'Purpose:',
  'Key Components Tested:',
  'Test Groups:',
];

// ANSI color codes for pretty output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Get target directory from command line args, or use default
const targetDir = process.argv[2] || path.join(__dirname, '..');

// Stats to report at the end
const stats = {
  scanned: 0,
  fullyDocumented: 0,
  partiallyDocumented: 0,
  undocumented: 0,
};

/**
 * Check if a file has proper test documentation
 */
function checkFile(filePath) {
  stats.scanned++;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').slice(0, 30); // Check first 30 lines

    // Look for documentation comment block
    const hasDocBlock = lines.some((line) => line.trim() === '/**');
    if (!hasDocBlock) {
      console.log(
        `${COLORS.red}✗ Missing doc block${COLORS.reset}: ${filePath}`,
      );
      stats.undocumented++;
      return;
    }

    // Check for required sections
    const missingSections = [];
    REQUIRED_SECTIONS.forEach((section) => {
      if (!lines.some((line) => line.includes(section))) {
        missingSections.push(section);
      }
    });

    if (missingSections.length === 0) {
      console.log(
        `${COLORS.green}✓ Fully documented${COLORS.reset}: ${filePath}`,
      );
      stats.fullyDocumented++;
    } else {
      console.log(
        `${COLORS.yellow}⚠ Partially documented${COLORS.reset}: ${filePath}`,
      );
      console.log(`  Missing sections: ${missingSections.join(', ')}`);
      stats.partiallyDocumented++;
    }
  } catch (error) {
    console.error(
      `${COLORS.red}Error reading file${COLORS.reset}: ${filePath}`,
      error.message,
    );
  }
}

/**
 * Recursively scan directory for test files
 */
function scanDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && file !== 'node_modules') {
      scanDirectory(filePath);
    } else if (TEST_FILE_PATTERN.test(file)) {
      checkFile(filePath);
    }
  });
}

// Main execution
console.log(
  `${COLORS.cyan}Checking test documentation in: ${targetDir}${COLORS.reset}\n`,
);
scanDirectory(targetDir);

// Print summary
console.log(`\n${COLORS.cyan}Documentation Check Summary:${COLORS.reset}`);
console.log(`Total files scanned: ${stats.scanned}`);
console.log(
  `${COLORS.green}Fully documented: ${stats.fullyDocumented}${COLORS.reset}`,
);
console.log(
  `${COLORS.yellow}Partially documented: ${stats.partiallyDocumented}${COLORS.reset}`,
);
console.log(`${COLORS.red}Undocumented: ${stats.undocumented}${COLORS.reset}`);

// Exit with error if any undocumented files found (useful for CI)
process.exit(stats.undocumented > 0 ? 1 : 0);
