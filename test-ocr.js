const { MistralService } = require('./dist/services/mistralService');
const path = require('path');
const fs = require('fs-extra');

/**
 * Test the Mistral OCR functionality with a local image
 */
async function testOcr() {
  try {
    // Create a test directory if it doesn't exist
    const testDir = path.join(__dirname, 'test-files');
    await fs.ensureDir(testDir);

    // Check for a test image
    const testImagePath = path.join(testDir, 'test-image.jpg');
    if (!(await fs.pathExists(testImagePath))) {
      console.log('Please place a test image at:', testImagePath);
      console.log('Then run this script again.');
      return;
    }

    console.log('Testing OCR with image:', testImagePath);

    // Initialize the Mistral service
    const mistralService = new MistralService();

    // Check if the file is supported
    const isSupported = mistralService.isFileSupported(testImagePath);
    console.log('Is file supported:', isSupported);

    if (isSupported) {
      // For demonstration purposes, we'll upload the file first and retrieve its details
      // This is normally handled internally by the processFile method
      try {
        console.log('\n--- File Upload and Retrieve Demo ---');
        console.log('Uploading file...');

        // Upload the file using our new method
        const uploadedFile = await mistralService.uploadFile(testImagePath);
        console.log('File uploaded successfully with ID:', uploadedFile.id);

        // Retrieve file details
        console.log('\nRetrieving file details...');
        const fileDetails = await mistralService.retrieveFileDetails(
          uploadedFile.id,
        );
        console.log('\nFile details:');
        console.log(fileDetails);

        console.log('\n--- End of Demo ---\n');
      } catch (error) {
        console.error(
          '\nError during file upload/retrieve demo:',
          error.message,
        );
      }

      // Process the file using the standard method
      console.log('\nProcessing file using Mistral OCR API...');
      console.log('This may take a moment depending on the file size...');

      try {
        const result = await mistralService.processFile(testImagePath);

        // Log the raw result for debugging
        console.log('\n--- OCR Response Debug Info ---');
        console.log('Result type:', typeof result);
        console.log('Result length:', result ? result.length : 0);
        console.log(
          'First 100 characters:',
          result ? result.substring(0, 100) : 'No result',
        );

        if (!result || result.length === 0) {
          console.error('\nWARNING: Empty result received from OCR API');
        }

        // Save the result to a markdown file
        const outputPath = path.join(testDir, 'test-result.md');
        await fs.writeFile(outputPath, result || 'No text extracted', 'utf-8');

        // Verify the file was written correctly
        const fileExists = await fs.pathExists(outputPath);
        const fileSize = fileExists ? (await fs.stat(outputPath)).size : 0;

        console.log('\nOutput file details:');
        console.log('- Path:', outputPath);
        console.log('- File exists:', fileExists);
        console.log('- File size:', fileSize, 'bytes');

        if (fileExists && fileSize > 0) {
          console.log('\nOCR result saved successfully to:', outputPath);
          console.log('\nFirst 200 characters of result:');
          console.log(result.substring(0, 200) + '...');
        } else {
          console.error(
            '\nWARNING: Output file is empty or was not created properly',
          );
        }
      } catch (error) {
        console.error('\nError during OCR processing:', error);
        console.error('Error message:', error.message);
        if (error.stack) {
          console.error('Stack trace:', error.stack);
        }
      }
    }
  } catch (error) {
    console.error('\nError testing OCR:', error.message);

    // Check for common issues
    if (error.message.includes('MISTRAL_API_KEY')) {
      console.error(
        '\nMake sure you have set up your .env file with your Mistral API key:',
      );
      console.error('MISTRAL_API_KEY=your_api_key_here');
    }
  }
}

// Run the test
testOcr();
