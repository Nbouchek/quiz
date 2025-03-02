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
	openAIEndpoint = "https://api.openai.com/v1/chat/completions"
	openAIAPIVersion = "2024-02-01"
)

// OpenAIService handles OpenAI-specific operations
type OpenAIService struct {
	config *config.Config
	client *http.Client
}

// NewOpenAIService creates a new OpenAI service
func NewOpenAIService(cfg *config.Config) *OpenAIService {
	return &OpenAIService{
		config: cfg,
		client: &http.Client{
			Timeout: time.Duration(cfg.AI.Timeout) * time.Second,
		},
	}
}

type openAIRequest struct {
	Model       string         `json:"model"`
	Messages    []openAIMessage `json:"messages"`
	Temperature float64        `json:"temperature"`
	MaxTokens   int           `json:"max_tokens"`
}

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Model   string `json:"model"`
	Usage   struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
	Choices []struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
}

// GenerateContent generates content using OpenAI's API
func (s *OpenAIService) GenerateContent(ctx context.Context, model *models.AIModel, prompt *models.PromptTemplate, params map[string]string) (string, int64, error) {
	metrics.IncreaseActiveRequests("openai_api")
	defer metrics.DecreaseActiveRequests("openai_api")

	startTime := time.Now()

	// Parse template
	parsedPrompt, err := s.parseTemplate(prompt.TemplateText, params)
	if err != nil {
		metrics.IncrementRequestCount("openai_api", model.Name, "error")
		metrics.RecordError("openai_api", model.Name, "template_error")
		return "", 0, fmt.Errorf("failed to parse template: %w", err)
	}

	// Prepare request
	messages := []openAIMessage{
		{
			Role:    "system",
			Content: "You are a helpful AI assistant specialized in education and quiz generation.",
		},
		{
			Role:    "user",
			Content: parsedPrompt,
		},
	}

	reqBody := openAIRequest{
		Model:       model.Name,
		Messages:    messages,
		MaxTokens:   s.config.AI.MaxTokens,
		Temperature: s.config.AI.Temperature,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		metrics.IncrementRequestCount("openai_api", model.Name, "error")
		metrics.RecordError("openai_api", model.Name, "request_marshal_error")
		return "", 0, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openAIEndpoint, bytes.NewBuffer(jsonBody))
	if err != nil {
		metrics.IncrementRequestCount("openai_api", model.Name, "error")
		metrics.RecordError("openai_api", model.Name, "request_creation_error")
		return "", 0, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.config.AI.OpenAIKey))
	req.Header.Set("OpenAI-Version", openAIAPIVersion)

	// Send request
	resp, err := s.client.Do(req)
	if err != nil {
		metrics.IncrementRequestCount("openai_api", model.Name, "error")
		metrics.RecordError("openai_api", model.Name, "request_send_error")
		return "", 0, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		metrics.IncrementRequestCount("openai_api", model.Name, "error")
		metrics.RecordError("openai_api", model.Name, "response_read_error")
		return "", 0, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode == http.StatusTooManyRequests {
		metrics.RecordRateLimit(model.Name, "requests_per_minute")
		metrics.IncrementRequestCount("openai_api", model.Name, "rate_limited")
		return "", 0, fmt.Errorf("rate limit exceeded: %s", string(body))
	}

	if resp.StatusCode != http.StatusOK {
		metrics.IncrementRequestCount("openai_api", model.Name, "error")
		metrics.RecordError("openai_api", model.Name, fmt.Sprintf("api_error_%d", resp.StatusCode))
		return "", 0, fmt.Errorf("OpenAI API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var openAIResp openAIResponse
	if err := json.Unmarshal(body, &openAIResp); err != nil {
		metrics.IncrementRequestCount("openai_api", model.Name, "error")
		metrics.RecordError("openai_api", model.Name, "response_parse_error")
		return "", 0, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(openAIResp.Choices) == 0 {
		metrics.IncrementRequestCount("openai_api", model.Name, "error")
		metrics.RecordError("openai_api", model.Name, "no_content_error")
		return "", 0, fmt.Errorf("no content generated")
	}

	// Record metrics
	duration := time.Since(startTime).Seconds()
	metrics.RecordRequestDuration("openai_api", model.Name, "success", duration)
	metrics.RecordGenerationLatency(model.Name, prompt.Category, duration)
	metrics.IncrementRequestCount("openai_api", model.Name, "success")
	metrics.AddTokens(model.Name, "prompt", int64(openAIResp.Usage.PromptTokens))
	metrics.AddTokens(model.Name, "completion", int64(openAIResp.Usage.CompletionTokens))

	// Calculate and record token costs (example rates, adjust as needed)
	var costPerToken float64
	switch model.Name {
	case "gpt-4":
		costPerToken = 0.00003 // $0.03 per 1K tokens
	case "gpt-3.5-turbo":
		costPerToken = 0.000002 // $0.002 per 1K tokens
	default:
		costPerToken = 0.000002 // default to gpt-3.5-turbo rate
	}

	promptCost := float64(openAIResp.Usage.PromptTokens) * costPerToken
	completionCost := float64(openAIResp.Usage.CompletionTokens) * costPerToken
	metrics.RecordTokenCost(model.Name, "prompt", promptCost)
	metrics.RecordTokenCost(model.Name, "completion", completionCost)

	return openAIResp.Choices[0].Message.Content, int64(openAIResp.Usage.TotalTokens), nil
}

// parseTemplate parses and executes a template with the given parameters
func (s *OpenAIService) parseTemplate(templateText string, params map[string]string) (string, error) {
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

// Helper functions for parsing config values
func parseFloat(s string) (float64, error) {
	var f float64
	err := json.Unmarshal([]byte(s), &f)
	return f, err
}

func parseInt(s string) (int, error) {
	var i int
	err := json.Unmarshal([]byte(s), &i)
	return i, err
} 