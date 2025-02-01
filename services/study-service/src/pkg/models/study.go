package models

import (
	"time"

	"github.com/google/uuid"
)

// StudySessionStatus represents the status of a study session
type StudySessionStatus string

const (
    StatusInProgress StudySessionStatus = "in_progress"
    StatusCompleted  StudySessionStatus = "completed"
    StatusAbandoned  StudySessionStatus = "abandoned"
)

// StudySession represents a study session
type StudySession struct {
    ID             uuid.UUID          `json:"id"`
    UserID         uuid.UUID          `json:"user_id"`
    StudySetID     uuid.UUID          `json:"study_set_id"`
    Status         StudySessionStatus `json:"status"`
    StartTime      time.Time          `json:"start_time"`
    EndTime        *time.Time         `json:"end_time,omitempty"`
    Duration       int                `json:"duration_minutes,omitempty"`
    ItemsReviewed  int                `json:"items_reviewed"`
    CorrectAnswers int                `json:"correct_answers"`
}

// ProgressTracking represents a user's progress on a content item
type ProgressTracking struct {
    ID              uuid.UUID `json:"id"`
    UserID          uuid.UUID `json:"user_id"`
    ContentItemID   uuid.UUID `json:"content_item_id"`
    ConfidenceLevel int       `json:"confidence_level"`
    LastReviewed    time.Time `json:"last_reviewed"`
    NextReview      time.Time `json:"next_review"`
    ReviewCount     int       `json:"review_count"`
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}

// NewStudySession creates a new study session
func NewStudySession(userID, studySetID uuid.UUID) *StudySession {
    return &StudySession{
        ID:            uuid.New(),
        UserID:        userID,
        StudySetID:    studySetID,
        Status:        StatusInProgress,
        StartTime:     time.Now().UTC(),
        ItemsReviewed: 0,
    }
}

// CompleteSession marks a session as completed
func (s *StudySession) CompleteSession(correctAnswers int) {
    now := time.Now().UTC()
    s.Status = StatusCompleted
    s.EndTime = &now
    s.Duration = int(now.Sub(s.StartTime).Minutes())
    s.CorrectAnswers = correctAnswers
}

// AbandonSession marks a session as abandoned
func (s *StudySession) AbandonSession() {
    now := time.Now().UTC()
    s.Status = StatusAbandoned
    s.EndTime = &now
    s.Duration = int(now.Sub(s.StartTime).Minutes())
}

// NewProgressTracking creates a new progress tracking record
func NewProgressTracking(userID, contentItemID uuid.UUID, confidenceLevel int) *ProgressTracking {
    now := time.Now().UTC()
    return &ProgressTracking{
        ID:              uuid.New(),
        UserID:          userID,
        ContentItemID:   contentItemID,
        ConfidenceLevel: confidenceLevel,
        LastReviewed:    now,
        NextReview:      calculateNextReview(confidenceLevel, now),
        ReviewCount:     1,
        CreatedAt:       now,
        UpdatedAt:       now,
    }
}

// UpdateProgress updates the progress tracking record
func (p *ProgressTracking) UpdateProgress(confidenceLevel int) {
    now := time.Now().UTC()
    p.ConfidenceLevel = confidenceLevel
    p.LastReviewed = now
    p.NextReview = calculateNextReview(confidenceLevel, now)
    p.ReviewCount++
    p.UpdatedAt = now
}

// calculateNextReview calculates the next review time based on confidence level
func calculateNextReview(confidenceLevel int, from time.Time) time.Time {
    // Implement spaced repetition algorithm
    // Example: Higher confidence = longer intervals
    intervals := map[int]time.Duration{
        1: 1 * time.Hour,
        2: 6 * time.Hour,
        3: 24 * time.Hour,
        4: 72 * time.Hour,
        5: 168 * time.Hour, // 1 week
    }

    interval := intervals[confidenceLevel]
    if interval == 0 {
        interval = 24 * time.Hour // default to 1 day
    }

    return from.Add(interval)
} 