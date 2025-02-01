package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"QuizApp/services/study-service/src/pkg/models"

	"github.com/google/uuid"
)

var (
	ErrSessionNotFound  = errors.New("study session not found")
	ErrProgressNotFound = errors.New("progress tracking not found")
)

type StudySession struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	QuizID    int64     `json:"quiz_id"`
	Score     float64   `json:"score"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
}

type StudyProgress struct {
	ID           int64   `json:"id"`
	UserID       int64   `json:"user_id"`
	TopicID      int64   `json:"topic_id"`
	Proficiency  float64 `json:"proficiency"`
	QuestionsAttempted int `json:"questions_attempted"`
	CorrectAnswers     int `json:"correct_answers"`
}

// StudyRepository defines the interface for study session and progress data operations
type StudyRepository interface {
	// Study Session operations
	CreateSession(ctx context.Context, session *models.StudySession) error
	GetSession(ctx context.Context, id uuid.UUID) (*models.StudySession, error)
	UpdateSession(ctx context.Context, session *models.StudySession) error
	ListUserSessions(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*models.StudySession, error)
	GetActiveSession(ctx context.Context, userID uuid.UUID) (*models.StudySession, error)

	// Progress Tracking operations
	CreateProgress(ctx context.Context, progress *models.ProgressTracking) error
	GetProgress(ctx context.Context, userID, contentItemID uuid.UUID) (*models.ProgressTracking, error)
	UpdateProgress(ctx context.Context, progress *models.ProgressTracking) error
	ListUserProgress(ctx context.Context, userID uuid.UUID) ([]*models.ProgressTracking, error)
	ListDueItems(ctx context.Context, userID uuid.UUID, before time.Time) ([]*models.ProgressTracking, error)
	GetStudyStats(ctx context.Context, userID uuid.UUID) (totalReviews, totalItems int, avgConfidence float64, err error)
}

// PostgresStudyRepository implements StudyRepository for PostgreSQL
type PostgresStudyRepository struct {
	db *sql.DB
}

// NewPostgresStudyRepository creates a new PostgreSQL study repository
func NewPostgresStudyRepository(db *sql.DB) StudyRepository {
	return &PostgresStudyRepository{db: db}
}

// CreateSession creates a new study session
func (r *PostgresStudyRepository) CreateSession(ctx context.Context, session *models.StudySession) error {
	query := `
		INSERT INTO study_sessions (id, user_id, study_set_id, status, start_time, items_reviewed, correct_answers)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := r.db.ExecContext(ctx, query,
		session.ID,
		session.UserID,
		session.StudySetID,
		session.Status,
		session.StartTime,
		session.ItemsReviewed,
		session.CorrectAnswers,
	)

	return err
}

// GetSession retrieves a study session by ID
func (r *PostgresStudyRepository) GetSession(ctx context.Context, id uuid.UUID) (*models.StudySession, error) {
	query := `
		SELECT id, user_id, study_set_id, status, start_time, end_time, duration, items_reviewed, correct_answers
		FROM study_sessions
		WHERE id = $1`

	session := &models.StudySession{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&session.ID,
		&session.UserID,
		&session.StudySetID,
		&session.Status,
		&session.StartTime,
		&session.EndTime,
		&session.Duration,
		&session.ItemsReviewed,
		&session.CorrectAnswers,
	)

	if err == sql.ErrNoRows {
		return nil, ErrSessionNotFound
	}
	if err != nil {
		return nil, err
	}

	return session, nil
}

// UpdateSession updates an existing study session
func (r *PostgresStudyRepository) UpdateSession(ctx context.Context, session *models.StudySession) error {
	query := `
		UPDATE study_sessions
		SET status = $1, end_time = $2, duration = $3, items_reviewed = $4, correct_answers = $5
		WHERE id = $6`
	
	result, err := r.db.ExecContext(ctx, query,
		session.Status,
		session.EndTime,
		session.Duration,
		session.ItemsReviewed,
		session.CorrectAnswers,
		session.ID,
	)
	if err != nil {
		return err
	}
	
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrSessionNotFound
	}
	return nil
}

// ListUserSessions retrieves all study sessions for a user with pagination
func (r *PostgresStudyRepository) ListUserSessions(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*models.StudySession, error) {
	query := `
		SELECT id, user_id, study_set_id, status, start_time, end_time, duration, items_reviewed, correct_answers
		FROM study_sessions
		WHERE user_id = $1
		ORDER BY start_time DESC
		LIMIT $2 OFFSET $3`
	
	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var sessions []*models.StudySession
	for rows.Next() {
		session := &models.StudySession{}
		err := rows.Scan(
			&session.ID,
			&session.UserID,
			&session.StudySetID,
			&session.Status,
			&session.StartTime,
			&session.EndTime,
			&session.Duration,
			&session.ItemsReviewed,
			&session.CorrectAnswers,
		)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}
	return sessions, rows.Err()
}

// GetActiveSession retrieves a user's active study session
func (r *PostgresStudyRepository) GetActiveSession(ctx context.Context, userID uuid.UUID) (*models.StudySession, error) {
	query := `
		SELECT id, user_id, study_set_id, status, start_time, end_time, duration, items_reviewed, correct_answers
		FROM study_sessions
		WHERE user_id = $1 AND status = 'in_progress'
		ORDER BY start_time DESC
		LIMIT 1`

	session := &models.StudySession{}
	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&session.ID,
		&session.UserID,
		&session.StudySetID,
		&session.Status,
		&session.StartTime,
		&session.EndTime,
		&session.Duration,
		&session.ItemsReviewed,
		&session.CorrectAnswers,
	)

	if err == sql.ErrNoRows {
		return nil, nil // No active session is not an error
	}
	if err != nil {
		return nil, err
	}

	return session, nil
}

// CreateProgress creates a new progress tracking record
func (r *PostgresStudyRepository) CreateProgress(ctx context.Context, progress *models.ProgressTracking) error {
	query := `
		INSERT INTO progress_tracking (id, user_id, content_item_id, confidence_level, last_reviewed, next_review, review_count, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err := r.db.ExecContext(ctx, query,
		progress.ID,
		progress.UserID,
		progress.ContentItemID,
		progress.ConfidenceLevel,
		progress.LastReviewed,
		progress.NextReview,
		progress.ReviewCount,
		progress.CreatedAt,
		progress.UpdatedAt,
	)

	return err
}

// GetProgress retrieves progress tracking for a specific user and content item
func (r *PostgresStudyRepository) GetProgress(ctx context.Context, userID, contentItemID uuid.UUID) (*models.ProgressTracking, error) {
	query := `
		SELECT id, user_id, content_item_id, confidence_level, last_reviewed, next_review, review_count, created_at, updated_at
		FROM progress_tracking
		WHERE user_id = $1 AND content_item_id = $2`

	progress := &models.ProgressTracking{}
	err := r.db.QueryRowContext(ctx, query, userID, contentItemID).Scan(
		&progress.ID,
		&progress.UserID,
		&progress.ContentItemID,
		&progress.ConfidenceLevel,
		&progress.LastReviewed,
		&progress.NextReview,
		&progress.ReviewCount,
		&progress.CreatedAt,
		&progress.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, ErrProgressNotFound
	}
	if err != nil {
		return nil, err
	}

	return progress, nil
}

// UpdateProgress updates an existing progress tracking record
func (r *PostgresStudyRepository) UpdateProgress(ctx context.Context, progress *models.ProgressTracking) error {
	query := `
		UPDATE progress_tracking
		SET confidence_level = $1, last_reviewed = $2, next_review = $3, review_count = $4, updated_at = $5
		WHERE id = $6`
	
	result, err := r.db.ExecContext(ctx, query,
		progress.ConfidenceLevel,
		progress.LastReviewed,
		progress.NextReview,
		progress.ReviewCount,
		progress.UpdatedAt,
		progress.ID,
	)
	if err != nil {
		return err
	}
	
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrProgressNotFound
	}
	return nil
}

// ListUserProgress retrieves all progress tracking records for a user
func (r *PostgresStudyRepository) ListUserProgress(ctx context.Context, userID uuid.UUID) ([]*models.ProgressTracking, error) {
	query := `
		SELECT id, user_id, content_item_id, confidence_level, last_reviewed, next_review, review_count, created_at, updated_at
		FROM progress_tracking
		WHERE user_id = $1
		ORDER BY next_review ASC`
	
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var progress []*models.ProgressTracking
	for rows.Next() {
		item := &models.ProgressTracking{}
		err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.ContentItemID,
			&item.ConfidenceLevel,
			&item.LastReviewed,
			&item.NextReview,
			&item.ReviewCount,
			&item.CreatedAt,
			&item.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		progress = append(progress, item)
	}
	return progress, rows.Err()
}

// ListDueItems retrieves items due for review
func (r *PostgresStudyRepository) ListDueItems(ctx context.Context, userID uuid.UUID, before time.Time) ([]*models.ProgressTracking, error) {
	query := `
		SELECT id, user_id, content_item_id, confidence_level, last_reviewed, next_review, review_count, created_at, updated_at
		FROM progress_tracking
		WHERE user_id = $1 AND next_review <= $2
		ORDER BY next_review ASC`

	rows, err := r.db.QueryContext(ctx, query, userID, before)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*models.ProgressTracking
	for rows.Next() {
		item := &models.ProgressTracking{}
		err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.ContentItemID,
			&item.ConfidenceLevel,
			&item.LastReviewed,
			&item.NextReview,
			&item.ReviewCount,
			&item.CreatedAt,
			&item.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

// GetStudyStats retrieves study statistics for a user
func (r *PostgresStudyRepository) GetStudyStats(ctx context.Context, userID uuid.UUID) (totalReviews, totalItems int, avgConfidence float64, err error) {
	query := `
		SELECT 
			COUNT(*) as total_items,
			SUM(review_count) as total_reviews,
			AVG(confidence_level) as avg_confidence
		FROM progress_tracking
		WHERE user_id = $1`

	err = r.db.QueryRowContext(ctx, query, userID).Scan(&totalItems, &totalReviews, &avgConfidence)
	if err != nil {
		return 0, 0, 0, err
	}

	return totalReviews, totalItems, avgConfidence, nil
} 