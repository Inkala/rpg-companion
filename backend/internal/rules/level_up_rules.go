package rules

import (
	"encoding/json"
	"strings"
	"sync"
)

type Dataset struct {
	Metadata struct {
		SnapshotID string `json:"snapshotId"`
	} `json:"metadata"`
	SupportedTransitions []Transition `json:"supportedTransitions"`
	Classes              []Class      `json:"classes"`
	Spells               []Spell      `json:"spells"`
}

type Transition struct {
	From int `json:"from"`
	To   int `json:"to"`
}

type Class struct {
	Index                 string     `json:"index"`
	Name                  string     `json:"name"`
	HitDie                int        `json:"hitDie"`
	FixedAverageHP        int        `json:"fixedAverageHp"`
	SpellcastingAbility   *string    `json:"spellcastingAbility"`
	SubclassDecisionLevel int        `json:"subclassDecisionLevel"`
	Subclasses            []Subclass `json:"subclasses"`
	Choices               []Choice   `json:"choices"`
	Levels                []Level    `json:"levels"`
}

type Subclass struct {
	Index           string         `json:"index"`
	Name            string         `json:"name"`
	Flavor          string         `json:"flavor"`
	FeaturesByLevel []FeatureLevel `json:"featuresByLevel"`
}

type FeatureLevel struct {
	Level    int       `json:"level"`
	Features []Feature `json:"features"`
}

type Feature struct {
	Index   string `json:"index"`
	Name    string `json:"name"`
	Summary string `json:"summary"`
}

type Choice struct {
	ID                    string         `json:"id"`
	FromLevel             int            `json:"fromLevel"`
	SelectionCountByLevel map[string]int `json:"selectionCountByLevel"`
	OptionSource          string         `json:"optionSource"`
	BoundedRule           string         `json:"boundedRule"`
	RequiredSubclassIndex string         `json:"requiredSubclassIndex"`
	SourceFeatureIndex    string         `json:"sourceFeatureIndex"`
	Options               []ChoiceOption `json:"options"`
	AllowManual           bool           `json:"allowManual"`
}

type ChoiceOption struct {
	Index                  string   `json:"index"`
	Name                   string   `json:"name"`
	MinimumLevel           int      `json:"minimumLevel"`
	RequiredFeatureIndexes []string `json:"requiredFeatureIndexes"`
}

type Level struct {
	Level                   int           `json:"level"`
	ProficiencyBonus        int           `json:"proficiencyBonus"`
	AbilityScoreImprovement bool          `json:"abilityScoreImprovement"`
	Features                []Feature     `json:"features"`
	Spellcasting            *Spellcasting `json:"spellcasting"`
}

type Spellcasting struct {
	Mode                     string  `json:"mode"`
	Ability                  string  `json:"ability"`
	CantripsKnown            *int    `json:"cantripsKnown"`
	SpellsKnown              *int    `json:"spellsKnown"`
	PreparedFormula          *string `json:"preparedFormula"`
	ReplacementLimit         int     `json:"replacementLimit"`
	InitialSpellbookSpells   int     `json:"initialSpellbookSpells"`
	WizardSpellbookAdditions int     `json:"wizardSpellbookAdditions"`
	Slots                    []int   `json:"slots"`
	PactSlots                int     `json:"pactSlots"`
	PactSlotLevel            int     `json:"pactSlotLevel"`
	AvailableSpellLevels     []int   `json:"availableSpellLevels"`
}

type Spell struct {
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
	Summary             string               `json:"summary"`
	ClassIndexes        []string             `json:"classIndexes"`
	SubclassMemberships []SubclassMembership `json:"subclassMemberships"`
}

type SubclassMembership struct {
	SubclassIndex          string   `json:"subclassIndex"`
	ClassIndex             string   `json:"classIndex"`
	ClassLevel             int      `json:"classLevel"`
	Kind                   string   `json:"kind"`
	RequiredFeatureIndexes []string `json:"requiredFeatureIndexes"`
}

var (
	loadOnce sync.Once
	loaded   Dataset
	loadErr  error
)

func Load() (Dataset, error) {
	loadOnce.Do(func() {
		loadErr = json.Unmarshal([]byte(CanonicalJSON), &loaded)
	})
	return loaded, loadErr
}

func FindClass(name string) (Class, bool) {
	dataset, err := Load()
	if err != nil {
		return Class{}, false
	}
	for _, class := range dataset.Classes {
		if strings.EqualFold(class.Name, strings.TrimSpace(name)) || class.Index == strings.ToLower(strings.TrimSpace(name)) {
			return class, true
		}
	}
	return Class{}, false
}

func FindSpell(index string) (Spell, bool) {
	dataset, err := Load()
	if err != nil {
		return Spell{}, false
	}
	for _, spell := range dataset.Spells {
		if spell.Index == index {
			return spell, true
		}
	}
	return Spell{}, false
}

func SupportsTransition(from, to int) bool {
	dataset, err := Load()
	if err != nil {
		return false
	}
	for _, transition := range dataset.SupportedTransitions {
		if transition.From == from && transition.To == to {
			return true
		}
	}
	return false
}

func Snapshot() string {
	return SnapshotID
}
