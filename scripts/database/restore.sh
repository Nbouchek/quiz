#!/bin/bash

set -e

# Default values
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_USER=${DB_USER:-"postgres"}
DB_PASSWORD=${DB_PASSWORD:-"postgres"}
BACKUP_DIR=${BACKUP_DIR:-"backups"}

# Function to restore a database
restore_database() {
    local db_name=$1
    local backup_file=$2

    if [ ! -f "$backup_file" ]; then
        echo "Error: Backup file not found: $backup_file"
        exit 1
    }

    echo "Restoring $db_name from $backup_file..."

    # Drop and recreate the database
    PGPASSWORD=$DB_PASSWORD psql \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -d postgres \
        -c "DROP DATABASE IF EXISTS $db_name;"

    PGPASSWORD=$DB_PASSWORD psql \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -d postgres \
        -c "CREATE DATABASE $db_name;"

    # If the backup is compressed, decompress it first
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | PGPASSWORD=$DB_PASSWORD psql \
            -h $DB_HOST \
            -p $DB_PORT \
            -U $DB_USER \
            -d "$db_name"
    else
        PGPASSWORD=$DB_PASSWORD psql \
            -h $DB_HOST \
            -p $DB_PORT \
            -U $DB_USER \
            -d "$db_name" \
            -f "$backup_file"
    fi

    echo "Restore of $db_name completed successfully!"
}

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 backups/quizapp_users_20240125_120000.sql.gz"
    exit 1
fi

BACKUP_FILE=$1

# Extract database name from backup file
DB_NAME=$(basename "$BACKUP_FILE" | cut -d'_' -f1,2)

# Restore the database
restore_database "$DB_NAME" "$BACKUP_FILE" 