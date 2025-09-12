#!/bin/bash
set -e

echo "🔧 Starting build process..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd client
npm install --legacy-peer-deps

# Build frontend
echo "🏗️ Building frontend..."
npm run build

# Go back to root
cd ..

echo "✅ Build complete!"
