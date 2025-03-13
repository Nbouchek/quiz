# Migrating QuizApp from Docker to Podman

This guide provides step-by-step instructions for migrating the QuizApp application from Docker to Podman.

## Prerequisites

1. Ensure Podman is installed on your system. If not, install it:

   For macOS:

   ```bash
   brew install podman
   ```

   For Linux (Fedora/RHEL):

   ```bash
   sudo dnf install -y podman
   ```

   For Ubuntu/Debian:

   ```bash
   sudo apt-get install -y podman
   ```

2. Initialize the Podman machine (for macOS):
   ```bash
   podman machine init
   podman machine start
   ```

## Migration Steps

### 1. Install Podman-Compose (Optional but Recommended)

Podman-compose is a script to run docker-compose.yml files with Podman:

```bash
pip3 install podman-compose
```

Alternatively, you can use Podman directly without podman-compose.

### 2. Migrating docker-compose.yml

No changes are needed to the docker-compose.yml file itself. Podman is compatible with Docker Compose files.

### 3. Running the Application with Podman

#### Option 1: Using podman-compose (Recommended for Development)

Navigate to the project directory and run:

```bash
cd /Users/nacer/dev/QuizApp/QuizApp
podman-compose up -d
```

To stop the application:

```bash
podman-compose down
```

#### Option 2: Using Podman Play Kube (Production Ready)

Convert the docker-compose.yml to Kubernetes YAML:

```bash
cd /Users/nacer/dev/QuizApp/QuizApp
podman generate kube docker-compose.yml > podman-compose.yaml
```

Start all services using podman play:

```bash
podman play kube podman-compose.yaml
```

Stop all services:

```bash
podman pod stop --all
podman pod rm --all
```

#### Option 3: Manual Management with Podman (Advanced)

For more control, you can use Podman commands directly to manage containers.

Example for creating a network and running the postgres service:

```bash
podman network create quizapp_network
podman run -d --name postgres --network quizapp_network \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=quizapp \
  -e POSTGRES_MULTIPLE_DATABASES=quizapp_users,quizapp_ai,quizapp_study,quizapp_content \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -v ./services/study-service/create-multiple-databases.sh:/docker-entrypoint-initdb.d/10-create-multiple-databases.sh \
  -v ./services/study-service/init.sql:/docker-entrypoint-initdb.d/20-study-init.sql \
  postgres:15-alpine
```

Repeat similar commands for each service.

### 4. Building Images with Podman

Build individual images:

```bash
cd /Users/nacer/dev/QuizApp/QuizApp/services/study-service
podman build -t study-service .
```

### 5. Podman Volumes

Podman handles volumes differently from Docker. For persistent data:

```bash
podman volume create postgres_data
```

### 6. Common Issues and Troubleshooting

1. **Permission Issues**: Podman runs containers with different user modes. If you encounter permission issues, add the `:Z` or `:z` suffix to volume mounts.

2. **Networking**: If services can't communicate, verify the podman network:

   ```bash
   podman network ls
   ```

3. **Resource Limitations**: Adjust resource limits if needed:
   ```bash
   podman machine set --cpus 4 --memory 8192
   ```

## Additional Tips

1. **Maintenance Script**: Create a maintenance script for commonly used commands:

```bash
#!/bin/bash
# podman-maintenance.sh

case "$1" in
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
        echo "Usage: $0 {start|stop|restart|logs}"
        exit 1
esac
```

2. **Environment Configuration**: Ensure environment variables are correctly set in both development and production environments.

## Conclusion

Your QuizApp should now be successfully migrated to Podman. The application architecture remains the same, but the container runtime is now Podman instead of Docker.
