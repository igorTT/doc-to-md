import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

// Skip tests if no API key is available
const hasApiKey = !!process.env.MISTRAL_API_KEY;

describe('translate command', () => {
  const testDir = path.join(process.cwd(), 'test-data');
  const inputFile = path.join(testDir, 'test-input.md');
  const outputFile = path.join(testDir, 'test-output-fr.md');

  beforeAll(async () => {
    // Create test directory if it doesn't exist
    await fs.ensureDir(testDir);

    // Create a test markdown file
    await fs.writeFile(
      inputFile,
      '# Test Document\n\nThis is a test document for translation.',
      'utf-8',
    );
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.remove(inputFile);
      await fs.remove(outputFile);
    } catch (error) {
      console.error('Error cleaning up test files:', error);
    }
  });

  it('should show help for translate command', async () => {
    const { stdout } = await execPromise('node dist/index.js translate --help');

    expect(stdout).toContain('Translate a markdown file');
    expect(stdout).toContain('-i, --input');
    expect(stdout).toContain('-o, --output');
    expect(stdout).toContain('-l, --language');
  });

  it('should fail with missing required options', async () => {
    try {
      await execPromise('node dist/index.js translate');
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      const err = error as { stderr: string };
      expect(err.stderr).toContain('required option');
    }
  });

  it('should fail with invalid language', async () => {
    try {
      await execPromise(
        `node dist/index.js translate -i ${inputFile} -o ${outputFile} -l invalid`,
      );
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      const err = error as { stderr: string };
      expect(err.stderr).toContain('Unsupported language');
    }
  });

  // Skip actual translation test if no API key is available
  (hasApiKey ? it : it.skip)(
    'should translate a markdown file to French',
    async () => {
      // This test will be skipped if no API key is available
      const { stdout } = await execPromise(
        `node dist/index.js translate -i ${inputFile} -o ${outputFile} -l french`,
      );

      expect(stdout).toContain('Translation to french completed successfully');

      // Check if output file exists
      const outputExists = await fs.pathExists(outputFile);
      expect(outputExists).toBe(true);

      // Check if output file has content
      const outputContent = await fs.readFile(outputFile, 'utf-8');
      expect(outputContent.length).toBeGreaterThan(0);
    },
    // Set longer timeout for API call
    30000,
  );
});
