package characters

import (
	"bytes"
	"encoding/json"
	"strings"
	"unicode/utf8"
)

type characterSheetSummary struct {
	DisplayLine       json.RawMessage `json:"displayLine"`
	SupportingLine    json.RawMessage `json:"supportingLine"`
	LandingConcept    json.RawMessage `json:"landingConcept"`
	PortraitAssetID   json.RawMessage `json:"portraitAssetId"`
	PortraitAlt       json.RawMessage `json:"portraitAlt"`
	FeaturedAbilities json.RawMessage `json:"featuredAbilities"`
	ReferenceSections json.RawMessage `json:"referenceSections"`
}

type characterSheetReferenceSection struct {
	ID          json.RawMessage `json:"id"`
	Label       json.RawMessage `json:"label"`
	DefaultOpen json.RawMessage `json:"defaultOpen"`
}

var characterSheetSummaryFields = map[string]struct{}{
	"displayLine":       {},
	"supportingLine":    {},
	"landingConcept":    {},
	"portraitAssetId":   {},
	"portraitAlt":       {},
	"featuredAbilities": {},
	"referenceSections": {},
}

var characterSheetReferenceSectionFields = map[string]struct{}{
	"id":          {},
	"label":       {},
	"defaultOpen": {},
}

func validateCharacterSheetSummary(raw json.RawMessage) []string {
	if !containsOnlyExactJSONFields(raw, characterSheetSummaryFields) {
		return []string{"referencePayload.summary contains unsupported fields"}
	}

	var summary characterSheetSummary
	if !decodeStrictJSONObject(raw, &summary) {
		return []string{"referencePayload.summary must be a valid summary object"}
	}

	var validationErrors []string
	requiredTrimmedSummaryString(&validationErrors, summary.DisplayLine, "summary.displayLine", 200)
	optionalTrimmedSummaryString(&validationErrors, summary.SupportingLine, "summary.supportingLine", 1000)
	requiredTrimmedSummaryString(&validationErrors, summary.LandingConcept, "summary.landingConcept", 1000)
	validatePortraitAssetID(&validationErrors, summary.PortraitAssetID)
	optionalTrimmedSummaryString(&validationErrors, summary.PortraitAlt, "summary.portraitAlt", 200)
	validationErrors = append(validationErrors, validateFeaturedAbilities(summary.FeaturedAbilities)...)
	validationErrors = append(validationErrors, validateReferenceSections(summary.ReferenceSections)...)
	return validationErrors
}

func validatePortraitAssetID(validationErrors *[]string, raw json.RawMessage) {
	if len(raw) == 0 {
		return
	}
	var value string
	if err := json.Unmarshal(raw, &value); err != nil || !isValidPortraitAssetID(value) {
		*validationErrors = append(*validationErrors, "referencePayload.summary.portraitAssetId is invalid")
	}
}

func isValidPortraitAssetID(value string) bool {
	if len(value) < 1 || len(value) > 128 {
		return false
	}
	for _, character := range value {
		if (character < 'a' || character > 'z') &&
			(character < '0' || character > '9') &&
			character != '-' {
			return false
		}
	}
	return true
}

func validateFeaturedAbilities(raw json.RawMessage) []string {
	if len(raw) == 0 {
		return []string{"referencePayload.summary.featuredAbilities is required"}
	}
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || trimmed[0] != '[' {
		return []string{"referencePayload.summary.featuredAbilities must be a JSON array"}
	}
	var entries []json.RawMessage
	if err := json.Unmarshal(raw, &entries); err != nil {
		return []string{"referencePayload.summary.featuredAbilities must be a JSON array"}
	}
	if len(entries) > 16 {
		return []string{"referencePayload.summary.featuredAbilities must contain at most 16 entries"}
	}

	var validationErrors []string
	for _, entry := range entries {
		requiredTrimmedSummaryString(
			&validationErrors,
			entry,
			"summary.featuredAbilities entry",
			200,
		)
	}
	return validationErrors
}

func validateReferenceSections(raw json.RawMessage) []string {
	if len(raw) == 0 {
		return []string{"referencePayload.summary.referenceSections is required"}
	}
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || trimmed[0] != '[' {
		return []string{"referencePayload.summary.referenceSections must be a JSON array"}
	}
	var rawSections []json.RawMessage
	if err := json.Unmarshal(raw, &rawSections); err != nil {
		return []string{"referencePayload.summary.referenceSections must be a JSON array"}
	}
	if len(rawSections) > 3 {
		return []string{"referencePayload.summary.referenceSections must contain at most 3 entries"}
	}

	seenIDs := make(map[string]struct{}, len(rawSections))
	var validationErrors []string
	for _, rawSection := range rawSections {
		id, valid, sectionErrors := validateReferenceSection(rawSection)
		validationErrors = append(validationErrors, sectionErrors...)
		if !valid {
			continue
		}
		if _, exists := seenIDs[id]; exists {
			validationErrors = append(validationErrors, "referencePayload.summary.referenceSections IDs must be unique")
			continue
		}
		seenIDs[id] = struct{}{}
	}
	return validationErrors
}

func validateReferenceSection(raw json.RawMessage) (string, bool, []string) {
	if !isJSONObject(raw) || !containsOnlyExactJSONFields(raw, characterSheetReferenceSectionFields) {
		return "", false, []string{"referencePayload.summary.referenceSections contains an invalid entry"}
	}
	var section characterSheetReferenceSection
	if !decodeStrictJSONObject(raw, &section) {
		return "", false, []string{"referencePayload.summary.referenceSections contains an invalid entry"}
	}

	var validationErrors []string
	id, idValid := requiredReferenceSectionID(&validationErrors, section.ID)
	_, labelValid := requiredTrimmedSummaryString(
		&validationErrors,
		section.Label,
		"summary.referenceSections.label",
		200,
	)
	defaultOpenValid := requiredJSONBoolean(&validationErrors, section.DefaultOpen)
	return id, idValid && labelValid && defaultOpenValid, validationErrors
}

func requiredReferenceSectionID(validationErrors *[]string, raw json.RawMessage) (string, bool) {
	if len(raw) == 0 {
		*validationErrors = append(*validationErrors, "referencePayload.summary.referenceSections.id is required")
		return "", false
	}
	var id string
	if err := json.Unmarshal(raw, &id); err != nil || !isSupportedReferenceSectionID(id) {
		*validationErrors = append(*validationErrors, "referencePayload.summary.referenceSections.id is not supported")
		return "", false
	}
	return id, true
}

func isSupportedReferenceSectionID(id string) bool {
	switch id {
	case "actions", "features", "spells":
		return true
	default:
		return false
	}
}

func requiredJSONBoolean(validationErrors *[]string, raw json.RawMessage) bool {
	if len(raw) == 0 {
		*validationErrors = append(*validationErrors, "referencePayload.summary.referenceSections.defaultOpen is required")
		return false
	}
	trimmed := bytes.TrimSpace(raw)
	if !bytes.Equal(trimmed, []byte("true")) && !bytes.Equal(trimmed, []byte("false")) {
		*validationErrors = append(*validationErrors, "referencePayload.summary.referenceSections.defaultOpen must be a boolean")
		return false
	}
	return true
}

func requiredTrimmedSummaryString(
	validationErrors *[]string,
	raw json.RawMessage,
	field string,
	maxRunes int,
) (string, bool) {
	if len(raw) == 0 {
		*validationErrors = append(*validationErrors, "referencePayload."+field+" is required")
		return "", false
	}
	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		*validationErrors = append(*validationErrors, "referencePayload."+field+" must be a string")
		return "", false
	}
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		*validationErrors = append(*validationErrors, "referencePayload."+field+" must be nonempty")
		return "", false
	}
	if utf8.RuneCountInString(trimmed) > maxRunes {
		*validationErrors = append(*validationErrors, "referencePayload."+field+" is too long")
		return "", false
	}
	return trimmed, true
}

func optionalTrimmedSummaryString(
	validationErrors *[]string,
	raw json.RawMessage,
	field string,
	maxRunes int,
) (*string, bool) {
	if len(raw) == 0 {
		return nil, true
	}
	value, valid := requiredTrimmedSummaryString(validationErrors, raw, field, maxRunes)
	if !valid {
		return nil, false
	}
	return &value, true
}
