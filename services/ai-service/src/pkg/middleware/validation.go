package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"reflect"
	"sync"

	"github.com/QuizApp/QuizApp/services/ai-service/src/pkg/api"
	"github.com/go-playground/validator/v10"
	"go.uber.org/zap"
)

var (
	validate *validator.Validate
	once     sync.Once
)

// getValidator returns a singleton validator instance
func getValidator() *validator.Validate {
	once.Do(func() {
		validate = validator.New()
	})
	return validate
}

// ValidateRequest is a middleware that validates request bodies against a model
func ValidateRequest(model interface{}, logger *zap.Logger) func(http.Handler) http.Handler {
	t := reflect.TypeOf(model)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Create a new instance of the model
			val := reflect.New(t).Interface()

			// Decode request body
			if err := json.NewDecoder(r.Body).Decode(val); err != nil {
				logger.Error("Failed to decode request body", zap.Error(err))
				writeError(w, api.NewErrorResponse(
					api.ErrCodeInvalidRequest,
					"Invalid request body",
					nil,
				))
				return
			}

			// Validate the model
			if errors := api.Validate(getValidator(), val); len(errors) > 0 {
				logger.Error("Request validation failed", zap.Any("errors", errors))
				writeError(w, api.NewErrorResponse(
					api.ErrCodeValidation,
					"Validation failed",
					errors,
				))
				return
			}

			// Store validated model in request context
			ctx := r.Context()
			ctx = context.WithValue(ctx, "validated_request", val)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// writeError writes an error response to the response writer
func writeError(w http.ResponseWriter, err *api.ErrorResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(getStatusCode(err.Code))
	json.NewEncoder(w).Encode(err)
}

// getStatusCode maps error codes to HTTP status codes
func getStatusCode(code string) int {
	switch code {
	case api.ErrCodeValidation, api.ErrCodeInvalidRequest:
		return http.StatusBadRequest
	case api.ErrCodeNotFound:
		return http.StatusNotFound
	default:
		return http.StatusInternalServerError
	}
} 