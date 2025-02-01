package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"QuizApp/services/study-service/src/pkg/database"
	"QuizApp/services/study-service/src/pkg/handlers"
	"QuizApp/services/study-service/src/pkg/repository"
)

func main() {
	log.Printf("Starting study-service...")

	// Create a context with cancellation
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	// Initialize database with context
	if err := database.Initialize(ctx); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Initialize repository
	quizAttemptRepo := repository.NewPostgresQuizAttemptRepository(database.GetDB())

	// Initialize handlers
	quizAttemptHandler := handlers.NewQuizAttemptHandler(quizAttemptRepo)

	// Initialize router
	r := gin.Default()

	// Debug logging middleware
	r.Use(func(c *gin.Context) {
		log.Printf("Received request: %s %s", c.Request.Method, c.Request.URL.Path)
		log.Printf("Request headers: %v", c.Request.Header)
		if c.Request.Body != nil {
			bodyBytes, _ := c.GetRawData()
			log.Printf("Request body: %s", string(bodyBytes))
			// Restore the body for further processing
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}
		c.Next()
	})

	// Configure CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// Quiz attempt routes - ensure no leading slashes
	r.POST("/attempts", quizAttemptHandler.StartAttempt)
	r.GET("/attempts/:id", quizAttemptHandler.GetAttempt)
	r.GET("/attempts/:id/questions", quizAttemptHandler.GetQuestions)
	r.POST("/attempts/:id/answers", quizAttemptHandler.SubmitAnswer)
	r.POST("/attempts/:id/complete", quizAttemptHandler.CompleteAttempt)
	r.GET("/users/:id/attempts", quizAttemptHandler.ListUserAttempts)

	// Add a catch-all route for debugging
	r.NoRoute(func(c *gin.Context) {
		log.Printf("No route found for %s %s", c.Request.Method, c.Request.URL.Path)
		c.JSON(404, gin.H{
			"status": 404,
			"error": "Route not found",
			"path": c.Request.URL.Path,
			"success": false,
		})
	})

	// Get port from environment variable
	port := os.Getenv("PORT")
	if port == "" {
		port = "8084" // Default port
	}

	// Create server
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: r,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Study service starting on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	// Graceful shutdown
	log.Println("Shutting down server...")
	ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting")
}
