package repository

import (
	"errors"
	"fmt"
)

// Entity-specific errors
var (
	// Base error for entity not found
	errEntityNotFound = errors.New("entity not found")

	// Specific entity errors
	ErrModelNotFound       = fmt.Errorf("%w: model", errEntityNotFound)
	ErrPromptNotFound      = fmt.Errorf("%w: prompt template", errEntityNotFound)
	ErrInteractionNotFound = fmt.Errorf("%w: interaction", errEntityNotFound)
	ErrGenerationNotFound  = fmt.Errorf("%w: generation", errEntityNotFound)
	ErrFeedbackNotFound    = fmt.Errorf("%w: feedback", errEntityNotFound)
)

// IsEntityNotFoundError checks if an error is an entity not found error
func IsEntityNotFoundError(err error) bool {
	return errors.Is(err, errEntityNotFound)
} 