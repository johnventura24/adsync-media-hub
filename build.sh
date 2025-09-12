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

# Verify build directory exists
echo "🔍 Verifying build directory..."
if [ -d "build" ]; then
    echo "✅ Build directory exists"
    ls -la build/
else
    echo "❌ Build directory not found!"
    exit 1
fi

# Go back to root
cd ..

# Verify build from root
echo "🔍 Verifying build from root directory..."
if [ -d "client/build" ]; then
    echo "✅ client/build directory exists"
    ls -la client/build/
else
    echo "❌ client/build directory not found!"
    exit 1
fi

echo "✅ Build complete!"
