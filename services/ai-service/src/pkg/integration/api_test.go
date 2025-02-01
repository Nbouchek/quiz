package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/QuizApp/QuizApp/services/ai-service/src/pkg/api"
	"github.com/QuizApp/QuizApp/services/ai-service/src/pkg/models"
	"github.com/QuizApp/QuizApp/services/ai-service/src/pkg/testutil"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAPIIntegration(t *testing.T) {
	// Set up test environment
	env := setupTestEnv(t)
	defer env.Cleanup()

	// Wait for migrations to complete
	err := waitForMigrations(env.DB, 5*time.Second)
	require.NoError(t, err)

	t.Run("content generation flow", func(t *testing.T) {
		// Create test model
		model := testutil.TestAIModel()
		err := env.Repository.Models().CreateModel(context.Background(), model)
		require.NoError(t, err)

		// Create test prompt template
		prompt := testutil.TestPromptTemplate()
		err = env.Repository.Prompts().CreatePromptTemplate(context.Background(), prompt)
		require.NoError(t, err)

		// Test content generation
		req := api.GenerateContentRequest{
			UserID:   uuid.New().String(),
			ModelID:  model.ID.String(),
			PromptID: prompt.ID.String(),
			Params: map[string]string{
				"parameter": "test value",
			},
		}

		body, err := json.Marshal(req)
		require.NoError(t, err)

		resp, err := makeRequest(env.Server, "POST", "/v1/generate", body)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var genResp api.GenerationResponse
		err = json.NewDecoder(resp.Body).Decode(&genResp)
		require.NoError(t, err)
		assert.NotEmpty(t, genResp.ID)
		assert.Equal(t, req.UserID, genResp.UserID)
		assert.Equal(t, "completed", genResp.Status)
	})

	t.Run("error scenarios", func(t *testing.T) {
		tests := []struct {
			name           string
			request        api.GenerateContentRequest
			expectedStatus int
			expectedError  string
		}{
			{
				name: "invalid model ID",
				request: api.GenerateContentRequest{
					UserID:   uuid.New().String(),
					ModelID:  "invalid-uuid",
					PromptID: uuid.New().String(),
					Params:   map[string]string{"key": "value"},
				},
				expectedStatus: http.StatusBadRequest,
				expectedError:  "VALIDATION_ERROR",
			},
			{
				name: "non-existent model",
				request: api.GenerateContentRequest{
					UserID:   uuid.New().String(),
					ModelID:  uuid.New().String(),
					PromptID: uuid.New().String(),
					Params:   map[string]string{"key": "value"},
				},
				expectedStatus: http.StatusNotFound,
				expectedError:  "NOT_FOUND",
			},
			{
				name: "missing parameters",
				request: api.GenerateContentRequest{
					UserID:   uuid.New().String(),
					ModelID:  uuid.New().String(),
					PromptID: uuid.New().String(),
				},
				expectedStatus: http.StatusBadRequest,
				expectedError:  "VALIDATION_ERROR",
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				body, err := json.Marshal(tt.request)
				require.NoError(t, err)

				resp, err := makeRequest(env.Server, "POST", "/v1/generate", body)
				require.NoError(t, err)
				assert.Equal(t, tt.expectedStatus, resp.StatusCode)

				var errResp api.ErrorResponse
				err = json.NewDecoder(resp.Body).Decode(&errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.expectedError, errResp.Code)
			})
		}
	})

	t.Run("feedback flow", func(t *testing.T) {
		// Create test generation
		gen := testutil.TestGeneration()
		err := env.Repository.Generations().SaveGeneration(context.Background(), gen)
		require.NoError(t, err)

		// Submit feedback
		req := api.SaveFeedbackRequest{
			UserID:  gen.UserID.String(),
			Rating:  5,
			Comment: "Great response!",
		}

		body, err := json.Marshal(req)
		require.NoError(t, err)

		resp, err := makeRequest(env.Server, "POST", fmt.Sprintf("/v1/generations/%s/feedback", gen.ID), body)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)

		// Verify feedback was saved
		feedbacks, err := env.Repository.Generations().ListGenerationFeedback(context.Background(), gen.ID)
		require.NoError(t, err)
		assert.Len(t, feedbacks, 1)
		assert.Equal(t, 5, feedbacks[0].Rating)
		assert.Equal(t, "Great response!", feedbacks[0].Comment)
	})

	t.Run("user stats", func(t *testing.T) {
		userID := uuid.New()

		// Create some test interactions
		for i := 0; i < 3; i++ {
			interaction := &models.AIInteraction{
				ID:         uuid.New(),
				UserID:     userID,
				ModelID:    uuid.New(),
				Type:       "generation",
				Input:      "test input",
				Output:     "test output",
				TokensUsed: 100,
				DurationMs: 500,
				Status:     "success",
				CreatedAt:  time.Now().UTC(),
			}
			err := env.Repository.Interactions().SaveInteraction(context.Background(), interaction)
			require.NoError(t, err)
		}

		// Get user stats
		resp, err := makeRequest(env.Server, "GET", fmt.Sprintf("/v1/users/%s/stats", userID), nil)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var stats api.UserStatsResponse
		err = json.NewDecoder(resp.Body).Decode(&stats)
		require.NoError(t, err)
		assert.Equal(t, int64(3), stats.InteractionStats.TotalInteractions)
		assert.Equal(t, int64(300), stats.InteractionStats.TotalTokens)
	})
}

func TestDatabaseMigrations(t *testing.T) {
	// Set up clean database
	db := testutil.NewTestDB(t)
	defer db.Cleanup()

	t.Run("migrations up", func(t *testing.T) {
		// Run migrations
		db.RunMigrations("../../migrations")

		// Verify tables exist
		tables := []string{
			"ai_models",
			"prompt_templates",
			"ai_interactions",
			"generations",
			"generation_feedback",
		}

		for _, table := range tables {
			var exists bool
			query := `SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = $1
			)`
			err := db.DB.QueryRow(query, table).Scan(&exists)
			require.NoError(t, err)
			assert.True(t, exists, "table %s should exist", table)
		}
	})

	t.Run("migrations rollback", func(t *testing.T) {
		// TODO: Implement rollback test once we have a rollback mechanism
		t.Skip("Rollback test not implemented yet")
	})
}

func TestServiceInteractions(t *testing.T) {
	if !isMockMode() {
		t.Skip("Skipping service interaction tests in non-mock mode")
	}

	env := setupTestEnv(t)
	defer env.Cleanup()

	// Set up mock servers for external services
	mockUserService := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":       uuid.New().String(),
			"username": "testuser",
		})
	}))
	defer mockUserService.Close()

	// Update config with mock service URLs
	env.Config.AI.OpenAIKey = "test-key"
	env.Config.AI.AnthropicKey = "test-key"

	t.Run("end-to-end flow", func(t *testing.T) {
		// Create model
		model := testutil.TestAIModel()
		err := env.Repository.Models().CreateModel(context.Background(), model)
		require.NoError(t, err)

		// Create prompt template
		prompt := testutil.TestPromptTemplate()
		err = env.Repository.Prompts().CreatePromptTemplate(context.Background(), prompt)
		require.NoError(t, err)

		// Generate content
		userID := uuid.New()
		gen, err := env.AIService.GenerateContent(context.Background(), userID, model.ID, prompt.ID, map[string]string{
			"parameter": "test value",
		})
		require.NoError(t, err)
		assert.NotNil(t, gen)

		// Submit feedback
		err = env.AIService.SaveFeedback(context.Background(), userID, gen.ID, 5, "Great response!")
		require.NoError(t, err)

		// Get user stats
		stats, err := env.AIService.GetUserStats(context.Background(), userID)
		require.NoError(t, err)
		assert.NotNil(t, stats)
		assert.NotNil(t, stats.InteractionStats)
		assert.NotNil(t, stats.LastGenStats)
	})
} 