package models

import (
	"time"

	"github.com/google/uuid"
)

// ModelConfig represents the configuration for an AI model
type ModelConfig map[string]string

// AIModel represents an AI model configuration
type AIModel struct {
	ID        uuid.UUID          `json:"id"`
	Name      string            `json:"name"`
	Provider  string            `json:"provider"` // e.g. "openai", "anthropic"
	ModelType string            `json:"model_type"` // e.g. "gpt-4", "claude-2"
	Config    map[string]string `json:"config"`
	CreatedAt time.Time         `json:"created_at"`
	UpdatedAt time.Time         `json:"updated_at"`
}

// AIInteraction represents a single interaction with an AI model
type AIInteraction struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	ModelID     uuid.UUID `json:"model_id"`
	Type        string    `json:"type"` // e.g. "generate", "validate"
	Input       string    `json:"input"`
	Output      string    `json:"output"`
	TokensUsed  int64     `json:"tokens_used"`
	DurationMs  int64     `json:"duration_ms"`
	Status      string    `json:"status"` // success, error
	ErrorMsg    string    `json:"error_msg,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// InteractionStats represents statistics for AI interactions
type InteractionStats struct {
	TotalInteractions int64    `json:"total_interactions"`
	TotalTokens      int64    `json:"total_tokens"`
	AverageDuration  float64  `json:"average_duration_ms"`
	ErrorCount       int64    `json:"error_count"`
}

// NewAIModel creates a new AI model
func NewAIModel(name, provider, modelType string, config ModelConfig) *AIModel {
	now := time.Now().UTC()
	return &AIModel{
		ID:        uuid.New(),
		Name:      name,
		Provider:  provider,
		ModelType: modelType,
		Config:    config,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// NewAIInteraction creates a new AI interaction record
func NewAIInteraction(userID, modelID uuid.UUID, prompt, response string, tokensUsed int, durationMs int64) *AIInteraction {
	return &AIInteraction{
		ID:         uuid.New(),
		UserID:     userID,
		ModelID:    modelID,
		Input:      prompt,
		Output:     response,
		TokensUsed: int64(tokensUsed),
		DurationMs: durationMs,
		Status:     "success",
		CreatedAt:  time.Now().UTC(),
	}
}

// UpdateConfig updates the model's configuration
func (m *AIModel) UpdateConfig(config ModelConfig) {
	m.Config = config
	m.UpdatedAt = time.Now().UTC()
}

// GetConfig returns the model configuration
func (m *AIModel) GetConfig() ModelConfig {
	return m.Config
} 