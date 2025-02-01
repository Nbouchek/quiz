#!/bin/bash

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BLUE='\033[0;34m'

# Print with color
print() {
  echo -e "${BLUE}[test-app]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[test-app]${NC} $1"
}

print_error() {
  echo -e "${RED}[test-app]${NC} $1"
}

# Function to check if a port is in use
is_port_in_use() {
  lsof -i :$1 > /dev/null 2>&1
  return $?
}

# Function to wait for a service to be ready
wait_for_service() {
  local port=$1
  local service_name=$2
  local max_attempts=30
  local attempt=1

  print "Waiting for $service_name to be ready on port $port..."
  
  while ! curl -s http://localhost:$port/health > /dev/null; do
    if [ $attempt -eq $max_attempts ]; then
      print_error "$service_name failed to start after $max_attempts attempts"
      exit 1
    fi
    sleep 1
    ((attempt++))
  done
  
  print_success "$service_name is ready!"
}

# Check if services are already running
if is_port_in_use 8080 || is_port_in_use 8081 || is_port_in_use 8082; then
  print_error "One or more required ports (8080, 8081, 8082) are already in use"
  print_error "Please stop any running services first"
  exit 1
fi

# Start PostgreSQL if not running
if ! pg_isready > /dev/null 2>&1; then
  print "Starting PostgreSQL..."
  brew services start postgresql@14
  sleep 2
fi

# Start Redis if not running
if ! redis-cli ping > /dev/null 2>&1; then
  print "Starting Redis..."
  brew services start redis
  sleep 2
fi

# Start backend services in the background
print "Starting backend services..."

# Start auth service
cd services/auth-service
go run cmd/main.go &
AUTH_PID=$!
cd ../..

# Start quiz service
cd services/quiz-service
go run cmd/main.go &
QUIZ_PID=$!
cd ../..

# Start AI service
cd services/ai-service
go run cmd/main.go &
AI_PID=$!
cd ../..

# Wait for services to be ready
wait_for_service 8080 "auth-service"
wait_for_service 8081 "quiz-service"
wait_for_service 8082 "ai-service"

# Start frontend in development mode
print "Starting frontend..."
cd frontend
npm install
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
sleep 5

# Run tests
print "Running tests..."

# Backend tests
print "Running backend tests..."
cd services/auth-service && go test ./... -v && cd ../..
cd services/quiz-service && go test ./... -v && cd ../..
cd services/ai-service && go test ./... -v && cd ../..

# Frontend tests
print "Running frontend tests..."
cd frontend && npm test && cd ..

# Check test results
if [ $? -eq 0 ]; then
  print_success "All tests passed!"
else
  print_error "Some tests failed"
  exit 1
fi

# Cleanup function
cleanup() {
  print "Cleaning up..."
  kill $AUTH_PID $QUIZ_PID $AI_PID $FRONTEND_PID 2>/dev/null
  brew services stop postgresql@14
  brew services stop redis
  print_success "Cleanup complete"
}

# Set up cleanup on script exit
trap cleanup EXIT

# Keep script running until Ctrl+C
print_success "All services are running. Press Ctrl+C to stop"
wait 