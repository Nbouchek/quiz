# ai-service

## Description
This service is part of the QuizApp platform.

## Setup
1. Install dependencies: `go mod download`
2. Run the service: `go run src/main.go`

## API Endpoints
- `GET /health`: Health check endpoint

## Environment Variables
Create a `.env` file with:
```
PORT=8080
DB_CONNECTION_STRING=postgresql://localhost:5432/quizapp
```
