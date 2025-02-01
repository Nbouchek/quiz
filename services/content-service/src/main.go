package main

import (
	"log"

	"github.com/QuizApp/content-service/src/pkg/database"
	"github.com/QuizApp/content-service/src/pkg/handlers"
	"github.com/QuizApp/content-service/src/pkg/repository"
	"github.com/gin-gonic/gin"
)

func main() {
    log.Printf("Starting content-service...")
    
    // Initialize database
    if err := database.Initialize(); err != nil {
        log.Fatalf("Failed to initialize database: %v", err)
    }
    defer database.Close()

    // Initialize repository
    repo := repository.NewPostgresContentRepository(database.GetDB())

    // Initialize handlers
    quizHandler := handlers.NewQuizHandler(repo)

    // Initialize router
    r := gin.Default()

    // Health check
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "status": "healthy",
            "service": "content-service",
        })
    })

    // Quiz routes - handle both /api/quizzes and /quizzes
    quizzes := r.Group("/quizzes")
    {
        quizzes.GET("/", quizHandler.ListQuizzes)
        quizzes.GET("/:id", quizHandler.GetQuiz)
        quizzes.POST("/", quizHandler.CreateQuiz)
        quizzes.PATCH("/:id", quizHandler.UpdateQuiz)
        quizzes.DELETE("/:id", quizHandler.DeleteQuiz)
    }

    api := r.Group("/api")
    {
        apiQuizzes := api.Group("/quizzes")
        {
            apiQuizzes.GET("/", quizHandler.ListQuizzes)
            apiQuizzes.GET("/:id", quizHandler.GetQuiz)
            apiQuizzes.POST("/", quizHandler.CreateQuiz)
            apiQuizzes.PATCH("/:id", quizHandler.UpdateQuiz)
            apiQuizzes.DELETE("/:id", quizHandler.DeleteQuiz)
        }
    }

    r.Run(":8081")
}
