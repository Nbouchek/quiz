package testutil

import (
	"time"

	"github.com/QuizApp/QuizApp/services/ai-service/src/pkg/models"
	"github.com/google/uuid"
)

// TestAIModel creates a test AI model
func TestAIModel() *models.AIModel {
	return &models.AIModel{
		ID:        uuid.New(),
		Name:      "test-model",
		Provider:  "openai",
		ModelType: "chat",
		Config: map[string]string{
			"temperature": "0.7",
			"max_tokens": "1000",
		},
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
}

// TestPromptTemplate creates a test prompt template
func TestPromptTemplate() *models.PromptTemplate {
	return &models.PromptTemplate{
		ID:           uuid.New(),
		Name:         "test-template",
		Category:     "test",
		TemplateText: "This is a test template with {{.parameter}}",
		Parameters: []string{
			"parameter",
		},
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
}

// TestAIInteraction creates a test AI interaction
func TestAIInteraction() *models.AIInteraction {
	return &models.AIInteraction{
		ID:          uuid.New(),
		UserID:      uuid.New(),
		ModelID:     uuid.New(),
		Type:        "generation",
		Input:       "test input",
		Output:      "test output",
		TokensUsed:  25,
		DurationMs:  100,
		Status:      "completed",
		ErrorMsg:    "",
		CreatedAt:   time.Now().UTC(),
	}
}

// TestGeneration creates a test generation
func TestGeneration() *models.Generation {
	return &models.Generation{
		ID:               uuid.New(),
		UserID:           uuid.New(),
		PromptTemplateID: uuid.New(),
		InputParams: map[string]string{
			"parameter": "test value",
		},
		GeneratedContent: "test generated content",
		Status:          "completed",
		ModelUsed:       "test-model",
		TokensUsed:      25,
		DurationMs:      100,
		CreatedAt:       time.Now().UTC(),
	}
}

// TestFeedback creates a test feedback
func TestFeedback() *models.Feedback {
	return &models.Feedback{
		ID:           uuid.New(),
		GenerationID: uuid.New(),
		UserID:       uuid.New(),
		Rating:       5,
		Comment:      "test feedback comment",
		CreatedAt:    time.Now().UTC(),
	}
}

// TestUserStats creates test user statistics
func TestUserStats() *models.UserStats {
	return &models.UserStats{
		InteractionStats: &models.InteractionStats{
			TotalInteractions: 10,
			TotalTokens:      250,
			AverageDuration:  150.5,
			ErrorCount:       1,
		},
		LastGenStats: &models.GenerationStats{
			TotalFeedback:    5,
			AverageRating:    4.2,
			PositiveRatings:  4,
			NegativeRatings:  1,
		},
		TokenQuota: &models.TokenQuota{
			RemainingTokens: 5000,
			DailyLimit:     10000,
		},
	}
} 