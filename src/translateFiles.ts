import fs from 'fs-extra';
import path from 'path';
import { MistralService } from './services/mistralService';
import { TokenCountService } from './services/tokenCountService';
import { logger } from './services/loggerService';
import readline from 'readline';

// Define the options interface for translation
export interface TranslateOptions {
  input: string;
  output: string;
  language: string;
}

// Supported languages
export const SUPPORTED_LANGUAGES = ['french', 'german', 'spanish', 'russian'];

/**
 * Create a readline interface to prompt the user for confirmation
 *
 * @param question The question to ask the user
 * @returns Promise resolving to true if user confirms, false otherwise
 */
async function askForConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<boolean>((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

/**
 * Translate a markdown file to the specified language using Mistral AI
 *
 * @param options Translation options
 * @throws Error if input file doesn't exist, is not a file, or translation fails
 */
export async function translateFiles(options: TranslateOptions): Promise<void> {
  const { input, output, language } = options;

  // Check if input file exists
  if (!(await fs.pathExists(input))) {
    throw new Error(`Input file does not exist: ${input}`);
  }

  // Verify input is a file, not a directory
  const inputStat = await fs.stat(input);
  if (!inputStat.isFile()) {
    throw new Error(`Input must be a file, not a directory: ${input}`);
  }

  // Verify language is supported
  if (!SUPPORTED_LANGUAGES.includes(language.toLowerCase())) {
    throw new Error(
      `Unsupported language: ${language}. Supported languages are: ${SUPPORTED_LANGUAGES.join(
        ', '
      )}`
    );
  }

  try {
    logger.info(`Translating markdown file to ${language}: ${input}`);

    // Read the markdown file
    const markdownContent = await fs.readFile(input, 'utf-8');

    // Count tokens in the file
    const tokenCountService = new TokenCountService();
    const tokenCount = tokenCountService.countTokens(markdownContent);

    // Calculate estimated cost (using Mistral Large rate as an example)
    // Mistral Large rate is approximately $8 per million tokens (or $0.008 per 1000 tokens)
    const estimatedCost = tokenCountService.estimateCost(tokenCount, 0.008);

    logger.info(`File token count: ${tokenCount}`);
    logger.info(`Estimated cost: $${estimatedCost.toFixed(4)}`);

    // Always ask for user confirmation before proceeding with translation
    const userConfirmed = await askForConfirmation(
      `⚠️ WARNING: This translation may cost approximately $${estimatedCost.toFixed(
        4
      )}. Do you want to proceed? (y/n): `
    );

    if (!userConfirmed) {
      logger.info('Translation canceled by user.');
      return;
    }

    // Use Mistral API to translate the content
    const mistralService = new MistralService();
    const translatedContent = await mistralService.translateContent(
      markdownContent,
      language
    );

    // Count tokens in the translated content
    const translatedTokenCount =
      tokenCountService.countTokens(translatedContent);
    logger.info(`Translated file token count: ${translatedTokenCount}`);

    // Ensure output directory exists

    const outputDir = path.dirname(output);
    const result = await fs.ensureDir(outputDir);

    // Write translated content to output file
    await fs.writeFile(output, translatedContent, 'utf-8');

    // Copy associated images folder if it exists
    const inputFileName = path.basename(input, path.extname(input));
    const inputDir = path.dirname(input);
    const imagesDir = path.join(inputDir, `${inputFileName}-images`);

    if (await fs.pathExists(imagesDir)) {
      const outputFileName = path.basename(output, path.extname(output));
      const outputDir = path.dirname(output);
      const outputImagesDir = path.join(outputDir, `${outputFileName}-images`);

      // Copy the images directory to the output location
      await fs.copy(imagesDir, outputImagesDir);
      logger.info(`Copied images to: ${outputImagesDir}`);

      // Update image paths in the translated content if needed
      // This is only necessary if the output filename is different from the input filename
      if (inputFileName !== outputFileName) {
        const updatedContent = translatedContent.replace(
          new RegExp(`${inputFileName}-images/`, 'g'),
          `${outputFileName}-images/`
        );
        await fs.writeFile(output, updatedContent, 'utf-8');
      }
    }

    logger.info(`Translation completed successfully: ${output}`);
  } catch (error) {
    throw new Error(
      `Failed to translate file ${input}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
