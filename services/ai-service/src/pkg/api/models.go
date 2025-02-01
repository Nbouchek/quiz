package api

import (
	"time"

	"github.com/go-playground/validator/v10"
)

// Request Models

type GenerateContentRequest struct {
	UserID    string            `json:"userId" validate:"required,uuid4"`
	ModelID   string            `json:"modelId" validate:"required,uuid4"`
	PromptID  string            `json:"promptId" validate:"required,uuid4"`
	Params    map[string]string `json:"params" validate:"required,dive,keys,required,endkeys,required"`
}

type SaveFeedbackRequest struct {
	UserID  string `json:"userId" validate:"required,uuid4"`
	Rating  int    `json:"rating" validate:"required,min=1,max=5"`
	Comment string `json:"comment" validate:"required,min=1,max=1000"`
}

// Response Models

type GenerationResponse struct {
	ID              string            `json:"id"`
	UserID          string            `json:"userId"`
	PromptTemplateID string            `json:"promptTemplateId"`
	InputParams     map[string]string `json:"inputParams"`
	GeneratedContent string            `json:"generatedContent"`
	Status          string            `json:"status"`
	ModelUsed       string            `json:"modelUsed"`
	TokensUsed      int64             `json:"tokensUsed"`
	DurationMs      int64             `json:"durationMs"`
	CreatedAt       time.Time         `json:"createdAt"`
}

type UserStatsResponse struct {
	InteractionStats *InteractionStats `json:"interactionStats"`
	LastGenStats     *GenerationStats  `json:"lastGenStats,omitempty"`
}

type InteractionStats struct {
	TotalInteractions int64   `json:"totalInteractions"`
	TotalTokens      int64   `json:"totalTokens"`
	AverageDuration  float64 `json:"averageDuration"`
	ErrorCount       int64   `json:"errorCount"`
}

type GenerationStats struct {
	TotalFeedback    int     `json:"totalFeedback"`
	AverageRating    float64 `json:"averageRating"`
	PositiveRatings  int     `json:"positiveRatings"`
	NegativeRatings  int     `json:"negativeRatings"`
}

// ErrorResponse represents a standardized error response
type ErrorResponse struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// ValidationError represents validation error details
type ValidationError struct {
	Field string `json:"field"`
	Error string `json:"error"`
}

// Error codes
const (
	ErrCodeValidation     = "VALIDATION_ERROR"
	ErrCodeInvalidRequest = "INVALID_REQUEST"
	ErrCodeNotFound       = "NOT_FOUND"
	ErrCodeInternal      = "INTERNAL_ERROR"
)

// NewErrorResponse creates a new error response
func NewErrorResponse(code string, message string, details interface{}) *ErrorResponse {
	return &ErrorResponse{
		Code:    code,
		Message: message,
		Details: details,
	}
}

// Validate validates a request model using the validator
func Validate(v *validator.Validate, model interface{}) []ValidationError {
	var errors []ValidationError

	err := v.Struct(model)
	if err != nil {
		for _, err := range err.(validator.ValidationErrors) {
			errors = append(errors, ValidationError{
				Field: err.Field(),
				Error: getValidationErrorMessage(err),
			})
		}
	}

	return errors
}

// Helper function to get user-friendly validation error messages
func getValidationErrorMessage(err validator.FieldError) string {
	switch err.Tag() {
	case "required":
		return "This field is required"
	case "uuid4":
		return "Must be a valid UUID"
	case "min":
		return "Value is below minimum allowed"
	case "max":
		return "Value exceeds maximum allowed"
	default:
		return "Invalid value"
	}
} 