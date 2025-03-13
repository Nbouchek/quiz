#!/bin/bash

# Script to rebuild and start QuizApp with Podman
# Created for migration from Docker to Podman

set -e

echo "QuizApp Rebuild and Start with Podman"
echo "====================================="
echo ""

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Working in directory: $SCRIPT_DIR"

# Check if Podman is installed
if ! command -v podman &> /dev/null; then
    echo "Error: Podman is not installed."
    echo "Please install Podman first:"
    echo "  For macOS: brew install podman"
    echo "  For Linux (Fedora/RHEL): sudo dnf install -y podman"
    echo "  For Ubuntu/Debian: sudo apt-get install -y podman"
    exit 1
fi

# Check if running on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Check if Podman machine is running
    if ! podman machine list | grep -q "Currently running"; then
        echo "Initializing and starting Podman machine..."
        podman machine init
        podman machine start
    else
        echo "Podman machine is already running."
    fi
fi

# Check if podman-compose is installed
if ! command -v podman-compose &> /dev/null; then
    echo "Installing podman-compose..."
    pip3 install podman-compose
fi

# Clean up any existing containers, pods, and volumes
echo "Cleaning up existing containers and pods..."
podman container rm -f $(podman container ls -aq) 2>/dev/null || true
podman pod rm -f $(podman pod ls -q) 2>/dev/null || true

# Create a Podman volume for persistent data
echo "Creating persistent volume for PostgreSQL data..."
podman volume rm -f postgres_data 2>/dev/null || true
podman volume create postgres_data

# Make sure the database initialization script is executable
echo "Setting permissions on database initialization script..."
chmod +x "$SCRIPT_DIR/services/study-service/create-multiple-databases.sh"

# Build all services
echo "Building all services..."
podman-compose -f docker-compose.yml build

# Start the services
echo "Starting all services..."
podman-compose -f docker-compose.yml up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "Checking if services are running..."
podman ps

echo ""
echo "QuizApp should now be running with Podman!"
echo "You can access the frontend at http://localhost:3000"
echo ""
echo "To manage the application, use the podman-maintenance.sh script:"
echo "  ./podman-maintenance.sh {start|stop|restart|logs|clean}"
echo "" 