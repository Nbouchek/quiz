package testutil

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// MockAPIServer represents a mock API server for testing
type MockAPIServer struct {
	*httptest.Server
	t *testing.T
}

// MockResponse represents a mock API response
type MockResponse struct {
	StatusCode int
	Body       interface{}
	Headers    map[string]string
}

// NewMockAPIServer creates a new mock API server
func NewMockAPIServer(t *testing.T, responses map[string]MockResponse) *MockAPIServer {
	t.Helper()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response, ok := responses[r.URL.Path]
		if !ok {
			t.Errorf("unexpected request to path: %s", r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
			return
		}

		// Set response headers
		for key, value := range response.Headers {
			w.Header().Set(key, value)
		}

		// Set status code
		w.WriteHeader(response.StatusCode)

		// Write response body
		if response.Body != nil {
			if err := json.NewEncoder(w).Encode(response.Body); err != nil {
				t.Errorf("failed to encode response body: %v", err)
			}
		}
	}))

	return &MockAPIServer{Server: server, t: t}
}

// OpenAIMockResponses returns common OpenAI API mock responses
func OpenAIMockResponses() map[string]MockResponse {
	return map[string]MockResponse{
		"/v1/chat/completions": {
			StatusCode: http.StatusOK,
			Headers: map[string]string{
				"Content-Type": "application/json",
			},
			Body: map[string]interface{}{
				"id":      "mock-completion-id",
				"object":  "chat.completion",
				"created": 1707123456,
				"model":   "gpt-4",
				"choices": []map[string]interface{}{
					{
						"index": 0,
						"message": map[string]interface{}{
							"role":    "assistant",
							"content": "This is a mock response from the OpenAI API.",
						},
						"finish_reason": "stop",
					},
				},
				"usage": map[string]interface{}{
					"prompt_tokens":     10,
					"completion_tokens": 15,
					"total_tokens":      25,
				},
			},
		},
		"/v1/chat/completions/error": {
			StatusCode: http.StatusTooManyRequests,
			Headers: map[string]string{
				"Content-Type":  "application/json",
				"Retry-After":   "30",
			},
			Body: map[string]interface{}{
				"error": map[string]interface{}{
					"message": "Rate limit exceeded",
					"type":    "rate_limit_error",
					"code":    "rate_limit_exceeded",
				},
			},
		},
	}
}

// AnthropicMockResponses returns common Anthropic API mock responses
func AnthropicMockResponses() map[string]MockResponse {
	return map[string]MockResponse{
		"/v1/messages": {
			StatusCode: http.StatusOK,
			Headers: map[string]string{
				"Content-Type": "application/json",
			},
			Body: map[string]interface{}{
				"id":        "mock-message-id",
				"type":      "message",
				"role":      "assistant",
				"content":   "This is a mock response from the Anthropic API.",
				"model":     "claude-3",
				"stop_reason": "end_turn",
				"usage": map[string]interface{}{
					"input_tokens":  10,
					"output_tokens": 15,
				},
			},
		},
		"/v1/messages/error": {
			StatusCode: http.StatusTooManyRequests,
			Headers: map[string]string{
				"Content-Type":  "application/json",
				"Retry-After":   "60",
			},
			Body: map[string]interface{}{
				"error": map[string]interface{}{
					"type":    "rate_limit_error",
					"message": "Too many requests. Please retry after 60 seconds.",
				},
			},
		},
	}
}

// Close closes the mock API server
func (s *MockAPIServer) Close() {
	s.Server.Close()
}

// URL returns the base URL of the mock API server
func (s *MockAPIServer) URL() string {
	return s.Server.URL
} 