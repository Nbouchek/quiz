package repository

import (
	"context"

	"github.com/QuizApp/content-service/src/pkg/models"
	"github.com/google/uuid"
)

// ContentRepository defines the interface for quiz-related data operations
type ContentRepository interface {
	// Quiz operations
	CreateQuiz(ctx context.Context, quiz *models.Quiz) error
	GetQuiz(ctx context.Context, id uuid.UUID) (*models.Quiz, error)
	UpdateQuiz(ctx context.Context, quiz *models.Quiz) error
	DeleteQuiz(ctx context.Context, id uuid.UUID) error
	ListQuizzes(ctx context.Context, limit, offset int) ([]*models.Quiz, error)
	ListUserQuizzes(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*models.Quiz, error)
	SearchQuizzes(ctx context.Context, query string, limit, offset int) ([]*models.Quiz, error)

	// Question operations
	AddQuestion(ctx context.Context, question *models.Question) error
	GetQuestion(ctx context.Context, id uuid.UUID) (*models.Question, error)
	UpdateQuestion(ctx context.Context, question *models.Question) error
	DeleteQuestion(ctx context.Context, id uuid.UUID) error
	ListQuizQuestions(ctx context.Context, quizID uuid.UUID) ([]*models.Question, error)
} 