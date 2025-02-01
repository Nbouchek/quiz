package repository

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"github.com/lib/pq"
	"github.com/stretchr/testify/assert"
)

func TestIsRetryableError(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want bool
	}{
		{
			name: "nil error",
			err:  nil,
			want: false,
		},
		{
			name: "serialization failure",
			err:  &pq.Error{Code: "40001"},
			want: true,
		},
		{
			name: "deadlock detected",
			err:  &pq.Error{Code: "40P01"},
			want: true,
		},
		{
			name: "connection failure",
			err:  &pq.Error{Code: "08006"},
			want: true,
		},
		{
			name: "context deadline exceeded",
			err:  context.DeadlineExceeded,
			want: true,
		},
		{
			name: "context canceled",
			err:  context.Canceled,
			want: true,
		},
		{
			name: "non-retryable error",
			err:  errors.New("random error"),
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsRetryableError(tt.err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestWithRetry(t *testing.T) {
	t.Run("successful execution", func(t *testing.T) {
		attempts := 0
		fn := func() error {
			attempts++
			return nil
		}

		err := WithRetry(context.Background(), fn, 3, time.Millisecond)
		assert.NoError(t, err)
		assert.Equal(t, 1, attempts, "should succeed on first attempt")
	})

	t.Run("retry until success", func(t *testing.T) {
		attempts := 0
		fn := func() error {
			attempts++
			if attempts < 2 {
				return &pq.Error{Code: "40001"} // retryable error
			}
			return nil
		}

		err := WithRetry(context.Background(), fn, 3, time.Millisecond)
		assert.NoError(t, err)
		assert.Equal(t, 2, attempts, "should succeed on second attempt")
	})

	t.Run("non-retryable error", func(t *testing.T) {
		attempts := 0
		expectedErr := errors.New("non-retryable error")
		fn := func() error {
			attempts++
			return expectedErr
		}

		err := WithRetry(context.Background(), fn, 3, time.Millisecond)
		assert.Error(t, err)
		assert.Equal(t, expectedErr, err)
		assert.Equal(t, 1, attempts, "should not retry on non-retryable error")
	})

	t.Run("max attempts exceeded", func(t *testing.T) {
		attempts := 0
		fn := func() error {
			attempts++
			return &pq.Error{Code: "40001"} // retryable error
		}

		err := WithRetry(context.Background(), fn, 3, time.Millisecond)
		assert.Error(t, err)
		assert.Equal(t, 3, attempts, "should try exactly max attempts times")
	})

	t.Run("context canceled", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // cancel immediately

		attempts := 0
		fn := func() error {
			attempts++
			return nil
		}

		err := WithRetry(ctx, fn, 3, time.Millisecond)
		assert.Error(t, err)
		assert.True(t, errors.Is(err, context.Canceled))
		assert.Equal(t, 0, attempts, "should not attempt when context is canceled")
	})
}

func TestCategorizeError(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want error
	}{
		{
			name: "nil error",
			err:  nil,
			want: nil,
		},
		{
			name: "not found error",
			err:  sql.ErrNoRows,
			want: ErrNotFound,
		},
		{
			name: "unique violation",
			err:  &pq.Error{Code: "23505"},
			want: ErrDatabaseConflict,
		},
		{
			name: "foreign key violation",
			err:  &pq.Error{Code: "23503"},
			want: ErrDatabaseConstraint,
		},
		{
			name: "query canceled",
			err:  &pq.Error{Code: "57014"},
			want: ErrDatabaseTimeout,
		},
		{
			name: "context deadline exceeded",
			err:  context.DeadlineExceeded,
			want: ErrDatabaseTimeout,
		},
		{
			name: "unknown error",
			err:  errors.New("unknown error"),
			want: errors.New("unknown error"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CategorizeError(tt.err)
			if tt.want == nil {
				assert.NoError(t, got)
			} else {
				assert.Equal(t, tt.want.Error(), got.Error())
			}
		})
	}
} 