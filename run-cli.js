#!/usr/bin/env node

/**
 * Helper script to run the doc-to-md CLI with proper error handling
 *
 * Usage:
 * node run-cli.js process --input test-files/test-image.jpg --output test-files/result.md --mistral
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

// Get the arguments passed to this script (excluding 'node' and 'run-cli.js')
const args = process.argv.slice(2);

// Check if we have any arguments
if (args.length === 0) {
  console.error('Error: No arguments provided');
  console.log(
    'Usage: node run-cli.js process --input <input-path> --output <output-path> [options]',
  );
  process.exit(1);
}

// Function to run the CLI
async function runCli() {
  try {
    // Ensure the dist directory exists
    const distDir = path.join(__dirname, 'dist');
    if (!(await fs.pathExists(distDir))) {
      console.error(
        'Error: dist directory not found. Build the project first with "yarn build"',
      );
      process.exit(1);
    }

    // Check if the index.js file exists
    const indexPath = path.join(distDir, 'index.js');
    if (!(await fs.pathExists(indexPath))) {
      console.error(
        'Error: index.js not found in dist directory. Build the project first with "yarn build"',
      );
      process.exit(1);
    }

    console.log('Running CLI with arguments:', args.join(' '));

    // Run the CLI using Node
    const cli = spawn('node', [indexPath, ...args], {
      stdio: 'inherit', // This will pipe the child process's stdout/stderr to the parent
      env: process.env,
    });

    // Handle process exit
    cli.on('close', (code) => {
      if (code !== 0) {
        console.error(`CLI process exited with code ${code}`);
      } else {
        console.log('CLI process completed successfully');
      }
    });

    // Handle process errors
    cli.on('error', (err) => {
      console.error('Failed to start CLI process:', err);
    });
  } catch (error) {
    console.error('Error running CLI:', error.message);
    process.exit(1);
  }
}

// Run the CLI
runCli();
