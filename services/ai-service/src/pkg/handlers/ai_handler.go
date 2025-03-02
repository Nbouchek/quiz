package handlers

import (
	"encoding/json"
	"net/http"

	"QuizApp/services/ai-service/src/pkg/api"
	"QuizApp/services/ai-service/src/pkg/middleware"
	"QuizApp/services/ai-service/src/pkg/service"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

// AIHandler handles HTTP requests for AI operations
type AIHandler struct {
	service *service.AIService
	logger  *zap.Logger
}

// NewAIHandler creates a new AI handler and registers routes
func NewAIHandler(router *mux.Router, service *service.AIService, logger *zap.Logger) {
	handler := &AIHandler{
		service: service,
		logger:  logger,
	}

	// Register routes with validation middleware
	router.Handle("/api/v1/ai/generate",
		middleware.ValidateRequest(api.GenerateContentRequest{}, logger)(
			http.HandlerFunc(handler.GenerateContent))).Methods("POST")

	router.Handle("/api/v1/ai/feedback/{generationId}",
		middleware.ValidateRequest(api.SaveFeedbackRequest{}, logger)(
			http.HandlerFunc(handler.SaveFeedback))).Methods("POST")

	router.HandleFunc("/api/v1/ai/stats/{userId}", handler.GetUserStats).Methods("GET")
}

// GenerateContent handles content generation requests
func (h *AIHandler) GenerateContent(w http.ResponseWriter, r *http.Request) {
	// Get validated request from context
	req := r.Context().Value("validated_request").(*api.GenerateContentRequest)

	userID, _ := uuid.Parse(req.UserID)   // Already validated by middleware
	modelID, _ := uuid.Parse(req.ModelID) // Already validated by middleware
	promptID, _ := uuid.Parse(req.PromptID) // Already validated by middleware

	generation, err := h.service.GenerateContent(r.Context(), userID, modelID, promptID, req.Params)
	if err != nil {
		h.logger.Error("Failed to generate content", zap.Error(err))
		writeError(w, api.NewErrorResponse(
			api.ErrCodeInternal,
			"Failed to generate content",
			nil,
		))
		return
	}

	// Convert to response model
	response := &api.GenerationResponse{
		ID:              generation.ID.String(),
		UserID:          generation.UserID.String(),
		PromptTemplateID: generation.PromptTemplateID.String(),
		InputParams:     generation.InputParams,
		GeneratedContent: generation.GeneratedContent,
		Status:          generation.Status,
		ModelUsed:       generation.ModelUsed,
		TokensUsed:      generation.TokensUsed,
		DurationMs:      generation.DurationMs,
		CreatedAt:       generation.CreatedAt,
	}

	writeJSON(w, http.StatusOK, response)
}

// SaveFeedback handles feedback submission
func (h *AIHandler) SaveFeedback(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	generationID, err := uuid.Parse(vars["generationId"])
	if err != nil {
		h.logger.Error("Invalid generation ID", zap.Error(err))
		writeError(w, api.NewErrorResponse(
			api.ErrCodeInvalidRequest,
			"Invalid generation ID",
			nil,
		))
		return
	}

	// Get validated request from context
	req := r.Context().Value("validated_request").(*api.SaveFeedbackRequest)

	userID, _ := uuid.Parse(req.UserID) // Already validated by middleware

	err = h.service.SaveFeedback(r.Context(), userID, generationID, req.Rating, req.Comment)
	if err != nil {
		h.logger.Error("Failed to save feedback", zap.Error(err))
		writeError(w, api.NewErrorResponse(
			api.ErrCodeInternal,
			"Failed to save feedback",
			nil,
		))
		return
	}

	w.WriteHeader(http.StatusOK)
}

// GetUserStats handles user statistics retrieval
func (h *AIHandler) GetUserStats(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID, err := uuid.Parse(vars["userId"])
	if err != nil {
		h.logger.Error("Invalid user ID", zap.Error(err))
		writeError(w, api.NewErrorResponse(
			api.ErrCodeInvalidRequest,
			"Invalid user ID",
			nil,
		))
		return
	}

	stats, err := h.service.GetUserStats(r.Context(), userID)
	if err != nil {
		h.logger.Error("Failed to get user stats", zap.Error(err))
		writeError(w, api.NewErrorResponse(
			api.ErrCodeInternal,
			"Failed to get user stats",
			nil,
		))
		return
	}

	// Convert to response model
	response := &api.UserStatsResponse{
		InteractionStats: &api.InteractionStats{
			TotalInteractions: stats.InteractionStats.TotalInteractions,
			TotalTokens:      stats.InteractionStats.TotalTokens,
			AverageDuration:  stats.InteractionStats.AverageDuration,
			ErrorCount:       stats.InteractionStats.ErrorCount,
		},
	}

	if stats.LastGenStats != nil {
		response.LastGenStats = &api.GenerationStats{
			TotalFeedback:    stats.LastGenStats.TotalFeedback,
			AverageRating:    stats.LastGenStats.AverageRating,
			PositiveRatings:  stats.LastGenStats.PositiveRatings,
			NegativeRatings:  stats.LastGenStats.NegativeRatings,
		}
	}

	writeJSON(w, http.StatusOK, response)
}

// Helper functions

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, err *api.ErrorResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(getStatusCode(err.Code))
	json.NewEncoder(w).Encode(err)
}

func getStatusCode(code string) int {
	switch code {
	case api.ErrCodeValidation, api.ErrCodeInvalidRequest:
		return http.StatusBadRequest
	case api.ErrCodeNotFound:
		return http.StatusNotFound
	default:
		return http.StatusInternalServerError
	}
} 