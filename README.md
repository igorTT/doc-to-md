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

## Mistral OCR Processing

The tool uses Mistral's dedicated OCR API for processing files:

1. **File Upload Approach**:
   - Files are uploaded to Mistral's servers
   - A signed URL is generated for the uploaded file
   - The file is processed using Mistral's OCR API
   - The extracted text is returned in markdown format

This approach provides high-quality OCR results for both images and PDFs, with support for multiple languages and complex document layouts.

### OCR Response Handling

The Mistral OCR API can return responses in different formats, which our tool handles automatically:

1. **Simple Text Response**: The most common format with a `text` property containing the extracted text.

   ```json
   {
     "text": "Extracted text content from the document"
   }
   ```

2. **Content Property**: Some responses may use a `content` property instead of `text`.

   ```json
   {
     "content": "Extracted text content from the document"
   }
   ```

3. **Multi-page Documents**: For PDFs or multi-page documents, the response may include a `pages` array.
   ```json
   {
     "pages": [
       { "content": "Text from page 1" },
       { "content": "Text from page 2" }
     ]
   }
   ```

The tool intelligently extracts the text from any of these formats and combines multi-page content with appropriate spacing.

### File Management

The tool includes functionality to:

- Upload files to Mistral's servers
- Retrieve file details using the `files.retrieve` API
- Process files with OCR using the uploaded file's URL

When a file is uploaded, you can retrieve its details which include:

- File ID
- File size
- Creation timestamp
- Filename
- Purpose (e.g., 'ocr')
- Sample type
- Source
- Deletion status

## Testing OCR Functionality

To test the OCR functionality without using the CLI:

1. Place a test image in the `test-files` directory (e.g., `test-files/test-image.jpg`)
2. Run the test script:
   ```bash
   node test-ocr.js
   ```
3. The script will:
   - Demonstrate file upload and retrieval
   - Process the image with OCR
   - Save the extracted text as markdown in `test-files/test-result.md`

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

- **Overall**: ~91% statement coverage
- **index.ts**: 88% statement coverage
- **processFiles.ts**: 88% statement coverage
- **mistralService.ts**: 94% statement coverage

## License

MIT
