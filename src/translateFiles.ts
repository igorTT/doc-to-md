import fs from 'fs-extra';
import path from 'path';
import { MistralService } from './services/mistralService';

// Define the options interface for translation
export interface TranslateOptions {
  input: string;
  output: string;
  language: string;
}

// Supported languages
export const SUPPORTED_LANGUAGES = ['french', 'german', 'spanish', 'russian'];

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
        ', ',
      )}`,
    );
  }

  try {
    console.log(`Translating markdown file to ${language}: ${input}`);

    // Read the markdown file
    const markdownContent = await fs.readFile(input, 'utf-8');

    // Use Mistral API to translate the content
    const mistralService = new MistralService();
    const translatedContent = await mistralService.translateContent(
      markdownContent,
      language,
    );

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(output));

    // Write translated content to output file
    await fs.writeFile(output, translatedContent, 'utf-8');

    console.log(`Translation completed successfully: ${output}`);
  } catch (error) {
    throw new Error(
      `Failed to translate file ${input}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
