package characters

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/Inkala/rpg-companion/backend/internal/rules"
	"github.com/google/uuid"
)

func characterFromV2Request(request CreateCharacterV2RequestDTO, now time.Time) (Character, error) {
	sheet, err := BuildCharacterSheetV2(request)
	if err != nil {
		return Character{}, fmt.Errorf("%w: build CharacterSheetV2: %w", ErrInvalidCharacterData, err)
	}
	if validationErrors := ValidateCharacterSheetV2(sheet); len(validationErrors) > 0 {
		return Character{}, fmt.Errorf("%w: validate CharacterSheetV2", ErrInvalidCharacterData)
	}
	className, subclassName, raceName, err := resolvedV2IdentityNames(sheet.Identity)
	if err != nil {
		return Character{}, fmt.Errorf("%w: resolve CharacterSheetV2 identity: %w", ErrInvalidCharacterData, err)
	}
	payload, err := json.Marshal(sheet)
	if err != nil {
		return Character{}, fmt.Errorf("marshal CharacterSheetV2: %w", err)
	}
	if len(payload) > maxV2StoredReferencePayloadBytes {
		return Character{}, fmt.Errorf("%w: CharacterSheetV2 exceeds persisted payload limit", ErrInvalidCharacterData)
	}

	now = now.UTC().Truncate(time.Microsecond)
	maximumHP := sheet.HitPointProgression.Maximum.Value
	return Character{
		ID:               uuid.New(),
		Name:             sheet.Identity.Name,
		ClassName:        className,
		SubclassName:     subclassName,
		Level:            sheet.Identity.Level,
		Ancestry:         raceName,
		Background:       sheet.Identity.Background,
		AbilityScores:    persistedAbilityScores(sheet),
		HitPoints:        HitPoints{Current: maximumHP, Max: maximumHP},
		ArmorClass:       sheet.Combat.ArmorClass.Value,
		SpeedFt:          sheet.Combat.SpeedFt.Value,
		ReferencePayload: append(json.RawMessage(nil), payload...),
		CreatedAt:        now,
		UpdatedAt:        now,
	}, nil
}

func parseStoredCharacter(character Character) (ParsedCharacterSheetDocument, error) {
	if len(character.ReferencePayload) == 0 || len(character.ReferencePayload) > maxV2StoredReferencePayloadBytes {
		return ParsedCharacterSheetDocument{}, errInvalidStoredCharacter
	}
	parsed, err := ParseCharacterSheetDocument(character.ReferencePayload)
	if err != nil {
		return ParsedCharacterSheetDocument{}, errInvalidStoredCharacter
	}
	if parsed.V2 == nil {
		validationErrors := validateCharacterSheetV1Envelope(
			character.ReferencePayload,
			characterSheetExpectedValues{
				Name: character.Name, Ancestry: character.Ancestry, Background: character.Background,
				ClassName: character.ClassName, SubclassName: character.SubclassName, Level: character.Level,
				AbilityScores: character.AbilityScores, HitPoints: character.HitPoints,
				ArmorClass: character.ArmorClass, SpeedFt: character.SpeedFt,
			},
		)
		if len(validationErrors) > 0 {
			return ParsedCharacterSheetDocument{}, errInvalidStoredCharacter
		}
		return parsed, nil
	}
	if err := validateStoredV2Parity(character, *parsed.V2); err != nil {
		return ParsedCharacterSheetDocument{}, errInvalidStoredCharacter
	}
	return parsed, nil
}

func validateStoredV2Parity(character Character, sheet CharacterSheetV2) error {
	className, subclassName, raceName, err := resolvedV2IdentityNames(sheet.Identity)
	if err != nil {
		return err
	}
	maximumHP := sheet.HitPointProgression.Maximum.Value
	if character.Name != sheet.Identity.Name || character.ClassName != className || !sameOptionalString(character.SubclassName, subclassName) ||
		character.Level != sheet.Identity.Level || character.Ancestry != raceName || character.Background != sheet.Identity.Background ||
		character.AbilityScores != persistedAbilityScores(sheet) || character.HitPoints.Max != maximumHP || character.HitPoints.Current != maximumHP ||
		character.ArmorClass != sheet.Combat.ArmorClass.Value || character.SpeedFt != sheet.Combat.SpeedFt.Value {
		return errInvalidStoredCharacter
	}
	return nil
}

func characterV2DTOFromStored(character Character, sheet CharacterSheetV2) (CharacterV2DTO, error) {
	if err := validateStoredV2Parity(character, sheet); err != nil {
		return CharacterV2DTO{}, err
	}
	return CharacterV2DTO{
		ID: character.ID.String(), SchemaVersion: "CharacterSheetV2", Name: character.Name,
		Gender: sheet.Identity.Gender, ClassName: character.ClassName, SubclassName: character.SubclassName,
		Level: character.Level, Race: character.Ancestry, Background: character.Background,
		AbilityScores: AbilityScoresDTO{
			Strength: character.AbilityScores.Strength, Dexterity: character.AbilityScores.Dexterity,
			Constitution: character.AbilityScores.Constitution, Intelligence: character.AbilityScores.Intelligence,
			Wisdom: character.AbilityScores.Wisdom, Charisma: character.AbilityScores.Charisma,
		},
		HitPoints: character.HitPoints, ArmorClass: character.ArmorClass, SpeedFt: character.SpeedFt,
		ReferencePayload: sheet, CreatedAt: character.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt: character.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}, nil
}

func persistedAbilityScores(sheet CharacterSheetV2) AbilityScores {
	return AbilityScores{
		Strength: sheet.AbilityScores.Scores.Strength.Value, Dexterity: sheet.AbilityScores.Scores.Dexterity.Value,
		Constitution: sheet.AbilityScores.Scores.Constitution.Value, Intelligence: sheet.AbilityScores.Scores.Intelligence.Value,
		Wisdom: sheet.AbilityScores.Scores.Wisdom.Value, Charisma: sheet.AbilityScores.Scores.Charisma.Value,
	}
}

func resolvedV2IdentityNames(identity CharacterIdentityV2Input) (string, *string, string, error) {
	levelRules, err := rules.Load()
	if err != nil {
		return "", nil, "", err
	}
	creationRules, err := rules.LoadCharacterCreation()
	if err != nil {
		return "", nil, "", err
	}

	className := identity.Class.Name
	var selectedClass rules.Class
	if identity.Class.Source == "srd" {
		var ok bool
		selectedClass, ok = findClass(levelRules.Classes, identity.Class.Index)
		if !ok {
			return "", nil, "", errors.New("canonical Class is unavailable")
		}
		className = selectedClass.Name
	}

	var subclassName *string
	if identity.Subclass != nil {
		name := identity.Subclass.Name
		if identity.Subclass.Source == "srd" {
			found := false
			for _, subclass := range selectedClass.Subclasses {
				if subclass.Index == identity.Subclass.Index {
					name = subclass.Name
					found = true
					break
				}
			}
			if !found {
				return "", nil, "", errors.New("canonical subclass is unavailable")
			}
		}
		subclassName = &name
	}

	raceName := identity.Race.Name
	if identity.Race.Source == "srd" {
		raceIndex, subraceIndex := canonicalRaceAndSubrace(identity.Race)
		if subraceIndex != "" {
			subrace, ok := findSubrace(creationRules.Subraces, subraceIndex)
			if !ok {
				return "", nil, "", errors.New("canonical subrace is unavailable")
			}
			raceName = subrace.Name
		} else {
			race, ok := creationRules.FindRace(raceIndex)
			if !ok {
				return "", nil, "", errors.New("canonical Race is unavailable")
			}
			raceName = race.Name
		}
	}
	return className, subclassName, raceName, nil
}

func sameOptionalString(left, right *string) bool {
	if left == nil || right == nil {
		return left == nil && right == nil
	}
	return *left == *right
}
