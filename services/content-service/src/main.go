package main

import (
	"log"

	"QuizApp/services/content-service/src/pkg/database"
	"QuizApp/services/content-service/src/pkg/handlers"
	"QuizApp/services/content-service/src/pkg/repository"

	"github.com/gin-contrib/cors"
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

    // Configure CORS
    r.Use(cors.New(cors.Config{
        AllowOrigins:     []string{"http://localhost:3000"},
        AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
        AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
        ExposeHeaders:    []string{"Content-Length"},
        AllowCredentials: true,
        MaxAge:           12 * 60 * 60,
    }))

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
        quizzes.GET("/:id/questions", quizHandler.GetQuizQuestions)
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
            apiQuizzes.GET("/:id/questions", quizHandler.GetQuizQuestions)
            apiQuizzes.POST("/", quizHandler.CreateQuiz)
            apiQuizzes.PATCH("/:id", quizHandler.UpdateQuiz)
            apiQuizzes.DELETE("/:id", quizHandler.DeleteQuiz)
        }
    }

    r.Run(":8081")
}
