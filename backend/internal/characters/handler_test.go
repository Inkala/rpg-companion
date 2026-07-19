package characters

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/Inkala/rpg-companion/backend/internal/auth"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/lib/pq"
)

func TestNewHandlerInitializesPartyGMRepositorySeam(t *testing.T) {
	handler := NewHandler(&Repository{})
	if handler.getCharacterForPartyGM == nil {
		t.Fatal("expected NewHandler to initialize the Party GM repository seam")
	}
}

func TestGetByIDForPartyGMRequiresAuthenticatedContext(t *testing.T) {
	partyID := uuid.New()
	characterID := uuid.New()
	handler := NewHandler(nil)
	handler.getCharacterForPartyGM = func(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) (Character, error) {
		panic("unauthenticated Party GM request reached the repository")
	}
	request := httptest.NewRequest(http.MethodGet, "/parties/"+partyID.String()+"/characters/"+characterID.String(), nil)
	request.SetPathValue("partyId", partyID.String())
	request.SetPathValue("characterId", characterID.String())
	response := httptest.NewRecorder()

	handler.GetByIDForPartyGM(response, request)

	assertSafeCharacterError(t, response, http.StatusUnauthorized, "authentication required")
}

func TestGetByIDForPartyGMRejectsMalformedPathUUIDs(t *testing.T) {
	requesterID := uuid.New()
	partyID := uuid.New()
	characterID := uuid.New()
	handler := NewHandler(nil)
	handler.getCharacterForPartyGM = func(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) (Character, error) {
		panic("malformed Party GM path reached the repository")
	}

	tests := []struct {
		name        string
		partyID     string
		characterID string
	}{
		{name: "malformed Party ID", partyID: "private-party-value", characterID: characterID.String()},
		{name: "malformed Character ID", partyID: partyID.String(), characterID: "private-character-value"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/", nil)
			request.SetPathValue("partyId", tt.partyID)
			request.SetPathValue("characterId", tt.characterID)
			request = withAuthenticatedUser(request, requesterID)
			response := httptest.NewRecorder()

			handler.GetByIDForPartyGM(response, request)

			if response.Code != http.StatusBadRequest {
				t.Fatalf("expected status 400, got %d", response.Code)
			}
			if strings.Contains(response.Body.String(), tt.partyID) || strings.Contains(response.Body.String(), tt.characterID) {
				t.Fatal("path validation response exposed a supplied path value")
			}
		})
	}
}

func TestGetByIDForPartyGMReturnsCompleteValidatedCharacterWithoutOwner(t *testing.T) {
	requesterID := uuid.New()
	partyID := uuid.New()
	characterID := uuid.New()
	ownerID := uuid.New()
	character := validStoredPartyGMCharacter(t)
	character.ID = characterID
	character.OwnerSubjectID = &ownerID
	originalPayload := append(json.RawMessage(nil), character.ReferencePayload...)
	handler := NewHandler(nil)
	handler.getCharacterForPartyGM = func(
		_ context.Context,
		gotCharacterID uuid.UUID,
		gotPartyID uuid.UUID,
		gotRequesterID uuid.UUID,
	) (Character, error) {
		if gotCharacterID != characterID || gotPartyID != partyID || gotRequesterID != requesterID {
			t.Fatal("Party GM handler used incorrect authorization-scoped identifiers")
		}
		return character, nil
	}
	request := partyGMCharacterRequest(requesterID, partyID, characterID)
	response := httptest.NewRecorder()

	handler.GetByIDForPartyGM(response, request)

	assertCompletePartyGMCharacterResponse(t, response, character)
	if character.OwnerSubjectID == nil || *character.OwnerSubjectID != ownerID {
		t.Fatal("Party GM handler mutated the repository character owner")
	}
	if !bytes.Equal(character.ReferencePayload, originalPayload) {
		t.Fatal("Party GM handler mutated the repository character payload")
	}
}

func TestGetByIDForPartyGMReturnsIndistinguishableNotFoundResponses(t *testing.T) {
	requesterID := uuid.New()
	partyID := uuid.New()
	characterID := uuid.New()
	scenarios := []string{"unknown", "nonmember", "Player", "unlinked", "cross-party"}
	var firstResponse string

	for _, scenario := range scenarios {
		t.Run(scenario, func(t *testing.T) {
			handler := NewHandler(nil)
			handler.getCharacterForPartyGM = func(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) (Character, error) {
				return Character{}, ErrNotFound
			}
			response := httptest.NewRecorder()

			handler.GetByIDForPartyGM(response, partyGMCharacterRequest(requesterID, partyID, characterID))

			assertSafeCharacterError(t, response, http.StatusNotFound, "character not found")
			if firstResponse == "" {
				firstResponse = response.Body.String()
			} else if response.Body.String() != firstResponse {
				t.Fatal("authorization failures returned distinguishable Character responses")
			}
		})
	}
}

func TestGetByIDForPartyGMFailsClosedForUnsafeStoredPayloads(t *testing.T) {
	requesterID := uuid.New()
	partyID := uuid.New()
	characterID := uuid.New()
	valid := validStoredPartyGMCharacter(t)

	tests := []struct {
		name      string
		payload   json.RawMessage
		forbidden string
	}{
		{name: "malformed", payload: json.RawMessage(`{"secret":"private-malformed-payload"`), forbidden: "private-malformed-payload"},
		{
			name:      "unsupported",
			payload:   json.RawMessage(strings.Replace(string(valid.ReferencePayload), "CharacterSheetV1", "CharacterSheetV2", 1)),
			forbidden: "CharacterSheetV2",
		},
		{
			name:      "oversized",
			payload:   json.RawMessage(`{"marker":"private-oversized-payload","padding":"` + strings.Repeat("x", maxV2StoredReferencePayloadBytes) + `"}`),
			forbidden: "private-oversized-payload",
		},
		{
			name:      "core-inconsistent",
			payload:   json.RawMessage(strings.Replace(string(valid.ReferencePayload), valid.Name, "Private Different Name", 1)),
			forbidden: "Private Different Name",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			character := valid
			character.ID = characterID
			character.ReferencePayload = tt.payload
			handler := NewHandler(nil)
			handler.getCharacterForPartyGM = func(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) (Character, error) {
				return character, nil
			}
			response := httptest.NewRecorder()

			handler.GetByIDForPartyGM(response, partyGMCharacterRequest(requesterID, partyID, characterID))

			assertSafeCharacterError(t, response, http.StatusInternalServerError, "could not load character")
			if strings.Contains(response.Body.String(), tt.forbidden) {
				t.Fatal("fail-closed Party Character response exposed unsafe stored payload content")
			}
		})
	}
}

func TestGetByIDForPartyGMPreservesDatabaseFailuresAsGenericServerError(t *testing.T) {
	requesterID := uuid.New()
	partyID := uuid.New()
	characterID := uuid.New()
	databaseError := errors.New("private-database-detail")
	handler := NewHandler(nil)
	handler.getCharacterForPartyGM = func(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) (Character, error) {
		return Character{}, databaseError
	}
	response := httptest.NewRecorder()

	handler.GetByIDForPartyGM(response, partyGMCharacterRequest(requesterID, partyID, characterID))

	assertSafeCharacterError(t, response, http.StatusInternalServerError, "could not load character")
	if strings.Contains(response.Body.String(), databaseError.Error()) {
		t.Fatal("Party Character response exposed a database error")
	}
}

func TestPartyGMOwnerScrubbingDoesNotChangeOwnerScopedResponseMapping(t *testing.T) {
	character := validStoredPartyGMCharacter(t)
	ownerID := uuid.New()
	character.OwnerSubjectID = &ownerID

	response := responseFromCharacter(character)

	if response.OwnerSubjectID == nil || *response.OwnerSubjectID != ownerID.String() {
		t.Fatal("existing owner-scoped Character response no longer includes its owner")
	}
}

func TestCharacterHTTPPersistence(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := NewHandler(NewRepository(pool))
	mux := http.NewServeMux()
	mux.HandleFunc("POST /characters", handler.Create)
	mux.HandleFunc("GET /characters/{id}", handler.GetByID)
	ownerID := uuid.New()
	insertTestUser(t, pool, ownerID, "mara")

	createRecorder := httptest.NewRecorder()
	createRequest := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(validCharacterJSON()))
	createRequest.Header.Set("Content-Type", "application/json")
	createRequest = withAuthenticatedUser(createRequest, ownerID)
	mux.ServeHTTP(createRecorder, createRequest)

	if createRecorder.Code != http.StatusCreated {
		t.Fatalf("expected create status %d, got %d with body %s", http.StatusCreated, createRecorder.Code, createRecorder.Body.String())
	}

	var created characterResponse
	if err := json.NewDecoder(createRecorder.Body).Decode(&created); err != nil {
		t.Fatalf("decode create response: %v", err)
	}

	getRecorder := httptest.NewRecorder()
	getRequest := httptest.NewRequest(http.MethodGet, "/characters/"+created.ID, nil)
	getRequest = withAuthenticatedUser(getRequest, ownerID)
	mux.ServeHTTP(getRecorder, getRequest)

	if getRecorder.Code != http.StatusOK {
		t.Fatalf("expected get status %d, got %d with body %s", http.StatusOK, getRecorder.Code, getRecorder.Body.String())
	}

	var loaded characterResponse
	if err := json.NewDecoder(getRecorder.Body).Decode(&loaded); err != nil {
		t.Fatalf("decode get response: %v", err)
	}

	if loaded.ID != created.ID {
		t.Errorf("expected id %q, got %q", created.ID, loaded.ID)
	}
	if loaded.OwnerSubjectID == nil || *loaded.OwnerSubjectID != ownerID.String() {
		t.Fatalf("expected ownerSubjectId %q, got %v", ownerID.String(), loaded.OwnerSubjectID)
	}
	if loaded.Name != "Mara Vale" {
		t.Errorf("expected name Mara Vale, got %q", loaded.Name)
	}
	if loaded.HitPoints.Current != 26 || loaded.HitPoints.Max != 26 {
		t.Errorf("expected HP 26/26, got %d/%d", loaded.HitPoints.Current, loaded.HitPoints.Max)
	}
	if string(loaded.ReferencePayload) == "" {
		t.Error("expected referencePayload to be present")
	}

	otherUserRecorder := httptest.NewRecorder()
	otherUserRequest := httptest.NewRequest(http.MethodGet, "/characters/"+created.ID, nil)
	otherUserRequest = withAuthenticatedUser(otherUserRequest, uuid.New())
	mux.ServeHTTP(otherUserRecorder, otherUserRequest)

	if otherUserRecorder.Code != http.StatusNotFound {
		t.Fatalf("expected other user status %d, got %d with body %s", http.StatusNotFound, otherUserRecorder.Code, otherUserRecorder.Body.String())
	}
}

func TestCharacterHTTPListSummaries(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	repository := NewRepository(pool)
	handler := NewHandler(repository)
	mux := http.NewServeMux()
	mux.HandleFunc("GET /characters", handler.List)

	ownerID := uuid.MustParse("10000000-0000-0000-0000-000000000001")
	otherOwnerID := uuid.MustParse("10000000-0000-0000-0000-000000000002")
	insertTestUser(t, pool, ownerID, "mara")
	insertTestUser(t, pool, otherOwnerID, "other")

	emptyRecorder := httptest.NewRecorder()
	emptyRequest := httptest.NewRequest(http.MethodGet, "/characters", nil)
	emptyRequest = withAuthenticatedUser(emptyRequest, ownerID)
	mux.ServeHTTP(emptyRecorder, emptyRequest)

	if emptyRecorder.Code != http.StatusOK {
		t.Fatalf("expected empty list status %d, got %d with body %s", http.StatusOK, emptyRecorder.Code, emptyRecorder.Body.String())
	}
	var emptyResponse characterListResponse
	if err := json.NewDecoder(emptyRecorder.Body).Decode(&emptyResponse); err != nil {
		t.Fatalf("decode empty list response: %v", err)
	}
	if len(emptyResponse.Characters) != 0 {
		t.Fatalf("expected empty character list, got %v", emptyResponse.Characters)
	}

	updatedAt := time.Date(2026, 7, 5, 12, 0, 0, 0, time.UTC)
	createTestCharacter(t, repository, testCharacterInput{
		ID:        uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		OwnerID:   ownerID,
		Name:      "Older Ranger",
		Subclass:  stringPtr("Hunter"),
		UpdatedAt: updatedAt,
	})
	createTestCharacter(t, repository, testCharacterInput{
		ID:        uuid.MustParse("00000000-0000-0000-0000-000000000002"),
		OwnerID:   ownerID,
		Name:      "Newest Fighter",
		Subclass:  nil,
		UpdatedAt: updatedAt,
	})
	createTestCharacter(t, repository, testCharacterInput{
		ID:        uuid.MustParse("00000000-0000-0000-0000-000000000003"),
		OwnerID:   otherOwnerID,
		Name:      "Other User Character",
		Subclass:  stringPtr("Thief"),
		UpdatedAt: updatedAt.Add(time.Hour),
	})

	listRecorder := httptest.NewRecorder()
	listRequest := httptest.NewRequest(http.MethodGet, "/characters", nil)
	listRequest = withAuthenticatedUser(listRequest, ownerID)
	mux.ServeHTTP(listRecorder, listRequest)

	if listRecorder.Code != http.StatusOK {
		t.Fatalf("expected list status %d, got %d with body %s", http.StatusOK, listRecorder.Code, listRecorder.Body.String())
	}

	responseBody := listRecorder.Body.Bytes()
	var response characterListResponse
	if err := json.NewDecoder(bytes.NewReader(responseBody)).Decode(&response); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	if len(response.Characters) != 2 {
		t.Fatalf("expected 2 owned characters, got %d: %v", len(response.Characters), response.Characters)
	}
	if response.Characters[0].Name != "Newest Fighter" || response.Characters[1].Name != "Older Ranger" {
		t.Fatalf("expected updated_at DESC, id DESC order, got %q then %q", response.Characters[0].Name, response.Characters[1].Name)
	}
	if response.Characters[0].SubclassName != nil {
		t.Fatalf("expected null subclassName for missing subclass, got %v", response.Characters[0].SubclassName)
	}
	if response.Characters[1].SubclassName == nil || *response.Characters[1].SubclassName != "Hunter" {
		t.Fatalf("expected Hunter subclass for second character, got %v", response.Characters[1].SubclassName)
	}
	if response.Characters[0].HitPoints.Current != 26 || response.Characters[0].HitPoints.Max != 26 {
		t.Fatalf("expected HP 26/26, got %d/%d", response.Characters[0].HitPoints.Current, response.Characters[0].HitPoints.Max)
	}
	if response.Characters[0].ArmorClass != 14 {
		t.Fatalf("expected armor class 14, got %d", response.Characters[0].ArmorClass)
	}
	if response.Characters[0].SpeedFt != 30 {
		t.Fatalf("expected speed 30, got %d", response.Characters[0].SpeedFt)
	}
	if response.Characters[0].PortraitAssetID == nil || *response.Characters[0].PortraitAssetID != "older-ranger-portrait" {
		t.Fatalf("expected portrait asset ID, got %v", response.Characters[0].PortraitAssetID)
	}
	if response.Characters[0].PortraitAlt == nil || *response.Characters[0].PortraitAlt != "Portrait of Older Ranger" {
		t.Fatalf("expected portrait alt text, got %v", response.Characters[0].PortraitAlt)
	}
	if !reflect.DeepEqual(response.Characters[0].FeaturedAbilities, []string{"Longbow", "Colossus Slayer"}) {
		t.Fatalf("expected featured abilities, got %v", response.Characters[0].FeaturedAbilities)
	}
	if response.Characters[0].LandingConcept != "A steady wilderness scout." {
		t.Fatalf("expected landing concept, got %q", response.Characters[0].LandingConcept)
	}
	if response.Characters[0].UpdatedAt != updatedAt.UTC().Format(time.RFC3339) {
		t.Fatalf("expected updatedAt %q, got %q", updatedAt.UTC().Format(time.RFC3339), response.Characters[0].UpdatedAt)
	}

	var rawResponse map[string][]map[string]any
	if err := json.NewDecoder(bytes.NewReader(responseBody)).Decode(&rawResponse); err != nil {
		t.Fatalf("decode raw list response: %v", err)
	}
	firstRawCharacter := rawResponse["characters"][0]
	assertExactJSONKeys(t, firstRawCharacter,
		"id",
		"name",
		"className",
		"subclassName",
		"level",
		"ancestry",
		"background",
		"hitPoints",
		"armorClass",
		"speedFt",
		"portraitAssetId",
		"portraitAlt",
		"featuredAbilities",
		"landingConcept",
		"updatedAt",
	)
	for _, excludedField := range []string{
		"ownerSubjectId",
		"ownerId",
		"email",
		"abilityScores",
		"createdAt",
		"referencePayload",
		"party",
		"partyId",
		"partyName",
		"partyRole",
		"membershipId",
	} {
		if _, ok := firstRawCharacter[excludedField]; ok {
			t.Fatalf("list response must not include %s: %v", excludedField, firstRawCharacter)
		}
	}
}

func TestCharacterHTTPValidation(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := NewHandler(NewRepository(pool))
	mux := http.NewServeMux()
	mux.HandleFunc("POST /characters", handler.Create)
	mux.HandleFunc("GET /characters/{id}", handler.GetByID)
	ownerID := uuid.New()

	tests := []struct {
		name   string
		method string
		path   string
		body   []byte
		want   int
		auth   bool
	}{
		{
			name:   "malformed JSON",
			method: http.MethodPost,
			path:   "/characters",
			body:   []byte(`{"name":`),
			want:   http.StatusBadRequest,
			auth:   true,
		},
		{
			name:   "invalid character fields",
			method: http.MethodPost,
			path:   "/characters",
			body: []byte(`{
				"name": "",
				"className": "Ranger",
				"level": 0,
				"ancestry": "Human",
				"background": "Outlander",
				"abilityScores": {"strength":10,"dexterity":16,"constitution":14,"intelligence":10,"wisdom":14,"charisma":8},
				"hitPoints": {"current": 30, "max": 26},
				"armorClass": 14,
				"speedFt": 30,
				"referencePayload": {"actions":[]}
			}`),
			want: http.StatusBadRequest,
			auth: true,
		},
		{
			name:   "client owner is rejected",
			method: http.MethodPost,
			path:   "/characters",
			body: []byte(`{
				"ownerSubjectId": "00000000-0000-0000-0000-000000000001",
				"name": "Mara Vale",
				"className": "Ranger",
				"level": 3,
				"ancestry": "Human",
				"background": "Outlander",
				"abilityScores": {"strength":10,"dexterity":16,"constitution":14,"intelligence":10,"wisdom":14,"charisma":8},
				"hitPoints": {"current": 26, "max": 26},
				"armorClass": 14,
				"speedFt": 30,
				"referencePayload": {"actions":[]}
			}`),
			want: http.StatusBadRequest,
			auth: true,
		},
		{
			name:   "malformed UUID path",
			method: http.MethodGet,
			path:   "/characters/not-a-uuid",
			want:   http.StatusBadRequest,
			auth:   true,
		},
		{
			name:   "missing character",
			method: http.MethodGet,
			path:   "/characters/00000000-0000-0000-0000-000000000000",
			want:   http.StatusNotFound,
			auth:   true,
		},
		{
			name:   "unauthenticated create",
			method: http.MethodPost,
			path:   "/characters",
			body:   validCharacterJSON(),
			want:   http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(tt.method, tt.path, bytes.NewReader(tt.body))
			if tt.method == http.MethodPost && len(tt.body) > 0 {
				request.Header.Set("Content-Type", "application/json")
			}
			if tt.auth {
				request = withAuthenticatedUser(request, ownerID)
			}
			mux.ServeHTTP(recorder, request)

			if recorder.Code != tt.want {
				t.Fatalf("expected status %d, got %d with body %s", tt.want, recorder.Code, recorder.Body.String())
			}
		})
	}
}

func TestCharacterCreateRejectsOversizedRequestBody(t *testing.T) {
	handler := NewHandler(&Repository{})
	request := httptest.NewRequest(
		http.MethodPost,
		"/characters",
		strings.NewReader(`{"name":"`+strings.Repeat("a", 131072)+`"}`),
	)
	request.Header.Set("Content-Type", "application/json")
	request = withAuthenticatedUser(request, uuid.New())
	recorder := httptest.NewRecorder()

	handler.Create(recorder, request)

	if recorder.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusRequestEntityTooLarge, recorder.Code, recorder.Body.String())
	}
}

func TestCharacterCreateRejectsOversizedReferencePayloadBeforePersistence(t *testing.T) {
	createRequest := validCreateCharacterRequest()
	payload := referencePayloadWithSize(t, 65537)
	createRequest.ReferencePayload = &payload
	body, err := json.Marshal(createRequest)
	if err != nil {
		t.Fatalf("marshal character request: %v", err)
	}

	handler := NewHandler(&Repository{})
	request := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request = withAuthenticatedUser(request, uuid.New())
	recorder := httptest.NewRecorder()

	handler.Create(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusBadRequest, recorder.Code, recorder.Body.String())
	}
	var response struct {
		Error   string   `json:"error"`
		Details []string `json:"details"`
	}
	if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
		t.Fatalf("decode validation response: %v", err)
	}
	if response.Error != "character validation failed" {
		t.Fatalf("expected safe validation error, got %q", response.Error)
	}
	if !contains(response.Details, "referencePayload must be at most 65536 bytes") {
		t.Fatalf("expected payload-size detail, got %v", response.Details)
	}
}

func TestCharacterCreateRejectsInvalidCharacterSheetEnvelopeSafelyBeforePersistence(t *testing.T) {
	createRequest := validCreateCharacterRequest()
	envelope := testCharacterSheetEnvelope()
	envelope["unexpectedTopLevel"] = "must-not-be-reflected"
	payload := marshalCharacterSheetPayload(t, envelope)
	createRequest.ReferencePayload = &payload
	body, err := json.Marshal(createRequest)
	if err != nil {
		t.Fatalf("marshal character request: %v", err)
	}

	handler := NewHandler(&Repository{})
	request := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request = withAuthenticatedUser(request, uuid.New())
	recorder := httptest.NewRecorder()

	handler.Create(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusBadRequest, recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"error":"character validation failed"`) {
		t.Fatalf("expected safe validation response, got %s", recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), "unexpectedTopLevel") || strings.Contains(recorder.Body.String(), "must-not-be-reflected") {
		t.Fatalf("validation response reflected rejected payload details: %s", recorder.Body.String())
	}
}

func TestCharacterCreateRejectsInconsistentCharacterSheetIdentityBeforePersistence(t *testing.T) {
	createRequest := validCreateCharacterRequest()
	envelope := testCharacterSheetEnvelope()
	envelope["identity"].(map[string]any)["name"] = "must-not-be-reflected"
	payload := marshalCharacterSheetPayload(t, envelope)
	createRequest.ReferencePayload = &payload
	body, err := json.Marshal(createRequest)
	if err != nil {
		t.Fatalf("marshal character request: %v", err)
	}

	handler := NewHandler(&Repository{})
	request := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request = withAuthenticatedUser(request, uuid.New())
	recorder := httptest.NewRecorder()

	handler.Create(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusBadRequest, recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"error":"character validation failed"`) {
		t.Fatalf("expected safe validation response, got %s", recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), "must-not-be-reflected") {
		t.Fatalf("validation response reflected rejected identity: %s", recorder.Body.String())
	}
}

func TestCharacterCreateRejectsInvalidCharacterSheetSummaryBeforePersistence(t *testing.T) {
	createRequest := validCreateCharacterRequest()
	envelope := testCharacterSheetEnvelope()
	testSummary(envelope)["displayLine"] = "must-not-be-reflected"
	delete(testSummary(envelope), "landingConcept")
	payload := marshalCharacterSheetPayload(t, envelope)
	createRequest.ReferencePayload = &payload
	body, err := json.Marshal(createRequest)
	if err != nil {
		t.Fatalf("marshal character request: %v", err)
	}

	handler := NewHandler(&Repository{})
	request := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request = withAuthenticatedUser(request, uuid.New())
	recorder := httptest.NewRecorder()

	handler.Create(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusBadRequest, recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"error":"character validation failed"`) {
		t.Fatalf("expected safe validation response, got %s", recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), "must-not-be-reflected") {
		t.Fatalf("validation response reflected rejected summary: %s", recorder.Body.String())
	}
}

func TestCharacterCreateRejectsInvalidCharacterSheetCombatBeforePersistence(t *testing.T) {
	createRequest := validCreateCharacterRequest()
	envelope := testCharacterSheetEnvelope()
	testCombat(envelope)["concentration"] = "must-not-be-reflected"
	delete(testCombat(envelope), "hitPoints")
	payload := marshalCharacterSheetPayload(t, envelope)
	createRequest.ReferencePayload = &payload
	body, err := json.Marshal(createRequest)
	if err != nil {
		t.Fatalf("marshal character request: %v", err)
	}

	handler := NewHandler(&Repository{})
	request := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request = withAuthenticatedUser(request, uuid.New())
	recorder := httptest.NewRecorder()

	handler.Create(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusBadRequest, recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"error":"character validation failed"`) {
		t.Fatalf("expected safe validation response, got %s", recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), "must-not-be-reflected") {
		t.Fatalf("validation response reflected rejected combat data: %s", recorder.Body.String())
	}
}

func TestCharacterCreateRejectsInvalidCharacterSheetProficienciesBeforePersistence(t *testing.T) {
	createRequest := validCreateCharacterRequest()
	envelope := testCharacterSheetEnvelope()
	testAuditedProficiencyList(envelope, "weapons")["note"] = "must-not-be-reflected"
	delete(testProficiencies(envelope), "skills")
	payload := marshalCharacterSheetPayload(t, envelope)
	createRequest.ReferencePayload = &payload
	body, err := json.Marshal(createRequest)
	if err != nil {
		t.Fatalf("marshal character request: %v", err)
	}

	handler := NewHandler(&Repository{})
	request := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request = withAuthenticatedUser(request, uuid.New())
	recorder := httptest.NewRecorder()

	handler.Create(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusBadRequest, recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"error":"character validation failed"`) {
		t.Fatalf("expected safe validation response, got %s", recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), "must-not-be-reflected") {
		t.Fatalf("validation response reflected rejected proficiency data: %s", recorder.Body.String())
	}
}

func TestCharacterCreateRejectsInvalidCharacterSheetReferenceItemsBeforePersistence(t *testing.T) {
	createRequest := validCreateCharacterRequest()
	envelope := testCharacterSheetEnvelope()
	action := validTestAction("invalid-action")
	action["summary"] = "must-not-be-reflected"
	delete(action, "kind")
	envelope["actions"] = []any{action}
	payload := marshalCharacterSheetPayload(t, envelope)
	createRequest.ReferencePayload = &payload
	body, err := json.Marshal(createRequest)
	if err != nil {
		t.Fatalf("marshal character request: %v", err)
	}

	handler := NewHandler(&Repository{})
	request := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request = withAuthenticatedUser(request, uuid.New())
	recorder := httptest.NewRecorder()

	handler.Create(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusBadRequest, recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"error":"character validation failed"`) {
		t.Fatalf("expected safe validation response, got %s", recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), "must-not-be-reflected") {
		t.Fatalf("validation response reflected rejected reference item data: %s", recorder.Body.String())
	}
}

func TestCharacterCreateRejectsInvalidCharacterSheetSpellcastingBeforePersistence(t *testing.T) {
	createRequest := validCreateCharacterRequest()
	envelope := testCharacterSheetEnvelope()
	spellcasting := validTestSpellcasting()
	spell := validTestSpell("invalid-spell")
	spell["summary"] = "must-not-be-reflected"
	delete(spell, "source")
	spellcasting["spells"] = []any{spell}
	envelope["spellcasting"] = spellcasting
	payload := marshalCharacterSheetPayload(t, envelope)
	createRequest.ReferencePayload = &payload
	body, err := json.Marshal(createRequest)
	if err != nil {
		t.Fatalf("marshal character request: %v", err)
	}

	handler := NewHandler(&Repository{})
	request := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request = withAuthenticatedUser(request, uuid.New())
	recorder := httptest.NewRecorder()

	handler.Create(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusBadRequest, recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"error":"character validation failed"`) {
		t.Fatalf("expected safe validation response, got %s", recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), "must-not-be-reflected") {
		t.Fatalf("validation response reflected rejected spell data: %s", recorder.Body.String())
	}
}

func TestCharacterCreateRejectsInvalidCharacterSheetSupportingDataBeforePersistence(t *testing.T) {
	createRequest := validCreateCharacterRequest()
	envelope := testCharacterSheetEnvelope()
	testAudit(envelope)["source"] = "must-not-be-reflected"
	delete(testEquipment(envelope), "weapons")
	payload := marshalCharacterSheetPayload(t, envelope)
	createRequest.ReferencePayload = &payload
	body, err := json.Marshal(createRequest)
	if err != nil {
		t.Fatalf("marshal character request: %v", err)
	}

	handler := NewHandler(&Repository{})
	request := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request = withAuthenticatedUser(request, uuid.New())
	recorder := httptest.NewRecorder()

	handler.Create(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusBadRequest, recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"error":"character validation failed"`) {
		t.Fatalf("expected safe validation response, got %s", recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), "must-not-be-reflected") {
		t.Fatalf("validation response reflected rejected supporting data: %s", recorder.Body.String())
	}
}

func TestCharacterCreateMapsInvalidDatabaseDataToSafeBadRequest(t *testing.T) {
	postgresText := "database-detail-must-not-be-exposed"
	rejectedValue := "rejected-value-must-not-be-exposed"
	handler := Handler{
		repository: &Repository{},
		createCharacter: func(context.Context, Character) (Character, error) {
			return Character{}, mapCharacterCreateError(&pgconn.PgError{
				Code:           "23514",
				ConstraintName: "characters_level_check",
				Message:        postgresText,
				Detail:         rejectedValue,
			})
		},
	}
	recorder := performValidCharacterCreate(t, handler)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusBadRequest, recorder.Code, recorder.Body.String())
	}
	if recorder.Body.String() != "{\"error\":\"character validation failed\"}\n" {
		t.Fatalf("expected exact safe response, got %s", recorder.Body.String())
	}
	for _, secret := range []string{postgresText, rejectedValue, "characters_level_check"} {
		if strings.Contains(recorder.Body.String(), secret) {
			t.Fatalf("response exposed database data %q: %s", secret, recorder.Body.String())
		}
	}
}

func TestCharacterCreateKeepsUnrelatedDatabaseFailuresGeneric(t *testing.T) {
	databaseText := "connection-detail-must-not-be-exposed"
	handler := Handler{
		repository: &Repository{},
		createCharacter: func(context.Context, Character) (Character, error) {
			return Character{}, errors.New(databaseText)
		},
	}
	recorder := performValidCharacterCreate(t, handler)

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusInternalServerError, recorder.Code, recorder.Body.String())
	}
	if recorder.Body.String() != "{\"error\":\"could not persist character\"}\n" {
		t.Fatalf("expected exact safe response, got %s", recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), databaseText) {
		t.Fatalf("response exposed database error: %s", recorder.Body.String())
	}
}

func TestCharacterCreateSuccessRemainsCreated(t *testing.T) {
	handler := Handler{
		repository: &Repository{},
		createCharacter: func(_ context.Context, character Character) (Character, error) {
			return character, nil
		},
	}
	recorder := performValidCharacterCreate(t, handler)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d with body %s", http.StatusCreated, recorder.Code, recorder.Body.String())
	}
}

func performValidCharacterCreate(t *testing.T, handler Handler) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(validCharacterJSON()))
	request.Header.Set("Content-Type", "application/json")
	request = withAuthenticatedUser(request, uuid.New())
	recorder := httptest.NewRecorder()
	handler.Create(recorder, request)
	return recorder
}

func withAuthenticatedUser(request *http.Request, userID uuid.UUID) *http.Request {
	user := auth.AuthenticatedUser{ID: userID, UsernameCanonical: "mara", Username: "Mara"}
	return request.WithContext(auth.WithAuthenticatedUser(request.Context(), user))
}

type testCharacterInput struct {
	ID               uuid.UUID
	OwnerID          uuid.UUID
	Name             string
	Subclass         *string
	UpdatedAt        time.Time
	ReferencePayload json.RawMessage
}

func createTestCharacter(t *testing.T, repository *Repository, input testCharacterInput) {
	t.Helper()

	ownerID := input.OwnerID
	_, err := repository.Create(context.Background(), Character{
		ID:             input.ID,
		OwnerSubjectID: &ownerID,
		Name:           input.Name,
		ClassName:      "Ranger",
		SubclassName:   input.Subclass,
		Level:          3,
		Ancestry:       "Human",
		Background:     "Outlander",
		AbilityScores: AbilityScores{
			Strength:     10,
			Dexterity:    16,
			Constitution: 14,
			Intelligence: 10,
			Wisdom:       14,
			Charisma:     8,
		},
		HitPoints: HitPoints{
			Current: 26,
			Max:     26,
		},
		ArmorClass:       14,
		SpeedFt:          30,
		ReferencePayload: testCharacterReferencePayload(input),
		CreatedAt:        input.UpdatedAt.Add(-time.Hour),
		UpdatedAt:        input.UpdatedAt,
	})
	if err != nil {
		t.Fatalf("create test character %s: %v", input.Name, err)
	}
}

func testCharacterReferencePayload(input testCharacterInput) json.RawMessage {
	if len(input.ReferencePayload) > 0 {
		return input.ReferencePayload
	}

	return json.RawMessage(`{
		"schemaVersion":"CharacterSheetV1",
		"summary":{
			"landingConcept":"A steady wilderness scout.",
			"portraitAssetId":"older-ranger-portrait",
			"portraitAlt":"Portrait of Older Ranger",
			"featuredAbilities":["Longbow","Colossus Slayer"]
		},
		"secret":"do not return from list"
	}`)
}

func assertExactJSONKeys(t *testing.T, object map[string]any, keys ...string) {
	t.Helper()
	if len(object) != len(keys) {
		t.Fatalf("expected exact keys %v, got %v", keys, object)
	}
	for _, key := range keys {
		if _, ok := object[key]; !ok {
			t.Fatalf("expected key %q in %v", key, object)
		}
	}
}

func insertTestUser(t *testing.T, pool *pgxpool.Pool, userID uuid.UUID, username string) {
	t.Helper()

	now := time.Now().UTC()
	usernameCanonical := strings.ToLower(username)
	_, err := pool.Exec(context.Background(), `
INSERT INTO users (
  id, username, username_canonical, email_canonical, password_hash, password_hash_algorithm, created_at, updated_at
) VALUES (
  $1::uuid, $2, $3, $4, $5, 'argon2id', $6, $7
	)`,
		userID.String(),
		username,
		usernameCanonical,
		usernameCanonical+"@example.com",
		"$argon2id$v=19$m=1024,t=1,p=1$c2FsdHNhbHRzYWx0MTIzNA$P9NQ0eZR7qLIr+TQe+P+2cWcYqvD4m+agytRM4pVr+0",
		now,
		now,
	)
	if err != nil {
		t.Fatalf("insert test user: %v", err)
	}
}

func setupIntegrationDatabase(t *testing.T) *pgxpool.Pool {
	t.Helper()

	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is not set; set it to a disposable PostgreSQL test database to run persistence integration tests")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	t.Cleanup(cancel)

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("connect to test database: %v", err)
	}
	t.Cleanup(pool.Close)

	if err := resetTestDatabase(ctx, pool); err != nil {
		t.Fatalf("reset test database: %v", err)
	}

	if err := runMigrations(databaseURL); err != nil {
		t.Fatalf("run migrations: %v", err)
	}

	return pool
}

func resetTestDatabase(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, "DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
	return err
}

func runMigrations(databaseURL string) error {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return err
	}
	defer db.Close()

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return err
	}

	migrationsPath, err := findMigrationsPath()
	if err != nil {
		return err
	}

	migrator, err := migrate.NewWithDatabaseInstance("file://"+migrationsPath, "postgres", driver)
	if err != nil {
		return err
	}
	defer migrator.Close()

	if err := migrator.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return err
	}
	return nil
}

func validStoredPartyGMCharacter(t *testing.T) Character {
	t.Helper()
	createdAt := time.Date(2026, 7, 13, 10, 0, 0, 0, time.UTC)
	character, err := characterFromRequest(validCreateCharacterRequest(), createdAt)
	if err != nil {
		t.Fatalf("create valid stored Party Character fixture: %v", err)
	}
	character.UpdatedAt = createdAt.Add(time.Hour)
	return character
}

func partyGMCharacterRequest(requesterID uuid.UUID, partyID uuid.UUID, characterID uuid.UUID) *http.Request {
	request := httptest.NewRequest(
		http.MethodGet,
		"/parties/"+partyID.String()+"/characters/"+characterID.String(),
		nil,
	)
	request.SetPathValue("partyId", partyID.String())
	request.SetPathValue("characterId", characterID.String())
	return withAuthenticatedUser(request, requesterID)
}

func assertSafeCharacterError(t *testing.T, response *httptest.ResponseRecorder, wantStatus int, wantMessage string) {
	t.Helper()
	if response.Code != wantStatus {
		t.Fatalf("expected status %d, got %d", wantStatus, response.Code)
	}
	if response.Header().Get("Content-Type") != "application/json" {
		t.Fatal("expected an application/json Character error")
	}
	var body map[string]string
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal("Character error response was not valid JSON")
	}
	if len(body) != 1 || body["error"] != wantMessage {
		t.Fatal("Character error response changed its safe public shape")
	}
}

func assertCompletePartyGMCharacterResponse(t *testing.T, recorder *httptest.ResponseRecorder, character Character) {
	t.Helper()
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	if recorder.Header().Get("Content-Type") != "application/json" {
		t.Fatal("expected an application/json Party Character response")
	}

	var actual characterResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &actual); err != nil {
		t.Fatal("Party Character response was not valid JSON")
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(recorder.Body.Bytes(), &fields); err != nil {
		t.Fatal("Party Character response was not a JSON object")
	}
	if len(fields) != 15 || fields["ownerSubjectId"] == nil || string(fields["ownerSubjectId"]) != "null" {
		t.Fatal("Party Character response changed the complete DTO or exposed its owner")
	}

	expected := responseFromCharacter(character)
	expected.OwnerSubjectID = nil
	actualJSON, err := json.Marshal(actual)
	if err != nil {
		t.Fatal("could not normalize actual Party Character response")
	}
	expectedJSON, err := json.Marshal(expected)
	if err != nil {
		t.Fatal("could not normalize expected Party Character response")
	}
	var actualValue any
	var expectedValue any
	if json.Unmarshal(actualJSON, &actualValue) != nil || json.Unmarshal(expectedJSON, &expectedValue) != nil {
		t.Fatal("could not compare Party Character responses semantically")
	}
	if !reflect.DeepEqual(actualValue, expectedValue) {
		t.Fatal("Party Character response did not preserve the complete validated Character DTO")
	}
}

func findMigrationsPath() (string, error) {
	workingDirectory, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for current := workingDirectory; ; current = filepath.Dir(current) {
		candidate := filepath.Join(current, "migrations")
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate, nil
		}

		parent := filepath.Dir(current)
		if parent == current {
			return "", os.ErrNotExist
		}
	}
}

func validCharacterJSON() []byte {
	return []byte(`{
		"ownerSubjectId": null,
		"name": "Mara Vale",
		"className": "Ranger",
		"subclassName": "Hunter",
		"level": 3,
		"ancestry": "Human",
		"background": "Outlander",
		"abilityScores": {
			"strength": 10,
			"dexterity": 16,
			"constitution": 14,
			"intelligence": 10,
			"wisdom": 14,
			"charisma": 8
		},
		"hitPoints": {
			"current": 26,
			"max": 26
		},
		"armorClass": 14,
		"speedFt": 30,
		"referencePayload": {
			"schemaVersion": "CharacterSheetV1",
			"ruleset": {"system":"dnd5e","version":"2014","sourceStatus":"audited-sample"},
			"identity": {"name":"Mara Vale","ancestry":"Human","background":"Outlander","classes":[{"name":"Ranger","level":3,"subclass":"Hunter"}]},
			"summary": {"displayLine":"Human Ranger - Level 3","landingConcept":"A steady wilderness scout.","featuredAbilities":[],"referenceSections":[]},
			"abilities": {"scores":{"strength":10,"dexterity":16,"constitution":14,"intelligence":10,"wisdom":14,"charisma":8}},
			"combat": {"hitPoints":{"current":26,"max":26,"temporary":0},"armorClass":{"value":14},"initiative":3,"speed":[{"type":"walk","feet":30}],"proficiencyBonus":2,"passivePerception":{},"concentration":null},
			"proficiencies": {"savingThrows":{"values":[]},"skills":[],"weapons":{"values":[]},"armor":{"values":[]},"tools":{"values":[]},"languages":{"values":[]}},
			"actions": [{"id":"longbow","name":"Longbow","kind":"attack","section":"actions","actionType":"Action","summary":"Reliable ranged attack.","meta":[]}],
			"features": [{"id":"colossus-slayer","name":"Colossus Slayer","category":"Hunter feature","source":{"rulesVersion":"2014","status":"confirmed"},"tags":[],"summary":"Add damage after hitting a wounded enemy.","includeInReference":true}],
			"spellcasting": null,
			"equipment": {"armor":{"values":[]},"weapons":[],"packsAndGear":{"values":[]},"tools":{"values":[]},"languages":{"values":[]},"currency":null},
			"personality": {"traits":[],"ideals":[],"bonds":[],"flaws":[],"notes":[]},
			"audit": {"source":"Manual character sheet","needsConfirmation":[],"rulesVersionWarnings":[],"deferredCorrections":[]}
		}
	}`)
}
