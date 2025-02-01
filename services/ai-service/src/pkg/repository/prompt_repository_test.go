package repository

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"testing"
	"time"

	"github.com/QuizApp/QuizApp/services/ai-service/src/pkg/models"
	"github.com/QuizApp/QuizApp/services/ai-service/src/pkg/testutil"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostgresPromptRepository(t *testing.T) {
	// Set up test database
	db := testutil.NewTestDB(t)
	defer db.Cleanup()

	// Run migrations
	db.RunMigrations("../../migrations")

	// Create repository
	repo := NewPostgresPromptRepository(db.DB)

	t.Run("CreatePromptTemplate", func(t *testing.T) {
		// Clean up before test
		db.TruncateTables("prompt_templates")

		// Create test prompt
		prompt := testutil.TestPromptTemplate()
		err := repo.CreatePromptTemplate(context.Background(), prompt)
		require.NoError(t, err)

		// Verify prompt was created
		saved, err := repo.GetPromptTemplate(context.Background(), prompt.ID)
		require.NoError(t, err)
		assert.Equal(t, prompt.Name, saved.Name)
		assert.Equal(t, prompt.Category, saved.Category)
		assert.Equal(t, prompt.TemplateText, saved.TemplateText)
		assert.Equal(t, prompt.Parameters, saved.Parameters)
		assert.WithinDuration(t, prompt.CreatedAt, saved.CreatedAt, time.Second)
		assert.WithinDuration(t, prompt.UpdatedAt, saved.UpdatedAt, time.Second)
	})

	t.Run("GetPromptTemplate", func(t *testing.T) {
		// Clean up before test
		db.TruncateTables("prompt_templates")

		// Test not found case
		_, err := repo.GetPromptTemplate(context.Background(), uuid.New())
		assert.ErrorIs(t, err, ErrPromptNotFound)

		// Create test prompt
		prompt := testutil.TestPromptTemplate()
		err = repo.CreatePromptTemplate(context.Background(), prompt)
		require.NoError(t, err)

		// Test successful retrieval
		saved, err := repo.GetPromptTemplate(context.Background(), prompt.ID)
		require.NoError(t, err)
		assert.Equal(t, prompt.ID, saved.ID)
	})

	t.Run("UpdatePromptTemplate", func(t *testing.T) {
		// Clean up before test
		db.TruncateTables("prompt_templates")

		// Create test prompt
		prompt := testutil.TestPromptTemplate()
		err := repo.CreatePromptTemplate(context.Background(), prompt)
		require.NoError(t, err)

		// Update prompt
		prompt.Name = "updated-template"
		prompt.TemplateText = "Updated template text with {{.parameter}}"
		err = repo.UpdatePromptTemplate(context.Background(), prompt)
		require.NoError(t, err)

		// Verify changes
		saved, err := repo.GetPromptTemplate(context.Background(), prompt.ID)
		require.NoError(t, err)
		assert.Equal(t, "updated-template", saved.Name)
		assert.Equal(t, "Updated template text with {{.parameter}}", saved.TemplateText)
		assert.True(t, saved.UpdatedAt.After(saved.CreatedAt))
	})

	t.Run("DeletePromptTemplate", func(t *testing.T) {
		// Clean up before test
		db.TruncateTables("prompt_templates")

		// Create test prompt
		prompt := testutil.TestPromptTemplate()
		err := repo.CreatePromptTemplate(context.Background(), prompt)
		require.NoError(t, err)

		// Delete prompt
		err = repo.DeletePromptTemplate(context.Background(), prompt.ID)
		require.NoError(t, err)

		// Verify deletion
		_, err = repo.GetPromptTemplate(context.Background(), prompt.ID)
		assert.ErrorIs(t, err, ErrPromptNotFound)
	})

	t.Run("ListPromptTemplates", func(t *testing.T) {
		// Clean up before test
		db.TruncateTables("prompt_templates")

		// Create test prompts
		prompt1 := testutil.TestPromptTemplate()
		prompt1.Category = "category1"
		err := repo.CreatePromptTemplate(context.Background(), prompt1)
		require.NoError(t, err)

		prompt2 := testutil.TestPromptTemplate()
		prompt2.Category = "category2"
		err = repo.CreatePromptTemplate(context.Background(), prompt2)
		require.NoError(t, err)

		// Test listing by category
		prompts, err := repo.ListPromptTemplates(context.Background(), "category1")
		require.NoError(t, err)
		assert.Len(t, prompts, 1)
		assert.Equal(t, prompt1.ID, prompts[0].ID)

		// Test listing all prompts
		prompts, err = repo.ListPromptTemplates(context.Background(), "")
		require.NoError(t, err)
		assert.Len(t, prompts, 2)
	})

	t.Run("duplicate name and category", func(t *testing.T) {
		// Clean up before test
		db.TruncateTables("prompt_templates")

		// Create first prompt
		prompt1 := testutil.TestPromptTemplate()
		err := repo.CreatePromptTemplate(context.Background(), prompt1)
		require.NoError(t, err)

		// Try to create second prompt with same name and category
		prompt2 := testutil.TestPromptTemplate()
		prompt2.ID = uuid.New() // Different ID
		prompt2.Name = prompt1.Name
		prompt2.Category = prompt1.Category

		err = repo.CreatePromptTemplate(context.Background(), prompt2)
		assert.Error(t, err)
		assert.ErrorIs(t, CategorizeError(err), ErrDatabaseConflict)
	})
}

func TestPromptRepositoryConcurrent(t *testing.T) {
	// Set up test database
	db := testutil.NewTestDB(t)
	defer db.Cleanup()

	// Run migrations
	db.RunMigrations("../../migrations")

	// Create repository
	repo := NewPostgresPromptRepository(db.DB)

	t.Run("concurrent creations", func(t *testing.T) {
		// Clean up before test
		db.TruncateTables("prompt_templates")

		var wg sync.WaitGroup
		numGoroutines := 10
		errChan := make(chan error, numGoroutines)

		for i := 0; i < numGoroutines; i++ {
			wg.Add(1)
			go func(index int) {
				defer wg.Done()
				prompt := testutil.TestPromptTemplate()
				prompt.Name = fmt.Sprintf("concurrent-prompt-%d", index)
				prompt.Category = fmt.Sprintf("category-%d", index)
				
				err := repo.CreatePromptTemplate(context.Background(), prompt)
				if err != nil {
					errChan <- err
				}
			}(i)
		}

		wg.Wait()
		close(errChan)

		// Check for errors
		for err := range errChan {
			assert.NoError(t, err)
		}

		// Verify all prompts were created
		prompts, err := repo.ListPromptTemplates(context.Background(), "")
		require.NoError(t, err)
		assert.Len(t, prompts, numGoroutines)
	})

	t.Run("concurrent updates", func(t *testing.T) {
		// Clean up before test
		db.TruncateTables("prompt_templates")

		// Create initial prompt
		prompt := testutil.TestPromptTemplate()
		err := repo.CreatePromptTemplate(context.Background(), prompt)
		require.NoError(t, err)

		var wg sync.WaitGroup
		numGoroutines := 10
		errChan := make(chan error, numGoroutines)

		for i := 0; i < numGoroutines; i++ {
			wg.Add(1)
			go func(index int) {
				defer wg.Done()
				
				// Get current prompt
				current, err := repo.GetPromptTemplate(context.Background(), prompt.ID)
				if err != nil {
					errChan <- err
					return
				}

				// Update prompt
				current.TemplateText = fmt.Sprintf("Updated text %d", index)
				err = repo.UpdatePromptTemplate(context.Background(), current)
				if err != nil {
					errChan <- err
				}
			}(i)
		}

		wg.Wait()
		close(errChan)

		// Check for errors
		for err := range errChan {
			assert.NoError(t, err)
		}

		// Verify final state
		updated, err := repo.GetPromptTemplate(context.Background(), prompt.ID)
		require.NoError(t, err)
		assert.Contains(t, updated.TemplateText, "Updated text")
	})

	t.Run("concurrent reads", func(t *testing.T) {
		// Clean up before test
		db.TruncateTables("prompt_templates")

		// Create test prompts
		numPrompts := 5
		prompts := make([]*models.PromptTemplate, numPrompts)
		for i := 0; i < numPrompts; i++ {
			prompt := testutil.TestPromptTemplate()
			prompt.Name = fmt.Sprintf("prompt-%d", i)
			prompt.Category = fmt.Sprintf("category-%d", i)
			err := repo.CreatePromptTemplate(context.Background(), prompt)
			require.NoError(t, err)
			prompts[i] = prompt
		}

		var wg sync.WaitGroup
		numGoroutines := 20
		errChan := make(chan error, numGoroutines)

		for i := 0; i < numGoroutines; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				
				// Random read operations
				switch rand.Intn(3) {
				case 0:
					// Get random prompt
					_, err := repo.GetPromptTemplate(context.Background(), prompts[rand.Intn(numPrompts)].ID)
					if err != nil {
						errChan <- err
					}
				case 1:
					// List by random category
					_, err := repo.ListPromptTemplates(context.Background(), fmt.Sprintf("category-%d", rand.Intn(numPrompts)))
					if err != nil {
						errChan <- err
					}
				case 2:
					// List all
					_, err := repo.ListPromptTemplates(context.Background(), "")
					if err != nil {
						errChan <- err
					}
				}
			}()
		}

		wg.Wait()
		close(errChan)

		// Check for errors
		for err := range errChan {
			assert.NoError(t, err)
		}
	})
}

func BenchmarkPromptRepository(b *testing.B) {
	// Set up test database
	db := testutil.NewTestDB(&testing.T{})
	defer db.Cleanup()

	// Run migrations
	db.RunMigrations("../../migrations")

	// Create repository
	repo := NewPostgresPromptRepository(db.DB)

	// Create test prompt for benchmarks
	prompt := testutil.TestPromptTemplate()
	err := repo.CreatePromptTemplate(context.Background(), prompt)
	require.NoError(b, err)

	b.Run("CreatePromptTemplate", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			newPrompt := testutil.TestPromptTemplate()
			newPrompt.Name = fmt.Sprintf("bench-prompt-%d", i)
			newPrompt.Category = fmt.Sprintf("bench-category-%d", i)
			err := repo.CreatePromptTemplate(context.Background(), newPrompt)
			if err != nil {
				b.Fatal(err)
			}
		}
	})

	b.Run("GetPromptTemplate", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_, err := repo.GetPromptTemplate(context.Background(), prompt.ID)
			if err != nil {
				b.Fatal(err)
			}
		}
	})

	b.Run("UpdatePromptTemplate", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			prompt.TemplateText = fmt.Sprintf("Updated in benchmark %d", i)
			err := repo.UpdatePromptTemplate(context.Background(), prompt)
			if err != nil {
				b.Fatal(err)
			}
		}
	})

	b.Run("ListPromptTemplates", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_, err := repo.ListPromptTemplates(context.Background(), "")
			if err != nil {
				b.Fatal(err)
			}
		}
	})
}

func BenchmarkPromptRepositoryParallel(b *testing.B) {
	// Set up test database
	db := testutil.NewTestDB(&testing.T{})
	defer db.Cleanup()

	// Run migrations
	db.RunMigrations("../../migrations")

	// Create repository
	repo := NewPostgresPromptRepository(db.DB)

	// Create test prompt for benchmarks
	prompt := testutil.TestPromptTemplate()
	err := repo.CreatePromptTemplate(context.Background(), prompt)
	require.NoError(b, err)

	b.Run("ParallelReads", func(b *testing.B) {
		b.RunParallel(func(pb *testing.PB) {
			for pb.Next() {
				_, err := repo.GetPromptTemplate(context.Background(), prompt.ID)
				if err != nil {
					b.Fatal(err)
				}
			}
		})
	})

	b.Run("ParallelWrites", func(b *testing.B) {
		b.RunParallel(func(pb *testing.PB) {
			for pb.Next() {
				newPrompt := testutil.TestPromptTemplate()
				newPrompt.Name = fmt.Sprintf("bench-parallel-%d", rand.Int())
				newPrompt.Category = fmt.Sprintf("bench-category-%d", rand.Int())
				err := repo.CreatePromptTemplate(context.Background(), newPrompt)
				if err != nil {
					b.Fatal(err)
				}
			}
		})
	})
} 