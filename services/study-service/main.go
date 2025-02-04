package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

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

	// Initialize Gin router
	router := gin.Default()

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

		// TODO: Insert into database

		c.JSON(201, gin.H{
			"success": true,
			"data":    attempt,
		})
	})

	router.GET("/attempts/:id", func(c *gin.Context) {
		id := c.Param("id")
		log.Printf("Getting attempt: %s", id)

		// TODO: Get attempt from database
		attempt := QuizAttempt{
			ID:                 id,
			UserID:            "00000000-0000-0000-0000-000000000001",
			QuizID:            "test-quiz-id",
			Status:            "in_progress",
			CurrentQuestionIndex: 0,
			TotalQuestions:    1,
			Score:             0,
			CreatedAt:         time.Now(),
			UpdatedAt:         time.Now(),
		}

		c.JSON(200, gin.H{
			"success": true,
			"data":    attempt,
		})
	})

	router.GET("/attempts/:id/questions", func(c *gin.Context) {
		id := c.Param("id")
		log.Printf("Getting questions for attempt: %s", id)

		// TODO: Get questions from database
		questions := []map[string]interface{}{
			{
				"id": "test-question-id",
				"text": "What is 2 + 2?",
				"options": []string{"3", "4", "5", "6"},
				"type": "multiple_choice",
				"correctAnswer": "4",
			},
		}

		c.JSON(200, gin.H{
			"success": true,
			"data":    questions,
		})
	})

	router.POST("/attempts/:id/answers", func(c *gin.Context) {
		id := c.Param("id")
		var answer struct {
			QuestionID string `json:"questionId"`
			Answer     string `json:"answer"`
			IsCorrect  bool   `json:"isCorrect"`
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

		// TODO: Save answer to database
		c.JSON(200, gin.H{
			"success": true,
			"data": map[string]interface{}{
				"attemptId": id,
				"questionId": answer.QuestionID,
				"isCorrect": answer.IsCorrect,
			},
		})
	})

	router.POST("/attempts/:id/complete", func(c *gin.Context) {
		id := c.Param("id")
		log.Printf("Completing attempt: %s", id)

		// TODO: Update attempt status in database
		c.JSON(200, gin.H{
			"success": true,
			"data": map[string]interface{}{
				"attemptId": id,
				"status": "completed",
				"score": 0.0,
			},
		})
	})

	// Start server
	log.Printf("Study service starting on port %s", port)
	log.Fatal(router.Run(":" + port))
}
