package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLevelUpRouteEnforcesAuthenticationOwnershipAndConcurrency(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := newTestServer(pool)
	ownerCookie, owner := registerTestUser(t, handler, "level-route-owner")
	foreignCookie, _ := registerTestUser(t, handler, "level-route-foreign")

	createResponse := httptest.NewRecorder()
	createRequest := jsonRequest(http.MethodPost, "/characters", fighterLevelOneCharacterJSON(t))
	createRequest.AddCookie(ownerCookie)
	handler.ServeHTTP(createResponse, createRequest)
	if createResponse.Code != http.StatusCreated {
		t.Fatalf("create Fighter: expected 201, got %d with body %s", createResponse.Code, createResponse.Body.String())
	}
	var created levelUpCharacterResponse
	decodeResponse(t, createResponse, &created)

	unauthenticated := httptest.NewRecorder()
	handler.ServeHTTP(unauthenticated, jsonRequest(http.MethodPatch, "/characters/"+created.ID+"/level-up", levelUpRouteJSON(created.UpdatedAt)))
	assertServerCharacterError(t, unauthenticated, http.StatusUnauthorized, "authentication required")

	foreign := httptest.NewRecorder()
	foreignRequest := jsonRequest(http.MethodPatch, "/characters/"+created.ID+"/level-up", levelUpRouteJSON("2000-01-01T00:00:00Z"))
	foreignRequest.AddCookie(foreignCookie)
	handler.ServeHTTP(foreign, foreignRequest)
	assertServerCharacterError(t, foreign, http.StatusNotFound, "character not found")

	success := httptest.NewRecorder()
	successRequest := jsonRequest(http.MethodPatch, "/characters/"+created.ID+"/level-up", levelUpRouteJSON(created.UpdatedAt))
	successRequest.AddCookie(ownerCookie)
	handler.ServeHTTP(success, successRequest)
	if success.Code != http.StatusOK {
		t.Fatalf("level up Fighter: expected 200, got %d with body %s", success.Code, success.Body.String())
	}
	var updated levelUpCharacterResponse
	decodeResponse(t, success, &updated)
	if updated.ID != created.ID || updated.OwnerSubjectID == nil || *updated.OwnerSubjectID != owner.User.ID || updated.Level != 2 || updated.UpdatedAt == created.UpdatedAt {
		t.Fatal("level-up route did not return the updated owner CharacterDTO")
	}

	stale := httptest.NewRecorder()
	staleRequest := jsonRequest(http.MethodPatch, "/characters/"+created.ID+"/level-up", levelUpRouteJSON(created.UpdatedAt))
	staleRequest.AddCookie(ownerCookie)
	handler.ServeHTTP(stale, staleRequest)
	assertServerCharacterError(t, stale, http.StatusConflict, "character changed; reload before leveling up")

	var storedLevel int
	if err := pool.QueryRow(t.Context(), `SELECT level FROM characters WHERE id=$1`, created.ID).Scan(&storedLevel); err != nil {
		t.Fatalf("load stored level: %v", err)
	}
	if storedLevel != 2 {
		t.Fatalf("stale request changed level to %d", storedLevel)
	}
}

func fighterLevelOneCharacterJSON(t *testing.T) string {
	t.Helper()
	var body map[string]any
	if err := json.Unmarshal([]byte(validCharacterJSON()), &body); err != nil {
		t.Fatalf("decode character fixture: %v", err)
	}
	body["className"] = "Fighter"
	body["subclassName"] = "Champion"
	body["level"] = float64(1)
	body["hitPoints"] = map[string]any{"current": float64(12), "max": float64(12)}
	payload := body["referencePayload"].(map[string]any)
	identity := payload["identity"].(map[string]any)
	identity["classes"] = []any{map[string]any{"name": "Fighter", "level": float64(1), "subclass": "Champion"}}
	summary := payload["summary"].(map[string]any)
	summary["displayLine"] = "Human Fighter - Level 1"
	combat := payload["combat"].(map[string]any)
	combat["hitPoints"] = map[string]any{"current": float64(12), "max": float64(12), "temporary": float64(0)}
	combat["proficiencyBonus"] = float64(2)
	payload["features"] = []any{map[string]any{
		"id": "fighter-fighting-style", "name": "Fighting Style", "category": "Fighter choice",
		"source": map[string]any{"rulesVersion": "2014", "status": "confirmed"},
		"tags":   []any{}, "summary": "Existing reviewed fighting style.", "includeInReference": true,
	}}
	payload["spellcasting"] = nil
	encoded, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("encode Fighter fixture: %v", err)
	}
	return string(encoded)
}

func levelUpRouteJSON(updatedAt string) string {
	return fmt.Sprintf(`{"expectedUpdatedAt":%q,"hp":{"mode":"fixed-average"},"currentHp":{"mode":"increase-by-gain"},"prerequisiteChoices":[],"classChoices":[],"decisionSummary":["Confirmed Fighter level-up."]}`, updatedAt)
}

type levelUpCharacterResponse struct {
	ID             string  `json:"id"`
	OwnerSubjectID *string `json:"ownerSubjectId"`
	Level          int     `json:"level"`
	UpdatedAt      string  `json:"updatedAt"`
}
