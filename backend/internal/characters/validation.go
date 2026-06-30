package characters

import (
	"bytes"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

func characterFromRequest(request createCharacterRequest, now time.Time) (Character, error) {
	var validationErrors []string

	name := strings.TrimSpace(request.Name)
	className := strings.TrimSpace(request.ClassName)
	ancestry := strings.TrimSpace(request.Ancestry)
	background := strings.TrimSpace(request.Background)
	subclassName := trimmedOptionalString(request.SubclassName)

	if name == "" {
		validationErrors = append(validationErrors, "name is required")
	}
	if className == "" {
		validationErrors = append(validationErrors, "className is required")
	}
	if ancestry == "" {
		validationErrors = append(validationErrors, "ancestry is required")
	}
	if background == "" {
		validationErrors = append(validationErrors, "background is required")
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
		}
	}

	speedFt := 0
	if request.SpeedFt == nil {
		validationErrors = append(validationErrors, "speedFt is required")
	} else {
		speedFt = *request.SpeedFt
		if speedFt < 0 {
			validationErrors = append(validationErrors, "speedFt must be non-negative")
		}
	}

	referencePayload := json.RawMessage(nil)
	if request.ReferencePayload == nil {
		validationErrors = append(validationErrors, "referencePayload is required")
	} else if !isJSONObject(*request.ReferencePayload) {
		validationErrors = append(validationErrors, "referencePayload must be a JSON object")
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
		}
	}

	if request.Max == nil {
		validationErrors = append(validationErrors, "hitPoints.max is required")
	} else {
		hitPoints.Max = *request.Max
		if hitPoints.Max < 0 {
			validationErrors = append(validationErrors, "hitPoints.max must be non-negative")
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
