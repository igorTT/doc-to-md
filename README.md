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

### Translate a markdown file to another language

```bash
doc-to-md translate --input path/to/input/file.md --output path/to/output/translated.md --language french
```

Supported languages:
- french
- german
- spanish
- russian

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

### Current Test Coverage

The project maintains high test coverage:

- **Overall**: ~95% statement coverage
- **index.ts**: 100% statement coverage
- **processFiles.ts**: 100% statement coverage
- **mistralService.ts**: 93% statement coverage

## License

MIT
