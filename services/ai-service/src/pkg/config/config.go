package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds all configuration for the service
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	AI       AIConfig
}

// ServerConfig holds server-related configuration
type ServerConfig struct {
	Port         int
	ReadTimeout  int
	WriteTimeout int
}

// DatabaseConfig holds database-related configuration
type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// AIConfig holds AI-related configuration
type AIConfig struct {
	OpenAIKey    string
	AnthropicKey string
	DefaultModel string
	MaxTokens    int
	Temperature  float64
	Timeout      int
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		Server: ServerConfig{
			Port:         getEnvInt("SERVER_PORT", 8082),
			ReadTimeout:  getEnvInt("SERVER_READ_TIMEOUT", 30),
			WriteTimeout: getEnvInt("SERVER_WRITE_TIMEOUT", 30),
		},
		Database: DatabaseConfig{
			Host:     getEnvStr("DB_HOST", "localhost"),
			Port:     getEnvInt("DB_PORT", 5432),
			User:     getEnvStr("DB_USER", "postgres"),
			Password: getEnvStr("DB_PASSWORD", ""),
			DBName:   getEnvStr("DB_NAME", "quizapp_ai"),
			SSLMode:  getEnvStr("DB_SSL_MODE", "disable"),
		},
		AI: AIConfig{
			OpenAIKey:    getEnvStr("OPENAI_API_KEY", ""),
			AnthropicKey: getEnvStr("ANTHROPIC_API_KEY", ""),
			DefaultModel: getEnvStr("AI_DEFAULT_MODEL", "gpt-4"),
			MaxTokens:    getEnvInt("AI_MAX_TOKENS", 2000),
			Temperature:  getEnvFloat("AI_TEMPERATURE", 0.7),
			Timeout:      getEnvInt("AI_REQUEST_TIMEOUT", 60),
		},
	}

	// Validate required configuration
	if cfg.AI.OpenAIKey == "" && cfg.AI.AnthropicKey == "" {
		return nil, fmt.Errorf("at least one AI provider API key must be set")
	}

	return cfg, nil
}

// GetDSN returns the PostgreSQL connection string
func (c *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.DBName, c.SSLMode)
}

// Helper functions to get environment variables with defaults
func getEnvStr(key string, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if value, exists := os.LookupEnv(key); exists {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultVal
}

func getEnvFloat(key string, defaultVal float64) float64 {
	if value, exists := os.LookupEnv(key); exists {
		if floatVal, err := strconv.ParseFloat(value, 64); err == nil {
			return floatVal
		}
	}
	return defaultVal
} 