package characters

import (
	"encoding/json"
	"testing"
)

func TestCorrectedV2BuildPersistsDefenseAttackSpellFeatureAndSubclassSources(t *testing.T) {
	request := correctedWizardRequest()
	sheet, err := BuildCharacterSheetV2(request)
	if err != nil {
		t.Fatal(err)
	}
	if sheet.Combat.Defense.Mode != "manual" || sheet.Combat.ArmorClass.Value != 14 || sheet.Combat.ProficiencyBonus.Value != 2 {
		t.Fatalf("defense/proficiency sources were not preserved: %+v", sheet.Combat)
	}
	if len(sheet.Attacks) != 1 || sheet.Attacks[0].AttackBonusInput == nil || sheet.Attacks[0].AttackBonusInput.Ability != "spellcasting" || sheet.Attacks[0].AttackBonus.Value != 5 {
		t.Fatalf("calculated attack input was not persisted: %+v", sheet.Attacks)
	}
	if sheet.Spellcasting == nil || len(sheet.Spellcasting.Spells) != 9 {
		t.Fatalf("spellcasting was not populated: %+v", sheet.Spellcasting)
	}
	spell := CharacterSheetV2Spell{}
	for _, candidate := range sheet.Spellcasting.Spells {
		if candidate.CanonicalIndex != nil && *candidate.CanonicalIndex == "magic-missile" {
			spell = candidate
		}
	}
	if spell.ID != "spell-magic-missile" || spell.CanonicalIndex == nil || *spell.CanonicalIndex != "magic-missile" || len(spell.Description) < 100 {
		t.Fatalf("canonical spell fidelity was not persisted: %+v", spell)
	}
	if len(sheet.Features) != 1 || sheet.Features[0].CanonicalIndex == nil || *sheet.Features[0].CanonicalIndex != "spellcasting-wizard" || sheet.Features[0].Category != "class" {
		t.Fatalf("canonical feature ownership was not persisted: %+v", sheet.Features)
	}
	if errors := ValidateCharacterSheetV2(sheet); len(errors) != 0 {
		t.Fatalf("built sheet failed validation: %v", errors)
	}
}

func TestLevelFourAbilityScoreImprovementIsAppliedAuthoritatively(t *testing.T) {
	request := correctedFighterRequest(4)
	sheet, err := BuildCharacterSheetV2(request)
	if err != nil {
		t.Fatalf("build level-four Fighter: %v", err)
	}
	if sheet.AbilityScores.Scores.Strength.Value != 18 {
		t.Fatalf("strength after Human bonus and +2 ASI = %d, want 18", sheet.AbilityScores.Scores.Strength.Value)
	}
	if sheet.AbilityScores.Scores.Dexterity.Value != 15 {
		t.Fatalf("dexterity after fixed Human bonus = %d, want 15", sheet.AbilityScores.Scores.Dexterity.Value)
	}
}

func TestRejectsManualSpellWithoutComponentsInRequestAndSavedSheet(t *testing.T) {
	request := correctedWizardRequest()
	replacedID := request.Spellcasting.InitialSpellbook[0].ID
	request.Spellcasting.InitialSpellbook[0] = SpellSelectionInput{
		ID: "spell-no-components", Source: "manual", Name: "Silent Shape", Level: 1,
		School: "Illusion", CastingTime: "1 action", Range: "30 feet", Components: []string{},
		Duration: "1 minute", Description: "A complete imported description.", ImportReason: "Transferred from a paper sheet.",
	}
	for index, id := range request.Spellcasting.PreparedSpellIDs {
		if id == replacedID {
			request.Spellcasting.PreparedSpellIDs[index] = "spell-no-components"
		}
	}
	if len(ValidateCreateCharacterV2Request(request)) == 0 {
		t.Fatal("manual spell without components was accepted in the request")
	}

	request.Spellcasting.InitialSpellbook[0].Components = []string{"S"}
	sheet, err := BuildCharacterSheetV2(request)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for index := range sheet.Spellcasting.Spells {
		if sheet.Spellcasting.Spells[index].ID == "spell-no-components" {
			sheet.Spellcasting.Spells[index].Components = []string{}
			found = true
		}
	}
	if !found {
		t.Fatal("manual spell fixture was not persisted")
	}
	if len(ValidateCharacterSheetV2(sheet)) == 0 {
		t.Fatal("saved manual spell without components was accepted")
	}
}

func TestRejectsManualSpellLevelsUnavailableToCurrentClassLevelInRequestAndSavedSheet(t *testing.T) {
	request := correctedWizardRequest()
	request.Spellcasting.InitialSpellbook[0] = SpellSelectionInput{
		ID: "spell-too-high", Source: "manual", Name: "Too High", Level: 3,
		School: "Evocation", CastingTime: "1 action", Range: "30 feet", Components: []string{"V"},
		Duration: "Instantaneous", Description: "Unavailable at Wizard level one.", ImportReason: "Transferred.",
	}
	if len(ValidateCreateCharacterV2Request(request)) == 0 {
		t.Fatal("manual level-three spell was accepted for a level-one Wizard request")
	}

	sheet, err := BuildCharacterSheetV2(correctedWizardRequest())
	if err != nil {
		t.Fatal(err)
	}
	sheet.Spellcasting.Spells[0].Level = 3
	if len(ValidateCharacterSheetV2(sheet)) == 0 {
		t.Fatal("saved level-one Wizard accepted a level-three spell")
	}
}

func TestCorrectedV2RejectsSubclassHPAttackAndNestedUnionViolations(t *testing.T) {
	request := correctedFighterRequest(3)
	if errors := ValidateCreateCharacterV2Request(request); len(errors) != 0 {
		t.Fatalf("valid corrected request failed: %v", errors)
	}

	request.Identity.Subclass = nil
	if len(ValidateCreateCharacterV2Request(request)) == 0 {
		t.Fatal("missing post-decision subclass was accepted")
	}
	request = correctedFighterRequest(3)
	request.Identity.Subclass = &RuleSelection{Source: "srd", Index: "hunter"}
	if len(ValidateCreateCharacterV2Request(request)) == 0 {
		t.Fatal("cross-Class subclass was accepted")
	}
	request = correctedFighterRequest(3)
	request.HitPointProgression.LevelGains = []HitPointLevelGain{{Level: 3, Mode: "fixed-average"}, {Level: 2, Mode: "fixed-average"}}
	if len(ValidateCreateCharacterV2Request(request)) == 0 {
		t.Fatal("out-of-order HP gains were accepted")
	}

	for name, mutate := range map[string]func(map[string]any){
		"selection": func(value map[string]any) {
			value["identity"].(map[string]any)["race"].(map[string]any)["name"] = ""
		},
		"ability": func(value map[string]any) {
			value["abilityScores"].(map[string]any)["values"] = nil
		},
		"defense": func(value map[string]any) {
			value["combat"].(map[string]any)["defense"] = map[string]any{"mode": "manual", "armorClass": 14.0, "reason": "Transfer.", "shieldIndex": ""}
		},
		"attack": func(value map[string]any) {
			value["attacks"].([]any)[0].(map[string]any)["attackBonus"] = map[string]any{"mode": "calculated", "ability": "strength", "proficient": false, "value": 0.0}
		},
		"hit-points": func(value map[string]any) {
			value["hitPointProgression"].(map[string]any)["levelGains"] = []any{map[string]any{"level": 2.0, "mode": "fixed-average", "roll": 0.0}}
		},
		"spell": func(value map[string]any) {
			value["spellcasting"].(map[string]any)["cantrips"].([]any)[0].(map[string]any)["state"] = ""
		},
		"feature": func(value map[string]any) {
			value["features"].([]any)[0].(map[string]any)["id"] = ""
		},
		"equipment": func(value map[string]any) {
			value["equipment"] = []any{map[string]any{"source": "manual", "id": "gear", "name": "Gear", "category": "Other", "quantity": 1.0, "equipped": false, "index": nil}}
		},
	} {
		t.Run(name, func(t *testing.T) {
			raw, _ := json.Marshal(correctedWizardRequest())
			var value map[string]any
			_ = json.Unmarshal(raw, &value)
			mutate(value)
			invalid, _ := json.Marshal(value)
			if _, err := ParseCreateCharacterV2Request(invalid); err == nil {
				t.Fatal("cross-variant key was accepted")
			}
		})
	}
}

func TestCorrectedV2SavedValidationRederivesAllAuthoritativeValues(t *testing.T) {
	sheet, err := BuildCharacterSheetV2(correctedWizardRequest())
	if err != nil {
		t.Fatal(err)
	}
	mutations := []func(*CharacterSheetV2){
		func(value *CharacterSheetV2) { value.Combat.ProficiencyBonus.Value++ },
		func(value *CharacterSheetV2) { value.Combat.Initiative.Value++ },
		func(value *CharacterSheetV2) { value.Combat.PassivePerception.Value++ },
		func(value *CharacterSheetV2) { value.Combat.SpeedFt.Value += 5 },
		func(value *CharacterSheetV2) { value.Combat.ArmorClass.Value++ },
		func(value *CharacterSheetV2) { value.HitPointProgression.Maximum.Value++ },
		func(value *CharacterSheetV2) { value.Attacks[0].AttackBonus.Value++ },
		func(value *CharacterSheetV2) { value.Spellcasting.SpellSaveDC.Value++ },
		func(value *CharacterSheetV2) { value.Spellcasting.SpellAttackBonus.Value++ },
		func(value *CharacterSheetV2) { value.Spellcasting.PreparedSpellIDs = []string{"missing-entry"} },
		func(value *CharacterSheetV2) { value.Features[0].Name = "Tampered feature" },
	}
	for index, mutate := range mutations {
		copyRaw, _ := json.Marshal(sheet)
		var copySheet CharacterSheetV2
		_ = json.Unmarshal(copyRaw, &copySheet)
		mutate(&copySheet)
		if len(ValidateCharacterSheetV2(copySheet)) == 0 {
			t.Fatalf("authoritative mutation %d was accepted", index)
		}
	}
	raw, _ := json.Marshal(sheet)
	var value map[string]any
	_ = json.Unmarshal(raw, &value)
	provenance := value["combat"].(map[string]any)["proficiencyBonus"].(map[string]any)["provenance"].(map[string]any)
	provenance["note"] = nil
	invalid, _ := json.Marshal(value)
	if _, err := ParseCharacterSheetDocument(invalid); err == nil {
		t.Fatal("saved calculated provenance accepted a cross-variant null field")
	}
}

func TestCorrectedV2DefenseVariantsAttacksManualSpellAndRangerHunter(t *testing.T) {
	armor := correctedFighterRequest(1)
	armor.Combat.Defense = DefenseInput{Mode: "armor", ArmorIndex: "chain-mail", ShieldIndex: "shield"}
	armor.Equipment = []CharacterEquipmentInput{{Source: "srd", Index: "chain-mail", Quantity: 1, Equipped: true}, {Source: "srd", Index: "shield", Quantity: 1, Equipped: true}}
	sheet, err := BuildCharacterSheetV2(armor)
	if err != nil || sheet.Combat.ArmorClass.Value != 18 {
		t.Fatalf("canonical armor and shield failed: %+v %v", sheet.Combat, err)
	}
	unarmored := correctedFighterRequest(1)
	unarmored.Combat.Defense = DefenseInput{Mode: "unarmored", FormulaID: "standard-unarmored"}
	if _, err := BuildCharacterSheetV2(unarmored); err != nil {
		t.Fatalf("standard unarmored defense failed: %v", err)
	}
	manual := correctedFighterRequest(1)
	manual.Attacks[0].AttackBonus = CharacterAttackBonusInput{Mode: "manual-override", Value: 7, Reason: "Campaign weapon."}
	manual.Equipment = []CharacterEquipmentInput{{Source: "manual", ID: "plate-armor", Name: "Plate Armor", Category: "Other", Quantity: 1, Equipped: true}}
	manualSheet, err := BuildCharacterSheetV2(manual)
	if err != nil || manualSheet.Combat.ArmorClass.Value != 14 || manualSheet.Attacks[0].AttackBonusInput != nil || manualSheet.Attacks[0].AttackBonus.Value != 7 {
		t.Fatalf("manual sources were not inert/persisted: %+v %v", manualSheet, err)
	}
	invalid := correctedFighterRequest(1)
	invalid.Attacks[0].AttackBonus = CharacterAttackBonusInput{Mode: "calculated", Ability: "spellcasting", Proficient: true}
	if len(ValidateCreateCharacterV2Request(invalid)) == 0 {
		t.Fatal("noncaster spellcasting attack was accepted")
	}

	wizard := correctedWizardRequest()
	wizard.Spellcasting.InitialSpellbook[0] = SpellSelectionInput{ID: "spell-custom", Source: "manual", Name: "Custom Spark", Level: 1, School: "Evocation", CastingTime: "1 action", Range: "30 feet", Components: []string{"V", "S"}, MaterialComponent: "A copper wire", Duration: "Instantaneous", Concentration: false, Ritual: false, Description: "A bounded custom effect.", HigherLevelText: "The effect grows by one die.", ImportReason: "Transferred from a paper sheet."}
	wizard.Spellcasting.PreparedSpellIDs = []string{"spell-custom", "spell-detect-magic", "spell-identify", "spell-magic-missile"}
	wizardSheet, err := BuildCharacterSheetV2(wizard)
	manualFound := false
	if err == nil {
		for _, spell := range wizardSheet.Spellcasting.Spells {
			manualFound = manualFound || spell.ID == "spell-custom" && spell.CanonicalIndex == nil && spell.Provenance.Kind == "imported" && spell.Provenance.Note == "Transferred from a paper sheet."
		}
	}
	if err != nil || !manualFound {
		t.Fatalf("manual spell was not fully imported: %+v %v", wizardSheet.Spellcasting, err)
	}

	ranger := correctedFighterRequest(3)
	ranger.Identity.Class = RuleSelection{Source: "srd", Index: "ranger"}
	ranger.Identity.Subclass = &RuleSelection{Source: "srd", Index: "hunter"}
	ranger.RuleChoices = []RuleChoiceInput{{RuleID: "human-extra-language", OptionIDs: []string{"dwarvish"}}, {RuleID: "ranger-favored-enemy", OptionIDs: []string{}, ManualNote: "Dragons."}, {RuleID: "ranger-natural-explorer", OptionIDs: []string{}, ManualNote: "Forest."}, {RuleID: "ranger-fighting-style", OptionIDs: []string{"ranger-fighting-style-archery"}}, {RuleID: "hunter-hunters-prey", OptionIDs: []string{"hunters-prey-colossus-slayer"}}}
	ranger.Spellcasting = &CharacterSpellcastingInput{Mode: "known", Cantrips: []SpellSelectionInput{}, Levels: []KnownSpellLevelInput{
		{Level: 2, Learned: spellSelections("cure-wounds", "hunters-mark"), Replacements: []SpellReplacementInput{}},
		{Level: 3, Learned: spellSelections("goodberry"), Replacements: []SpellReplacementInput{}},
	}}
	ranger.Features = []CharacterFeatureInput{{Source: "srd", Index: "hunters-prey"}}
	if _, err := BuildCharacterSheetV2(ranger); err != nil {
		t.Fatalf("Ranger Hunter coverage failed: %v", err)
	}
}

func TestFinalFallbackManualRaceCanonicalClass(t *testing.T) {
	request := finalManualRaceRequest()
	if errors := ValidateCreateCharacterV2Request(request); len(errors) != 0 {
		t.Fatalf("manual Race plus canonical Class failed validation: %v", errors)
	}
	sheet, err := BuildCharacterSheetV2(request)
	if err != nil {
		t.Fatal(err)
	}
	if sheet.AbilityScores.Scores.Strength.Value != 15 || sheet.AbilityScores.Scores.Strength.Provenance.Kind != "imported" || sheet.Combat.SpeedFt.Value != 35 || sheet.Combat.SpeedFt.Provenance.Kind != "manual-override" {
		t.Fatalf("manual Race fallbacks were not preserved: %+v %+v", sheet.AbilityScores, sheet.Combat.SpeedFt)
	}
	if len(sheet.Features) != 1 || sheet.Features[0].ID != "second-wind" || sheet.Features[0].OwnerKind != "class" {
		t.Fatalf("canonical Class automation was not retained: %+v", sheet.Features)
	}
}

func TestFinalFallbackManualRaceRequiresImportedScoresAndSpeed(t *testing.T) {
	missingScores := finalManualRaceRequest()
	base := AbilityScoresDTO{Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10}
	missingScores.AbilityScores = AbilityScoreInput{Mode: "calculated", Base: &base}
	if len(ValidateCreateCharacterV2Request(missingScores)) == 0 {
		t.Fatal("manual Race accepted calculated scores")
	}
	missingSpeed := finalManualRaceRequest()
	missingSpeed.Combat.SpeedOverride = nil
	if len(ValidateCreateCharacterV2Request(missingSpeed)) == 0 {
		t.Fatal("manual Race accepted missing Speed override")
	}
}

func TestFinalFallbackManualClassUniversalProficiencyAndBoundedAutomation(t *testing.T) {
	for level := 1; level <= 4; level++ {
		sheet, err := BuildCharacterSheetV2(finalManualClassRequest(level))
		if err != nil || sheet.Combat.ProficiencyBonus.Value != 2 {
			t.Fatalf("manual Class level %d proficiency is wrong: %+v %v", level, sheet.Combat.ProficiencyBonus, err)
		}
	}
	request := finalManualClassRequest(5)
	if errors := ValidateCreateCharacterV2Request(request); len(errors) != 0 {
		t.Fatalf("manual Class plus canonical Race failed validation: %v", errors)
	}
	sheet, err := BuildCharacterSheetV2(request)
	if err != nil {
		t.Fatal(err)
	}
	if sheet.Combat.ProficiencyBonus.Value != 3 || sheet.HitPointProgression.Maximum.Value != 41 || len(sheet.HitPointProgression.LevelGains) != 0 || sheet.Spellcasting == nil || sheet.Spellcasting.DecisionHistory.Mode != "none" {
		t.Fatalf("manual Class fallbacks are wrong: %+v", sheet)
	}

	missingHP := finalManualClassRequest(1)
	missingHP.HitPointProgression.MaximumOverride = nil
	if len(ValidateCreateCharacterV2Request(missingHP)) == 0 {
		t.Fatal("manual Class accepted missing maximum HP override")
	}
	canonicalChoice := finalManualClassRequest(1)
	canonicalChoice.RuleChoices = append(canonicalChoice.RuleChoices, RuleChoiceInput{RuleID: "fighter-fighting-style", OptionIDs: []string{"fighter-fighting-style-archery"}})
	if len(ValidateCreateCharacterV2Request(canonicalChoice)) == 0 {
		t.Fatal("manual Class accepted canonical Class choice")
	}
	canonicalFeature := finalManualClassRequest(1)
	canonicalFeature.Features = []CharacterFeatureInput{{Source: "srd", Index: "second-wind"}}
	if len(ValidateCreateCharacterV2Request(canonicalFeature)) == 0 {
		t.Fatal("manual Class accepted canonical Class feature")
	}
	spellcasting := finalManualClassRequest(1)
	spellcasting.Spellcasting = &CharacterSpellcastingInput{Mode: "known", Cantrips: []SpellSelectionInput{}, Levels: []KnownSpellLevelInput{}}
	if len(ValidateCreateCharacterV2Request(spellcasting)) == 0 {
		t.Fatal("manual Class accepted spellcasting")
	}
	classFormula := finalManualClassRequest(1)
	classFormula.Combat.Defense = DefenseInput{Mode: "unarmored", FormulaID: "barbarian-unarmored-defense"}
	if len(ValidateCreateCharacterV2Request(classFormula)) == 0 {
		t.Fatal("manual Class accepted Class-owned defense formula")
	}
}

func TestFinalFallbackCombinedManualIdentityRequiresEveryOverride(t *testing.T) {
	request := finalManualClassRequest(1)
	request.Identity.Race = RuleSelection{Source: "manual", Name: "Custom lineage"}
	values := AbilityScoresDTO{Strength: 12, Dexterity: 12, Constitution: 12, Intelligence: 12, Wisdom: 12, Charisma: 12}
	request.AbilityScores = AbilityScoreInput{Mode: "imported", Values: &values, Reason: "Transferred final scores."}
	request.Combat.SpeedOverride = &ManualIntOverride{Value: 35, Reason: "Custom lineage speed."}
	request.RuleChoices = []RuleChoiceInput{}
	if errors := ValidateCreateCharacterV2Request(request); len(errors) != 0 {
		t.Fatalf("combined manual identity failed: %v", errors)
	}
	if _, err := BuildCharacterSheetV2(request); err != nil {
		t.Fatal(err)
	}
	missingSpeed := request
	missingSpeed.Combat.SpeedOverride = nil
	if len(ValidateCreateCharacterV2Request(missingSpeed)) == 0 {
		t.Fatal("combined manual identity accepted missing Speed")
	}
	missingHP := request
	missingHP.HitPointProgression.MaximumOverride = nil
	if len(ValidateCreateCharacterV2Request(missingHP)) == 0 {
		t.Fatal("combined manual identity accepted missing maximum HP")
	}
}

func TestFinalFallbackLosslessManualAndCanonicalFeatures(t *testing.T) {
	request := correctedFighterRequest(1)
	request.Features = []CharacterFeatureInput{{Source: "manual", ID: "custom-heritage", Name: "Ancestral Memory", Category: "Heritage Gift", Description: "Recall one carefully bounded ancestral memory."}}
	sheet, err := BuildCharacterSheetV2(request)
	if err != nil {
		t.Fatal(err)
	}
	feature := sheet.Features[0]
	if feature.ID != "custom-heritage" || feature.Source != "manual" || feature.CanonicalIndex != nil || feature.Category != "Heritage Gift" || feature.Provenance.Kind != "imported" {
		t.Fatalf("manual feature was lossy: %+v", feature)
	}
	if errors := ValidateCharacterSheetV2(sheet); len(errors) != 0 {
		t.Fatalf("lossless manual feature sheet failed: %v", errors)
	}

	canonical, err := BuildCharacterSheetV2(correctedFighterRequest(1))
	if err != nil {
		t.Fatal(err)
	}
	if canonical.Features[0].ID != "second-wind" || canonical.Features[0].Source != "srd" || canonical.Features[0].OwnerKind != "class" {
		t.Fatalf("canonical feature identity was not retained: %+v", canonical.Features[0])
	}

	raw, _ := json.Marshal(sheet)
	var value map[string]any
	_ = json.Unmarshal(raw, &value)
	value["features"].([]any)[0].(map[string]any)["ownerKind"] = nil
	invalid, _ := json.Marshal(value)
	if _, err := ParseCharacterSheetDocument(invalid); err == nil {
		t.Fatal("manual feature accepted a cross-variant ownerKind")
	}
}

func finalManualRaceRequest() CreateCharacterV2RequestDTO {
	request := correctedFighterRequest(1)
	request.Identity.Race = RuleSelection{Source: "manual", Name: "Custom lineage"}
	values := AbilityScoresDTO{Strength: 15, Dexterity: 14, Constitution: 13, Intelligence: 10, Wisdom: 12, Charisma: 8}
	request.AbilityScores = AbilityScoreInput{Mode: "imported", Values: &values, Reason: "Transferred final scores."}
	request.Combat.SpeedOverride = &ManualIntOverride{Value: 35, Reason: "Custom lineage speed."}
	request.RuleChoices = []RuleChoiceInput{{RuleID: "fighter-fighting-style", OptionIDs: []string{"fighter-fighting-style-archery"}}}
	return request
}

func finalManualClassRequest(level int) CreateCharacterV2RequestDTO {
	request := correctedFighterRequest(level)
	request.Identity.Class = RuleSelection{Source: "manual", Name: "Warden"}
	request.Identity.Subclass = nil
	maximum := 12
	if level == 5 {
		maximum = 41
	}
	request.HitPointProgression = HitPointProgressionInput{LevelGains: []HitPointLevelGain{}, MaximumOverride: &ManualIntOverride{Value: maximum, Reason: "Transferred maximum HP."}}
	request.Combat.Defense = DefenseInput{Mode: "unarmored", FormulaID: "standard-unarmored"}
	request.RuleChoices = []RuleChoiceInput{{RuleID: "human-extra-language", OptionIDs: []string{"dwarvish"}}}
	request.Features = []CharacterFeatureInput{}
	request.Spellcasting = &CharacterSpellcastingInput{Mode: "none"}
	return request
}

func correctedFighterRequest(level int) CreateCharacterV2RequestDTO {
	base := AbilityScoresDTO{Strength: 15, Dexterity: 14, Constitution: 13, Intelligence: 10, Wisdom: 12, Charisma: 8}
	gains := make([]HitPointLevelGain, 0, level-1)
	for current := 2; current <= level; current++ {
		gains = append(gains, HitPointLevelGain{Level: current, Mode: "fixed-average"})
	}
	request := CreateCharacterV2RequestDTO{
		SchemaVersion: "CharacterSheetV2", CreationSource: "guided",
		Identity: CharacterIdentityV2Input{
			Name: "Ari", Gender: "Other", Race: RuleSelection{Source: "srd", Index: "human"}, Background: "Soldier",
			Class: RuleSelection{Source: "srd", Index: "fighter"}, Level: level,
		},
		AbilityScores:       AbilityScoreInput{Mode: "calculated", Base: &base},
		Proficiencies:       CharacterProficienciesInput{Perception: "none", Skills: []CharacterSkillInput{}},
		HitPointProgression: HitPointProgressionInput{LevelGains: gains},
		Combat:              CharacterCombatInput{Defense: DefenseInput{Mode: "manual", ArmorClass: 14, Reason: "Transferred armor class."}},
		RuleChoices: []RuleChoiceInput{
			{RuleID: "human-extra-language", OptionIDs: []string{"dwarvish"}},
			{RuleID: "fighter-fighting-style", OptionIDs: []string{"fighter-fighting-style-archery"}},
		},
		Attacks: []CharacterAttackInput{{
			ID: "longsword", Name: "Longsword", AttackBonus: CharacterAttackBonusInput{Mode: "calculated", Ability: "strength", Proficient: true},
			Damage: []CharacterDamageInput{{Dice: "1d8", Bonus: 3, Type: "slashing"}},
		}},
		Spellcasting: &CharacterSpellcastingInput{Mode: "none"},
		Features:     []CharacterFeatureInput{{Source: "srd", Index: "second-wind"}},
		Equipment:    []CharacterEquipmentInput{}, Other: []CharacterOtherInput{},
	}
	if level >= 3 {
		request.Identity.Subclass = &RuleSelection{Source: "srd", Index: "champion"}
	}
	if level >= 4 {
		request.RuleChoices = append(request.RuleChoices, RuleChoiceInput{RuleID: "fighter-ability-score-improvement-1", OptionIDs: []string{"ability-score-increase-strength-2"}})
	}
	return request
}

func correctedWizardRequest() CreateCharacterV2RequestDTO {
	request := correctedFighterRequest(1)
	base := AbilityScoresDTO{Strength: 8, Dexterity: 14, Constitution: 13, Intelligence: 15, Wisdom: 12, Charisma: 10}
	request.AbilityScores = AbilityScoreInput{Mode: "calculated", Base: &base}
	request.Identity.Background = "Sage"
	request.Identity.Class = RuleSelection{Source: "srd", Index: "wizard"}
	request.RuleChoices = []RuleChoiceInput{{RuleID: "human-extra-language", OptionIDs: []string{"dwarvish"}}}
	request.Attacks = []CharacterAttackInput{{
		ID: "fire-bolt", Name: "Fire Bolt", AttackBonus: CharacterAttackBonusInput{Mode: "calculated", Ability: "spellcasting", Proficient: true},
		Damage: []CharacterDamageInput{{Dice: "1d10", Type: "fire"}},
	}}
	request.Spellcasting = &CharacterSpellcastingInput{
		Mode:             "spellbook-prepared",
		Cantrips:         spellSelections("fire-bolt", "light", "mage-hand"),
		InitialSpellbook: spellSelections("burning-hands", "charm-person", "detect-magic", "identify", "magic-missile", "sleep"),
		Additions:        []WizardSpellbookAdditionInput{},
		PreparedSpellIDs: []string{"spell-burning-hands", "spell-detect-magic", "spell-identify", "spell-magic-missile"},
	}
	request.Features = []CharacterFeatureInput{{Source: "srd", Index: "spellcasting-wizard"}}
	return request
}
