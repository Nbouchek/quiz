package repository

import (
	"context"

	"QuizApp/services/ai-service/src/pkg/models"
	"github.com/google/uuid"
)

// AIModelRepository defines operations for AI models
type AIModelRepository interface {
	CreateModel(ctx context.Context, model *models.AIModel) error
	GetModel(ctx context.Context, id uuid.UUID) (*models.AIModel, error)
	UpdateModel(ctx context.Context, model *models.AIModel) error
	DeleteModel(ctx context.Context, id uuid.UUID) error
	ListModels(ctx context.Context) ([]*models.AIModel, error)
	GetModelByName(ctx context.Context, name string) (*models.AIModel, error)
}

// AIPromptRepository defines operations for prompt templates
type AIPromptRepository interface {
	CreatePromptTemplate(ctx context.Context, prompt *models.PromptTemplate) error
	GetPromptTemplate(ctx context.Context, id uuid.UUID) (*models.PromptTemplate, error)
	UpdatePromptTemplate(ctx context.Context, prompt *models.PromptTemplate) error
	DeletePromptTemplate(ctx context.Context, id uuid.UUID) error
	ListPromptTemplates(ctx context.Context, category string) ([]*models.PromptTemplate, error)
}

// AIInteractionRepository defines operations for AI interactions
type AIInteractionRepository interface {
	SaveInteraction(ctx context.Context, interaction *models.AIInteraction) error
	GetInteraction(ctx context.Context, id uuid.UUID) (*models.AIInteraction, error)
	ListUserInteractions(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*models.AIInteraction, error)
	GetUserInteractionStats(ctx context.Context, userID uuid.UUID) (*models.InteractionStats, error)
}

// AIGenerationRepository defines operations for AI generations and feedback
type AIGenerationRepository interface {
	// Generation operations
	SaveGeneration(ctx context.Context, generation *models.Generation) error
	GetGeneration(ctx context.Context, id uuid.UUID) (*models.Generation, error)
	ListUserGenerations(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*models.Generation, error)
	UpdateGenerationStatus(ctx context.Context, id uuid.UUID, status string) error

	// Feedback operations
	SaveFeedback(ctx context.Context, feedback *models.Feedback) error
	GetFeedback(ctx context.Context, id uuid.UUID) (*models.Feedback, error)
	ListGenerationFeedback(ctx context.Context, generationID uuid.UUID) ([]*models.Feedback, error)
	GetGenerationStats(ctx context.Context, generationID uuid.UUID) (*models.GenerationStats, error)
} 