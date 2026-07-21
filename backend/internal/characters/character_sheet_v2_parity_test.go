package characters

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"reflect"
	"testing"

	"github.com/Inkala/rpg-companion/backend/internal/rules"
)

type characterV2ParityFixture struct {
	SnapshotID string `json:"snapshotId"`
	Coverage   struct {
		ClassIndexes       []string `json:"classIndexes"`
		Levels             []int    `json:"levels"`
		RaceIndexes        []string `json:"raceIndexes"`
		SubraceIndexes     []string `json:"subraceIndexes"`
		AbilityModes       []string `json:"abilityModes"`
		DefenseVariants    []string `json:"defenseVariants"`
		CasterTypes        []string `json:"casterTypes"`
		FeatureModifierIDs []string `json:"featureModifierIds"`
	} `json:"coverage"`
	Cases []struct {
		Input    CharacterCalculationInput  `json:"input"`
		Expected CharacterCalculationOutput `json:"expected"`
	} `json:"cases"`
	ContractCase struct {
		Input            CreateCharacterV2RequestDTO `json:"input"`
		Expected         json.RawMessage             `json:"expected"`
		InvalidUnionKeys []string                    `json:"invalidUnionKeys"`
	} `json:"contractCase"`
	FallbackCases []struct {
		ID       string                      `json:"id"`
		Input    CreateCharacterV2RequestDTO `json:"input"`
		Expected json.RawMessage             `json:"expected"`
	} `json:"fallbackCases"`
}

type characterV2FallbackProjection struct {
	ProficiencyBonus  int      `json:"proficiencyBonus"`
	MaximumHitPoints  int      `json:"maximumHitPoints"`
	SpeedFt           int      `json:"speedFt"`
	ArmorClass        int      `json:"armorClass"`
	Spellcasting      any      `json:"spellcasting"`
	FeatureIDs        []string `json:"featureIds"`
	FeatureSources    []string `json:"featureSources"`
	FeatureCategories []string `json:"featureCategories"`
}

func TestCharacterSheetV2SharedCorrectedContractParity(t *testing.T) {
	fixture := loadCharacterV2ParityFixture(t)
	sheet, err := BuildCharacterSheetV2(fixture.ContractCase.Input)
	if err != nil {
		t.Fatal(err)
	}
	if errors := ValidateCharacterSheetV2(sheet); len(errors) > 0 {
		t.Fatalf("built parity sheet is invalid: %v", errors)
	}
	actual := struct {
		Defense          DefenseInput `json:"defense"`
		ProficiencyBonus ResolvedInt  `json:"proficiencyBonus"`
		ArmorClass       ResolvedInt  `json:"armorClass"`
		Attack           struct {
			ID               string                           `json:"id"`
			AttackBonus      ResolvedInt                      `json:"attackBonus"`
			AttackBonusInput *CharacterAttackCalculationInput `json:"attackBonusInput"`
			Damage           []CharacterDamageInput           `json:"damage"`
		} `json:"attack"`
		Spell              CharacterSheetV2Spell   `json:"spell"`
		PreparedSpellIDs   []string                `json:"preparedSpellIds"`
		Feature            CharacterSheetV2Feature `json:"feature"`
		Subclass           *RuleSelection          `json:"subclass"`
		HitPointLevelGains []HitPointLevelGain     `json:"hitPointLevelGains"`
	}{Defense: sheet.Combat.Defense, ProficiencyBonus: sheet.Combat.ProficiencyBonus, ArmorClass: sheet.Combat.ArmorClass, Spell: findResolvedSpell(sheet.Spellcasting.Spells, "magic-missile"), PreparedSpellIDs: sheet.Spellcasting.PreparedSpellIDs, Feature: sheet.Features[0], Subclass: sheet.Identity.Subclass, HitPointLevelGains: sheet.HitPointProgression.LevelGains}
	actual.Attack.ID = sheet.Attacks[0].ID
	actual.Attack.AttackBonus = sheet.Attacks[0].AttackBonus
	actual.Attack.AttackBonusInput = sheet.Attacks[0].AttackBonusInput
	actual.Attack.Damage = sheet.Attacks[0].Damage
	raw, _ := json.Marshal(actual)
	var actualValue, expectedValue any
	_ = json.Unmarshal(raw, &actualValue)
	_ = json.Unmarshal(fixture.ContractCase.Expected, &expectedValue)
	if !reflect.DeepEqual(actualValue, expectedValue) {
		t.Fatalf("corrected contract projection mismatch\nactual: %s\nexpected: %s", raw, fixture.ContractCase.Expected)
	}
	want := []string{"RuleSelection", "AbilityScoreInput", "DefenseInput", "HitPointLevelGain", "AttackBonusInput", "SpellSelectionInput", "CharacterFeatureInput", "CharacterEquipmentInput"}
	if !reflect.DeepEqual(fixture.ContractCase.InvalidUnionKeys, want) {
		t.Fatal("corrected union coverage is incomplete")
	}
}

func TestCharacterSheetV2SharedFinalFallbackParity(t *testing.T) {
	fixture := loadCharacterV2ParityFixture(t)
	for _, entry := range fixture.FallbackCases {
		entry := entry
		t.Run(entry.ID, func(t *testing.T) {
			sheet, err := BuildCharacterSheetV2(entry.Input)
			if err != nil {
				t.Fatal(err)
			}
			if errors := ValidateCharacterSheetV2(sheet); len(errors) > 0 {
				t.Fatalf("built fallback sheet is invalid: %v", errors)
			}
			actual := characterV2FallbackProjection{
				ProficiencyBonus: sheet.Combat.ProficiencyBonus.Value, MaximumHitPoints: sheet.HitPointProgression.Maximum.Value,
				SpeedFt: sheet.Combat.SpeedFt.Value, ArmorClass: sheet.Combat.ArmorClass.Value, Spellcasting: sheet.Spellcasting,
				FeatureIDs: []string{}, FeatureSources: []string{}, FeatureCategories: []string{},
			}
			for _, feature := range sheet.Features {
				actual.FeatureIDs = append(actual.FeatureIDs, feature.ID)
				actual.FeatureSources = append(actual.FeatureSources, feature.Source)
				actual.FeatureCategories = append(actual.FeatureCategories, feature.Category)
			}
			actualJSON, _ := json.Marshal(actual)
			var actualValue, expectedValue any
			_ = json.Unmarshal(actualJSON, &actualValue)
			_ = json.Unmarshal(entry.Expected, &expectedValue)
			if !reflect.DeepEqual(actualValue, expectedValue) {
				t.Fatalf("fallback projection mismatch\nactual: %s\nexpected: %s", actualJSON, entry.Expected)
			}
		})
	}
}

func TestCharacterSheetV2SharedParityFixtureCoverage(t *testing.T) {
	fixture := loadCharacterV2ParityFixture(t)
	creation, err := rules.LoadCharacterCreation()
	if err != nil {
		t.Fatal(err)
	}
	levelRules, err := rules.Load()
	if err != nil {
		t.Fatal(err)
	}
	if fixture.SnapshotID != creation.Metadata.SnapshotID {
		t.Fatalf("fixture snapshot %q != canonical snapshot %q", fixture.SnapshotID, creation.Metadata.SnapshotID)
	}
	if !reflect.DeepEqual(fixture.Coverage.ClassIndexes, classIndexes(levelRules.Classes)) ||
		!reflect.DeepEqual(fixture.Coverage.Levels, []int{1, 2, 3, 4, 5}) ||
		!reflect.DeepEqual(fixture.Coverage.RaceIndexes, raceIndexes(creation.Races)) ||
		!reflect.DeepEqual(fixture.Coverage.SubraceIndexes, subraceIndexes(creation.Subraces)) ||
		!reflect.DeepEqual(fixture.Coverage.AbilityModes, []string{"calculated", "imported"}) ||
		!reflect.DeepEqual(fixture.Coverage.DefenseVariants, []string{"armor", "unarmored", "manual"}) ||
		!reflect.DeepEqual(fixture.Coverage.CasterTypes, []string{"full", "half", "pact", "none"}) ||
		!reflect.DeepEqual(fixture.Coverage.FeatureModifierIDs, featureModifierIDs(creation.FeatureModifiers)) {
		t.Fatal("shared parity fixture does not cover the exact canonical axes")
	}
}

func TestCharacterSheetV2SharedParityFixtureByteEquivalentOutputs(t *testing.T) {
	fixture := loadCharacterV2ParityFixture(t)
	for _, entry := range fixture.Cases {
		entry := entry
		t.Run(entry.Input.ID, func(t *testing.T) {
			actual, err := CalculateCharacterV2(entry.Input)
			if err != nil {
				t.Fatal(err)
			}
			actualJSON, err := json.Marshal(actual)
			if err != nil {
				t.Fatal(err)
			}
			expectedJSON, err := json.Marshal(entry.Expected)
			if err != nil {
				t.Fatal(err)
			}
			if !bytes.Equal(actualJSON, expectedJSON) {
				t.Fatalf("normalized output mismatch\nactual:   %s\nexpected: %s", actualJSON, expectedJSON)
			}
		})
	}
}

func TestCharacterSheetV2AllClassesLevelsAndSpellProgression(t *testing.T) {
	fixture := loadCharacterV2ParityFixture(t)
	levelRules, err := rules.Load()
	if err != nil {
		t.Fatal(err)
	}
	for _, classIndex := range fixture.Coverage.ClassIndexes {
		class, _ := findClass(levelRules.Classes, classIndex)
		for _, level := range fixture.Coverage.Levels {
			levelRule, _ := findLevel(class, level)
			input := matrixCalculationInput(classIndex, level)
			result, err := CalculateCharacterV2(input)
			if err != nil {
				t.Fatalf("%s level %d: %v", classIndex, level, err)
			}
			if result.ProficiencyBonus != levelRule.ProficiencyBonus {
				t.Fatalf("%s level %d proficiency mismatch", classIndex, level)
			}
			if levelRule.Spellcasting == nil {
				if result.Spellcasting != nil {
					t.Fatalf("%s level %d unexpectedly has spellcasting", classIndex, level)
				}
				continue
			}
			if result.Spellcasting == nil || !reflect.DeepEqual(result.Spellcasting.AvailableSpellLevels, levelRule.Spellcasting.AvailableSpellLevels) {
				t.Fatalf("%s level %d spell level mismatch", classIndex, level)
			}
		}
	}
}

func TestCharacterSheetV2EveryRaceAndSubraceAppliesBonusesOnce(t *testing.T) {
	fixture := loadCharacterV2ParityFixture(t)
	creation, err := rules.LoadCharacterCreation()
	if err != nil {
		t.Fatal(err)
	}
	for _, raceIndex := range fixture.Coverage.RaceIndexes {
		input := matrixCalculationInput("fighter", 1)
		input.ID = raceIndex
		input.Race = RuleSelection{Source: "srd", Index: raceIndex}
		if raceIndex == "half-elf" {
			input.RuleChoices = []RuleChoiceInput{{RuleID: "half-elf-ability-bonuses", OptionIDs: []string{"strength", "wisdom"}}}
		}
		result, err := CalculateCharacterV2(input)
		if err != nil {
			t.Fatal(err)
		}
		race, _ := creation.FindRace(raceIndex)
		if result.SpeedFt != race.SpeedFt {
			t.Fatalf("%s speed = %d, want %d", raceIndex, result.SpeedFt, race.SpeedFt)
		}
	}
	for _, subraceIndex := range fixture.Coverage.SubraceIndexes {
		subrace, _ := findSubrace(creation.Subraces, subraceIndex)
		input := matrixCalculationInput("fighter", 1)
		input.ID = subraceIndex
		input.Race = RuleSelection{Source: "srd", Index: subrace.RaceIndex}
		input.SubraceIndex = subraceIndex
		result, err := CalculateCharacterV2(input)
		if err != nil {
			t.Fatal(err)
		}
		expected := AbilityScoresDTO{Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10}
		race, _ := creation.FindRace(subrace.RaceIndex)
		for _, bonus := range append(append([]rules.AbilityBonusRule(nil), race.AbilityBonuses...), subrace.AbilityBonuses...) {
			addAbilityBonus(&expected, bonus.Ability, bonus.Bonus)
		}
		if result.FinalAbilityScores != expected {
			t.Fatalf("%s scores = %+v, want %+v", subraceIndex, result.FinalAbilityScores, expected)
		}
	}
}

func loadCharacterV2ParityFixture(t *testing.T) characterV2ParityFixture {
	t.Helper()
	raw, err := os.ReadFile("../../../testdata/character-sheet-v2-parity.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixture characterV2ParityFixture
	if err := json.Unmarshal(raw, &fixture); err != nil {
		t.Fatal(err)
	}
	return fixture
}

func matrixCalculationInput(classIndex string, level int) CharacterCalculationInput {
	gains := make([]HitPointLevelGain, 0, level-1)
	for current := 2; current <= level; current++ {
		gains = append(gains, HitPointLevelGain{Level: current, Mode: "fixed-average"})
	}
	manualArmorClass := 10
	base := AbilityScoresDTO{Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10}
	return CharacterCalculationInput{
		ID: fmt.Sprintf("%s-%d", classIndex, level), ClassIndex: classIndex, Level: level,
		Race: RuleSelection{Source: "srd", Index: "human"}, AbilityScores: AbilityScoreInput{Mode: "calculated", Base: &base},
		RuleChoices: []RuleChoiceInput{}, Proficiencies: CharacterProficienciesInput{Perception: "none", Skills: []CharacterSkillInput{}},
		HitPointProgression: HitPointProgressionInput{LevelGains: gains},
		Defense:             DefenseInput{Mode: "manual", ArmorClass: manualArmorClass, Reason: "Fixture."}, Equipment: []CharacterEquipmentInput{},
	}
}

func classIndexes(values []rules.Class) []string {
	result := make([]string, len(values))
	for i, value := range values {
		result[i] = value.Index
	}
	return result
}
func raceIndexes(values []rules.RaceRule) []string {
	result := make([]string, len(values))
	for i, value := range values {
		result[i] = value.Index
	}
	return result
}
func subraceIndexes(values []rules.SubraceRule) []string {
	result := make([]string, len(values))
	for i, value := range values {
		result[i] = value.Index
	}
	return result
}
func featureModifierIDs(values []rules.FeatureModifier) []string {
	result := make([]string, len(values))
	for i, value := range values {
		result[i] = value.ID
	}
	return result
}

func findResolvedSpell(spells []CharacterSheetV2Spell, canonicalIndex string) CharacterSheetV2Spell {
	for _, spell := range spells {
		if spell.CanonicalIndex != nil && *spell.CanonicalIndex == canonicalIndex {
			return spell
		}
	}
	return CharacterSheetV2Spell{}
}
