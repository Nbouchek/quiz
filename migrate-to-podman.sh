#!/bin/bash

# Script to automate migration from Docker to Podman for QuizApp
# Created by Claude (Anthropic)

echo "QuizApp Migration to Podman"
echo "==========================="
echo ""

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Working in directory: $SCRIPT_DIR"

# Check if docker-compose.yml exists
if [ ! -f "$SCRIPT_DIR/docker-compose.yml" ]; then
    echo "Error: docker-compose.yml not found in $SCRIPT_DIR"
    echo "Please run this script from the project root directory where docker-compose.yml is located."
    exit 1
fi

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

# Create a Podman volume for persistent data
echo "Creating persistent volume for PostgreSQL data..."
podman volume create postgres_data 2>/dev/null || echo "Volume postgres_data already exists"

# Generate Kubernetes YAML from docker-compose
echo "Generating Kubernetes configuration from docker-compose.yml..."
echo "Using docker-compose file: $SCRIPT_DIR/docker-compose.yml"
ls -la "$SCRIPT_DIR/docker-compose.yml" 2>/dev/null || echo "File not found!"
podman generate kube "$SCRIPT_DIR/docker-compose.yml" > "$SCRIPT_DIR/podman-compose.yaml" || echo "Failed to generate Kubernetes YAML. Make sure docker-compose.yml exists and is valid."

# Stop any running Docker containers for this project
echo "Would you like to stop any running Docker containers for this project? (y/n)"
read -r stop_docker
if [[ "$stop_docker" == "y" ]]; then
    echo "Stopping Docker containers..."
    docker-compose down || echo "Docker-compose not found or no containers to stop."
fi

# Offer to start with podman-compose
echo "Do you want to start the application with podman-compose? (y/n)"
read -r start_compose
if [[ "$start_compose" == "y" ]]; then
    echo "Starting QuizApp with podman-compose..."
    podman-compose up -d
    echo "QuizApp is now running with Podman!"
    echo "You can access the frontend at http://localhost:3000"
else
    echo "To start the application later, run: podman-compose up -d"
    echo "Or using Kubernetes format: podman play kube podman-compose.yaml"
fi

# Create maintenance script
echo "Creating maintenance script..."
cat > "$SCRIPT_DIR/podman-maintenance.sh" << EOF
#!/bin/bash
# podman-maintenance.sh

case "\$1" in
    start)
        podman-compose up -d
        ;;
    stop)
        podman-compose down
        ;;
    restart)
        podman-compose down
        podman-compose up -d
        ;;
    logs)
        podman-compose logs -f
        ;;
    *)
        echo "Usage: \$0 {start|stop|restart|logs}"
        exit 1
esac
EOF

chmod +x "$SCRIPT_DIR/podman-maintenance.sh"

echo ""
echo "Migration completed!"
echo "===================="
echo "For more details, see the PODMAN_MIGRATION.md file."
echo "A maintenance script has been created: ./podman-maintenance.sh"
echo "Run it with: ./podman-maintenance.sh {start|stop|restart|logs}"
echo ""
echo "Happy containerizing with Podman!" 