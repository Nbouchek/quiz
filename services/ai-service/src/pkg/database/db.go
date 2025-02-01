package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
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

// GetDSN returns the PostgreSQL connection string
func (c *Config) GetDSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.DBName, c.SSLMode)
}

// NewConfig creates a new database configuration from environment variables
func NewConfig() *Config {
	return &Config{
		Host:     getEnvWithDefault("DB_HOST", "postgres"),
		Port:     getEnvWithDefault("DB_PORT", "5432"),
		User:     getEnvWithDefault("DB_USER", "postgres"),
		Password: getEnvWithDefault("DB_PASSWORD", "postgres"),
		DBName:   getEnvWithDefault("DB_NAME", "quizapp"),
		SSLMode:  getEnvWithDefault("DB_SSL_MODE", "disable"),
	}
}

// getEnvWithDefault returns environment variable value or default if not set
func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// Initialize sets up the database connection and logger
func Initialize() error {
	var initErr error
	once.Do(func() {
		var err error
		logger, err = zap.NewProduction()
		if err != nil {
			initErr = fmt.Errorf("failed to initialize logger: %v", err)
			return
		}

		config := NewConfig()
		db, err = Connect(config)
		if err != nil {
			logger.Error("Failed to connect to database", zap.Error(err))
			initErr = err
			return
		}

		logger.Info("Successfully connected to database",
			zap.String("host", config.Host),
			zap.String("database", config.DBName))
	})

	return initErr
}

// Connect establishes a connection to the database
func Connect(config *Config) (*sql.DB, error) {
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

// getMigrationsPath returns the absolute path to the migrations directory
func getMigrationsPath() (string, error) {
	// Get the current file's directory
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return "", fmt.Errorf("failed to get current file path")
	}

	// Navigate to the migrations directory relative to the current file
	baseDir := filepath.Dir(filepath.Dir(filepath.Dir(filename))) // Go up 3 levels from pkg/database to src
	migrationsPath := filepath.Join(baseDir, "migrations")

	// Ensure the migrations directory exists
	if _, err := os.Stat(migrationsPath); os.IsNotExist(err) {
		return "", fmt.Errorf("migrations directory not found at %s", migrationsPath)
	}

	return migrationsPath, nil
}

// RunMigrations runs database migrations
func RunMigrations(dsn string) error {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return fmt.Errorf("error opening database: %w", err)
	}
	defer db.Close()

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("error creating migration driver: %w", err)
	}

	// Get the migrations path
	migrationsPath, err := getMigrationsPath()
	if err != nil {
		return fmt.Errorf("error getting migrations path: %w", err)
	}

	// Create the migration instance
	m, err := migrate.NewWithDatabaseInstance(
		fmt.Sprintf("file://%s", migrationsPath),
		"postgres",
		driver,
	)
	if err != nil {
		return fmt.Errorf("error creating migration instance: %w", err)
	}

	// Run migrations
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("error running migrations: %w", err)
	}

	// Get migration version
	version, dirty, err := m.Version()
	if err != nil && err != migrate.ErrNilVersion {
		return fmt.Errorf("error getting migration version: %w", err)
	}

	log.Printf("Database migrated to version %d (dirty: %v)", version, dirty)
	return nil
} 