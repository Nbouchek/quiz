package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"

	"QuizApp/services/study-service/src/pkg/models"

	"bytes"

	"github.com/google/uuid"
)

var (
	ErrAttemptNotFound = errors.New("quiz attempt not found")
)

// QuizAttemptRepository defines the interface for quiz attempt operations
type QuizAttemptRepository interface {
	CreateAttempt(ctx context.Context, attempt *models.QuizAttempt) error
	GetAttempt(ctx context.Context, id uuid.UUID) (*models.QuizAttempt, error)
	UpdateAttempt(ctx context.Context, attempt *models.QuizAttempt) error
	ListUserAttempts(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*models.QuizAttempt, error)
	AddAnswer(ctx context.Context, answer *models.Answer) error
	GetAttemptAnswers(ctx context.Context, attemptID uuid.UUID) ([]models.Answer, error)
	GetQuestions(ctx context.Context, quizID uuid.UUID) ([]*models.Question, error)
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
func (r *PostgresQuizAttemptRepository) CreateAttempt(ctx context.Context, attempt *models.QuizAttempt) error {
	query := `
		INSERT INTO quiz_attempts (
			id, user_id, quiz_id, status, score, started_at, completed_at,
			total_questions, correct_answers, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`

	_, err := r.db.ExecContext(ctx, query,
		attempt.ID, attempt.UserID, attempt.QuizID, attempt.Status, attempt.Score,
		attempt.StartedAt, attempt.CompletedAt, attempt.TotalQuestions,
		attempt.CorrectAnswers, attempt.CreatedAt, attempt.UpdatedAt,
	)
	return err
}

// GetAttempt retrieves a quiz attempt by ID
func (r *PostgresQuizAttemptRepository) GetAttempt(ctx context.Context, id uuid.UUID) (*models.QuizAttempt, error) {
	query := `
		SELECT id, user_id, quiz_id, status, score, started_at, completed_at,
			total_questions, correct_answers, created_at, updated_at
		FROM quiz_attempts WHERE id = $1`

	attempt := &models.QuizAttempt{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&attempt.ID, &attempt.UserID, &attempt.QuizID, &attempt.Status,
		&attempt.Score, &attempt.StartedAt, &attempt.CompletedAt,
		&attempt.TotalQuestions, &attempt.CorrectAnswers,
		&attempt.CreatedAt, &attempt.UpdatedAt,
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

	return attempt, nil
}

// UpdateAttempt updates an existing quiz attempt
func (r *PostgresQuizAttemptRepository) UpdateAttempt(ctx context.Context, attempt *models.QuizAttempt) error {
	query := `
		UPDATE quiz_attempts
		SET status = $1, score = $2, completed_at = $3,
			correct_answers = $4, updated_at = $5
		WHERE id = $6`

	result, err := r.db.ExecContext(ctx, query,
		attempt.Status, attempt.Score, attempt.CompletedAt,
		attempt.CorrectAnswers, attempt.UpdatedAt, attempt.ID,
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
func (r *PostgresQuizAttemptRepository) ListUserAttempts(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*models.QuizAttempt, error) {
	query := `
		SELECT id, user_id, quiz_id, status, score, started_at, completed_at,
			total_questions, correct_answers, created_at, updated_at
		FROM quiz_attempts
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attempts []*models.QuizAttempt
	for rows.Next() {
		attempt := &models.QuizAttempt{}
		err := rows.Scan(
			&attempt.ID, &attempt.UserID, &attempt.QuizID, &attempt.Status,
			&attempt.Score, &attempt.StartedAt, &attempt.CompletedAt,
			&attempt.TotalQuestions, &attempt.CorrectAnswers,
			&attempt.CreatedAt, &attempt.UpdatedAt,
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
	}

	return attempts, nil
}

// AddAnswer adds a new answer to a quiz attempt
func (r *PostgresQuizAttemptRepository) AddAnswer(ctx context.Context, answer *models.Answer) error {
	query := `
		INSERT INTO answers (
			id, attempt_id, question_id, answer, is_correct, created_at
		) VALUES ($1, $2, $3, $4, $5, $6)`

	_, err := r.db.ExecContext(ctx, query,
		answer.ID, answer.AttemptID, answer.QuestionID,
		answer.Answer, answer.IsCorrect, answer.CreatedAt,
	)
	return err
}

// GetAttemptAnswers retrieves all answers for a quiz attempt
func (r *PostgresQuizAttemptRepository) GetAttemptAnswers(ctx context.Context, attemptID uuid.UUID) ([]models.Answer, error) {
	query := `
		SELECT id, attempt_id, question_id, answer, is_correct, created_at
		FROM answers
		WHERE attempt_id = $1
		ORDER BY created_at ASC`

	rows, err := r.db.QueryContext(ctx, query, attemptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var answers []models.Answer
	for rows.Next() {
		var answer models.Answer
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

// GetQuestions retrieves all questions for a quiz
func (r *PostgresQuizAttemptRepository) GetQuestions(ctx context.Context, quizID uuid.UUID) ([]*models.Question, error) {
	// Make a request to the content service through the API gateway
	contentServiceURL := "http://api-gateway:8082"
	resp, err := http.Get(fmt.Sprintf("%s/content/quizzes/%s/questions", contentServiceURL, quizID))
	if err != nil {
		return nil, fmt.Errorf("failed to fetch questions from content service: %v", err)
	}
	defer resp.Body.Close()

	// Log the response status code and body for debugging
	body, _ := io.ReadAll(resp.Body)
	log.Printf("Content service response status: %d", resp.StatusCode)
	log.Printf("Content service response body: %s", string(body))

	// Reset the response body for further processing
	resp.Body = io.NopCloser(bytes.NewBuffer(body))

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("content service returned status %d: %s", resp.StatusCode, string(body))
	}

	var response struct {
		Data []*models.Question `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	return response.Data, nil
} 