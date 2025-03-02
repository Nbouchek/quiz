package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

type Quiz struct {
	ID          uuid.UUID  `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	TopicID     uuid.UUID  `json:"topicId"`
	CreatorID   uuid.UUID  `json:"creatorId"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	Questions   []Question `json:"questions,omitempty"`
}

type Question struct {
	ID            uuid.UUID `json:"id"`
	QuizID        uuid.UUID `json:"quizId"`
	Text          string    `json:"text"`
	Type          string    `json:"type"`
	Options       []string  `json:"options"`
	CorrectAnswer string    `json:"correctAnswer"`
	Explanation   string    `json:"explanation"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

func main() {
	log.Printf("Starting content-service...")

	// Database configuration
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "postgres"
	}
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}
	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "postgres"
	}
	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "postgres"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "quizapp_content"
	}

	// Create database connection string
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
	log.Printf("Successfully connected to database")

	// Run database migrations
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		log.Fatalf("Could not create migration driver: %v", err)
	}

	migrationsPath := filepath.Join("migrations")
	m, err := migrate.NewWithDatabaseInstance(
		fmt.Sprintf("file://%s", migrationsPath),
		"postgres",
		driver,
	)
	if err != nil {
		log.Fatalf("Error creating migration instance: %v", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("Error running migrations: %v", err)
	}
	log.Printf("Successfully ran database migrations")

	// Initialize Gin router
	r := gin.Default()

	// Add CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "healthy",
			"service": "content-service",
		})
	})

	// Create quiz endpoint
	r.POST("/quizzes", func(c *gin.Context) {
		var quiz Quiz
		if err := c.ShouldBindJSON(&quiz); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Generate new UUIDs and set timestamps
		now := time.Now().UTC()
		quiz.ID = uuid.New()
		quiz.CreatedAt = now
		quiz.UpdatedAt = now

		// Start a transaction
		tx, err := db.Begin()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
			return
		}
		defer tx.Rollback()

		// Insert quiz
		_, err = tx.Exec(`
			INSERT INTO quizzes (id, title, description, topic_id, creator_id, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, quiz.ID, quiz.Title, quiz.Description, quiz.TopicID, quiz.CreatorID, quiz.CreatedAt, quiz.UpdatedAt)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create quiz"})
			return
		}

		// Insert questions
		for i := range quiz.Questions {
			question := &quiz.Questions[i]
			question.ID = uuid.New()
			question.QuizID = quiz.ID
			question.CreatedAt = now
			question.UpdatedAt = now

			_, err = tx.Exec(`
				INSERT INTO questions (id, quiz_id, text, type, options, correct_answer, explanation, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			`, question.ID, question.QuizID, question.Text, question.Type, question.Options, question.CorrectAnswer,
				question.Explanation, question.CreatedAt, question.UpdatedAt)

			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create question"})
				return
			}
		}

		// Commit transaction
		if err := tx.Commit(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"data": quiz,
		})
	})

	// Get quiz endpoint
	r.GET("/quizzes/:id", func(c *gin.Context) {
		id := c.Param("id")
		quizID, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quiz ID"})
			return
		}

		// Get quiz
		var quiz Quiz
		err = db.QueryRow(`
			SELECT id, title, description, topic_id, creator_id, created_at, updated_at
			FROM quizzes WHERE id = $1
		`, quizID).Scan(
			&quiz.ID,
			&quiz.Title,
			&quiz.Description,
			&quiz.TopicID,
			&quiz.CreatorID,
			&quiz.CreatedAt,
			&quiz.UpdatedAt,
		)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get quiz"})
			return
		}

		// Get questions
		rows, err := db.Query(`
			SELECT id, text, type, options, correct_answer, explanation, created_at, updated_at
			FROM questions WHERE quiz_id = $1
		`, quizID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get questions"})
			return
		}
		defer rows.Close()

		var questions []Question
		for rows.Next() {
			var q Question
			q.QuizID = quizID
			err := rows.Scan(
				&q.ID,
				&q.Text,
				&q.Type,
				&q.Options,
				&q.CorrectAnswer,
				&q.Explanation,
				&q.CreatedAt,
				&q.UpdatedAt,
			)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan question"})
				return
			}
			questions = append(questions, q)
		}

		quiz.Questions = questions
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": quiz,
		})
	})

	// List quizzes endpoint
	r.GET("/quizzes", func(c *gin.Context) {
		rows, err := db.Query(`
			SELECT id, title, description, topic_id, creator_id, created_at, updated_at
			FROM quizzes
		`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get quizzes"})
			return
		}
		defer rows.Close()

		var quizzes []Quiz
		for rows.Next() {
			var q Quiz
			err := rows.Scan(
				&q.ID,
				&q.Title,
				&q.Description,
				&q.TopicID,
				&q.CreatorID,
				&q.CreatedAt,
				&q.UpdatedAt,
			)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan quiz"})
				return
			}
			quizzes = append(quizzes, q)
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": quizzes,
		})
	})

	// Update quiz endpoint
	r.PUT("/quizzes/:id", func(c *gin.Context) {
		id := c.Param("id")
		quizID, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quiz ID"})
			return
		}

		var quiz Quiz
		if err := c.ShouldBindJSON(&quiz); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Start a transaction
		tx, err := db.Begin()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
			return
		}
		defer tx.Rollback()

		// Update quiz
		now := time.Now().UTC()
		result, err := tx.Exec(`
			UPDATE quizzes
			SET title = $1, description = $2, topic_id = $3, updated_at = $4
			WHERE id = $5
		`, quiz.Title, quiz.Description, quiz.TopicID, now, quizID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update quiz"})
			return
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get update result"})
			return
		}

		if rowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
			return
		}

		// Delete existing questions
		_, err = tx.Exec(`DELETE FROM questions WHERE quiz_id = $1`, quizID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete existing questions"})
			return
		}

		// Insert new questions
		for i := range quiz.Questions {
			question := &quiz.Questions[i]
			question.ID = uuid.New()
			question.QuizID = quizID
			question.CreatedAt = now
			question.UpdatedAt = now

			_, err = tx.Exec(`
				INSERT INTO questions (id, quiz_id, text, type, options, correct_answer, explanation, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			`, question.ID, question.QuizID, question.Text, question.Type, question.Options, question.CorrectAnswer,
				question.Explanation, question.CreatedAt, question.UpdatedAt)

			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create question"})
				return
			}
		}

		// Commit transaction
		if err := tx.Commit(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Quiz updated successfully",
		})
	})

	// Delete quiz endpoint
	r.DELETE("/quizzes/:id", func(c *gin.Context) {
		id := c.Param("id")
		quizID, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quiz ID"})
			return
		}

		result, err := db.Exec("DELETE FROM quizzes WHERE id = $1", quizID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete quiz"})
			return
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get delete result"})
			return
		}

		if rowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Quiz deleted successfully",
		})
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	log.Printf("Starting HTTP server on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
