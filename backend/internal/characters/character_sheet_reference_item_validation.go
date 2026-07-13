package characters

import (
	"bytes"
	"encoding/json"
)

type characterSheetAction struct {
	ID             json.RawMessage `json:"id"`
	Name           json.RawMessage `json:"name"`
	Kind           json.RawMessage `json:"kind"`
	Section        json.RawMessage `json:"section"`
	ActionType     json.RawMessage `json:"actionType"`
	AttackBonus    json.RawMessage `json:"attackBonus"`
	Damage         json.RawMessage `json:"damage"`
	Range          json.RawMessage `json:"range"`
	Summary        json.RawMessage `json:"summary"`
	Meta           json.RawMessage `json:"meta"`
	QuickReference json.RawMessage `json:"quickReference"`
}

type characterSheetDamage struct {
	Dice  json.RawMessage `json:"dice"`
	Bonus json.RawMessage `json:"bonus"`
	Type  json.RawMessage `json:"type"`
}

type characterSheetRange struct {
	Normal json.RawMessage `json:"normal"`
	Long   json.RawMessage `json:"long"`
}

type characterSheetFeature struct {
	ID                 json.RawMessage `json:"id"`
	Name               json.RawMessage `json:"name"`
	Category           json.RawMessage `json:"category"`
	Source             json.RawMessage `json:"source"`
	Tags               json.RawMessage `json:"tags"`
	Summary            json.RawMessage `json:"summary"`
	IncludeInReference json.RawMessage `json:"includeInReference"`
	QuickReference     json.RawMessage `json:"quickReference"`
}

type characterSheetFeatureSource struct {
	RulesVersion json.RawMessage `json:"rulesVersion"`
	Status       json.RawMessage `json:"status"`
	Note         json.RawMessage `json:"note"`
}

type characterSheetQuickReference struct {
	Title    json.RawMessage `json:"title"`
	Label    json.RawMessage `json:"label"`
	Summary  json.RawMessage `json:"summary"`
	Metadata json.RawMessage `json:"metadata"`
	Reminder json.RawMessage `json:"reminder"`
	Details  json.RawMessage `json:"details"`
}

type characterSheetMetadata struct {
	Label json.RawMessage `json:"label"`
	Value json.RawMessage `json:"value"`
}

type characterSheetReminder struct {
	Heading json.RawMessage `json:"heading"`
	Text    json.RawMessage `json:"text"`
}

type characterSheetDetails struct {
	CollapsedLabel json.RawMessage `json:"collapsedLabel"`
	ExpandedLabel  json.RawMessage `json:"expandedLabel"`
	Text           json.RawMessage `json:"text"`
}

var characterSheetActionFields = exactFields("id", "name", "kind", "section", "actionType", "attackBonus", "damage", "range", "summary", "meta", "quickReference")
var characterSheetDamageFields = exactFields("dice", "bonus", "type")
var characterSheetRangeFields = exactFields("normal", "long")
var characterSheetFeatureFields = exactFields("id", "name", "category", "source", "tags", "summary", "includeInReference", "quickReference")
var characterSheetFeatureSourceFields = exactFields("rulesVersion", "status", "note")
var characterSheetQuickReferenceFields = exactFields("title", "label", "summary", "metadata", "reminder", "details")
var characterSheetMetadataFields = exactFields("label", "value")
var characterSheetReminderFields = exactFields("heading", "text")
var characterSheetDetailsFields = exactFields("collapsedLabel", "expandedLabel", "text")

func validateCharacterSheetActions(raw json.RawMessage) []string {
	items, errors := decodeBoundedJSONArray(raw, "actions", 32)
	if len(errors) > 0 {
		return errors
	}
	seen := make(map[string]struct{}, len(items))
	var validationErrors []string
	for _, rawItem := range items {
		id, idValid, itemErrors := validateCharacterSheetAction(rawItem)
		validationErrors = append(validationErrors, itemErrors...)
		if idValid {
			if _, exists := seen[id]; exists {
				validationErrors = append(validationErrors, "referencePayload.actions IDs must be unique")
			} else {
				seen[id] = struct{}{}
			}
		}
	}
	return validationErrors
}

func validateCharacterSheetAction(raw json.RawMessage) (string, bool, []string) {
	if !isJSONObject(raw) || !containsOnlyExactJSONFields(raw, characterSheetActionFields) {
		return "", false, []string{"referencePayload.actions contains an invalid entry"}
	}
	var action characterSheetAction
	if !decodeStrictJSONObject(raw, &action) {
		return "", false, []string{"referencePayload.actions contains an invalid entry"}
	}
	var validationErrors []string
	id, idValid := validateNestedIdentifier(&validationErrors, action.ID, "actions.id")
	requiredTrimmedSummaryString(&validationErrors, action.Name, "actions.name", 200)
	validateRequiredEnum(&validationErrors, action.Kind, "actions.kind", "attack", "ability", "spell")
	validateRequiredEnum(&validationErrors, action.Section, "actions.section", "actions")
	requiredTrimmedSummaryString(&validationErrors, action.ActionType, "actions.actionType", 200)
	requiredTrimmedSummaryString(&validationErrors, action.Summary, "actions.summary", 1000)
	validationErrors = append(validationErrors, validateBoundedStringArray(action.Meta, "actions.meta", 16, 200)...)
	if len(action.AttackBonus) > 0 {
		validateBoundedCombatInteger(&validationErrors, action.AttackBonus, "actions.attackBonus", -100, 100)
	}
	if len(action.Damage) > 0 {
		validationErrors = append(validationErrors, validateCharacterSheetDamage(action.Damage)...)
	}
	if len(action.Range) > 0 {
		validationErrors = append(validationErrors, validateCharacterSheetRange(action.Range)...)
	}
	if len(action.QuickReference) > 0 {
		validationErrors = append(validationErrors, validateQuickReference(action.QuickReference, "actions.quickReference")...)
	}
	return id, idValid, validationErrors
}

func validateCharacterSheetDamage(raw json.RawMessage) []string {
	items, errors := decodeBoundedJSONArray(raw, "actions.damage", 8)
	if len(errors) > 0 {
		return errors
	}
	var validationErrors []string
	for _, rawItem := range items {
		if !isJSONObject(rawItem) || !containsOnlyExactJSONFields(rawItem, characterSheetDamageFields) {
			validationErrors = append(validationErrors, "referencePayload.actions.damage contains an invalid entry")
			continue
		}
		var damage characterSheetDamage
		if !decodeStrictJSONObject(rawItem, &damage) {
			validationErrors = append(validationErrors, "referencePayload.actions.damage contains an invalid entry")
			continue
		}
		requiredTrimmedSummaryString(&validationErrors, damage.Dice, "actions.damage.dice", 200)
		validateBoundedCombatInteger(&validationErrors, damage.Bonus, "actions.damage.bonus", -100, 100)
		requiredTrimmedSummaryString(&validationErrors, damage.Type, "actions.damage.type", 200)
	}
	return validationErrors
}

func validateCharacterSheetRange(raw json.RawMessage) []string {
	if !isJSONObject(raw) || !containsOnlyExactJSONFields(raw, characterSheetRangeFields) {
		return []string{"referencePayload.actions.range must contain only normal and long"}
	}
	var itemRange characterSheetRange
	if !decodeStrictJSONObject(raw, &itemRange) {
		return []string{"referencePayload.actions.range must be a valid object"}
	}
	var validationErrors []string
	normal, normalValid := validateBoundedCombatInteger(&validationErrors, itemRange.Normal, "actions.range.normal", 0, 10000)
	long, longValid := validateBoundedCombatInteger(&validationErrors, itemRange.Long, "actions.range.long", 0, 10000)
	if normalValid && longValid && long < normal {
		validationErrors = append(validationErrors, "referencePayload.actions.range.long must not be below normal")
	}
	return validationErrors
}

func validateCharacterSheetFeatures(raw json.RawMessage) []string {
	items, errors := decodeBoundedJSONArray(raw, "features", 64)
	if len(errors) > 0 {
		return errors
	}
	seen := make(map[string]struct{}, len(items))
	var validationErrors []string
	for _, rawItem := range items {
		id, idValid, itemErrors := validateCharacterSheetFeature(rawItem)
		validationErrors = append(validationErrors, itemErrors...)
		if idValid {
			if _, exists := seen[id]; exists {
				validationErrors = append(validationErrors, "referencePayload.features IDs must be unique")
			} else {
				seen[id] = struct{}{}
			}
		}
	}
	return validationErrors
}

func validateCharacterSheetFeature(raw json.RawMessage) (string, bool, []string) {
	if !isJSONObject(raw) || !containsOnlyExactJSONFields(raw, characterSheetFeatureFields) {
		return "", false, []string{"referencePayload.features contains an invalid entry"}
	}
	var feature characterSheetFeature
	if !decodeStrictJSONObject(raw, &feature) {
		return "", false, []string{"referencePayload.features contains an invalid entry"}
	}
	var validationErrors []string
	id, idValid := validateNestedIdentifier(&validationErrors, feature.ID, "features.id")
	requiredTrimmedSummaryString(&validationErrors, feature.Name, "features.name", 200)
	requiredTrimmedSummaryString(&validationErrors, feature.Category, "features.category", 200)
	validationErrors = append(validationErrors, validateFeatureSource(feature.Source)...)
	validationErrors = append(validationErrors, validateBoundedStringArray(feature.Tags, "features.tags", 16, 200)...)
	requiredTrimmedSummaryString(&validationErrors, feature.Summary, "features.summary", 1000)
	validateCombatBoolean(&validationErrors, feature.IncludeInReference, "features.includeInReference")
	if len(feature.QuickReference) > 0 {
		validationErrors = append(validationErrors, validateQuickReference(feature.QuickReference, "features.quickReference")...)
	}
	return id, idValid, validationErrors
}

func validateFeatureSource(raw json.RawMessage) []string {
	if !isJSONObject(raw) || !containsOnlyExactJSONFields(raw, characterSheetFeatureSourceFields) {
		return []string{"referencePayload.features.source contains unsupported fields"}
	}
	var source characterSheetFeatureSource
	if !decodeStrictJSONObject(raw, &source) {
		return []string{"referencePayload.features.source must be a valid object"}
	}
	var validationErrors []string
	validateRequiredEnum(&validationErrors, source.RulesVersion, "features.source.rulesVersion", "2014", "2024", "mixed", "unknown")
	validateRequiredEnum(&validationErrors, source.Status, "features.source.status", "confirmed", "needs-confirmation", "deferred")
	optionalTrimmedSummaryString(&validationErrors, source.Note, "features.source.note", 1000)
	return validationErrors
}

func validateQuickReference(raw json.RawMessage, field string) []string {
	if !isJSONObject(raw) || !containsOnlyExactJSONFields(raw, characterSheetQuickReferenceFields) {
		return []string{"referencePayload." + field + " contains unsupported fields"}
	}
	var reference characterSheetQuickReference
	if !decodeStrictJSONObject(raw, &reference) {
		return []string{"referencePayload." + field + " must be a valid object"}
	}
	var validationErrors []string
	requiredTrimmedSummaryString(&validationErrors, reference.Title, field+".title", 200)
	requiredTrimmedSummaryString(&validationErrors, reference.Label, field+".label", 200)
	requiredTrimmedSummaryString(&validationErrors, reference.Summary, field+".summary", 1000)
	validationErrors = append(validationErrors, validateQuickReferenceMetadata(reference.Metadata, field+".metadata")...)
	if len(reference.Reminder) > 0 {
		validationErrors = append(validationErrors, validateQuickReferenceReminder(reference.Reminder, field+".reminder")...)
	}
	if len(reference.Details) > 0 {
		validationErrors = append(validationErrors, validateQuickReferenceDetails(reference.Details, field+".details")...)
	}
	return validationErrors
}

func validateQuickReferenceMetadata(raw json.RawMessage, field string) []string {
	items, errors := decodeBoundedJSONArray(raw, field, 16)
	if len(errors) > 0 {
		return errors
	}
	var validationErrors []string
	for _, rawItem := range items {
		if !isJSONObject(rawItem) || !containsOnlyExactJSONFields(rawItem, characterSheetMetadataFields) {
			validationErrors = append(validationErrors, "referencePayload."+field+" contains an invalid entry")
			continue
		}
		var metadata characterSheetMetadata
		if !decodeStrictJSONObject(rawItem, &metadata) {
			validationErrors = append(validationErrors, "referencePayload."+field+" contains an invalid entry")
			continue
		}
		requiredTrimmedSummaryString(&validationErrors, metadata.Label, field+".label", 200)
		requiredTrimmedSummaryString(&validationErrors, metadata.Value, field+".value", 200)
	}
	return validationErrors
}

func validateQuickReferenceReminder(raw json.RawMessage, field string) []string {
	if !isJSONObject(raw) || !containsOnlyExactJSONFields(raw, characterSheetReminderFields) {
		return []string{"referencePayload." + field + " contains unsupported fields"}
	}
	var reminder characterSheetReminder
	if !decodeStrictJSONObject(raw, &reminder) {
		return []string{"referencePayload." + field + " must be a valid object"}
	}
	var validationErrors []string
	requiredTrimmedSummaryString(&validationErrors, reminder.Heading, field+".heading", 200)
	requiredTrimmedSummaryString(&validationErrors, reminder.Text, field+".text", 1000)
	return validationErrors
}

func validateQuickReferenceDetails(raw json.RawMessage, field string) []string {
	if !isJSONObject(raw) || !containsOnlyExactJSONFields(raw, characterSheetDetailsFields) {
		return []string{"referencePayload." + field + " contains unsupported fields"}
	}
	var details characterSheetDetails
	if !decodeStrictJSONObject(raw, &details) {
		return []string{"referencePayload." + field + " must be a valid object"}
	}
	var validationErrors []string
	requiredTrimmedSummaryString(&validationErrors, details.CollapsedLabel, field+".collapsedLabel", 200)
	requiredTrimmedSummaryString(&validationErrors, details.ExpandedLabel, field+".expandedLabel", 200)
	requiredTrimmedSummaryString(&validationErrors, details.Text, field+".text", 1000)
	return validationErrors
}

func validateNestedIdentifier(validationErrors *[]string, raw json.RawMessage, field string) (string, bool) {
	var value string
	if len(raw) == 0 || json.Unmarshal(raw, &value) != nil || !isValidPortraitAssetID(value) {
		*validationErrors = append(*validationErrors, "referencePayload."+field+" is invalid")
		return "", false
	}
	return value, true
}

func validateRequiredEnum(validationErrors *[]string, raw json.RawMessage, field string, allowed ...string) bool {
	var value string
	if len(raw) == 0 || json.Unmarshal(raw, &value) != nil {
		*validationErrors = append(*validationErrors, "referencePayload."+field+" is invalid")
		return false
	}
	for _, allowedValue := range allowed {
		if value == allowedValue {
			return true
		}
	}
	*validationErrors = append(*validationErrors, "referencePayload."+field+" is invalid")
	return false
}

func validateBoundedStringArray(raw json.RawMessage, field string, maximumEntries, maximumRunes int) []string {
	items, errors := decodeBoundedJSONArray(raw, field, maximumEntries)
	if len(errors) > 0 {
		return errors
	}
	var validationErrors []string
	for _, item := range items {
		requiredTrimmedSummaryString(&validationErrors, item, field+" entry", maximumRunes)
	}
	return validationErrors
}

func decodeBoundedJSONArray(raw json.RawMessage, field string, maximum int) ([]json.RawMessage, []string) {
	if len(raw) == 0 {
		return nil, []string{"referencePayload." + field + " is required"}
	}
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || trimmed[0] != '[' {
		return nil, []string{"referencePayload." + field + " must be a JSON array"}
	}
	var items []json.RawMessage
	if json.Unmarshal(raw, &items) != nil {
		return nil, []string{"referencePayload." + field + " must be a JSON array"}
	}
	if len(items) > maximum {
		return nil, []string{"referencePayload." + field + " has too many entries"}
	}
	return items, nil
}

func exactFields(fields ...string) map[string]struct{} {
	result := make(map[string]struct{}, len(fields))
	for _, field := range fields {
		result[field] = struct{}{}
	}
	return result
}
