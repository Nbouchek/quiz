package integration

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"QuizApp/services/ai-service/src/pkg/config"
	"QuizApp/services/ai-service/src/pkg/handlers"
	"QuizApp/services/ai-service/src/pkg/repository"
	"QuizApp/services/ai-service/src/pkg/service"
	"QuizApp/services/ai-service/src/pkg/testutil"
	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

type TestEnv struct {
	DB         *sql.DB
	Config     *config.Config
	Router     *mux.Router
	Server     *httptest.Server
	AIService  *service.AIService
	Repository *repository.AIFacade
	Logger     *zap.Logger
	Cleanup    func()
}

func setupTestEnv(t *testing.T) *TestEnv {
	t.Helper()

	// Initialize logger
	logger, err := zap.NewDevelopment()
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}

	// Set up test database
	db := testutil.NewTestDB(t)

	// Run migrations
	db.RunMigrations("../../migrations")

	// Load test configuration
	cfg := &config.Config{
		Server: config.ServerConfig{
			Port:         8082,
			ReadTimeout:  30,
			WriteTimeout: 30,
		},
		Database: config.DatabaseConfig{
			Host:     "localhost",
			Port:     5432,
			User:     "postgres",
			Password: "postgres",
			DBName:   "ai_service_test",
			SSLMode:  "disable",
		},
		AI: config.AIConfig{
			OpenAIKey:    "test-openai-key",
			AnthropicKey: "test-anthropic-key",
			DefaultModel: "gpt-4",
			MaxTokens:    2000,
			Temperature:  0.7,
			Timeout:      30,
		},
	}

	// Create repository facade
	repo := repository.NewAIFacade(db.DB)

	// Create AI service
	aiService := service.NewAIService(cfg, repo)

	// Create router and register handlers
	router := mux.NewRouter()
	handlers.NewAIHandler(router, aiService, logger)

	// Create test server
	server := httptest.NewServer(router)

	cleanup := func() {
		server.Close()
		db.Cleanup()
		logger.Sync()
	}

	return &TestEnv{
		DB:         db.DB,
		Config:     cfg,
		Router:     router,
		Server:     server,
		AIService:  aiService,
		Repository: repo,
		Logger:     logger,
		Cleanup:    cleanup,
	}
}

// Helper function to wait for database migrations to complete
func waitForMigrations(db *sql.DB, timeout time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return fmt.Errorf("timeout waiting for migrations")
		case <-ticker.C:
			if err := db.PingContext(ctx); err == nil {
				return nil
			}
		}
	}
}

// Helper function to make HTTP requests
func makeRequest(server *httptest.Server, method, path string, body []byte) (*http.Response, error) {
	req, err := http.NewRequest(method, server.URL+path, nil)
	if err != nil {
		return nil, err
	}

	if len(body) > 0 {
		req.Body = http.NoBody
		req.ContentLength = int64(len(body))
		req.Header.Set("Content-Type", "application/json")
	}

	return http.DefaultClient.Do(req)
}

// Helper function to check if external services are mocked
func isMockMode() bool {
	return os.Getenv("TEST_MODE") == "mock"
}

// Helper function to clean test data
func cleanTestData(db *sql.DB) error {
	tables := []string{
		"ai_models",
		"prompt_templates",
		"ai_interactions",
		"generations",
		"generation_feedback",
	}

	for _, table := range tables {
		if _, err := db.Exec(fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table)); err != nil {
			return fmt.Errorf("failed to truncate table %s: %v", table, err)
		}
	}

	return nil
} 