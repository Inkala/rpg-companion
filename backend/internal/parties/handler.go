package parties

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/Inkala/rpg-companion/backend/internal/auth"
	"github.com/Inkala/rpg-companion/backend/internal/httpjson"
	"github.com/google/uuid"
)

const partyRequestBodyLimit int64 = 4096

const (
	partyErrorAuthenticationRequired = "authentication_required"
	partyErrorValidation             = "validation_error"
	partyErrorNotFound               = "not_found"
	partyErrorServer                 = "server_error"
)

type handlerRepository interface {
	CreateParty(context.Context, uuid.UUID, string) (Party, error)
	ListPartiesForUser(context.Context, uuid.UUID) ([]PartySummary, error)
	GetPartyForMember(context.Context, uuid.UUID, uuid.UUID) (PartyDetail, error)
}

type Handler struct {
	repository handlerRepository
}

func NewHandler(repository handlerRepository) Handler {
	return Handler{repository: repository}
}

type createPartyRequest struct {
	Name string `json:"name"`
}

type partyErrorResponse struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

func (handler Handler) Create(w http.ResponseWriter, r *http.Request) {
	requesterID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writePartyError(w, http.StatusUnauthorized, partyErrorAuthenticationRequired)
		return
	}

	var request createPartyRequest
	if !decodePartyRequest(w, r, &request) {
		return
	}

	name, err := NormalizePartyName(request.Name)
	if err != nil {
		writePartyError(w, http.StatusBadRequest, partyErrorValidation)
		return
	}
	if handler.repository == nil {
		writePartyError(w, http.StatusInternalServerError, partyErrorServer)
		return
	}

	party, err := handler.repository.CreateParty(r.Context(), requesterID, name)
	if errors.Is(err, ErrInvalidPartyName) {
		writePartyError(w, http.StatusBadRequest, partyErrorValidation)
		return
	}
	if err != nil {
		writePartyError(w, http.StatusInternalServerError, partyErrorServer)
		return
	}

	writePartyJSON(w, http.StatusCreated, createResponseFromParty(party))
}

func (handler Handler) List(w http.ResponseWriter, r *http.Request) {
	requesterID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writePartyError(w, http.StatusUnauthorized, partyErrorAuthenticationRequired)
		return
	}
	if handler.repository == nil {
		writePartyError(w, http.StatusInternalServerError, partyErrorServer)
		return
	}

	summaries, err := handler.repository.ListPartiesForUser(r.Context(), requesterID)
	if err != nil {
		writePartyError(w, http.StatusInternalServerError, partyErrorServer)
		return
	}

	writePartyJSON(w, http.StatusOK, listResponseFromPartySummaries(summaries))
}

func (handler Handler) GetForMember(w http.ResponseWriter, r *http.Request) {
	requesterID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writePartyError(w, http.StatusUnauthorized, partyErrorAuthenticationRequired)
		return
	}

	partyID, err := uuid.Parse(r.PathValue("partyId"))
	if err != nil {
		writePartyError(w, http.StatusBadRequest, partyErrorValidation)
		return
	}
	if handler.repository == nil {
		writePartyError(w, http.StatusInternalServerError, partyErrorServer)
		return
	}

	detail, err := handler.repository.GetPartyForMember(r.Context(), partyID, requesterID)
	if errors.Is(err, ErrPartyNotFound) {
		writePartyError(w, http.StatusNotFound, partyErrorNotFound)
		return
	}
	if err != nil {
		writePartyError(w, http.StatusInternalServerError, partyErrorServer)
		return
	}

	writePartyJSON(w, http.StatusOK, responseFromPartyDetail(detail))
}

func decodePartyRequest(w http.ResponseWriter, r *http.Request, destination any) bool {
	err := httpjson.Decode(w, r, destination, partyRequestBodyLimit)
	switch {
	case errors.Is(err, httpjson.ErrUnsupportedMediaType):
		writePartyError(w, http.StatusUnsupportedMediaType, partyErrorValidation)
		return false
	case errors.Is(err, httpjson.ErrRequestBodyTooLarge):
		writePartyError(w, http.StatusRequestEntityTooLarge, partyErrorValidation)
		return false
	case err != nil:
		writePartyError(w, http.StatusBadRequest, partyErrorValidation)
		return false
	default:
		return true
	}
}

func writePartyError(w http.ResponseWriter, statusCode int, code string) {
	writePartyJSON(w, statusCode, partyErrorResponse{
		Error: partyErrorMessage(code),
		Code:  code,
	})
}

func partyErrorMessage(code string) string {
	switch code {
	case partyErrorAuthenticationRequired:
		return "authentication required"
	case partyErrorValidation:
		return "party request is invalid"
	case partyErrorNotFound:
		return "party not found"
	default:
		return "server error"
	}
}

func writePartyJSON(w http.ResponseWriter, statusCode int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(body)
}
