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

func TestCharacterSheetEnvelopeAllowsOpaqueNestedFieldsInThisSlice(t *testing.T) {
	envelope := testCharacterSheetEnvelope()
	envelope["identity"].(map[string]any)["futureNestedField"] = map[string]any{"anything": true}
	assertValidCharacterSheetPayload(t, envelope)
}

func TestCharacterSheetEnvelopeRejectsMalformedPayload(t *testing.T) {
	assertInvalidCharacterSheetPayload(t, json.RawMessage(`{"schemaVersion":`))
}

func TestRepresentativeCharacterSheetFixturesRemainCompatible(t *testing.T) {
	fixtures := []struct {
		name     string
		envelope map[string]any
	}{
		{name: "Mara audited sample", envelope: maraAuditedSampleEnvelope()},
		{name: "generated Fighter", envelope: generatedFighterEnvelope()},
		{name: "minimum manual character", envelope: minimumManualEnvelope()},
		{name: "full manual character", envelope: fullManualEnvelope()},
	}

	for _, fixture := range fixtures {
		t.Run(fixture.name, func(t *testing.T) {
			assertValidCharacterSheetPayload(t, fixture.envelope)
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
		"identity":      map[string]any{},
		"summary":       map[string]any{},
		"abilities":     map[string]any{},
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
	envelope["identity"] = map[string]any{"name": "Mara Velard", "classes": []any{map[string]any{"name": "Ranger", "level": 3}}}
	envelope["actions"] = []any{map[string]any{"id": "longbow", "name": "Longbow"}}
	envelope["features"] = []any{map[string]any{"id": "colossus-slayer", "name": "Colossus Slayer"}}
	envelope["spellcasting"] = map[string]any{"ability": "wisdom", "spells": []any{}}
	return envelope
}

func generatedFighterEnvelope() map[string]any {
	envelope := testCharacterSheetEnvelope()
	envelope["identity"] = map[string]any{"name": "Branna Shieldhand", "classes": []any{map[string]any{"name": "Fighter", "level": 1}}}
	envelope["actions"] = []any{map[string]any{"id": "longsword", "name": "Longsword"}}
	envelope["features"] = []any{map[string]any{"id": "second-wind", "name": "Second Wind"}}
	return envelope
}

func minimumManualEnvelope() map[string]any {
	envelope := testCharacterSheetEnvelope()
	envelope["ruleset"].(map[string]any)["sourceStatus"] = "needs-audit"
	envelope["identity"] = map[string]any{"name": "Alea", "classes": []any{map[string]any{"name": "Cleric", "level": 1}}}
	return envelope
}

func fullManualEnvelope() map[string]any {
	envelope := minimumManualEnvelope()
	envelope["identity"].(map[string]any)["concept"] = "Traveling healer"
	envelope["summary"] = map[string]any{"displayLine": "Human Cleric - Level 3", "featuredAbilities": []any{"Mace", "Channel Divinity"}}
	envelope["actions"] = []any{map[string]any{"id": "mace", "name": "Mace"}}
	envelope["features"] = []any{map[string]any{"id": "channel-divinity", "name": "Channel Divinity"}}
	envelope["personality"] = map[string]any{"notes": []any{"Transferred from an existing sheet."}}
	return envelope
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
