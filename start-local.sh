#!/bin/bash

# Icomly Local Development Startup Script
# Usage: ./start-local.sh

set -e

echo "🚀 Starting Icomly Local Development Environment..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file. Please edit it and add your GEMINI_API_KEY."
        echo ""
        read -p "Press Enter to continue after adding your API key..."
    else
        echo "❌ Error: .env.example not found. Please create .env manually."
        exit 1
    fi
fi

# Check if GEMINI_API_KEY is set
if ! grep -q "GEMINI_API_KEY=AIza" .env; then
    echo "⚠️  Warning: GEMINI_API_KEY not set in .env file."
    echo "Please add your Gemini API key to .env file:"
    echo "GEMINI_API_KEY=your_actual_api_key_here"
    echo ""
    read -p "Press Enter to continue anyway (services may fail)..."
fi

echo "📦 Building and starting services..."
echo ""

# Stop any existing containers
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true

# Build and start services
docker-compose -f docker-compose.dev.yml up --build -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo ""
echo "🔍 Checking service status..."
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "✅ Services started successfully!"
echo ""
echo "📍 Access your application:"
echo "   Web App:   http://localhost:3000"
echo "   Mail Dev:  http://localhost:3025"
echo "   Database:  localhost:5432"
echo "   Redis:     localhost:6379"
echo ""
echo "📊 View logs:"
echo "   All:       docker-compose -f docker-compose.dev.yml logs -f"
echo "   Web App:   docker-compose -f docker-compose.dev.yml logs -f webapp"
echo "   Worker:    docker-compose -f docker-compose.dev.yml logs -f worker"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose -f docker-compose.dev.yml down"
echo ""
echo "📖 For more commands, see LOCAL_SETUP_GUIDE.md"
echo ""

# Ask if user wants to view logs
read -p "Would you like to view logs now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f docker-compose.dev.yml logs -f
fi
