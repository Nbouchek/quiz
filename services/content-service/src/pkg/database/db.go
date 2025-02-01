package database

import (
	"database/sql"
	"fmt"
	"os"
	"time"

	_ "github.com/lib/pq"
	"go.uber.org/zap"
)

var (
    db     *sql.DB
    logger *zap.Logger
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
        DBName:   getEnvOrDefault("DB_NAME", "quizapp"),
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
func Initialize() error {
    var err error
    logger, err = zap.NewProduction()
    if err != nil {
        return fmt.Errorf("failed to initialize logger: %v", err)
    }

    config := NewConfig()
    db, err = Connect(config)
    if err != nil {
        logger.Error("Failed to connect to database", zap.Error(err))
        return err
    }

    logger.Info("Successfully connected to database",
        zap.String("host", config.Host),
        zap.String("database", config.DBName))

    // Initialize database schema
    if err := InitSchema(); err != nil {
        logger.Error("Failed to initialize database schema", zap.Error(err))
        return err
    }

    logger.Info("Successfully initialized database schema")
    return nil
}

// Connect establishes a connection to the database
func Connect(config *Config) (*sql.DB, error) {
    // Use standard PostgreSQL connection string format
    dsn := fmt.Sprintf(
        "host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
        config.Host, config.Port, config.User, config.Password, config.DBName, config.SSLMode,
    )

    var err error
    db, err = sql.Open("postgres", dsn)
    if err != nil {
        return nil, fmt.Errorf("error opening database: %v", err)
    }

    // Set connection pool settings
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(5)
    db.SetConnMaxLifetime(5 * time.Minute)

    // Test the connection
    if err = db.Ping(); err != nil {
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