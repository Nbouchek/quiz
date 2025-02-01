#!/bin/bash

set -e

# Default values
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_USER=${DB_USER:-"postgres"}
DB_PASSWORD=${DB_PASSWORD:-"postgres"}
MIGRATIONS_DIR="migrations"

# Function to run migrations for a database
run_migrations() {
    local db_name=$1
    local direction=${2:-"up"}  # Default to "up" if not specified

    echo "Running $direction migrations for $db_name..."

    # Construct the database URL
    local db_url="postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$db_name?sslmode=disable"

    # Run the migration
    migrate -path "$MIGRATIONS_DIR" -database "$db_url" "$direction"

    if [ $? -eq 0 ]; then
        echo "Migration $direction completed successfully for $db_name"
    else
        echo "Migration $direction failed for $db_name"
        exit 1
    fi
}

# Function to create a new migration
create_migration() {
    local name=$1
    local timestamp=$(date +%Y%m%d%H%M%S)
    local filename="${timestamp}_${name}"

    migrate create -ext sql -dir "$MIGRATIONS_DIR" -seq "$name"

    if [ $? -eq 0 ]; then
        echo "Created new migration files:"
        echo "  $MIGRATIONS_DIR/${filename}.up.sql"
        echo "  $MIGRATIONS_DIR/${filename}.down.sql"
    else
        echo "Failed to create migration files"
        exit 1
    fi
}

# Check command line arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <command> [args]"
    echo "Commands:"
    echo "  up                  - Run all up migrations"
    echo "  down               - Run all down migrations"
    echo "  create <name>      - Create a new migration"
    echo "  version            - Show current migration version"
    echo "  force <version>    - Force set migration version"
    exit 1
fi

COMMAND=$1
shift

case $COMMAND in
    "up"|"down")
        # Run migrations for each database
        for db in "quizapp_users" "quizapp_content" "quizapp_ai" "quizapp_study"; do
            run_migrations "$db" "$COMMAND"
        done
        ;;
    "create")
        if [ -z "$1" ]; then
            echo "Error: Migration name required"
            echo "Usage: $0 create <name>"
            exit 1
        fi
        create_migration "$1"
        ;;
    "version")
        # Show version for each database
        for db in "quizapp_users" "quizapp_content" "quizapp_ai" "quizapp_study"; do
            db_url="postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$db?sslmode=disable"
            echo "Version for $db:"
            migrate -path "$MIGRATIONS_DIR" -database "$db_url" version
        done
        ;;
    "force")
        if [ -z "$1" ]; then
            echo "Error: Version number required"
            echo "Usage: $0 force <version>"
            exit 1
        fi
        # Force version for each database
        for db in "quizapp_users" "quizapp_content" "quizapp_ai" "quizapp_study"; do
            db_url="postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$db?sslmode=disable"
            echo "Forcing version $1 for $db..."
            migrate -path "$MIGRATIONS_DIR" -database "$db_url" force "$1"
        done
        ;;
    *)
        echo "Unknown command: $COMMAND"
        exit 1
        ;;
esac

echo "All operations completed successfully!" 