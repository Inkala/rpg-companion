package parties

import (
	"context"
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
				}}, nil
			},
		}
		response := httptest.NewRecorder()

		NewHandler(repository).List(response, authenticatedPartyRequest(http.MethodGet, "/parties", "", requesterID))

		assertPartyJSONResponse(t, response, http.StatusOK, map[string]any{
			"parties": []any{map[string]any{
				"id": partyID.String(), "name": "Moon Keep", "role": RoleGM,
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
	createParty func(context.Context, uuid.UUID, string) (Party, error)
	listParties func(context.Context, uuid.UUID) ([]PartySummary, error)
	getParty    func(context.Context, uuid.UUID, uuid.UUID) (PartyDetail, error)
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
