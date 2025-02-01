package models

import (
	"time"

	"github.com/google/uuid"
)

// ContentType represents the type of content
type ContentType string

// VisibilityType represents the visibility of a study set
type VisibilityType string

// QuestionType represents the type of question
type QuestionType string

const (
	// Content types
	ContentTypeFlashcard ContentType = "flashcard"
	ContentTypeQuiz     ContentType = "quiz"
	ContentTypeNote     ContentType = "note"

	// Visibility types
	VisibilityPrivate VisibilityType = "private"
	VisibilityPublic  VisibilityType = "public"
	VisibilityShared  VisibilityType = "shared"

	// Question types
	QuestionTypeMultipleChoice QuestionType = "multiple_choice"
	QuestionTypeTrueFalse     QuestionType = "true_false"
	QuestionTypeOpenEnded     QuestionType = "open_ended"
)

// Quiz represents a quiz with questions
type Quiz struct {
	ID          uuid.UUID    `json:"id"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	TopicID     *uuid.UUID   `json:"topicId,omitempty"`
	CreatorID   uuid.UUID   `json:"creatorId"`
	Questions   []*Question  `json:"questions"`
	CreatedAt   time.Time    `json:"createdAt"`
	UpdatedAt   time.Time    `json:"updatedAt"`
}

// Question represents a quiz question
type Question struct {
	ID            uuid.UUID    `json:"id"`
	QuizID        uuid.UUID    `json:"quizId"`
	Text          string       `json:"text"`
	Type          QuestionType `json:"type"`
	Options       []string     `json:"options"`
	CorrectAnswer string       `json:"correctAnswer"`
	Explanation   string       `json:"explanation,omitempty"`
	CreatedAt     time.Time    `json:"createdAt"`
	UpdatedAt     time.Time    `json:"updatedAt"`
}

// StudySet represents a collection of study content
type StudySet struct {
	ID          uuid.UUID      `json:"id"`
	Title       string         `json:"title"`
	Description string         `json:"description,omitempty"`
	OwnerID     uuid.UUID      `json:"owner_id"`
	Visibility  VisibilityType `json:"visibility"`
	Tags        []string       `json:"tags,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// ContentItem represents a single piece of study content
type ContentItem struct {
	ID          uuid.UUID   `json:"id"`
	StudySetID  uuid.UUID   `json:"study_set_id"`
	ContentType ContentType `json:"content_type"`
	Question    string      `json:"question"`
	Answer      string      `json:"answer"`
	Hints       []string    `json:"hints,omitempty"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

// SharedAccess represents shared access to a study set
type SharedAccess struct {
	StudySetID uuid.UUID `json:"study_set_id"`
	UserID     uuid.UUID `json:"user_id"`
	AccessType string    `json:"access_type"`
	CreatedAt  time.Time `json:"created_at"`
}

// NewStudySet creates a new study set
func NewStudySet(title, description string, ownerID uuid.UUID, visibility VisibilityType, tags []string) *StudySet {
	now := time.Now().UTC()
	return &StudySet{
		ID:          uuid.New(),
		Title:       title,
		Description: description,
		OwnerID:     ownerID,
		Visibility:  visibility,
		Tags:        tags,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

// NewContentItem creates a new content item
func NewContentItem(studySetID uuid.UUID, contentType ContentType, question, answer string, hints []string) *ContentItem {
	now := time.Now().UTC()
	return &ContentItem{
		ID:          uuid.New(),
		StudySetID:  studySetID,
		ContentType: contentType,
		Question:    question,
		Answer:      answer,
		Hints:       hints,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

// NewSharedAccess creates a new shared access record
func NewSharedAccess(studySetID, userID uuid.UUID, accessType string) *SharedAccess {
	return &SharedAccess{
		StudySetID: studySetID,
		UserID:     userID,
		AccessType: accessType,
		CreatedAt:  time.Now().UTC(),
	}
} 