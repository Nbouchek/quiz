#!/bin/bash

set -e

# Default values
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_USER=${DB_USER:-"postgres"}
DB_PASSWORD=${DB_PASSWORD:-"postgres"}

# Function to check if PostgreSQL is running
check_postgres() {
    echo "Checking PostgreSQL connection..."
    pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1 || {
        echo "Error: PostgreSQL is not running or not accessible"
        exit 1
    }
}

# Function to create databases and run migrations
init_databases() {
    echo "Initializing databases..."
    
    # Create databases and run migrations
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -f init-db.sql
    
    if [ $? -eq 0 ]; then
        echo "Database initialization completed successfully!"
    else
        echo "Error: Database initialization failed"
        exit 1
    fi
}

# Function to insert initial data
insert_initial_data() {
    echo "Inserting initial data..."
    
    # Insert AI models
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d quizapp_ai << EOF
INSERT INTO ai_models (name, provider, model_type, config) VALUES
    ('gpt-4', 'openai', 'text', '{"max_tokens": 4096, "temperature": 0.7}'),
    ('gpt-3.5-turbo', 'openai', 'text', '{"max_tokens": 4096, "temperature": 0.7}'),
    ('claude-3-opus', 'anthropic', 'text', '{"max_tokens": 4096, "temperature": 0.7}'),
    ('deepseek-coder', 'deepseek', 'code', '{"max_tokens": 4096, "temperature": 0.7}'),
    ('llama-2', 'meta', 'text', '{"max_tokens": 4096, "temperature": 0.7}')
ON CONFLICT (name) DO NOTHING;
EOF
}

# Main execution
echo "Starting database initialization..."

# Check PostgreSQL connection
check_postgres

# Initialize databases and run migrations
init_databases

# Insert initial data
insert_initial_data

echo "Database setup completed successfully!" 