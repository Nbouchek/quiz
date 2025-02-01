package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/lib/pq"
)

// Error categories
var (
	// Database errors
	ErrNotFound           = errors.New("resource not found")
	ErrDatabaseConnection = errors.New("database connection error")
	ErrDatabaseTimeout    = errors.New("database timeout")
	ErrDatabaseConflict   = errors.New("database conflict")
	ErrDatabaseConstraint = errors.New("database constraint violation")
)

// IsRetryableError checks if an error is retryable
func IsRetryableError(err error) bool {
	if err == nil {
		return false
	}

	// Check for PostgreSQL-specific errors
	if pqErr, ok := err.(*pq.Error); ok {
		switch pqErr.Code {
		case "40001", // serialization_failure
			"40P01", // deadlock_detected
			"55P03", // lock_not_available
			"08006", // connection_failure
			"08001", // sqlclient_unable_to_establish_sqlconnection
			"08004", // sqlserver_rejected_establishment_of_sqlconnection
			"57P01", // admin_shutdown
			"57P02", // crash_shutdown
			"57P03": // cannot_connect_now
			return true
		}
	}

	// Check for context errors
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
		return true
	}

	return false
}

// RetryableFunc represents a function that can be retried
type RetryableFunc func() error

// WithRetry executes a function with retries
func WithRetry(ctx context.Context, fn RetryableFunc, maxAttempts int, baseDelay time.Duration) error {
	var lastErr error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		select {
		case <-ctx.Done():
			return fmt.Errorf("operation cancelled: %w", ctx.Err())
		default:
			if err := fn(); err != nil {
				lastErr = err
				if !IsRetryableError(err) {
					return err // Non-retryable error
				}
				if attempt == maxAttempts {
					return fmt.Errorf("max retry attempts reached: %w", err)
				}
				// Exponential backoff with jitter
				delay := baseDelay * time.Duration(1<<uint(attempt-1))
				time.Sleep(delay)
				continue
			}
			return nil // Success
		}
	}
	return lastErr
}

// CategorizeError categorizes a database error
func CategorizeError(err error) error {
	if err == nil {
		return nil
	}

	if err == sql.ErrNoRows {
		return ErrNotFound
	}

	if pqErr, ok := err.(*pq.Error); ok {
		switch pqErr.Code {
		case "23505": // unique_violation
			return ErrDatabaseConflict
		case "23503": // foreign_key_violation
			return ErrDatabaseConstraint
		case "57014": // query_canceled
			return ErrDatabaseTimeout
		}
	}

	if errors.Is(err, context.DeadlineExceeded) {
		return ErrDatabaseTimeout
	}

	return err
} 