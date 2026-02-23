@echo off
REM Icomly Local Development Startup Script for Windows
REM Usage: start-local.bat

echo.
echo Starting Icomly Local Development Environment...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo Warning: .env file not found. Creating from .env.example...
    if exist .env.example (
        copy .env.example .env
        echo Created .env file. Please edit it and add your GEMINI_API_KEY.
        echo.
        pause
    ) else (
        echo Error: .env.example not found. Please create .env manually.
        pause
        exit /b 1
    )
)

echo Building and starting services...
echo.

REM Stop any existing containers
docker-compose -f docker-compose.dev.yml down 2>nul

REM Build and start services
docker-compose -f docker-compose.dev.yml up --build -d

echo.
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check service health
echo.
echo Checking service status...
docker-compose -f docker-compose.dev.yml ps

echo.
echo Services started successfully!
echo.
echo Access your application:
echo    Frontend:  http://localhost:3000
echo    Backend:   http://localhost:3001
echo    Database:  localhost:5432
echo    Redis:     localhost:6379
echo.
echo View logs:
echo    All:       docker-compose -f docker-compose.dev.yml logs -f
echo    Backend:   docker-compose -f docker-compose.dev.yml logs -f backend
echo    Frontend:  docker-compose -f docker-compose.dev.yml logs -f frontend
echo.
echo Stop services:
echo    docker-compose -f docker-compose.dev.yml down
echo.
echo For more commands, see LOCAL_SETUP_GUIDE.md
echo.

set /p REPLY="Would you like to view logs now? (y/n) "
if /i "%REPLY%"=="y" (
    docker-compose -f docker-compose.dev.yml logs -f
)
