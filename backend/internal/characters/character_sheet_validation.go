package characters

import (
	"bytes"
	"encoding/json"
	"io"
)

type characterSheetEnvelope struct {
	SchemaVersion json.RawMessage `json:"schemaVersion"`
	Ruleset       json.RawMessage `json:"ruleset"`
	Identity      json.RawMessage `json:"identity"`
	Summary       json.RawMessage `json:"summary"`
	Abilities     json.RawMessage `json:"abilities"`
	Combat        json.RawMessage `json:"combat"`
	Proficiencies json.RawMessage `json:"proficiencies"`
	Actions       json.RawMessage `json:"actions"`
	Features      json.RawMessage `json:"features"`
	Spellcasting  json.RawMessage `json:"spellcasting"`
	Equipment     json.RawMessage `json:"equipment"`
	Personality   json.RawMessage `json:"personality"`
	Audit         json.RawMessage `json:"audit"`
}

type characterSheetRuleset struct {
	System       string `json:"system"`
	Version      string `json:"version"`
	SourceStatus string `json:"sourceStatus"`
}

var characterSheetEnvelopeFields = map[string]struct{}{
	"schemaVersion": {},
	"ruleset":       {},
	"identity":      {},
	"summary":       {},
	"abilities":     {},
	"combat":        {},
	"proficiencies": {},
	"actions":       {},
	"features":      {},
	"spellcasting":  {},
	"equipment":     {},
	"personality":   {},
	"audit":         {},
}

var characterSheetRulesetFields = map[string]struct{}{
	"system":       {},
	"version":      {},
	"sourceStatus": {},
}

func validateCharacterSheetV1Envelope(
	raw json.RawMessage,
	expected characterSheetExpectedValues,
) []string {
	if !containsOnlyExactJSONFields(raw, characterSheetEnvelopeFields) {
		return []string{"referencePayload must contain only the CharacterSheetV1 envelope fields"}
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	var envelope characterSheetEnvelope
	if err := decoder.Decode(&envelope); err != nil {
		return []string{"referencePayload must contain only the CharacterSheetV1 envelope fields"}
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return []string{"referencePayload must contain one CharacterSheetV1 envelope"}
	}

	var validationErrors []string
	if len(envelope.SchemaVersion) == 0 {
		validationErrors = append(validationErrors, "referencePayload.schemaVersion is required")
	} else {
		var schemaVersion string
		if err := json.Unmarshal(envelope.SchemaVersion, &schemaVersion); err != nil || schemaVersion != "CharacterSheetV1" {
			validationErrors = append(validationErrors, "referencePayload.schemaVersion must be CharacterSheetV1")
		}
	}

	if requireJSONShape(&validationErrors, "ruleset", envelope.Ruleset, '{', "a JSON object") {
		validationErrors = append(validationErrors, validateCharacterSheetRuleset(envelope.Ruleset)...)
	}

	identityValid := requireJSONShape(&validationErrors, "identity", envelope.Identity, '{', "a JSON object")
	summaryValid := requireJSONShape(&validationErrors, "summary", envelope.Summary, '{', "a JSON object")
	abilitiesValid := requireJSONShape(&validationErrors, "abilities", envelope.Abilities, '{', "a JSON object")
	combatValid := requireJSONShape(&validationErrors, "combat", envelope.Combat, '{', "a JSON object")
	proficienciesValid := requireJSONShape(&validationErrors, "proficiencies", envelope.Proficiencies, '{', "a JSON object")

	objectFields := []struct {
		name string
		raw  json.RawMessage
	}{
		{name: "equipment", raw: envelope.Equipment},
		{name: "personality", raw: envelope.Personality},
		{name: "audit", raw: envelope.Audit},
	}
	for _, field := range objectFields {
		requireJSONShape(&validationErrors, field.name, field.raw, '{', "a JSON object")
	}

	if len(envelope.Spellcasting) == 0 {
		validationErrors = append(validationErrors, "referencePayload.spellcasting is required")
	} else {
		trimmed := bytes.TrimSpace(envelope.Spellcasting)
		if !bytes.Equal(trimmed, []byte("null")) && (len(trimmed) == 0 || trimmed[0] != '{') {
			validationErrors = append(validationErrors, "referencePayload.spellcasting must be a JSON object or null")
		}
	}
	if identityValid {
		validationErrors = append(validationErrors, validateCharacterSheetIdentity(envelope.Identity, expected)...)
	}
	if summaryValid {
		validationErrors = append(validationErrors, validateCharacterSheetSummary(envelope.Summary)...)
	}
	if abilitiesValid {
		validationErrors = append(validationErrors, validateCharacterSheetAbilities(envelope.Abilities, expected.AbilityScores)...)
	}
	if combatValid {
		validationErrors = append(validationErrors, validateCharacterSheetCombat(envelope.Combat, expected)...)
	}
	if proficienciesValid {
		validationErrors = append(validationErrors, validateCharacterSheetProficiencies(envelope.Proficiencies)...)
	}
	if requireJSONShape(&validationErrors, "actions", envelope.Actions, '[', "a JSON array") {
		validationErrors = append(validationErrors, validateCharacterSheetActions(envelope.Actions)...)
	}
	if requireJSONShape(&validationErrors, "features", envelope.Features, '[', "a JSON array") {
		validationErrors = append(validationErrors, validateCharacterSheetFeatures(envelope.Features)...)
	}

	return validationErrors
}

func validateCharacterSheetRuleset(raw json.RawMessage) []string {
	if !containsOnlyExactJSONFields(raw, characterSheetRulesetFields) {
		return []string{"referencePayload.ruleset must contain only system, version, and sourceStatus"}
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	var ruleset characterSheetRuleset
	if err := decoder.Decode(&ruleset); err != nil {
		return []string{"referencePayload.ruleset must contain only system, version, and sourceStatus"}
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return []string{"referencePayload.ruleset must be one JSON object"}
	}

	var validationErrors []string
	if ruleset.System != "dnd5e" {
		validationErrors = append(validationErrors, "referencePayload.ruleset.system must be dnd5e")
	}
	if !isSupportedRulesetVersion(ruleset.Version) {
		validationErrors = append(validationErrors, "referencePayload.ruleset.version is not supported")
	}
	if !isSupportedSourceStatus(ruleset.SourceStatus) {
		validationErrors = append(validationErrors, "referencePayload.ruleset.sourceStatus is not supported")
	}
	return validationErrors
}

func containsOnlyExactJSONFields(raw json.RawMessage, allowed map[string]struct{}) bool {
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil || fields == nil {
		return false
	}
	for field := range fields {
		if _, exists := allowed[field]; !exists {
			return false
		}
	}
	return true
}

func requireJSONShape(
	validationErrors *[]string,
	field string,
	raw json.RawMessage,
	prefix byte,
	description string,
) bool {
	if len(raw) == 0 {
		*validationErrors = append(*validationErrors, "referencePayload."+field+" is required")
		return false
	}
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || trimmed[0] != prefix {
		*validationErrors = append(*validationErrors, "referencePayload."+field+" must be "+description)
		return false
	}
	return true
}

func isSupportedRulesetVersion(version string) bool {
	switch version {
	case "2014", "2024", "mixed", "unknown":
		return true
	default:
		return false
	}
}

func isSupportedSourceStatus(status string) bool {
	switch status {
	case "draft", "audited-sample", "needs-audit":
		return true
	default:
		return false
	}
}
