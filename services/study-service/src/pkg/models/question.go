package models

import (
	"time"

	"github.com/google/uuid"
)

// QuestionType represents the type of question
type QuestionType string

const (
	QuestionTypeMultipleChoice QuestionType = "multiple_choice"
	QuestionTypeTrueFalse      QuestionType = "true_false"
	QuestionTypeOpenEnded      QuestionType = "open_ended"
)

// Question represents a quiz question
type Question struct {
	ID            uuid.UUID    `json:"id"`
	QuizID        uuid.UUID    `json:"quiz_id"`
	Text          string       `json:"text"`
	Type          QuestionType `json:"type"`
	Options       []string     `json:"options"`
	CorrectAnswer string       `json:"correct_answer,omitempty"`
	Explanation   string       `json:"explanation,omitempty"`
	CreatedAt     time.Time    `json:"created_at"`
	UpdatedAt     time.Time    `json:"updated_at"`
} 