package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/QuizApp/QuizApp/services/ai-service/src/pkg/models"
	"github.com/google/uuid"
)

// AIFacade provides a facade for all AI-related operations
type AIFacade struct {
	models       AIModelRepository
	prompts      AIPromptRepository
	interactions AIInteractionRepository
	generations  AIGenerationRepository
	db           *sql.DB
}

// NewAIFacade creates a new AI repository facade
func NewAIFacade(db *sql.DB) *AIFacade {
	return &AIFacade{
		models:       NewPostgresModelRepository(db),
		prompts:      NewPostgresPromptRepository(db),
		interactions: NewPostgresInteractionRepository(db),
		generations:  NewPostgresGenerationRepository(db),
		db:           db,
	}
}

// Models returns the model repository
func (r *AIFacade) Models() AIModelRepository {
	return r.models
}

// Prompts returns the prompt repository
func (r *AIFacade) Prompts() AIPromptRepository {
	return r.prompts
}

// Interactions returns the interaction repository
func (r *AIFacade) Interactions() AIInteractionRepository {
	return r.interactions
}

// Generations returns the generation repository
func (r *AIFacade) Generations() AIGenerationRepository {
	return r.generations
}

// RecordInteraction records a user's interaction with an AI model
func (r *AIFacade) RecordInteraction(ctx context.Context, userID, modelID uuid.UUID, interactionType, input, output string, tokensUsed int64, durationMs int64, status, errorMsg string) error {
	interaction := &models.AIInteraction{
		ID:         uuid.New(),
		UserID:     userID,
		ModelID:    modelID,
		Type:       interactionType,
		Input:      input,
		Output:     output,
		TokensUsed: tokensUsed,
		DurationMs: durationMs,
		Status:     status,
		ErrorMsg:   errorMsg,
		CreatedAt:  time.Now().UTC(),
	}

	return r.interactions.SaveInteraction(ctx, interaction)
}

// GetModelAndPrompt is a helper method to get both model and prompt template
func (r *AIFacade) GetModelAndPrompt(ctx context.Context, modelID, promptID uuid.UUID) (*models.AIModel, *models.PromptTemplate, error) {
	model, err := r.models.GetModel(ctx, modelID)
	if err != nil {
		return nil, nil, err
	}

	prompt, err := r.prompts.GetPromptTemplate(ctx, promptID)
	if err != nil {
		return model, nil, err
	}

	return model, prompt, nil
}

// SaveGenerationWithFeedback is a helper method to save both generation and feedback
func (r *AIFacade) SaveGenerationWithFeedback(ctx context.Context, gen *models.Generation, feedback *models.Feedback) error {
	// Start a transaction
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Save generation if provided
	if gen != nil {
		err = r.generations.SaveGeneration(ctx, gen)
		if err != nil {
			return err
		}
	}

	// Save feedback if provided
	if feedback != nil {
		if gen != nil {
			feedback.GenerationID = gen.ID
		}
		err = r.generations.SaveFeedback(ctx, feedback)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// GetUserStats is a helper method to get all user-related stats
func (r *AIFacade) GetUserStats(ctx context.Context, userID uuid.UUID) (*models.UserStats, error) {
	// Get interaction stats
	interactionStats, err := r.interactions.GetUserInteractionStats(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Get generation stats for the last generation
	var lastGenStats *models.GenerationStats
	generations, err := r.generations.ListUserGenerations(ctx, userID, 1, 0)
	if err != nil {
		return nil, err
	}
	if len(generations) > 0 {
		lastGenStats, err = r.generations.GetGenerationStats(ctx, generations[0].ID)
		if err != nil {
			return nil, err
		}
	}

	return &models.UserStats{
		InteractionStats: interactionStats,
		LastGenStats:    lastGenStats,
	}, nil
} 