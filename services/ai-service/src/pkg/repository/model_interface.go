package repository

import (
	"context"

	"github.com/QuizApp/QuizApp/services/ai-service/src/pkg/models"
	"github.com/google/uuid"
)

// ModelRepository defines operations for AI models
type ModelRepository interface {
	CreateModel(ctx context.Context, model *models.AIModel) error
	GetModel(ctx context.Context, id uuid.UUID) (*models.AIModel, error)
	UpdateModel(ctx context.Context, model *models.AIModel) error
	DeleteModel(ctx context.Context, id uuid.UUID) error
	ListModels(ctx context.Context) ([]*models.AIModel, error)
	GetModelByName(ctx context.Context, name string) (*models.AIModel, error)
} 