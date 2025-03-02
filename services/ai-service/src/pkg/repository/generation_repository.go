package repository

import (
	"context"
	"database/sql"
	"time"

	"QuizApp/services/ai-service/src/pkg/models"
	"github.com/google/uuid"
)

// PostgresGenerationRepository implements AIGenerationRepository for PostgreSQL
type PostgresGenerationRepository struct {
	db *sql.DB
}

// NewPostgresGenerationRepository creates a new PostgreSQL generation repository
func NewPostgresGenerationRepository(db *sql.DB) AIGenerationRepository {
	return &PostgresGenerationRepository{db: db}
}

// SaveGeneration saves a new AI generation
func (r *PostgresGenerationRepository) SaveGeneration(ctx context.Context, gen *models.Generation) error {
	query := `
		INSERT INTO generations (id, user_id, prompt_template_id, input_params, generated_content, 
			status, model_used, tokens_used, duration_ms, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	if gen.ID == uuid.Nil {
		gen.ID = uuid.New()
	}
	gen.CreatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, query,
		gen.ID,
		gen.UserID,
		gen.PromptTemplateID,
		gen.InputParams,
		gen.GeneratedContent,
		gen.Status,
		gen.ModelUsed,
		gen.TokensUsed,
		gen.DurationMs,
		gen.CreatedAt,
	)

	return err
}

// GetGeneration retrieves a generation by ID
func (r *PostgresGenerationRepository) GetGeneration(ctx context.Context, id uuid.UUID) (*models.Generation, error) {
	query := `
		SELECT id, user_id, prompt_template_id, input_params, generated_content, 
			status, model_used, tokens_used, duration_ms, created_at
		FROM generations
		WHERE id = $1`

	gen := &models.Generation{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&gen.ID,
		&gen.UserID,
		&gen.PromptTemplateID,
		&gen.InputParams,
		&gen.GeneratedContent,
		&gen.Status,
		&gen.ModelUsed,
		&gen.TokensUsed,
		&gen.DurationMs,
		&gen.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrGenerationNotFound
	}
	if err != nil {
		return nil, err
	}

	return gen, nil
}

// ListUserGenerations retrieves generations for a user with pagination
func (r *PostgresGenerationRepository) ListUserGenerations(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*models.Generation, error) {
	query := `
		SELECT id, user_id, prompt_template_id, input_params, generated_content, 
			status, model_used, tokens_used, duration_ms, created_at
		FROM generations
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var generations []*models.Generation
	for rows.Next() {
		gen := &models.Generation{}
		err := rows.Scan(
			&gen.ID,
			&gen.UserID,
			&gen.PromptTemplateID,
			&gen.InputParams,
			&gen.GeneratedContent,
			&gen.Status,
			&gen.ModelUsed,
			&gen.TokensUsed,
			&gen.DurationMs,
			&gen.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		generations = append(generations, gen)
	}

	return generations, rows.Err()
}

// UpdateGenerationStatus updates the status of a generation
func (r *PostgresGenerationRepository) UpdateGenerationStatus(ctx context.Context, id uuid.UUID, status string) error {
	query := `UPDATE generations SET status = $1 WHERE id = $2`

	result, err := r.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrGenerationNotFound
	}

	return nil
}

// SaveFeedback saves feedback for a generation
func (r *PostgresGenerationRepository) SaveFeedback(ctx context.Context, feedback *models.Feedback) error {
	query := `
		INSERT INTO generation_feedback (id, generation_id, user_id, rating, comment, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`

	if feedback.ID == uuid.Nil {
		feedback.ID = uuid.New()
	}
	feedback.CreatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, query,
		feedback.ID,
		feedback.GenerationID,
		feedback.UserID,
		feedback.Rating,
		feedback.Comment,
		feedback.CreatedAt,
	)

	return err
}

// GetFeedback retrieves feedback by ID
func (r *PostgresGenerationRepository) GetFeedback(ctx context.Context, id uuid.UUID) (*models.Feedback, error) {
	query := `
		SELECT id, generation_id, user_id, rating, comment, created_at
		FROM generation_feedback
		WHERE id = $1`

	feedback := &models.Feedback{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&feedback.ID,
		&feedback.GenerationID,
		&feedback.UserID,
		&feedback.Rating,
		&feedback.Comment,
		&feedback.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrFeedbackNotFound
	}
	if err != nil {
		return nil, err
	}

	return feedback, nil
}

// ListGenerationFeedback retrieves all feedback for a generation
func (r *PostgresGenerationRepository) ListGenerationFeedback(ctx context.Context, generationID uuid.UUID) ([]*models.Feedback, error) {
	query := `
		SELECT id, generation_id, user_id, rating, comment, created_at
		FROM generation_feedback
		WHERE generation_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, generationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var feedbacks []*models.Feedback
	for rows.Next() {
		feedback := &models.Feedback{}
		err := rows.Scan(
			&feedback.ID,
			&feedback.GenerationID,
			&feedback.UserID,
			&feedback.Rating,
			&feedback.Comment,
			&feedback.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		feedbacks = append(feedbacks, feedback)
	}

	return feedbacks, rows.Err()
}

// GetGenerationStats retrieves statistics for a generation
func (r *PostgresGenerationRepository) GetGenerationStats(ctx context.Context, generationID uuid.UUID) (*models.GenerationStats, error) {
	query := `
		SELECT 
			COUNT(*) as total_feedback,
			AVG(rating) as avg_rating,
			COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_ratings,
			COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_ratings
		FROM generation_feedback
		WHERE generation_id = $1`

	stats := &models.GenerationStats{}
	err := r.db.QueryRowContext(ctx, query, generationID).Scan(
		&stats.TotalFeedback,
		&stats.AverageRating,
		&stats.PositiveRatings,
		&stats.NegativeRatings,
	)

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	return stats, nil
} 