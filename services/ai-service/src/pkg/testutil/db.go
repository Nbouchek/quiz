package testutil

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
)

const (
	defaultTestDBHost     = "localhost"
	defaultTestDBPort     = 5432
	defaultTestDBUser     = "postgres"
	defaultTestDBPassword = "postgres"
	defaultTestDBName     = "ai_service_test"
)

// TestDB represents a test database instance
type TestDB struct {
	*sql.DB
	t *testing.T
}

// NewTestDB creates a new test database instance
func NewTestDB(t *testing.T) *TestDB {
	t.Helper()

	// Get database configuration from environment or use defaults
	host := getEnvOrDefault("TEST_DB_HOST", defaultTestDBHost)
	port := getEnvOrDefaultInt("TEST_DB_PORT", defaultTestDBPort)
	user := getEnvOrDefault("TEST_DB_USER", defaultTestDBUser)
	password := getEnvOrDefault("TEST_DB_PASSWORD", defaultTestDBPassword)
	dbName := getEnvOrDefault("TEST_DB_NAME", defaultTestDBName)

	// Connect to PostgreSQL
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbName)
	
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("failed to connect to test database: %v", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Verify connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		t.Fatalf("failed to ping test database: %v", err)
	}

	return &TestDB{DB: db, t: t}
}

// RunMigrations runs database migrations
func (tdb *TestDB) RunMigrations(migrationsPath string) {
	tdb.t.Helper()

	driver, err := postgres.WithInstance(tdb.DB, &postgres.Config{})
	if err != nil {
		tdb.t.Fatalf("failed to create database driver: %v", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://"+migrationsPath,
		"postgres",
		driver,
	)
	if err != nil {
		tdb.t.Fatalf("failed to create migrate instance: %v", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		tdb.t.Fatalf("failed to run migrations: %v", err)
	}
}

// Cleanup cleans up the test database
func (tdb *TestDB) Cleanup() {
	tdb.t.Helper()

	if err := tdb.Close(); err != nil {
		tdb.t.Errorf("failed to close test database: %v", err)
	}
}

// TruncateTables truncates all tables in the test database
func (tdb *TestDB) TruncateTables(tables ...string) {
	tdb.t.Helper()

	for _, table := range tables {
		_, err := tdb.Exec(fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table))
		if err != nil {
			tdb.t.Fatalf("failed to truncate table %s: %v", table, err)
		}
	}
}

// getEnvOrDefault returns environment variable value or default
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvOrDefaultInt returns environment variable value as int or default
func getEnvOrDefaultInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		var result int
		if _, err := fmt.Sscanf(value, "%d", &result); err == nil {
			return result
		}
	}
	return defaultValue
} 