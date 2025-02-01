package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// Request latency metrics
	RequestLatency = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name: "ai_request_duration_seconds",
		Help: "Time taken to process AI requests",
		Buckets: []float64{0.1, 0.5, 1, 2, 5, 10, 30},
	}, []string{"operation", "model", "status"})

	// Success/failure counters
	RequestTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "ai_requests_total",
		Help: "Total number of AI requests",
	}, []string{"operation", "model", "status"})

	// Error counters by type
	ErrorTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "ai_errors_total",
		Help: "Total number of errors by type",
	}, []string{"operation", "model", "error_type"})

	// Token usage metrics
	TokensUsed = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "ai_tokens_total",
		Help: "Total number of tokens used by AI models",
	}, []string{"model", "type"}) // type: prompt, completion

	// Token cost metrics (in USD)
	TokenCost = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "ai_token_cost_usd",
		Help: "Total cost of tokens used in USD",
	}, []string{"model", "type"})

	// Generation metrics
	GenerationsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "ai_generations_total",
		Help: "Total number of content generations",
	}, []string{"model", "prompt_type", "status"})

	// Generation latency by type
	GenerationLatency = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name: "ai_generation_duration_seconds",
		Help: "Time taken for content generation by type",
		Buckets: []float64{0.5, 1, 2, 5, 10, 20, 30},
	}, []string{"model", "prompt_type"})

	// Feedback metrics
	FeedbackScores = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name: "ai_feedback_scores",
		Help: "Distribution of feedback scores",
		Buckets: []float64{1, 2, 3, 4, 5},
	}, []string{"model"})

	// Active requests gauge
	ActiveRequests = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "ai_active_requests",
		Help: "Number of currently active AI requests",
	}, []string{"operation"})

	// Queue depth gauge
	QueueDepth = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "ai_queue_depth",
		Help: "Number of requests waiting in queue",
	}, []string{"operation"})

	// Rate limit metrics
	RateLimitHits = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "ai_rate_limit_hits_total",
		Help: "Number of times rate limits were hit",
	}, []string{"model", "limit_type"})
)

// RecordRequestDuration records the duration of a request
func RecordRequestDuration(operation, model, status string, duration float64) {
	RequestLatency.WithLabelValues(operation, model, status).Observe(duration)
}

// IncrementRequestCount increments the request counter
func IncrementRequestCount(operation, model, status string) {
	RequestTotal.WithLabelValues(operation, model, status).Inc()
}

// RecordError increments the error counter for a specific type
func RecordError(operation, model, errorType string) {
	ErrorTotal.WithLabelValues(operation, model, errorType).Inc()
}

// AddTokens adds to the token usage counter
func AddTokens(model, tokenType string, count int64) {
	TokensUsed.WithLabelValues(model, tokenType).Add(float64(count))
}

// RecordTokenCost records the cost of tokens used
func RecordTokenCost(model, tokenType string, costUSD float64) {
	TokenCost.WithLabelValues(model, tokenType).Add(costUSD)
}

// IncrementGenerations increments the generation counter
func IncrementGenerations(model, promptType, status string) {
	GenerationsTotal.WithLabelValues(model, promptType, status).Inc()
}

// RecordGenerationLatency records the time taken for content generation
func RecordGenerationLatency(model, promptType string, duration float64) {
	GenerationLatency.WithLabelValues(model, promptType).Observe(duration)
}

// RecordFeedbackScore records a feedback score
func RecordFeedbackScore(model string, score float64) {
	FeedbackScores.WithLabelValues(model).Observe(score)
}

// IncreaseActiveRequests increases the active requests gauge
func IncreaseActiveRequests(operation string) {
	ActiveRequests.WithLabelValues(operation).Inc()
}

// DecreaseActiveRequests decreases the active requests gauge
func DecreaseActiveRequests(operation string) {
	ActiveRequests.WithLabelValues(operation).Dec()
}

// SetQueueDepth sets the current queue depth
func SetQueueDepth(operation string, depth float64) {
	QueueDepth.WithLabelValues(operation).Set(depth)
}

// RecordRateLimit records a rate limit hit
func RecordRateLimit(model, limitType string) {
	RateLimitHits.WithLabelValues(model, limitType).Inc()
} 