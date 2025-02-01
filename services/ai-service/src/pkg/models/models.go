package models

import (
	"time"

	"github.com/google/uuid"
)

// PromptTemplate represents a template for generating AI prompts
type PromptTemplate struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Category     string    `json:"category"`
	TemplateText string    `json:"template_text"`
	Parameters   []string  `json:"parameters"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Generation represents an AI content generation
type Generation struct {
	ID              uuid.UUID         `json:"id"`
	UserID          uuid.UUID         `json:"user_id"`
	PromptTemplateID uuid.UUID        `json:"prompt_template_id"`
	InputParams     map[string]string `json:"input_params"`
	GeneratedContent string           `json:"generated_content"`
	Status          string           `json:"status"` // pending, completed, failed
	ModelUsed       string           `json:"model_used"`
	TokensUsed      int64            `json:"tokens_used"`
	DurationMs      int64            `json:"duration_ms"`
	CreatedAt       time.Time        `json:"created_at"`
}

// Feedback represents user feedback for an AI generation
type Feedback struct {
	ID           uuid.UUID `json:"id"`
	GenerationID uuid.UUID `json:"generation_id"`
	UserID       uuid.UUID `json:"user_id"`
	Rating       int       `json:"rating"` // 1-5 scale
	Comment      string    `json:"comment"`
	CreatedAt    time.Time `json:"created_at"`
}

// GenerationStats represents statistics for an AI generation
type GenerationStats struct {
	TotalFeedback   int     `json:"total_feedback"`
	AverageRating   float64 `json:"average_rating"`
	PositiveRatings int     `json:"positive_ratings"` // ratings >= 4
	NegativeRatings int     `json:"negative_ratings"` // ratings <= 2
}

// TokenQuota represents a user's token usage quota
type TokenQuota struct {
	RemainingTokens int64 `json:"remaining_tokens"`
	DailyLimit     int64 `json:"daily_limit"`
}

// UserStats combines all user-related statistics
type UserStats struct {
	InteractionStats *InteractionStats  `json:"interaction_stats"`
	LastGenStats     *GenerationStats   `json:"last_gen_stats,omitempty"`
	TokenQuota       *TokenQuota        `json:"token_quota"`
} 