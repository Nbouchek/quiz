package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"text/template"
	"time"

	"QuizApp/services/ai-service/src/pkg/config"
	"QuizApp/services/ai-service/src/pkg/metrics"
	"QuizApp/services/ai-service/src/pkg/models"
)

const (
	anthropicEndpoint = "https://api.anthropic.com/v1/messages"
	anthropicAPIVersion = "2023-06-01"
)

// AnthropicService handles Anthropic-specific operations
type AnthropicService struct {
	config *config.Config
	client *http.Client
}

// NewAnthropicService creates a new Anthropic service
func NewAnthropicService(cfg *config.Config) *AnthropicService {
	return &AnthropicService{
		config: cfg,
		client: &http.Client{
			Timeout: time.Duration(cfg.AI.Timeout) * time.Second,
		},
	}
}

type anthropicRequest struct {
	Model       string            `json:"model"`
	Messages    []anthropicMessage `json:"messages"`
	MaxTokens   int               `json:"max_tokens"`
	Temperature float64           `json:"temperature"`
}

type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type anthropicResponse struct {
	ID      string `json:"id"`
	Type    string `json:"type"`
	Role    string `json:"role"`
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	Model   string `json:"model"`
	Usage   struct {
		InputTokens     int `json:"input_tokens"`
		OutputTokens    int `json:"output_tokens"`
		TotalTokens     int `json:"total_tokens"`
	} `json:"usage"`
}

// GenerateContent generates content using Anthropic's API
func (s *AnthropicService) GenerateContent(ctx context.Context, model *models.AIModel, prompt *models.PromptTemplate, params map[string]string) (string, int64, error) {
	metrics.IncreaseActiveRequests("anthropic_api")
	defer metrics.DecreaseActiveRequests("anthropic_api")

	startTime := time.Now()

	// Parse template
	promptText, err := s.parseTemplate(prompt.TemplateText, params)
	if err != nil {
		metrics.IncrementRequestCount("anthropic_api", model.Name, "error")
		metrics.RecordError("anthropic_api", model.Name, "template_error")
		return "", 0, fmt.Errorf("failed to parse template: %w", err)
	}

	// Prepare request
	req := anthropicRequest{
		Model: model.Name,
		Messages: []anthropicMessage{
			{
				Role:    "user",
				Content: promptText,
			},
		},
		MaxTokens:   s.config.AI.MaxTokens,
		Temperature: s.config.AI.Temperature,
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		metrics.IncrementRequestCount("anthropic_api", model.Name, "error")
		metrics.RecordError("anthropic_api", model.Name, "request_marshal_error")
		return "", 0, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", anthropicEndpoint, bytes.NewBuffer(reqBody))
	if err != nil {
		metrics.IncrementRequestCount("anthropic_api", model.Name, "error")
		metrics.RecordError("anthropic_api", model.Name, "request_creation_error")
		return "", 0, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Api-Key", s.config.AI.AnthropicKey)
	httpReq.Header.Set("Anthropic-Version", anthropicAPIVersion)

	// Send request
	resp, err := s.client.Do(httpReq)
	if err != nil {
		metrics.IncrementRequestCount("anthropic_api", model.Name, "error")
		metrics.RecordError("anthropic_api", model.Name, "request_send_error")
		return "", 0, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		metrics.IncrementRequestCount("anthropic_api", model.Name, "error")
		metrics.RecordError("anthropic_api", model.Name, "response_read_error")
		return "", 0, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode == http.StatusTooManyRequests {
		metrics.RecordRateLimit(model.Name, "requests_per_minute")
		metrics.IncrementRequestCount("anthropic_api", model.Name, "rate_limited")
		return "", 0, fmt.Errorf("rate limit exceeded: %s", string(body))
	}

	if resp.StatusCode != http.StatusOK {
		metrics.IncrementRequestCount("anthropic_api", model.Name, "error")
		metrics.RecordError("anthropic_api", model.Name, fmt.Sprintf("api_error_%d", resp.StatusCode))
		return "", 0, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var anthropicResp anthropicResponse
	if err := json.Unmarshal(body, &anthropicResp); err != nil {
		metrics.IncrementRequestCount("anthropic_api", model.Name, "error")
		metrics.RecordError("anthropic_api", model.Name, "response_parse_error")
		return "", 0, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(anthropicResp.Content) == 0 {
		metrics.IncrementRequestCount("anthropic_api", model.Name, "error")
		metrics.RecordError("anthropic_api", model.Name, "no_content_error")
		return "", 0, fmt.Errorf("no content generated")
	}

	// Record metrics
	duration := time.Since(startTime).Seconds()
	metrics.RecordRequestDuration("anthropic_api", model.Name, "success", duration)
	metrics.RecordGenerationLatency(model.Name, prompt.Category, duration)
	metrics.IncrementRequestCount("anthropic_api", model.Name, "success")
	metrics.AddTokens(model.Name, "prompt", int64(anthropicResp.Usage.InputTokens))
	metrics.AddTokens(model.Name, "completion", int64(anthropicResp.Usage.OutputTokens))

	// Calculate and record token costs (example rates, adjust as needed)
	var costPerToken float64
	switch model.Name {
	case "claude-2":
		costPerToken = 0.000011 // $0.011 per 1K tokens
	case "claude-instant-1":
		costPerToken = 0.000001 // $0.001 per 1K tokens
	default:
		costPerToken = 0.000011 // default to claude-2 rate
	}

	promptCost := float64(anthropicResp.Usage.InputTokens) * costPerToken
	completionCost := float64(anthropicResp.Usage.OutputTokens) * costPerToken
	metrics.RecordTokenCost(model.Name, "prompt", promptCost)
	metrics.RecordTokenCost(model.Name, "completion", completionCost)

	return anthropicResp.Content[0].Text, int64(anthropicResp.Usage.TotalTokens), nil
}

// parseTemplate parses and executes a template with the given parameters
func (s *AnthropicService) parseTemplate(templateText string, params map[string]string) (string, error) {
	tmpl, err := template.New("prompt").Parse(templateText)
	if err != nil {
		return "", fmt.Errorf("failed to parse template: %w", err)
	}

	var promptBuf bytes.Buffer
	err = tmpl.Execute(&promptBuf, params)
	if err != nil {
		return "", fmt.Errorf("failed to execute template: %w", err)
	}

	return promptBuf.String(), nil
} 