package repository

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
)

var (
	ErrAttemptNotFound = errors.New("quiz attempt not found")
)

// QuizAttempt represents a quiz attempt in the database
type QuizAttempt struct {
	ID                uuid.UUID  `json:"id"`
	UserID            uuid.UUID  `json:"userId"`
	QuizID            uuid.UUID  `json:"quizId"`
	Status            string     `json:"status"`
	TotalQuestions    int        `json:"totalQuestions"`
	CorrectAnswers    int        `json:"correctAnswers"`
	Score             float64    `json:"score"`
	StartedAt         time.Time  `json:"startedAt"`
	CompletedAt       *time.Time `json:"completedAt,omitempty"`
	CreatedAt         time.Time  `json:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt"`
	Answers           []Answer   `json:"answers,omitempty"`
	
	// This field is for application logic only, not stored in DB
	CurrentQuestionIndex int       `json:"currentQuestionIndex"`
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

// Question represents a quiz question from the content service
type Question struct {
	ID            uuid.UUID `json:"id"`
	Text          string    `json:"text"`
	Options       []string  `json:"options"`
	CorrectAnswer string    `json:"correctAnswer"`
	Type          string    `json:"type"`
}

// QuizAttemptRepository defines the interface for quiz attempt operations
type QuizAttemptRepository interface {
	CreateAttempt(ctx context.Context, attempt *QuizAttempt) error
	GetAttempt(ctx context.Context, id uuid.UUID) (*QuizAttempt, error)
	UpdateAttempt(ctx context.Context, attempt *QuizAttempt) error
	ListUserAttempts(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*QuizAttempt, error)
	AddAnswer(ctx context.Context, answer *Answer) error
	GetAttemptAnswers(ctx context.Context, attemptID uuid.UUID) ([]Answer, error)
	GetQuestions(ctx context.Context, quizID uuid.UUID) ([]*Question, error)
}

// PostgresQuizAttemptRepository implements QuizAttemptRepository for PostgreSQL
type PostgresQuizAttemptRepository struct {
	db *sql.DB
}

// NewPostgresQuizAttemptRepository creates a new PostgresQuizAttemptRepository
func NewPostgresQuizAttemptRepository(db *sql.DB) *PostgresQuizAttemptRepository {
	return &PostgresQuizAttemptRepository{db: db}
}

// CreateAttempt creates a new quiz attempt
func (r *PostgresQuizAttemptRepository) CreateAttempt(ctx context.Context, attempt *QuizAttempt) error {
	query := `
		INSERT INTO quiz_attempts (
			id, user_id, quiz_id, status, total_questions,
			correct_answers, score, started_at, completed_at, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`

	_, err := r.db.ExecContext(ctx, query,
		attempt.ID, attempt.UserID, attempt.QuizID, attempt.Status,
		attempt.TotalQuestions, attempt.CorrectAnswers, attempt.Score,
		attempt.StartedAt, attempt.CompletedAt, attempt.CreatedAt, attempt.UpdatedAt,
	)
	return err
}

// GetAttempt retrieves a quiz attempt by ID
func (r *PostgresQuizAttemptRepository) GetAttempt(ctx context.Context, id uuid.UUID) (*QuizAttempt, error) {
	query := `
		SELECT id, user_id, quiz_id, status, total_questions,
			correct_answers, score, started_at, completed_at, created_at, updated_at
		FROM quiz_attempts WHERE id = $1`

	attempt := &QuizAttempt{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&attempt.ID, &attempt.UserID, &attempt.QuizID, &attempt.Status,
		&attempt.TotalQuestions, &attempt.CorrectAnswers, &attempt.Score,
		&attempt.StartedAt, &attempt.CompletedAt, &attempt.CreatedAt, &attempt.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrAttemptNotFound
	}
	if err != nil {
		return nil, err
	}

	// Get answers for this attempt
	answers, err := r.GetAttemptAnswers(ctx, id)
	if err != nil {
		return nil, err
	}
	attempt.Answers = answers

	// Set the current question index based on the number of answers (application logic)
	attempt.CurrentQuestionIndex = len(answers)

	return attempt, nil
}

// UpdateAttempt updates an existing quiz attempt
func (r *PostgresQuizAttemptRepository) UpdateAttempt(ctx context.Context, attempt *QuizAttempt) error {
	query := `
		UPDATE quiz_attempts
		SET status = $1, correct_answers = $2, score = $3,
			completed_at = $4, updated_at = $5
		WHERE id = $6`

	result, err := r.db.ExecContext(ctx, query,
		attempt.Status, attempt.CorrectAnswers, attempt.Score,
		attempt.CompletedAt, attempt.UpdatedAt, attempt.ID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrAttemptNotFound
	}
	return nil
}

// ListUserAttempts lists all quiz attempts for a user
func (r *PostgresQuizAttemptRepository) ListUserAttempts(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*QuizAttempt, error) {
	query := `
		SELECT id, user_id, quiz_id, status, total_questions,
			correct_answers, score, started_at, completed_at, created_at, updated_at
		FROM quiz_attempts
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attempts []*QuizAttempt
	for rows.Next() {
		attempt := &QuizAttempt{}
		err := rows.Scan(
			&attempt.ID, &attempt.UserID, &attempt.QuizID, &attempt.Status,
			&attempt.TotalQuestions, &attempt.CorrectAnswers, &attempt.Score,
			&attempt.StartedAt, &attempt.CompletedAt, &attempt.CreatedAt, &attempt.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		attempts = append(attempts, attempt)
	}

	// Get answers for each attempt
	for _, attempt := range attempts {
		answers, err := r.GetAttemptAnswers(ctx, attempt.ID)
		if err != nil {
			return nil, err
		}
		attempt.Answers = answers
		
		// Set the current question index based on the number of answers (application logic)
		attempt.CurrentQuestionIndex = len(answers)
	}

	return attempts, nil
}

// AddAnswer adds a new answer to a quiz attempt
func (r *PostgresQuizAttemptRepository) AddAnswer(ctx context.Context, answer *Answer) error {
	query := `
		INSERT INTO quiz_answers (
			id, attempt_id, question_id, answer, is_correct, created_at
		) VALUES ($1, $2, $3, $4, $5, $6)`

	_, err := r.db.ExecContext(ctx, query,
		answer.ID, answer.AttemptID, answer.QuestionID,
		answer.Answer, answer.IsCorrect, answer.CreatedAt,
	)
	return err
}

// GetAttemptAnswers retrieves all answers for a quiz attempt
func (r *PostgresQuizAttemptRepository) GetAttemptAnswers(ctx context.Context, attemptID uuid.UUID) ([]Answer, error) {
	query := `
		SELECT id, attempt_id, question_id, answer, is_correct, created_at
		FROM quiz_answers
		WHERE attempt_id = $1
		ORDER BY created_at ASC`

	rows, err := r.db.QueryContext(ctx, query, attemptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var answers []Answer
	for rows.Next() {
		var answer Answer
		err := rows.Scan(
			&answer.ID, &answer.AttemptID, &answer.QuestionID,
			&answer.Answer, &answer.IsCorrect, &answer.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		answers = append(answers, answer)
	}

	return answers, nil
}

// GetQuestions retrieves all questions for a quiz from the content service
func (r *PostgresQuizAttemptRepository) GetQuestions(ctx context.Context, quizID uuid.UUID) ([]*Question, error) {
	// Get content service URL from environment variable or use default
	contentServiceURL := os.Getenv("CONTENT_SERVICE_URL")
	if contentServiceURL == "" {
		contentServiceURL = "http://content-service:8081"
	}
	
	// In development, allow using localhost
	if os.Getenv("ENVIRONMENT") == "development" {
		contentServiceURL = "http://localhost:8081"
	}

	// Adding detailed logging for debugging
	log.Printf("DEBUG: Fetching questions from content service for quiz ID: %s using URL: %s", quizID.String(), contentServiceURL)
	
	// We already have the quiz ID - no need to query the database for it
	
	requestURL := fmt.Sprintf("%s/quizzes/%s/questions", contentServiceURL, quizID)
	log.Printf("DEBUG: Making request to: %s", requestURL)
	
	resp, err := http.Get(requestURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch questions from content service: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	log.Printf("DEBUG: Content service response status: %d", resp.StatusCode)
	log.Printf("DEBUG: Content service response body: %s", string(body))

	resp.Body = io.NopCloser(bytes.NewBuffer(body))

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("content service returned status %d: %s", resp.StatusCode, string(body))
	}

	var response struct {
		Success bool        `json:"success"`
		Data    []*Question `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	log.Printf("DEBUG: Returning %d questions for quiz %s", len(response.Data), quizID.String())
	
	return response.Data, nil
} 