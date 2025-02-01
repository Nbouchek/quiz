package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/QuizApp/user-service/src/pkg/models"
	"github.com/google/uuid"
)

var (
    ErrUserNotFound      = errors.New("user not found")
    ErrDuplicateEmail    = errors.New("email already exists")
    ErrDuplicateUsername = errors.New("username already exists")
)

// UserRepository defines the interface for user data operations
type UserRepository interface {
    Create(ctx context.Context, user *models.User) error
    GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
    GetByEmail(ctx context.Context, email string) (*models.User, error)
    GetByUsername(ctx context.Context, username string) (*models.User, error)
    Update(ctx context.Context, user *models.User) error
    Delete(ctx context.Context, id uuid.UUID) error
    UpdateLastLogin(ctx context.Context, id uuid.UUID) error
    CreatePreferences(ctx context.Context, prefs *models.UserPreferences) error
    UpdatePreferences(ctx context.Context, prefs *models.UserPreferences) error
    GetPreferences(ctx context.Context, userID uuid.UUID) (*models.UserPreferences, error)
}

// PostgresUserRepository implements UserRepository for PostgreSQL
type PostgresUserRepository struct {
    db *sql.DB
}

// NewPostgresUserRepository creates a new PostgreSQL user repository
func NewPostgresUserRepository(db *sql.DB) UserRepository {
    return &PostgresUserRepository{db: db}
}

// Create inserts a new user into the database
func (r *PostgresUserRepository) Create(ctx context.Context, user *models.User) error {
    query := `
        INSERT INTO users (id, email, username, password_hash, full_name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`

    _, err := r.db.ExecContext(ctx, query,
        user.ID,
        user.Email,
        user.Username,
        user.PasswordHash,
        user.FullName,
        user.CreatedAt,
        user.UpdatedAt,
    )

    if err != nil {
        // Handle unique constraint violations
        return err
    }

    return nil
}

// GetByID retrieves a user by their ID
func (r *PostgresUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
    query := `
        SELECT id, email, username, password_hash, full_name, created_at, updated_at, last_login
        FROM users
        WHERE id = $1`

    user := &models.User{}
    err := r.db.QueryRowContext(ctx, query, id).Scan(
        &user.ID,
        &user.Email,
        &user.Username,
        &user.PasswordHash,
        &user.FullName,
        &user.CreatedAt,
        &user.UpdatedAt,
        &user.LastLogin,
    )

    if err == sql.ErrNoRows {
        return nil, ErrUserNotFound
    }
    if err != nil {
        return nil, err
    }

    return user, nil
}

// GetByEmail retrieves a user by their email
func (r *PostgresUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
    query := `
        SELECT id, email, username, password_hash, full_name, created_at, updated_at, last_login
        FROM users
        WHERE email = $1`

    user := &models.User{}
    err := r.db.QueryRowContext(ctx, query, email).Scan(
        &user.ID,
        &user.Email,
        &user.Username,
        &user.PasswordHash,
        &user.FullName,
        &user.CreatedAt,
        &user.UpdatedAt,
        &user.LastLogin,
    )

    if err == sql.ErrNoRows {
        return nil, ErrUserNotFound
    }
    if err != nil {
        return nil, err
    }

    return user, nil
}

// GetByUsername retrieves a user by their username
func (r *PostgresUserRepository) GetByUsername(ctx context.Context, username string) (*models.User, error) {
    query := `
        SELECT id, email, username, password_hash, full_name, created_at, updated_at, last_login
        FROM users
        WHERE username = $1`

    user := &models.User{}
    err := r.db.QueryRowContext(ctx, query, username).Scan(
        &user.ID,
        &user.Email,
        &user.Username,
        &user.PasswordHash,
        &user.FullName,
        &user.CreatedAt,
        &user.UpdatedAt,
        &user.LastLogin,
    )

    if err == sql.ErrNoRows {
        return nil, ErrUserNotFound
    }
    if err != nil {
        return nil, err
    }

    return user, nil
}

// Update updates an existing user
func (r *PostgresUserRepository) Update(ctx context.Context, user *models.User) error {
    query := `
        UPDATE users
        SET email = $1, username = $2, password_hash = $3, full_name = $4, updated_at = $5
        WHERE id = $6`

    result, err := r.db.ExecContext(ctx, query,
        user.Email,
        user.Username,
        user.PasswordHash,
        user.FullName,
        time.Now().UTC(),
        user.ID,
    )

    if err != nil {
        return err
    }

    rows, err := result.RowsAffected()
    if err != nil {
        return err
    }

    if rows == 0 {
        return ErrUserNotFound
    }

    return nil
}

// Delete removes a user from the database
func (r *PostgresUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
    query := `DELETE FROM users WHERE id = $1`

    result, err := r.db.ExecContext(ctx, query, id)
    if err != nil {
        return err
    }

    rows, err := result.RowsAffected()
    if err != nil {
        return err
    }

    if rows == 0 {
        return ErrUserNotFound
    }

    return nil
}

// UpdateLastLogin updates the user's last login time
func (r *PostgresUserRepository) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
    query := `
        UPDATE users
        SET last_login = $1, updated_at = $1
        WHERE id = $2`

    now := time.Now().UTC()
    result, err := r.db.ExecContext(ctx, query, now, id)
    if err != nil {
        return err
    }

    rows, err := result.RowsAffected()
    if err != nil {
        return err
    }

    if rows == 0 {
        return ErrUserNotFound
    }

    return nil
}

// CreatePreferences creates user preferences
func (r *PostgresUserRepository) CreatePreferences(ctx context.Context, prefs *models.UserPreferences) error {
    query := `
        INSERT INTO user_preferences (user_id, study_reminder_frequency, preferred_ai_model, email_notifications, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)`

    _, err := r.db.ExecContext(ctx, query,
        prefs.UserID,
        prefs.StudyReminderFreq,
        prefs.PreferredAIModel,
        prefs.EmailNotifications,
        prefs.CreatedAt,
        prefs.UpdatedAt,
    )

    return err
}

// UpdatePreferences updates user preferences
func (r *PostgresUserRepository) UpdatePreferences(ctx context.Context, prefs *models.UserPreferences) error {
    query := `
        UPDATE user_preferences
        SET study_reminder_frequency = $1, preferred_ai_model = $2, email_notifications = $3, updated_at = $4
        WHERE user_id = $5`

    result, err := r.db.ExecContext(ctx, query,
        prefs.StudyReminderFreq,
        prefs.PreferredAIModel,
        prefs.EmailNotifications,
        time.Now().UTC(),
        prefs.UserID,
    )

    if err != nil {
        return err
    }

    rows, err := result.RowsAffected()
    if err != nil {
        return err
    }

    if rows == 0 {
        return ErrUserNotFound
    }

    return nil
}

// GetPreferences retrieves user preferences
func (r *PostgresUserRepository) GetPreferences(ctx context.Context, userID uuid.UUID) (*models.UserPreferences, error) {
    query := `
        SELECT user_id, study_reminder_frequency, preferred_ai_model, email_notifications, created_at, updated_at
        FROM user_preferences
        WHERE user_id = $1`

    prefs := &models.UserPreferences{}
    err := r.db.QueryRowContext(ctx, query, userID).Scan(
        &prefs.UserID,
        &prefs.StudyReminderFreq,
        &prefs.PreferredAIModel,
        &prefs.EmailNotifications,
        &prefs.CreatedAt,
        &prefs.UpdatedAt,
    )

    if err == sql.ErrNoRows {
        return nil, ErrUserNotFound
    }
    if err != nil {
        return nil, err
    }

    return prefs, nil
} 