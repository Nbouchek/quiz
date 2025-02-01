package ratelimit

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"golang.org/x/time/rate"
)

// RateLimiter manages rate limits and quotas for AI service usage
type RateLimiter struct {
	// Per-user request rate limiters
	userLimiters sync.Map // map[uuid.UUID]*rate.Limiter

	// Per-user token quotas
	tokenQuotas sync.Map // map[uuid.UUID]*TokenQuota

	// Global rate limiters for API providers
	openAILimiter    *rate.Limiter
	anthropicLimiter *rate.Limiter

	// Configuration
	requestsPerMinute  int
	tokensPerDay      int64
	openAIRPM         int
	anthropicRPM      int
}

// TokenQuota tracks token usage for a user
type TokenQuota struct {
	mu            sync.Mutex
	tokensUsed    int64
	lastReset     time.Time
	dailyLimit    int64
}

// Config holds rate limiter configuration
type Config struct {
	RequestsPerMinute int   // Per-user request limit
	TokensPerDay      int64 // Per-user token quota
	OpenAIRPM         int   // OpenAI requests per minute
	AnthropicRPM      int   // Anthropic requests per minute
}

// NewRateLimiter creates a new rate limiter with the given configuration
func NewRateLimiter(cfg Config) *RateLimiter {
	return &RateLimiter{
		requestsPerMinute: cfg.RequestsPerMinute,
		tokensPerDay:     cfg.TokensPerDay,
		openAILimiter:    rate.NewLimiter(rate.Limit(cfg.OpenAIRPM/60), cfg.OpenAIRPM),
		anthropicLimiter: rate.NewLimiter(rate.Limit(cfg.AnthropicRPM/60), cfg.AnthropicRPM),
	}
}

// AllowRequest checks if a user can make a request
func (r *RateLimiter) AllowRequest(ctx context.Context, userID uuid.UUID) error {
	// Get or create user limiter
	limiterI, _ := r.userLimiters.LoadOrStore(userID, rate.NewLimiter(rate.Limit(r.requestsPerMinute/60), r.requestsPerMinute))
	limiter := limiterI.(*rate.Limiter)

	if !limiter.Allow() {
		return fmt.Errorf("rate limit exceeded for user %s", userID)
	}

	return nil
}

// CheckTokenQuota checks if a user has enough tokens remaining
func (r *RateLimiter) CheckTokenQuota(ctx context.Context, userID uuid.UUID, tokens int64) error {
	quotaI, _ := r.tokenQuotas.LoadOrStore(userID, &TokenQuota{
		lastReset:  time.Now().UTC(),
		dailyLimit: r.tokensPerDay,
	})
	quota := quotaI.(*TokenQuota)

	quota.mu.Lock()
	defer quota.mu.Unlock()

	// Reset quota if a day has passed
	now := time.Now().UTC()
	if now.Sub(quota.lastReset) >= 24*time.Hour {
		quota.tokensUsed = 0
		quota.lastReset = now
	}

	// Check if adding these tokens would exceed the quota
	if quota.tokensUsed+tokens > quota.dailyLimit {
		return fmt.Errorf("token quota exceeded for user %s", userID)
	}

	return nil
}

// RecordTokenUsage records token usage for a user
func (r *RateLimiter) RecordTokenUsage(ctx context.Context, userID uuid.UUID, tokens int64) {
	quotaI, _ := r.tokenQuotas.LoadOrStore(userID, &TokenQuota{
		lastReset:  time.Now().UTC(),
		dailyLimit: r.tokensPerDay,
	})
	quota := quotaI.(*TokenQuota)

	quota.mu.Lock()
	defer quota.mu.Unlock()

	quota.tokensUsed += tokens
}

// GetRemainingTokens returns the number of tokens remaining for a user
func (r *RateLimiter) GetRemainingTokens(ctx context.Context, userID uuid.UUID) int64 {
	quotaI, ok := r.tokenQuotas.Load(userID)
	if !ok {
		return r.tokensPerDay
	}
	quota := quotaI.(*TokenQuota)

	quota.mu.Lock()
	defer quota.mu.Unlock()

	// Reset quota if a day has passed
	now := time.Now().UTC()
	if now.Sub(quota.lastReset) >= 24*time.Hour {
		quota.tokensUsed = 0
		quota.lastReset = now
		return r.tokensPerDay
	}

	return r.tokensPerDay - quota.tokensUsed
}

// AllowProviderRequest checks if a request can be made to an AI provider
func (r *RateLimiter) AllowProviderRequest(ctx context.Context, provider string) error {
	var limiter *rate.Limiter
	switch provider {
	case "openai":
		limiter = r.openAILimiter
	case "anthropic":
		limiter = r.anthropicLimiter
	default:
		return fmt.Errorf("unknown provider: %s", provider)
	}

	if !limiter.Allow() {
		return fmt.Errorf("rate limit exceeded for provider %s", provider)
	}

	return nil
}

// GetUserQuota returns the token quota for a user
func (r *RateLimiter) GetUserQuota(ctx context.Context, userID uuid.UUID) *TokenQuota {
	quotaI, _ := r.tokenQuotas.LoadOrStore(userID, &TokenQuota{
		lastReset:  time.Now().UTC(),
		dailyLimit: r.tokensPerDay,
	})
	return quotaI.(*TokenQuota)
}

// ResetQuota resets a user's token quota
func (r *RateLimiter) ResetQuota(ctx context.Context, userID uuid.UUID) {
	quotaI, ok := r.tokenQuotas.Load(userID)
	if !ok {
		return
	}
	quota := quotaI.(*TokenQuota)

	quota.mu.Lock()
	defer quota.mu.Unlock()

	quota.tokensUsed = 0
	quota.lastReset = time.Now().UTC()
}

// GetDailyTokenLimit returns the daily token limit
func (r *RateLimiter) GetDailyTokenLimit() int64 {
	return r.tokensPerDay
} 