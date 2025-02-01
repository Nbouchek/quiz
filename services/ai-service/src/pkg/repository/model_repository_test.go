package repository

import (
	"context"
	"testing"
	"time"

	"github.com/QuizApp/QuizApp/services/ai-service/src/pkg/testutil"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostgresModelRepository(t *testing.T) {
	// Set up test database
	db := testutil.NewTestDB(t)
	defer db.Cleanup()

	// Run migrations
	db.RunMigrations("../../migrations")

	// Create repository
	repo := NewPostgresModelRepository(db.DB)

	// Test cases
	t.Run("CreateModel", func(t *testing.T) {
		// Clean up before test
		db.TruncateTables("ai_models")

		// Create test model
		model := testutil.TestAIModel()
		err := repo.CreateModel(context.Background(), model)
		require.NoError(t, err)

		// Verify model was created
		saved, err := repo.GetModel(context.Background(), model.ID)
		require.NoError(t, err)
		assert.Equal(t, model.Name, saved.Name)
		assert.Equal(t, model.Provider, saved.Provider)
		assert.Equal(t, model.ModelType, saved.ModelType)
		assert.Equal(t, model.Config, saved.Config)
		assert.WithinDuration(t, model.CreatedAt, saved.CreatedAt, time.Second)
		assert.WithinDuration(t, model.UpdatedAt, saved.UpdatedAt, time.Second)
	})

	t.Run("GetModel", func(t *testing.T) {
		// Clean up before test
		db.TruncateTables("ai_models")

		// Test not found case
		_, err := repo.GetModel(context.Background(), uuid.New())
		assert.ErrorIs(t, err, ErrModelNotFound)

		// Create test model
		model := testutil.TestAIModel()
		err = repo.CreateModel(context.Background(), model)
		require.NoError(t, err)

		// Test successful retrieval
		saved, err := repo.GetModel(context.Background(), model.ID)
		require.NoError(t, err)
		assert.Equal(t, model.ID, saved.ID)
	})

	t.Run("UpdateModel", func(t *testing.T) {
		// Clean up before test
		db.TruncateTables("ai_models")

		// Create test model
		model := testutil.TestAIModel()
		err := repo.CreateModel(context.Background(), model)
		require.NoError(t, err)

		// Update model
		model.Name = "updated-model"
		model.Config["temperature"] = "0.8"
		err = repo.UpdateModel(context.Background(), model)
		require.NoError(t, err)

		// Verify changes
		saved, err := repo.GetModel(context.Background(), model.ID)
		require.NoError(t, err)
		assert.Equal(t, "updated-model", saved.Name)
		assert.Equal(t, "0.8", saved.Config["temperature"])
		assert.True(t, saved.UpdatedAt.After(saved.CreatedAt))
	})

	t.Run("DeleteModel", func(t *testing.T) {
		// Clean up before test
		db.TruncateTables("ai_models")

		// Create test model
		model := testutil.TestAIModel()
		err := repo.CreateModel(context.Background(), model)
		require.NoError(t, err)

		// Delete model
		err = repo.DeleteModel(context.Background(), model.ID)
		require.NoError(t, err)

		// Verify deletion
		_, err = repo.GetModel(context.Background(), model.ID)
		assert.ErrorIs(t, err, ErrModelNotFound)
	})

	t.Run("ListModels", func(t *testing.T) {
		// Clean up before test
		db.TruncateTables("ai_models")

		// Create test models
		model1 := testutil.TestAIModel()
		model1.Provider = "openai"
		err := repo.CreateModel(context.Background(), model1)
		require.NoError(t, err)

		model2 := testutil.TestAIModel()
		model2.Provider = "anthropic"
		err = repo.CreateModel(context.Background(), model2)
		require.NoError(t, err)

		// Test listing all models
		models, err := repo.ListModels(context.Background())
		require.NoError(t, err)
		assert.Len(t, models, 2)

		// Verify models are returned in alphabetical order by name
		if models[0].Name > models[1].Name {
			models[0], models[1] = models[1], models[0]
		}
		assert.Equal(t, model1.ID, models[0].ID)
		assert.Equal(t, model2.ID, models[1].ID)
	})
} 