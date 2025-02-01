package database

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"sync"
	"time"

	_ "github.com/lib/pq"
	"go.uber.org/zap"
)

var (
    db     *sql.DB
    logger *zap.Logger
    once   sync.Once
)

// Config holds database configuration
type Config struct {
    Host     string
    Port     string
    User     string
    Password string
    DBName   string
    SSLMode  string
}

// NewConfig creates a new database configuration from environment variables
func NewConfig() *Config {
    return &Config{
        Host:     getEnvOrDefault("DB_HOST", "postgres"),
        Port:     getEnvOrDefault("DB_PORT", "5432"),
        User:     getEnvOrDefault("DB_USER", "postgres"),
        Password: getEnvOrDefault("DB_PASSWORD", "postgres"),
        DBName:   getEnvOrDefault("DB_NAME", "quizapp_study"),
        SSLMode:  getEnvOrDefault("DB_SSL_MODE", "disable"),
    }
}

// Helper function to get environment variable with default value
func getEnvOrDefault(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

// Initialize sets up the database connection and logger
func Initialize(ctx context.Context) error {
    var initErr error
    once.Do(func() {
        var err error
        logger, err = zap.NewProduction()
        if err != nil {
            initErr = fmt.Errorf("failed to initialize logger: %v", err)
            return
        }

        config := NewConfig()
        db, err = Connect(ctx, config)
        if err != nil {
            logger.Error("Failed to connect to database", zap.Error(err))
            initErr = err
            return
        }

        logger.Info("Successfully connected to database",
            zap.String("host", config.Host),
            zap.String("database", config.DBName))

        // Initialize schema
        if err := initializeSchema(ctx); err != nil {
            logger.Error("Failed to initialize schema", zap.Error(err))
            initErr = err
            return
        }
        logger.Info("Successfully initialized database schema")
    })

    return initErr
}

// initializeSchema creates the necessary database tables
func initializeSchema(ctx context.Context) error {
    schema := `
    -- Create quiz_attempts table
    CREATE TABLE IF NOT EXISTS quiz_attempts (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        quiz_id UUID NOT NULL,
        status VARCHAR(20) NOT NULL,
        score DECIMAL(5,2),
        started_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP,
        total_questions INTEGER NOT NULL,
        correct_answers INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
    );

    -- Create answers table
    CREATE TABLE IF NOT EXISTS answers (
        id UUID PRIMARY KEY,
        attempt_id UUID NOT NULL REFERENCES quiz_attempts(id),
        question_id UUID NOT NULL,
        answer TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        created_at TIMESTAMP NOT NULL,
        UNIQUE(attempt_id, question_id)
    );`

    _, err := db.ExecContext(ctx, schema)
    return err
}

// Connect establishes a connection to the database
func Connect(ctx context.Context, config *Config) (*sql.DB, error) {
    dsn := fmt.Sprintf("postgresql://%s:%s@%s:%s/%s?sslmode=%s",
        config.User, config.Password, config.Host, config.Port, config.DBName, config.SSLMode)

    var err error
    db, err = sql.Open("postgres", dsn)
    if err != nil {
        return nil, fmt.Errorf("error opening database: %v", err)
    }

    // Set connection pool settings
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(5)
    db.SetConnMaxLifetime(5 * time.Minute)

    // Test the connection with context
    if err = db.PingContext(ctx); err != nil {
        return nil, fmt.Errorf("error connecting to the database: %v", err)
    }

    return db, nil
}

// GetDB returns the database instance
func GetDB() *sql.DB {
    return db
}

// Close closes the database connection
func Close() error {
    if db != nil {
        if err := db.Close(); err != nil {
            logger.Error("Error closing database connection", zap.Error(err))
            return err
        }
        logger.Info("Database connection closed successfully")
    }
    return nil
}

// WithTransaction executes a function within a database transaction
func WithTransaction(ctx context.Context, fn func(*sql.Tx) error) error {
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return fmt.Errorf("error starting transaction: %v", err)
    }

    defer func() {
        if p := recover(); p != nil {
            tx.Rollback()
            panic(p) // re-throw panic after rollback
        }
    }()

    if err := fn(tx); err != nil {
        if rbErr := tx.Rollback(); rbErr != nil {
            return fmt.Errorf("error rolling back transaction: %v (original error: %v)", rbErr, err)
        }
        return err
    }

    if err := tx.Commit(); err != nil {
        return fmt.Errorf("error committing transaction: %v", err)
    }

    return nil
} 