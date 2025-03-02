// Package repository provides database access for AI service
package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"QuizApp/services/ai-service/src/pkg/models"
	"github.com/google/uuid"
)

// PostgresModelRepository implements AIModelRepository for PostgreSQL
type PostgresModelRepository struct {
	db *sql.DB
}

// NewPostgresModelRepository creates a new PostgreSQL model repository
func NewPostgresModelRepository(db *sql.DB) AIModelRepository {
	return &PostgresModelRepository{db: db}
}

// CreateModel creates a new AI model
func (r *PostgresModelRepository) CreateModel(ctx context.Context, model *models.AIModel) error {
	query := `
		INSERT INTO ai_models (id, name, provider, model_type, config, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	if model.ID == uuid.Nil {
		model.ID = uuid.New()
	}
	model.CreatedAt = time.Now().UTC()
	model.UpdatedAt = model.CreatedAt

	configBytes, err := json.Marshal(model.Config)
	if err != nil {
		return err
	}

	_, err = r.db.ExecContext(ctx, query,
		model.ID,
		model.Name,
		model.Provider,
		model.ModelType,
		configBytes,
		model.CreatedAt,
		model.UpdatedAt,
	)

	return err
}

// GetModel retrieves an AI model by ID
func (r *PostgresModelRepository) GetModel(ctx context.Context, id uuid.UUID) (*models.AIModel, error) {
	query := `
		SELECT id, name, provider, model_type, config, created_at, updated_at
		FROM ai_models
		WHERE id = $1`

	model := &models.AIModel{}
	var configBytes []byte
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&model.ID,
		&model.Name,
		&model.Provider,
		&model.ModelType,
		&configBytes,
		&model.CreatedAt,
		&model.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrModelNotFound
	}
	if err != nil {
		return nil, err
	}

	err = json.Unmarshal(configBytes, &model.Config)
	if err != nil {
		return nil, err
	}

	return model, nil
}

// UpdateModel updates an existing AI model
func (r *PostgresModelRepository) UpdateModel(ctx context.Context, model *models.AIModel) error {
	query := `
		UPDATE ai_models
		SET name = $1, provider = $2, model_type = $3, config = $4, updated_at = $5
		WHERE id = $6`

	model.UpdatedAt = time.Now().UTC()
	configBytes, err := json.Marshal(model.Config)
	if err != nil {
		return err
	}

	result, err := r.db.ExecContext(ctx, query,
		model.Name,
		model.Provider,
		model.ModelType,
		configBytes,
		model.UpdatedAt,
		model.ID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrModelNotFound
	}

	return nil
}

// DeleteModel deletes an AI model
func (r *PostgresModelRepository) DeleteModel(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM ai_models WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrModelNotFound
	}

	return nil
}

// ListModels retrieves all AI models
func (r *PostgresModelRepository) ListModels(ctx context.Context) ([]*models.AIModel, error) {
	query := `
		SELECT id, name, provider, model_type, config, created_at, updated_at
		FROM ai_models
		ORDER BY name ASC`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var modelList []*models.AIModel
	for rows.Next() {
		model := &models.AIModel{}
		var configBytes []byte
		err := rows.Scan(
			&model.ID,
			&model.Name,
			&model.Provider,
			&model.ModelType,
			&configBytes,
			&model.CreatedAt,
			&model.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		err = json.Unmarshal(configBytes, &model.Config)
		if err != nil {
			return nil, err
		}

		modelList = append(modelList, model)
	}

	return modelList, rows.Err()
}

// GetModelByName retrieves an AI model by name
func (r *PostgresModelRepository) GetModelByName(ctx context.Context, name string) (*models.AIModel, error) {
	query := `
		SELECT id, name, provider, model_type, config, created_at, updated_at
		FROM ai_models
		WHERE name = $1`

	model := &models.AIModel{}
	var configBytes []byte
	err := r.db.QueryRowContext(ctx, query, name).Scan(
		&model.ID,
		&model.Name,
		&model.Provider,
		&model.ModelType,
		&configBytes,
		&model.CreatedAt,
		&model.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrModelNotFound
	}
	if err != nil {
		return nil, err
	}

	err = json.Unmarshal(configBytes, &model.Config)
	if err != nil {
		return nil, err
	}

	return model, nil
} 