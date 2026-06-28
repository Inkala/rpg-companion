package characters

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Character struct {
	ID               uuid.UUID
	OwnerSubjectID   *uuid.UUID
	Name             string
	ClassName        string
	SubclassName     *string
	Level            int
	Ancestry         string
	Background       string
	AbilityScores    AbilityScores
	HitPoints        HitPoints
	ArmorClass       int
	SpeedFt          int
	ReferencePayload json.RawMessage
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type AbilityScores struct {
	Strength     int `json:"strength"`
	Dexterity    int `json:"dexterity"`
	Constitution int `json:"constitution"`
	Intelligence int `json:"intelligence"`
	Wisdom       int `json:"wisdom"`
	Charisma     int `json:"charisma"`
}

type HitPoints struct {
	Current int `json:"current"`
	Max     int `json:"max"`
}

type createCharacterRequest struct {
	OwnerSubjectID   *string               `json:"ownerSubjectId"`
	Name             string                `json:"name"`
	ClassName        string                `json:"className"`
	SubclassName     *string               `json:"subclassName"`
	Level            int                   `json:"level"`
	Ancestry         string                `json:"ancestry"`
	Background       string                `json:"background"`
	AbilityScores    requiredAbilityScores `json:"abilityScores"`
	HitPoints        requiredHitPoints     `json:"hitPoints"`
	ArmorClass       *int                  `json:"armorClass"`
	SpeedFt          *int                  `json:"speedFt"`
	ReferencePayload *json.RawMessage      `json:"referencePayload"`
}

type requiredAbilityScores struct {
	Strength     *int `json:"strength"`
	Dexterity    *int `json:"dexterity"`
	Constitution *int `json:"constitution"`
	Intelligence *int `json:"intelligence"`
	Wisdom       *int `json:"wisdom"`
	Charisma     *int `json:"charisma"`
}

type requiredHitPoints struct {
	Current *int `json:"current"`
	Max     *int `json:"max"`
}

type characterResponse struct {
	ID               string          `json:"id"`
	OwnerSubjectID   *string         `json:"ownerSubjectId"`
	Name             string          `json:"name"`
	ClassName        string          `json:"className"`
	SubclassName     *string         `json:"subclassName"`
	Level            int             `json:"level"`
	Ancestry         string          `json:"ancestry"`
	Background       string          `json:"background"`
	AbilityScores    AbilityScores   `json:"abilityScores"`
	HitPoints        HitPoints       `json:"hitPoints"`
	ArmorClass       int             `json:"armorClass"`
	SpeedFt          int             `json:"speedFt"`
	ReferencePayload json.RawMessage `json:"referencePayload"`
	CreatedAt        string          `json:"createdAt"`
	UpdatedAt        string          `json:"updatedAt"`
}

func responseFromCharacter(character Character) characterResponse {
	var ownerSubjectID *string
	if character.OwnerSubjectID != nil {
		value := character.OwnerSubjectID.String()
		ownerSubjectID = &value
	}

	return characterResponse{
		ID:               character.ID.String(),
		OwnerSubjectID:   ownerSubjectID,
		Name:             character.Name,
		ClassName:        character.ClassName,
		SubclassName:     character.SubclassName,
		Level:            character.Level,
		Ancestry:         character.Ancestry,
		Background:       character.Background,
		AbilityScores:    character.AbilityScores,
		HitPoints:        character.HitPoints,
		ArmorClass:       character.ArmorClass,
		SpeedFt:          character.SpeedFt,
		ReferencePayload: character.ReferencePayload,
		CreatedAt:        character.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:        character.UpdatedAt.UTC().Format(time.RFC3339),
	}
}
