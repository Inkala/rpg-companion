package characters

import (
	"bytes"
	"encoding/json"
)

type characterSheetCombat struct {
	HitPoints         json.RawMessage `json:"hitPoints"`
	ArmorClass        json.RawMessage `json:"armorClass"`
	Initiative        json.RawMessage `json:"initiative"`
	Speed             json.RawMessage `json:"speed"`
	ProficiencyBonus  json.RawMessage `json:"proficiencyBonus"`
	PassivePerception json.RawMessage `json:"passivePerception"`
	Concentration     json.RawMessage `json:"concentration"`
}

type characterSheetCombatHitPoints struct {
	Current   json.RawMessage `json:"current"`
	Max       json.RawMessage `json:"max"`
	Temporary json.RawMessage `json:"temporary"`
}

type characterSheetAuditedNumber struct {
	Value             json.RawMessage `json:"value"`
	NeedsConfirmation json.RawMessage `json:"needsConfirmation"`
	Note              json.RawMessage `json:"note"`
}

type characterSheetSpeed struct {
	Type json.RawMessage `json:"type"`
	Feet json.RawMessage `json:"feet"`
}

var characterSheetCombatFields = map[string]struct{}{
	"hitPoints":         {},
	"armorClass":        {},
	"initiative":        {},
	"speed":             {},
	"proficiencyBonus":  {},
	"passivePerception": {},
	"concentration":     {},
}

var characterSheetCombatHitPointFields = map[string]struct{}{
	"current":   {},
	"max":       {},
	"temporary": {},
}

var characterSheetAuditedNumberFields = map[string]struct{}{
	"value":             {},
	"needsConfirmation": {},
	"note":              {},
}

var characterSheetSpeedFields = map[string]struct{}{
	"type": {},
	"feet": {},
}

func validateCharacterSheetCombat(raw json.RawMessage, expected characterSheetExpectedValues) []string {
	if !containsOnlyExactJSONFields(raw, characterSheetCombatFields) {
		return []string{"referencePayload.combat contains unsupported fields"}
	}
	var combat characterSheetCombat
	if !decodeStrictJSONObject(raw, &combat) {
		return []string{"referencePayload.combat must be a valid combat object"}
	}

	var validationErrors []string
	validationErrors = append(validationErrors, validateCombatHitPoints(combat.HitPoints, expected.HitPoints)...)
	validationErrors = append(validationErrors, validateAuditedNumber(
		combat.ArmorClass,
		"combat.armorClass",
		true,
		0,
		100,
		&expected.ArmorClass,
	)...)
	validateBoundedCombatInteger(&validationErrors, combat.Initiative, "combat.initiative", -100, 100)
	validationErrors = append(validationErrors, validateCombatSpeed(combat.Speed, expected.SpeedFt)...)
	validateBoundedCombatInteger(&validationErrors, combat.ProficiencyBonus, "combat.proficiencyBonus", 0, 20)
	validationErrors = append(validationErrors, validateAuditedNumber(
		combat.PassivePerception,
		"combat.passivePerception",
		false,
		0,
		100,
		nil,
	)...)
	validationErrors = append(validationErrors, validateCombatConcentration(combat.Concentration)...)
	return validationErrors
}

func validateCombatHitPoints(raw json.RawMessage, expected HitPoints) []string {
	if !isJSONObject(raw) || !containsOnlyExactJSONFields(raw, characterSheetCombatHitPointFields) {
		return []string{"referencePayload.combat.hitPoints must contain only current, max, and temporary"}
	}
	var hitPoints characterSheetCombatHitPoints
	if !decodeStrictJSONObject(raw, &hitPoints) {
		return []string{"referencePayload.combat.hitPoints must be a valid object"}
	}

	var validationErrors []string
	current, currentValid := validateBoundedCombatInteger(&validationErrors, hitPoints.Current, "combat.hitPoints.current", 0, 9999)
	maximum, maximumValid := validateBoundedCombatInteger(&validationErrors, hitPoints.Max, "combat.hitPoints.max", 0, 9999)
	validateBoundedCombatInteger(&validationErrors, hitPoints.Temporary, "combat.hitPoints.temporary", 0, 9999)
	if currentValid && maximumValid && current > maximum {
		validationErrors = append(validationErrors, "referencePayload.combat.hitPoints.current must not exceed max")
	}
	if currentValid && current != expected.Current {
		validationErrors = append(validationErrors, "referencePayload.combat.hitPoints.current must match hitPoints.current")
	}
	if maximumValid && maximum != expected.Max {
		validationErrors = append(validationErrors, "referencePayload.combat.hitPoints.max must match hitPoints.max")
	}
	return validationErrors
}

func validateAuditedNumber(
	raw json.RawMessage,
	field string,
	valueRequired bool,
	minimum int,
	maximum int,
	expected *int,
) []string {
	if !isJSONObject(raw) || !containsOnlyExactJSONFields(raw, characterSheetAuditedNumberFields) {
		return []string{"referencePayload." + field + " contains unsupported fields"}
	}
	var audited characterSheetAuditedNumber
	if !decodeStrictJSONObject(raw, &audited) {
		return []string{"referencePayload." + field + " must be a valid object"}
	}

	var validationErrors []string
	var value int
	valueValid := false
	if len(audited.Value) == 0 {
		if valueRequired {
			validationErrors = append(validationErrors, "referencePayload."+field+".value is required")
		}
	} else {
		value, valueValid = validateBoundedCombatInteger(&validationErrors, audited.Value, field+".value", minimum, maximum)
	}
	if valueValid && expected != nil && value != *expected {
		validationErrors = append(validationErrors, "referencePayload."+field+".value must match top-level value")
	}
	if len(audited.NeedsConfirmation) > 0 {
		validateCombatBoolean(&validationErrors, audited.NeedsConfirmation, field+".needsConfirmation")
	}
	optionalTrimmedSummaryString(&validationErrors, audited.Note, field+".note", 1000)
	return validationErrors
}

func validateCombatBoolean(validationErrors *[]string, raw json.RawMessage, field string) bool {
	trimmed := bytes.TrimSpace(raw)
	if !bytes.Equal(trimmed, []byte("true")) && !bytes.Equal(trimmed, []byte("false")) {
		*validationErrors = append(*validationErrors, "referencePayload."+field+" must be a boolean")
		return false
	}
	return true
}

func validateCombatSpeed(raw json.RawMessage, expectedFeet int) []string {
	var speeds []json.RawMessage
	if err := json.Unmarshal(raw, &speeds); err != nil || len(speeds) != 1 {
		return []string{"referencePayload.combat.speed must contain exactly one walk entry"}
	}
	rawSpeed := speeds[0]
	if !isJSONObject(rawSpeed) || !containsOnlyExactJSONFields(rawSpeed, characterSheetSpeedFields) {
		return []string{"referencePayload.combat.speed contains an invalid entry"}
	}
	var speed characterSheetSpeed
	if !decodeStrictJSONObject(rawSpeed, &speed) {
		return []string{"referencePayload.combat.speed contains an invalid entry"}
	}

	var validationErrors []string
	var speedType string
	if len(speed.Type) == 0 {
		validationErrors = append(validationErrors, "referencePayload.combat.speed.type is required")
	} else if err := json.Unmarshal(speed.Type, &speedType); err != nil || speedType != "walk" {
		validationErrors = append(validationErrors, "referencePayload.combat.speed.type must be walk")
	}
	feet, feetValid := validateBoundedCombatInteger(&validationErrors, speed.Feet, "combat.speed.feet", 0, 1000)
	if feetValid && feet != expectedFeet {
		validationErrors = append(validationErrors, "referencePayload.combat.speed.feet must match speedFt")
	}
	return validationErrors
}

func validateCombatConcentration(raw json.RawMessage) []string {
	if len(raw) == 0 {
		return []string{"referencePayload.combat.concentration is required"}
	}
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		return nil
	}
	var validationErrors []string
	requiredTrimmedSummaryString(&validationErrors, raw, "combat.concentration", 200)
	return validationErrors
}

func validateBoundedCombatInteger(
	validationErrors *[]string,
	raw json.RawMessage,
	field string,
	minimum int,
	maximum int,
) (int, bool) {
	value, valid := requiredCharacterSheetInteger(validationErrors, raw, field)
	if !valid {
		return 0, false
	}
	if value < minimum || value > maximum {
		*validationErrors = append(*validationErrors, "referencePayload."+field+" is outside the supported range")
		return value, false
	}
	return value, true
}
