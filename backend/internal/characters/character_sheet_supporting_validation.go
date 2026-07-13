package characters

import (
	"bytes"
	"encoding/json"
)

type characterSheetEquipment struct {
	Armor        json.RawMessage `json:"armor"`
	Weapons      json.RawMessage `json:"weapons"`
	PacksAndGear json.RawMessage `json:"packsAndGear"`
	Tools        json.RawMessage `json:"tools"`
	Languages    json.RawMessage `json:"languages"`
	Currency     json.RawMessage `json:"currency"`
}

type characterSheetCurrency struct {
	CP                json.RawMessage `json:"cp"`
	SP                json.RawMessage `json:"sp"`
	EP                json.RawMessage `json:"ep"`
	GP                json.RawMessage `json:"gp"`
	PP                json.RawMessage `json:"pp"`
	NeedsConfirmation json.RawMessage `json:"needsConfirmation"`
	Note              json.RawMessage `json:"note"`
}

type characterSheetPersonality struct {
	Traits json.RawMessage `json:"traits"`
	Ideals json.RawMessage `json:"ideals"`
	Bonds  json.RawMessage `json:"bonds"`
	Flaws  json.RawMessage `json:"flaws"`
	Notes  json.RawMessage `json:"notes"`
}

type characterSheetAudit struct {
	Source               json.RawMessage `json:"source"`
	NeedsConfirmation    json.RawMessage `json:"needsConfirmation"`
	RulesVersionWarnings json.RawMessage `json:"rulesVersionWarnings"`
	DeferredCorrections  json.RawMessage `json:"deferredCorrections"`
}

var characterSheetEquipmentFields = exactFields("armor", "weapons", "packsAndGear", "tools", "languages", "currency")
var characterSheetCurrencyFields = exactFields("cp", "sp", "ep", "gp", "pp", "needsConfirmation", "note")
var characterSheetPersonalityFields = exactFields("traits", "ideals", "bonds", "flaws", "notes")
var characterSheetAuditFields = exactFields("source", "needsConfirmation", "rulesVersionWarnings", "deferredCorrections")

func validateCharacterSheetEquipment(raw json.RawMessage) []string {
	if !containsOnlyExactJSONFields(raw, characterSheetEquipmentFields) {
		return []string{"referencePayload.equipment contains unsupported fields"}
	}
	var equipment characterSheetEquipment
	if !decodeStrictJSONObject(raw, &equipment) {
		return []string{"referencePayload.equipment must be a valid object"}
	}
	var validationErrors []string
	validationErrors = append(validationErrors, validateAuditedTextList(equipment.Armor, "equipment.armor")...)
	validationErrors = append(validationErrors, validateBoundedStringArray(equipment.Weapons, "equipment.weapons", 64, 200)...)
	validationErrors = append(validationErrors, validateAuditedTextList(equipment.PacksAndGear, "equipment.packsAndGear")...)
	validationErrors = append(validationErrors, validateAuditedTextList(equipment.Tools, "equipment.tools")...)
	validationErrors = append(validationErrors, validateAuditedTextList(equipment.Languages, "equipment.languages")...)
	validationErrors = append(validationErrors, validateCharacterSheetCurrency(equipment.Currency)...)
	return validationErrors
}

func validateCharacterSheetCurrency(raw json.RawMessage) []string {
	if len(raw) == 0 {
		return []string{"referencePayload.equipment.currency is required"}
	}
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		return nil
	}
	if !isJSONObject(raw) || !containsOnlyExactJSONFields(raw, characterSheetCurrencyFields) {
		return []string{"referencePayload.equipment.currency contains unsupported fields"}
	}
	var currency characterSheetCurrency
	if !decodeStrictJSONObject(raw, &currency) {
		return []string{"referencePayload.equipment.currency must be a valid object"}
	}
	denominations := []struct {
		name string
		raw  json.RawMessage
	}{
		{name: "cp", raw: currency.CP}, {name: "sp", raw: currency.SP}, {name: "ep", raw: currency.EP},
		{name: "gp", raw: currency.GP}, {name: "pp", raw: currency.PP},
	}
	var validationErrors []string
	for _, denomination := range denominations {
		if len(denomination.raw) > 0 {
			validateBoundedCombatInteger(&validationErrors, denomination.raw, "equipment.currency."+denomination.name, 0, 1000000)
		}
	}
	if len(currency.NeedsConfirmation) > 0 {
		validateCombatBoolean(&validationErrors, currency.NeedsConfirmation, "equipment.currency.needsConfirmation")
	}
	optionalTrimmedSummaryString(&validationErrors, currency.Note, "equipment.currency.note", 1000)
	return validationErrors
}

func validateCharacterSheetPersonality(raw json.RawMessage) []string {
	if !containsOnlyExactJSONFields(raw, characterSheetPersonalityFields) {
		return []string{"referencePayload.personality contains unsupported fields"}
	}
	var personality characterSheetPersonality
	if !decodeStrictJSONObject(raw, &personality) {
		return []string{"referencePayload.personality must be a valid object"}
	}
	fields := []struct {
		name string
		raw  json.RawMessage
	}{
		{name: "traits", raw: personality.Traits}, {name: "ideals", raw: personality.Ideals},
		{name: "bonds", raw: personality.Bonds}, {name: "flaws", raw: personality.Flaws}, {name: "notes", raw: personality.Notes},
	}
	var validationErrors []string
	for _, field := range fields {
		validationErrors = append(validationErrors, validateBoundedStringArray(field.raw, "personality."+field.name, 32, 1000)...)
	}
	return validationErrors
}

func validateCharacterSheetAudit(raw json.RawMessage) []string {
	if !containsOnlyExactJSONFields(raw, characterSheetAuditFields) {
		return []string{"referencePayload.audit contains unsupported fields"}
	}
	var audit characterSheetAudit
	if !decodeStrictJSONObject(raw, &audit) {
		return []string{"referencePayload.audit must be a valid object"}
	}
	var validationErrors []string
	requiredTrimmedSummaryString(&validationErrors, audit.Source, "audit.source", 1000)
	validationErrors = append(validationErrors, validateBoundedStringArray(audit.NeedsConfirmation, "audit.needsConfirmation", 64, 1000)...)
	validationErrors = append(validationErrors, validateBoundedStringArray(audit.RulesVersionWarnings, "audit.rulesVersionWarnings", 64, 1000)...)
	validationErrors = append(validationErrors, validateBoundedStringArray(audit.DeferredCorrections, "audit.deferredCorrections", 64, 1000)...)
	return validationErrors
}
