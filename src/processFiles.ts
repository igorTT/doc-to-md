import fs from 'fs-extra';
import path from 'path';
import { MistralService } from './services/mistralService';
import { TokenCountService } from './services/tokenCountService';

// Define the options interface for PDF processing
interface ProcessOptions {
  input: string;
  output: string;
}

/**
 * Process a single PDF file and save the result to the output path using Mistral OCR
 * Extracts text and images from the PDF document and converts them to markdown format
 *
 * @param options PDF processing options
 * @throws Error if input file doesn't exist, is not a file, or processing fails
 */
export async function processFiles(options: ProcessOptions): Promise<void> {
  const { input, output } = options;

  // Check if input file exists
  if (!(await fs.pathExists(input))) {
    throw new Error(`Input file does not exist: ${input}`);
  }

  // Verify input is a file, not a directory
  const inputStat = await fs.stat(input);
  if (!inputStat.isFile()) {
    throw new Error(`Input must be a file, not a directory: ${input}`);
  }

  try {
    console.log(`Processing PDF file: ${input}`);

    // Create images folder based on input file name (without extension)
    const inputFileName = path.basename(input, path.extname(input));
    const outputDir = path.dirname(output);
    const imagesDir = path.join(outputDir, `${inputFileName}-images`);

    // Ensure images directory exists
    await fs.ensureDir(imagesDir);

    // Use Mistral OCR API to process the PDF
    const mistralService = new MistralService();
    const response = await mistralService.processFile(input, imagesDir);

    // Count tokens in the OCR response
    const tokenCountService = new TokenCountService();
    const tokenCount = tokenCountService.countTokens(response);

    // Calculate estimated cost (using Mistral Large rate as an example)
    const estimatedCost = tokenCountService.estimateCost(tokenCount, 0.008);

    console.log(`OCR result token count: ${tokenCount}`);
    console.log(`Estimated cost for OCR: $${estimatedCost.toFixed(4)}`);

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(output));

    // Write response to output file
    await fs.writeFile(output, response, 'utf-8');

    console.log(`PDF processed successfully: ${output}`);
    console.log(`Images saved to: ${imagesDir}`);
  } catch (error) {
    throw new Error(
      `Failed to process PDF ${input}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
