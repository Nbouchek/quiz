package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

type QuizAttempt struct {
	ID                 string    `json:"id"`
	UserID            string    `json:"userId"`
	QuizID            string    `json:"quizId"`
	Status            string    `json:"status"`
	CurrentQuestionIndex int    `json:"currentQuestionIndex"`
	TotalQuestions    int       `json:"totalQuestions"`
	Score             float64   `json:"score"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// QuizAttemptRepository defines the interface for quiz attempt persistence
type QuizAttemptRepository interface {
	CreateAttempt(ctx context.Context, attempt QuizAttempt) error
	GetAttempt(ctx context.Context, id uuid.UUID) (QuizAttempt, error)
	UpdateAttempt(ctx context.Context, attempt QuizAttempt) error
}

// PostgresQuizAttemptRepository implements QuizAttemptRepository
type PostgresQuizAttemptRepository struct {
	db *sql.DB
}

// NewPostgresQuizAttemptRepository creates a new repository
func NewPostgresQuizAttemptRepository(db *sql.DB) *PostgresQuizAttemptRepository {
	return &PostgresQuizAttemptRepository{db: db}
}

// CreateAttempt creates a new quiz attempt in the database
func (r *PostgresQuizAttemptRepository) CreateAttempt(ctx context.Context, attempt QuizAttempt) error {
	query := `
		INSERT INTO quiz_attempts (
			id, user_id, quiz_id, status, current_question_index, 
			total_questions, score, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	
	_, err := r.db.ExecContext(
		ctx,
		query,
		attempt.ID,
		attempt.UserID,
		attempt.QuizID,
		attempt.Status,
		attempt.CurrentQuestionIndex,
		attempt.TotalQuestions,
		attempt.Score,
		attempt.CreatedAt,
		attempt.UpdatedAt,
	)
	
	if err != nil {
		log.Printf("Error creating quiz attempt: %v", err)
		return fmt.Errorf("failed to create quiz attempt: %w", err)
	}
	
	log.Printf("Created quiz attempt with ID: %s", attempt.ID)
	return nil
}

// GetAttempt retrieves a quiz attempt by ID
func (r *PostgresQuizAttemptRepository) GetAttempt(ctx context.Context, id uuid.UUID) (QuizAttempt, error) {
	query := `
		SELECT id, user_id, quiz_id, status, current_question_index, 
		       total_questions, score, created_at, updated_at
		FROM quiz_attempts
		WHERE id = $1
	`
	
	var attempt QuizAttempt
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&attempt.ID,
		&attempt.UserID,
		&attempt.QuizID,
		&attempt.Status,
		&attempt.CurrentQuestionIndex,
		&attempt.TotalQuestions,
		&attempt.Score,
		&attempt.CreatedAt,
		&attempt.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return QuizAttempt{}, fmt.Errorf("quiz attempt not found: %w", err)
		}
		log.Printf("Error retrieving quiz attempt: %v", err)
		return QuizAttempt{}, fmt.Errorf("failed to retrieve quiz attempt: %w", err)
	}
	
	log.Printf("Retrieved quiz attempt with ID: %s, Quiz ID: %s", attempt.ID, attempt.QuizID)
	return attempt, nil
}

// UpdateAttempt updates an existing quiz attempt
func (r *PostgresQuizAttemptRepository) UpdateAttempt(ctx context.Context, attempt QuizAttempt) error {
	query := `
		UPDATE quiz_attempts
		SET user_id = $2,
		    quiz_id = $3,
		    status = $4,
		    current_question_index = $5,
		    total_questions = $6,
		    score = $7,
		    updated_at = $8
		WHERE id = $1
	`
	
	attempt.UpdatedAt = time.Now()
	
	result, err := r.db.ExecContext(
		ctx,
		query,
		attempt.ID,
		attempt.UserID,
		attempt.QuizID,
		attempt.Status,
		attempt.CurrentQuestionIndex,
		attempt.TotalQuestions,
		attempt.Score,
		attempt.UpdatedAt,
	)
	
	if err != nil {
		log.Printf("Error updating quiz attempt: %v", err)
		return fmt.Errorf("failed to update quiz attempt: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("quiz attempt not found")
	}
	
	log.Printf("Updated quiz attempt with ID: %s", attempt.ID)
	return nil
}

// QuizAttemptHandler handles quiz attempt related operations
type QuizAttemptHandler struct {
	repo QuizAttemptRepository
}

// NewQuizAttemptHandler creates a new handler
func NewQuizAttemptHandler(repo QuizAttemptRepository) *QuizAttemptHandler {
	return &QuizAttemptHandler{repo: repo}
}

const defaultPort = "8084"

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	// Database configuration
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	dbURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		dbUser, dbPassword, dbHost, dbPort, dbName)

	// Connect to database
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Error pinging database: %v", err)
	}
	
	// Initialize repository and handler
	quizAttemptRepo := NewPostgresQuizAttemptRepository(db)
	quizAttemptHandler := NewQuizAttemptHandler(quizAttemptRepo)

	// Initialize Gin router
	router := gin.Default()
	
	// Configure CORS
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	config.AllowCredentials = true
	router.Use(cors.New(config))

	// Add health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "study-service",
		})
	})

	// Add logging middleware
	router.Use(func(c *gin.Context) {
		log.Printf("Received request: %s %s", c.Request.Method, c.Request.URL.Path)
		log.Printf("Request headers: %v", c.Request.Header)
		// Don't log the body as it will be consumed
		c.Next()
	})

	// Quiz attempt routes
	router.POST("/attempts", func(c *gin.Context) {
		var requestBody struct {
			UserID         string `json:"userId" binding:"required"`
			QuizID         string `json:"quizId" binding:"required"`
			TotalQuestions int    `json:"totalQuestions" binding:"required"`
		}

		// Read the request body
		body, err := c.GetRawData()
		if err != nil {
			log.Printf("Failed to read request body: %v", err)
			c.JSON(400, gin.H{
				"success": false,
				"error":   "Failed to read request body",
				"details": err.Error(),
			})
			return
		}
		log.Printf("Raw request body: %s", string(body))

		// Parse the JSON
		if err := json.Unmarshal(body, &requestBody); err != nil {
			log.Printf("Failed to parse JSON: %v", err)
			c.JSON(400, gin.H{
				"success": false,
				"error":   "Invalid request body",
				"details": err.Error(),
			})
			return
		}

		log.Printf("Parsed request body: %+v", requestBody)

		// Create new attempt
		attempt := QuizAttempt{
			ID:                 uuid.New().String(),
			UserID:            requestBody.UserID,
			QuizID:            requestBody.QuizID,
			Status:            "in_progress",
			CurrentQuestionIndex: 0,
			TotalQuestions:    requestBody.TotalQuestions,
			Score:             0,
			CreatedAt:         time.Now(),
			UpdatedAt:         time.Now(),
		}

		log.Printf("Created attempt: %+v", attempt)

		// Save attempt to database
		if err := quizAttemptHandler.repo.CreateAttempt(c.Request.Context(), attempt); err != nil {
			c.JSON(500, gin.H{
				"success": false,
				"error":   "Failed to create quiz attempt",
				"details": err.Error(),
			})
			return
		}

		c.JSON(201, gin.H{
			"success": true,
			"data":    attempt,
		})
	})

	router.GET("/attempts/:id", func(c *gin.Context) {
		id := c.Param("id")
		log.Printf("Getting attempt: %s", id)

		// Parse the attempt ID
		attemptUUID, err := uuid.Parse(id)
		if err != nil {
			log.Printf("Invalid attempt ID: %s, error: %v", id, err)
			c.JSON(400, gin.H{
				"success": false,
				"error":   "Invalid attempt ID format",
			})
			return
		}

		// Get attempt from database
		attempt, err := quizAttemptHandler.repo.GetAttempt(c.Request.Context(), attemptUUID)
		if err != nil {
			c.JSON(404, gin.H{
				"success": false,
				"error":   "Failed to retrieve quiz attempt",
				"details": err.Error(),
			})
			return
		}

		c.JSON(200, gin.H{
			"success": true,
			"data":    attempt,
		})
	})

	router.GET("/attempts/:id/questions", func(c *gin.Context) {
		id := c.Param("id")
		log.Printf("Getting questions for attempt: %s", id)
		
		// Mock questions for now
		// In a real implementation, you would fetch these from a database or another service
		questions := []map[string]interface{}{
			{
				"id": uuid.New().String(),
				"text": "What is the capital of France?",
				"options": []string{"Paris", "London", "Berlin", "Madrid"},
			},
			{
				"id": uuid.New().String(),
				"text": "What is the largest planet in our solar system?",
				"options": []string{"Jupiter", "Saturn", "Earth", "Mars"},
			},
			{
				"id": uuid.New().String(),
				"text": "Who wrote 'Romeo and Juliet'?",
				"options": []string{"William Shakespeare", "Charles Dickens", "Jane Austen", "Mark Twain"},
			},
		}
		
		c.JSON(200, gin.H{
			"success": true,
			"data": questions,
		})
	})

	router.POST("/attempts/:id/answers", func(c *gin.Context) {
		id := c.Param("id")
		var answer struct {
			QuestionID string `json:"questionId"`
			Answer     string `json:"answer"`
		}

		if err := c.ShouldBindJSON(&answer); err != nil {
			c.JSON(400, gin.H{
				"success": false,
				"error":   "Invalid request body",
				"details": err.Error(),
			})
			return
		}

		log.Printf("Received answer for attempt %s: %+v", id, answer)

		// Parse the attempt ID
		attemptUUID, err := uuid.Parse(id)
		if err != nil {
			log.Printf("Invalid attempt ID: %s, error: %v", id, err)
			c.JSON(400, gin.H{
				"success": false,
				"error":   "Invalid attempt ID format",
			})
			return
		}

		// Get the current attempt
		attempt, err := quizAttemptHandler.repo.GetAttempt(c.Request.Context(), attemptUUID)
		if err != nil {
			c.JSON(404, gin.H{
				"success": false,
				"error":   "Failed to retrieve quiz attempt",
				"details": err.Error(),
			})
			return
		}

		// For now, we'll simulate correctness checking
		// In a real implementation, you would check against the actual correct answer
		// Fetch the question from the content service or database
		isCorrect := false
		
		// This is a simple simulation - in a real app, you'd verify with the actual correct answer
		// For demo purposes, we'll consider answers containing "correct" or the first option to be correct
		if strings.Contains(strings.ToLower(answer.Answer), "correct") || 
		   strings.HasPrefix(strings.ToLower(answer.Answer), "a") || 
		   strings.HasPrefix(strings.ToLower(answer.Answer), "1") {
			isCorrect = true
		}

		// Save the answer to the database
		answerID := uuid.New().String()
		
		// We'll store the answers in the quiz_answers table
		// This example doesn't implement a separate Answer repository,
		// but in a production system you would
		query := `
			INSERT INTO quiz_answers (
				id, attempt_id, question_id, answer, is_correct, created_at
			) VALUES ($1, $2, $3, $4, $5, $6)
		`
		
		_, err = db.ExecContext(
			c.Request.Context(),
			query,
			answerID,
			id,
			answer.QuestionID,
			answer.Answer,
			isCorrect,
			time.Now(),
		)
		
		if err != nil {
			log.Printf("Error saving answer: %v", err)
			c.JSON(500, gin.H{
				"success": false,
				"error":   "Failed to save answer",
				"details": err.Error(),
			})
			return
		}

		// Update the attempt's current question index
		attempt.CurrentQuestionIndex++
		if isCorrect {
			// Update score if answer is correct
			// Simplified scoring: each correct answer adds 1/totalQuestions to the score
			attempt.Score += 1.0 / float64(attempt.TotalQuestions) * 100
		}
		
		if err := quizAttemptHandler.repo.UpdateAttempt(c.Request.Context(), attempt); err != nil {
			log.Printf("Error updating attempt: %v", err)
			// We'll still return success since the answer was saved
		}

		c.JSON(200, gin.H{
			"success": true,
			"data": map[string]interface{}{
				"attemptId":  id,
				"questionId": answer.QuestionID,
				"isCorrect":  isCorrect,
			},
		})
	})

	router.POST("/attempts/:id/complete", func(c *gin.Context) {
		id := c.Param("id")
		log.Printf("Completing attempt: %s", id)

		// Parse the attempt ID
		attemptUUID, err := uuid.Parse(id)
		if err != nil {
			log.Printf("Invalid attempt ID: %s, error: %v", id, err)
			c.JSON(400, gin.H{
				"success": false,
				"error":   "Invalid attempt ID format",
			})
			return
		}

		// Get the current attempt
		attempt, err := quizAttemptHandler.repo.GetAttempt(c.Request.Context(), attemptUUID)
		if err != nil {
			c.JSON(404, gin.H{
				"success": false,
				"error":   "Failed to retrieve quiz attempt",
				"details": err.Error(),
			})
			return
		}

		// Update attempt status
		attempt.Status = "completed"
		
		// Calculate final score based on answers (this is simplified)
		// In a real implementation, you might want to recalculate the score
		// by querying all answers from the database
		
		if err := quizAttemptHandler.repo.UpdateAttempt(c.Request.Context(), attempt); err != nil {
			log.Printf("Error completing attempt: %v", err)
			c.JSON(500, gin.H{
				"success": false,
				"error":   "Failed to complete attempt",
				"details": err.Error(),
			})
			return
		}

		c.JSON(200, gin.H{
			"success": true,
			"data": map[string]interface{}{
				"attemptId": id,
				"status":   "completed",
				"score":    attempt.Score,
			},
		})
	})

	// Start server
	log.Printf("Study service starting on port %s", port)
	log.Fatal(router.Run(":" + port))
}
