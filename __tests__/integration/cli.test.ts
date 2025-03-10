import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Helper to run CLI commands
async function runCommand(
  command: string,
): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execAsync(command);
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
    };
  }
}

describe('CLI Integration Tests', () => {
  const testDir = path.join(process.cwd(), 'test-files');
  const inputFile = path.join(testDir, 'test-input.txt');
  const outputFile = path.join(testDir, 'test-output.md');

  // Setup test files
  beforeAll(async () => {
    await fs.ensureDir(testDir);
    await fs.writeFile(inputFile, 'Test content for API conversion');
  });

  // Clean up test files
  afterAll(async () => {
    await fs.remove(testDir);
  });

  // Clean up output file between tests
  afterEach(async () => {
    try {
      await fs.remove(outputFile);
    } catch (error) {
      // Ignore errors if file doesn't exist
    }
  });

  it('should display help information', async () => {
    // Act
    const { stdout } = await runCommand('node dist/index.js --help');

    // Assert
    expect(stdout).toContain('Usage: doc-to-md [options] [command]');
    expect(stdout).toContain('CLI to process files and send them to an API');
    expect(stdout).toContain('process [options]');
  });

  it('should display process command help', async () => {
    // Act
    const { stdout } = await runCommand('node dist/index.js process --help');

    // Assert
    expect(stdout).toContain('Usage: doc-to-md process [options]');
    expect(stdout).toContain('-i, --input <path>');
    expect(stdout).toContain('-o, --output <path>');
    expect(stdout).toContain('-r, --recursive');
    expect(stdout).toContain('-a, --api <url>');
  });

  it('should error when required options are missing', async () => {
    // Act
    const { stderr } = await runCommand('node dist/index.js process');

    // Assert
    expect(stderr).toContain('error: required option');
    expect(stderr).toContain('--input');
  });

  // This test requires a mock server or can be skipped in CI environments
  it.skip('should process a file when API is available', async () => {
    // This test would require setting up a mock API server
    // For now, we'll skip it in automated test runs

    // Act
    const { stdout } = await runCommand(
      `node dist/index.js process --input ${inputFile} --output ${outputFile} --api http://localhost:3000/mock-api`,
    );

    // Assert
    expect(stdout).toContain('Processing completed successfully');

    // Check if output file exists
    const outputExists = await fs.pathExists(outputFile);
    expect(outputExists).toBe(true);
  });
});
