import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { MistralService } from './services/mistralService';

// Define the options interface
interface ProcessOptions {
  input: string;
  output: string;
  recursive?: boolean;
  api?: string;
  useMistral?: boolean;
}

/**
 * Process files from input path and save results to output path
 * @param options Processing options
 */
export async function processFiles(options: ProcessOptions): Promise<void> {
  const { input, output, recursive = false, api, useMistral = false } = options;

  // Check if input path exists
  if (!(await fs.pathExists(input))) {
    throw new Error(`Input path does not exist: ${input}`);
  }

  // Create output directory if it doesn't exist
  await fs.ensureDir(path.dirname(output));

  const inputStat = await fs.stat(input);

  if (inputStat.isFile()) {
    // Process single file
    await processFile(input, output, api, useMistral);
  } else if (inputStat.isDirectory()) {
    // Process directory
    await processDirectory(input, output, api, recursive, useMistral);
  } else {
    throw new Error(`Unsupported file type: ${input}`);
  }
}

/**
 * Process a single file
 * @param inputPath Path to input file
 * @param outputPath Path to output file
 * @param apiUrl API endpoint URL
 * @param useMistral Whether to use Mistral OCR API
 */
async function processFile(
  inputPath: string,
  outputPath: string,
  apiUrl?: string,
  useMistral = false,
): Promise<void> {
  try {
    console.log(`Processing file: ${inputPath}`);

    let response: string;

    if (useMistral) {
      // Use Mistral OCR API
      const mistralService = new MistralService();
      response = await mistralService.processFile(inputPath);
    } else if (apiUrl) {
      // Use custom API
      // Read file content
      const fileContent = await fs.readFile(inputPath, 'utf-8');
      // Send to API
      response = await sendToApi(fileContent, apiUrl);
    } else {
      throw new Error('Either apiUrl or useMistral must be specified');
    }

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));

    // Write response to output file
    await fs.writeFile(outputPath, response, 'utf-8');

    console.log(`File processed successfully: ${outputPath}`);
  } catch (error) {
    throw new Error(
      `Failed to process file ${inputPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Process a directory of files
 * @param inputDir Input directory path
 * @param outputDir Output directory path
 * @param apiUrl API endpoint URL
 * @param recursive Whether to process subdirectories
 * @param useMistral Whether to use Mistral OCR API
 */
async function processDirectory(
  inputDir: string,
  outputDir: string,
  apiUrl?: string,
  recursive = false,
  useMistral = false,
): Promise<void> {
  // Ensure output directory exists
  await fs.ensureDir(outputDir);

  // Get all files in directory
  const files = await fs.readdir(inputDir);

  // Initialize Mistral service if needed (to avoid creating multiple instances)
  let mistralService: MistralService | undefined;
  if (useMistral) {
    mistralService = new MistralService();
  }

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const stat = await fs.stat(inputPath);

    if (stat.isFile()) {
      // Skip unsupported files when using Mistral
      if (
        useMistral &&
        mistralService &&
        !mistralService.isFileSupported(inputPath)
      ) {
        console.log(`Skipping unsupported file for OCR: ${inputPath}`);
        continue;
      }

      // Generate output file path with .md extension
      const outputFileName = path.basename(file, path.extname(file)) + '.md';
      const outputPath = path.join(outputDir, outputFileName);

      await processFile(inputPath, outputPath, apiUrl, useMistral);
    } else if (stat.isDirectory() && recursive) {
      // Process subdirectory if recursive option is enabled
      const subOutputDir = path.join(outputDir, file);
      await processDirectory(
        inputPath,
        subOutputDir,
        apiUrl,
        recursive,
        useMistral,
      );
    }
  }
}

/**
 * Send file content to API
 * @param content File content
 * @param apiUrl API endpoint URL
 * @returns Processed content
 */
async function sendToApi(content: string, apiUrl: string): Promise<string> {
  try {
    const response = await axios.post(
      apiUrl,
      {
        content,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `API request failed: ${error.message} (${
          error.response?.status || 'unknown status'
        })`,
      );
    }
    throw error;
  }
}
