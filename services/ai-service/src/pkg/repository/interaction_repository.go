package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"QuizApp/services/ai-service/src/pkg/models"
	"github.com/google/uuid"
)

const (
	maxRetries = 3
	baseDelay  = 100 * time.Millisecond
)

// PostgresInteractionRepository implements AIInteractionRepository for PostgreSQL
type PostgresInteractionRepository struct {
	db *sql.DB
}

// NewPostgresInteractionRepository creates a new PostgreSQL interaction repository
func NewPostgresInteractionRepository(db *sql.DB) AIInteractionRepository {
	return &PostgresInteractionRepository{db: db}
}

// SaveInteraction saves a new AI interaction
func (r *PostgresInteractionRepository) SaveInteraction(ctx context.Context, interaction *models.AIInteraction) error {
	if interaction.ID == uuid.Nil {
		interaction.ID = uuid.New()
	}
	if interaction.CreatedAt.IsZero() {
		interaction.CreatedAt = time.Now().UTC()
	}

	query := `
		INSERT INTO ai_interactions (id, user_id, model_id, type, input, output, 
			tokens_used, duration_ms, status, error_msg, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`

	err := WithRetry(ctx, func() error {
		_, err := r.db.ExecContext(ctx, query,
			interaction.ID,
			interaction.UserID,
			interaction.ModelID,
			interaction.Type,
			interaction.Input,
			interaction.Output,
			interaction.TokensUsed,
			interaction.DurationMs,
			interaction.Status,
			interaction.ErrorMsg,
			interaction.CreatedAt,
		)
		return CategorizeError(err)
	}, maxRetries, baseDelay)

	if err != nil {
		return fmt.Errorf("failed to save interaction: %w", err)
	}

	return nil
}

// GetInteraction retrieves an AI interaction by ID
func (r *PostgresInteractionRepository) GetInteraction(ctx context.Context, id uuid.UUID) (*models.AIInteraction, error) {
	query := `
		SELECT id, user_id, model_id, type, input, output, 
			tokens_used, duration_ms, status, error_msg, created_at
		FROM ai_interactions
		WHERE id = $1`

	var interaction models.AIInteraction
	err := WithRetry(ctx, func() error {
		err := r.db.QueryRowContext(ctx, query, id).Scan(
			&interaction.ID,
			&interaction.UserID,
			&interaction.ModelID,
			&interaction.Type,
			&interaction.Input,
			&interaction.Output,
			&interaction.TokensUsed,
			&interaction.DurationMs,
			&interaction.Status,
			&interaction.ErrorMsg,
			&interaction.CreatedAt,
		)
		return CategorizeError(err)
	}, maxRetries, baseDelay)

	if err == ErrNotFound {
		return nil, ErrInteractionNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get interaction: %w", err)
	}

	return &interaction, nil
}

// ListUserInteractions retrieves interactions for a user with pagination
func (r *PostgresInteractionRepository) ListUserInteractions(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*models.AIInteraction, error) {
	query := `
		SELECT id, user_id, model_id, type, input, output, 
			tokens_used, duration_ms, status, error_msg, created_at
		FROM ai_interactions
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	var interactions []*models.AIInteraction
	err := WithRetry(ctx, func() error {
		rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
		if err != nil {
			return CategorizeError(err)
		}
		defer rows.Close()

		for rows.Next() {
			interaction := &models.AIInteraction{}
			err := rows.Scan(
				&interaction.ID,
				&interaction.UserID,
				&interaction.ModelID,
				&interaction.Type,
				&interaction.Input,
				&interaction.Output,
				&interaction.TokensUsed,
				&interaction.DurationMs,
				&interaction.Status,
				&interaction.ErrorMsg,
				&interaction.CreatedAt,
			)
			if err != nil {
				return CategorizeError(err)
			}
			interactions = append(interactions, interaction)
		}
		return CategorizeError(rows.Err())
	}, maxRetries, baseDelay)

	if err != nil {
		return nil, fmt.Errorf("failed to list user interactions: %w", err)
	}

	return interactions, nil
}

// GetUserInteractionStats retrieves interaction statistics for a user
func (r *PostgresInteractionRepository) GetUserInteractionStats(ctx context.Context, userID uuid.UUID) (*models.InteractionStats, error) {
	query := `
		SELECT 
			COUNT(*) as total_interactions,
			COALESCE(SUM(tokens_used), 0) as total_tokens,
			COALESCE(AVG(duration_ms), 0) as avg_duration,
			COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
		FROM ai_interactions
		WHERE user_id = $1`

	var stats models.InteractionStats
	err := WithRetry(ctx, func() error {
		err := r.db.QueryRowContext(ctx, query, userID).Scan(
			&stats.TotalInteractions,
			&stats.TotalTokens,
			&stats.AverageDuration,
			&stats.ErrorCount,
		)
		return CategorizeError(err)
	}, maxRetries, baseDelay)

	if err != nil && err != ErrNotFound {
		return nil, fmt.Errorf("failed to get user interaction stats: %w", err)
	}

	return &stats, nil
} 