#!/usr/bin/env node

import { Command } from 'commander';
import { processFiles } from './processFiles';
import { translateFiles, SUPPORTED_LANGUAGES } from './translateFiles';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Create a new command instance
const program = new Command();

// Set up CLI metadata
program
  .name('doc-to-md')
  .description('CLI to process PDF files using Mistral OCR')
  .version('1.0.0');

// Add command for processing PDF files
program
  .command('process')
  .description(
    'Process a PDF file and convert it to markdown using Mistral OCR',
  )
  .requiredOption('-i, --input <path>', 'Path to input PDF file')
  .requiredOption('-o, --output <path>', 'Path to output markdown file')
  .action(async (options) => {
    try {
      // Check for Mistral API key
      if (!process.env.MISTRAL_API_KEY) {
        throw new Error(
          'MISTRAL_API_KEY is not set in environment variables. Create a .env file with your API key.',
        );
      }

      await processFiles({
        input: options.input,
        output: options.output,
      });

      console.log('PDF processing with Mistral OCR completed successfully!');
    } catch (error) {
      console.error(
        'Error processing PDF:',
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

// Add command for translating markdown files
program
  .command('translate')
  .description(
    'Translate a markdown file to a different language using Mistral AI',
  )
  .requiredOption('-i, --input <path>', 'Path to input markdown file')
  .requiredOption(
    '-o, --output <path>',
    'Path to output translated markdown file',
  )
  .requiredOption(
    '-l, --language <language>',
    `Target language for translation. Supported languages: ${SUPPORTED_LANGUAGES.join(
      ', ',
    )}`,
  )
  .action(async (options) => {
    try {
      // Check for Mistral API key
      if (!process.env.MISTRAL_API_KEY) {
        throw new Error(
          'MISTRAL_API_KEY is not set in environment variables. Create a .env file with your API key.',
        );
      }

      await translateFiles({
        input: options.input,
        output: options.output,
        language: options.language,
      });

      console.log(`Translation to ${options.language} completed successfully!`);
    } catch (error) {
      console.error(
        'Error translating file:',
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
