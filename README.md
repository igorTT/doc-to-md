# doc-to-md

A command-line tool to process PDF files using Mistral AI's OCR capabilities. This tool extracts text and images from PDF documents and converts them to markdown format.

## Installation

```bash
# Clone the repository
git clone https://github.com/igorTT/doc-to-md.git
cd doc-to-md

# Install dependencies
yarn install

# Build the project
yarn build

# Link the CLI globally (optional)
yarn link
```

## Configuration

You need to set up your Mistral API key:

1. Create a `.env` file in the project root (copy from `.env.example`)
2. Add your Mistral API key:
   ```
   MISTRAL_API_KEY=your_api_key_here
   ```

## Usage

### Process a PDF file with Mistral OCR

```bash
doc-to-md process --input path/to/input/file.pdf --output path/to/output/file.md
```

The tool will automatically count tokens in the OCR result and provide an estimated cost based on Mistral's pricing.

When processing a PDF file, the tool will:

1. Extract text and images from the PDF using Mistral's OCR capabilities
2. Create a folder named `{input-filename}-images` in the same directory as the output file
3. Save all extracted images to this folder as PNG files
4. Generate a markdown file with links to the saved images instead of embedding them as base64

### Translate a markdown file to another language

```bash
doc-to-md translate --input path/to/input/file.md --output path/to/output/translated.md --language french
```

When translating a markdown file, the tool will:

1. Translate the markdown content to the specified language
2. Copy the associated images folder to the output location if it exists
3. Update image links in the translated content if the output filename is different from the input filename

Supported languages:

- french
- german
- spanish
- russian

When translating, the tool provides token counts for both the input and translated content, along with cost estimates.

### Token Counting

The tool now includes token counting functionality that:

- Counts tokens in files being processed or translated
- Provides an estimated cost based on current Mistral pricing
- Gives visibility into the token usage of your operations

This helps you understand and manage costs when using Mistral's API for OCR and translation.

### Logger Service

The tool includes a flexible logging system that:

- Provides consistent log formatting across the application
- Supports different log levels (DEBUG, INFO, WARN, ERROR, NONE)
- Allows filtering logs based on minimum log level
- Implemented as a singleton to ensure a single logging instance

Log levels in ascending order of severity:

- DEBUG: Detailed information, typically for debugging purposes
- INFO: General information about application progress (default)
- WARN: Potential issues that don't prevent normal operation
- ERROR: Errors that prevent normal operation
- NONE: Disables all logging

You can customize the log level in your code by accessing the logger:

```typescript
import { logger, LoggerService } from './services/loggerService';

// Set to DEBUG level for more verbose output
logger.setLogLevel(LoggerService.LogLevel.DEBUG);

// Set to ERROR level to show only errors
logger.setLogLevel(LoggerService.LogLevel.ERROR);
```

### Test Data

The project includes a `test-data` folder for storing PDF files used for testing. This folder is excluded from version control via `.gitignore`. You can place your test PDF files in this folder and use them for testing the application.

```bash
# Example using a test PDF file
doc-to-md process --input test-data/sample.pdf --output test-data/sample.md
```

## Mistral OCR Processing

The tool uses Mistral's dedicated OCR API for processing PDF files:

1. **PDF Processing Workflow**:
   - PDF files are uploaded to Mistral's servers
   - A signed URL is generated for the uploaded file
   - The file is processed using Mistral's OCR API
   - The extracted text and images are returned in markdown format

This approach provides high-quality OCR results for PDF documents, with support for multiple languages, complex document layouts, and embedded images.

### OCR Response Handling

The Mistral OCR API returns responses with the following structure for PDF documents:

```json
{
  "pages": [
    {
      "markdown": "# Page 1 Content\n\nText content with ![image-1](image-1) references",
      "images": [
        {
          "id": "image-1",
          "imageBase64": "base64-encoded-image-data"
        }
      ]
    },
    {
      "markdown": "# Page 2 Content\n\nMore text content with ![image-2](image-2) references",
      "images": [
        {
          "id": "image-2",
          "imageBase64": "base64-encoded-image-data"
        }
      ]
    }
  ]
}
```

The tool processes this response by:

1. Extracting the markdown content from each page
2. Replacing image references with embedded base64 images
3. Combining all pages into a single markdown document

### File Management

The tool includes functionality to:

- Upload PDF files to Mistral's servers
- Retrieve file details using the `files.retrieve` API
- Process files with OCR using the uploaded file's URL

## Mistral Translation

The tool uses Mistral's AI capabilities for translating markdown content:

1. **Translation Workflow**:
   - Markdown files are read from the specified input path
   - The content is sent to Mistral's AI for translation
   - The translated content is saved to the specified output path

This approach provides high-quality translations while preserving markdown formatting, including headers, lists, code blocks, and image references.

### Translation Options

The translation command supports the following options:

- `-i, --input <path>`: Path to input markdown file (required)
- `-o, --output <path>`: Path to output translated markdown file (required)
- `-l, --language <language>`: Target language for translation (required)
  - Supported languages: french, german, spanish

## Options

- `-i, --input <path>`: Path to input PDF file (required)
- `-o, --output <path>`: Path to output markdown file (required)
- `-h, --help`: Display help information
- `-V, --version`: Display version information

## Supported File Types

The tool only supports PDF files (`.pdf`). Other file types will result in an error.

## Development

```bash
# Run in development mode
yarn dev -- process --input path/to/input.pdf --output path/to/output.md

# Build the project
yarn build

# Run the built version
yarn start -- process --input path/to/input.pdf --output path/to/output.md
```

## Testing

The project includes both unit and integration tests using Jest.

```bash
# Run all tests
yarn test

# Run tests in watch mode during development
yarn test:watch

# Generate test coverage report
yarn test:coverage
```

### Test Structure

- **Unit Tests**: Test individual functions and modules in isolation

  - Located in `__tests__/unit/`
  - Mock external dependencies like file system and API calls
  - Test coverage for core functionality:
    - Processing PDF files
    - Error handling
    - CLI command setup

- **Integration Tests**: Test the CLI as a whole
  - Located in `__tests__/integration/`
  - Test command-line interface and argument parsing
  - Some tests may be skipped if they require external services

### Continuous Integration

The project uses GitHub Actions for continuous integration:

- Runs tests automatically on push to main branch and pull requests
- Tests run on Node.js 20.x
- Generates and uploads test coverage reports

You can view the test workflow in `.github/workflows/tests.yml`.

### Current Test Coverage

The project maintains high test coverage:

- **Overall**: ~95% statement coverage
- **index.ts**: 100% statement coverage
- **processFiles.ts**: 100% statement coverage
- **mistralService.ts**: 93% statement coverage
- **loggerService.ts**: 100% statement coverage

## License

MIT
