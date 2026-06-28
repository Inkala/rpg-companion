package characters

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
)

type Handler struct {
	repository *Repository
}

func NewHandler(repository *Repository) Handler {
	return Handler{repository: repository}
}

func (handler Handler) Create(w http.ResponseWriter, r *http.Request) {
	if handler.repository == nil {
		writeError(w, http.StatusServiceUnavailable, "character persistence is not configured")
		return
	}

	defer r.Body.Close()

	var request createCharacterRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "request body must be valid character JSON")
		return
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		writeError(w, http.StatusBadRequest, "request body must contain one JSON object")
		return
	}

	character, err := characterFromRequest(request, time.Now().UTC())
	if validationErr, ok := isValidationError(err); ok {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":   "character validation failed",
			"details": validationErr.Messages,
		})
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "character validation failed")
		return
	}

	created, err := handler.repository.Create(r.Context(), character)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not persist character")
		return
	}

	writeJSON(w, http.StatusCreated, responseFromCharacter(created))
}

func (handler Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	if handler.repository == nil {
		writeError(w, http.StatusServiceUnavailable, "character persistence is not configured")
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "character id must be a valid UUID")
		return
	}

	character, err := handler.repository.GetByID(r.Context(), id)
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, "character not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load character")
		return
	}

	writeJSON(w, http.StatusOK, responseFromCharacter(character))
}

func writeError(w http.ResponseWriter, statusCode int, message string) {
	writeJSON(w, statusCode, map[string]string{"error": message})
}

func writeJSON(w http.ResponseWriter, statusCode int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(body)
}
