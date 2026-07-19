package characters

import (
	"fmt"
	"math"

	"github.com/Inkala/rpg-companion/backend/internal/rules"
)

type ResolvedValueSuggestion struct {
	Resolved             ResolvedInt `json:"resolved"`
	CalculatedSuggestion int         `json:"calculatedSuggestion"`
}

func AbilityModifier(score int) int {
	return int(math.Floor(float64(score-10) / 2))
}

func ResolveCalculatedValue(calculated int, override *ManualIntOverride) ResolvedValueSuggestion {
	resolved := ResolvedInt{Value: calculated, Provenance: ValueProvenance{Kind: "calculated", RuleID: "character-sheet-v2"}}
	if override != nil {
		resolved = ResolvedInt{Value: override.Value, Provenance: ValueProvenance{Kind: "manual-override", Reason: override.Reason}}
	}
	return ResolvedValueSuggestion{Resolved: resolved, CalculatedSuggestion: calculated}
}

func ResetToCalculated(calculated int, canReset bool) (ResolvedInt, bool) {
	if !canReset {
		return ResolvedInt{}, false
	}
	return ResolvedInt{Value: calculated, Provenance: ValueProvenance{Kind: "calculated", RuleID: "character-sheet-v2"}}, true
}

func ResetAbilityScoresToCalculated(input CharacterCalculationInput, retainedBase *AbilityScoresDTO) (AbilityScoresDTO, bool) {
	if retainedBase == nil {
		return AbilityScoresDTO{}, false
	}
	input.AbilityScores = AbilityScoreInput{Mode: "calculated", Base: retainedBase}
	result, err := CalculateCharacterV2(input)
	if err != nil {
		return AbilityScoresDTO{}, false
	}
	return result.FinalAbilityScores, true
}

func CalculateCharacterV2(input CharacterCalculationInput) (CharacterCalculationOutput, error) {
	if input.Race.Source != "srd" {
		return CharacterCalculationOutput{}, fmt.Errorf("manual Race cannot receive canonical automation")
	}
	levelRules, err := rules.Load()
	if err != nil {
		return CharacterCalculationOutput{}, err
	}
	creationRules, err := rules.LoadCharacterCreation()
	if err != nil {
		return CharacterCalculationOutput{}, err
	}
	classRule, ok := findClass(levelRules.Classes, input.ClassIndex)
	if !ok {
		return CharacterCalculationOutput{}, fmt.Errorf("unsupported canonical Class")
	}
	classLevel, ok := findLevel(classRule, input.Level)
	if !ok || input.Level < 1 || input.Level > 5 {
		return CharacterCalculationOutput{}, fmt.Errorf("unsupported level")
	}
	if input.SubclassIndex != "" {
		validSubclass := input.Level >= classRule.SubclassDecisionLevel
		foundSubclass := false
		for _, subclass := range classRule.Subclasses {
			if subclass.Index == input.SubclassIndex {
				foundSubclass = true
			}
		}
		if !validSubclass || !foundSubclass {
			return CharacterCalculationOutput{}, fmt.Errorf("unsupported canonical subclass for Class or level")
		}
	}
	raceRule, ok := creationRules.FindRace(input.Race.Index)
	if !ok {
		return CharacterCalculationOutput{}, fmt.Errorf("unsupported canonical Race")
	}
	choiceErrors := ValidateRuleChoices(RuleChoiceValidationContext{
		RaceIndex: input.Race.Index, SubraceIndex: input.SubraceIndex, ClassIndex: input.ClassIndex,
		Level: input.Level, Choices: input.RuleChoices,
	})
	if len(choiceErrors) > 0 {
		return CharacterCalculationOutput{}, fmt.Errorf("%s", choiceErrors[0])
	}
	if raceRule.Index == "half-elf" && !hasRuleChoice(input.RuleChoices, "half-elf-ability-bonuses") {
		return CharacterCalculationOutput{}, fmt.Errorf("Half-Elf calculated ability scores require the current canonical ability choice set")
	}
	var subrace *rules.SubraceRule
	if input.SubraceIndex != "" {
		candidate, found := findSubrace(creationRules.Subraces, input.SubraceIndex)
		if !found || candidate.RaceIndex != raceRule.Index || !v2Contains(raceRule.SubraceIndexes, candidate.Index) {
			return CharacterCalculationOutput{}, fmt.Errorf("subrace does not belong to selected Race")
		}
		subrace = &candidate
	}

	finalScores, err := calculateAbilityScores(input, raceRule, subrace)
	if err != nil {
		return CharacterCalculationOutput{}, err
	}
	if !validAbilityScores(finalScores) {
		return CharacterCalculationOutput{}, fmt.Errorf("resolved ability score is outside the supported bound")
	}
	modifiers := AbilityScoresDTO{
		Strength: AbilityModifier(finalScores.Strength), Dexterity: AbilityModifier(finalScores.Dexterity),
		Constitution: AbilityModifier(finalScores.Constitution), Intelligence: AbilityModifier(finalScores.Intelligence),
		Wisdom: AbilityModifier(finalScores.Wisdom), Charisma: AbilityModifier(finalScores.Charisma),
	}
	initiative := modifiers.Dexterity
	if classRule.Index == "bard" && input.Level >= 2 && v2HasFeatureModifier("bard-jack-of-all-trades-initiative") {
		initiative += classLevel.ProficiencyBonus / 2
	}
	passivePerception := calculatePassivePerception(input, modifiers.Wisdom, classLevel.ProficiencyBonus, raceRule, subrace)
	armor := resolveArmorState(input, creationRules)
	speed := calculateSpeed(input, raceRule, armor, finalScores.Strength)
	maximumHP, err := calculateMaximumHitPoints(input, classRule, modifiers.Constitution, subrace)
	if err != nil {
		return CharacterCalculationOutput{}, err
	}
	armorClass, err := calculateArmorClass(input, classRule.Index, modifiers, armor)
	if err != nil {
		return CharacterCalculationOutput{}, err
	}
	var spellcasting *CharacterCalculationSpellcasting
	if classLevel.Spellcasting != nil {
		abilityModifierValue := abilityValue(modifiers, classLevel.Spellcasting.Ability)
		slots := append([]int(nil), classLevel.Spellcasting.Slots...)
		if classLevel.Spellcasting.Mode == "pact-known" {
			slots = []int{0, 0, 0}
			if classLevel.Spellcasting.PactSlots > 0 && classLevel.Spellcasting.PactSlotLevel > 0 {
				slots[classLevel.Spellcasting.PactSlotLevel-1] = classLevel.Spellcasting.PactSlots
			}
		}
		spellcasting = &CharacterCalculationSpellcasting{
			Ability: classLevel.Spellcasting.Ability, SpellSaveDC: 8 + classLevel.ProficiencyBonus + abilityModifierValue,
			SpellAttackBonus: classLevel.ProficiencyBonus + abilityModifierValue, Slots: slots,
			AvailableSpellLevels: append([]int(nil), classLevel.Spellcasting.AvailableSpellLevels...),
		}
	}
	return CharacterCalculationOutput{
		ID: input.ID, FinalAbilityScores: finalScores, AbilityModifiers: modifiers,
		ProficiencyBonus: classLevel.ProficiencyBonus, Initiative: initiative, PassivePerception: passivePerception,
		SpeedFt: speed, MaximumHitPoints: maximumHP, ArmorClass: armorClass, Spellcasting: spellcasting,
	}, nil
}

func calculateManualClassV2(input CharacterCalculationInput) (CharacterCalculationOutput, error) {
	creation, err := rules.LoadCharacterCreation()
	if err != nil {
		return CharacterCalculationOutput{}, err
	}
	if input.Race.Source != "srd" || input.Level < 1 || input.Level > 5 {
		return CharacterCalculationOutput{}, fmt.Errorf("manual Class requires a supported Race input and level")
	}
	race, ok := creation.FindRace(input.Race.Index)
	if !ok {
		return CharacterCalculationOutput{}, fmt.Errorf("unsupported canonical Race input")
	}
	var subrace *rules.SubraceRule
	if input.SubraceIndex != "" {
		candidate, found := findSubrace(creation.Subraces, input.SubraceIndex)
		if !found || candidate.RaceIndex != race.Index || !v2Contains(race.SubraceIndexes, candidate.Index) {
			return CharacterCalculationOutput{}, fmt.Errorf("subrace does not belong to selected Race")
		}
		subrace = &candidate
	}
	if errors := ValidateRuleChoices(RuleChoiceValidationContext{RaceIndex: race.Index, SubraceIndex: input.SubraceIndex, Level: input.Level, Choices: input.RuleChoices}); len(errors) > 0 {
		return CharacterCalculationOutput{}, fmt.Errorf("%s", errors[0])
	}
	finalScores, err := calculateAbilityScores(input, race, subrace)
	if err != nil || !validAbilityScores(finalScores) {
		return CharacterCalculationOutput{}, fmt.Errorf("manual Class ability scores are invalid")
	}
	modifiers := AbilityScoresDTO{
		Strength: AbilityModifier(finalScores.Strength), Dexterity: AbilityModifier(finalScores.Dexterity),
		Constitution: AbilityModifier(finalScores.Constitution), Intelligence: AbilityModifier(finalScores.Intelligence),
		Wisdom: AbilityModifier(finalScores.Wisdom), Charisma: AbilityModifier(finalScores.Charisma),
	}
	proficiency := 2
	if input.Level == 5 {
		proficiency = 3
	}
	armor := resolveArmorState(input, creation)
	armorClass, err := calculateArmorClass(input, "", modifiers, armor)
	if err != nil {
		return CharacterCalculationOutput{}, err
	}
	return CharacterCalculationOutput{
		ID: input.ID, FinalAbilityScores: finalScores, AbilityModifiers: modifiers, ProficiencyBonus: proficiency,
		Initiative: modifiers.Dexterity, PassivePerception: calculatePassivePerception(input, modifiers.Wisdom, proficiency, race, subrace),
		SpeedFt: calculateSpeed(input, race, armor, finalScores.Strength), MaximumHitPoints: input.HitPointProgression.MaximumOverride.Value,
		ArmorClass: armorClass, Spellcasting: nil,
	}, nil
}

func BuildCharacterSheetV2(request CreateCharacterV2RequestDTO) (CharacterSheetV2, error) {
	if errors := ValidateCreateCharacterV2Request(request); len(errors) > 0 {
		return CharacterSheetV2{}, fmt.Errorf("%s", errors[0])
	}
	creation, err := rules.LoadCharacterCreation()
	if err != nil {
		return CharacterSheetV2{}, err
	}
	levelData, err := rules.Load()
	if err != nil {
		return CharacterSheetV2{}, err
	}
	raceIndex, subraceIndex := canonicalRaceAndSubrace(request.Identity.Race)
	calculationRaceIndex := raceIndex
	if calculationRaceIndex == "" {
		calculationRaceIndex = "human"
	}
	classIndex := ""
	if request.Identity.Class.Source == "srd" {
		classIndex = request.Identity.Class.Index
	}
	subclassIndex := ""
	if request.Identity.Subclass != nil && request.Identity.Subclass.Source == "srd" {
		subclassIndex = request.Identity.Subclass.Index
	}
	calculationInput := CharacterCalculationInput{
		ID: request.Identity.Name, ClassIndex: classIndex, SubclassIndex: subclassIndex,
		Level: request.Identity.Level, Race: RuleSelection{Source: "srd", Index: calculationRaceIndex}, SubraceIndex: subraceIndex,
		AbilityScores: request.AbilityScores, RuleChoices: request.RuleChoices, Proficiencies: request.Proficiencies,
		HitPointProgression: request.HitPointProgression, Defense: request.Combat.Defense, Equipment: request.Equipment,
	}
	var calculation CharacterCalculationOutput
	if classIndex == "" {
		calculation, err = calculateManualClassV2(calculationInput)
	} else {
		calculation, err = CalculateCharacterV2(calculationInput)
	}
	if err != nil {
		return CharacterSheetV2{}, err
	}
	calculated := func(value int, ruleID string) ResolvedInt {
		return ResolvedInt{Value: value, Provenance: ValueProvenance{Kind: "calculated", RuleID: ruleID}}
	}
	resolved := func(value int, override *ManualIntOverride, ruleID string) ResolvedInt {
		if override != nil {
			return ResolvedInt{Value: override.Value, Provenance: ValueProvenance{Kind: "manual-override", Reason: override.Reason}}
		}
		return calculated(value, ruleID)
	}
	abilityProvenance := ValueProvenance{Kind: "calculated", RuleID: "ability-score-final"}
	if request.AbilityScores.Mode == "imported" {
		abilityProvenance = ValueProvenance{Kind: "imported", Note: request.AbilityScores.Reason}
	}
	ability := func(value int) ResolvedInt { return ResolvedInt{Value: value, Provenance: abilityProvenance} }
	attacks := make([]CharacterSheetV2Attack, 0, len(request.Attacks))
	for _, attack := range request.Attacks {
		entry := CharacterSheetV2Attack{ID: attack.ID, Name: attack.Name, Damage: append([]CharacterDamageInput(nil), attack.Damage...)}
		if attack.AttackBonus.Mode == "manual-override" {
			entry.AttackBonus = ResolvedInt{Value: attack.AttackBonus.Value, Provenance: ValueProvenance{Kind: "manual-override", Reason: attack.AttackBonus.Reason}}
		} else {
			abilityName := attack.AttackBonus.Ability
			if abilityName == "spellcasting" {
				if calculation.Spellcasting == nil {
					return CharacterSheetV2{}, fmt.Errorf("spellcasting attack requires a spellcasting Class")
				}
				abilityName = calculation.Spellcasting.Ability
			}
			bonus := abilityValue(calculation.AbilityModifiers, abilityName)
			if attack.AttackBonus.Proficient {
				bonus += calculation.ProficiencyBonus
			}
			entry.AttackBonus = calculated(bonus, "attack-bonus")
			entry.AttackBonusInput = &CharacterAttackCalculationInput{Ability: attack.AttackBonus.Ability, Proficient: attack.AttackBonus.Proficient}
		}
		attacks = append(attacks, entry)
	}
	var spellcasting *CharacterSheetV2Spellcasting
	if calculation.Spellcasting != nil && request.Spellcasting != nil {
		spells := make([]CharacterSheetV2Spell, 0, len(request.Spellcasting.Spells))
		for _, spell := range request.Spellcasting.Spells {
			if spell.Source == "manual" {
				entry := CharacterSheetV2Spell{ID: spell.ID, Name: spell.Name, Level: spell.Level, School: spell.School, CastingTime: spell.CastingTime,
					Range: spell.Range, Components: append([]string(nil), spell.Components...), Duration: spell.Duration, Concentration: spell.Concentration,
					Ritual: spell.Ritual, Description: spell.Description, State: spell.State, Provenance: ValueProvenance{Kind: "imported"}}
				if spell.MaterialComponent != "" {
					value := spell.MaterialComponent
					entry.MaterialComponent = &value
				}
				if spell.HigherLevelText != "" {
					value := spell.HigherLevelText
					entry.HigherLevelText = &value
				}
				spells = append(spells, entry)
				continue
			}
			var canonical rules.SpellDetail
			found := false
			for _, candidate := range creation.Spells {
				if candidate.Index == spell.Index {
					canonical = candidate
					found = true
					break
				}
			}
			if !found {
				return CharacterSheetV2{}, fmt.Errorf("unsupported canonical spell")
			}
			index := canonical.Index
			spells = append(spells, CharacterSheetV2Spell{ID: spell.ID, CanonicalIndex: &index, Name: canonical.Name, Level: canonical.Level,
				School: canonical.School, CastingTime: canonical.CastingTime, Range: canonical.Range, Components: append([]string(nil), canonical.Components...),
				MaterialComponent: canonical.Material, Duration: canonical.Duration, Concentration: canonical.Concentration, Ritual: canonical.Ritual,
				Description: canonical.Description, HigherLevelText: canonical.HigherLevel, State: spell.State,
				Provenance: ValueProvenance{Kind: "calculated", RuleID: "spell-canonical"}})
		}
		slots := make([]CharacterSheetV2Slot, len(calculation.Spellcasting.Slots))
		for index, maximum := range calculation.Spellcasting.Slots {
			slots[index] = CharacterSheetV2Slot{Level: index + 1, Max: maximum, Provenance: ValueProvenance{Kind: "calculated", RuleID: "spell-slots"}}
			for _, override := range request.Spellcasting.SlotOverride {
				if override.Level == index+1 {
					slots[index].Max = override.Max
					slots[index].Provenance = ValueProvenance{Kind: "manual-override", Reason: override.Reason}
				}
			}
		}
		spellcasting = &CharacterSheetV2Spellcasting{Ability: calculation.Spellcasting.Ability,
			SpellSaveDC: calculated(calculation.Spellcasting.SpellSaveDC, "spell-save-dc"), SpellAttackBonus: calculated(calculation.Spellcasting.SpellAttackBonus, "spell-attack-bonus"),
			Slots: slots, AvailableSpellLevels: append([]int(nil), calculation.Spellcasting.AvailableSpellLevels...), Spells: spells,
			PreparedSpellIDs: append([]string(nil), request.Spellcasting.PreparedSpellIDs...)}
	}
	features := make([]CharacterSheetV2Feature, 0, len(request.Features))
	for _, feature := range request.Features {
		if feature.Source == "manual" {
			features = append(features, CharacterSheetV2Feature{ID: feature.ID, Source: "manual", Name: feature.Name, Category: feature.Category, Description: feature.Description, Provenance: ValueProvenance{Kind: "imported"}})
			continue
		}
		name, ownerKind, category, description, ok := resolveV2Feature(levelData, creation, feature.Index, raceIndex, subraceIndex, classIndex, subclassIndex, request.Identity.Level)
		if !ok {
			return CharacterSheetV2{}, fmt.Errorf("canonical feature is not owned by the selected character")
		}
		index := feature.Index
		features = append(features, CharacterSheetV2Feature{ID: feature.Index, Source: "srd", CanonicalIndex: &index, OwnerKind: ownerKind, Name: name, Category: category, Description: description, Provenance: ValueProvenance{Kind: "calculated", RuleID: "feature-canonical"}})
	}
	armorClass := calculated(calculation.ArmorClass, "armor-class-unarmored")
	if request.Combat.Defense.Mode == "armor" {
		armorClass = calculated(calculation.ArmorClass, "armor-class-armor")
	}
	if request.Combat.Defense.Mode == "manual" {
		armorClass = ResolvedInt{Value: request.Combat.Defense.ArmorClass, Provenance: ValueProvenance{Kind: "manual-override", Reason: request.Combat.Defense.Reason}}
	}
	return CharacterSheetV2{
		SchemaVersion: "CharacterSheetV2", Ruleset: CharacterSheetV2Ruleset{System: "dnd5e", Version: "2014", SnapshotID: creation.Metadata.SnapshotID}, CreationSource: request.CreationSource,
		Identity: request.Identity, AbilityScores: ResolvedAbilityScores{Input: request.AbilityScores,
			Scores: ResolvedAbilityScoreValues{Strength: ability(calculation.FinalAbilityScores.Strength), Dexterity: ability(calculation.FinalAbilityScores.Dexterity), Constitution: ability(calculation.FinalAbilityScores.Constitution), Intelligence: ability(calculation.FinalAbilityScores.Intelligence), Wisdom: ability(calculation.FinalAbilityScores.Wisdom), Charisma: ability(calculation.FinalAbilityScores.Charisma)}, Modifiers: calculation.AbilityModifiers},
		Proficiencies: request.Proficiencies, HitPointProgression: CharacterSheetV2HitPoints{LevelGains: request.HitPointProgression.LevelGains, MaximumOverride: request.HitPointProgression.MaximumOverride, Maximum: resolved(calculation.MaximumHitPoints, request.HitPointProgression.MaximumOverride, "maximum-hit-points")},
		Combat:      CharacterSheetV2Combat{Defense: request.Combat.Defense, ProficiencyBonus: calculated(calculation.ProficiencyBonus, "proficiency-bonus"), Initiative: resolved(calculation.Initiative, request.Combat.InitiativeOverride, "initiative"), PassivePerception: resolved(calculation.PassivePerception, request.Combat.PassivePerceptionOverride, "passive-perception"), SpeedFt: resolved(calculation.SpeedFt, request.Combat.SpeedOverride, "walking-speed"), ArmorClass: armorClass},
		RuleChoices: request.RuleChoices, Attacks: attacks, Spellcasting: spellcasting, Features: features, Equipment: request.Equipment, Other: request.Other,
		Summary: CharacterSheetV2Summary{DisplayLine: fmt.Sprintf("%s · Level %d", request.Identity.Name, request.Identity.Level), LandingConcept: request.Identity.Background + " " + ruleSelectionLabel(request.Identity.Class), FeaturedAbilities: featureNames(features), ReferenceSections: []CharacterReferenceSectionV2{{ID: "actions", Label: "Actions", DefaultOpen: true}, {ID: "features", Label: "Features", DefaultOpen: true}, {ID: "spells", Label: "Spells", DefaultOpen: spellcasting != nil}, {ID: "equipment", Label: "Equipment"}, {ID: "other", Label: "Other"}}},
	}, nil
}

func ruleSelectionLabel(selection RuleSelection) string {
	if selection.Source == "srd" {
		return selection.Index
	}
	return selection.Name
}

func featureNames(features []CharacterSheetV2Feature) []string {
	result := []string{}
	for _, feature := range features {
		if len(result) == 3 {
			break
		}
		result = append(result, feature.Name)
	}
	return result
}

func resolveV2Feature(levelData rules.Dataset, creation rules.CharacterCreationDataset, index, raceIndex, subraceIndex, classIndex, subclassIndex string, level int) (string, string, string, string, bool) {
	traits := []string{}
	if race, ok := creation.FindRace(raceIndex); ok {
		traits = append(traits, race.TraitIndexes...)
	}
	if subrace, ok := findSubrace(creation.Subraces, subraceIndex); ok {
		traits = append(traits, subrace.TraitIndexes...)
	}
	if v2Contains(traits, index) {
		for _, trait := range creation.RaceTraits {
			if trait.Index == index {
				return trait.Name, "race", "race", trait.Description, true
			}
		}
	}
	class, ok := findClass(levelData.Classes, classIndex)
	if !ok {
		return "", "", "", "", false
	}
	for _, entry := range class.Levels {
		if entry.Level <= level {
			for _, feature := range entry.Features {
				if feature.Index == index {
					return feature.Name, "class", "class", feature.Summary, true
				}
			}
		}
	}
	for _, subclass := range class.Subclasses {
		if subclass.Index == subclassIndex {
			for _, entry := range subclass.FeaturesByLevel {
				if entry.Level <= level {
					for _, feature := range entry.Features {
						if feature.Index == index {
							return feature.Name, "subclass", "subclass", feature.Summary, true
						}
					}
				}
			}
		}
	}
	return "", "", "", "", false
}

func calculateAbilityScores(input CharacterCalculationInput, race rules.RaceRule, subrace *rules.SubraceRule) (AbilityScoresDTO, error) {
	if input.AbilityScores.Mode == "imported" {
		if input.AbilityScores.Values == nil {
			return AbilityScoresDTO{}, fmt.Errorf("imported scores require values")
		}
		return *input.AbilityScores.Values, nil
	}
	if input.AbilityScores.Mode != "calculated" || input.AbilityScores.Base == nil {
		return AbilityScoresDTO{}, fmt.Errorf("calculated scores require base scores")
	}
	scores := *input.AbilityScores.Base
	bonuses := append([]rules.AbilityBonusRule(nil), race.AbilityBonuses...)
	if subrace != nil {
		bonuses = append(bonuses, subrace.AbilityBonuses...)
	}
	for _, bonus := range bonuses {
		addAbilityBonus(&scores, bonus.Ability, bonus.Bonus)
	}
	for _, choice := range input.RuleChoices {
		if choice.RuleID == "half-elf-ability-bonuses" {
			for _, ability := range choice.OptionIDs {
				addAbilityBonus(&scores, ability, 1)
			}
		}
	}
	return scores, nil
}

func calculatePassivePerception(input CharacterCalculationInput, wisdomModifier, proficiency int, race rules.RaceRule, subrace *rules.SubraceRule) int {
	rank := input.Proficiencies.Perception
	for _, skill := range input.Proficiencies.Skills {
		if skill.Name == "perception" && skill.Rank == "expertise" {
			rank = "expertise"
		} else if skill.Name == "perception" && skill.Rank == "proficient" && rank == "none" {
			rank = "proficient"
		}
	}
	traitIndexes := append([]string(nil), race.TraitIndexes...)
	if subrace != nil {
		traitIndexes = append(traitIndexes, subrace.TraitIndexes...)
	}
	choicePerception := false
	for _, choice := range input.RuleChoices {
		if choice.RuleID == "half-elf-skill-versatility" && v2Contains(choice.OptionIDs, "skill-perception") {
			choicePerception = true
		}
	}
	if rank == "none" && (v2Contains(traitIndexes, "keen-senses") && v2HasFeatureModifier("high-elf-keen-senses") || choicePerception) {
		rank = "proficient"
	}
	bonus := 0
	if rank == "proficient" {
		bonus = proficiency
	} else if rank == "expertise" {
		bonus = 2 * proficiency
	}
	return 10 + wisdomModifier + bonus
}

type armorState struct {
	armor             *rules.EquipmentRule
	shield            *rules.EquipmentRule
	wearingArmor      bool
	wearingHeavyArmor bool
	usingShield       bool
}

func resolveArmorState(input CharacterCalculationInput, dataset rules.CharacterCreationDataset) armorState {
	equipped := map[string]bool{}
	for _, item := range input.Equipment {
		if item.Source == "srd" && item.Equipped {
			equipped[item.Index] = true
		}
	}
	state := armorState{}
	if input.Defense.ArmorIndex != "" && equipped[input.Defense.ArmorIndex] {
		if item, ok := dataset.FindEquipment(input.Defense.ArmorIndex); ok && item.Armor != nil && item.Armor.Category != "Shield" {
			state.armor = &item
			state.wearingArmor = true
			state.wearingHeavyArmor = item.Armor.Category == "Heavy"
		}
	}
	if input.Defense.ShieldIndex != "" && equipped[input.Defense.ShieldIndex] {
		if item, ok := dataset.FindEquipment(input.Defense.ShieldIndex); ok && item.Armor != nil && item.Armor.Category == "Shield" {
			state.shield = &item
			state.usingShield = true
		}
	}
	return state
}

func calculateSpeed(input CharacterCalculationInput, race rules.RaceRule, armor armorState, strength int) int {
	speed := race.SpeedFt
	if armor.wearingHeavyArmor && strength < armor.armor.Armor.StrengthMinimum && !race.IgnoresHeavyArmorSpeedPenalty {
		speed -= 10
	}
	if input.ClassIndex == "barbarian" && input.Level >= 5 && !armor.wearingHeavyArmor {
		speed += v2FeatureModifierValue("barbarian-fast-movement-speed")
	}
	if input.ClassIndex == "monk" && input.Level >= 2 && !armor.wearingArmor && !armor.usingShield {
		speed += v2FeatureModifierValue("monk-unarmored-movement-speed")
	}
	return speed
}

func calculateMaximumHitPoints(input CharacterCalculationInput, class rules.Class, constitutionModifier int, subrace *rules.SubraceRule) (int, error) {
	gains := map[int]HitPointLevelGain{}
	for _, gain := range input.HitPointProgression.LevelGains {
		if _, duplicate := gains[gain.Level]; duplicate {
			return 0, fmt.Errorf("duplicate hit point gain level")
		}
		gains[gain.Level] = gain
	}
	maximum := max(1, class.HitDie+constitutionModifier)
	for level := 2; level <= input.Level; level++ {
		gain, ok := gains[level]
		if !ok {
			return 0, fmt.Errorf("missing hit point gain for level %d", level)
		}
		rolled := class.FixedAverageHP
		if gain.Mode == "rolled" {
			if gain.Roll < 1 || gain.Roll > class.HitDie {
				return 0, fmt.Errorf("hit point roll exceeds Hit Die")
			}
			rolled = gain.Roll
		}
		maximum += max(1, rolled+constitutionModifier)
	}
	if subrace != nil && v2Contains(subrace.TraitIndexes, "dwarven-toughness") {
		maximum += input.Level * v2FeatureModifierValue("hill-dwarf-dwarven-toughness-maximum-hit-points")
	}
	if input.ClassIndex == "sorcerer" && input.SubclassIndex == "draconic" {
		maximum += input.Level * v2FeatureModifierValue("draconic-resilience-maximum-hit-points")
	}
	if input.HitPointProgression.MaximumOverride != nil {
		return input.HitPointProgression.MaximumOverride.Value, nil
	}
	return maximum, nil
}

func calculateArmorClass(input CharacterCalculationInput, classIndex string, modifiers AbilityScoresDTO, armor armorState) (int, error) {
	if input.Defense.Mode == "manual" {
		return input.Defense.ArmorClass, nil
	}
	shieldBonus := 0
	if armor.shield != nil {
		shieldBonus = armor.shield.Armor.ShieldBonus
	}
	if input.Defense.Mode == "armor" {
		if armor.armor == nil {
			return 0, fmt.Errorf("armor defense requires equipped canonical armor")
		}
		rule := armor.armor.Armor
		dexterityBonus := 0
		if rule.DexterityBonus {
			dexterityBonus = modifiers.Dexterity
			if rule.MaximumDexterityBonus != nil {
				dexterityBonus = min(dexterityBonus, *rule.MaximumDexterityBonus)
			}
		}
		defenseStyle := 0
		if selectedDefenseStyle(input.RuleChoices, classIndex) {
			defenseStyle = v2FeatureModifierValue(classIndex + "-defense-style-ac")
		}
		return rule.BaseArmorClass + dexterityBonus + shieldBonus + defenseStyle, nil
	}
	if armor.wearingArmor {
		return 0, fmt.Errorf("unarmored defense cannot wear armor")
	}
	legal := map[string]int{"standard-unarmored": 10 + modifiers.Dexterity + shieldBonus}
	if classIndex == "barbarian" && v2HasFeatureModifier("barbarian-unarmored-defense-ac") {
		legal["barbarian-unarmored-defense"] = 10 + modifiers.Dexterity + modifiers.Constitution + shieldBonus
	}
	if classIndex == "monk" && !armor.usingShield && v2HasFeatureModifier("monk-unarmored-defense-ac") {
		legal["monk-unarmored-defense"] = 10 + modifiers.Dexterity + modifiers.Wisdom
	}
	if classIndex == "sorcerer" && input.SubclassIndex == "draconic" && v2HasFeatureModifier("draconic-resilience-ac") {
		legal["draconic-resilience"] = 13 + modifiers.Dexterity + shieldBonus
	}
	if input.Defense.FormulaID != "" {
		value, ok := legal[input.Defense.FormulaID]
		if !ok {
			return 0, fmt.Errorf("selected defense formula is unavailable")
		}
		return value, nil
	}
	if len(legal) > 1 {
		return 0, fmt.Errorf("multiple legal defense formulas require explicit selection")
	}
	for _, value := range legal {
		return value, nil
	}
	return legal["standard-unarmored"], nil
}

func selectedDefenseStyle(choices []RuleChoiceInput, classIndex string) bool {
	option := map[string]string{"fighter": "fighter-fighting-style-defense", "paladin": "fighting-style-defense", "ranger": "ranger-fighting-style-defense"}[classIndex]
	for _, choice := range choices {
		if v2Contains(choice.OptionIDs, option) {
			return true
		}
	}
	return false
}

func findClass(classes []rules.Class, index string) (rules.Class, bool) {
	for _, class := range classes {
		if class.Index == index {
			return class, true
		}
	}
	return rules.Class{}, false
}

func findLevel(class rules.Class, level int) (rules.Level, bool) {
	for _, candidate := range class.Levels {
		if candidate.Level == level {
			return candidate, true
		}
	}
	return rules.Level{}, false
}

func findSubrace(subraces []rules.SubraceRule, index string) (rules.SubraceRule, bool) {
	for _, subrace := range subraces {
		if subrace.Index == index {
			return subrace, true
		}
	}
	return rules.SubraceRule{}, false
}

func v2Contains(values []string, wanted string) bool {
	for _, value := range values {
		if value == wanted {
			return true
		}
	}
	return false
}

func v2ContainsInt(values []int, wanted int) bool {
	for _, value := range values {
		if value == wanted {
			return true
		}
	}
	return false
}

func addAbilityBonus(scores *AbilityScoresDTO, ability string, bonus int) {
	switch ability {
	case "strength":
		scores.Strength += bonus
	case "dexterity":
		scores.Dexterity += bonus
	case "constitution":
		scores.Constitution += bonus
	case "intelligence":
		scores.Intelligence += bonus
	case "wisdom":
		scores.Wisdom += bonus
	case "charisma":
		scores.Charisma += bonus
	}
}

func abilityValue(scores AbilityScoresDTO, ability string) int {
	switch ability {
	case "strength":
		return scores.Strength
	case "dexterity":
		return scores.Dexterity
	case "constitution":
		return scores.Constitution
	case "intelligence":
		return scores.Intelligence
	case "wisdom":
		return scores.Wisdom
	case "charisma":
		return scores.Charisma
	default:
		return 0
	}
}

func v2FeatureModifierValue(id string) int {
	dataset, err := rules.LoadCharacterCreation()
	if err != nil {
		return 0
	}
	for _, modifier := range dataset.FeatureModifiers {
		if modifier.ID == id && modifier.Value != nil {
			return *modifier.Value
		}
	}
	return 0
}

func v2HasFeatureModifier(id string) bool {
	dataset, err := rules.LoadCharacterCreation()
	if err != nil {
		return false
	}
	for _, modifier := range dataset.FeatureModifiers {
		if modifier.ID == id {
			return true
		}
	}
	return false
}
