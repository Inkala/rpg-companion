package parties

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/Inkala/rpg-companion/backend/internal/auth"
	"github.com/Inkala/rpg-companion/backend/internal/httpjson"
	"github.com/google/uuid"
)

const (
	partyRequestBodyLimit   int64 = 4096
	joinAttemptLimit              = 10
	joinAttemptWindow             = time.Minute
	joinLimiterKeyPrefix          = "party-join:"
	codeUserMinuteLimit           = 5
	codeUserHourLimit             = 20
	codeGlobalMinuteLimit         = 100
	codeUserMinuteKeyPrefix       = "party-invite-code:user-minute:"
	codeUserHourKeyPrefix         = "party-invite-code:user-hour:"
	codeGlobalMinuteKey           = "party-invite-code:global-minute"
)

const (
	partyErrorAuthenticationRequired = "authentication_required"
	partyErrorValidation             = "validation_error"
	partyErrorInviteUnavailable      = "invite_unavailable"
	partyErrorForbidden              = "forbidden"
	partyErrorNotFound               = "not_found"
	partyErrorAlreadyMember          = "already_member"
	partyErrorCharacterAlreadyLinked = "character_already_linked"
	partyErrorRateLimited            = "rate_limited"
	partyErrorServer                 = "server_error"
)

type handlerRepository interface {
	CreateParty(context.Context, uuid.UUID, string) (Party, error)
	ListPartiesForUser(context.Context, uuid.UUID) ([]PartySummary, error)
	GetPartyForMember(context.Context, uuid.UUID, uuid.UUID) (PartyDetail, error)
	CreateOrRegenerateInvite(context.Context, uuid.UUID, uuid.UUID) (PartyInvite, error)
	InspectInvite(context.Context, string) (InviteInspection, error)
	InspectInviteByCode(context.Context, string) (InviteInspection, error)
	JoinParty(context.Context, string, uuid.UUID, uuid.UUID) (JoinPartyResult, error)
	JoinPartyByCode(context.Context, string, uuid.UUID, uuid.UUID) (JoinPartyResult, error)
}

type joinAttemptLimiter interface {
	Allow(string, int, time.Duration) auth.LimitResult
}

type codeAttemptLimiter interface {
	AllowAll([]auth.LimitRule) auth.LimitResult
}

type Handler struct {
	repository  handlerRepository
	joinLimiter joinAttemptLimiter
	codeLimiter codeAttemptLimiter
}

func NewHandler(repository handlerRepository) Handler {
	clock := func() time.Time { return time.Now().UTC() }
	return newHandlerWithLimiters(
		repository,
		auth.NewSlidingWindowLimiter(clock),
		auth.NewSlidingWindowLimiter(clock),
	)
}

func newHandlerWithJoinLimiter(repository handlerRepository, limiter joinAttemptLimiter) Handler {
	clock := func() time.Time { return time.Now().UTC() }
	return newHandlerWithLimiters(repository, limiter, auth.NewSlidingWindowLimiter(clock))
}

func newHandlerWithLimiters(repository handlerRepository, joinLimiter joinAttemptLimiter, codeLimiter codeAttemptLimiter) Handler {
	return Handler{repository: repository, joinLimiter: joinLimiter, codeLimiter: codeLimiter}
}

type createPartyRequest struct {
	Name string `json:"name"`
}

type inspectInviteRequest struct {
	Token string `json:"token"`
}

type inspectInviteCodeRequest struct {
	Code string `json:"code"`
}

type joinPartyRequest struct {
	Token       string `json:"token"`
	CharacterID string `json:"characterId"`
}

type joinPartyByCodeRequest struct {
	Code        string `json:"code"`
	CharacterID string `json:"characterId"`
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

func (handler Handler) CreateOrRegenerateInvite(w http.ResponseWriter, r *http.Request) {
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

	invite, err := handler.repository.CreateOrRegenerateInvite(r.Context(), partyID, requesterID)
	if errors.Is(err, ErrPartyForbidden) {
		writePartyError(w, http.StatusForbidden, partyErrorForbidden)
		return
	}
	if errors.Is(err, ErrPartyNotFound) {
		writePartyError(w, http.StatusNotFound, partyErrorNotFound)
		return
	}
	if err != nil {
		writePartyError(w, http.StatusInternalServerError, partyErrorServer)
		return
	}

	writePartyJSON(w, http.StatusCreated, responseFromPartyInvite(invite))
}

func (handler Handler) InspectInvite(w http.ResponseWriter, r *http.Request) {
	if _, ok := auth.UserIDFromContext(r.Context()); !ok {
		writePartyError(w, http.StatusUnauthorized, partyErrorAuthenticationRequired)
		return
	}

	var request inspectInviteRequest
	if !decodePartyRequest(w, r, &request) {
		return
	}
	if handler.repository == nil {
		writePartyError(w, http.StatusInternalServerError, partyErrorServer)
		return
	}

	inspection, err := handler.repository.InspectInvite(r.Context(), request.Token)
	if errors.Is(err, ErrInviteUnavailable) {
		writePartyError(w, http.StatusBadRequest, partyErrorInviteUnavailable)
		return
	}
	if err != nil {
		writePartyError(w, http.StatusInternalServerError, partyErrorServer)
		return
	}

	writePartyJSON(w, http.StatusOK, responseFromInviteInspection(inspection))
}

func (handler Handler) InspectInviteByCode(w http.ResponseWriter, r *http.Request) {
	requesterID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writePartyError(w, http.StatusUnauthorized, partyErrorAuthenticationRequired)
		return
	}
	if !handler.allowCodeAttempt(w, requesterID) {
		return
	}

	var request inspectInviteCodeRequest
	if !decodePartyRequest(w, r, &request) {
		return
	}
	if handler.repository == nil {
		writePartyError(w, http.StatusInternalServerError, partyErrorServer)
		return
	}

	inspection, err := handler.repository.InspectInviteByCode(r.Context(), request.Code)
	if errors.Is(err, ErrInviteUnavailable) {
		writePartyError(w, http.StatusBadRequest, partyErrorInviteUnavailable)
		return
	}
	if err != nil {
		writePartyError(w, http.StatusInternalServerError, partyErrorServer)
		return
	}

	writePartyJSON(w, http.StatusOK, responseFromInviteInspection(inspection))
}

func (handler Handler) Join(w http.ResponseWriter, r *http.Request) {
	requesterID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writePartyError(w, http.StatusUnauthorized, partyErrorAuthenticationRequired)
		return
	}

	var request joinPartyRequest
	if !decodePartyRequest(w, r, &request) {
		return
	}
	characterID, err := uuid.Parse(request.CharacterID)
	if err != nil {
		writePartyError(w, http.StatusBadRequest, partyErrorValidation)
		return
	}
	if handler.repository == nil || handler.joinLimiter == nil {
		writePartyError(w, http.StatusInternalServerError, partyErrorServer)
		return
	}

	limitResult := handler.joinLimiter.Allow(joinLimiterKey(requesterID), joinAttemptLimit, joinAttemptWindow)
	if !limitResult.Allowed {
		w.Header().Set("Retry-After", strconv.FormatInt(joinRetryAfterSeconds(limitResult.RetryAfter), 10))
		writePartyError(w, http.StatusTooManyRequests, partyErrorRateLimited)
		return
	}

	result, err := handler.repository.JoinParty(r.Context(), request.Token, requesterID, characterID)
	if errors.Is(err, ErrInviteUnavailable) {
		writePartyError(w, http.StatusBadRequest, partyErrorInviteUnavailable)
		return
	}
	if errors.Is(err, ErrCharacterNotFound) {
		writePartyError(w, http.StatusNotFound, partyErrorNotFound)
		return
	}
	if errors.Is(err, ErrAlreadyMember) {
		writePartyError(w, http.StatusConflict, partyErrorAlreadyMember)
		return
	}
	if errors.Is(err, ErrCharacterAlreadyLinked) {
		writePartyError(w, http.StatusConflict, partyErrorCharacterAlreadyLinked)
		return
	}
	if err != nil {
		writePartyError(w, http.StatusInternalServerError, partyErrorServer)
		return
	}

	statusCode := http.StatusOK
	if result.Created {
		statusCode = http.StatusCreated
	}
	writePartyJSON(w, statusCode, responseFromPartyMembership(result.Membership))
}

func (handler Handler) JoinByCode(w http.ResponseWriter, r *http.Request) {
	requesterID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writePartyError(w, http.StatusUnauthorized, partyErrorAuthenticationRequired)
		return
	}
	if !handler.allowCodeAttempt(w, requesterID) {
		return
	}

	var request joinPartyByCodeRequest
	if !decodePartyRequest(w, r, &request) {
		return
	}
	characterID, err := uuid.Parse(request.CharacterID)
	if err != nil {
		writePartyError(w, http.StatusBadRequest, partyErrorValidation)
		return
	}
	if handler.repository == nil {
		writePartyError(w, http.StatusInternalServerError, partyErrorServer)
		return
	}

	result, err := handler.repository.JoinPartyByCode(r.Context(), request.Code, requesterID, characterID)
	if errors.Is(err, ErrInviteUnavailable) {
		writePartyError(w, http.StatusBadRequest, partyErrorInviteUnavailable)
		return
	}
	if errors.Is(err, ErrCharacterNotFound) {
		writePartyError(w, http.StatusNotFound, partyErrorNotFound)
		return
	}
	if errors.Is(err, ErrAlreadyMember) {
		writePartyError(w, http.StatusConflict, partyErrorAlreadyMember)
		return
	}
	if errors.Is(err, ErrCharacterAlreadyLinked) {
		writePartyError(w, http.StatusConflict, partyErrorCharacterAlreadyLinked)
		return
	}
	if err != nil {
		writePartyError(w, http.StatusInternalServerError, partyErrorServer)
		return
	}

	statusCode := http.StatusOK
	if result.Created {
		statusCode = http.StatusCreated
	}
	writePartyJSON(w, statusCode, responseFromPartyMembership(result.Membership))
}

func (handler Handler) allowCodeAttempt(w http.ResponseWriter, requesterID uuid.UUID) bool {
	if handler.codeLimiter == nil {
		writePartyError(w, http.StatusInternalServerError, partyErrorServer)
		return false
	}

	digest := sha256.Sum256([]byte(requesterID.String()))
	digestText := hex.EncodeToString(digest[:])
	result := handler.codeLimiter.AllowAll([]auth.LimitRule{
		{Key: codeUserMinuteKeyPrefix + digestText, Limit: codeUserMinuteLimit, Window: time.Minute},
		{Key: codeUserHourKeyPrefix + digestText, Limit: codeUserHourLimit, Window: time.Hour},
		{Key: codeGlobalMinuteKey, Limit: codeGlobalMinuteLimit, Window: time.Minute},
	})
	if result.Allowed {
		return true
	}

	w.Header().Set("Retry-After", strconv.FormatInt(codeRetryAfterSeconds(result.RetryAfter), 10))
	writePartyError(w, http.StatusTooManyRequests, partyErrorRateLimited)
	return false
}

func joinLimiterKey(requesterID uuid.UUID) string {
	digest := sha256.Sum256([]byte(requesterID.String()))
	return joinLimiterKeyPrefix + hex.EncodeToString(digest[:])
}

func joinRetryAfterSeconds(retryAfter time.Duration) int64 {
	seconds := int64((retryAfter + time.Second - 1) / time.Second)
	if seconds < 1 {
		return 1
	}
	maximum := int64(joinAttemptWindow / time.Second)
	if seconds > maximum {
		return maximum
	}
	return seconds
}

func codeRetryAfterSeconds(retryAfter time.Duration) int64 {
	seconds := int64((retryAfter + time.Second - 1) / time.Second)
	if seconds < 1 {
		return 1
	}
	const maximum = int64(time.Hour / time.Second)
	if seconds > maximum {
		return maximum
	}
	return seconds
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
	case partyErrorInviteUnavailable:
		return "invite unavailable"
	case partyErrorForbidden:
		return "forbidden"
	case partyErrorNotFound:
		return "party not found"
	case partyErrorAlreadyMember:
		return "already a party member"
	case partyErrorCharacterAlreadyLinked:
		return "character already linked"
	case partyErrorRateLimited:
		return "rate limit exceeded"
	default:
		return "server error"
	}
}

func writePartyJSON(w http.ResponseWriter, statusCode int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(body)
}
