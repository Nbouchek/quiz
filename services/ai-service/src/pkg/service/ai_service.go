package service

import (
	"context"
	"fmt"
	"time"

	"QuizApp/services/ai-service/src/pkg/config"
	"QuizApp/services/ai-service/src/pkg/metrics"
	"QuizApp/services/ai-service/src/pkg/models"
	"QuizApp/services/ai-service/src/pkg/ratelimit"
	"QuizApp/services/ai-service/src/pkg/repository"
	"github.com/google/uuid"
)

// AIService handles AI-related operations
type AIService struct {
	config     *config.Config
	repo       *repository.AIFacade
	openai     *OpenAIService
	anthropic  *AnthropicService
	rateLimiter *ratelimit.RateLimiter
}

// NewAIService creates a new AI service
func NewAIService(cfg *config.Config, repo *repository.AIFacade) *AIService {
	rateLimiter := ratelimit.NewRateLimiter(ratelimit.Config{
		RequestsPerMinute: 60,          // 1 request per second per user
		TokensPerDay:     1_000_000,    // 1M tokens per day per user
		OpenAIRPM:        3_500,        // OpenAI's default RPM limit
		AnthropicRPM:     2_500,        // Anthropic's default RPM limit
	})

	return &AIService{
		config:      cfg,
		repo:        repo,
		openai:      NewOpenAIService(cfg),
		anthropic:   NewAnthropicService(cfg),
		rateLimiter: rateLimiter,
	}
}

// GenerateContent generates content using the specified AI model and prompt template
func (s *AIService) GenerateContent(ctx context.Context, userID uuid.UUID, modelID uuid.UUID, promptID uuid.UUID, params map[string]string) (*models.Generation, error) {
	metrics.IncreaseActiveRequests("generate_content")
	defer metrics.DecreaseActiveRequests("generate_content")
	
	startTime := time.Now()
	
	// Check user rate limit
	if err := s.rateLimiter.AllowRequest(ctx, userID); err != nil {
		metrics.RecordRateLimit("user", "requests_per_minute")
		metrics.IncrementRequestCount("generate_content", "unknown", "rate_limit")
		return nil, fmt.Errorf("rate limit exceeded: %w", err)
	}

	// Get model and prompt
	model, prompt, err := s.repo.GetModelAndPrompt(ctx, modelID, promptID)
	if err != nil {
		metrics.IncrementRequestCount("generate_content", model.Name, "error")
		return nil, fmt.Errorf("failed to get model and prompt: %w", err)
	}

	// Check provider rate limit
	if err := s.rateLimiter.AllowProviderRequest(ctx, model.Provider); err != nil {
		metrics.RecordRateLimit(model.Name, "provider_rpm")
		metrics.IncrementRequestCount("generate_content", model.Name, "rate_limit")
		return nil, fmt.Errorf("provider rate limit exceeded: %w", err)
	}

	// Create generation record
	gen := &models.Generation{
		ID:              uuid.New(),
		UserID:          userID,
		PromptTemplateID: promptID,
		InputParams:     params,
		Status:         "pending",
		ModelUsed:      model.ID.String(),
		CreatedAt:      startTime,
		TokensUsed:     0,
	}

	// Save initial generation record
	err = s.repo.Generations().SaveGeneration(ctx, gen)
	if err != nil {
		metrics.IncrementRequestCount("generate_content", model.Name, "error")
		return nil, fmt.Errorf("failed to save generation: %w", err)
	}

	metrics.IncrementGenerations(model.Name, prompt.Category, "pending")

	// Generate content using the appropriate provider
	content, tokensUsed, err := s.generateWithProvider(ctx, model, prompt, params)
	if err != nil {
		metrics.IncrementRequestCount("generate_content", model.Name, "error")
		metrics.IncrementGenerations(model.Name, prompt.Category, "failed")
		
		// Update generation status to failed
		gen.Status = "failed"
		s.repo.Generations().UpdateGenerationStatus(ctx, gen.ID, "failed")
		return nil, fmt.Errorf("failed to generate content: %w", err)
	}

	// Check and update token quota
	if err := s.rateLimiter.CheckTokenQuota(ctx, userID, tokensUsed); err != nil {
		metrics.RecordRateLimit(model.Name, "token_quota")
		metrics.IncrementRequestCount("generate_content", model.Name, "rate_limit")
		return nil, fmt.Errorf("token quota exceeded: %w", err)
	}

	// Record token usage
	s.rateLimiter.RecordTokenUsage(ctx, userID, tokensUsed)

	// Update generation with results
	gen.GeneratedContent = content
	gen.TokensUsed = tokensUsed
	gen.Status = "completed"
	gen.DurationMs = time.Since(startTime).Milliseconds()

	// Record metrics
	duration := time.Since(startTime).Seconds()
	metrics.RecordRequestDuration("generate_content", model.Name, "success", duration)
	metrics.IncrementRequestCount("generate_content", model.Name, "success")
	metrics.AddTokens(model.Name, "total", tokensUsed)
	metrics.IncrementGenerations(model.Name, prompt.Category, "completed")

	// Save the interaction record
	err = s.repo.RecordInteraction(ctx, userID, modelID, "generation",
		fmt.Sprintf("Template: %s, Params: %v", prompt.Name, params),
		content, tokensUsed, gen.DurationMs, "success", "")
	if err != nil {
		return nil, fmt.Errorf("failed to record interaction: %w", err)
	}

	// Update generation record
	err = s.repo.Generations().UpdateGenerationStatus(ctx, gen.ID, "completed")
	if err != nil {
		return nil, fmt.Errorf("failed to update generation status: %w", err)
	}

	return gen, nil
}

// SaveFeedback saves user feedback for a generation
func (s *AIService) SaveFeedback(ctx context.Context, userID uuid.UUID, generationID uuid.UUID, rating int, comment string) error {
	metrics.IncreaseActiveRequests("save_feedback")
	defer metrics.DecreaseActiveRequests("save_feedback")

	startTime := time.Now()

	// Get the generation to get the model used
	gen, err := s.repo.Generations().GetGeneration(ctx, generationID)
	if err != nil {
		metrics.IncrementRequestCount("save_feedback", "unknown", "error")
		return err
	}

	feedback := &models.Feedback{
		ID:           uuid.New(),
		GenerationID: generationID,
		UserID:      userID,
		Rating:      rating,
		Comment:     comment,
		CreatedAt:   time.Now().UTC(),
	}

	err = s.repo.SaveGenerationWithFeedback(ctx, nil, feedback)
	if err != nil {
		metrics.IncrementRequestCount("save_feedback", gen.ModelUsed, "error")
		return err
	}

	// Record metrics
	duration := time.Since(startTime).Seconds()
	metrics.RecordRequestDuration("save_feedback", gen.ModelUsed, "success", duration)
	metrics.IncrementRequestCount("save_feedback", gen.ModelUsed, "success")
	metrics.RecordFeedbackScore(gen.ModelUsed, float64(rating))

	return nil
}

// GetUserStats returns statistics about a user's AI usage
func (s *AIService) GetUserStats(ctx context.Context, userID uuid.UUID) (*models.UserStats, error) {
	stats, err := s.repo.GetUserStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user stats: %w", err)
	}

	// Add remaining token quota
	remainingTokens := s.rateLimiter.GetRemainingTokens(ctx, userID)
	stats.TokenQuota = &models.TokenQuota{
		RemainingTokens: remainingTokens,
		DailyLimit:     s.rateLimiter.GetDailyTokenLimit(),
	}

	return stats, nil
}

// generateWithProvider selects and uses the appropriate AI provider based on the model
func (s *AIService) generateWithProvider(ctx context.Context, model *models.AIModel, prompt *models.PromptTemplate, params map[string]string) (string, int64, error) {
	switch model.Provider {
	case "openai":
		return s.openai.GenerateContent(ctx, model, prompt, params)
	case "anthropic":
		return s.anthropic.GenerateContent(ctx, model, prompt, params)
	default:
		return "", 0, fmt.Errorf("unsupported AI provider: %s", model.Provider)
	}
} 