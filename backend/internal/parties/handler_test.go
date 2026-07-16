package parties

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/Inkala/rpg-companion/backend/internal/auth"
	"github.com/google/uuid"
)

func TestHandlerRequiresAuthenticatedContext(t *testing.T) {
	repository := &stubPartyHandlerRepository{}
	handler := NewHandler(repository)
	partyID := uuid.New()

	tests := []struct {
		name   string
		invoke func(http.ResponseWriter, *http.Request)
		method string
		path   string
		body   string
	}{
		{name: "create", invoke: handler.Create, method: http.MethodPost, path: "/parties", body: `{"name":"Moon Keep"}`},
		{name: "list", invoke: handler.List, method: http.MethodGet, path: "/parties"},
		{name: "detail", invoke: handler.GetForMember, method: http.MethodGet, path: "/parties/" + partyID.String()},
		{name: "invite creation", invoke: handler.CreateOrRegenerateInvite, method: http.MethodPost, path: "/parties/" + partyID.String() + "/invites"},
		{name: "invite inspection", invoke: handler.InspectInvite, method: http.MethodPost, path: "/party-invites/inspect", body: `{"token":"unavailable"}`},
		{name: "join", invoke: handler.Join, method: http.MethodPost, path: "/party-invites/join", body: `{"token":"unavailable","characterId":"` + uuid.New().String() + `"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
			request.Header.Set("Content-Type", "application/json")
			request.SetPathValue("partyId", partyID.String())
			response := httptest.NewRecorder()

			tt.invoke(response, request)

			assertPartyError(t, response, http.StatusUnauthorized, "authentication_required")
		})
	}
}

func TestHandlerCreateReturnsFrozenResponse(t *testing.T) {
	requesterID := uuid.New()
	partyID := uuid.New()
	createdAt := time.Date(2026, 7, 13, 10, 0, 0, 0, time.UTC)
	repository := &stubPartyHandlerRepository{
		createParty: func(_ context.Context, creatorID uuid.UUID, name string) (Party, error) {
			if creatorID != requesterID {
				t.Fatalf("expected authenticated creator ID %s, got %s", requesterID, creatorID)
			}
			if name != "Moon Keep" {
				t.Fatalf("expected normalized Party name, got %q", name)
			}
			return Party{
				ID:              partyID,
				Name:            name,
				CreatedByUserID: requesterID,
				CreatedAt:       createdAt,
				UpdatedAt:       createdAt,
			}, nil
		},
	}
	handler := NewHandler(repository)
	request := authenticatedPartyRequest(http.MethodPost, "/parties", `{"name":"  Moon Keep  "}`, requesterID)
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	handler.Create(response, request)

	assertPartyJSONResponse(t, response, http.StatusCreated, map[string]any{
		"id":   partyID.String(),
		"name": "Moon Keep",
		"role": RoleGM,
	})
}

func TestHandlerListReturnsFrozenResponsesAndEmptyArray(t *testing.T) {
	requesterID := uuid.New()
	partyID := uuid.New()
	createdAt := time.Date(2026, 7, 13, 10, 0, 0, 0, time.UTC)

	t.Run("summary", func(t *testing.T) {
		repository := &stubPartyHandlerRepository{
			listParties: func(_ context.Context, userID uuid.UUID) ([]PartySummary, error) {
				if userID != requesterID {
					t.Fatalf("expected authenticated requester ID %s, got %s", requesterID, userID)
				}
				return []PartySummary{{
					ID: partyID, Name: "Moon Keep", Role: RoleGM,
					CreatedAt: createdAt, UpdatedAt: createdAt,
					GM: PartySummaryPerson{Username: "moon-gm"},
					LinkedCharacters: []PartySummaryLinkedCharacter{
						{CharacterName: "Mara Vale", Username: "mara-player"},
					},
				}}, nil
			},
		}
		response := httptest.NewRecorder()

		NewHandler(repository).List(response, authenticatedPartyRequest(http.MethodGet, "/parties", "", requesterID))

		assertPartyJSONResponse(t, response, http.StatusOK, map[string]any{
			"parties": []any{map[string]any{
				"id": partyID.String(), "name": "Moon Keep", "role": RoleGM,
				"gm": map[string]any{"username": "moon-gm"},
				"linkedCharacters": []any{map[string]any{
					"characterName": "Mara Vale", "username": "mara-player",
				}},
			}},
		})
	})

	t.Run("empty", func(t *testing.T) {
		repository := &stubPartyHandlerRepository{
			listParties: func(context.Context, uuid.UUID) ([]PartySummary, error) {
				return nil, nil
			},
		}
		response := httptest.NewRecorder()

		NewHandler(repository).List(response, authenticatedPartyRequest(http.MethodGet, "/parties", "", requesterID))

		assertPartyJSONResponse(t, response, http.StatusOK, map[string]any{"parties": []any{}})
	})
}

func TestHandlerDetailReturnsFrozenPrivacySafeResponse(t *testing.T) {
	requesterID := uuid.New()
	partyID := uuid.New()
	characterID := uuid.New()
	createdAt := time.Date(2026, 7, 13, 10, 0, 0, 0, time.UTC)
	repository := &stubPartyHandlerRepository{
		getParty: func(_ context.Context, requestedPartyID uuid.UUID, userID uuid.UUID) (PartyDetail, error) {
			if requestedPartyID != partyID || userID != requesterID {
				t.Fatalf("unexpected scoped lookup: party=%s requester=%s", requestedPartyID, userID)
			}
			return PartyDetail{
				ID: partyID, Name: "Moon Keep", Role: RoleGM,
				CreatedAt: createdAt, UpdatedAt: createdAt,
				Members: []PartyMember{
					{Username: "Moon GM", Role: RoleGM, JoinedAt: createdAt},
					{
						Username: "Mara", Role: RolePlayer, JoinedAt: createdAt,
						Character: &PartyMemberCharacter{ID: characterID, Name: "Mara Vale"},
					},
				},
			}, nil
		},
	}
	request := authenticatedPartyRequest(http.MethodGet, "/parties/"+partyID.String(), "", requesterID)
	request.SetPathValue("partyId", partyID.String())
	response := httptest.NewRecorder()

	NewHandler(repository).GetForMember(response, request)

	assertPartyJSONResponse(t, response, http.StatusOK, map[string]any{
		"id": partyID.String(), "name": "Moon Keep", "role": RoleGM,
		"members": []any{
			map[string]any{"username": "Moon GM", "role": RoleGM, "character": nil},
			map[string]any{
				"username": "Mara", "role": RolePlayer,
				"character": map[string]any{"id": characterID.String(), "name": "Mara Vale"},
			},
		},
	})
}

func TestHandlerRejectsInvalidPartyInput(t *testing.T) {
	requesterID := uuid.New()

	t.Run("invalid name", func(t *testing.T) {
		response := httptest.NewRecorder()
		request := authenticatedPartyRequest(http.MethodPost, "/parties", `{"name":"bad\u0000private-request-value"}`, requesterID)
		request.Header.Set("Content-Type", "application/json")

		NewHandler(&stubPartyHandlerRepository{}).Create(response, request)

		assertPartyError(t, response, http.StatusBadRequest, "validation_error")
		assertPartyResponseExcludes(t, response, "private-request-value")
	})

	t.Run("invalid UUID", func(t *testing.T) {
		response := httptest.NewRecorder()
		request := authenticatedPartyRequest(http.MethodGet, "/parties/private-request-value", "", requesterID)
		request.SetPathValue("partyId", "private-request-value")

		NewHandler(&stubPartyHandlerRepository{}).GetForMember(response, request)

		assertPartyError(t, response, http.StatusBadRequest, "validation_error")
		assertPartyResponseExcludes(t, response, "private-request-value")
	})
}

func TestHandlerCreateUsesStrictBoundedJSON(t *testing.T) {
	requesterID := uuid.New()
	partyID := uuid.New()
	validBody := `{"name":"Boundary Party"}`
	exactBody := validBody + strings.Repeat(" ", int(partyRequestBodyLimit)-len(validBody))
	if len(exactBody) != int(partyRequestBodyLimit) {
		t.Fatalf("expected exact boundary body size %d, got %d", partyRequestBodyLimit, len(exactBody))
	}

	tests := []struct {
		name        string
		contentType string
		body        string
		wantStatus  int
	}{
		{name: "missing Content-Type", body: validBody, wantStatus: http.StatusUnsupportedMediaType},
		{name: "wrong Content-Type", contentType: "text/plain", body: validBody, wantStatus: http.StatusUnsupportedMediaType},
		{name: "unknown field", contentType: "application/json", body: `{"name":"Boundary Party","secret":"private-request-value"}`, wantStatus: http.StatusBadRequest},
		{name: "malformed JSON", contentType: "application/json", body: `{"name":"private-request-value"`, wantStatus: http.StatusBadRequest},
		{name: "trailing JSON", contentType: "application/json", body: validBody + ` {"private-request-value":true}`, wantStatus: http.StatusBadRequest},
		{name: "over limit", contentType: "application/json", body: exactBody + " ", wantStatus: http.StatusRequestEntityTooLarge},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			request := authenticatedPartyRequest(http.MethodPost, "/parties", tt.body, requesterID)
			if tt.contentType != "" {
				request.Header.Set("Content-Type", tt.contentType)
			}

			NewHandler(&stubPartyHandlerRepository{}).Create(response, request)

			assertPartyError(t, response, tt.wantStatus, "validation_error")
			assertPartyResponseExcludes(t, response, "private-request-value")
		})
	}

	t.Run("exact limit reaches repository", func(t *testing.T) {
		called := false
		repository := &stubPartyHandlerRepository{
			createParty: func(_ context.Context, _ uuid.UUID, name string) (Party, error) {
				called = true
				return Party{ID: partyID, Name: name}, nil
			},
		}
		response := httptest.NewRecorder()
		request := authenticatedPartyRequest(http.MethodPost, "/parties", exactBody, requesterID)
		request.Header.Set("Content-Type", "application/json")

		NewHandler(repository).Create(response, request)

		if !called {
			t.Fatal("expected an exactly 4,096-byte body to reach the repository")
		}
		if response.Code != http.StatusCreated {
			t.Fatalf("expected status 201, got %d", response.Code)
		}
	})
}

func TestHandlerHidesUnknownOrNonVisibleParty(t *testing.T) {
	requesterID := uuid.New()
	partyID := uuid.New()
	repository := &stubPartyHandlerRepository{
		getParty: func(context.Context, uuid.UUID, uuid.UUID) (PartyDetail, error) {
			return PartyDetail{}, ErrPartyNotFound
		},
	}
	request := authenticatedPartyRequest(http.MethodGet, "/parties/"+partyID.String(), "", requesterID)
	request.SetPathValue("partyId", partyID.String())
	response := httptest.NewRecorder()

	NewHandler(repository).GetForMember(response, request)

	assertPartyError(t, response, http.StatusNotFound, "not_found")
}

func TestHandlerCreateOrRegenerateInviteReturnsTokenOnce(t *testing.T) {
	requesterID := uuid.New()
	partyID := uuid.New()
	rawToken := strings.Repeat("A", 43)
	location := time.FixedZone("test-offset", 2*60*60)
	createdAt := time.Date(2026, 7, 13, 10, 30, 0, 0, location)
	expiresAt := createdAt.Add(7 * 24 * time.Hour)
	repository := &stubPartyHandlerRepository{
		createInvite: func(_ context.Context, requestedPartyID uuid.UUID, userID uuid.UUID) (PartyInvite, error) {
			if requestedPartyID != partyID || userID != requesterID {
				t.Fatal("invite creation did not use the authenticated scoped identifiers")
			}
			return PartyInvite{Token: rawToken, CreatedAt: createdAt, ExpiresAt: expiresAt}, nil
		},
	}
	request := authenticatedPartyRequest(http.MethodPost, "/parties/"+partyID.String()+"/invites", "", requesterID)
	request.SetPathValue("partyId", partyID.String())
	response := httptest.NewRecorder()

	NewHandler(repository).CreateOrRegenerateInvite(response, request)

	assertInviteCreationResponse(t, response, rawToken, "2026-07-13T08:30:00Z", "2026-07-20T08:30:00Z")
}

func TestHandlerCreateOrRegenerateInviteEnforcesRoleAndPrivacy(t *testing.T) {
	requesterID := uuid.New()
	partyID := uuid.New()

	tests := []struct {
		name       string
		repository error
		wantStatus int
		wantCode   string
	}{
		{name: "player forbidden", repository: ErrPartyForbidden, wantStatus: http.StatusForbidden, wantCode: "forbidden"},
		{name: "unknown Party", repository: ErrPartyNotFound, wantStatus: http.StatusNotFound, wantCode: "not_found"},
		{name: "non-visible Party", repository: ErrPartyNotFound, wantStatus: http.StatusNotFound, wantCode: "not_found"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &stubPartyHandlerRepository{
				createInvite: func(context.Context, uuid.UUID, uuid.UUID) (PartyInvite, error) {
					return PartyInvite{}, tt.repository
				},
			}
			request := authenticatedPartyRequest(http.MethodPost, "/parties/"+partyID.String()+"/invites", "", requesterID)
			request.SetPathValue("partyId", partyID.String())
			response := httptest.NewRecorder()

			NewHandler(repository).CreateOrRegenerateInvite(response, request)

			assertPartyError(t, response, tt.wantStatus, tt.wantCode)
		})
	}
}

func TestHandlerCreateOrRegenerateInviteRejectsInvalidPartyID(t *testing.T) {
	request := authenticatedPartyRequest(http.MethodPost, "/parties/private-request-value/invites", "", uuid.New())
	request.SetPathValue("partyId", "private-request-value")
	response := httptest.NewRecorder()

	NewHandler(&stubPartyHandlerRepository{}).CreateOrRegenerateInvite(response, request)

	assertPartyError(t, response, http.StatusBadRequest, "validation_error")
	assertPartyResponseExcludes(t, response, "private-request-value")
}

func TestHandlerInspectInviteReturnsPrivacySafePartySummary(t *testing.T) {
	requesterID := uuid.New()
	partyID := uuid.New()
	rawToken := strings.Repeat("B", 43)
	expiresAt := time.Date(2026, 7, 20, 10, 30, 0, 0, time.FixedZone("test-offset", 2*60*60))
	repository := &stubPartyHandlerRepository{
		inspectInvite: func(_ context.Context, suppliedToken string) (InviteInspection, error) {
			if suppliedToken != rawToken {
				t.Fatal("inspection did not pass the supplied token unchanged")
			}
			return InviteInspection{PartyID: partyID, PartyName: "Moon Keep", ExpiresAt: expiresAt}, nil
		},
	}
	request := authenticatedPartyRequest(http.MethodPost, "/party-invites/inspect", `{"token":"`+rawToken+`"}`, requesterID)
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()

	NewHandler(repository).InspectInvite(response, request)

	assertInviteInspectionResponse(t, response, rawToken, partyID, "Moon Keep", "2026-07-20T08:30:00Z")
}

func TestHandlerInspectInviteMakesUnavailableStatesIndistinguishable(t *testing.T) {
	requesterID := uuid.New()
	tests := []struct {
		name  string
		token string
	}{
		{name: "malformed", token: "malformed"},
		{name: "unknown", token: strings.Repeat("C", 43)},
		{name: "expired", token: strings.Repeat("D", 43)},
		{name: "revoked", token: strings.Repeat("E", 43)},
		{name: "replaced", token: strings.Repeat("F", 43)},
	}
	var firstResponse string

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &stubPartyHandlerRepository{
				inspectInvite: func(_ context.Context, suppliedToken string) (InviteInspection, error) {
					if suppliedToken != tt.token {
						t.Fatal("inspection did not pass the supplied token unchanged")
					}
					return InviteInspection{}, ErrInviteUnavailable
				},
			}
			request := authenticatedPartyRequest(http.MethodPost, "/party-invites/inspect", `{"token":"`+tt.token+`"}`, requesterID)
			request.Header.Set("Content-Type", "application/json")
			response := httptest.NewRecorder()

			NewHandler(repository).InspectInvite(response, request)

			assertSensitivePartyError(t, response, http.StatusBadRequest, "invite_unavailable")
			assertPartyResponseExcludes(t, response, tt.token)
			if firstResponse == "" {
				firstResponse = response.Body.String()
			} else if response.Body.String() != firstResponse {
				t.Fatal("invite-unavailable states returned distinguishable public errors")
			}
		})
	}
}

func TestHandlerInspectInviteUsesStrictBoundedJSON(t *testing.T) {
	requesterID := uuid.New()
	rawToken := strings.Repeat("G", 43)
	validBody := `{"token":"` + rawToken + `"}`
	overLimitBody := validBody + strings.Repeat(" ", int(partyRequestBodyLimit)+1-len(validBody))
	if len(overLimitBody) != int(partyRequestBodyLimit)+1 {
		t.Fatal("inspection body boundary fixture has the wrong size")
	}

	tests := []struct {
		name        string
		contentType string
		body        string
		wantStatus  int
	}{
		{name: "missing Content-Type", body: validBody, wantStatus: http.StatusUnsupportedMediaType},
		{name: "wrong Content-Type", contentType: "text/plain", body: validBody, wantStatus: http.StatusUnsupportedMediaType},
		{name: "unknown field", contentType: "application/json", body: `{"token":"` + rawToken + `","extra":true}`, wantStatus: http.StatusBadRequest},
		{name: "malformed JSON", contentType: "application/json", body: `{"token":"` + rawToken + `"`, wantStatus: http.StatusBadRequest},
		{name: "trailing JSON", contentType: "application/json", body: validBody + ` {}`, wantStatus: http.StatusBadRequest},
		{name: "over limit", contentType: "application/json", body: overLimitBody, wantStatus: http.StatusRequestEntityTooLarge},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := authenticatedPartyRequest(http.MethodPost, "/party-invites/inspect", tt.body, requesterID)
			if tt.contentType != "" {
				request.Header.Set("Content-Type", tt.contentType)
			}
			response := httptest.NewRecorder()

			NewHandler(&stubPartyHandlerRepository{}).InspectInvite(response, request)

			assertSensitivePartyError(t, response, tt.wantStatus, "validation_error")
			assertPartyResponseExcludes(t, response, rawToken)
		})
	}
}

func TestInviteHandlersMapRepositoryFailuresToGenericServerErrors(t *testing.T) {
	requesterID := uuid.New()
	partyID := uuid.New()
	rawToken := strings.Repeat("H", 43)
	databaseError := errors.New("private-database-detail")

	t.Run("creation", func(t *testing.T) {
		repository := &stubPartyHandlerRepository{
			createInvite: func(context.Context, uuid.UUID, uuid.UUID) (PartyInvite, error) {
				return PartyInvite{}, databaseError
			},
		}
		request := authenticatedPartyRequest(http.MethodPost, "/parties/"+partyID.String()+"/invites", "", requesterID)
		request.SetPathValue("partyId", partyID.String())
		response := httptest.NewRecorder()

		NewHandler(repository).CreateOrRegenerateInvite(response, request)

		assertPartyError(t, response, http.StatusInternalServerError, "server_error")
		assertPartyResponseExcludes(t, response, databaseError.Error())
	})

	t.Run("inspection", func(t *testing.T) {
		repository := &stubPartyHandlerRepository{
			inspectInvite: func(context.Context, string) (InviteInspection, error) {
				return InviteInspection{}, databaseError
			},
		}
		request := authenticatedPartyRequest(http.MethodPost, "/party-invites/inspect", `{"token":"`+rawToken+`"}`, requesterID)
		request.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()

		NewHandler(repository).InspectInvite(response, request)

		assertSensitivePartyError(t, response, http.StatusInternalServerError, "server_error")
		assertPartyResponseExcludes(t, response, rawToken)
		assertPartyResponseExcludes(t, response, databaseError.Error())
	})
}

func TestHandlerJoinReturnsCreationAndReplayStatusesWithoutChangingDTO(t *testing.T) {
	requesterID := uuid.New()
	characterID := uuid.New()
	rawToken := strings.Repeat("J", 43)
	membership := joinHandlerMembership(characterID)

	tests := []struct {
		name       string
		created    bool
		wantStatus int
	}{
		{name: "new membership", created: true, wantStatus: http.StatusCreated},
		{name: "identical replay", created: false, wantStatus: http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &stubPartyHandlerRepository{
				joinParty: func(_ context.Context, suppliedToken string, userID uuid.UUID, suppliedCharacterID uuid.UUID) (JoinPartyResult, error) {
					if suppliedToken != rawToken || userID != requesterID || suppliedCharacterID != characterID {
						t.Fatal("join handler changed an approved repository argument")
					}
					return JoinPartyResult{Membership: membership, Created: tt.created}, nil
				},
			}
			response := executeJoinRequest(NewHandler(repository), requesterID, rawToken, characterID)

			assertJoinResponse(t, response, tt.wantStatus, rawToken, requesterID, membership)
		})
	}
}

func TestHandlerJoinMapsSafeDomainErrors(t *testing.T) {
	requesterID := uuid.New()
	characterID := uuid.New()
	rawToken := strings.Repeat("K", 43)
	databaseError := errors.New("private-database-detail")

	tests := []struct {
		name       string
		repository error
		wantStatus int
		wantCode   string
	}{
		{name: "invite unavailable", repository: ErrInviteUnavailable, wantStatus: http.StatusBadRequest, wantCode: "invite_unavailable"},
		{name: "foreign or unknown character", repository: ErrCharacterNotFound, wantStatus: http.StatusNotFound, wantCode: "not_found"},
		{name: "different existing membership", repository: ErrAlreadyMember, wantStatus: http.StatusConflict, wantCode: "already_member"},
		{name: "character linked elsewhere", repository: ErrCharacterAlreadyLinked, wantStatus: http.StatusConflict, wantCode: "character_already_linked"},
		{name: "database failure", repository: databaseError, wantStatus: http.StatusInternalServerError, wantCode: "server_error"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &stubPartyHandlerRepository{
				joinParty: func(context.Context, string, uuid.UUID, uuid.UUID) (JoinPartyResult, error) {
					return JoinPartyResult{}, tt.repository
				},
			}
			response := executeJoinRequest(NewHandler(repository), requesterID, rawToken, characterID)

			assertSensitivePartyError(t, response, tt.wantStatus, tt.wantCode)
			assertPartyResponseExcludes(t, response, rawToken)
			assertPartyResponseExcludes(t, response, requesterID.String())
			assertPartyResponseExcludes(t, response, databaseError.Error())
		})
	}
}

func TestHandlerJoinDecodesBeforeConsumingThrottleAttempt(t *testing.T) {
	requesterID := uuid.New()
	characterID := uuid.New()
	rawToken := strings.Repeat("L", 43)
	repositoryCalls := 0
	repository := &stubPartyHandlerRepository{
		joinParty: func(context.Context, string, uuid.UUID, uuid.UUID) (JoinPartyResult, error) {
			repositoryCalls++
			return JoinPartyResult{Membership: joinHandlerMembership(characterID), Created: true}, nil
		},
	}
	now := time.Date(2026, 7, 13, 12, 0, 0, 0, time.UTC)
	handler := newHandlerWithJoinLimiter(repository, auth.NewSlidingWindowLimiter(func() time.Time { return now }))

	invalidBodies := []string{
		`{"token":"` + rawToken + `"`,
		`{"token":"` + rawToken + `","characterId":"not-a-uuid"}`,
		`{"token":"` + rawToken + `","characterId":"` + characterID.String() + `","extra":true}`,
		joinRequestBody(rawToken, characterID) + ` {}`,
	}
	for attempt := 0; attempt < 10; attempt++ {
		body := invalidBodies[attempt%len(invalidBodies)]
		request := authenticatedPartyRequest(http.MethodPost, "/party-invites/join", body, requesterID)
		request.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()

		handler.Join(response, request)

		assertSensitivePartyError(t, response, http.StatusBadRequest, "validation_error")
		assertPartyResponseExcludes(t, response, rawToken)
	}

	for attempt := 0; attempt < joinAttemptLimit; attempt++ {
		response := executeJoinRequest(handler, requesterID, rawToken, characterID)
		assertJoinResponse(t, response, http.StatusCreated, rawToken, requesterID, joinHandlerMembership(characterID))
	}
	if repositoryCalls != joinAttemptLimit {
		t.Fatal("malformed requests consumed throttle attempts or reached the repository")
	}

	response := executeJoinRequest(handler, requesterID, rawToken, characterID)
	assertSensitivePartyError(t, response, http.StatusTooManyRequests, "rate_limited")
	if repositoryCalls != joinAttemptLimit {
		t.Fatal("throttle rejection reached the repository")
	}
}

func TestHandlerJoinAcceptsExactly4096BytesAndRejects4097BeforeRepository(t *testing.T) {
	requesterID := uuid.New()
	characterID := uuid.New()
	rawToken := strings.Repeat("M", 43)
	baseBody := joinRequestBody(rawToken, characterID)
	exactBody := baseBody + strings.Repeat(" ", int(partyRequestBodyLimit)-len(baseBody))
	overBody := exactBody + " "
	repositoryCalls := 0
	repository := &stubPartyHandlerRepository{
		joinParty: func(context.Context, string, uuid.UUID, uuid.UUID) (JoinPartyResult, error) {
			repositoryCalls++
			return JoinPartyResult{Membership: joinHandlerMembership(characterID), Created: true}, nil
		},
	}
	handler := NewHandler(repository)

	exactRequest := authenticatedPartyRequest(http.MethodPost, "/party-invites/join", exactBody, requesterID)
	exactRequest.Header.Set("Content-Type", "application/json")
	exactResponse := httptest.NewRecorder()
	handler.Join(exactResponse, exactRequest)
	assertJoinResponse(t, exactResponse, http.StatusCreated, rawToken, requesterID, joinHandlerMembership(characterID))

	unsupportedRequest := authenticatedPartyRequest(http.MethodPost, "/party-invites/join", baseBody, requesterID)
	unsupportedResponse := httptest.NewRecorder()
	handler.Join(unsupportedResponse, unsupportedRequest)
	assertSensitivePartyError(t, unsupportedResponse, http.StatusUnsupportedMediaType, "validation_error")

	overRequest := authenticatedPartyRequest(http.MethodPost, "/party-invites/join", overBody, requesterID)
	overRequest.Header.Set("Content-Type", "application/json")
	overResponse := httptest.NewRecorder()
	handler.Join(overResponse, overRequest)
	assertSensitivePartyError(t, overResponse, http.StatusRequestEntityTooLarge, "validation_error")
	if repositoryCalls != 1 {
		t.Fatal("join body boundary did not protect the repository")
	}
}

func TestHandlerJoinCountsValidAndUnavailableAttemptsEquallyWithoutReset(t *testing.T) {
	requesterID := uuid.New()
	characterID := uuid.New()
	rawToken := strings.Repeat("N", 43)
	repositoryCalls := 0
	repository := &stubPartyHandlerRepository{
		joinParty: func(context.Context, string, uuid.UUID, uuid.UUID) (JoinPartyResult, error) {
			repositoryCalls++
			if repositoryCalls <= joinAttemptLimit/2 {
				return JoinPartyResult{Membership: joinHandlerMembership(characterID), Created: true}, nil
			}
			return JoinPartyResult{}, ErrInviteUnavailable
		},
	}
	now := time.Date(2026, 7, 13, 12, 0, 0, 0, time.UTC)
	handler := newHandlerWithJoinLimiter(repository, auth.NewSlidingWindowLimiter(func() time.Time { return now }))

	for attempt := 0; attempt < joinAttemptLimit; attempt++ {
		response := executeJoinRequest(handler, requesterID, rawToken, characterID)
		if attempt < joinAttemptLimit/2 {
			assertJoinResponse(t, response, http.StatusCreated, rawToken, requesterID, joinHandlerMembership(characterID))
		} else {
			assertSensitivePartyError(t, response, http.StatusBadRequest, "invite_unavailable")
		}
	}

	response := executeJoinRequest(handler, requesterID, rawToken, characterID)
	assertSensitivePartyError(t, response, http.StatusTooManyRequests, "rate_limited")
	if response.Header().Get("Retry-After") != "60" {
		t.Fatal("full-window throttle did not return a bounded 60-second Retry-After")
	}
	if repositoryCalls != joinAttemptLimit {
		t.Fatal("throttled join reached the repository")
	}
}

func TestHandlerJoinThrottleSeparatesUsersAndIsSharedAcrossHandlerCopies(t *testing.T) {
	firstUserID := uuid.New()
	secondUserID := uuid.New()
	characterID := uuid.New()
	rawToken := strings.Repeat("O", 43)
	repositoryCalls := 0
	repository := &stubPartyHandlerRepository{
		joinParty: func(context.Context, string, uuid.UUID, uuid.UUID) (JoinPartyResult, error) {
			repositoryCalls++
			return JoinPartyResult{Membership: joinHandlerMembership(characterID), Created: true}, nil
		},
	}
	now := time.Date(2026, 7, 13, 12, 0, 0, 0, time.UTC)
	handler := newHandlerWithJoinLimiter(repository, auth.NewSlidingWindowLimiter(func() time.Time { return now }))
	handlerCopy := handler

	for attempt := 0; attempt < joinAttemptLimit; attempt++ {
		response := executeJoinRequest(handlerCopy, firstUserID, rawToken, characterID)
		assertJoinResponse(t, response, http.StatusCreated, rawToken, firstUserID, joinHandlerMembership(characterID))
	}
	assertSensitivePartyError(t, executeJoinRequest(handler, firstUserID, rawToken, characterID), http.StatusTooManyRequests, "rate_limited")
	assertJoinResponse(t, executeJoinRequest(handlerCopy, secondUserID, rawToken, characterID), http.StatusCreated, rawToken, secondUserID, joinHandlerMembership(characterID))
	if repositoryCalls != joinAttemptLimit+1 {
		t.Fatal("handler copies did not share one per-user limiter")
	}
}

func TestHandlerJoinThrottleRecoversAfterWindow(t *testing.T) {
	requesterID := uuid.New()
	characterID := uuid.New()
	rawToken := strings.Repeat("P", 43)
	repositoryCalls := 0
	repository := &stubPartyHandlerRepository{
		joinParty: func(context.Context, string, uuid.UUID, uuid.UUID) (JoinPartyResult, error) {
			repositoryCalls++
			return JoinPartyResult{Membership: joinHandlerMembership(characterID), Created: true}, nil
		},
	}
	now := time.Date(2026, 7, 13, 12, 0, 0, 0, time.UTC)
	handler := newHandlerWithJoinLimiter(repository, auth.NewSlidingWindowLimiter(func() time.Time { return now }))

	for attempt := 0; attempt < joinAttemptLimit; attempt++ {
		assertJoinResponse(t, executeJoinRequest(handler, requesterID, rawToken, characterID), http.StatusCreated, rawToken, requesterID, joinHandlerMembership(characterID))
	}
	assertSensitivePartyError(t, executeJoinRequest(handler, requesterID, rawToken, characterID), http.StatusTooManyRequests, "rate_limited")
	now = now.Add(joinAttemptWindow)
	assertJoinResponse(t, executeJoinRequest(handler, requesterID, rawToken, characterID), http.StatusCreated, rawToken, requesterID, joinHandlerMembership(characterID))
	if repositoryCalls != joinAttemptLimit+1 {
		t.Fatal("join throttle did not recover exactly after its window")
	}
}

func TestHandlerJoinLimiterKeyContainsOnlyHashedUserIdentity(t *testing.T) {
	requesterID := uuid.New()
	characterID := uuid.New()
	rawToken := strings.Repeat("Q", 43)
	limiter := &recordingJoinLimiter{result: auth.LimitResult{Allowed: true}}
	repository := &stubPartyHandlerRepository{
		joinParty: func(context.Context, string, uuid.UUID, uuid.UUID) (JoinPartyResult, error) {
			return JoinPartyResult{Membership: joinHandlerMembership(characterID), Created: true}, nil
		},
	}

	response := executeJoinRequest(newHandlerWithJoinLimiter(repository, limiter), requesterID, rawToken, characterID)

	assertJoinResponse(t, response, http.StatusCreated, rawToken, requesterID, joinHandlerMembership(characterID))
	if len(limiter.keys) != 1 {
		t.Fatal("join handler did not perform exactly one limiter operation")
	}
	digest := sha256.Sum256([]byte(requesterID.String()))
	wantKey := "party-join:" + hex.EncodeToString(digest[:])
	if limiter.keys[0] != wantKey {
		t.Fatal("join limiter key was not the approved SHA-256-derived identity")
	}
	if limiter.limits[0] != 10 || limiter.windows[0] != time.Minute {
		t.Fatal("join limiter did not use 10 attempts per one-minute window")
	}
	if strings.Contains(limiter.keys[0], requesterID.String()) || strings.Contains(limiter.keys[0], rawToken) {
		t.Fatal("join limiter key retained a raw user ID or invite token")
	}
}

func TestHandlerJoinRetryAfterIsBoundedToOneThrough60Seconds(t *testing.T) {
	requesterID := uuid.New()
	characterID := uuid.New()
	rawToken := strings.Repeat("R", 43)

	tests := []struct {
		name       string
		retryAfter time.Duration
		wantHeader string
	}{
		{name: "zero clamps to one", retryAfter: 0, wantHeader: "1"},
		{name: "fraction rounds up", retryAfter: 1500 * time.Millisecond, wantHeader: "2"},
		{name: "below window rounds to 60", retryAfter: 59500 * time.Millisecond, wantHeader: "60"},
		{name: "above window clamps to 60", retryAfter: 2 * time.Minute, wantHeader: "60"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			limiter := &recordingJoinLimiter{result: auth.LimitResult{Allowed: false, RetryAfter: tt.retryAfter}}
			response := executeJoinRequest(newHandlerWithJoinLimiter(&stubPartyHandlerRepository{}, limiter), requesterID, rawToken, characterID)

			assertSensitivePartyError(t, response, http.StatusTooManyRequests, "rate_limited")
			if response.Header().Get("Retry-After") != tt.wantHeader {
				t.Fatal("join throttle returned an unbounded Retry-After value")
			}
		})
	}
}

func TestHandlerMapsRepositoryFailuresToGenericServerErrors(t *testing.T) {
	requesterID := uuid.New()
	partyID := uuid.New()
	databaseError := errors.New("private-database-detail")

	tests := []struct {
		name   string
		invoke func(Handler, http.ResponseWriter, *http.Request)
		method string
		path   string
		body   string
		store  *stubPartyHandlerRepository
	}{
		{
			name: "create", invoke: func(handler Handler, w http.ResponseWriter, r *http.Request) { handler.Create(w, r) },
			method: http.MethodPost, path: "/parties", body: `{"name":"Moon Keep"}`,
			store: &stubPartyHandlerRepository{createParty: func(context.Context, uuid.UUID, string) (Party, error) {
				return Party{}, databaseError
			}},
		},
		{
			name: "list", invoke: func(handler Handler, w http.ResponseWriter, r *http.Request) { handler.List(w, r) },
			method: http.MethodGet, path: "/parties",
			store: &stubPartyHandlerRepository{listParties: func(context.Context, uuid.UUID) ([]PartySummary, error) {
				return nil, databaseError
			}},
		},
		{
			name: "detail", invoke: func(handler Handler, w http.ResponseWriter, r *http.Request) { handler.GetForMember(w, r) },
			method: http.MethodGet, path: "/parties/" + partyID.String(),
			store: &stubPartyHandlerRepository{getParty: func(context.Context, uuid.UUID, uuid.UUID) (PartyDetail, error) {
				return PartyDetail{}, databaseError
			}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := authenticatedPartyRequest(tt.method, tt.path, tt.body, requesterID)
			request.Header.Set("Content-Type", "application/json")
			request.SetPathValue("partyId", partyID.String())
			response := httptest.NewRecorder()

			tt.invoke(NewHandler(tt.store), response, request)

			assertPartyError(t, response, http.StatusInternalServerError, "server_error")
			assertPartyResponseExcludes(t, response, databaseError.Error())
		})
	}
}

type stubPartyHandlerRepository struct {
	createParty   func(context.Context, uuid.UUID, string) (Party, error)
	listParties   func(context.Context, uuid.UUID) ([]PartySummary, error)
	getParty      func(context.Context, uuid.UUID, uuid.UUID) (PartyDetail, error)
	createInvite  func(context.Context, uuid.UUID, uuid.UUID) (PartyInvite, error)
	inspectInvite func(context.Context, string) (InviteInspection, error)
	joinParty     func(context.Context, string, uuid.UUID, uuid.UUID) (JoinPartyResult, error)
}

func (repository *stubPartyHandlerRepository) CreateParty(ctx context.Context, creatorID uuid.UUID, name string) (Party, error) {
	if repository.createParty == nil {
		panic("unexpected CreateParty call")
	}
	return repository.createParty(ctx, creatorID, name)
}

func (repository *stubPartyHandlerRepository) ListPartiesForUser(ctx context.Context, userID uuid.UUID) ([]PartySummary, error) {
	if repository.listParties == nil {
		panic("unexpected ListPartiesForUser call")
	}
	return repository.listParties(ctx, userID)
}

func (repository *stubPartyHandlerRepository) GetPartyForMember(ctx context.Context, partyID uuid.UUID, requesterID uuid.UUID) (PartyDetail, error) {
	if repository.getParty == nil {
		panic("unexpected GetPartyForMember call")
	}
	return repository.getParty(ctx, partyID, requesterID)
}

func (repository *stubPartyHandlerRepository) CreateOrRegenerateInvite(ctx context.Context, partyID uuid.UUID, requesterID uuid.UUID) (PartyInvite, error) {
	if repository.createInvite == nil {
		panic("unexpected CreateOrRegenerateInvite call")
	}
	return repository.createInvite(ctx, partyID, requesterID)
}

func (repository *stubPartyHandlerRepository) InspectInvite(ctx context.Context, rawToken string) (InviteInspection, error) {
	if repository.inspectInvite == nil {
		panic("unexpected InspectInvite call")
	}
	return repository.inspectInvite(ctx, rawToken)
}

func (repository *stubPartyHandlerRepository) JoinParty(
	ctx context.Context,
	rawToken string,
	requesterID uuid.UUID,
	characterID uuid.UUID,
) (JoinPartyResult, error) {
	if repository.joinParty == nil {
		panic("unexpected JoinParty call")
	}
	return repository.joinParty(ctx, rawToken, requesterID, characterID)
}

type recordingJoinLimiter struct {
	keys    []string
	limits  []int
	windows []time.Duration
	result  auth.LimitResult
}

func (limiter *recordingJoinLimiter) Allow(key string, limit int, window time.Duration) auth.LimitResult {
	limiter.keys = append(limiter.keys, key)
	limiter.limits = append(limiter.limits, limit)
	limiter.windows = append(limiter.windows, window)
	return limiter.result
}

func authenticatedPartyRequest(method string, path string, body string, userID uuid.UUID) *http.Request {
	request := httptest.NewRequest(method, path, strings.NewReader(body))
	user := auth.AuthenticatedUser{ID: userID, Username: "handler-user", UsernameCanonical: "handler-user"}
	return request.WithContext(auth.WithAuthenticatedUser(request.Context(), user))
}

func assertPartyError(t *testing.T, response *httptest.ResponseRecorder, wantStatus int, wantCode string) {
	t.Helper()
	assertPartyJSONResponse(t, response, wantStatus, map[string]any{
		"error": expectedPartyErrorMessage(wantCode),
		"code":  wantCode,
	})
}

func expectedPartyErrorMessage(code string) string {
	switch code {
	case "authentication_required":
		return "authentication required"
	case "validation_error":
		return "party request is invalid"
	case "not_found":
		return "party not found"
	case "forbidden":
		return "forbidden"
	case "invite_unavailable":
		return "invite unavailable"
	case "already_member":
		return "already a party member"
	case "character_already_linked":
		return "character already linked"
	case "rate_limited":
		return "rate limit exceeded"
	case "server_error":
		return "server error"
	default:
		return ""
	}
}

func assertPartyJSONResponse(t *testing.T, response *httptest.ResponseRecorder, wantStatus int, wantBody map[string]any) {
	t.Helper()
	if response.Code != wantStatus {
		t.Fatalf("expected status %d, got %d", wantStatus, response.Code)
	}
	if contentType := response.Header().Get("Content-Type"); contentType != "application/json" {
		t.Fatalf("expected application/json Content-Type, got %q", contentType)
	}

	var gotBody map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &gotBody); err != nil {
		t.Fatalf("decode response JSON: %v", err)
	}
	if !reflect.DeepEqual(gotBody, wantBody) {
		t.Fatalf("unexpected response body: got %#v, want %#v", gotBody, wantBody)
	}
}

func assertPartyResponseExcludes(t *testing.T, response *httptest.ResponseRecorder, forbidden string) {
	t.Helper()
	if strings.Contains(response.Body.String(), forbidden) {
		t.Fatal("public response exposed a private request value or database detail")
	}
}

func assertSensitivePartyError(t *testing.T, response *httptest.ResponseRecorder, wantStatus int, wantCode string) {
	t.Helper()
	if response.Code != wantStatus {
		t.Fatalf("expected status %d, got %d", wantStatus, response.Code)
	}
	if response.Header().Get("Content-Type") != "application/json" {
		t.Fatal("expected an application/json error response")
	}

	var body partyErrorResponse
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal("sensitive Party error response was not valid JSON")
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(response.Body.Bytes(), &fields); err != nil {
		t.Fatal("sensitive Party error response was not a JSON object")
	}
	if len(fields) != 2 || fields["error"] == nil || fields["code"] == nil {
		t.Fatal("sensitive Party error response exposed an unexpected field set")
	}
	if body.Code != wantCode || body.Error != expectedPartyErrorMessage(wantCode) {
		t.Fatal("sensitive Party error response used the wrong safe code or message")
	}
}

func assertInviteCreationResponse(
	t *testing.T,
	response *httptest.ResponseRecorder,
	rawToken string,
	wantCreatedAt string,
	wantExpiresAt string,
) {
	t.Helper()
	if response.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", response.Code)
	}
	if response.Header().Get("Content-Type") != "application/json" {
		t.Fatal("expected an application/json invite-creation response")
	}

	var body partyInviteResponse
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal("invite-creation response was not valid JSON")
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(response.Body.Bytes(), &fields); err != nil {
		t.Fatal("invite-creation response was not a JSON object")
	}
	if len(fields) != 3 || fields["token"] == nil || fields["createdAt"] == nil || fields["expiresAt"] == nil {
		t.Fatal("invite-creation response exposed an unexpected field set")
	}
	if body.Token != rawToken || body.CreatedAt != wantCreatedAt || body.ExpiresAt != wantExpiresAt {
		t.Fatal("invite-creation response did not preserve the approved values")
	}
	if strings.Count(response.Body.String(), rawToken) != 1 {
		t.Fatal("invite-creation response must serialize the raw token exactly once")
	}
}

func assertInviteInspectionResponse(
	t *testing.T,
	response *httptest.ResponseRecorder,
	rawToken string,
	wantPartyID uuid.UUID,
	wantPartyName string,
	wantExpiresAt string,
) {
	t.Helper()
	if response.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.Code)
	}
	if response.Header().Get("Content-Type") != "application/json" {
		t.Fatal("expected an application/json invite-inspection response")
	}

	var body inviteInspectionResponse
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal("invite-inspection response was not valid JSON")
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(response.Body.Bytes(), &fields); err != nil {
		t.Fatal("invite-inspection response was not a JSON object")
	}
	if len(fields) != 2 || fields["party"] == nil || fields["expiresAt"] == nil {
		t.Fatal("invite-inspection response exposed an unexpected field set")
	}
	if body.Party.ID != wantPartyID.String() || body.Party.Name != wantPartyName || body.ExpiresAt != wantExpiresAt {
		t.Fatal("invite-inspection response did not preserve the approved public values")
	}
	if strings.Contains(response.Body.String(), rawToken) {
		t.Fatal("invite-inspection response exposed the raw token")
	}
}

func executeJoinRequest(handler Handler, requesterID uuid.UUID, rawToken string, characterID uuid.UUID) *httptest.ResponseRecorder {
	request := authenticatedPartyRequest(http.MethodPost, "/party-invites/join", joinRequestBody(rawToken, characterID), requesterID)
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	handler.Join(response, request)
	return response
}

func joinRequestBody(rawToken string, characterID uuid.UUID) string {
	body, err := json.Marshal(map[string]string{"token": rawToken, "characterId": characterID.String()})
	if err != nil {
		panic("could not build join request fixture")
	}
	return string(body)
}

func joinHandlerMembership(characterID uuid.UUID) PartyMembership {
	return PartyMembership{
		ID:          uuid.MustParse("75000000-0000-0000-0000-000000000001"),
		PartyID:     uuid.MustParse("76000000-0000-0000-0000-000000000001"),
		Role:        RolePlayer,
		CharacterID: characterID,
		JoinedAt:    time.Date(2026, 7, 13, 12, 30, 0, 0, time.UTC),
	}
}

func assertJoinResponse(
	t *testing.T,
	response *httptest.ResponseRecorder,
	wantStatus int,
	rawToken string,
	requesterID uuid.UUID,
	membership PartyMembership,
) {
	t.Helper()
	if response.Code != wantStatus {
		t.Fatalf("expected status %d, got %d", wantStatus, response.Code)
	}
	if response.Header().Get("Content-Type") != "application/json" {
		t.Fatal("expected an application/json join response")
	}

	var body joinPartyResponse
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal("join response was not valid JSON")
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(response.Body.Bytes(), &fields); err != nil {
		t.Fatal("join response was not a JSON object")
	}
	if len(fields) != 5 || fields["partyId"] == nil || fields["membershipId"] == nil ||
		fields["role"] == nil || fields["characterId"] == nil || fields["joinedAt"] == nil {
		t.Fatal("join response changed the frozen public field set")
	}
	if body.PartyID != membership.PartyID.String() || body.MembershipID != membership.ID.String() ||
		body.Role != membership.Role || body.CharacterID != membership.CharacterID.String() ||
		body.JoinedAt != formatPartyTimestamp(membership.JoinedAt) {
		t.Fatal("join response did not preserve the approved membership values")
	}
	if strings.Contains(response.Body.String(), rawToken) || strings.Contains(response.Body.String(), requesterID.String()) {
		t.Fatal("join response exposed an invite token or authenticated user ID")
	}
}
