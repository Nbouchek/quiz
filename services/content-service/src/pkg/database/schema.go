package database

import (
	"fmt"
)

// InitSchema initializes the database schema
func InitSchema() error {
	if db == nil {
		return fmt.Errorf("database connection not initialized")
	}

	// Create quizzes table
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS quizzes (
			id UUID PRIMARY KEY,
			title TEXT NOT NULL,
			description TEXT NOT NULL,
			topic_id UUID NOT NULL,
			creator_id UUID NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL,
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL
		)
	`)
	if err != nil {
		return fmt.Errorf("error creating quizzes table: %v", err)
	}

	// Create questions table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS questions (
			id UUID PRIMARY KEY,
			quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
			text TEXT NOT NULL,
			type TEXT NOT NULL,
			options TEXT[] NOT NULL,
			correct_answer TEXT NOT NULL,
			explanation TEXT,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL,
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL
		)
	`)
	if err != nil {
		return fmt.Errorf("error creating questions table: %v", err)
	}

	return nil
} 