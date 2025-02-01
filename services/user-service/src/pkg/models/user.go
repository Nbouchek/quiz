package models

import (
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// User represents a user in the system
type User struct {
    ID          uuid.UUID `json:"id"`
    Email       string    `json:"email"`
    Username    string    `json:"username"`
    PasswordHash string   `json:"-"` // "-" means this field won't be included in JSON
    FullName    string    `json:"full_name,omitempty"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
    LastLogin   *time.Time `json:"last_login,omitempty"`
}

// UserPreferences represents user preferences
type UserPreferences struct {
    UserID               uuid.UUID `json:"user_id"`
    StudyReminderFreq    string    `json:"study_reminder_frequency"`
    PreferredAIModel     string    `json:"preferred_ai_model"`
    EmailNotifications   bool      `json:"email_notifications"`
    CreatedAt           time.Time `json:"created_at"`
    UpdatedAt           time.Time `json:"updated_at"`
}

// NewUser creates a new user with the given details
func NewUser(email, username, password, fullName string) (*User, error) {
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return nil, err
    }

    now := time.Now().UTC()
    return &User{
        ID:           uuid.New(),
        Email:        email,
        Username:     username,
        PasswordHash: string(hashedPassword),
        FullName:     fullName,
        CreatedAt:    now,
        UpdatedAt:    now,
    }, nil
}

// ValidatePassword checks if the provided password matches the stored hash
func (u *User) ValidatePassword(password string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
    return err == nil
}

// UpdatePassword updates the user's password
func (u *User) UpdatePassword(newPassword string) error {
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
    if err != nil {
        return err
    }
    u.PasswordHash = string(hashedPassword)
    u.UpdatedAt = time.Now().UTC()
    return nil
}

// UpdateLastLogin updates the user's last login time
func (u *User) UpdateLastLogin() {
    now := time.Now().UTC()
    u.LastLogin = &now
    u.UpdatedAt = now
} 