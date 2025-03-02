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

// QuizAttempt represents a quiz attempt
type QuizAttempt struct {
	ID                  uuid.UUID     `json:"id"`
	UserID             uuid.UUID     `json:"userId"`
	QuizID             uuid.UUID     `json:"quizId"`
	Status             AttemptStatus `json:"status"`
	CurrentQuestionIndex int         `json:"currentQuestionIndex"`
	TotalQuestions     int          `json:"totalQuestions"`
	Score              float64       `json:"score"`
	StartedAt          time.Time     `json:"startedAt"`
	CompletedAt        *time.Time    `json:"completedAt,omitempty"`
	CreatedAt          time.Time     `json:"createdAt"`
	UpdatedAt          time.Time     `json:"updatedAt"`
	Answers            []Answer      `json:"answers,omitempty"`
}

// Answer represents an answer to a quiz question
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
		ID:                  uuid.New(),
		UserID:             userID,
		QuizID:             quizID,
		Status:             AttemptStatusInProgress,
		CurrentQuestionIndex: 0,
		TotalQuestions:     totalQuestions,
		Score:              0,
		StartedAt:          now,
		CreatedAt:          now,
		UpdatedAt:          now,
	}
}

// Submit adds an answer to the quiz attempt
func (a *QuizAttempt) Submit(questionID uuid.UUID, answer string, isCorrect bool) Answer {
	now := time.Now().UTC()
	newAnswer := Answer{
		ID:         uuid.New(),
		AttemptID:  a.ID,
		QuestionID: questionID,
		Answer:     answer,
		IsCorrect:  isCorrect,
		CreatedAt:  now,
	}

	a.Answers = append(a.Answers, newAnswer)
	a.CurrentQuestionIndex++
	a.UpdatedAt = now

	// Update score
	correctAnswers := 0
	for _, ans := range a.Answers {
		if ans.IsCorrect {
			correctAnswers++
		}
	}
	a.Score = float64(correctAnswers) / float64(a.TotalQuestions) * 100

	return newAnswer
}

// Complete marks the quiz attempt as completed
func (a *QuizAttempt) Complete() {
	now := time.Now().UTC()
	a.Status = AttemptStatusCompleted
	a.CompletedAt = &now
	a.UpdatedAt = now
}

// Abandon marks the quiz attempt as abandoned
func (a *QuizAttempt) Abandon() {
	now := time.Now().UTC()
	a.Status = AttemptStatusAbandoned
	a.CompletedAt = &now
	a.UpdatedAt = now
} 