package characters

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestParseCharacterSheetDocumentRejectsUnknownVersion(t *testing.T) {
	if _, err := ParseCharacterSheetDocument(json.RawMessage(`{"schemaVersion":"CharacterSheetV3"}`)); err == nil {
		t.Fatal("expected an unknown CharacterSheet version to fail safely")
	}
}

func TestParseCharacterSheetDocumentKeepsMaraV1AndAcceptsV2(t *testing.T) {
	mara, err := json.Marshal(maraAuditedSampleEnvelope())
	if err != nil {
		t.Fatal(err)
	}
	document, err := ParseCharacterSheetDocument(mara)
	if err != nil || document.SchemaVersion != "CharacterSheetV1" {
		t.Fatalf("Mara V1 failed strict parsing: %v", err)
	}
	sheet := validCharacterSheetV2()
	raw, err := json.Marshal(sheet)
	if err != nil {
		t.Fatal(err)
	}
	document, err = ParseCharacterSheetDocument(raw)
	if err != nil || document.SchemaVersion != "CharacterSheetV2" || document.V2 == nil {
		t.Fatalf("valid V2 failed strict parsing: %v", err)
	}
	sheet.AbilityScores.Modifiers.Strength = 7
	raw, _ = json.Marshal(sheet)
	if _, err := ParseCharacterSheetDocument(raw); err == nil {
		t.Fatal("inconsistent resolved ability values were accepted")
	}
}

func TestParseCreateCharacterV2RequestStrictFailures(t *testing.T) {
	request := validCreateCharacterV2Request()
	raw, _ := json.Marshal(request)
	if _, err := ParseCreateCharacterV2Request(raw); err != nil {
		t.Fatalf("valid request failed: %v", err)
	}

	var value map[string]any
	if err := json.Unmarshal(raw, &value); err != nil {
		t.Fatal(err)
	}
	value["ownerId"] = "forbidden"
	assertInvalidCreateV2JSON(t, value)
	delete(value, "ownerId")
	delete(value, "other")
	assertInvalidCreateV2JSON(t, value)

	request = validCreateCharacterV2Request()
	request.Identity.Name = strings.Repeat("x", 201)
	assertInvalidCreateV2(t, request)
	request = validCreateCharacterV2Request()
	request.Equipment = []CharacterEquipmentInput{
		{Source: "srd", Index: "rope-hempen-50-feet", Quantity: 1},
		{Source: "srd", Index: "rope-hempen-50-feet", Quantity: 2},
	}
	assertInvalidCreateV2(t, request)
	request = validCreateCharacterV2Request()
	request.Attacks = []CharacterAttackInput{{
		ID: "bad-dice", Name: "Bad dice", AttackBonus: CharacterAttackBonusInput{Mode: "calculated"},
		Damage: []CharacterDamageInput{{Dice: "1d6+2", Type: "piercing"}},
	}}
	assertInvalidCreateV2(t, request)
}

func TestAbilityModifierFloorsNegativeValues(t *testing.T) {
	if got := AbilityModifier(9); got != -1 {
		t.Fatalf("AbilityModifier(9) = %d, want -1", got)
	}
	if got := AbilityModifier(1); got != -5 {
		t.Fatalf("AbilityModifier(1) = %d, want -5", got)
	}
}

func TestValidateRuleChoicesRejectsWrongOwner(t *testing.T) {
	errs := ValidateRuleChoices(RuleChoiceValidationContext{
		RaceIndex:  "human",
		ClassIndex: "fighter",
		Level:      1,
		Choices: []RuleChoiceInput{{
			RuleID:    "half-elf-ability-bonuses",
			OptionIDs: []string{"strength", "wisdom"},
		}},
	})
	if len(errs) == 0 {
		t.Fatal("expected another Race's choice to fail")
	}
}

func TestValidateRuleChoicesExactCountAvailabilityPrerequisitesAndManualPolicy(t *testing.T) {
	tests := []struct {
		name    string
		context RuleChoiceValidationContext
		want    string
	}{
		{name: "wrong count", context: RuleChoiceValidationContext{RaceIndex: "human", ClassIndex: "fighter", Level: 1, Choices: []RuleChoiceInput{{RuleID: "fighter-fighting-style", OptionIDs: []string{}}}}, want: "exactly 1"},
		{name: "unavailable option", context: RuleChoiceValidationContext{RaceIndex: "human", ClassIndex: "fighter", Level: 1, Choices: []RuleChoiceInput{{RuleID: "fighter-fighting-style", OptionIDs: []string{"fighting-style-defense"}}}}, want: "unavailable option"},
		{name: "wrong level", context: RuleChoiceValidationContext{RaceIndex: "human", ClassIndex: "paladin", Level: 1, Choices: []RuleChoiceInput{{RuleID: "paladin-fighting-style", OptionIDs: []string{"fighting-style-defense"}}}}, want: "unavailable at level 1"},
		{name: "prerequisite", context: RuleChoiceValidationContext{RaceIndex: "human", ClassIndex: "warlock", Level: 5, Choices: []RuleChoiceInput{{RuleID: "warlock-eldritch-invocations", OptionIDs: []string{"eldritch-invocation-thirsting-blade", "eldritch-invocation-agonizing-blast", "eldritch-invocation-armor-of-shadows"}}}}, want: "unmet prerequisite"},
		{name: "manual policy", context: RuleChoiceValidationContext{RaceIndex: "human", ClassIndex: "ranger", Level: 1, Choices: []RuleChoiceInput{{RuleID: "ranger-favored-enemy", OptionIDs: []string{"dragon"}, ManualNote: "Dragon."}}}, want: "manual note"},
		{name: "Half-Elf duplicate", context: RuleChoiceValidationContext{RaceIndex: "half-elf", ClassIndex: "fighter", Level: 1, Choices: []RuleChoiceInput{{RuleID: "half-elf-ability-bonuses", OptionIDs: []string{"strength", "strength"}}}}, want: "duplicate"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			errors := ValidateRuleChoices(test.context)
			if !strings.Contains(strings.Join(errors, " "), test.want) {
				t.Fatalf("errors %v do not contain %q", errors, test.want)
			}
		})
	}
	if errors := ValidateRuleChoices(RuleChoiceValidationContext{
		RaceIndex: "human", ClassIndex: "ranger", Level: 1,
		Choices: []RuleChoiceInput{{RuleID: "ranger-favored-enemy", OptionIDs: []string{}, ManualNote: "Dragon."}},
	}); len(errors) != 0 {
		t.Fatalf("bounded manual choice failed: %v", errors)
	}
}

func TestCalculateCharacterV2CanonicalArmor(t *testing.T) {
	result, err := CalculateCharacterV2(CharacterCalculationInput{
		ID:            "human-fighter",
		ClassIndex:    "fighter",
		Level:         1,
		Race:          RuleSelection{Source: "srd", Index: "human"},
		AbilityScores: AbilityScoreInput{Mode: "calculated", Base: &AbilityScoresDTO{Strength: 15, Dexterity: 14, Constitution: 13, Intelligence: 10, Wisdom: 12, Charisma: 8}},
		RuleChoices: []RuleChoiceInput{
			{RuleID: "human-extra-language", OptionIDs: []string{"dwarvish"}},
			{RuleID: "fighter-fighting-style", OptionIDs: []string{"fighter-fighting-style-defense"}},
		},
		Proficiencies:       CharacterProficienciesInput{Perception: "none", Skills: []CharacterSkillInput{}},
		HitPointProgression: HitPointProgressionInput{LevelGains: []HitPointLevelGain{}},
		Defense:             DefenseInput{Mode: "armor", ArmorIndex: "chain-mail", ShieldIndex: "shield"},
		Equipment: []CharacterEquipmentInput{
			{Source: "srd", Index: "chain-mail", Quantity: 1, Equipped: true},
			{Source: "srd", Index: "shield", Quantity: 1, Equipped: true},
		},
	})
	if err != nil {
		t.Fatalf("CalculateCharacterV2 returned %v", err)
	}
	if result.ArmorClass != 19 {
		t.Fatalf("ArmorClass = %d, want 19", result.ArmorClass)
	}
}

func TestCalculateCharacterV2ManualRaceEquipmentAndResetRules(t *testing.T) {
	input := baseCharacterCalculationInput()
	input.Equipment = []CharacterEquipmentInput{{Source: "manual", ID: "plate-armor", Name: "Plate Armor", Category: "Other", Quantity: 1, Equipped: true}}
	result, err := CalculateCharacterV2(input)
	if err != nil || result.ArmorClass != 10 {
		t.Fatalf("manual equipment affected calculations: result=%+v err=%v", result, err)
	}
	input.Race = RuleSelection{Source: "manual", Name: "Custom lineage"}
	if _, err := CalculateCharacterV2(input); err == nil {
		t.Fatal("manual Race unexpectedly received canonical automation")
	}
	request := validCreateCharacterV2Request()
	request.Identity.Race = RuleSelection{Source: "manual", Name: "Custom lineage"}
	request.RuleChoices = []RuleChoiceInput{{RuleID: "fighter-fighting-style", OptionIDs: []string{"fighter-fighting-style-archery"}}}
	if len(ValidateCreateCharacterV2Request(request)) == 0 {
		t.Fatal("manual Race accepted calculated ability scores")
	}
	values := AbilityScoresDTO{Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10}
	request.AbilityScores = AbilityScoreInput{Mode: "imported", Values: &values, Reason: "Transferred."}
	request.Combat.SpeedOverride = &ManualIntOverride{Value: 30, Reason: "Transferred Race speed."}
	if errors := ValidateCreateCharacterV2Request(request); len(errors) != 0 {
		t.Fatalf("manual Race with imported scores failed: %v", errors)
	}
	if _, ok := ResetToCalculated(17, false); ok {
		t.Fatal("reset succeeded without retained valid inputs")
	}
	resolved, ok := ResetToCalculated(17, true)
	if !ok || resolved.Value != 17 || resolved.Provenance.Kind != "calculated" {
		t.Fatalf("valid reset failed: %+v %v", resolved, ok)
	}
	input = baseCharacterCalculationInput()
	input.Race = RuleSelection{Source: "srd", Index: "half-elf"}
	input.RuleChoices = []RuleChoiceInput{{RuleID: "half-elf-ability-bonuses", OptionIDs: []string{"strength", "wisdom"}}}
	if _, ok := ResetAbilityScoresToCalculated(input, nil); ok {
		t.Fatal("ability reset succeeded without retained base scores")
	}
	base := AbilityScoresDTO{Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10}
	input.RuleChoices = nil
	if _, ok := ResetAbilityScoresToCalculated(input, &base); ok {
		t.Fatal("ability reset succeeded without the current Half-Elf choice set")
	}
	input.RuleChoices = []RuleChoiceInput{{RuleID: "half-elf-ability-bonuses", OptionIDs: []string{"strength", "wisdom"}}}
	abilityScores, ok := ResetAbilityScoresToCalculated(input, &base)
	if !ok || abilityScores.Strength != 11 || abilityScores.Wisdom != 11 || abilityScores.Charisma != 12 {
		t.Fatalf("valid ability reset failed: %+v %v", abilityScores, ok)
	}
}

func TestCalculateCharacterV2HeavyArmorDwarfAndMonkShieldRules(t *testing.T) {
	input := baseCharacterCalculationInput()
	base := AbilityScoresDTO{Strength: 8, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10}
	input.AbilityScores = AbilityScoreInput{Mode: "calculated", Base: &base}
	input.Defense = DefenseInput{Mode: "armor", ArmorIndex: "plate-armor"}
	input.Equipment = []CharacterEquipmentInput{{Source: "srd", Index: "plate-armor", Quantity: 1, Equipped: true}}
	result, err := CalculateCharacterV2(input)
	if err != nil || result.SpeedFt != 20 {
		t.Fatalf("heavy armor penalty failed: %+v %v", result, err)
	}
	input.Race = RuleSelection{Source: "srd", Index: "dwarf"}
	result, err = CalculateCharacterV2(input)
	if err != nil || result.SpeedFt != 25 {
		t.Fatalf("Dwarf exception failed: %+v %v", result, err)
	}
	input = baseCharacterCalculationInput()
	input.ClassIndex = "monk"
	input.Level = 2
	input.HitPointProgression.LevelGains = []HitPointLevelGain{{Level: 2, Mode: "fixed-average"}}
	input.Defense = DefenseInput{Mode: "unarmored", FormulaID: "monk-unarmored-defense", ShieldIndex: "shield"}
	input.Equipment = []CharacterEquipmentInput{{Source: "srd", Index: "shield", Quantity: 1, Equipped: true}}
	if _, err := CalculateCharacterV2(input); err == nil || !strings.Contains(err.Error(), "unavailable") {
		t.Fatalf("Monk shield restriction failed: %v", err)
	}
}

func TestCalculateCharacterV2ImportedScoresSurviveRaceChangesAndMinimumHPGain(t *testing.T) {
	input := baseCharacterCalculationInput()
	first, err := CalculateCharacterV2(input)
	if err != nil {
		t.Fatal(err)
	}
	input.Race = RuleSelection{Source: "srd", Index: "tiefling"}
	second, err := CalculateCharacterV2(input)
	if err != nil || first.FinalAbilityScores != second.FinalAbilityScores {
		t.Fatalf("imported scores changed with Race: first=%+v second=%+v err=%v", first.FinalAbilityScores, second.FinalAbilityScores, err)
	}
	constitutionOne := AbilityScoresDTO{Strength: 10, Dexterity: 10, Constitution: 1, Intelligence: 10, Wisdom: 10, Charisma: 10}
	input = baseCharacterCalculationInput()
	input.ClassIndex = "wizard"
	input.Level = 2
	input.AbilityScores = AbilityScoreInput{Mode: "imported", Values: &constitutionOne, Reason: "Transferred."}
	input.HitPointProgression.LevelGains = []HitPointLevelGain{{Level: 2, Mode: "rolled", Roll: 1}}
	result, err := CalculateCharacterV2(input)
	if err != nil || result.MaximumHitPoints != 2 {
		t.Fatalf("minimum-one HP gain failed: %+v %v", result, err)
	}
}

func validCreateCharacterV2Request() CreateCharacterV2RequestDTO {
	base := AbilityScoresDTO{Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10}
	return CreateCharacterV2RequestDTO{
		SchemaVersion: "CharacterSheetV2", CreationSource: "guided",
		Identity: CharacterIdentityV2Input{
			Name: "Ari", Gender: "Other", Race: RuleSelection{Source: "srd", Index: "human"}, Background: "Sage",
			Class: RuleSelection{Source: "srd", Index: "fighter"}, Level: 1,
		},
		AbilityScores:       AbilityScoreInput{Mode: "calculated", Base: &base},
		Proficiencies:       CharacterProficienciesInput{Perception: "none", Skills: []CharacterSkillInput{}},
		HitPointProgression: HitPointProgressionInput{LevelGains: []HitPointLevelGain{}},
		Combat:              CharacterCombatInput{Defense: DefenseInput{Mode: "manual", ArmorClass: 10, Reason: "Transferred value."}},
		RuleChoices: []RuleChoiceInput{
			{RuleID: "human-extra-language", OptionIDs: []string{"dwarvish"}},
			{RuleID: "fighter-fighting-style", OptionIDs: []string{"fighter-fighting-style-archery"}},
		}, Attacks: []CharacterAttackInput{}, Spellcasting: nil,
		Features: []CharacterFeatureInput{}, Equipment: []CharacterEquipmentInput{}, Other: []CharacterOtherInput{},
	}
}

func validCharacterSheetV2() CharacterSheetV2 {
	sheet, _ := BuildCharacterSheetV2(validCreateCharacterV2Request())
	return sheet
}

func baseCharacterCalculationInput() CharacterCalculationInput {
	manualArmorClass := 10
	values := AbilityScoresDTO{Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10}
	return CharacterCalculationInput{
		ID: "base", ClassIndex: "fighter", Level: 1, Race: RuleSelection{Source: "srd", Index: "human"},
		AbilityScores: AbilityScoreInput{Mode: "imported", Values: &values, Reason: "Transferred."},
		RuleChoices:   []RuleChoiceInput{}, Proficiencies: CharacterProficienciesInput{Perception: "none", Skills: []CharacterSkillInput{}},
		HitPointProgression: HitPointProgressionInput{LevelGains: []HitPointLevelGain{}},
		Defense:             DefenseInput{Mode: "manual", ArmorClass: manualArmorClass, Reason: "Transferred."}, Equipment: []CharacterEquipmentInput{},
	}
}

func assertInvalidCreateV2(t *testing.T, request CreateCharacterV2RequestDTO) {
	t.Helper()
	raw, err := json.Marshal(request)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ParseCreateCharacterV2Request(raw); err == nil {
		t.Fatalf("expected invalid request: %s", raw)
	}
}

func assertInvalidCreateV2JSON(t *testing.T, value any) {
	t.Helper()
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ParseCreateCharacterV2Request(raw); err == nil {
		t.Fatalf("expected invalid request: %s", raw)
	}
}
