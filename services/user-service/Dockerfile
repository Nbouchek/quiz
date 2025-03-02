# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install git and build dependencies
RUN apk add --no-cache git

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and migrations
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./src/main.go

# Final stage
FROM alpine:latest

WORKDIR /app

# Copy the binary and migrations from builder
COPY --from=builder /app/main .
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/.env.example .env

# Expose port
EXPOSE 8080

# Run the binary
CMD ["./main"]
