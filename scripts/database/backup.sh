#!/bin/bash

set -e

# Default values
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_USER=${DB_USER:-"postgres"}
DB_PASSWORD=${DB_PASSWORD:-"postgres"}
BACKUP_DIR=${BACKUP_DIR:-"backups"}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to backup a database
backup_database() {
    local db_name=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/${db_name}_${timestamp}.sql"

    echo "Backing up $db_name..."
    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -F p \
        -b \
        -v \
        -f "$backup_file" \
        "$db_name"

    # Compress the backup
    gzip "$backup_file"
    echo "Backup of $db_name completed: ${backup_file}.gz"
}

# Backup each database
for db in "quizapp_users" "quizapp_content" "quizapp_ai" "quizapp_study"; do
    backup_database "$db"
done

# Clean up old backups (keep last 7 days)
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "All backups completed successfully!" 