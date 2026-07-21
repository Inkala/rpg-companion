package characters

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/Inkala/rpg-companion/backend/internal/auth"
	"github.com/Inkala/rpg-companion/backend/internal/httpjson"
	"github.com/google/uuid"
)

const characterRequestBodyLimit int64 = maxV2RequestPayloadBytes

type Handler struct {
	repository             *Repository
	createCharacter        func(context.Context, Character) (Character, error)
	getCharacterForOwner   func(context.Context, uuid.UUID, uuid.UUID) (Character, error)
	getCharacterForPartyGM func(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) (Character, error)
	levelUpCharacter       func(context.Context, uuid.UUID, uuid.UUID, time.Time, levelUpRequest) (Character, error)
}

func NewHandler(repository *Repository) Handler {
	handler := Handler{repository: repository}
	if repository != nil {
		handler.createCharacter = repository.Create
		handler.getCharacterForOwner = repository.GetByIDForOwner
		handler.getCharacterForPartyGM = repository.GetByIDForPartyGM
		handler.levelUpCharacter = repository.LevelUp
	}
	return handler
}

func (handler Handler) LevelUp(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "character id must be a valid UUID")
		return
	}

	var request levelUpRequest
	if err := httpjson.Decode(w, r, &request, characterRequestBodyLimit); err != nil {
		writeError(w, http.StatusBadRequest, "level-up request validation failed")
		return
	}
	expectedUpdatedAt, err := validateLevelUpRequest(request)
	if err != nil {
		writeError(w, http.StatusBadRequest, "level-up request validation failed")
		return
	}
	if handler.levelUpCharacter == nil {
		writeError(w, http.StatusInternalServerError, "could not level up character")
		return
	}

	updated, err := handler.levelUpCharacter(r.Context(), id, ownerID, expectedUpdatedAt, request)
	switch {
	case errors.Is(err, ErrNotFound):
		writeError(w, http.StatusNotFound, "character not found")
		return
	case errors.Is(err, ErrLevelUpConflict):
		writeError(w, http.StatusConflict, "character changed; reload before leveling up")
		return
	case errors.Is(err, ErrLevelUpUnsupported), errors.Is(err, ErrInvalidCharacterData):
		writeError(w, http.StatusUnprocessableEntity, "character cannot be leveled up by Hunin yet")
		return
	case err != nil:
		writeError(w, http.StatusInternalServerError, "could not level up character")
		return
	}

	if err := writeStoredCharacterResponse(w, http.StatusOK, updated, true); err != nil {
		writeError(w, http.StatusInternalServerError, "could not level up character")
	}
}

func (handler Handler) Create(w http.ResponseWriter, r *http.Request) {
	if handler.repository == nil {
		writeError(w, http.StatusServiceUnavailable, "character persistence is not configured")
		return
	}
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var raw json.RawMessage
	err := httpjson.Decode(w, r, &raw, characterRequestBodyLimit)
	if errors.Is(err, httpjson.ErrUnsupportedMediaType) {
		writeError(w, http.StatusUnsupportedMediaType, "Content-Type must be application/json")
		return
	}
	if errors.Is(err, httpjson.ErrRequestBodyTooLarge) {
		writeError(w, http.StatusRequestEntityTooLarge, "request body is too large")
		return
	}
	if errors.Is(err, httpjson.ErrMultipleJSONValues) {
		writeError(w, http.StatusBadRequest, "request body must contain one JSON object")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "request body must be valid character JSON")
		return
	}
	var discriminator struct {
		SchemaVersion *string `json:"schemaVersion"`
	}
	if err := json.Unmarshal(raw, &discriminator); err != nil {
		writeError(w, http.StatusBadRequest, "request body must be valid character JSON")
		return
	}
	if discriminator.SchemaVersion != nil {
		handler.createV2(w, r, raw, ownerID)
		return
	}

	var request createCharacterRequest
	if err := strictDecodeJSON(raw, &request); err != nil {
		writeError(w, http.StatusBadRequest, "request body must be valid character JSON")
		return
	}
	if request.OwnerSubjectID != nil {
		writeError(w, http.StatusBadRequest, "ownerSubjectId is assigned by the authenticated session")
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
	character.OwnerSubjectID = &ownerID

	created, err := handler.createCharacter(r.Context(), character)
	if errors.Is(err, ErrInvalidCharacterData) {
		writeError(w, http.StatusBadRequest, "character validation failed")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not persist character")
		return
	}

	writeJSON(w, http.StatusCreated, responseFromCharacter(created))
}

func (handler Handler) createV2(w http.ResponseWriter, r *http.Request, raw json.RawMessage, ownerID uuid.UUID) {
	request, err := ParseCreateCharacterV2Request(raw)
	if err != nil {
		writeError(w, http.StatusBadRequest, "character validation failed")
		return
	}
	character, err := characterFromV2Request(request, time.Now().UTC())
	if errors.Is(err, ErrInvalidCharacterData) {
		writeError(w, http.StatusBadRequest, "character validation failed")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "character validation failed")
		return
	}
	character.OwnerSubjectID = &ownerID

	created, err := handler.createCharacter(r.Context(), character)
	if errors.Is(err, ErrInvalidCharacterData) {
		writeError(w, http.StatusBadRequest, "character validation failed")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not persist character")
		return
	}
	parsed, err := parseStoredCharacter(created)
	if err != nil || parsed.V2 == nil {
		writeError(w, http.StatusInternalServerError, "could not persist character")
		return
	}
	response, err := characterV2DTOFromStored(created, *parsed.V2)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not persist character")
		return
	}
	writeJSON(w, http.StatusCreated, response)
}

func (handler Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	if handler.repository == nil {
		writeError(w, http.StatusServiceUnavailable, "character persistence is not configured")
		return
	}
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "character id must be a valid UUID")
		return
	}

	if handler.getCharacterForOwner == nil {
		writeError(w, http.StatusServiceUnavailable, "character persistence is not configured")
		return
	}
	character, err := handler.getCharacterForOwner(r.Context(), id, ownerID)
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, "character not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load character")
		return
	}

	if err := writeStoredCharacterResponse(w, http.StatusOK, character, true); err != nil {
		writeError(w, http.StatusInternalServerError, "could not load character")
	}
}

func (handler Handler) GetByIDForPartyGM(w http.ResponseWriter, r *http.Request) {
	requesterID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	partyID, err := uuid.Parse(r.PathValue("partyId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "party id must be a valid UUID")
		return
	}
	characterID, err := uuid.Parse(r.PathValue("characterId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "character id must be a valid UUID")
		return
	}
	if handler.getCharacterForPartyGM == nil {
		writeError(w, http.StatusServiceUnavailable, "character persistence is not configured")
		return
	}

	character, err := handler.getCharacterForPartyGM(r.Context(), characterID, partyID, requesterID)
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, "character not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load character")
		return
	}
	if err := writeStoredCharacterResponse(w, http.StatusOK, character, false); err != nil {
		writeError(w, http.StatusInternalServerError, "could not load character")
	}
}

func writeStoredCharacterResponse(w http.ResponseWriter, status int, character Character, includeV1Owner bool) error {
	parsed, err := parseStoredCharacter(character)
	if err != nil {
		return err
	}
	if parsed.V2 != nil {
		response, err := characterV2DTOFromStored(character, *parsed.V2)
		if err != nil {
			return err
		}
		writeJSON(w, status, response)
		return nil
	}
	response := responseFromCharacter(character)
	if !includeV1Owner {
		response.OwnerSubjectID = nil
	}
	writeJSON(w, status, response)
	return nil
}

func (handler Handler) List(w http.ResponseWriter, r *http.Request) {
	if handler.repository == nil {
		writeError(w, http.StatusServiceUnavailable, "character persistence is not configured")
		return
	}
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	summaries, err := handler.repository.ListSummariesForOwner(r.Context(), ownerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list characters")
		return
	}

	writeJSON(w, http.StatusOK, listResponseFromCharacterSummaries(summaries))
}

func writeError(w http.ResponseWriter, statusCode int, message string) {
	writeJSON(w, statusCode, map[string]string{"error": message})
}

func writeJSON(w http.ResponseWriter, statusCode int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(body)
}
