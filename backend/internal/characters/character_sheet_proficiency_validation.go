package characters

import (
	"bytes"
	"encoding/json"
)

type characterSheetProficiencies struct {
	SavingThrows json.RawMessage `json:"savingThrows"`
	Skills       json.RawMessage `json:"skills"`
	Weapons      json.RawMessage `json:"weapons"`
	Armor        json.RawMessage `json:"armor"`
	Tools        json.RawMessage `json:"tools"`
	Languages    json.RawMessage `json:"languages"`
}

type characterSheetAuditedTextList struct {
	Values            json.RawMessage `json:"values"`
	NeedsConfirmation json.RawMessage `json:"needsConfirmation"`
	Note              json.RawMessage `json:"note"`
}

type characterSheetSkill struct {
	Name              json.RawMessage `json:"name"`
	Proficient        json.RawMessage `json:"proficient"`
	Modifier          json.RawMessage `json:"modifier"`
	NeedsConfirmation json.RawMessage `json:"needsConfirmation"`
	Note              json.RawMessage `json:"note"`
}

var characterSheetProficiencyFields = map[string]struct{}{
	"savingThrows": {},
	"skills":       {},
	"weapons":      {},
	"armor":        {},
	"tools":        {},
	"languages":    {},
}

var characterSheetAuditedTextListFields = map[string]struct{}{
	"values":            {},
	"needsConfirmation": {},
	"note":              {},
}

var characterSheetSkillFields = map[string]struct{}{
	"name":              {},
	"proficient":        {},
	"modifier":          {},
	"needsConfirmation": {},
	"note":              {},
}

func validateCharacterSheetProficiencies(raw json.RawMessage) []string {
	if !containsOnlyExactJSONFields(raw, characterSheetProficiencyFields) {
		return []string{"referencePayload.proficiencies contains unsupported fields"}
	}
	var proficiencies characterSheetProficiencies
	if !decodeStrictJSONObject(raw, &proficiencies) {
		return []string{"referencePayload.proficiencies must be a valid object"}
	}

	fields := []struct {
		name string
		raw  json.RawMessage
	}{
		{name: "savingThrows", raw: proficiencies.SavingThrows},
		{name: "weapons", raw: proficiencies.Weapons},
		{name: "armor", raw: proficiencies.Armor},
		{name: "tools", raw: proficiencies.Tools},
		{name: "languages", raw: proficiencies.Languages},
	}

	var validationErrors []string
	for _, field := range fields {
		validationErrors = append(validationErrors, validateAuditedTextList(field.raw, "proficiencies."+field.name)...)
	}
	validationErrors = append(validationErrors, validateCharacterSheetSkills(proficiencies.Skills)...)
	return validationErrors
}

func validateAuditedTextList(raw json.RawMessage, field string) []string {
	if !isJSONObject(raw) || !containsOnlyExactJSONFields(raw, characterSheetAuditedTextListFields) {
		return []string{"referencePayload." + field + " contains unsupported fields"}
	}
	var auditedList characterSheetAuditedTextList
	if !decodeStrictJSONObject(raw, &auditedList) {
		return []string{"referencePayload." + field + " must be a valid object"}
	}

	var validationErrors []string
	validationErrors = append(validationErrors, validateAuditedTextValues(auditedList.Values, field+".values")...)
	if len(auditedList.NeedsConfirmation) > 0 {
		validateCombatBoolean(&validationErrors, auditedList.NeedsConfirmation, field+".needsConfirmation")
	}
	optionalTrimmedSummaryString(&validationErrors, auditedList.Note, field+".note", 1000)
	return validationErrors
}

func validateAuditedTextValues(raw json.RawMessage, field string) []string {
	if len(raw) == 0 {
		return []string{"referencePayload." + field + " is required"}
	}
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || trimmed[0] != '[' {
		return []string{"referencePayload." + field + " must be a JSON array"}
	}
	var values []json.RawMessage
	if err := json.Unmarshal(raw, &values); err != nil {
		return []string{"referencePayload." + field + " must be a JSON array"}
	}
	if len(values) > 64 {
		return []string{"referencePayload." + field + " must contain at most 64 entries"}
	}

	var validationErrors []string
	for _, value := range values {
		requiredTrimmedSummaryString(&validationErrors, value, field+" entry", 200)
	}
	return validationErrors
}

func validateCharacterSheetSkills(raw json.RawMessage) []string {
	if len(raw) == 0 {
		return []string{"referencePayload.proficiencies.skills is required"}
	}
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || trimmed[0] != '[' {
		return []string{"referencePayload.proficiencies.skills must be a JSON array"}
	}
	var skills []json.RawMessage
	if err := json.Unmarshal(raw, &skills); err != nil {
		return []string{"referencePayload.proficiencies.skills must be a JSON array"}
	}
	if len(skills) > 30 {
		return []string{"referencePayload.proficiencies.skills must contain at most 30 entries"}
	}

	var validationErrors []string
	for _, rawSkill := range skills {
		validationErrors = append(validationErrors, validateCharacterSheetSkill(rawSkill)...)
	}
	return validationErrors
}

func validateCharacterSheetSkill(raw json.RawMessage) []string {
	if !isJSONObject(raw) || !containsOnlyExactJSONFields(raw, characterSheetSkillFields) {
		return []string{"referencePayload.proficiencies.skills contains an invalid entry"}
	}
	var skill characterSheetSkill
	if !decodeStrictJSONObject(raw, &skill) {
		return []string{"referencePayload.proficiencies.skills contains an invalid entry"}
	}

	var validationErrors []string
	requiredTrimmedSummaryString(&validationErrors, skill.Name, "proficiencies.skills.name", 200)
	validateCombatBoolean(&validationErrors, skill.Proficient, "proficiencies.skills.proficient")
	validateBoundedCombatInteger(&validationErrors, skill.Modifier, "proficiencies.skills.modifier", -100, 100)
	if len(skill.NeedsConfirmation) > 0 {
		validateCombatBoolean(&validationErrors, skill.NeedsConfirmation, "proficiencies.skills.needsConfirmation")
	}
	optionalTrimmedSummaryString(&validationErrors, skill.Note, "proficiencies.skills.note", 1000)
	return validationErrors
}
