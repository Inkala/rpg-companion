package rules

import (
	"encoding/json"
	"sync"
)

type CharacterCreationDataset struct {
	Metadata            CharacterCreationMetadata `json:"metadata"`
	Races               []RaceRule                `json:"races"`
	Subraces            []SubraceRule             `json:"subraces"`
	RaceTraits          []RaceTraitRule           `json:"raceTraits"`
	RaceChoices         []RaceChoiceRule          `json:"raceChoices"`
	ClassChoices        []CharacterCreationChoice `json:"classChoices"`
	EquipmentCategories []EquipmentCategoryRule   `json:"equipmentCategories"`
	Equipment           []EquipmentRule           `json:"equipment"`
	Spells              []SpellDetail             `json:"spells"`
	CalculationRules    []CalculationRule         `json:"calculationRules"`
	FeatureModifiers    []FeatureModifier         `json:"featureModifiers"`
}

type CharacterCreationChoice struct {
	ClassIndex string `json:"classIndex"`
	Choice
}

type CharacterCreationMetadata struct {
	SnapshotID     string   `json:"snapshotId"`
	SchemaVersion  int      `json:"schemaVersion"`
	Ruleset        string   `json:"ruleset"`
	ImportedAt     string   `json:"importedAt"`
	License        string   `json:"license"`
	Attribution    string   `json:"attribution"`
	Sources        []string `json:"sources"`
	Transformation string   `json:"transformation"`
}

type AbilityBonusRule struct {
	Ability string `json:"ability"`
	Bonus   int    `json:"bonus"`
}

type RaceRule struct {
	Index                         string             `json:"index"`
	Name                          string             `json:"name"`
	SpeedFt                       int                `json:"speedFt"`
	IgnoresHeavyArmorSpeedPenalty bool               `json:"ignoresHeavyArmorSpeedPenalty"`
	AbilityBonuses                []AbilityBonusRule `json:"abilityBonuses"`
	LanguageIndexes               []string           `json:"languageIndexes"`
	TraitIndexes                  []string           `json:"traitIndexes"`
	SubraceIndexes                []string           `json:"subraceIndexes"`
	SourceURL                     string             `json:"sourceUrl"`
}

type SubraceRule struct {
	Index          string             `json:"index"`
	Name           string             `json:"name"`
	RaceIndex      string             `json:"raceIndex"`
	Description    string             `json:"description"`
	AbilityBonuses []AbilityBonusRule `json:"abilityBonuses"`
	TraitIndexes   []string           `json:"traitIndexes"`
	SourceURL      string             `json:"sourceUrl"`
}

type RaceTraitRule struct {
	Index              string   `json:"index"`
	Name               string   `json:"name"`
	Description        string   `json:"description"`
	RaceIndexes        []string `json:"raceIndexes"`
	SubraceIndexes     []string `json:"subraceIndexes"`
	ProficiencyIndexes []string `json:"proficiencyIndexes"`
	OptionIndexes      []string `json:"optionIndexes"`
	SourceURL          string   `json:"sourceUrl"`
}

type RaceChoiceRule struct {
	ID                    string   `json:"id"`
	SourceOwnerType       string   `json:"sourceOwnerType"`
	SourceOwnerIndex      string   `json:"sourceOwnerIndex"`
	SelectionCount        int      `json:"selectionCount"`
	OptionType            string   `json:"optionType"`
	AllowedOptionIndexes  []string `json:"allowedOptionIndexes"`
	BoundedRule           *string  `json:"boundedRule"`
	OptionValue           *int     `json:"optionValue"`
	ExclusivityConstraint *string  `json:"exclusivityConstraint"`
}

type EquipmentCategoryRule struct {
	Index            string   `json:"index"`
	Name             string   `json:"name"`
	EquipmentIndexes []string `json:"equipmentIndexes"`
}

type CostRule struct {
	Quantity float64 `json:"quantity"`
	Unit     string  `json:"unit"`
}

type QuantityUnitRule struct {
	Quantity float64 `json:"quantity"`
	Unit     string  `json:"unit"`
}

type EquipmentContentRule struct {
	Index    string `json:"index"`
	Quantity int    `json:"quantity"`
}

type EquipmentSubtypeRule struct {
	Index string `json:"index"`
	Name  string `json:"name"`
}

type DamageRule struct {
	Dice string `json:"dice"`
	Type string `json:"type"`
}

type DistanceRangeRule struct {
	Normal *int `json:"normal"`
	Long   *int `json:"long"`
}

type WeaponRule struct {
	Category        string            `json:"category"`
	RangeType       string            `json:"rangeType"`
	CategoryRange   string            `json:"categoryRange"`
	Damage          *DamageRule       `json:"damage"`
	TwoHandedDamage *DamageRule       `json:"twoHandedDamage"`
	Range           DistanceRangeRule `json:"range"`
	ThrowRange      DistanceRangeRule `json:"throwRange"`
	PropertyIndexes []string          `json:"propertyIndexes"`
}

type ArmorRule struct {
	Category              string `json:"category"`
	BaseArmorClass        int    `json:"baseArmorClass"`
	DexterityBonus        bool   `json:"dexterityBonus"`
	MaximumDexterityBonus *int   `json:"maximumDexterityBonus"`
	StrengthMinimum       int    `json:"strengthMinimum"`
	StealthDisadvantage   bool   `json:"stealthDisadvantage"`
	ShieldBonus           int    `json:"shieldBonus"`
}

type VehicleRule struct {
	CategoryIndex string            `json:"categoryIndex"`
	Category      string            `json:"category"`
	Speed         *QuantityUnitRule `json:"speed"`
	Capacity      *string           `json:"capacity"`
}

type EquipmentRule struct {
	Index         string                 `json:"index"`
	Name          string                 `json:"name"`
	CategoryIndex string                 `json:"categoryIndex"`
	Cost          CostRule               `json:"cost"`
	Weight        *float64               `json:"weight"`
	Quantity      *int                   `json:"quantity"`
	Description   []string               `json:"description"`
	Special       []string               `json:"special"`
	Contents      []EquipmentContentRule `json:"contents"`
	Gear          *EquipmentSubtypeRule  `json:"gear"`
	Tool          *EquipmentSubtypeRule  `json:"tool"`
	Vehicle       *VehicleRule           `json:"vehicle"`
	Weapon        *WeaponRule            `json:"weapon"`
	Armor         *ArmorRule             `json:"armor"`
	SourceURL     string                 `json:"sourceUrl"`
}

type SpellDetail struct {
	Index               string               `json:"index"`
	Name                string               `json:"name"`
	Level               int                  `json:"level"`
	School              string               `json:"school"`
	CastingTime         string               `json:"castingTime"`
	ActionType          string               `json:"actionType"`
	Range               string               `json:"range"`
	Duration            string               `json:"duration"`
	Concentration       bool                 `json:"concentration"`
	Ritual              bool                 `json:"ritual"`
	Components          []string             `json:"components"`
	Material            *string              `json:"material"`
	Description         string               `json:"description"`
	HigherLevel         *string              `json:"higherLevel"`
	Summary             string               `json:"summary"`
	ClassIndexes        []string             `json:"classIndexes"`
	SubclassMemberships []SubclassMembership `json:"subclassMemberships"`
	SourceURL           string               `json:"sourceUrl"`
}

type CalculationRule struct {
	ID          string `json:"id"`
	Description string `json:"description"`
}

type FeatureModifier struct {
	ID          string   `json:"id"`
	SourceIndex string   `json:"sourceIndex"`
	Kind        string   `json:"kind"`
	Value       *int     `json:"value"`
	Formula     *string  `json:"formula"`
	Conditions  []string `json:"conditions"`
}

var (
	loadCharacterCreationOnce sync.Once
	loadedCharacterCreation   CharacterCreationDataset
	loadCharacterCreationErr  error
)

func LoadCharacterCreation() (CharacterCreationDataset, error) {
	loadCharacterCreationOnce.Do(func() {
		loadCharacterCreationErr = json.Unmarshal([]byte(CharacterCreationJSON), &loadedCharacterCreation)
	})
	return loadedCharacterCreation, loadCharacterCreationErr
}

func (dataset CharacterCreationDataset) FindRace(index string) (RaceRule, bool) {
	for _, race := range dataset.Races {
		if race.Index == index {
			return race, true
		}
	}
	return RaceRule{}, false
}

func (dataset CharacterCreationDataset) FindEquipment(index string) (EquipmentRule, bool) {
	for _, equipment := range dataset.Equipment {
		if equipment.Index == index {
			return equipment, true
		}
	}
	return EquipmentRule{}, false
}

func (dataset CharacterCreationDataset) FindSpellDetail(index string) (SpellDetail, bool) {
	for _, spell := range dataset.Spells {
		if spell.Index == index {
			return spell, true
		}
	}
	return SpellDetail{}, false
}

// EquipmentAffectsDerivedStatistics accepts canonical SRD armor only. Manual entries are display
// data and never acquire calculation behavior by matching a canonical name or stable ID.
func EquipmentAffectsDerivedStatistics(source, index string) bool {
	if source != "srd" {
		return false
	}
	dataset, err := LoadCharacterCreation()
	if err != nil {
		return false
	}
	equipment, ok := dataset.FindEquipment(index)
	return ok && equipment.Armor != nil
}
