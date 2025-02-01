#!/bin/bash

set -e  # Exit on error

# Common function to initialize a Go service
init_go_service() {
    local service_name=$1
    local service_path="services/$service_name"
    
    echo "Initializing $service_name..."
    cd $service_path
    
    # Create main.go with package declaration
    cat > src/main.go << EOL
package main

import (
    "log"
    "github.com/gin-gonic/gin"
)

func main() {
    log.Printf("Starting $service_name...")
    r := gin.Default()
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "status": "healthy",
            "service": "$service_name",
        })
    })
    r.Run(":8080")
}
EOL
    
    # Initialize Go module
    go mod init github.com/QuizApp/$service_name
    
    # Add common dependencies
    go get github.com/gin-gonic/gin
    go get github.com/lib/pq
    go get github.com/golang-jwt/jwt/v5
    go get github.com/joho/godotenv
    go get go.uber.org/zap
    go get github.com/prometheus/client_golang/prometheus
    go get github.com/stretchr/testify
    
    # Service-specific dependencies
    case $service_name in
        "user-service")
            go get golang.org/x/crypto/bcrypt
            ;;
        "content-service")
            go get github.com/google/uuid
            ;;
        "ai-service")
            go get github.com/sashabaranov/go-openai
            ;;
        "study-service")
            go get github.com/google/uuid
            go get github.com/robfig/cron/v3
            ;;
    esac
    
    go mod tidy
    
    # Create a basic README for the service
    cat > README.md << EOL
# $service_name

## Description
This service is part of the QuizApp platform.

## Setup
1. Install dependencies: \`go mod download\`
2. Run the service: \`go run src/main.go\`

## API Endpoints
- \`GET /health\`: Health check endpoint

## Environment Variables
Create a \`.env\` file with:
\`\`\`
PORT=8080
DB_CONNECTION_STRING=postgresql://localhost:5432/quizapp
\`\`\`
EOL

    # Create .env.example
    cat > .env.example << EOL
PORT=8080
DB_CONNECTION_STRING=postgresql://localhost:5432/quizapp
EOL

    cd ../../
    echo "$service_name initialized successfully!"
}

# Initialize each service
init_go_service "user-service"
init_go_service "content-service"
init_go_service "ai-service"
init_go_service "study-service"

echo "All Go modules initialized successfully!" 