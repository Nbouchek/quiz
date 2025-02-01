package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/QuizApp/content-service/src/pkg/models"
	"github.com/QuizApp/content-service/src/pkg/repository"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// QuizHandler handles HTTP requests for quiz operations
type QuizHandler struct {
	repo repository.ContentRepository
}

// NewQuizHandler creates a new QuizHandler instance
func NewQuizHandler(repo repository.ContentRepository) *QuizHandler {
	return &QuizHandler{repo: repo}
}

// GetQuiz handles GET /api/quizzes/:id
func (h *QuizHandler) GetQuiz(c *gin.Context) {
	quizId, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quiz ID"})
		return
	}

	log.Printf("Fetching quiz with ID: %s", quizId)
	quiz, err := h.repo.GetQuiz(c.Request.Context(), quizId)
	if err == repository.ErrQuizNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
		return
	} else if err != nil {
		log.Printf("Error fetching quiz: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch quiz"})
		return
	}

	log.Printf("Fetching questions for quiz: %s", quizId)
	questions, err := h.repo.ListQuizQuestions(c.Request.Context(), quizId)
	if err != nil {
		log.Printf("Error fetching questions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch quiz questions"})
		return
	}

	// Include questions in the quiz object
	quiz.Questions = questions
	log.Printf("Returning quiz with %d questions", len(questions))

	response := gin.H{
		"data":    quiz,
		"success": true,
	}
	log.Printf("Response data: %+v", response)
	c.JSON(http.StatusOK, response)
}

// CreateQuiz handles POST /api/quizzes
func (h *QuizHandler) CreateQuiz(c *gin.Context) {
	log.Printf("Received quiz creation request")
	
	var input struct {
		Title       string           `json:"title"`
		Description string           `json:"description"`
		TopicID     *uuid.UUID      `json:"topicId,omitempty"`
		Questions   []models.Question `json:"questions"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		log.Printf("Failed to bind JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	log.Printf("Creating quiz with title: %s, description: %s", input.Title, input.Description)
	if input.TopicID != nil {
		log.Printf("TopicID: %s", *input.TopicID)
	} else {
		log.Printf("No topic ID provided")
	}
	log.Printf("Questions: %+v", input.Questions)

	// Use a default user ID for now
	defaultUserID := uuid.MustParse("00000000-0000-0000-0000-000000000001")

	quiz := &models.Quiz{
		ID:          uuid.New(),
		Title:       input.Title,
		Description: input.Description,
		CreatorID:   defaultUserID,
	}
	
	if input.TopicID != nil {
		quiz.TopicID = input.TopicID
	}

	log.Printf("Saving quiz to database with ID: %s", quiz.ID)
	if err := h.repo.CreateQuiz(c.Request.Context(), quiz); err != nil {
		log.Printf("Failed to create quiz: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create quiz"})
		return
	}

	// Create questions
	var questions []*models.Question
	for i, q := range input.Questions {
		question := q // Create a new variable to avoid using the loop variable address
		question.ID = uuid.New()
		question.QuizID = quiz.ID
		log.Printf("Creating question %d with ID: %s", i+1, question.ID)
		if err := h.repo.AddQuestion(c.Request.Context(), &question); err != nil {
			log.Printf("Failed to create question: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create quiz questions"})
			return
		}
		questions = append(questions, &question)
	}

	// Add questions to the quiz object for the response
	quiz.Questions = questions

	log.Printf("Successfully created quiz with ID: %s and %d questions", quiz.ID, len(questions))
	c.JSON(http.StatusCreated, gin.H{
		"data": quiz,
		"success": true,
	})
}

// UpdateQuiz handles PATCH /api/quizzes/:id
func (h *QuizHandler) UpdateQuiz(c *gin.Context) {
	quizId, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quiz ID"})
		return
	}

	var input struct {
		Title       *string           `json:"title"`
		Description *string           `json:"description"`
		Questions   []models.Question `json:"questions"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	quiz, err := h.repo.GetQuiz(c.Request.Context(), quizId)
	if err == repository.ErrQuizNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch quiz"})
		return
	}

	// Only update fields that were provided
	if input.Title != nil {
		quiz.Title = *input.Title
	}
	if input.Description != nil {
		quiz.Description = *input.Description
	}

	if err := h.repo.UpdateQuiz(c.Request.Context(), quiz); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update quiz"})
		return
	}

	// If questions were provided, replace all existing questions
	if input.Questions != nil {
		// Delete existing questions one by one
		questions, err := h.repo.ListQuizQuestions(c.Request.Context(), quizId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch existing questions"})
			return
		}
		for _, q := range questions {
			if err := h.repo.DeleteQuestion(c.Request.Context(), q.ID); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete existing questions"})
				return
			}
		}

		// Add new questions
		for _, q := range input.Questions {
			q.ID = uuid.New()
			q.QuizID = quiz.ID
			if err := h.repo.AddQuestion(c.Request.Context(), &q); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update quiz questions"})
				return
			}
		}
	}

	// Return the updated quiz
	h.GetQuiz(c)
}

// DeleteQuiz handles DELETE /api/quizzes/:id
func (h *QuizHandler) DeleteQuiz(c *gin.Context) {
	quizId, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quiz ID"})
		return
	}

	if err := h.repo.DeleteQuiz(c.Request.Context(), quizId); err != nil {
		if err == repository.ErrQuizNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete quiz"})
		return
	}

	c.Status(http.StatusNoContent)
}

// ListQuizzes handles GET /api/quizzes
func (h *QuizHandler) ListQuizzes(c *gin.Context) {
	page := 1
	pageSize := 10

	// Parse pagination parameters if provided
	if p := c.Query("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}
	if ps := c.Query("pageSize"); ps != "" {
		if val, err := strconv.Atoi(ps); err == nil && val > 0 {
			pageSize = val
		}
	}

	quizzes, err := h.repo.ListQuizzes(c.Request.Context(), page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch quizzes"})
		return
	}

	// Fetch questions for each quiz
	for _, quiz := range quizzes {
		questions, err := h.repo.ListQuizQuestions(c.Request.Context(), quiz.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch quiz questions"})
			return
		}
		quiz.Questions = questions
	}

	c.JSON(http.StatusOK, gin.H{
		"data": quizzes,
		"success": true,
	})
}

// ListUserQuizzes handles GET /api/users/:id/quizzes
func (h *QuizHandler) ListUserQuizzes(c *gin.Context) {
	userId, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	page := 1
	pageSize := 10

	// Parse pagination parameters if provided
	if p := c.Query("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}
	if ps := c.Query("pageSize"); ps != "" {
		if val, err := strconv.Atoi(ps); err == nil && val > 0 {
			pageSize = val
		}
	}

	quizzes, err := h.repo.ListUserQuizzes(c.Request.Context(), userId, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user quizzes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"quizzes": quizzes,
	})
}

// SearchQuizzes handles GET /api/quizzes/search
func (h *QuizHandler) SearchQuizzes(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query is required"})
		return
	}

	page := 1
	pageSize := 10

	// Parse pagination parameters if provided
	if p := c.Query("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}
	if ps := c.Query("pageSize"); ps != "" {
		if val, err := strconv.Atoi(ps); err == nil && val > 0 {
			pageSize = val
		}
	}

	quizzes, err := h.repo.SearchQuizzes(c.Request.Context(), query, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search quizzes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"quizzes": quizzes,
	})
}

// GetQuizQuestions handles GET /api/quizzes/:id/questions
func (h *QuizHandler) GetQuizQuestions(c *gin.Context) {
	quizId, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quiz ID"})
		return
	}

	log.Printf("Fetching questions for quiz: %s", quizId)
	questions, err := h.repo.ListQuizQuestions(c.Request.Context(), quizId)
	if err != nil {
		log.Printf("Error fetching questions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch quiz questions"})
		return
	}

	log.Printf("Returning %d questions", len(questions))
	c.JSON(http.StatusOK, gin.H{
		"data": questions,
		"success": true,
	})
} 