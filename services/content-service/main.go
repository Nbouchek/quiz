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

type Quiz struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Questions   []Question `json:"questions"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Question struct {
	ID             string   `json:"id"`
	Text           string   `json:"text"`
	Type           string   `json:"type"`
	Options        []string `json:"options"`
	CorrectAnswer  string   `json:"correctAnswer"`
}

type Option struct {
	ID   string `json:"id"`
	Text string `json:"text"`
}

type ApiResponse struct {
	Data  interface{} `json:"data"`
	Error string      `json:"error,omitempty"`
}

const defaultPort = "8081"

func initDB(db *sql.DB) error {
	// Create quizzes table
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS quizzes (
			id VARCHAR(36) PRIMARY KEY,
			title TEXT NOT NULL,
			description TEXT NOT NULL,
			questions JSONB NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`)
	return err
}

func createQuiz(db *sql.DB, quiz *Quiz) error {
	quiz.ID = uuid.New().String()
	quiz.CreatedAt = time.Now()
	quiz.UpdatedAt = time.Now()

	// Add IDs to questions if they don't have them
	for i := range quiz.Questions {
		if quiz.Questions[i].ID == "" {
			quiz.Questions[i].ID = fmt.Sprintf("q%d", i+1)
		}
	}

	questionsJSON, err := json.Marshal(quiz.Questions)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		INSERT INTO quizzes (id, title, description, questions, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, quiz.ID, quiz.Title, quiz.Description, questionsJSON, quiz.CreatedAt, quiz.UpdatedAt)
	return err
}

func getQuiz(db *sql.DB, id string) (*Quiz, error) {
	var quiz Quiz
	var questionsJSON []byte

	err := db.QueryRow(`
		SELECT id, title, description, questions, created_at, updated_at
		FROM quizzes WHERE id = $1
	`, id).Scan(&quiz.ID, &quiz.Title, &quiz.Description, &questionsJSON, &quiz.CreatedAt, &quiz.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// First unmarshal into a temporary struct that matches the database schema
	type DBQuestion struct {
		ID             string   `json:"id"`
		Text           string   `json:"text"`
		Type           string   `json:"type"`
		Options        []Option `json:"options"`
		CorrectOptionID string  `json:"correctOptionId"`
	}
	var dbQuestions []DBQuestion
	err = json.Unmarshal(questionsJSON, &dbQuestions)
	if err != nil {
		return nil, err
	}

	// Transform questions to match frontend expectations
	quiz.Questions = make([]Question, len(dbQuestions))
	for i, dbq := range dbQuestions {
		quiz.Questions[i] = Question{
			ID:   dbq.ID,
			Text: dbq.Text,
			Type: dbq.Type,
		}
		// Convert options from Option objects to strings
		quiz.Questions[i].Options = make([]string, len(dbq.Options))
		for j, opt := range dbq.Options {
			quiz.Questions[i].Options[j] = opt.Text
			if opt.ID == dbq.CorrectOptionID {
				quiz.Questions[i].CorrectAnswer = opt.Text
			}
		}
	}

	return &quiz, nil
}

func getQuizzes(db *sql.DB) ([]Quiz, error) {
	rows, err := db.Query(`
		SELECT id, title, description, questions, created_at, updated_at
		FROM quizzes ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var quizzes []Quiz
	for rows.Next() {
		var quiz Quiz
		var questionsJSON []byte
		err := rows.Scan(&quiz.ID, &quiz.Title, &quiz.Description, &questionsJSON, &quiz.CreatedAt, &quiz.UpdatedAt)
		if err != nil {
			return nil, err
		}

		// First unmarshal into a temporary struct that matches the database schema
		type DBQuestion struct {
			ID             string   `json:"id"`
			Text           string   `json:"text"`
			Type           string   `json:"type"`
			Options        []Option `json:"options"`
			CorrectOptionID string  `json:"correctOptionId"`
		}
		var dbQuestions []DBQuestion
		err = json.Unmarshal(questionsJSON, &dbQuestions)
		if err != nil {
			return nil, err
		}

		// Transform questions to match frontend expectations
		quiz.Questions = make([]Question, len(dbQuestions))
		for i, dbq := range dbQuestions {
			quiz.Questions[i] = Question{
				ID:   dbq.ID,
				Text: dbq.Text,
				Type: dbq.Type,
			}
			// Convert options from Option objects to strings
			quiz.Questions[i].Options = make([]string, len(dbq.Options))
			for j, opt := range dbq.Options {
				quiz.Questions[i].Options[j] = opt.Text
				if opt.ID == dbq.CorrectOptionID {
					quiz.Questions[i].CorrectAnswer = opt.Text
				}
			}
		}

		quizzes = append(quizzes, quiz)
	}

	return quizzes, nil
}

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
			"service": "content-service",
		})
	})

	// Initialize database tables
	if err := initDB(db); err != nil {
		log.Fatalf("Error initializing database: %v", err)
	}

	// Quiz routes
	api := router.Group("/api")
	{
		quizzes := api.Group("/quizzes")
		{
			quizzes.POST("", func(c *gin.Context) {
				var quiz Quiz
				if err := c.ShouldBindJSON(&quiz); err != nil {
					c.JSON(400, ApiResponse{Error: err.Error()})
					return
				}

				err := createQuiz(db, &quiz)
				if err != nil {
					c.JSON(500, ApiResponse{Error: "Failed to create quiz"})
					return
				}

				c.JSON(201, ApiResponse{Data: quiz})
			})

			quizzes.GET("", func(c *gin.Context) {
				quizzes, err := getQuizzes(db)
				if err != nil {
					c.JSON(500, ApiResponse{Error: "Failed to fetch quizzes"})
					return
				}

				c.JSON(200, ApiResponse{Data: quizzes})
			})

			quizzes.GET("/:id", func(c *gin.Context) {
				id := c.Param("id")
				quiz, err := getQuiz(db, id)
				if err != nil {
					c.JSON(500, ApiResponse{Error: "Failed to fetch quiz"})
					return
				}
				if quiz == nil {
					c.JSON(404, ApiResponse{Error: "Quiz not found"})
					return
				}

				c.JSON(200, ApiResponse{Data: quiz})
			})

			quizzes.PATCH("/:id", func(c *gin.Context) {
				// TODO: Add database operations
				// For now, return 404
				c.JSON(404, ApiResponse{Error: "Quiz not found"})
			})

			quizzes.DELETE("/:id", func(c *gin.Context) {
				// TODO: Add database operations
				// For now, return success
				c.JSON(200, ApiResponse{})
			})
		}
	}

	// Start server
	log.Printf("Content service starting on port %s", port)
	log.Fatal(router.Run(":" + port))
}
