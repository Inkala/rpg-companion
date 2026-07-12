package characters

import (
	"bytes"
	"encoding/json"
	"io"
	"strings"
	"unicode/utf8"
)

type characterSheetExpectedValues struct {
	Name          string
	Ancestry      string
	Background    string
	ClassName     string
	SubclassName  *string
	Level         int
	AbilityScores AbilityScores
}

type characterSheetIdentity struct {
	Name       json.RawMessage `json:"name"`
	Ancestry   json.RawMessage `json:"ancestry"`
	Background json.RawMessage `json:"background"`
	Alignment  json.RawMessage `json:"alignment"`
	Classes    json.RawMessage `json:"classes"`
	Concept    json.RawMessage `json:"concept"`
}

type characterSheetClass struct {
	Name     json.RawMessage `json:"name"`
	Level    json.RawMessage `json:"level"`
	Subclass json.RawMessage `json:"subclass"`
}

type characterSheetAbilities struct {
	Scores json.RawMessage `json:"scores"`
}

type characterSheetAbilityScores struct {
	Strength     json.RawMessage `json:"strength"`
	Dexterity    json.RawMessage `json:"dexterity"`
	Constitution json.RawMessage `json:"constitution"`
	Intelligence json.RawMessage `json:"intelligence"`
	Wisdom       json.RawMessage `json:"wisdom"`
	Charisma     json.RawMessage `json:"charisma"`
}

type validatedCharacterClass struct {
	Name     string
	Level    int
	Subclass *string
}

var characterSheetIdentityFields = map[string]struct{}{
	"name":       {},
	"ancestry":   {},
	"background": {},
	"alignment":  {},
	"classes":    {},
	"concept":    {},
}

var characterSheetClassFields = map[string]struct{}{
	"name":     {},
	"level":    {},
	"subclass": {},
}

var characterSheetAbilitiesFields = map[string]struct{}{
	"scores": {},
}

var characterSheetAbilityScoreFields = map[string]struct{}{
	"strength":     {},
	"dexterity":    {},
	"constitution": {},
	"intelligence": {},
	"wisdom":       {},
	"charisma":     {},
}

func validateCharacterSheetIdentity(
	raw json.RawMessage,
	expected characterSheetExpectedValues,
) []string {
	if !containsOnlyExactJSONFields(raw, characterSheetIdentityFields) {
		return []string{"referencePayload.identity contains unsupported fields"}
	}

	var identity characterSheetIdentity
	if !decodeStrictJSONObject(raw, &identity) {
		return []string{"referencePayload.identity must be a valid identity object"}
	}

	var validationErrors []string
	name, nameValid := requiredCharacterSheetString(&validationErrors, identity.Name, "identity.name", 0)
	ancestry, ancestryValid := requiredCharacterSheetString(&validationErrors, identity.Ancestry, "identity.ancestry", 0)
	background, backgroundValid := requiredCharacterSheetString(&validationErrors, identity.Background, "identity.background", 0)
	optionalCharacterSheetString(&validationErrors, identity.Alignment, "identity.alignment", 200)
	optionalCharacterSheetString(&validationErrors, identity.Concept, "identity.concept", 1000)

	if nameValid && name != expected.Name {
		validationErrors = append(validationErrors, "referencePayload.identity.name must match name")
	}
	if ancestryValid && ancestry != expected.Ancestry {
		validationErrors = append(validationErrors, "referencePayload.identity.ancestry must match ancestry")
	}
	if backgroundValid && background != expected.Background {
		validationErrors = append(validationErrors, "referencePayload.identity.background must match background")
	}

	classes, classesValid, classErrors := validateCharacterSheetClasses(identity.Classes)
	validationErrors = append(validationErrors, classErrors...)
	if classesValid {
		levelSum := 0
		matchingClass := false
		matchingSubclass := true
		for _, class := range classes {
			levelSum += class.Level
			if class.Name != expected.ClassName {
				continue
			}
			matchingClass = true
			if expected.SubclassName == nil {
				if class.Subclass != nil {
					matchingSubclass = false
				}
			} else if class.Subclass == nil || *class.Subclass != *expected.SubclassName {
				matchingSubclass = false
			}
		}
		if levelSum != expected.Level {
			validationErrors = append(validationErrors, "referencePayload.identity class levels must sum to level")
		}
		if !matchingClass {
			validationErrors = append(validationErrors, "referencePayload.identity.classes must include className")
		} else if !matchingSubclass {
			validationErrors = append(validationErrors, "referencePayload.identity.classes subclass must match subclassName")
		}
	}

	return validationErrors
}

func validateCharacterSheetClasses(raw json.RawMessage) ([]validatedCharacterClass, bool, []string) {
	if len(raw) == 0 {
		return nil, false, []string{"referencePayload.identity.classes is required"}
	}
	var rawClasses []json.RawMessage
	if err := json.Unmarshal(raw, &rawClasses); err != nil {
		return nil, false, []string{"referencePayload.identity.classes must be a JSON array"}
	}
	if len(rawClasses) < 1 || len(rawClasses) > 4 {
		return nil, false, []string{"referencePayload.identity.classes must contain 1 to 4 entries"}
	}

	classes := make([]validatedCharacterClass, 0, len(rawClasses))
	var validationErrors []string
	allValid := true
	for _, rawClass := range rawClasses {
		class, classErrors := validateCharacterSheetClass(rawClass)
		if len(classErrors) > 0 {
			allValid = false
			validationErrors = append(validationErrors, classErrors...)
		}
		classes = append(classes, class)
	}
	return classes, allValid, validationErrors
}

func validateCharacterSheetClass(raw json.RawMessage) (validatedCharacterClass, []string) {
	if !isJSONObject(raw) || !containsOnlyExactJSONFields(raw, characterSheetClassFields) {
		return validatedCharacterClass{}, []string{"referencePayload.identity.classes contains an invalid class entry"}
	}
	var class characterSheetClass
	if !decodeStrictJSONObject(raw, &class) {
		return validatedCharacterClass{}, []string{"referencePayload.identity.classes contains an invalid class entry"}
	}

	var validationErrors []string
	name, _ := requiredCharacterSheetString(&validationErrors, class.Name, "identity.classes.name", 200)
	level, levelValid := requiredCharacterSheetInteger(&validationErrors, class.Level, "identity.classes.level")
	subclass, _ := optionalCharacterSheetString(&validationErrors, class.Subclass, "identity.classes.subclass", 200)
	if levelValid && (level < 1 || level > 20) {
		validationErrors = append(validationErrors, "referencePayload.identity.classes.level must be between 1 and 20")
		levelValid = false
	}
	return validatedCharacterClass{
		Name:     name,
		Level:    level,
		Subclass: subclass,
	}, validationErrors
}

func validateCharacterSheetAbilities(raw json.RawMessage, expected AbilityScores) []string {
	if !containsOnlyExactJSONFields(raw, characterSheetAbilitiesFields) {
		return []string{"referencePayload.abilities must contain only scores"}
	}
	var abilities characterSheetAbilities
	if !decodeStrictJSONObject(raw, &abilities) {
		return []string{"referencePayload.abilities must be a valid abilities object"}
	}
	if len(abilities.Scores) == 0 {
		return []string{"referencePayload.abilities.scores is required"}
	}
	if !isJSONObject(abilities.Scores) || !containsOnlyExactJSONFields(abilities.Scores, characterSheetAbilityScoreFields) {
		return []string{"referencePayload.abilities.scores contains unsupported fields"}
	}

	var scores characterSheetAbilityScores
	if !decodeStrictJSONObject(abilities.Scores, &scores) {
		return []string{"referencePayload.abilities.scores must be a valid scores object"}
	}

	fields := []struct {
		name     string
		raw      json.RawMessage
		expected int
	}{
		{name: "strength", raw: scores.Strength, expected: expected.Strength},
		{name: "dexterity", raw: scores.Dexterity, expected: expected.Dexterity},
		{name: "constitution", raw: scores.Constitution, expected: expected.Constitution},
		{name: "intelligence", raw: scores.Intelligence, expected: expected.Intelligence},
		{name: "wisdom", raw: scores.Wisdom, expected: expected.Wisdom},
		{name: "charisma", raw: scores.Charisma, expected: expected.Charisma},
	}

	var validationErrors []string
	for _, field := range fields {
		value, valid := requiredCharacterSheetInteger(
			&validationErrors,
			field.raw,
			"abilities.scores."+field.name,
		)
		if !valid {
			continue
		}
		if value < 1 || value > 30 {
			validationErrors = append(validationErrors, "referencePayload.abilities.scores."+field.name+" must be between 1 and 30")
			continue
		}
		if value != field.expected {
			validationErrors = append(validationErrors, "referencePayload.abilities.scores."+field.name+" must match abilityScores."+field.name)
		}
	}
	return validationErrors
}

func requiredCharacterSheetString(
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
	if err := json.Unmarshal(raw, &value); err != nil || strings.TrimSpace(value) == "" {
		*validationErrors = append(*validationErrors, "referencePayload."+field+" must be a nonempty string")
		return "", false
	}
	if maxRunes > 0 && utf8.RuneCountInString(value) > maxRunes {
		*validationErrors = append(*validationErrors, "referencePayload."+field+" is too long")
		return "", false
	}
	return value, true
}

func optionalCharacterSheetString(
	validationErrors *[]string,
	raw json.RawMessage,
	field string,
	maxRunes int,
) (*string, bool) {
	if len(raw) == 0 {
		return nil, true
	}
	value, valid := requiredCharacterSheetString(validationErrors, raw, field, maxRunes)
	if !valid {
		return nil, false
	}
	return &value, true
}

func requiredCharacterSheetInteger(
	validationErrors *[]string,
	raw json.RawMessage,
	field string,
) (int, bool) {
	if len(raw) == 0 {
		*validationErrors = append(*validationErrors, "referencePayload."+field+" is required")
		return 0, false
	}
	var value int
	if err := json.Unmarshal(raw, &value); err != nil {
		*validationErrors = append(*validationErrors, "referencePayload."+field+" must be an integer")
		return 0, false
	}
	return value, true
}

func decodeStrictJSONObject(raw json.RawMessage, destination any) bool {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		return false
	}
	return decoder.Decode(&struct{}{}) == io.EOF
}
