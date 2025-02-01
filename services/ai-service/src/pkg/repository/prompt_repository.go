package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/QuizApp/QuizApp/services/ai-service/src/pkg/models"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

// PostgresPromptRepository implements AIPromptRepository for PostgreSQL
type PostgresPromptRepository struct {
	db *sql.DB
}

// NewPostgresPromptRepository creates a new PostgreSQL prompt repository
func NewPostgresPromptRepository(db *sql.DB) AIPromptRepository {
	return &PostgresPromptRepository{db: db}
}

// CreatePromptTemplate creates a new prompt template
func (r *PostgresPromptRepository) CreatePromptTemplate(ctx context.Context, prompt *models.PromptTemplate) error {
	query := `
		INSERT INTO prompt_templates (id, name, category, template_text, parameters, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	if prompt.ID == uuid.Nil {
		prompt.ID = uuid.New()
	}
	prompt.CreatedAt = time.Now()
	prompt.UpdatedAt = prompt.CreatedAt

	_, err := r.db.ExecContext(ctx, query,
		prompt.ID,
		prompt.Name,
		prompt.Category,
		prompt.TemplateText,
		pq.Array(prompt.Parameters),
		prompt.CreatedAt,
		prompt.UpdatedAt,
	)

	return err
}

// GetPromptTemplate retrieves a prompt template by ID
func (r *PostgresPromptRepository) GetPromptTemplate(ctx context.Context, id uuid.UUID) (*models.PromptTemplate, error) {
	query := `
		SELECT id, name, category, template_text, parameters, created_at, updated_at
		FROM prompt_templates
		WHERE id = $1`

	prompt := &models.PromptTemplate{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&prompt.ID,
		&prompt.Name,
		&prompt.Category,
		&prompt.TemplateText,
		pq.Array(&prompt.Parameters),
		&prompt.CreatedAt,
		&prompt.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrPromptNotFound
	}
	if err != nil {
		return nil, err
	}

	return prompt, nil
}

// UpdatePromptTemplate updates an existing prompt template
func (r *PostgresPromptRepository) UpdatePromptTemplate(ctx context.Context, prompt *models.PromptTemplate) error {
	query := `
		UPDATE prompt_templates
		SET name = $1, category = $2, template_text = $3, parameters = $4, updated_at = $5
		WHERE id = $6`

	prompt.UpdatedAt = time.Now()
	result, err := r.db.ExecContext(ctx, query,
		prompt.Name,
		prompt.Category,
		prompt.TemplateText,
		pq.Array(prompt.Parameters),
		prompt.UpdatedAt,
		prompt.ID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrPromptNotFound
	}

	return nil
}

// DeletePromptTemplate deletes a prompt template
func (r *PostgresPromptRepository) DeletePromptTemplate(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM prompt_templates WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrPromptNotFound
	}

	return nil
}

// ListPromptTemplates retrieves prompt templates by category
func (r *PostgresPromptRepository) ListPromptTemplates(ctx context.Context, category string) ([]*models.PromptTemplate, error) {
	query := `
		SELECT id, name, category, template_text, parameters, created_at, updated_at
		FROM prompt_templates
		WHERE category = $1
		ORDER BY name ASC`

	rows, err := r.db.QueryContext(ctx, query, category)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var prompts []*models.PromptTemplate
	for rows.Next() {
		prompt := &models.PromptTemplate{}
		err := rows.Scan(
			&prompt.ID,
			&prompt.Name,
			&prompt.Category,
			&prompt.TemplateText,
			pq.Array(&prompt.Parameters),
			&prompt.CreatedAt,
			&prompt.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		prompts = append(prompts, prompt)
	}

	return prompts, rows.Err()
} 