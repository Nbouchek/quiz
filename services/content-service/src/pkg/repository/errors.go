package repository

import "errors"

var (
	// ErrQuizNotFound is returned when a quiz cannot be found
	ErrQuizNotFound = errors.New("quiz not found")
	
	// ErrQuestionNotFound is returned when a question cannot be found
	ErrQuestionNotFound = errors.New("question not found")
	
	// ErrInvalidInput is returned when the input is invalid
	ErrInvalidInput = errors.New("invalid input")
	
	// ErrUnauthorized is returned when the user is not authorized
	ErrUnauthorized = errors.New("unauthorized")
) 