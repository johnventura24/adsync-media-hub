#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting deployment build...');

try {
  // Install backend dependencies
  console.log('📦 Installing backend dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // Install frontend dependencies
  console.log('📦 Installing frontend dependencies...');
  execSync('cd client && npm install --legacy-peer-deps', { stdio: 'inherit' });

  // Build frontend
  console.log('🏗️ Building React frontend...');
  execSync('cd client && npm run build', { stdio: 'inherit' });

  // Verify build
  const buildPath = path.join(__dirname, 'client', 'build');
  if (fs.existsSync(buildPath)) {
    console.log('✅ Build successful!');
    console.log('📁 Build directory contents:');
    const files = fs.readdirSync(buildPath);
    files.forEach(file => console.log(`   - ${file}`));
  } else {
    throw new Error('Build directory not found');
  }

  console.log('🎉 Deployment build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
