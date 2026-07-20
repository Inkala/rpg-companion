package characters

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestSlice3CreateV2BuildsServerAuthoritativeCharacterAndExactPrivateResponse(t *testing.T) {
	ownerID := uuid.New()
	requestDTO := slice3V2Request()
	body, err := json.Marshal(requestDTO)
	if err != nil {
		t.Fatal(err)
	}
	var persisted Character
	handler := Handler{
		repository: &Repository{},
		createCharacter: func(_ context.Context, character Character) (Character, error) {
			persisted = character
			return character, nil
		},
	}
	request := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request = withAuthenticatedUser(request, ownerID)
	response := httptest.NewRecorder()

	handler.Create(response, request)

	if response.Code != http.StatusCreated {
		t.Fatalf("expected V2 create status 201, got %d: %s", response.Code, response.Body.String())
	}
	if persisted.OwnerSubjectID == nil || *persisted.OwnerSubjectID != ownerID {
		t.Fatal("V2 owner did not come from the authenticated session")
	}
	if persisted.Name != requestDTO.Identity.Name || persisted.ClassName != "Fighter" || persisted.Ancestry != "Human" {
		t.Fatalf("V2 top-level identity was not resolved server-side: %+v", persisted)
	}
	if persisted.HitPoints.Current != persisted.HitPoints.Max || persisted.HitPoints.Max <= 0 {
		t.Fatalf("V2 current HP did not default to resolved maximum: %+v", persisted.HitPoints)
	}
	parsed, err := ParseCharacterSheetDocument(persisted.ReferencePayload)
	if err != nil || parsed.V2 == nil {
		t.Fatalf("persisted payload is not a valid server-built V2 sheet: %v", err)
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(response.Body.Bytes(), &raw); err != nil {
		t.Fatal(err)
	}
	assertExactRawKeys(t, raw,
		"id", "schemaVersion", "name", "gender", "className", "subclassName", "level", "race",
		"background", "abilityScores", "hitPoints", "armorClass", "speedFt", "referencePayload", "createdAt", "updatedAt",
	)
	for _, forbidden := range []string{"ownerSubjectId", "ownerId", "email", "account", "party", "partyId", "invite", "inviteCode", "inviteToken"} {
		if _, ok := raw[forbidden]; ok {
			t.Fatalf("V2 response exposed forbidden field %q", forbidden)
		}
	}
	var responseDTO CharacterV2DTO
	if err := json.Unmarshal(response.Body.Bytes(), &responseDTO); err != nil {
		t.Fatal(err)
	}
	if responseDTO.SchemaVersion != "CharacterSheetV2" || responseDTO.Race != "Human" || responseDTO.Gender != "Other" {
		t.Fatalf("unexpected V2 response: %+v", responseDTO)
	}
}

func TestSlice3StoredV2ValidationAcceptsExactTopLevelParityAndRejectsTampering(t *testing.T) {
	character := slice3StoredV2Character(t, slice3V2Request(), uuid.New())
	if err := validateStoredCharacterForPartyGM(character); err != nil {
		t.Fatalf("valid stored V2 character was rejected: %v", err)
	}
	for name, mutate := range map[string]func(*Character){
		"name":                func(value *Character) { value.Name = "Different Name" },
		"class":               func(value *Character) { value.ClassName = "Wizard" },
		"race":                func(value *Character) { value.Ancestry = "Elf" },
		"abilities":           func(value *Character) { value.AbilityScores.Strength++ },
		"negative current HP": func(value *Character) { value.HitPoints.Current = -1 },
		"current HP above maximum": func(value *Character) {
			value.HitPoints.Current = value.HitPoints.Max + 1
		},
		"maximum HP":    func(value *Character) { value.HitPoints.Max++ },
		"armor class":   func(value *Character) { value.ArmorClass++ },
		"walking speed": func(value *Character) { value.SpeedFt += 5 },
	} {
		t.Run(name, func(t *testing.T) {
			tampered := character
			mutate(&tampered)
			if err := validateStoredCharacterForPartyGM(tampered); !errors.Is(err, errInvalidStoredCharacter) {
				t.Fatal("stored V2 top-level tampering was accepted")
			}
		})
	}
}

func TestSlice3StoredDocumentSizeLimitsAreSchemaSpecific(t *testing.T) {
	v1 := validStoredPartyGMCharacter(t)
	v1.ReferencePayload = padValidJSONDocument(t, v1.ReferencePayload, maxV1ReferencePayloadBytes)
	if _, err := parseStoredCharacter(v1); err != nil {
		t.Fatalf("valid V1 document at its established limit was rejected: %v", err)
	}

	oversizedV1 := v1
	oversizedV1.ReferencePayload = padValidJSONDocument(t, v1.ReferencePayload, maxV1ReferencePayloadBytes+1)
	if _, err := parseStoredCharacter(oversizedV1); !errors.Is(err, errInvalidStoredCharacter) {
		t.Fatalf("valid V1 document above its established limit was accepted: %v", err)
	}

	v2 := slice3StoredV2Character(t, slice3V2Request(), uuid.New())
	v2.ReferencePayload = padValidJSONDocument(t, v2.ReferencePayload, maxV1ReferencePayloadBytes+1)
	if _, err := parseStoredCharacter(v2); err != nil {
		t.Fatalf("valid V2 document within its larger stored limit was rejected: %v", err)
	}

	oversizedV2 := v2
	oversizedV2.ReferencePayload = padValidJSONDocument(t, v2.ReferencePayload, maxV2StoredReferencePayloadBytes+1)
	if _, err := parseStoredCharacter(oversizedV2); !errors.Is(err, errInvalidStoredCharacter) {
		t.Fatalf("valid document above the absolute V2 limit was accepted: %v", err)
	}
}

func TestSlice3OversizedValidV1FailsClosedForOwnerAndPartyGM(t *testing.T) {
	ownerID := uuid.New()
	requesterID := uuid.New()
	partyID := uuid.New()
	character := validStoredPartyGMCharacter(t)
	character.OwnerSubjectID = &ownerID
	character.ReferencePayload = padValidJSONDocument(t, character.ReferencePayload, maxV1ReferencePayloadBytes+1)
	privateMarker := character.Name
	handler := Handler{
		repository: &Repository{},
		getCharacterForOwner: func(context.Context, uuid.UUID, uuid.UUID) (Character, error) {
			return character, nil
		},
		getCharacterForPartyGM: func(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) (Character, error) {
			return character, nil
		},
	}

	ownerRequest := httptest.NewRequest(http.MethodGet, "/characters/"+character.ID.String(), nil)
	ownerRequest.SetPathValue("id", character.ID.String())
	ownerRequest = withAuthenticatedUser(ownerRequest, ownerID)
	ownerResponse := httptest.NewRecorder()
	handler.GetByID(ownerResponse, ownerRequest)
	assertSafeCharacterError(t, ownerResponse, http.StatusInternalServerError, "could not load character")
	if strings.Contains(ownerResponse.Body.String(), privateMarker) {
		t.Fatal("owner failure exposed oversized valid V1 content")
	}

	gmResponse := httptest.NewRecorder()
	handler.GetByIDForPartyGM(gmResponse, partyGMCharacterRequest(requesterID, partyID, character.ID))
	assertSafeCharacterError(t, gmResponse, http.StatusInternalServerError, "could not load character")
	if strings.Contains(gmResponse.Body.String(), privateMarker) {
		t.Fatal("Party-GM failure exposed oversized valid V1 content")
	}
}

func TestSlice3CreateV2RejectsClientAuthoritativeFieldsBeforePersistence(t *testing.T) {
	requestDTO := slice3V2Request()
	body, _ := json.Marshal(requestDTO)
	var raw map[string]any
	_ = json.Unmarshal(body, &raw)
	raw["ownerSubjectId"] = uuid.NewString()
	raw["currentHp"] = 99
	raw["referencePayload"] = map[string]any{"schemaVersion": "CharacterSheetV2"}
	body, _ = json.Marshal(raw)
	called := false
	handler := Handler{repository: &Repository{}, createCharacter: func(context.Context, Character) (Character, error) {
		called = true
		return Character{}, nil
	}}
	request := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request = withAuthenticatedUser(request, uuid.New())
	response := httptest.NewRecorder()

	handler.Create(response, request)

	if response.Code != http.StatusBadRequest || called {
		t.Fatalf("client authoritative V2 fields reached persistence: status=%d called=%t", response.Code, called)
	}
	if strings.Contains(response.Body.String(), "ownerSubjectId") || strings.Contains(response.Body.String(), "referencePayload") {
		t.Fatal("rejected private fields were reflected")
	}
}

func TestSlice3CreateV2KeepsDatabaseErrorsGeneric(t *testing.T) {
	databaseDetail := "private-v2-database-detail"
	handler := Handler{repository: &Repository{}, createCharacter: func(context.Context, Character) (Character, error) {
		return Character{}, errors.New(databaseDetail)
	}}
	body, _ := json.Marshal(slice3V2Request())
	request := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request = withAuthenticatedUser(request, uuid.New())
	response := httptest.NewRecorder()

	handler.Create(response, request)

	assertSafeCharacterError(t, response, http.StatusInternalServerError, "could not persist character")
	if strings.Contains(response.Body.String(), databaseDetail) {
		t.Fatal("V2 response exposed a database error")
	}
}

func TestSlice3V2OwnerAndPartyGMReadsUseExactPrivateDTO(t *testing.T) {
	ownerID := uuid.New()
	requesterID := uuid.New()
	partyID := uuid.New()
	character := slice3StoredV2Character(t, slice3V2Request(), ownerID)
	handler := Handler{
		repository: &Repository{},
		getCharacterForOwner: func(_ context.Context, gotCharacterID, gotOwnerID uuid.UUID) (Character, error) {
			if gotCharacterID != character.ID || gotOwnerID != ownerID {
				t.Fatal("owner read did not use authorization-scoped identifiers")
			}
			return character, nil
		},
		getCharacterForPartyGM: func(_ context.Context, gotCharacterID, gotPartyID, gotRequesterID uuid.UUID) (Character, error) {
			if gotCharacterID != character.ID || gotPartyID != partyID || gotRequesterID != requesterID {
				t.Fatal("Party-GM read did not use authorization-scoped identifiers")
			}
			return character, nil
		},
	}

	ownerRequest := httptest.NewRequest(http.MethodGet, "/characters/"+character.ID.String(), nil)
	ownerRequest.SetPathValue("id", character.ID.String())
	ownerRequest = withAuthenticatedUser(ownerRequest, ownerID)
	ownerResponse := httptest.NewRecorder()
	handler.GetByID(ownerResponse, ownerRequest)
	assertExactV2CharacterResponse(t, ownerResponse, character)

	gmResponse := httptest.NewRecorder()
	handler.GetByIDForPartyGM(gmResponse, partyGMCharacterRequest(requesterID, partyID, character.ID))
	assertExactV2CharacterResponse(t, gmResponse, character)
}

func TestSlice3V2AuthorizationFailuresRemainIndistinguishable(t *testing.T) {
	ownerID := uuid.New()
	characterID := uuid.New()
	handler := Handler{
		repository: &Repository{},
		getCharacterForOwner: func(context.Context, uuid.UUID, uuid.UUID) (Character, error) {
			return Character{}, ErrNotFound
		},
	}
	for _, scenario := range []string{"unknown", "foreign-owner"} {
		t.Run(scenario, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/characters/"+characterID.String(), nil)
			request.SetPathValue("id", characterID.String())
			request = withAuthenticatedUser(request, ownerID)
			response := httptest.NewRecorder()
			handler.GetByID(response, request)
			assertSafeCharacterError(t, response, http.StatusNotFound, "character not found")
		})
	}

	body, _ := json.Marshal(slice3V2Request())
	request := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	handler.createCharacter = func(context.Context, Character) (Character, error) {
		panic("unauthenticated V2 request reached persistence")
	}
	handler.Create(response, request)
	assertSafeCharacterError(t, response, http.StatusUnauthorized, "authentication required")
}

func TestSlice3CreateV2RejectsInvalidDecisionMatrixBeforePersistence(t *testing.T) {
	tests := map[string]func(map[string]any){
		"malformed nested union": func(raw map[string]any) {
			raw["identity"].(map[string]any)["race"].(map[string]any)["name"] = "Cross-variant"
		},
		"unknown canonical index": func(raw map[string]any) {
			raw["identity"].(map[string]any)["race"].(map[string]any)["index"] = "unknown-race"
		},
		"missing manual fallback": func(raw map[string]any) {
			raw["identity"].(map[string]any)["race"] = map[string]any{"source": "manual", "name": "Custom lineage"}
			raw["abilityScores"] = map[string]any{"mode": "imported", "values": map[string]any{"strength": 10, "dexterity": 10, "constitution": 10, "intelligence": 10, "wisdom": 10, "charisma": 10}, "reason": "Transferred."}
			raw["ruleChoices"] = []any{map[string]any{"ruleId": "fighter-fighting-style", "optionIds": []any{"fighter-fighting-style-archery"}}}
		},
		"illegal subclass timing": func(raw map[string]any) {
			raw["identity"].(map[string]any)["subclass"] = map[string]any{"source": "srd", "index": "champion"}
		},
		"invalid spell membership": func(raw map[string]any) {
			raw["spellcasting"] = map[string]any{"spells": []any{map[string]any{"id": "magic-missile", "source": "srd", "index": "magic-missile", "state": "prepared"}}, "preparedSpellIds": []any{"magic-missile"}}
		},
		"invalid feature ownership": func(raw map[string]any) {
			raw["features"] = []any{map[string]any{"source": "srd", "index": "spellcasting-wizard"}}
		},
		"client calculated values": func(raw map[string]any) {
			raw["hitPoints"] = map[string]any{"current": 99, "max": 99}
			raw["armorClass"] = 99
		},
	}

	for name, mutate := range tests {
		t.Run(name, func(t *testing.T) {
			body, _ := json.Marshal(slice3V2Request())
			var raw map[string]any
			_ = json.Unmarshal(body, &raw)
			mutate(raw)
			body, _ = json.Marshal(raw)
			called := false
			handler := Handler{repository: &Repository{}, createCharacter: func(context.Context, Character) (Character, error) {
				called = true
				return Character{}, nil
			}}
			request := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(body))
			request.Header.Set("Content-Type", "application/json")
			request = withAuthenticatedUser(request, uuid.New())
			response := httptest.NewRecorder()

			handler.Create(response, request)

			if response.Code != http.StatusBadRequest || called {
				t.Fatalf("invalid V2 request reached persistence: status=%d called=%t body=%s", response.Code, called, response.Body.String())
			}
			if response.Body.String() != "{\"error\":\"character validation failed\"}\n" {
				t.Fatalf("invalid V2 response was not generic: %s", response.Body.String())
			}
		})
	}
}

func TestSlice3CreateV2RejectsOversizedBodyBeforePersistence(t *testing.T) {
	handler := Handler{repository: &Repository{}, createCharacter: func(context.Context, Character) (Character, error) {
		panic("oversized V2 request reached persistence")
	}}
	request := httptest.NewRequest(http.MethodPost, "/characters", strings.NewReader(`{"schemaVersion":"CharacterSheetV2","padding":"`+strings.Repeat("x", maxV2RequestPayloadBytes)+`"}`))
	request.Header.Set("Content-Type", "application/json")
	request = withAuthenticatedUser(request, uuid.New())
	response := httptest.NewRecorder()

	handler.Create(response, request)

	assertSafeCharacterError(t, response, http.StatusRequestEntityTooLarge, "request body is too large")
}

func TestSlice3PersistenceNeverExposesInternalHumanFallback(t *testing.T) {
	manualRace := finalManualRaceRequest()
	character, err := characterFromV2Request(manualRace, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if character.Ancestry != "Custom lineage" || character.ClassName != "Fighter" {
		t.Fatalf("manual Race identity leaked an internal fallback: %+v", character)
	}
	parsed, err := ParseCharacterSheetDocument(character.ReferencePayload)
	if err != nil || parsed.V2 == nil || parsed.V2.Identity.Race.Source != "manual" || parsed.V2.Identity.Race.Name != "Custom lineage" {
		t.Fatalf("persisted V2 identity leaked an internal fallback: %+v %v", parsed.V2, err)
	}
	if bytes.Contains(character.ReferencePayload, []byte(`"race":{"source":"srd","index":"human"}`)) {
		t.Fatal("server persisted the internal Human calculation placeholder")
	}

	manualClass := finalManualClassRequest(5)
	character, err = characterFromV2Request(manualClass, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if character.ClassName != "Warden" || character.Ancestry != "Human" || character.HitPoints.Current != 41 {
		t.Fatalf("manual Class identity or fallback persistence is wrong: %+v", character)
	}
}

func slice3V2Request() CreateCharacterV2RequestDTO {
	request := correctedFighterRequest(1)
	request.CreationSource = "guided"
	return request
}

func slice3StoredV2Character(t *testing.T, request CreateCharacterV2RequestDTO, ownerID uuid.UUID) Character {
	t.Helper()
	sheet, err := BuildCharacterSheetV2(request)
	if err != nil {
		t.Fatal(err)
	}
	payload, err := json.Marshal(sheet)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, 7, 19, 20, 0, 0, 0, time.UTC)
	return Character{
		ID: uuid.New(), OwnerSubjectID: &ownerID, Name: request.Identity.Name, ClassName: "Fighter", Level: request.Identity.Level,
		Ancestry: "Human", Background: request.Identity.Background,
		AbilityScores: AbilityScores{Strength: sheet.AbilityScores.Scores.Strength.Value, Dexterity: sheet.AbilityScores.Scores.Dexterity.Value,
			Constitution: sheet.AbilityScores.Scores.Constitution.Value, Intelligence: sheet.AbilityScores.Scores.Intelligence.Value,
			Wisdom: sheet.AbilityScores.Scores.Wisdom.Value, Charisma: sheet.AbilityScores.Scores.Charisma.Value},
		HitPoints:  HitPoints{Current: sheet.HitPointProgression.Maximum.Value, Max: sheet.HitPointProgression.Maximum.Value},
		ArmorClass: sheet.Combat.ArmorClass.Value, SpeedFt: sheet.Combat.SpeedFt.Value, ReferencePayload: payload,
		CreatedAt: now, UpdatedAt: now,
	}
}

func assertExactRawKeys(t *testing.T, object map[string]json.RawMessage, keys ...string) {
	t.Helper()
	if len(object) != len(keys) {
		t.Fatalf("expected exact keys %v, got %v", keys, reflect.ValueOf(object).MapKeys())
	}
	for _, key := range keys {
		if _, ok := object[key]; !ok {
			t.Fatalf("missing key %q", key)
		}
	}
}

func padValidJSONDocument(t *testing.T, document json.RawMessage, targetBytes int) json.RawMessage {
	t.Helper()
	if len(document) > targetBytes {
		t.Fatalf("valid JSON fixture is %d bytes, above target %d", len(document), targetBytes)
	}
	padded := make(json.RawMessage, 0, targetBytes)
	padded = append(padded, bytes.Repeat([]byte(" "), targetBytes-len(document))...)
	padded = append(padded, document...)
	if !json.Valid(padded) {
		t.Fatal("padded boundary fixture is not valid JSON")
	}
	return padded
}

func assertExactV2CharacterResponse(t *testing.T, response *httptest.ResponseRecorder, character Character) {
	t.Helper()
	if response.Code != http.StatusOK && response.Code != http.StatusCreated {
		t.Fatalf("unexpected V2 response status %d: %s", response.Code, response.Body.String())
	}
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(response.Body.Bytes(), &raw); err != nil {
		t.Fatal(err)
	}
	assertExactRawKeys(t, raw,
		"id", "schemaVersion", "name", "gender", "className", "subclassName", "level", "race",
		"background", "abilityScores", "hitPoints", "armorClass", "speedFt", "referencePayload", "createdAt", "updatedAt",
	)
	if raw["ownerSubjectId"] != nil || raw["email"] != nil || raw["party"] != nil || raw["invite"] != nil {
		t.Fatal("V2 response exposed private relationship data")
	}
	var dto CharacterV2DTO
	if err := json.Unmarshal(response.Body.Bytes(), &dto); err != nil {
		t.Fatal(err)
	}
	if dto.ID != character.ID.String() || dto.HitPoints != character.HitPoints || dto.Race != character.Ancestry {
		t.Fatalf("V2 response does not match persisted character: %+v", dto)
	}
}
