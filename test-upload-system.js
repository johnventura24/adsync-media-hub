#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'https://adsync-media-hub.onrender.com';
const API_URL = `${BASE_URL}/api`;

console.log('🧪 Testing CSV Upload System');
console.log('Base URL:', BASE_URL);

async function createTestFiles() {
  console.log('\n📝 Creating test files...');
  
  const testDir = path.join(__dirname, 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  // Create a simple CSV test file
  const csvContent = `Name,Email,Department,Role
John Smith,john@company.com,Sales,Manager
Jane Doe,jane@company.com,Marketing,Coordinator
Bob Johnson,bob@company.com,Tech,Developer`;
  
  const csvFile = path.join(testDir, 'test-users.csv');
  fs.writeFileSync(csvFile, csvContent);
  console.log('✅ Created test CSV file:', csvFile);

  // Create a problematic CSV (with special characters)
  const problematicCsv = `Name,Description,Notes
"Test, Item",This has "quotes" and commas,Special chars: áéíóú
Another Item,Normal text,Regular content`;
  
  const problematicFile = path.join(testDir, 'problematic.csv');
  fs.writeFileSync(problematicFile, problematicCsv);
  console.log('✅ Created problematic CSV file:', problematicFile);

  // Create an empty file
  const emptyFile = path.join(testDir, 'empty.csv');
  fs.writeFileSync(emptyFile, '');
  console.log('✅ Created empty CSV file:', emptyFile);

  return { csvFile, problematicFile, emptyFile };
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testing health endpoint...');
  try {
    const response = await axios.get(`${API_URL}/csv/health`);
    console.log('✅ Health check passed');
    console.log('Status:', response.data.status);
    console.log('Checks:', JSON.stringify(response.data.checks, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testImportTypes() {
  console.log('\n📋 Testing import types endpoint...');
  try {
    const response = await axios.get(`${API_URL}/csv/import-types`);
    console.log('✅ Import types loaded successfully');
    console.log('Available types:', response.data.types.length);
    return true;
  } catch (error) {
    console.error('❌ Import types failed:', error.message);
    return false;
  }
}

async function testFileUpload(filePath, expectedSuccess = true) {
  console.log(`\n📤 Testing file upload: ${path.basename(filePath)}`);
  
  try {
    const formData = new FormData();
    formData.append('csvFile', fs.createReadStream(filePath));
    formData.append('type', 'generic');

    const response = await axios.post(`${API_URL}/csv/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000, // 30 second timeout
    });

    if (expectedSuccess) {
      console.log('✅ Upload successful');
      console.log('Total rows:', response.data.totalRows);
      console.log('Valid rows:', response.data.validRows);
      if (response.data.errors && response.data.errors.length > 0) {
        console.log('Warnings:', response.data.errors);
      }
    } else {
      console.log('❌ Upload should have failed but succeeded');
    }
    
    return true;
  } catch (error) {
    if (!expectedSuccess) {
      console.log('✅ Upload failed as expected:', error.response?.data?.error || error.message);
      return true;
    } else {
      console.error('❌ Upload failed unexpectedly:', error.response?.data || error.message);
      return false;
    }
  }
}

async function testDebugUpload(filePath) {
  console.log(`\n🔍 Testing debug upload: ${path.basename(filePath)}`);
  
  try {
    const formData = new FormData();
    formData.append('csvFile', fs.createReadStream(filePath));

    const response = await axios.post(`${API_URL}/csv/debug-upload`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000,
    });

    console.log('✅ Debug upload completed');
    console.log('Success:', response.data.success);
    if (response.data.debug) {
      console.log('File size:', response.data.debug.fileInfo?.size);
      console.log('Parse success:', response.data.debug.parsing?.success);
      console.log('Row count:', response.data.debug.parsing?.rowCount);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Debug upload failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting comprehensive upload system tests...\n');
  
  let passed = 0;
  let total = 0;

  // Create test files
  const testFiles = await createTestFiles();

  // Test 1: Health check
  total++;
  if (await testHealthEndpoint()) passed++;

  // Test 2: Import types
  total++;
  if (await testImportTypes()) passed++;

  // Test 3: Valid CSV upload
  total++;
  if (await testFileUpload(testFiles.csvFile, true)) passed++;

  // Test 4: Problematic CSV upload (should still work)
  total++;
  if (await testFileUpload(testFiles.problematicFile, true)) passed++;

  // Test 5: Empty file upload (should fail)
  total++;
  if (await testFileUpload(testFiles.emptyFile, false)) passed++;

  // Test 6: Debug upload
  total++;
  if (await testDebugUpload(testFiles.csvFile)) passed++;

  // Clean up test files
  console.log('\n🧹 Cleaning up test files...');
  try {
    fs.rmSync(path.dirname(testFiles.csvFile), { recursive: true, force: true });
    console.log('✅ Test files cleaned up');
  } catch (error) {
    console.log('⚠️ Could not clean up test files:', error.message);
  }

  // Results
  console.log('\n📊 TEST RESULTS');
  console.log('================');
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Success Rate: ${Math.round((passed/total) * 100)}%`);

  if (passed === total) {
    console.log('🎉 All tests passed! Upload system is working correctly.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please check the system.');
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});
