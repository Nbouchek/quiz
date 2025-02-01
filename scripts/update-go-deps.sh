#!/bin/bash

set -e

# Function to update dependencies for a service
update_service_deps() {
    local service_name=$1
    echo "Updating dependencies for $service_name..."
    
    cd "services/$service_name"
    
    # Initialize/update Go module
    go mod tidy
    
    # Add required dependencies
    go get github.com/lib/pq
    go get go.uber.org/zap
    go get github.com/golang-jwt/jwt/v5
    go get github.com/joho/godotenv
    
    # Run go mod tidy again to clean up dependencies
    go mod tidy
    
    cd ../..
    echo "$service_name dependencies updated successfully!"
}

cd QuizApp

# Update each service
for service in user-service content-service ai-service study-service; do
    update_service_deps "$service"
done

echo "All service dependencies updated successfully!" 