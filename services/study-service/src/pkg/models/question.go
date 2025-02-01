package models

import (
	"time"

	"github.com/google/uuid"
)

// Question represents a quiz question
type Question struct {
	ID        uuid.UUID `json:"id"`
	QuizID    uuid.UUID `json:"quiz_id"`
	Question  string    `json:"question"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
} 