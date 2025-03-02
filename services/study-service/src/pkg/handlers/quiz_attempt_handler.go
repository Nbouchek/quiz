package handlers

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"QuizApp/services/study-service/src/pkg/models"
	"QuizApp/services/study-service/src/pkg/repository"
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
	var input struct {
		UserID         string `json:"userId" binding:"required"`
		QuizID         string `json:"quizId" binding:"required"`
		TotalQuestions int    `json:"totalQuestions" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		log.Printf("StartAttempt: Invalid input - %v", err)
		log.Printf("Request body: %v", c.Request.Body)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid input format",
			"details": err.Error(),
		})
		return
	}

	log.Printf("StartAttempt: Received request with userId: %s, quizId: %s, totalQuestions: %d", 
		input.UserID, input.QuizID, input.TotalQuestions)

	// Parse UUIDs from string
	userID, err := uuid.Parse(input.UserID)
	if err != nil {
		log.Printf("StartAttempt: Invalid userId - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid user ID format",
			"details": err.Error(),
		})
		return
	}

	quizID, err := uuid.Parse(input.QuizID)
	if err != nil {
		log.Printf("StartAttempt: Invalid quizId - %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid quiz ID format",
			"details": err.Error(),
		})
		return
	}

	// Validate totalQuestions
	if input.TotalQuestions <= 0 {
		log.Printf("StartAttempt: Invalid totalQuestions: %d", input.TotalQuestions)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Total questions must be greater than 0",
		})
		return
	}

	modelAttempt := models.NewQuizAttempt(userID, quizID, input.TotalQuestions)
	attempt := &repository.QuizAttempt{
		ID:             modelAttempt.ID,
		UserID:         modelAttempt.UserID,
		QuizID:         modelAttempt.QuizID,
		Status:         string(modelAttempt.Status),
		TotalQuestions: modelAttempt.TotalQuestions,
		CorrectAnswers: 0, // Start with 0 correct answers
		Score:          modelAttempt.Score,
		StartedAt:      modelAttempt.StartedAt,
		CompletedAt:    modelAttempt.CompletedAt,
		CreatedAt:      modelAttempt.CreatedAt,
		UpdatedAt:      modelAttempt.UpdatedAt,
		
		// Set the derived field
		CurrentQuestionIndex: 0,
	}

	log.Printf("StartAttempt: Creating attempt with ID: %s", attempt.ID)

	if err := h.repo.CreateAttempt(c.Request.Context(), attempt); err != nil {
		log.Printf("StartAttempt: Failed to create attempt - %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create attempt",
			"details": err.Error(),
		})
		return
	}

	log.Printf("StartAttempt: Successfully created attempt with ID: %s", attempt.ID)

	// Set the current question index in the response model
	modelAttempt.CurrentQuestionIndex = 0

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    modelAttempt,
	})
}

// GetAttempt handles GET /attempts/:id
func (h *QuizAttemptHandler) GetAttempt(c *gin.Context) {
	attemptID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid attempt ID",
			"details": err.Error(),
		})
		return
	}

	attempt, err := h.repo.GetAttempt(c.Request.Context(), attemptID)
	if err == repository.ErrAttemptNotFound {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Attempt not found",
		})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get attempt",
			"details": err.Error(),
		})
		return
	}

	modelAttempt := &models.QuizAttempt{
		ID:                  attempt.ID,
		UserID:             attempt.UserID,
		QuizID:             attempt.QuizID,
		Status:             models.AttemptStatus(attempt.Status),
		CurrentQuestionIndex: attempt.CurrentQuestionIndex,
		TotalQuestions:     attempt.TotalQuestions,
		Score:              attempt.Score,
		StartedAt:          attempt.StartedAt,
		CompletedAt:        attempt.CompletedAt,
		CreatedAt:          attempt.CreatedAt,
		UpdatedAt:          attempt.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    modelAttempt,
	})
}

// GetQuestions handles GET /attempts/:id/questions
func (h *QuizAttemptHandler) GetQuestions(c *gin.Context) {
	attemptID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid attempt ID",
			"details": err.Error(),
		})
		return
	}

	log.Printf("DEBUG: GetQuestions handler called for attempt ID: %s", attemptID.String())
	attempt, err := h.repo.GetAttempt(c.Request.Context(), attemptID)
	if err == repository.ErrAttemptNotFound {
		log.Printf("DEBUG: Attempt not found: %s", attemptID.String())
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Attempt not found",
		})
		return
	}
	if err != nil {
		log.Printf("DEBUG: Error getting attempt: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get attempt",
			"details": err.Error(),
		})
		return
	}

	log.Printf("DEBUG: Retrieved attempt for quiz ID: %s", attempt.QuizID.String())
	log.Printf("DEBUG: Current question index: %d, Total questions: %d, Correct answers: %d", 
		attempt.CurrentQuestionIndex, attempt.TotalQuestions, attempt.CorrectAnswers)

	// Let's check if the actual questions from content service match our hardcoded ones
	questions, err := h.repo.GetQuestions(c.Request.Context(), attempt.QuizID)
	if err != nil {
		log.Printf("DEBUG: Error getting questions from content service: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get questions",
			"details": err.Error(),
		})
		return
	}

	log.Printf("DEBUG: Content service returned %d questions", len(questions))
	for i, q := range questions {
		log.Printf("DEBUG: Question %d: %s", i+1, q.Text)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    questions,
	})
}

// SubmitAnswer handles POST /attempts/:id/answers
func (h *QuizAttemptHandler) SubmitAnswer(c *gin.Context) {
	attemptID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		log.Printf("ERROR: Invalid attempt ID: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid attempt ID",
			"details": err.Error(),
		})
		return
	}

	// Log the raw request body for debugging
	var rawData interface{}
	rawBody, err := c.GetRawData()
	if err != nil {
		log.Printf("ERROR: Failed to read raw request body: %v", err)
	} else {
		log.Printf("DEBUG: Raw request body: %s", string(rawBody))
		if err := json.Unmarshal(rawBody, &rawData); err != nil {
			log.Printf("ERROR: Failed to parse raw request body as JSON: %v", err)
		} else {
			log.Printf("DEBUG: Parsed request body: %+v", rawData)
		}
		// Restore the request body for binding
		c.Request.Body = ioutil.NopCloser(bytes.NewBuffer(rawBody))
	}

	// Create a more flexible input struct for parsing
	var jsonInput struct {
		QuestionID interface{} `json:"questionId"`
		Answer     string      `json:"answer"`
		IsCorrect  bool        `json:"isCorrect"`
	}

	if err := json.Unmarshal(rawBody, &jsonInput); err != nil {
		log.Printf("ERROR: Failed to parse input JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid input JSON",
			"details": err.Error(),
		})
		return
	}

	// Now convert the questionId to UUID based on its type
	var questionIDUUID uuid.UUID
	
	switch qid := jsonInput.QuestionID.(type) {
	case string:
		// If questionId is a string, try to parse it as UUID
		log.Printf("DEBUG: QuestionID is a string: %s", qid)
		parsedUUID, err := uuid.Parse(qid)
		if err != nil {
			log.Printf("ERROR: Failed to parse questionId as UUID: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid question ID format",
				"details": "Question ID must be a valid UUID",
			})
			return
		}
		questionIDUUID = parsedUUID
	case map[string]interface{}:
		// Handle the case where questionId might be a JSON object with UUID fields
		log.Printf("ERROR: QuestionID is a JSON object, expected string UUID")
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid question ID format",
			"details": "Question ID must be a string UUID, received a JSON object",
		})
		return
	default:
		log.Printf("ERROR: QuestionID has unexpected type: %T", qid)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid question ID format",
			"details": "Question ID must be a string UUID",
		})
		return
	}

	// Now use the parsed UUID and other values from jsonInput
	input := struct {
		QuestionID uuid.UUID
		Answer     string
		IsCorrect  bool
	}{
		QuestionID: questionIDUUID,
		Answer:     jsonInput.Answer,
		IsCorrect:  jsonInput.IsCorrect,
	}

	log.Printf("DEBUG: Submitting answer for attempt ID: %s, question ID: %s, answer: %s, isCorrect: %v", 
		attemptID, input.QuestionID, input.Answer, input.IsCorrect)

	attempt, err := h.repo.GetAttempt(c.Request.Context(), attemptID)
	if err == repository.ErrAttemptNotFound {
		log.Printf("ERROR: Attempt not found: %s", attemptID)
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Attempt not found",
		})
		return
	}
	if err != nil {
		log.Printf("ERROR: Failed to get attempt: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get attempt",
			"details": err.Error(),
		})
		return
	}

	if attempt.Status != string(models.AttemptStatusInProgress) {
		log.Printf("ERROR: Attempt is not in progress: %s", attemptID)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Attempt is not in progress",
		})
		return
	}

	log.Printf("DEBUG: Current attempt state: ID: %s, quiz ID: %s, correctAnswers: %d, score: %f", 
		attempt.ID, attempt.QuizID, attempt.CorrectAnswers, attempt.Score)

	modelAttempt := &models.QuizAttempt{
		ID:                  attempt.ID,
		UserID:             attempt.UserID,
		QuizID:             attempt.QuizID,
		Status:             models.AttemptStatus(attempt.Status),
		CurrentQuestionIndex: attempt.CurrentQuestionIndex,
		TotalQuestions:     attempt.TotalQuestions,
		Score:              attempt.Score,
		StartedAt:          attempt.StartedAt,
		CompletedAt:        attempt.CompletedAt,
		CreatedAt:          attempt.CreatedAt,
		UpdatedAt:          attempt.UpdatedAt,
	}

	answer := modelAttempt.Submit(input.QuestionID, input.Answer, input.IsCorrect)

	// Update repository attempt with model changes
	if input.IsCorrect {
		attempt.CorrectAnswers++
	}
	attempt.Score = modelAttempt.Score
	attempt.UpdatedAt = modelAttempt.UpdatedAt

	log.Printf("DEBUG: Updated attempt state: correctAnswers: %d, score: %f", 
		attempt.CorrectAnswers, attempt.Score)

	repoAnswer := &repository.Answer{
		ID:         answer.ID,
		AttemptID:  answer.AttemptID,
		QuestionID: answer.QuestionID,
		Answer:     answer.Answer,
		IsCorrect:  answer.IsCorrect,
		CreatedAt:  answer.CreatedAt,
	}

	if err := h.repo.AddAnswer(c.Request.Context(), repoAnswer); err != nil {
		log.Printf("ERROR: Failed to save answer: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to save answer",
			"details": err.Error(),
		})
		return
	}

	if err := h.repo.UpdateAttempt(c.Request.Context(), attempt); err != nil {
		log.Printf("ERROR: Failed to update attempt: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update attempt",
			"details": err.Error(),
		})
		return
	}

	log.Printf("DEBUG: Successfully submitted answer for attempt ID: %s", attemptID)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    answer,
	})
}

// CompleteAttempt handles POST /attempts/:id/complete
func (h *QuizAttemptHandler) CompleteAttempt(c *gin.Context) {
	attemptID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid attempt ID",
			"details": err.Error(),
		})
		return
	}

	attempt, err := h.repo.GetAttempt(c.Request.Context(), attemptID)
	if err == repository.ErrAttemptNotFound {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Attempt not found",
		})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get attempt",
			"details": err.Error(),
		})
		return
	}

	if attempt.Status != string(models.AttemptStatusInProgress) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Attempt is not in progress",
		})
		return
	}

	modelAttempt := &models.QuizAttempt{
		ID:                  attempt.ID,
		UserID:             attempt.UserID,
		QuizID:             attempt.QuizID,
		Status:             models.AttemptStatus(attempt.Status),
		CurrentQuestionIndex: attempt.CurrentQuestionIndex,
		TotalQuestions:     attempt.TotalQuestions,
		Score:              attempt.Score,
		StartedAt:          attempt.StartedAt,
		CompletedAt:        attempt.CompletedAt,
		CreatedAt:          attempt.CreatedAt,
		UpdatedAt:          attempt.UpdatedAt,
	}

	modelAttempt.Complete()

	// Update repository attempt with model changes
	attempt.Status = string(modelAttempt.Status)
	attempt.CompletedAt = modelAttempt.CompletedAt
	attempt.UpdatedAt = modelAttempt.UpdatedAt

	if err := h.repo.UpdateAttempt(c.Request.Context(), attempt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to complete attempt",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    modelAttempt,
	})
}

// ListUserAttempts handles GET /users/:id/attempts
func (h *QuizAttemptHandler) ListUserAttempts(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid user ID",
			"details": err.Error(),
		})
		return
	}

	limit := 10
	offset := 0
	if limitStr := c.Query("limit"); limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil && n > 0 {
			limit = n
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if n, err := strconv.Atoi(offsetStr); err == nil && n >= 0 {
			offset = n
		}
	}

	attempts, err := h.repo.ListUserAttempts(c.Request.Context(), userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list attempts",
			"details": err.Error(),
		})
		return
	}

	// Convert repository attempts to model attempts
	modelAttempts := make([]*models.QuizAttempt, len(attempts))
	for i, attempt := range attempts {
		modelAttempts[i] = &models.QuizAttempt{
			ID:                  attempt.ID,
			UserID:             attempt.UserID,
			QuizID:             attempt.QuizID,
			Status:             models.AttemptStatus(attempt.Status),
			CurrentQuestionIndex: attempt.CurrentQuestionIndex,
			TotalQuestions:     attempt.TotalQuestions,
			Score:              attempt.Score,
			StartedAt:          attempt.StartedAt,
			CompletedAt:        attempt.CompletedAt,
			CreatedAt:          attempt.CreatedAt,
			UpdatedAt:          attempt.UpdatedAt,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    modelAttempts,
	})
} 