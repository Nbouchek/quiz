package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/QuizApp/QuizApp/services/study-service/src/pkg/models"
	"github.com/QuizApp/QuizApp/services/study-service/src/pkg/repository"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// QuizAttemptHandler handles HTTP requests for quiz attempts
type QuizAttemptHandler struct {
	repo repository.QuizAttemptRepository
}

// NewQuizAttemptHandler creates a new QuizAttemptHandler
func NewQuizAttemptHandler(repo repository.QuizAttemptRepository) *QuizAttemptHandler {
	return &QuizAttemptHandler{repo: repo}
}

// StartAttempt handles POST /attempts
func (h *QuizAttemptHandler) StartAttempt(c *gin.Context) {
	log.Printf("StartAttempt: Received request")
	
	var input struct {
		UserID         uuid.UUID `json:"userId" binding:"required"`
		QuizID         uuid.UUID `json:"quizId" binding:"required"`
		TotalQuestions int       `json:"totalQuestions" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		log.Printf("StartAttempt: Invalid input - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"status": http.StatusBadRequest,
			"error": "Invalid input",
			"success": false,
		})
		return
	}

	log.Printf("StartAttempt: Creating attempt for user %s, quiz %s, total questions %d", 
		input.UserID, input.QuizID, input.TotalQuestions)

	attempt := models.NewQuizAttempt(input.UserID, input.QuizID, input.TotalQuestions)
	if err := h.repo.CreateAttempt(c.Request.Context(), attempt); err != nil {
		log.Printf("StartAttempt: Failed to create attempt - %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": http.StatusInternalServerError,
			"error": "Failed to create attempt",
			"success": false,
		})
		return
	}

	log.Printf("StartAttempt: Successfully created attempt %s", attempt.ID)
	c.JSON(http.StatusCreated, gin.H{
		"status": http.StatusCreated,
		"data": attempt,
		"success": true,
	})
}

// SubmitAnswer handles POST /attempts/:id/answers
func (h *QuizAttemptHandler) SubmitAnswer(c *gin.Context) {
	attemptID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid attempt ID"})
		return
	}

	var input struct {
		QuestionID uuid.UUID `json:"questionId" binding:"required"`
		Answer     string    `json:"answer" binding:"required"`
		IsCorrect  bool      `json:"isCorrect" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	attempt, err := h.repo.GetAttempt(c.Request.Context(), attemptID)
	if err == repository.ErrAttemptNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "Attempt not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get attempt"})
		return
	}

	if attempt.Status != models.AttemptStatusInProgress {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Attempt is not in progress"})
		return
	}

	answer := attempt.Submit(input.QuestionID, input.Answer, input.IsCorrect)
	
	if err := h.repo.AddAnswer(c.Request.Context(), &answer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save answer"})
		return
	}

	if err := h.repo.UpdateAttempt(c.Request.Context(), attempt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update attempt"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": answer,
		"success": true,
	})
}

// CompleteAttempt handles POST /attempts/:id/complete
func (h *QuizAttemptHandler) CompleteAttempt(c *gin.Context) {
	attemptID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid attempt ID"})
		return
	}

	attempt, err := h.repo.GetAttempt(c.Request.Context(), attemptID)
	if err == repository.ErrAttemptNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "Attempt not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get attempt"})
		return
	}

	if attempt.Status != models.AttemptStatusInProgress {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Attempt is not in progress"})
		return
	}

	attempt.Complete()
	
	if err := h.repo.UpdateAttempt(c.Request.Context(), attempt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete attempt"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": attempt,
		"success": true,
	})
}

// GetAttempt handles GET /attempts/:id
func (h *QuizAttemptHandler) GetAttempt(c *gin.Context) {
	attemptID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid attempt ID"})
		return
	}

	attempt, err := h.repo.GetAttempt(c.Request.Context(), attemptID)
	if err == repository.ErrAttemptNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "Attempt not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get attempt"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": attempt,
		"success": true,
	})
}

// ListUserAttempts handles GET /users/:id/attempts
func (h *QuizAttemptHandler) ListUserAttempts(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	limit := 10
	offset := 0
	if limitStr := c.Query("limit"); limitStr != "" {
		if n, err := json.Number(limitStr).Int64(); err == nil {
			limit = int(n)
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if n, err := json.Number(offsetStr).Int64(); err == nil {
			offset = int(n)
		}
	}

	attempts, err := h.repo.ListUserAttempts(c.Request.Context(), userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list attempts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": attempts,
		"success": true,
	})
}

// GetQuestions handles GET /attempts/:id/questions
func (h *QuizAttemptHandler) GetQuestions(c *gin.Context) {
	attemptID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": http.StatusBadRequest,
			"error": "Invalid attempt ID",
			"success": false,
		})
		return
	}

	attempt, err := h.repo.GetAttempt(c.Request.Context(), attemptID)
	if err == repository.ErrAttemptNotFound {
		c.JSON(http.StatusNotFound, gin.H{
			"status": http.StatusNotFound,
			"error": "Attempt not found",
			"success": false,
		})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": http.StatusInternalServerError,
			"error": "Failed to get attempt",
			"success": false,
		})
		return
	}

	questions, err := h.repo.GetQuestions(c.Request.Context(), attempt.QuizID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": http.StatusInternalServerError,
			"error": "Failed to get questions",
			"success": false,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": http.StatusOK,
		"data": questions,
		"success": true,
	})
} 