package repository

import (
	"errors"
	"testing"
)

func TestIsEntityNotFoundError(t *testing.T) {
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
			name: "model not found",
			err:  ErrModelNotFound,
			want: true,
		},
		{
			name: "prompt not found",
			err:  ErrPromptNotFound,
			want: true,
		},
		{
			name: "interaction not found",
			err:  ErrInteractionNotFound,
			want: true,
		},
		{
			name: "generation not found",
			err:  ErrGenerationNotFound,
			want: true,
		},
		{
			name: "feedback not found",
			err:  ErrFeedbackNotFound,
			want: true,
		},
		{
			name: "other error",
			err:  errors.New("some other error"),
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsEntityNotFoundError(tt.err); got != tt.want {
				t.Errorf("IsEntityNotFoundError() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestErrorWrapping(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		wantType string
	}{
		{
			name:     "model not found",
			err:      ErrModelNotFound,
			wantType: "model",
		},
		{
			name:     "prompt not found",
			err:      ErrPromptNotFound,
			wantType: "prompt template",
		},
		{
			name:     "interaction not found",
			err:      ErrInteractionNotFound,
			wantType: "interaction",
		},
		{
			name:     "generation not found",
			err:      ErrGenerationNotFound,
			wantType: "generation",
		},
		{
			name:     "feedback not found",
			err:      ErrFeedbackNotFound,
			wantType: "feedback",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !errors.Is(tt.err, errEntityNotFound) {
				t.Errorf("%v should wrap errEntityNotFound", tt.name)
			}

			if tt.err.Error() != "entity not found: "+tt.wantType {
				t.Errorf("error message = %q, want %q", tt.err.Error(), "entity not found: "+tt.wantType)
			}
		})
	}
} 