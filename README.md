# doc-to-md

A command-line tool to process files and send them to an API. This tool can process individual files or entire directories, and save the API responses to specified output locations. It now supports the Mistral AI OCR API for extracting text from images and PDFs.

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

When using the Mistral AI OCR API, you need to set up your API key:

1. Create a `.env` file in the project root (copy from `.env.example`)
2. Add your Mistral API key:
   ```
   MISTRAL_API_KEY=your_api_key_here
   ```

## Usage

### Process a single file with a custom API

```bash
doc-to-md process --input path/to/input/file.docx --output path/to/output/file.md --api https://your-api-endpoint.com/convert
```

### Process a file with Mistral OCR API

```bash
doc-to-md process --input path/to/input/image.jpg --output path/to/output/file.md --mistral
```

### Process a directory with Mistral OCR API

```bash
doc-to-md process --input path/to/input/directory --output path/to/output/directory --mistral
```

### Process a directory recursively

```bash
doc-to-md process --input path/to/input/directory --output path/to/output/directory --recursive --mistral
```

## Testing OCR Functionality

To test the OCR functionality without using the CLI:

1. Place a test image in the `test-files` directory (e.g., `test-files/test-image.jpg`)
2. Run the test script:
   ```bash
   node test-ocr.js
   ```
3. The extracted text will be saved as markdown in `test-files/test-result.md`

## Options

- `-i, --input <path>`: Path to input file or directory (required)
- `-o, --output <path>`: Path to output file or directory (required)
- `-r, --recursive`: Process directories recursively (default: false)
- `-a, --api <url>`: API endpoint URL for custom API (not used if --mistral is specified)
- `-m, --mistral`: Use Mistral AI OCR API for processing images and PDFs (requires API key)
- `-h, --help`: Display help information
- `-V, --version`: Display version information

## Supported File Types for Mistral OCR

When using the Mistral OCR API option, the following file types are supported:

- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`
- Documents: `.pdf`

Other file types will be skipped when processing directories.

## Development

```bash
# Run in development mode
yarn dev -- process --input path/to/input --output path/to/output --mistral

# Build the project
yarn build

# Run the built version
yarn start -- process --input path/to/input --output path/to/output --mistral
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
    - Processing individual files
    - Processing directories
    - Error handling
    - CLI command setup

- **Integration Tests**: Test the CLI as a whole
  - Located in `__tests__/integration/`
  - Test command-line interface and argument parsing
  - Some tests may be skipped if they require external services

### Current Test Coverage

The project maintains high test coverage:

- **Overall**: ~90% statement coverage
- **index.ts**: 100% statement coverage
- **processFiles.ts**: ~87% statement coverage

## License

MIT
