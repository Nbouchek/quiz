package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"

	"QuizApp/services/content-service/src/pkg/models"
)

// ContentRepository defines the interface for quiz content operations
type ContentRepository interface {
	CreateQuiz(ctx context.Context, quiz *models.Quiz) error
	GetQuiz(ctx context.Context, id uuid.UUID) (*models.Quiz, error)
	ListQuizzes(ctx context.Context, page, pageSize int) ([]*models.Quiz, error)
	UpdateQuiz(ctx context.Context, quiz *models.Quiz) error
	DeleteQuiz(ctx context.Context, id uuid.UUID) error
	AddQuestion(ctx context.Context, question *models.Question) error
	GetQuestion(ctx context.Context, id uuid.UUID) (*models.Question, error)
	UpdateQuestion(ctx context.Context, question *models.Question) error
	DeleteQuestion(ctx context.Context, id uuid.UUID) error
	ListQuizQuestions(ctx context.Context, quizID uuid.UUID) ([]*models.Question, error)
	ListUserQuizzes(ctx context.Context, userID uuid.UUID, page, pageSize int) ([]*models.Quiz, error)
	SearchQuizzes(ctx context.Context, query string, page, pageSize int) ([]*models.Quiz, error)
}

// PostgresContentRepository implements ContentRepository for PostgreSQL
type PostgresContentRepository struct {
	db *sql.DB
}

// NewPostgresContentRepository creates a new PostgreSQL content repository
func NewPostgresContentRepository(db *sql.DB) *PostgresContentRepository {
	return &PostgresContentRepository{db: db}
}

// CreateQuiz creates a new quiz
func (r *PostgresContentRepository) CreateQuiz(ctx context.Context, quiz *models.Quiz) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	now := time.Now().UTC()
	quiz.CreatedAt = now
	quiz.UpdatedAt = now

	_, err = tx.ExecContext(ctx, `
		INSERT INTO quizzes (id, title, description, topic_id, creator_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, quiz.ID, quiz.Title, quiz.Description, quiz.TopicID, quiz.CreatorID, quiz.CreatedAt, quiz.UpdatedAt)

	if err != nil {
		return err
	}

	return tx.Commit()
}

// GetQuiz gets a quiz by ID
func (r *PostgresContentRepository) GetQuiz(ctx context.Context, id uuid.UUID) (*models.Quiz, error) {
	query := `
		SELECT id, title, description, topic_id, creator_id, created_at, updated_at
		FROM quizzes
		WHERE id = $1`

	quiz := &models.Quiz{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&quiz.ID,
		&quiz.Title,
		&quiz.Description,
		&quiz.TopicID,
		&quiz.CreatorID,
		&quiz.CreatedAt,
		&quiz.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrQuizNotFound
	}
	if err != nil {
		return nil, err
	}

	// Get questions for this quiz
	questions, err := r.ListQuizQuestions(ctx, id)
	if err != nil {
		return nil, err
	}
	quiz.Questions = questions

	return quiz, nil
}

// UpdateQuiz updates an existing quiz
func (r *PostgresContentRepository) UpdateQuiz(ctx context.Context, quiz *models.Quiz) error {
	quiz.UpdatedAt = time.Now().UTC()
	result, err := r.db.ExecContext(ctx, `
		UPDATE quizzes
		SET title = $1, description = $2, topic_id = $3, updated_at = $4
		WHERE id = $5
	`, quiz.Title, quiz.Description, quiz.TopicID, quiz.UpdatedAt, quiz.ID)

	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrQuizNotFound
	}

	return nil
}

// DeleteQuiz deletes a quiz by ID
func (r *PostgresContentRepository) DeleteQuiz(ctx context.Context, id uuid.UUID) error {
	result, err := r.db.ExecContext(ctx, "DELETE FROM quizzes WHERE id = $1", id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrQuizNotFound
	}

	return nil
}

// ListQuizzes lists all quizzes with pagination
func (r *PostgresContentRepository) ListQuizzes(ctx context.Context, page, pageSize int) ([]*models.Quiz, error) {
	query := `
		SELECT id, title, description, topic_id, creator_id, created_at, updated_at
		FROM quizzes
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	offset := (page - 1) * pageSize
	rows, err := r.db.QueryContext(ctx, query, pageSize, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var quizzes []*models.Quiz
	for rows.Next() {
		quiz := &models.Quiz{}
		err := rows.Scan(
			&quiz.ID,
			&quiz.Title,
			&quiz.Description,
			&quiz.TopicID,
			&quiz.CreatorID,
			&quiz.CreatedAt,
			&quiz.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		quizzes = append(quizzes, quiz)
	}

	return quizzes, nil
}

// ListUserQuizzes lists all quizzes for a user with pagination
func (r *PostgresContentRepository) ListUserQuizzes(ctx context.Context, userID uuid.UUID, page, pageSize int) ([]*models.Quiz, error) {
	query := `
		SELECT id, title, description, topic_id, creator_id, created_at, updated_at
		FROM quizzes
		WHERE creator_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	offset := (page - 1) * pageSize
	rows, err := r.db.QueryContext(ctx, query, userID, pageSize, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var quizzes []*models.Quiz
	for rows.Next() {
		quiz := &models.Quiz{}
		err := rows.Scan(
			&quiz.ID,
			&quiz.Title,
			&quiz.Description,
			&quiz.TopicID,
			&quiz.CreatorID,
			&quiz.CreatedAt,
			&quiz.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		quizzes = append(quizzes, quiz)
	}

	return quizzes, nil
}

// SearchQuizzes searches quizzes by title or description
func (r *PostgresContentRepository) SearchQuizzes(ctx context.Context, query string, page, pageSize int) ([]*models.Quiz, error) {
	searchQuery := `
		SELECT id, title, description, topic_id, creator_id, created_at, updated_at
		FROM quizzes
		WHERE title ILIKE $1 OR description ILIKE $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	offset := (page - 1) * pageSize
	searchPattern := "%" + query + "%"
	rows, err := r.db.QueryContext(ctx, searchQuery, searchPattern, pageSize, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var quizzes []*models.Quiz
	for rows.Next() {
		quiz := &models.Quiz{}
		err := rows.Scan(
			&quiz.ID,
			&quiz.Title,
			&quiz.Description,
			&quiz.TopicID,
			&quiz.CreatorID,
			&quiz.CreatedAt,
			&quiz.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		quizzes = append(quizzes, quiz)
	}

	return quizzes, nil
}

// AddQuestion adds a new question to a quiz
func (r *PostgresContentRepository) AddQuestion(ctx context.Context, question *models.Question) error {
	now := time.Now().UTC()
	question.CreatedAt = now
	question.UpdatedAt = now

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO questions (id, quiz_id, text, type, options, correct_answer, explanation, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, question.ID, question.QuizID, question.Text, question.Type, pq.Array(question.Options),
		question.CorrectAnswer, question.Explanation, question.CreatedAt, question.UpdatedAt)

	return err
}

// GetQuestion gets a question by ID
func (r *PostgresContentRepository) GetQuestion(ctx context.Context, id uuid.UUID) (*models.Question, error) {
	query := `
		SELECT id, quiz_id, text, type, options, correct_answer, explanation, created_at, updated_at
		FROM questions
		WHERE id = $1`

	question := &models.Question{}
	var options pq.StringArray
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&question.ID,
		&question.QuizID,
		&question.Text,
		&question.Type,
		&options,
		&question.CorrectAnswer,
		&question.Explanation,
		&question.CreatedAt,
		&question.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrQuestionNotFound
	}
	if err != nil {
		return nil, err
	}

	question.Options = []string(options)
	return question, nil
}

// UpdateQuestion updates an existing question
func (r *PostgresContentRepository) UpdateQuestion(ctx context.Context, question *models.Question) error {
	question.UpdatedAt = time.Now().UTC()
	result, err := r.db.ExecContext(ctx, `
		UPDATE questions
		SET text = $1, type = $2, options = $3, correct_answer = $4, explanation = $5, updated_at = $6
		WHERE id = $7
	`, question.Text, question.Type, pq.Array(question.Options),
		question.CorrectAnswer, question.Explanation, question.UpdatedAt, question.ID)

	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrQuestionNotFound
	}

	return nil
}

// DeleteQuestion deletes a question by ID
func (r *PostgresContentRepository) DeleteQuestion(ctx context.Context, id uuid.UUID) error {
	result, err := r.db.ExecContext(ctx, "DELETE FROM questions WHERE id = $1", id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrQuestionNotFound
	}

	return nil
}

// ListQuizQuestions gets all questions for a quiz
func (r *PostgresContentRepository) ListQuizQuestions(ctx context.Context, quizID uuid.UUID) ([]*models.Question, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, quiz_id, text, type, options, correct_answer, explanation, created_at, updated_at
		FROM questions
		WHERE quiz_id = $1
		ORDER BY created_at ASC
	`, quizID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var questions []*models.Question
	for rows.Next() {
		q := &models.Question{}
		var options pq.StringArray
		err := rows.Scan(
			&q.ID,
			&q.QuizID,
			&q.Text,
			&q.Type,
			&options,
			&q.CorrectAnswer,
			&q.Explanation,
			&q.CreatedAt,
			&q.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		q.Options = []string(options)
		questions = append(questions, q)
	}

	return questions, nil
} 