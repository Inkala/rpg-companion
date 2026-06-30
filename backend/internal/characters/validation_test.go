package characters

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestCharacterFromRequestValidatesRequiredFields(t *testing.T) {
	request := validCreateCharacterRequest()
	request.Name = " "
	request.ClassName = ""
	request.Level = 21
	request.HitPoints.Current = intPtr(12)
	request.HitPoints.Max = intPtr(10)
	request.ArmorClass = intPtr(-1)
	request.SpeedFt = intPtr(-5)

	_, err := characterFromRequest(request, time.Now())

	validationErr, ok := isValidationError(err)
	if !ok {
		t.Fatalf("expected validation error, got %v", err)
	}

	expectedMessages := []string{
		"name is required",
		"className is required",
		"level must be between 1 and 20",
		"hitPoints.current must be less than or equal to hitPoints.max",
		"armorClass must be non-negative",
		"speedFt must be non-negative",
	}

	for _, expected := range expectedMessages {
		if !contains(validationErr.Messages, expected) {
			t.Errorf("expected validation message %q in %v", expected, validationErr.Messages)
		}
	}
}

func TestCharacterFromRequestDoesNotAssignOwnerFromRequest(t *testing.T) {
	request := validCreateCharacterRequest()
	request.OwnerSubjectID = stringPtr("not-a-uuid")

	character, err := characterFromRequest(request, time.Now())
	if err != nil {
		t.Fatalf("expected owner field to be ignored by request validation, got %v", err)
	}
	if character.OwnerSubjectID != nil {
		t.Fatalf("expected nil owner from request validation, got %v", character.OwnerSubjectID)
	}
}

func TestCharacterFromRequestRejectsNonObjectReferencePayload(t *testing.T) {
	request := validCreateCharacterRequest()
	payload := json.RawMessage(`[]`)
	request.ReferencePayload = &payload

	_, err := characterFromRequest(request, time.Now())

	validationErr, ok := isValidationError(err)
	if !ok {
		t.Fatalf("expected validation error, got %v", err)
	}
	if !contains(validationErr.Messages, "referencePayload must be a JSON object") {
		t.Fatalf("expected referencePayload validation message, got %v", validationErr.Messages)
	}
}

func validCreateCharacterRequest() createCharacterRequest {
	payload := json.RawMessage(`{"actions":[],"features":[],"spells":[]}`)
	return createCharacterRequest{
		Name:         "Mara Velard",
		ClassName:    "Ranger",
		SubclassName: stringPtr("Hunter"),
		Level:        3,
		Ancestry:     "Human",
		Background:   "Outlander",
		AbilityScores: requiredAbilityScores{
			Strength:     intPtr(10),
			Dexterity:    intPtr(16),
			Constitution: intPtr(14),
			Intelligence: intPtr(10),
			Wisdom:       intPtr(14),
			Charisma:     intPtr(8),
		},
		HitPoints: requiredHitPoints{
			Current: intPtr(26),
			Max:     intPtr(26),
		},
		ArmorClass:       intPtr(14),
		SpeedFt:          intPtr(30),
		ReferencePayload: &payload,
	}
}

func intPtr(value int) *int {
	return &value
}

func stringPtr(value string) *string {
	return &value
}

func contains(values []string, expected string) bool {
	for _, value := range values {
		if strings.EqualFold(value, expected) {
			return true
		}
	}
	return false
}
