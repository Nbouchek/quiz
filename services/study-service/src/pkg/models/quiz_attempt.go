package models

import (
	"time"

	"github.com/google/uuid"
)

// AttemptStatus represents the status of a quiz attempt
type AttemptStatus string

const (
	AttemptStatusInProgress AttemptStatus = "in_progress"
	AttemptStatusCompleted  AttemptStatus = "completed"
	AttemptStatusAbandoned  AttemptStatus = "abandoned"
)

// QuizAttempt represents a user's attempt at a quiz
type QuizAttempt struct {
	ID            uuid.UUID     `json:"id"`
	UserID        uuid.UUID     `json:"userId"`
	QuizID        uuid.UUID     `json:"quizId"`
	Status        AttemptStatus `json:"status"`
	Score         float64       `json:"score"`
	StartedAt     time.Time     `json:"startedAt"`
	CompletedAt   *time.Time    `json:"completedAt,omitempty"`
	Answers       []Answer      `json:"answers,omitempty"`
	TotalQuestions int          `json:"totalQuestions"`
	CorrectAnswers int          `json:"correctAnswers"`
	CreatedAt     time.Time     `json:"createdAt"`
	UpdatedAt     time.Time     `json:"updatedAt"`
}

// Answer represents a user's answer to a quiz question
type Answer struct {
	ID         uuid.UUID `json:"id"`
	AttemptID  uuid.UUID `json:"attemptId"`
	QuestionID uuid.UUID `json:"questionId"`
	Answer     string    `json:"answer"`
	IsCorrect  bool      `json:"isCorrect"`
	CreatedAt  time.Time `json:"createdAt"`
}

// NewQuizAttempt creates a new quiz attempt
func NewQuizAttempt(userID, quizID uuid.UUID, totalQuestions int) *QuizAttempt {
	now := time.Now().UTC()
	return &QuizAttempt{
		ID:             uuid.New(),
		UserID:         userID,
		QuizID:         quizID,
		Status:         AttemptStatusInProgress,
		Score:          0,
		StartedAt:      now,
		TotalQuestions: totalQuestions,
		CorrectAnswers: 0,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

// Submit submits an answer for the quiz attempt
func (qa *QuizAttempt) Submit(questionID uuid.UUID, answer string, isCorrect bool) Answer {
	now := time.Now().UTC()
	ans := Answer{
		ID:         uuid.New(),
		AttemptID:  qa.ID,
		QuestionID: questionID,
		Answer:     answer,
		IsCorrect:  isCorrect,
		CreatedAt:  now,
	}
	qa.Answers = append(qa.Answers, ans)
	if isCorrect {
		qa.CorrectAnswers++
	}
	qa.UpdatedAt = now
	return ans
}

// Complete completes the quiz attempt and calculates the final score
func (qa *QuizAttempt) Complete() {
	now := time.Now().UTC()
	qa.Status = AttemptStatusCompleted
	qa.CompletedAt = &now
	qa.Score = float64(qa.CorrectAnswers) / float64(qa.TotalQuestions) * 100
	qa.UpdatedAt = now
}

// Abandon abandons the quiz attempt
func (qa *QuizAttempt) Abandon() {
	now := time.Now().UTC()
	qa.Status = AttemptStatusAbandoned
	qa.CompletedAt = &now
	qa.UpdatedAt = now
} 