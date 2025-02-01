package integration

import (
	"testing"

	"github.com/QuizApp/QuizApp/services/ai-service/src/pkg/testutil"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMigrations(t *testing.T) {
	// Set up clean database
	db := testutil.NewTestDB(t)
	defer db.Cleanup()

	// Create migrate instance
	driver, err := postgres.WithInstance(db.DB, &postgres.Config{})
	require.NoError(t, err)

	m, err := migrate.NewWithDatabaseInstance(
		"file://../../migrations",
		"postgres",
		driver,
	)
	require.NoError(t, err)

	t.Run("apply migrations", func(t *testing.T) {
		// Apply migrations
		err = m.Up()
		require.NoError(t, err)

		// Verify all tables and indexes exist
		tables := map[string][]string{
			"ai_models": {
				"id",
				"name",
				"provider",
				"model_type",
				"config",
				"created_at",
				"updated_at",
			},
			"prompt_templates": {
				"id",
				"name",
				"category",
				"template_text",
				"parameters",
				"created_at",
				"updated_at",
			},
			"ai_interactions": {
				"id",
				"user_id",
				"model_id",
				"type",
				"input",
				"output",
				"tokens_used",
				"duration_ms",
				"status",
				"error_message",
				"created_at",
			},
			"generations": {
				"id",
				"user_id",
				"prompt_template_id",
				"input_params",
				"generated_content",
				"status",
				"model_used",
				"tokens_used",
				"duration_ms",
				"created_at",
			},
			"generation_feedback": {
				"id",
				"generation_id",
				"user_id",
				"rating",
				"comment",
				"created_at",
			},
		}

		for table, columns := range tables {
			// Check table exists
			var exists bool
			query := `SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = $1
			)`
			err := db.DB.QueryRow(query, table).Scan(&exists)
			require.NoError(t, err)
			assert.True(t, exists, "table %s should exist", table)

			// Check columns exist
			for _, column := range columns {
				var columnExists bool
				query := `SELECT EXISTS (
					SELECT FROM information_schema.columns 
					WHERE table_schema = 'public' 
					AND table_name = $1 
					AND column_name = $2
				)`
				err := db.DB.QueryRow(query, table, column).Scan(&columnExists)
				require.NoError(t, err)
				assert.True(t, columnExists, "column %s in table %s should exist", column, table)
			}
		}

		// Check indexes
		indexes := []string{
			"idx_ai_interactions_user_id",
			"idx_ai_interactions_model_id",
			"idx_ai_interactions_created_at",
			"idx_prompt_templates_category",
			"idx_generations_user_id",
			"idx_generations_prompt_template_id",
			"idx_generations_model_used",
			"idx_generations_created_at",
			"idx_generation_feedback_generation_id",
			"idx_generation_feedback_user_id",
		}

		for _, index := range indexes {
			var exists bool
			query := `SELECT EXISTS (
				SELECT FROM pg_indexes 
				WHERE schemaname = 'public' 
				AND indexname = $1
			)`
			err := db.DB.QueryRow(query, index).Scan(&exists)
			require.NoError(t, err)
			assert.True(t, exists, "index %s should exist", index)
		}
	})

	t.Run("rollback migrations", func(t *testing.T) {
		// Apply migrations first
		err = m.Up()
		require.NoError(t, err)

		// Rollback all migrations
		err = m.Down()
		require.NoError(t, err)

		// Verify all tables are dropped
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
			assert.False(t, exists, "table %s should not exist", table)
		}
	})

	t.Run("migration idempotency", func(t *testing.T) {
		// Apply migrations multiple times
		for i := 0; i < 3; i++ {
			err = m.Up()
			if i == 0 {
				require.NoError(t, err)
			} else {
				assert.Equal(t, migrate.ErrNoChange, err)
			}
		}

		// Verify database is in correct state
		var tableCount int
		query := `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'`
		err := db.DB.QueryRow(query).Scan(&tableCount)
		require.NoError(t, err)
		assert.Equal(t, 5, tableCount)
	})

	t.Run("migration version", func(t *testing.T) {
		// Get current version
		version, dirty, err := m.Version()
		require.NoError(t, err)
		assert.False(t, dirty)
		assert.Greater(t, version, uint(0))

		// Force version
		err = m.Force(int(version))
		require.NoError(t, err)

		// Verify version
		newVersion, dirty, err := m.Version()
		require.NoError(t, err)
		assert.False(t, dirty)
		assert.Equal(t, version, newVersion)
	})
}

func TestMigrationConcurrency(t *testing.T) {
	// Set up clean database
	db := testutil.NewTestDB(t)
	defer db.Cleanup()

	// Create multiple migrate instances
	createMigrate := func() (*migrate.Migrate, error) {
		driver, err := postgres.WithInstance(db.DB, &postgres.Config{})
		if err != nil {
			return nil, err
		}
		return migrate.NewWithDatabaseInstance(
			"file://../../migrations",
			"postgres",
			driver,
		)
	}

	// Run concurrent migrations
	errChan := make(chan error, 3)
	for i := 0; i < 3; i++ {
		go func() {
			m, err := createMigrate()
			if err != nil {
				errChan <- err
				return
			}
			errChan <- m.Up()
		}()
	}

	// Check results
	for i := 0; i < 3; i++ {
		err := <-errChan
		if i == 0 {
			assert.NoError(t, err)
		} else {
			assert.Equal(t, migrate.ErrNoChange, err)
		}
	}

	// Verify final state
	var tableCount int
	err := db.DB.QueryRow(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'`).Scan(&tableCount)
	require.NoError(t, err)
	assert.Equal(t, 5, tableCount)
} 