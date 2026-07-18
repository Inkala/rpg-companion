package characters

import (
	"bytes"
	"encoding/json"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
)

const (
	maxCharacterNameRunes    = 80
	maxCharacterCoreRunes    = 64
	maxAbilityScore          = 30
	maxHitPoints             = 9999
	maxArmorClass            = 100
	maxSpeedFt               = 1000
	maxReferencePayloadBytes = 65536
)

var errInvalidStoredCharacter = errors.New("stored character is invalid")

func validateStoredCharacterForPartyGM(character Character) error {
	if len(character.ReferencePayload) == 0 || len(character.ReferencePayload) > maxReferencePayloadBytes {
		return errInvalidStoredCharacter
	}
	if !isJSONObject(character.ReferencePayload) {
		return errInvalidStoredCharacter
	}

	validationErrors := validateCharacterSheetV1Envelope(
		character.ReferencePayload,
		characterSheetExpectedValues{
			Name:          character.Name,
			Ancestry:      character.Ancestry,
			Background:    character.Background,
			ClassName:     character.ClassName,
			SubclassName:  character.SubclassName,
			Level:         character.Level,
			AbilityScores: character.AbilityScores,
			HitPoints:     character.HitPoints,
			ArmorClass:    character.ArmorClass,
			SpeedFt:       character.SpeedFt,
		},
	)
	if len(validationErrors) > 0 {
		return errInvalidStoredCharacter
	}

	return nil
}

func characterFromRequest(request createCharacterRequest, now time.Time) (Character, error) {
	now = now.UTC().Truncate(time.Microsecond)
	var validationErrors []string

	name := strings.TrimSpace(request.Name)
	className := strings.TrimSpace(request.ClassName)
	ancestry := strings.TrimSpace(request.Ancestry)
	background := strings.TrimSpace(request.Background)
	subclassName := trimmedOptionalString(request.SubclassName)

	if name == "" {
		validationErrors = append(validationErrors, "name is required")
	} else if utf8.RuneCountInString(name) > maxCharacterNameRunes {
		validationErrors = append(validationErrors, "name must be at most 80 characters")
	}
	if className == "" {
		validationErrors = append(validationErrors, "className is required")
	} else if utf8.RuneCountInString(className) > maxCharacterCoreRunes {
		validationErrors = append(validationErrors, "className must be at most 64 characters")
	}
	if ancestry == "" {
		validationErrors = append(validationErrors, "ancestry is required")
	} else if utf8.RuneCountInString(ancestry) > maxCharacterCoreRunes {
		validationErrors = append(validationErrors, "ancestry must be at most 64 characters")
	}
	if background == "" {
		validationErrors = append(validationErrors, "background is required")
	} else if utf8.RuneCountInString(background) > maxCharacterCoreRunes {
		validationErrors = append(validationErrors, "background must be at most 64 characters")
	}
	if subclassName != nil && utf8.RuneCountInString(*subclassName) > maxCharacterCoreRunes {
		validationErrors = append(validationErrors, "subclassName must be at most 64 characters")
	}
	if request.Level < 1 || request.Level > 20 {
		validationErrors = append(validationErrors, "level must be between 1 and 20")
	}

	abilityScores, abilityErrors := validateAbilityScores(request.AbilityScores)
	validationErrors = append(validationErrors, abilityErrors...)

	hitPoints, hitPointErrors := validateHitPoints(request.HitPoints)
	validationErrors = append(validationErrors, hitPointErrors...)

	armorClass := 0
	if request.ArmorClass == nil {
		validationErrors = append(validationErrors, "armorClass is required")
	} else {
		armorClass = *request.ArmorClass
		if armorClass < 0 {
			validationErrors = append(validationErrors, "armorClass must be non-negative")
		} else if armorClass > maxArmorClass {
			validationErrors = append(validationErrors, "armorClass must be at most 100")
		}
	}

	speedFt := 0
	if request.SpeedFt == nil {
		validationErrors = append(validationErrors, "speedFt is required")
	} else {
		speedFt = *request.SpeedFt
		if speedFt < 0 {
			validationErrors = append(validationErrors, "speedFt must be non-negative")
		} else if speedFt > maxSpeedFt {
			validationErrors = append(validationErrors, "speedFt must be at most 1000")
		}
	}

	referencePayload := json.RawMessage(nil)
	if request.ReferencePayload == nil {
		validationErrors = append(validationErrors, "referencePayload is required")
	} else if !isJSONObject(*request.ReferencePayload) {
		validationErrors = append(validationErrors, "referencePayload must be a JSON object")
	} else if len(*request.ReferencePayload) > maxReferencePayloadBytes {
		validationErrors = append(validationErrors, "referencePayload must be at most 65536 bytes")
	} else if envelopeErrors := validateCharacterSheetV1Envelope(*request.ReferencePayload, characterSheetExpectedValues{
		Name:          name,
		Ancestry:      ancestry,
		Background:    background,
		ClassName:     className,
		SubclassName:  subclassName,
		Level:         request.Level,
		AbilityScores: abilityScores,
		HitPoints:     hitPoints,
		ArmorClass:    armorClass,
		SpeedFt:       speedFt,
	}); len(envelopeErrors) > 0 {
		validationErrors = append(validationErrors, envelopeErrors...)
	} else {
		referencePayload = append(json.RawMessage(nil), (*request.ReferencePayload)...)
	}

	if len(validationErrors) > 0 {
		return Character{}, validationError{Messages: validationErrors}
	}

	return Character{
		ID:               uuid.New(),
		Name:             name,
		ClassName:        className,
		SubclassName:     subclassName,
		Level:            request.Level,
		Ancestry:         ancestry,
		Background:       background,
		AbilityScores:    abilityScores,
		HitPoints:        hitPoints,
		ArmorClass:       armorClass,
		SpeedFt:          speedFt,
		ReferencePayload: referencePayload,
		CreatedAt:        now,
		UpdatedAt:        now,
	}, nil
}

type validationError struct {
	Messages []string
}

func (err validationError) Error() string {
	return strings.Join(err.Messages, "; ")
}

func isValidationError(err error) (validationError, bool) {
	var validationErr validationError
	if errors.As(err, &validationErr) {
		return validationErr, true
	}
	return validationError{}, false
}

func validateAbilityScores(request requiredAbilityScores) (AbilityScores, []string) {
	var validationErrors []string
	scores := AbilityScores{}

	validateScore := func(name string, value *int, assign func(int)) {
		if value == nil {
			validationErrors = append(validationErrors, name+" is required")
			return
		}
		assign(*value)
		if *value < 1 || *value > maxAbilityScore {
			validationErrors = append(validationErrors, name+" must be between 1 and 30")
		}
	}

	validateScore("abilityScores.strength", request.Strength, func(value int) { scores.Strength = value })
	validateScore("abilityScores.dexterity", request.Dexterity, func(value int) { scores.Dexterity = value })
	validateScore("abilityScores.constitution", request.Constitution, func(value int) { scores.Constitution = value })
	validateScore("abilityScores.intelligence", request.Intelligence, func(value int) { scores.Intelligence = value })
	validateScore("abilityScores.wisdom", request.Wisdom, func(value int) { scores.Wisdom = value })
	validateScore("abilityScores.charisma", request.Charisma, func(value int) { scores.Charisma = value })

	return scores, validationErrors
}

func validateHitPoints(request requiredHitPoints) (HitPoints, []string) {
	var validationErrors []string
	hitPoints := HitPoints{}

	if request.Current == nil {
		validationErrors = append(validationErrors, "hitPoints.current is required")
	} else {
		hitPoints.Current = *request.Current
		if hitPoints.Current < 0 {
			validationErrors = append(validationErrors, "hitPoints.current must be non-negative")
		} else if hitPoints.Current > maxHitPoints {
			validationErrors = append(validationErrors, "hitPoints.current must be at most 9999")
		}
	}

	if request.Max == nil {
		validationErrors = append(validationErrors, "hitPoints.max is required")
	} else {
		hitPoints.Max = *request.Max
		if hitPoints.Max < 0 {
			validationErrors = append(validationErrors, "hitPoints.max must be non-negative")
		} else if hitPoints.Max > maxHitPoints {
			validationErrors = append(validationErrors, "hitPoints.max must be at most 9999")
		}
	}

	if request.Current != nil && request.Max != nil && hitPoints.Current > hitPoints.Max {
		validationErrors = append(validationErrors, "hitPoints.current must be less than or equal to hitPoints.max")
	}

	return hitPoints, validationErrors
}

func trimmedOptionalString(value *string) *string {
	if value == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func isJSONObject(raw json.RawMessage) bool {
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || trimmed[0] != '{' {
		return false
	}

	var value map[string]any
	return json.Unmarshal(trimmed, &value) == nil
}
