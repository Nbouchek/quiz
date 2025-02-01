package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the service
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	AI       AIConfig
}

// ServerConfig holds all HTTP server related configuration
type ServerConfig struct {
	Port         int
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
}

// DatabaseConfig holds all database related configuration
type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// AIConfig holds all AI-related configuration
type AIConfig struct {
	OpenAIKey      string
	AnthropicKey   string
	DefaultModel   string
	MaxTokens      int
	Temperature    float64
	RequestTimeout time.Duration
}

// Load returns a new Config struct populated with values from environment variables
func Load() (*Config, error) {
	cfg := &Config{}

	// Server config
	port, err := strconv.Atoi(getEnvOrDefault("SERVER_PORT", "8082"))
	if err != nil {
		return nil, fmt.Errorf("invalid server port: %w", err)
	}

	cfg.Server = ServerConfig{
		Port:         port,
		ReadTimeout:  time.Duration(getEnvAsInt("SERVER_READ_TIMEOUT", 5)) * time.Second,
		WriteTimeout: time.Duration(getEnvAsInt("SERVER_WRITE_TIMEOUT", 10)) * time.Second,
		IdleTimeout:  time.Duration(getEnvAsInt("SERVER_IDLE_TIMEOUT", 120)) * time.Second,
	}

	// Database config
	cfg.Database = DatabaseConfig{
		Host:     getEnvOrDefault("DB_HOST", "localhost"),
		Port:     getEnvAsInt("DB_PORT", 5432),
		User:     getEnvOrDefault("DB_USER", "postgres"),
		Password: getEnvOrDefault("DB_PASSWORD", "postgres"),
		DBName:   getEnvOrDefault("DB_NAME", "quizapp_ai"),
		SSLMode:  getEnvOrDefault("DB_SSLMODE", "disable"),
	}

	// AI config
	cfg.AI = AIConfig{
		OpenAIKey:      getEnvOrDefault("OPENAI_API_KEY", ""),
		AnthropicKey:   getEnvOrDefault("ANTHROPIC_API_KEY", ""),
		DefaultModel:   getEnvOrDefault("DEFAULT_AI_MODEL", "gpt-4"),
		MaxTokens:      getEnvAsInt("MAX_TOKENS", 2000),
		Temperature:    getEnvAsFloat("TEMPERATURE", 0.7),
		RequestTimeout: time.Duration(getEnvAsInt("AI_REQUEST_TIMEOUT", 30)) * time.Second,
	}

	return cfg, nil
}

// GetDSN returns the PostgreSQL connection string
func (c *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.DBName, c.SSLMode,
	)
}

// Helper functions to get environment variables with defaults
func getEnvOrDefault(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value, exists := os.LookupEnv(key); exists {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvAsFloat(key string, defaultValue float64) float64 {
	if value, exists := os.LookupEnv(key); exists {
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			return floatValue
		}
	}
	return defaultValue
} 