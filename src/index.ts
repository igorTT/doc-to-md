#!/usr/bin/env node

import { Command } from 'commander';
import { processFiles } from './processFiles';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a new command instance
const program = new Command();

// Set up CLI metadata
program
  .name('doc-to-md')
  .description('CLI to process files and send them to an API')
  .version('1.0.0');

// Add command for processing files
program
  .command('process')
  .description('Process files from input path and save results to output path')
  .requiredOption('-i, --input <path>', 'Path to input file or directory')
  .requiredOption('-o, --output <path>', 'Path to output file or directory')
  .option('-r, --recursive', 'Process directories recursively', false)
  .option(
    '-a, --api <url>',
    'API endpoint URL (not used if --mistral is specified)',
  )
  .option(
    '-m, --mistral',
    'Use Mistral AI OCR API (requires MISTRAL_API_KEY in .env file)',
    false,
  )
  .action(async (options) => {
    try {
      // Validate options
      if (!options.api && !options.mistral) {
        throw new Error('Either --api or --mistral option must be specified');
      }

      // If using Mistral, check for API key
      if (options.mistral && !process.env.MISTRAL_API_KEY) {
        throw new Error(
          'MISTRAL_API_KEY is not set in environment variables. Create a .env file with your API key.',
        );
      }

      await processFiles({
        input: options.input,
        output: options.output,
        recursive: options.recursive,
        api: options.api,
        useMistral: options.mistral,
      });
      console.log('Processing completed successfully!');
    } catch (error) {
      console.error(
        'Error processing files:',
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
