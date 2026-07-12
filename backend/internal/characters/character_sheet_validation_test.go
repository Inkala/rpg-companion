package characters

import (
	"encoding/json"
	"testing"
	"time"
)

func TestCharacterSheetEnvelopeAcceptsSupportedRulesetValues(t *testing.T) {
	for _, version := range []string{"2014", "2024", "mixed", "unknown"} {
		t.Run("version "+version, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			envelope["ruleset"].(map[string]any)["version"] = version
			assertValidCharacterSheetPayload(t, envelope)
		})
	}

	for _, sourceStatus := range []string{"draft", "audited-sample", "needs-audit"} {
		t.Run("source status "+sourceStatus, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			envelope["ruleset"].(map[string]any)["sourceStatus"] = sourceStatus
			assertValidCharacterSheetPayload(t, envelope)
		})
	}
}

func TestCharacterSheetEnvelopeRejectsUnsupportedRequiredValues(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(map[string]any)
	}{
		{
			name: "schema version",
			mutate: func(envelope map[string]any) {
				envelope["schemaVersion"] = "CharacterSheetV2"
			},
		},
		{
			name: "rules system",
			mutate: func(envelope map[string]any) {
				envelope["ruleset"].(map[string]any)["system"] = "pathfinder2e"
			},
		},
		{
			name: "rules version",
			mutate: func(envelope map[string]any) {
				envelope["ruleset"].(map[string]any)["version"] = "2030"
			},
		},
		{
			name: "source status",
			mutate: func(envelope map[string]any) {
				envelope["ruleset"].(map[string]any)["sourceStatus"] = "approved"
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			tt.mutate(envelope)
			assertInvalidCharacterSheetPayload(t, marshalCharacterSheetPayload(t, envelope))
		})
	}
}

func TestCharacterSheetEnvelopeRejectsEveryMissingTopLevelField(t *testing.T) {
	requiredFields := []string{
		"schemaVersion",
		"ruleset",
		"identity",
		"summary",
		"abilities",
		"combat",
		"proficiencies",
		"actions",
		"features",
		"spellcasting",
		"equipment",
		"personality",
		"audit",
	}

	for _, field := range requiredFields {
		t.Run(field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			delete(envelope, field)
			assertInvalidCharacterSheetPayload(t, marshalCharacterSheetPayload(t, envelope))
		})
	}
}

func TestCharacterSheetEnvelopeRejectsMissingRulesetFields(t *testing.T) {
	for _, field := range []string{"system", "version", "sourceStatus"} {
		t.Run(field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			delete(envelope["ruleset"].(map[string]any), field)
			assertInvalidCharacterSheetPayload(t, marshalCharacterSheetPayload(t, envelope))
		})
	}
}

func TestCharacterSheetEnvelopeRejectsWrongTopLevelShapes(t *testing.T) {
	tests := []struct {
		name  string
		field string
		value any
	}{
		{name: "ruleset array", field: "ruleset", value: []any{}},
		{name: "identity array", field: "identity", value: []any{}},
		{name: "summary null", field: "summary", value: nil},
		{name: "abilities array", field: "abilities", value: []any{}},
		{name: "combat array", field: "combat", value: []any{}},
		{name: "proficiencies array", field: "proficiencies", value: []any{}},
		{name: "actions object", field: "actions", value: map[string]any{}},
		{name: "features object", field: "features", value: map[string]any{}},
		{name: "spellcasting array", field: "spellcasting", value: []any{}},
		{name: "equipment array", field: "equipment", value: []any{}},
		{name: "personality array", field: "personality", value: []any{}},
		{name: "audit array", field: "audit", value: []any{}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			envelope[tt.field] = tt.value
			assertInvalidCharacterSheetPayload(t, marshalCharacterSheetPayload(t, envelope))
		})
	}
}

func TestCharacterSheetEnvelopeRejectsUnknownEnvelopeAndRulesetFields(t *testing.T) {
	t.Run("top-level field", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		envelope["unexpected"] = true
		assertInvalidCharacterSheetPayload(t, marshalCharacterSheetPayload(t, envelope))
	})

	t.Run("ruleset field", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		envelope["ruleset"].(map[string]any)["unexpected"] = true
		assertInvalidCharacterSheetPayload(t, marshalCharacterSheetPayload(t, envelope))
	})
}

func TestCharacterSheetEnvelopeRejectsCaseVariantFieldNames(t *testing.T) {
	t.Run("top-level SchemaVersion", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		value := envelope["schemaVersion"]
		delete(envelope, "schemaVersion")
		envelope["SchemaVersion"] = value
		assertInvalidCharacterSheetPayload(t, marshalCharacterSheetPayload(t, envelope))
	})

	t.Run("top-level RULESET", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		value := envelope["ruleset"]
		delete(envelope, "ruleset")
		envelope["RULESET"] = value
		assertInvalidCharacterSheetPayload(t, marshalCharacterSheetPayload(t, envelope))
	})

	rulesetVariants := []struct {
		exact   string
		variant string
	}{
		{exact: "system", variant: "System"},
		{exact: "version", variant: "Version"},
		{exact: "sourceStatus", variant: "SourceStatus"},
	}
	for _, tt := range rulesetVariants {
		t.Run("ruleset "+tt.variant, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			ruleset := envelope["ruleset"].(map[string]any)
			value := ruleset[tt.exact]
			delete(ruleset, tt.exact)
			ruleset[tt.variant] = value
			assertInvalidCharacterSheetPayload(t, marshalCharacterSheetPayload(t, envelope))
		})
	}
}

func TestCharacterSheetEnvelopeAllowsOtherOpaqueNestedFields(t *testing.T) {
	envelope := testCharacterSheetEnvelope()
	envelope["combat"].(map[string]any)["futureNestedField"] = map[string]any{"anything": true}
	assertValidCharacterSheetPayload(t, envelope)
}

func TestCharacterSheetEnvelopeRejectsMalformedPayload(t *testing.T) {
	assertInvalidCharacterSheetPayload(t, json.RawMessage(`{"schemaVersion":`))
}

func TestRepresentativeCharacterSheetFixturesRemainCompatible(t *testing.T) {
	fixtures := []struct {
		name     string
		envelope map[string]any
		request  createCharacterRequest
	}{
		{name: "Mara audited sample", envelope: maraAuditedSampleEnvelope(), request: validCreateCharacterRequest()},
		{name: "generated Fighter", envelope: generatedFighterEnvelope(), request: generatedFighterRequest()},
		{name: "minimum manual character", envelope: minimumManualEnvelope(), request: minimumManualRequest()},
		{name: "full manual character", envelope: fullManualEnvelope(), request: fullManualRequest()},
	}

	for _, fixture := range fixtures {
		t.Run(fixture.name, func(t *testing.T) {
			payload := marshalCharacterSheetPayload(t, fixture.envelope)
			fixture.request.ReferencePayload = &payload
			if _, err := characterFromRequest(fixture.request, time.Now()); err != nil {
				t.Fatalf("expected representative fixture to remain compatible, got %v", err)
			}
		})
	}
}

func testCharacterSheetEnvelope() map[string]any {
	return map[string]any{
		"schemaVersion": "CharacterSheetV1",
		"ruleset": map[string]any{
			"system":       "dnd5e",
			"version":      "2014",
			"sourceStatus": "draft",
		},
		"identity": map[string]any{
			"name":       "Mara Velard",
			"ancestry":   "Human",
			"background": "Outlander",
			"classes": []any{
				map[string]any{"name": "Ranger", "level": 3, "subclass": "Hunter"},
			},
		},
		"summary": map[string]any{
			"displayLine":       "Human Ranger - Level 3",
			"landingConcept":    "A steady wilderness scout.",
			"featuredAbilities": []any{},
			"referenceSections": []any{},
		},
		"abilities": map[string]any{
			"scores": map[string]any{
				"strength":     10,
				"dexterity":    16,
				"constitution": 14,
				"intelligence": 10,
				"wisdom":       14,
				"charisma":     8,
			},
		},
		"combat":        map[string]any{},
		"proficiencies": map[string]any{},
		"actions":       []any{},
		"features":      []any{},
		"spellcasting":  nil,
		"equipment":     map[string]any{},
		"personality":   map[string]any{},
		"audit":         map[string]any{},
	}
}

func maraAuditedSampleEnvelope() map[string]any {
	envelope := testCharacterSheetEnvelope()
	envelope["ruleset"].(map[string]any)["sourceStatus"] = "audited-sample"
	envelope["summary"] = map[string]any{
		"displayLine":       "Human Ranger · Level 3",
		"supportingLine":    "Hunter · Outlander",
		"landingConcept":    "A steady wilderness scout with quick rules reminders.",
		"portraitAssetId":   "mara-vale-portrait",
		"portraitAlt":       "Portrait of Mara Velard",
		"featuredAbilities": []any{"Longbow", "Colossus Slayer"},
		"referenceSections": []any{
			map[string]any{"id": "actions", "label": "Actions", "defaultOpen": true},
			map[string]any{"id": "features", "label": "Features", "defaultOpen": false},
			map[string]any{"id": "spells", "label": "Spells", "defaultOpen": false},
		},
	}
	envelope["actions"] = []any{map[string]any{"id": "longbow", "name": "Longbow"}}
	envelope["features"] = []any{map[string]any{"id": "colossus-slayer", "name": "Colossus Slayer"}}
	envelope["spellcasting"] = map[string]any{"ability": "wisdom", "spells": []any{}}
	return envelope
}

func generatedFighterEnvelope() map[string]any {
	envelope := testCharacterSheetEnvelope()
	envelope["identity"] = map[string]any{
		"name":       "Branna Shieldhand",
		"ancestry":   "Human",
		"background": "Soldier",
		"classes":    []any{map[string]any{"name": "Fighter", "level": 1}},
	}
	envelope["abilities"] = map[string]any{"scores": abilityScoreMap(16, 11, 15, 9, 13, 14)}
	envelope["summary"] = map[string]any{
		"displayLine":       "Human Fighter - Level 1",
		"supportingLine":    "Strength melee Fighter - Soldier",
		"landingConcept":    "A sturdy beginner Fighter built to protect allies.",
		"featuredAbilities": []any{"Longsword", "Second Wind"},
		"referenceSections": []any{
			map[string]any{"id": "actions", "label": "Actions", "defaultOpen": true},
			map[string]any{"id": "features", "label": "Features", "defaultOpen": false},
		},
	}
	envelope["actions"] = []any{map[string]any{"id": "longsword", "name": "Longsword"}}
	envelope["features"] = []any{map[string]any{"id": "second-wind", "name": "Second Wind"}}
	return envelope
}

func minimumManualEnvelope() map[string]any {
	envelope := testCharacterSheetEnvelope()
	envelope["ruleset"].(map[string]any)["sourceStatus"] = "needs-audit"
	envelope["identity"] = map[string]any{
		"name":       "Alea",
		"ancestry":   "Human",
		"background": "Acolyte",
		"classes":    []any{map[string]any{"name": "Cleric", "level": 1}},
	}
	envelope["abilities"] = map[string]any{"scores": abilityScoreMap(10, 10, 10, 10, 10, 10)}
	envelope["summary"] = map[string]any{
		"displayLine":       "Human Cleric - Level 1",
		"landingConcept":    "Manual character transferred from an existing sheet.",
		"featuredAbilities": []any{},
		"referenceSections": []any{},
	}
	return envelope
}

func fullManualEnvelope() map[string]any {
	envelope := minimumManualEnvelope()
	envelope["identity"] = map[string]any{
		"name":       "Alea Dawn",
		"ancestry":   "Human",
		"background": "Acolyte",
		"alignment":  "Neutral Good",
		"concept":    "Traveling healer",
		"classes":    []any{map[string]any{"name": "Cleric", "level": 3, "subclass": "Life Domain"}},
	}
	envelope["abilities"] = map[string]any{"scores": abilityScoreMap(10, 12, 14, 10, 16, 8)}
	envelope["summary"] = map[string]any{
		"displayLine":       "Human Cleric - Level 3",
		"supportingLine":    "Life Domain - Acolyte",
		"landingConcept":    "Traveling healer",
		"featuredAbilities": []any{"Mace", "Channel Divinity"},
		"referenceSections": []any{
			map[string]any{"id": "actions", "label": "Actions", "defaultOpen": true},
			map[string]any{"id": "features", "label": "Features", "defaultOpen": false},
		},
	}
	envelope["actions"] = []any{map[string]any{"id": "mace", "name": "Mace"}}
	envelope["features"] = []any{map[string]any{"id": "channel-divinity", "name": "Channel Divinity"}}
	envelope["personality"] = map[string]any{"notes": []any{"Transferred from an existing sheet."}}
	return envelope
}

func generatedFighterRequest() createCharacterRequest {
	request := validCreateCharacterRequest()
	request.Name = "Branna Shieldhand"
	request.ClassName = "Fighter"
	request.SubclassName = nil
	request.Level = 1
	request.Ancestry = "Human"
	request.Background = "Soldier"
	request.AbilityScores = requiredAbilityScoresFromValues(16, 11, 15, 9, 13, 14)
	return request
}

func minimumManualRequest() createCharacterRequest {
	request := validCreateCharacterRequest()
	request.Name = "Alea"
	request.ClassName = "Cleric"
	request.SubclassName = nil
	request.Level = 1
	request.Ancestry = "Human"
	request.Background = "Acolyte"
	request.AbilityScores = requiredAbilityScoresFromValues(10, 10, 10, 10, 10, 10)
	return request
}

func fullManualRequest() createCharacterRequest {
	request := validCreateCharacterRequest()
	request.Name = "Alea Dawn"
	request.ClassName = "Cleric"
	request.SubclassName = stringPtr("Life Domain")
	request.Level = 3
	request.Ancestry = "Human"
	request.Background = "Acolyte"
	request.AbilityScores = requiredAbilityScoresFromValues(10, 12, 14, 10, 16, 8)
	return request
}

func abilityScoreMap(strength, dexterity, constitution, intelligence, wisdom, charisma int) map[string]any {
	return map[string]any{
		"strength":     strength,
		"dexterity":    dexterity,
		"constitution": constitution,
		"intelligence": intelligence,
		"wisdom":       wisdom,
		"charisma":     charisma,
	}
}

func requiredAbilityScoresFromValues(
	strength, dexterity, constitution, intelligence, wisdom, charisma int,
) requiredAbilityScores {
	return requiredAbilityScores{
		Strength:     intPtr(strength),
		Dexterity:    intPtr(dexterity),
		Constitution: intPtr(constitution),
		Intelligence: intPtr(intelligence),
		Wisdom:       intPtr(wisdom),
		Charisma:     intPtr(charisma),
	}
}

func marshalCharacterSheetPayload(t *testing.T, envelope map[string]any) json.RawMessage {
	t.Helper()
	payload, err := json.Marshal(envelope)
	if err != nil {
		t.Fatalf("marshal character sheet fixture: %v", err)
	}
	return payload
}

func assertValidCharacterSheetPayload(t *testing.T, envelope map[string]any) {
	t.Helper()
	request := validCreateCharacterRequest()
	payload := marshalCharacterSheetPayload(t, envelope)
	request.ReferencePayload = &payload
	if _, err := characterFromRequest(request, time.Now()); err != nil {
		t.Fatalf("expected CharacterSheetV1 envelope to be accepted, got %v", err)
	}
}

func assertInvalidCharacterSheetPayload(t *testing.T, payload json.RawMessage) {
	t.Helper()
	request := validCreateCharacterRequest()
	request.ReferencePayload = &payload
	_, err := characterFromRequest(request, time.Now())
	if _, ok := isValidationError(err); !ok {
		t.Fatalf("expected safe CharacterSheetV1 validation error, got %v", err)
	}
}
