package characters

import (
	"bytes"
	"encoding/json"
)

type characterSheetSpellcasting struct {
	Ability          json.RawMessage `json:"ability"`
	SpellSaveDC      json.RawMessage `json:"spellSaveDC"`
	SpellAttackBonus json.RawMessage `json:"spellAttackBonus"`
	Slots            json.RawMessage `json:"slots"`
	Spells           json.RawMessage `json:"spells"`
}

type characterSheetSpellSlot struct {
	Level json.RawMessage `json:"level"`
	Max   json.RawMessage `json:"max"`
	Used  json.RawMessage `json:"used"`
}

type characterSheetSpell struct {
	ID              json.RawMessage `json:"id"`
	Name            json.RawMessage `json:"name"`
	Level           json.RawMessage `json:"level"`
	ActionType      json.RawMessage `json:"actionType"`
	CastingTime     json.RawMessage `json:"castingTime"`
	Duration        json.RawMessage `json:"duration"`
	Concentration   json.RawMessage `json:"concentration"`
	Summary         json.RawMessage `json:"summary"`
	Meta            json.RawMessage `json:"meta"`
	PreparedOrKnown json.RawMessage `json:"preparedOrKnown"`
	Source          json.RawMessage `json:"source"`
	QuickReference  json.RawMessage `json:"quickReference"`
}

var characterSheetSpellcastingFields = exactFields("ability", "spellSaveDC", "spellAttackBonus", "slots", "spells")
var characterSheetSpellSlotFields = exactFields("level", "max", "used")
var characterSheetSpellFields = exactFields(
	"id", "name", "level", "actionType", "castingTime", "duration", "concentration", "summary", "meta",
	"preparedOrKnown", "source", "quickReference",
)

func validateCharacterSheetSpellcasting(raw json.RawMessage) []string {
	if !containsOnlyExactJSONFields(raw, characterSheetSpellcastingFields) {
		return []string{"referencePayload.spellcasting contains unsupported fields"}
	}
	var spellcasting characterSheetSpellcasting
	if !decodeStrictJSONObject(raw, &spellcasting) {
		return []string{"referencePayload.spellcasting must be a valid object"}
	}

	var validationErrors []string
	validateRequiredEnum(&validationErrors, spellcasting.Ability, "spellcasting.ability", "wisdom", "intelligence", "charisma")
	validationErrors = append(validationErrors, validateNullableAuditedNumber(spellcasting.SpellSaveDC, "spellcasting.spellSaveDC", 0, 100)...)
	validationErrors = append(validationErrors, validateNullableAuditedNumber(spellcasting.SpellAttackBonus, "spellcasting.spellAttackBonus", -100, 100)...)
	validationErrors = append(validationErrors, validateCharacterSheetSpellSlots(spellcasting.Slots)...)
	validationErrors = append(validationErrors, validateCharacterSheetSpells(spellcasting.Spells)...)
	return validationErrors
}

func validateNullableAuditedNumber(raw json.RawMessage, field string, minimum, maximum int) []string {
	if len(raw) == 0 {
		return []string{"referencePayload." + field + " is required"}
	}
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		return nil
	}
	return validateAuditedNumber(raw, field, false, minimum, maximum, nil)
}

func validateCharacterSheetSpellSlots(raw json.RawMessage) []string {
	items, errors := decodeBoundedJSONArray(raw, "spellcasting.slots", 9)
	if len(errors) > 0 {
		return errors
	}
	seenLevels := make(map[int]struct{}, len(items))
	var validationErrors []string
	for _, rawItem := range items {
		level, levelValid, itemErrors := validateCharacterSheetSpellSlot(rawItem)
		validationErrors = append(validationErrors, itemErrors...)
		if levelValid {
			if _, exists := seenLevels[level]; exists {
				validationErrors = append(validationErrors, "referencePayload.spellcasting.slots levels must be unique")
			} else {
				seenLevels[level] = struct{}{}
			}
		}
	}
	return validationErrors
}

func validateCharacterSheetSpellSlot(raw json.RawMessage) (int, bool, []string) {
	if !isJSONObject(raw) || !containsOnlyExactJSONFields(raw, characterSheetSpellSlotFields) {
		return 0, false, []string{"referencePayload.spellcasting.slots contains an invalid entry"}
	}
	var slot characterSheetSpellSlot
	if !decodeStrictJSONObject(raw, &slot) {
		return 0, false, []string{"referencePayload.spellcasting.slots contains an invalid entry"}
	}
	var validationErrors []string
	level, levelValid := validateBoundedCombatInteger(&validationErrors, slot.Level, "spellcasting.slots.level", 1, 9)
	maximum, maximumValid := validateBoundedCombatInteger(&validationErrors, slot.Max, "spellcasting.slots.max", 0, 99)
	used, usedValid := validateBoundedCombatInteger(&validationErrors, slot.Used, "spellcasting.slots.used", 0, 99)
	if maximumValid && usedValid && used > maximum {
		validationErrors = append(validationErrors, "referencePayload.spellcasting.slots.used must not exceed max")
	}
	return level, levelValid, validationErrors
}

func validateCharacterSheetSpells(raw json.RawMessage) []string {
	items, errors := decodeBoundedJSONArray(raw, "spellcasting.spells", 128)
	if len(errors) > 0 {
		return errors
	}
	seenIDs := make(map[string]struct{}, len(items))
	var validationErrors []string
	for _, rawItem := range items {
		id, idValid, itemErrors := validateCharacterSheetSpell(rawItem)
		validationErrors = append(validationErrors, itemErrors...)
		if idValid {
			if _, exists := seenIDs[id]; exists {
				validationErrors = append(validationErrors, "referencePayload.spellcasting.spells IDs must be unique")
			} else {
				seenIDs[id] = struct{}{}
			}
		}
	}
	return validationErrors
}

func validateCharacterSheetSpell(raw json.RawMessage) (string, bool, []string) {
	if !isJSONObject(raw) || !containsOnlyExactJSONFields(raw, characterSheetSpellFields) {
		return "", false, []string{"referencePayload.spellcasting.spells contains an invalid entry"}
	}
	var spell characterSheetSpell
	if !decodeStrictJSONObject(raw, &spell) {
		return "", false, []string{"referencePayload.spellcasting.spells contains an invalid entry"}
	}
	var validationErrors []string
	id, idValid := validateNestedIdentifier(&validationErrors, spell.ID, "spellcasting.spells.id")
	requiredTrimmedSummaryString(&validationErrors, spell.Name, "spellcasting.spells.name", 200)
	validateBoundedCombatInteger(&validationErrors, spell.Level, "spellcasting.spells.level", 0, 9)
	requiredTrimmedSummaryString(&validationErrors, spell.ActionType, "spellcasting.spells.actionType", 200)
	requiredTrimmedSummaryString(&validationErrors, spell.CastingTime, "spellcasting.spells.castingTime", 200)
	requiredTrimmedSummaryString(&validationErrors, spell.Duration, "spellcasting.spells.duration", 200)
	validateCombatBoolean(&validationErrors, spell.Concentration, "spellcasting.spells.concentration")
	requiredTrimmedSummaryString(&validationErrors, spell.Summary, "spellcasting.spells.summary", 1000)
	validationErrors = append(validationErrors, validateBoundedStringArray(spell.Meta, "spellcasting.spells.meta", 16, 200)...)
	validateRequiredEnum(&validationErrors, spell.PreparedOrKnown, "spellcasting.spells.preparedOrKnown", "prepared", "known")
	validationErrors = append(validationErrors, validateFeatureSource(spell.Source)...)
	if len(spell.QuickReference) > 0 {
		validationErrors = append(validationErrors, validateQuickReference(spell.QuickReference, "spellcasting.spells.quickReference")...)
	}
	return id, idValid, validationErrors
}
