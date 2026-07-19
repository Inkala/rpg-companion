package characters

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"reflect"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/Inkala/rpg-companion/backend/internal/rules"
)

type RuleChoiceValidationContext struct {
	RaceIndex       string
	SubraceIndex    string
	ClassIndex      string
	Level           int
	Choices         []RuleChoiceInput
	RequireComplete bool
}

var v2Identifier = regexp.MustCompile(`^[a-z0-9-]{1,128}$`)
var v2Dice = regexp.MustCompile(`^[0-9]{1,2}d[0-9]{1,3}$`)

func ParseCharacterSheetDocument(raw json.RawMessage) (ParsedCharacterSheetDocument, error) {
	if len(raw) == 0 || len(raw) > maxV2StoredReferencePayloadBytes {
		return ParsedCharacterSheetDocument{}, fmt.Errorf("character sheet document has an invalid size")
	}
	var discriminator struct {
		SchemaVersion string `json:"schemaVersion"`
	}
	if err := json.Unmarshal(raw, &discriminator); err != nil {
		return ParsedCharacterSheetDocument{}, fmt.Errorf("character sheet document is malformed")
	}
	switch discriminator.SchemaVersion {
	case "CharacterSheetV1":
		if len(raw) > maxV1ReferencePayloadBytes {
			return ParsedCharacterSheetDocument{}, fmt.Errorf("CharacterSheetV1 has an invalid size")
		}
		expected, err := inferV1ExpectedValues(raw)
		if err != nil || len(validateCharacterSheetV1Envelope(raw, expected)) > 0 {
			return ParsedCharacterSheetDocument{}, fmt.Errorf("CharacterSheetV1 is invalid")
		}
		return ParsedCharacterSheetDocument{SchemaVersion: discriminator.SchemaVersion, V1: append(json.RawMessage(nil), raw...)}, nil
	case "CharacterSheetV2":
		if !hasExactRequiredJSONFields(raw, v2SheetFields) || !validateSheetV2RawKeys(raw) {
			return ParsedCharacterSheetDocument{}, fmt.Errorf("CharacterSheetV2 is invalid")
		}
		var sheet CharacterSheetV2
		if err := strictDecodeJSON(raw, &sheet); err != nil {
			return ParsedCharacterSheetDocument{}, fmt.Errorf("CharacterSheetV2 is invalid")
		}
		if errs := ValidateCharacterSheetV2(sheet); len(errs) > 0 {
			return ParsedCharacterSheetDocument{}, fmt.Errorf("CharacterSheetV2 is invalid: %s", errs[0])
		}
		return ParsedCharacterSheetDocument{SchemaVersion: discriminator.SchemaVersion, V2: &sheet}, nil
	default:
		return ParsedCharacterSheetDocument{}, fmt.Errorf("unsupported character sheet schemaVersion")
	}
}

func ParseCreateCharacterV2Request(raw json.RawMessage) (CreateCharacterV2RequestDTO, error) {
	if len(raw) == 0 || len(raw) > maxV2RequestPayloadBytes {
		return CreateCharacterV2RequestDTO{}, fmt.Errorf("CreateCharacterV2 request has an invalid size")
	}
	if !hasExactRequiredJSONFields(raw, v2RequestFields) || !validateCreateV2RawKeys(raw) {
		return CreateCharacterV2RequestDTO{}, fmt.Errorf("CreateCharacterV2 request fields are invalid")
	}
	var request CreateCharacterV2RequestDTO
	if err := strictDecodeJSON(raw, &request); err != nil {
		return CreateCharacterV2RequestDTO{}, fmt.Errorf("CreateCharacterV2 request is malformed")
	}
	if errs := ValidateCreateCharacterV2Request(request); len(errs) > 0 {
		return CreateCharacterV2RequestDTO{}, fmt.Errorf("CreateCharacterV2 request is invalid: %s", errs[0])
	}
	return request, nil
}

func ValidateCreateCharacterV2Request(request CreateCharacterV2RequestDTO) []string {
	var errors []string
	if request.SchemaVersion != "CharacterSheetV2" {
		errors = append(errors, "schemaVersion must be CharacterSheetV2")
	}
	if request.CreationSource != "guided" && request.CreationSource != "manual-transfer" {
		errors = append(errors, "creationSource is invalid")
	}
	errors = append(errors, validateV2Identity(request.Identity)...)
	errors = append(errors, validateAbilityScoreInput(request.AbilityScores)...)
	if !oneOf(request.Proficiencies.Perception, "none", "proficient", "expertise") {
		errors = append(errors, "perception proficiency is invalid")
	}
	if len(request.Proficiencies.Skills) > 32 || hasDuplicateStrings(skillNames(request.Proficiencies.Skills)) {
		errors = append(errors, "skills are invalid or duplicated")
	}
	for _, skill := range request.Proficiencies.Skills {
		if !v2Identifier.MatchString(skill.Name) || !oneOf(skill.Rank, "proficient", "expertise") {
			errors = append(errors, "skill is invalid")
		}
	}
	errors = append(errors, validateHPProgression(request.HitPointProgression)...)
	errors = append(errors, validateDefenseInput(request.Combat.Defense, request.Equipment)...)
	for _, candidate := range []struct {
		override     *ManualIntOverride
		minimum, max int
	}{{request.Combat.InitiativeOverride, -100, 100}, {request.Combat.PassivePerceptionOverride, 0, 100}, {request.Combat.SpeedOverride, 0, 1000}} {
		if candidate.override != nil && (!boundedText(candidate.override.Reason, 1000) || candidate.override.Value < candidate.minimum || candidate.override.Value > candidate.max) {
			errors = append(errors, "combat override is invalid")
		}
	}
	if len(request.RuleChoices) > 32 || hasDuplicateRuleChoices(request.RuleChoices) {
		errors = append(errors, "rule choices are excessive or duplicated")
	}
	raceIndex, subraceIndex := canonicalRaceAndSubrace(request.Identity.Race)
	classIndex := ""
	if request.Identity.Class.Source == "srd" {
		classIndex = request.Identity.Class.Index
	}
	errors = append(errors, ValidateRuleChoices(RuleChoiceValidationContext{
		RaceIndex: raceIndex, SubraceIndex: subraceIndex, ClassIndex: classIndex,
		Level: request.Identity.Level, Choices: request.RuleChoices, RequireComplete: true,
	})...)
	if request.Identity.Race.Source == "manual" && request.AbilityScores.Mode != "imported" {
		errors = append(errors, "manual Race requires imported ability scores")
	}
	if len(request.Attacks) > 32 || hasDuplicateStrings(attackIDs(request.Attacks)) {
		errors = append(errors, "attacks are excessive or duplicated")
	}
	for _, attack := range request.Attacks {
		if !v2Identifier.MatchString(attack.ID) || !boundedText(attack.Name, 200) || len(attack.Damage) < 1 || len(attack.Damage) > 8 ||
			!oneOf(attack.AttackBonus.Mode, "calculated", "manual-override") {
			errors = append(errors, "attack is invalid")
		}
		if attack.AttackBonus.Mode == "calculated" && (!oneOf(attack.AttackBonus.Ability, "strength", "dexterity", "spellcasting") || attack.AttackBonus.Reason != "" || attack.AttackBonus.Value != 0) {
			errors = append(errors, "calculated attack bonus contains manual fields")
		}
		if attack.AttackBonus.Mode == "manual-override" && !boundedText(attack.AttackBonus.Reason, 1000) {
			errors = append(errors, "manual attack bonus requires a reason")
		}
		if attack.AttackBonus.Mode == "manual-override" && (attack.AttackBonus.Ability != "" || attack.AttackBonus.Proficient) {
			errors = append(errors, "manual attack bonus contains calculated fields")
		}
		for _, damage := range attack.Damage {
			if !v2Dice.MatchString(damage.Dice) || !boundedText(damage.Type, 200) || damage.Bonus < -100 || damage.Bonus > 100 {
				errors = append(errors, "attack damage is invalid")
			}
		}
	}
	if request.Spellcasting != nil {
		errors = append(errors, validateSpellcastingInput(*request.Spellcasting)...)
	}
	errors = append(errors, validateSpellcastingForIdentity(request)...)
	if len(request.Features) > 64 || hasDuplicateStrings(featureIDs(request.Features)) {
		errors = append(errors, "features are excessive or duplicated")
	}
	for _, feature := range request.Features {
		errors = append(errors, validateFeatureInput(feature)...)
	}
	if len(request.Equipment) > 128 || hasDuplicateStrings(equipmentIDs(request.Equipment)) {
		errors = append(errors, "equipment is excessive or duplicated")
	}
	for _, equipment := range request.Equipment {
		errors = append(errors, validateEquipmentInput(equipment)...)
	}
	if len(request.Other) > 32 || hasDuplicateStrings(otherIDs(request.Other)) {
		errors = append(errors, "Other entries are excessive or duplicated")
	}
	for _, other := range request.Other {
		if !v2Identifier.MatchString(other.ID) || !boundedText(other.Title, 200) || !boundedText(other.Description, 5000) {
			errors = append(errors, "Other entry is invalid")
		}
	}
	errors = append(errors, validateCreateV2Semantics(request)...)
	return errors
}

func ValidateCharacterSheetV2(sheet CharacterSheetV2) []string {
	request := requestFromSheet(sheet)
	errors := ValidateCreateCharacterV2Request(request)
	creation, _ := rules.LoadCharacterCreation()
	if sheet.Ruleset.System != "dnd5e" || sheet.Ruleset.Version != "2014" || sheet.Ruleset.SnapshotID != creation.Metadata.SnapshotID {
		errors = append(errors, "ruleset snapshot is invalid")
	}
	if !validResolvedAbilityConsistency(sheet) {
		errors = append(errors, "resolved ability scores are inconsistent")
	}
	for _, candidate := range []struct {
		value        ResolvedInt
		minimum, max int
	}{{sheet.HitPointProgression.Maximum, 1, 9999}, {sheet.Combat.ProficiencyBonus, 2, 6}, {sheet.Combat.Initiative, -100, 100}, {sheet.Combat.PassivePerception, 0, 100}, {sheet.Combat.SpeedFt, 0, 1000}, {sheet.Combat.ArmorClass, 0, 100}} {
		if candidate.value.Value < candidate.minimum || candidate.value.Value > candidate.max || !validProvenance(candidate.value.Provenance) {
			errors = append(errors, "resolved value or provenance is invalid")
		}
	}
	if len(sheet.Attacks) > 32 || hasDuplicateStrings(v2SheetAttackIDs(sheet.Attacks)) {
		errors = append(errors, "resolved attacks are invalid")
	}
	for _, attack := range sheet.Attacks {
		if !v2Identifier.MatchString(attack.ID) || !boundedText(attack.Name, 200) || attack.AttackBonus.Value < -100 || attack.AttackBonus.Value > 100 || !validProvenance(attack.AttackBonus.Provenance) || len(attack.Damage) < 1 || len(attack.Damage) > 8 {
			errors = append(errors, "resolved attack is invalid")
		}
		for _, damage := range attack.Damage {
			if !v2Dice.MatchString(damage.Dice) || damage.Bonus < -100 || damage.Bonus > 100 || !boundedText(damage.Type, 200) {
				errors = append(errors, "resolved attack damage is invalid")
			}
		}
	}
	if len(sheet.Features) > 64 || hasDuplicateStrings(v2SheetFeatureIDs(sheet.Features)) {
		errors = append(errors, "resolved features are invalid")
	}
	for _, feature := range sheet.Features {
		commonValid := v2Identifier.MatchString(feature.ID) && boundedText(feature.Name, 200) && boundedText(feature.Category, 200) && boundedText(feature.Description, 10000)
		canonicalValid := feature.Source == "srd" && feature.CanonicalIndex != nil && feature.ID == *feature.CanonicalIndex && oneOf(feature.OwnerKind, "race", "class", "subclass") && feature.Provenance.Kind == "calculated" && validProvenance(feature.Provenance)
		manualValid := feature.Source == "manual" && feature.CanonicalIndex == nil && feature.OwnerKind == "" && feature.Provenance.Kind == "imported" && validProvenance(feature.Provenance)
		if !commonValid || !canonicalValid && !manualValid {
			errors = append(errors, "feature union or provenance is invalid")
		}
	}
	if !boundedText(sheet.Summary.DisplayLine, 200) || !boundedText(sheet.Summary.LandingConcept, 1000) || len(sheet.Summary.FeaturedAbilities) > 16 || len(sheet.Summary.ReferenceSections) > 5 {
		errors = append(errors, "summary is invalid")
	}
	sectionIDs := make([]string, 0, len(sheet.Summary.ReferenceSections))
	for _, section := range sheet.Summary.ReferenceSections {
		sectionIDs = append(sectionIDs, section.ID)
		if !oneOf(section.ID, "actions", "features", "spells", "equipment", "other") || !boundedText(section.Label, 200) {
			errors = append(errors, "reference section is invalid")
		}
	}
	if hasDuplicateStrings(sectionIDs) {
		errors = append(errors, "reference section IDs are duplicated")
	}
	if sheet.Spellcasting != nil {
		errors = append(errors, validateResolvedSpellcasting(*sheet.Spellcasting)...)
	}
	if expected, err := BuildCharacterSheetV2(request); err != nil || !sameAuthoritativeV2(sheet, expected) {
		errors = append(errors, "saved authoritative values are inconsistent")
	}
	return errors
}

func validateResolvedSpellcasting(spellcasting CharacterSheetV2Spellcasting) []string {
	if !oneOf(spellcasting.Ability, "intelligence", "wisdom", "charisma") || !validProvenance(spellcasting.SpellSaveDC.Provenance) || !validProvenance(spellcasting.SpellAttackBonus.Provenance) || len(spellcasting.Slots) > 3 || len(spellcasting.AvailableSpellLevels) > 3 || len(spellcasting.Spells) > 128 {
		return []string{"resolved spellcasting is invalid"}
	}
	for _, spell := range spellcasting.Spells {
		if !v2Identifier.MatchString(spell.ID) || !boundedText(spell.Name, 200) || spell.Level < 0 || spell.Level > 3 || !boundedText(spell.Description, 10000) || !validProvenance(spell.Provenance) {
			return []string{"resolved spell is invalid"}
		}
	}
	for _, slot := range spellcasting.Slots {
		if slot.Level < 1 || slot.Level > 3 || slot.Max < 0 || slot.Max > 99 || slot.Used < 0 || slot.Used > slot.Max || !validProvenance(slot.Provenance) {
			return []string{"resolved spell slot is invalid"}
		}
	}
	return nil
}

func requestFromSheet(sheet CharacterSheetV2) CreateCharacterV2RequestDTO {
	request := CreateCharacterV2RequestDTO{SchemaVersion: sheet.SchemaVersion, CreationSource: sheet.CreationSource, Identity: sheet.Identity,
		AbilityScores: sheet.AbilityScores.Input, Proficiencies: sheet.Proficiencies,
		HitPointProgression: HitPointProgressionInput{LevelGains: sheet.HitPointProgression.LevelGains, MaximumOverride: sheet.HitPointProgression.MaximumOverride},
		Combat:              CharacterCombatInput{Defense: sheet.Combat.Defense}, RuleChoices: sheet.RuleChoices, Equipment: sheet.Equipment, Other: sheet.Other}
	if sheet.Combat.Initiative.Provenance.Kind == "manual-override" {
		request.Combat.InitiativeOverride = &ManualIntOverride{Value: sheet.Combat.Initiative.Value, Reason: sheet.Combat.Initiative.Provenance.Reason}
	}
	if sheet.Combat.PassivePerception.Provenance.Kind == "manual-override" {
		request.Combat.PassivePerceptionOverride = &ManualIntOverride{Value: sheet.Combat.PassivePerception.Value, Reason: sheet.Combat.PassivePerception.Provenance.Reason}
	}
	if sheet.Combat.SpeedFt.Provenance.Kind == "manual-override" {
		request.Combat.SpeedOverride = &ManualIntOverride{Value: sheet.Combat.SpeedFt.Value, Reason: sheet.Combat.SpeedFt.Provenance.Reason}
	}
	for _, attack := range sheet.Attacks {
		input := CharacterAttackBonusInput{Mode: "manual-override", Value: attack.AttackBonus.Value, Reason: "Imported attack."}
		if attack.AttackBonusInput != nil {
			input = CharacterAttackBonusInput{Mode: "calculated", Ability: attack.AttackBonusInput.Ability, Proficient: attack.AttackBonusInput.Proficient}
		} else if attack.AttackBonus.Provenance.Kind == "manual-override" {
			input.Reason = attack.AttackBonus.Provenance.Reason
		}
		request.Attacks = append(request.Attacks, CharacterAttackInput{ID: attack.ID, Name: attack.Name, AttackBonus: input, Damage: attack.Damage})
	}
	if sheet.Spellcasting != nil {
		input := CharacterSpellcastingInput{PreparedSpellIDs: append([]string(nil), sheet.Spellcasting.PreparedSpellIDs...)}
		for _, spell := range sheet.Spellcasting.Spells {
			if spell.CanonicalIndex != nil {
				input.Spells = append(input.Spells, CharacterSpellInput{ID: spell.ID, Source: "srd", Index: *spell.CanonicalIndex, State: spell.State})
			} else {
				entry := CharacterSpellInput{ID: spell.ID, Source: "manual", Name: spell.Name, Level: spell.Level, School: spell.School, CastingTime: spell.CastingTime, Range: spell.Range, Components: spell.Components, Duration: spell.Duration, Concentration: spell.Concentration, Ritual: spell.Ritual, Description: spell.Description, State: spell.State}
				if spell.MaterialComponent != nil {
					entry.MaterialComponent = *spell.MaterialComponent
				}
				if spell.HigherLevelText != nil {
					entry.HigherLevelText = *spell.HigherLevelText
				}
				input.Spells = append(input.Spells, entry)
			}
		}
		for _, slot := range sheet.Spellcasting.Slots {
			if slot.Provenance.Kind == "manual-override" {
				input.SlotOverride = append(input.SlotOverride, CharacterSpellSlotOverride{Level: slot.Level, Max: slot.Max, Reason: slot.Provenance.Reason})
			}
		}
		request.Spellcasting = &input
	}
	for _, feature := range sheet.Features {
		if feature.Source == "srd" && feature.CanonicalIndex != nil {
			request.Features = append(request.Features, CharacterFeatureInput{Source: "srd", Index: *feature.CanonicalIndex})
		} else {
			request.Features = append(request.Features, CharacterFeatureInput{Source: "manual", ID: feature.ID, Name: feature.Name, Category: feature.Category, Description: feature.Description})
		}
	}
	return request
}

func sameAuthoritativeV2(actual, expected CharacterSheetV2) bool {
	if !reflect.DeepEqual(actual.AbilityScores, expected.AbilityScores) || !reflect.DeepEqual(actual.HitPointProgression, expected.HitPointProgression) || !reflect.DeepEqual(actual.Combat, expected.Combat) || !reflect.DeepEqual(actual.Attacks, expected.Attacks) || !reflect.DeepEqual(actual.Features, expected.Features) {
		return false
	}
	if (actual.Spellcasting == nil) != (expected.Spellcasting == nil) {
		return false
	}
	if actual.Spellcasting == nil {
		return true
	}
	left, right := *actual.Spellcasting, *expected.Spellcasting
	for index := range left.Slots {
		if index < len(right.Slots) {
			left.Slots[index].Used = 0
			right.Slots[index].Used = 0
		}
	}
	return reflect.DeepEqual(left, right)
}

func validResolvedAbilityConsistency(sheet CharacterSheetV2) bool {
	resolved := []ResolvedInt{
		sheet.AbilityScores.Scores.Strength, sheet.AbilityScores.Scores.Dexterity,
		sheet.AbilityScores.Scores.Constitution, sheet.AbilityScores.Scores.Intelligence,
		sheet.AbilityScores.Scores.Wisdom, sheet.AbilityScores.Scores.Charisma,
	}
	for _, value := range resolved {
		if value.Value < 1 || value.Value > 30 || !validProvenance(value.Provenance) {
			return false
		}
	}
	scores := AbilityScoresDTO{
		Strength: sheet.AbilityScores.Scores.Strength.Value, Dexterity: sheet.AbilityScores.Scores.Dexterity.Value,
		Constitution: sheet.AbilityScores.Scores.Constitution.Value, Intelligence: sheet.AbilityScores.Scores.Intelligence.Value,
		Wisdom: sheet.AbilityScores.Scores.Wisdom.Value, Charisma: sheet.AbilityScores.Scores.Charisma.Value,
	}
	if sheet.AbilityScores.Modifiers != (AbilityScoresDTO{
		Strength: AbilityModifier(scores.Strength), Dexterity: AbilityModifier(scores.Dexterity),
		Constitution: AbilityModifier(scores.Constitution), Intelligence: AbilityModifier(scores.Intelligence),
		Wisdom: AbilityModifier(scores.Wisdom), Charisma: AbilityModifier(scores.Charisma),
	}) {
		return false
	}
	provenances := []ValueProvenance{
		sheet.AbilityScores.Scores.Strength.Provenance, sheet.AbilityScores.Scores.Dexterity.Provenance,
		sheet.AbilityScores.Scores.Constitution.Provenance, sheet.AbilityScores.Scores.Intelligence.Provenance,
		sheet.AbilityScores.Scores.Wisdom.Provenance, sheet.AbilityScores.Scores.Charisma.Provenance,
	}
	if sheet.AbilityScores.Input.Mode == "imported" {
		if sheet.AbilityScores.Input.Values == nil || scores != *sheet.AbilityScores.Input.Values {
			return false
		}
		for _, provenance := range provenances {
			if provenance.Kind != "imported" {
				return false
			}
		}
		return true
	}
	if sheet.AbilityScores.Input.Mode != "calculated" || sheet.AbilityScores.Input.Base == nil {
		return false
	}
	expected := *sheet.AbilityScores.Input.Base
	if sheet.Identity.Race.Source == "srd" {
		creation, _ := rules.LoadCharacterCreation()
		raceIndex, subraceIndex := canonicalRaceAndSubrace(sheet.Identity.Race)
		race, _ := creation.FindRace(raceIndex)
		bonuses := append([]rules.AbilityBonusRule(nil), race.AbilityBonuses...)
		if subrace, ok := findSubrace(creation.Subraces, subraceIndex); ok {
			bonuses = append(bonuses, subrace.AbilityBonuses...)
		}
		for _, bonus := range bonuses {
			addAbilityBonus(&expected, bonus.Ability, bonus.Bonus)
		}
		for _, choice := range sheet.RuleChoices {
			if choice.RuleID == "half-elf-ability-bonuses" {
				for _, ability := range choice.OptionIDs {
					addAbilityBonus(&expected, ability, 1)
				}
			}
		}
	}
	if scores != expected {
		return false
	}
	for _, provenance := range provenances {
		if provenance.Kind != "calculated" {
			return false
		}
	}
	return true
}

func ValidateRuleChoices(context RuleChoiceValidationContext) []string {
	if context.Level < 1 || context.Level > 5 {
		return []string{"level is outside supported rules"}
	}
	creation, err := rules.LoadCharacterCreation()
	if err != nil {
		return []string{"character creation rules unavailable"}
	}
	levelRules, err := rules.Load()
	if err != nil {
		return []string{"level rules unavailable"}
	}
	var errors []string
	if hasDuplicateRuleChoices(context.Choices) {
		errors = append(errors, "rule choice IDs must be unique")
	}
	race, _ := creation.FindRace(context.RaceIndex)
	subrace, _ := findSubrace(creation.Subraces, context.SubraceIndex)
	traits := append([]string(nil), race.TraitIndexes...)
	traits = append(traits, subrace.TraitIndexes...)
	class, _ := findClass(levelRules.Classes, context.ClassIndex)
	activeFeatures := map[string]bool{}
	for _, level := range class.Levels {
		if level.Level <= context.Level {
			for _, feature := range level.Features {
				activeFeatures[feature.Index] = true
			}
		}
	}
	for _, choice := range context.Choices {
		for _, option := range choice.OptionIDs {
			activeFeatures[option] = true
		}
	}
	if context.RequireComplete {
		for _, raceChoice := range creation.RaceChoices {
			owned := raceChoice.SourceOwnerType == "race" && raceChoice.SourceOwnerIndex == race.Index ||
				raceChoice.SourceOwnerType == "race-trait" && v2Contains(traits, raceChoice.SourceOwnerIndex)
			if owned && !hasRuleChoice(context.Choices, raceChoice.ID) {
				errors = append(errors, raceChoice.ID+" is required for a complete canonical Race")
			}
		}
		for _, classChoice := range class.Choices {
			count := classChoice.SelectionCountByLevel[fmt.Sprint(context.Level)]
			if context.Level >= classChoice.FromLevel && count > 0 && !hasRuleChoice(context.Choices, classChoice.ID) {
				errors = append(errors, classChoice.ID+" is required for a complete canonical Class")
			}
		}
	}
	for _, choice := range context.Choices {
		var raceChoice *rules.RaceChoiceRule
		for index := range creation.RaceChoices {
			if creation.RaceChoices[index].ID == choice.RuleID {
				raceChoice = &creation.RaceChoices[index]
				break
			}
		}
		var classChoice *rules.Choice
		for index := range class.Choices {
			if class.Choices[index].ID == choice.RuleID {
				classChoice = &class.Choices[index]
				break
			}
		}
		if raceChoice == nil && classChoice == nil {
			errors = append(errors, choice.RuleID+" does not belong to the selected Race or Class")
			continue
		}
		if raceChoice != nil {
			ownsChoice := raceChoice.SourceOwnerType == "race" && raceChoice.SourceOwnerIndex == race.Index ||
				raceChoice.SourceOwnerType == "race-trait" && v2Contains(traits, raceChoice.SourceOwnerIndex)
			if !ownsChoice {
				errors = append(errors, choice.RuleID+" belongs to another Race")
			}
			errors = append(errors, validateChoiceSelection(choice, raceChoice.SelectionCount, raceChoice.AllowedOptionIndexes, stringValue(raceChoice.BoundedRule), false)...)
			if raceChoice.ExclusivityConstraint != nil && *raceChoice.ExclusivityConstraint == "distinct-options" && hasDuplicateStrings(choice.OptionIDs) {
				errors = append(errors, choice.RuleID+" requires distinct options")
			}
			if raceChoice.BoundedRule != nil && *raceChoice.BoundedRule == "any-srd-language-not-already-known" {
				for _, option := range choice.OptionIDs {
					if v2Contains(race.LanguageIndexes, option) {
						errors = append(errors, choice.RuleID+" must add a new language")
					}
				}
			}
		}
		if classChoice != nil {
			count := classChoice.SelectionCountByLevel[fmt.Sprint(context.Level)]
			if context.Level < classChoice.FromLevel || count == 0 {
				errors = append(errors, fmt.Sprintf("%s is unavailable at level %d", choice.RuleID, context.Level))
			}
			allowed := make([]string, 0, len(classChoice.Options))
			for _, option := range classChoice.Options {
				allowed = append(allowed, option.Index)
			}
			errors = append(errors, validateChoiceSelection(choice, count, allowed, "", classChoice.AllowManual)...)
			for _, optionID := range choice.OptionIDs {
				for _, option := range classChoice.Options {
					if option.Index == optionID && (option.MinimumLevel > context.Level || missingPrerequisite(option.RequiredFeatureIndexes, activeFeatures)) {
						errors = append(errors, optionID+" has an unmet prerequisite")
					}
				}
			}
		}
	}
	return errors
}

func validateChoiceSelection(choice RuleChoiceInput, count int, allowed []string, boundedRule string, allowManual bool) []string {
	var errors []string
	manualOnly := len(allowed) == 0 && boundedRule == "" && allowManual
	if manualOnly {
		if len(choice.OptionIDs) != 0 || !boundedText(choice.ManualNote, 1000) {
			errors = append(errors, choice.RuleID+" requires a bounded manual note")
		}
		return errors
	}
	if len(choice.OptionIDs) != count {
		errors = append(errors, fmt.Sprintf("%s must select exactly %d", choice.RuleID, count))
	}
	if hasDuplicateStrings(choice.OptionIDs) {
		errors = append(errors, choice.RuleID+" contains duplicate options")
	}
	bounded := allowed
	if boundedRule == "any-srd-skill-proficiency" {
		bounded = v2SkillOptions
	} else if boundedRule == "any-srd-language-not-already-known" {
		bounded = v2LanguageOptions
	}
	for _, option := range choice.OptionIDs {
		if !v2Contains(bounded, option) {
			errors = append(errors, choice.RuleID+" contains an unavailable option")
		}
	}
	if choice.ManualNote != "" && (!allowManual || !boundedText(choice.ManualNote, 1000)) {
		errors = append(errors, choice.RuleID+" does not allow that manual choice")
	}
	return errors
}

var v2SkillOptions = []string{"skill-acrobatics", "skill-animal-handling", "skill-arcana", "skill-athletics", "skill-deception", "skill-history", "skill-insight", "skill-intimidation", "skill-investigation", "skill-medicine", "skill-nature", "skill-perception", "skill-performance", "skill-persuasion", "skill-religion", "skill-sleight-of-hand", "skill-stealth", "skill-survival"}
var v2LanguageOptions = []string{"abyssal", "celestial", "common", "deep-speech", "draconic", "dwarvish", "elvish", "giant", "gnomish", "goblin", "halfling", "infernal", "orc", "primordial", "sylvan", "undercommon"}

func validateV2Identity(identity CharacterIdentityV2Input) []string {
	var errors []string
	if !boundedText(identity.Name, 200) || !oneOf(identity.Gender, "Male", "Female", "Other") || !boundedText(identity.Background, 200) || identity.Level < 1 || identity.Level > 5 {
		errors = append(errors, "identity is invalid")
	}
	if !validRuleSelection(identity.Race) || !validRuleSelection(identity.Class) || identity.Subclass != nil && !validRuleSelection(*identity.Subclass) {
		errors = append(errors, "identity rule selection is invalid")
	}
	creation, _ := rules.LoadCharacterCreation()
	levelRules, _ := rules.Load()
	raceIndex, _ := canonicalRaceAndSubrace(identity.Race)
	if identity.Race.Source == "srd" && raceIndex == "" {
		errors = append(errors, "canonical Race index is unknown")
	}
	var class rules.Class
	if identity.Class.Source == "srd" {
		var ok bool
		class, ok = findClass(levelRules.Classes, identity.Class.Index)
		if !ok {
			errors = append(errors, "canonical Class index is unknown")
		}
	}
	if identity.Subclass != nil && identity.Subclass.Source == "srd" {
		found := false
		for _, subclass := range class.Subclasses {
			if subclass.Index == identity.Subclass.Index && identity.Level >= class.SubclassDecisionLevel {
				found = true
			}
		}
		if !found {
			errors = append(errors, "canonical subclass is unavailable")
		}
	}
	if identity.Subclass != nil && identity.Class.Source == "srd" && identity.Level < class.SubclassDecisionLevel {
		errors = append(errors, "subclass is unavailable at this level")
	}
	if identity.Class.Source == "srd" && identity.Level >= class.SubclassDecisionLevel && identity.Subclass == nil {
		errors = append(errors, "subclass is required at this level")
	}
	_ = creation
	return errors
}

func validateSpellcastingForIdentity(request CreateCharacterV2RequestDTO) []string {
	if request.Identity.Class.Source != "srd" {
		if request.Spellcasting != nil {
			return []string{"manual Class cannot receive spellcasting automation"}
		}
		return nil
	}
	levelRules, _ := rules.Load()
	class, ok := findClass(levelRules.Classes, request.Identity.Class.Index)
	if !ok {
		return []string{"canonical Class index is unknown"}
	}
	level, ok := findLevel(class, request.Identity.Level)
	if !ok {
		return []string{"canonical Class level is unknown"}
	}
	if level.Spellcasting == nil {
		if request.Spellcasting != nil {
			return []string{"non-spellcasting Class cannot receive spell automation"}
		}
		return nil
	}
	if request.Spellcasting == nil {
		return []string{"spellcasting is required for this canonical Class level"}
	}
	creation, _ := rules.LoadCharacterCreation()
	subclassIndex := ""
	if request.Identity.Subclass != nil && request.Identity.Subclass.Source == "srd" {
		subclassIndex = request.Identity.Subclass.Index
	}
	for _, input := range request.Spellcasting.Spells {
		if input.Source == "manual" {
			continue
		}
		spell, ok := creation.FindSpellDetail(input.Index)
		if !ok || spell.Level > 0 && !v2ContainsInt(level.Spellcasting.AvailableSpellLevels, spell.Level) {
			return []string{"canonical spell is unavailable at this level"}
		}
		member := v2Contains(spell.ClassIndexes, class.Index)
		for _, membership := range spell.SubclassMemberships {
			if membership.ClassIndex == class.Index && membership.SubclassIndex == subclassIndex && membership.ClassLevel <= request.Identity.Level {
				member = true
			}
		}
		if !member {
			return []string{"canonical spell belongs to another Class or subclass"}
		}
	}
	return nil
}

func validateAbilityScoreInput(input AbilityScoreInput) []string {
	if input.Mode == "calculated" && input.Base != nil && input.Values == nil && input.Reason == "" && validAbilityScores(*input.Base) {
		return nil
	}
	if input.Mode == "imported" && input.Values != nil && input.Base == nil && boundedText(input.Reason, 1000) && validAbilityScores(*input.Values) {
		return nil
	}
	return []string{"abilityScores union is invalid"}
}

func validateHPProgression(input HitPointProgressionInput) []string {
	if len(input.LevelGains) > 4 {
		return []string{"hit point progression is excessive"}
	}
	seen := map[int]bool{}
	for _, gain := range input.LevelGains {
		if gain.Level < 2 || gain.Level > 5 || seen[gain.Level] || !oneOf(gain.Mode, "fixed-average", "rolled") || gain.Mode == "fixed-average" && gain.Roll != 0 || gain.Mode == "rolled" && (gain.Roll < 1 || gain.Roll > 20) {
			return []string{"hit point progression is invalid"}
		}
		seen[gain.Level] = true
	}
	if input.MaximumOverride != nil && (input.MaximumOverride.Value < 1 || input.MaximumOverride.Value > 9999 || !boundedText(input.MaximumOverride.Reason, 1000)) {
		return []string{"maximum hit point override is invalid"}
	}
	return nil
}

func validateSpellcastingInput(input CharacterSpellcastingInput) []string {
	if len(input.Spells) > 128 || len(input.PreparedSpellIDs) > 128 || len(input.SlotOverride) > 3 || hasDuplicateStrings(spellIDs(input.Spells)) || hasDuplicateStrings(input.PreparedSpellIDs) {
		return []string{"spellcasting arrays are invalid"}
	}
	creation, _ := rules.LoadCharacterCreation()
	ids := map[string]bool{}
	for _, spell := range input.Spells {
		id := spell.ID
		if spell.Source == "srd" {
			if _, ok := creation.FindSpellDetail(spell.Index); !ok || !v2Identifier.MatchString(spell.ID) || spell.Name != "" || spell.Description != "" {
				return []string{"canonical spell union is invalid"}
			}
		} else if spell.Source != "manual" || !v2Identifier.MatchString(spell.ID) || !boundedText(spell.Name, 200) || spell.Level < 0 || spell.Level > 3 || !boundedText(spell.School, 200) || !boundedText(spell.CastingTime, 200) || !boundedText(spell.Range, 200) || !boundedText(spell.Duration, 200) || !boundedText(spell.Description, 10000) || len(spell.Components) > 3 || spell.Index != "" {
			return []string{"manual spell union is invalid"}
		}
		if !oneOf(spell.State, "known", "prepared", "spellbook", "always-prepared") {
			return []string{"spell state is invalid"}
		}
		ids[id] = true
	}
	for _, id := range input.PreparedSpellIDs {
		if !ids[id] {
			return []string{"prepared spell does not resolve"}
		}
	}
	seenSlots := map[int]bool{}
	for _, slot := range input.SlotOverride {
		if slot.Level < 1 || slot.Level > 3 || seenSlots[slot.Level] || slot.Max < 0 || slot.Max > 99 || !boundedText(slot.Reason, 1000) {
			return []string{"spell slot override is invalid"}
		}
		seenSlots[slot.Level] = true
	}
	return nil
}

func validateFeatureInput(input CharacterFeatureInput) []string {
	if input.Source == "srd" && v2Identifier.MatchString(input.Index) && input.ID == "" && input.Name == "" && canonicalFeatureExists(input.Index) {
		return nil
	}
	if input.Source == "manual" && input.Index == "" && v2Identifier.MatchString(input.ID) && boundedText(input.Name, 200) && boundedText(input.Category, 200) && boundedText(input.Description, 5000) {
		return nil
	}
	return []string{"feature union is invalid"}
}

func canonicalFeatureExists(index string) bool {
	creation, _ := rules.LoadCharacterCreation()
	for _, trait := range creation.RaceTraits {
		if trait.Index == index {
			return true
		}
	}
	levelRules, _ := rules.Load()
	for _, class := range levelRules.Classes {
		for _, level := range class.Levels {
			for _, feature := range level.Features {
				if feature.Index == index {
					return true
				}
			}
		}
		for _, subclass := range class.Subclasses {
			for _, group := range subclass.FeaturesByLevel {
				for _, feature := range group.Features {
					if feature.Index == index {
						return true
					}
				}
			}
		}
	}
	return false
}

func validateEquipmentInput(input CharacterEquipmentInput) []string {
	creation, _ := rules.LoadCharacterCreation()
	if input.Quantity < 1 || input.Quantity > 999 {
		return []string{"equipment quantity is invalid"}
	}
	if input.Source == "srd" && input.ID == "" && input.Name == "" {
		if _, ok := creation.FindEquipment(input.Index); ok {
			return nil
		}
	}
	if input.Source == "manual" && input.Index == "" && v2Identifier.MatchString(input.ID) && boundedText(input.Name, 200) && boundedText(input.Category, 200) {
		return nil
	}
	return []string{"equipment union is invalid"}
}

func validateDefenseInput(input DefenseInput, equipment []CharacterEquipmentInput) []string {
	creation, _ := rules.LoadCharacterCreation()
	equipped := map[string]bool{}
	for _, item := range equipment {
		if item.Source == "srd" && item.Equipped {
			equipped[item.Index] = true
		}
	}
	if input.Mode == "manual" {
		if input.ArmorIndex != "" || input.ShieldIndex != "" || input.FormulaID != "" || input.ArmorClass < 0 || input.ArmorClass > 100 || !boundedText(input.Reason, 1000) {
			return []string{"manual defense is invalid"}
		}
		return nil
	}
	if input.Mode == "armor" {
		if input.FormulaID != "" || input.ArmorClass != 0 || input.Reason != "" {
			return []string{"armor defense contains cross-variant fields"}
		}
		armor, ok := creation.FindEquipment(input.ArmorIndex)
		if !ok || !equipped[input.ArmorIndex] || armor.Armor == nil || armor.Armor.Category == "Shield" {
			return []string{"armor defense requires equipped canonical armor"}
		}
		if input.ShieldIndex != "" {
			shield, ok := creation.FindEquipment(input.ShieldIndex)
			if !ok || !equipped[input.ShieldIndex] || shield.Armor == nil || shield.Armor.Category != "Shield" {
				return []string{"armor defense has invalid shield"}
			}
		}
		return nil
	}
	if input.Mode != "unarmored" || !oneOf(input.FormulaID, "standard-unarmored", "barbarian-unarmored-defense", "monk-unarmored-defense", "draconic-resilience") {
		return []string{"unarmored defense is invalid"}
	}
	if input.ArmorIndex != "" || input.ArmorClass != 0 || input.Reason != "" {
		return []string{"unarmored defense contains cross-variant fields"}
	}
	for _, item := range equipment {
		if item.Source == "srd" && item.Equipped {
			canonical, _ := creation.FindEquipment(item.Index)
			if canonical.Armor != nil && canonical.Armor.Category != "Shield" {
				return []string{"unarmored defense cannot wear armor"}
			}
		}
	}
	if input.ShieldIndex != "" {
		shield, ok := creation.FindEquipment(input.ShieldIndex)
		if !ok || !equipped[input.ShieldIndex] || shield.Armor == nil || shield.Armor.Category != "Shield" {
			return []string{"unarmored defense has invalid shield"}
		}
	}
	return nil
}

func validateCreateV2Semantics(request CreateCharacterV2RequestDTO) []string {
	manualRace := request.Identity.Race.Source == "manual"
	manualClass := request.Identity.Class.Source == "manual"
	if manualRace && (request.AbilityScores.Mode != "imported" || request.Combat.SpeedOverride == nil) {
		return []string{"manual Race requires imported ability scores and a speed override"}
	}
	if manualClass {
		if request.HitPointProgression.MaximumOverride == nil || len(request.HitPointProgression.LevelGains) != 0 || request.Spellcasting != nil {
			return []string{"manual Class requires maximum HP override and forbids Class automation"}
		}
		for _, attack := range request.Attacks {
			if attack.AttackBonus.Mode == "calculated" && attack.AttackBonus.Ability == "spellcasting" {
				return []string{"manual Class cannot use a spellcasting attack calculation"}
			}
		}
		if request.Combat.Defense.Mode == "unarmored" && request.Combat.Defense.FormulaID != "standard-unarmored" {
			return []string{"manual Class can use only standard unarmored defense"}
		}
	}
	levelData, _ := rules.Load()
	var class rules.Class
	if !manualClass {
		var ok bool
		class, ok = findClass(levelData.Classes, request.Identity.Class.Index)
		if !ok {
			return nil
		}
		if len(request.HitPointProgression.LevelGains) != request.Identity.Level-1 {
			return []string{"hit point gains must cover levels 2 through current level"}
		}
		for index, gain := range request.HitPointProgression.LevelGains {
			if gain.Level != index+2 || gain.Mode == "rolled" && gain.Roll > class.HitDie {
				return []string{"hit point gains must be ordered and Hit Die bounded"}
			}
		}
	}
	for _, attack := range request.Attacks {
		if attack.AttackBonus.Mode == "calculated" && attack.AttackBonus.Ability == "spellcasting" {
			if manualClass {
				return []string{"manual Class cannot use a spellcasting attack calculation"}
			}
			level, _ := findLevel(class, request.Identity.Level)
			if level.Spellcasting == nil {
				return []string{"spellcasting attack requires a spellcasting Class"}
			}
		}
	}
	if request.Combat.Defense.Mode == "unarmored" {
		if manualClass && request.Combat.Defense.FormulaID != "standard-unarmored" {
			return []string{"manual Class can use only standard unarmored defense"}
		}
		if request.Combat.Defense.FormulaID == "monk-unarmored-defense" && (class.Index != "monk" || request.Combat.Defense.ShieldIndex != "") {
			return []string{"Monk unarmored defense cannot use a shield"}
		}
		if request.Combat.Defense.FormulaID == "barbarian-unarmored-defense" && class.Index != "barbarian" {
			return []string{"Barbarian defense belongs to another Class"}
		}
		if request.Combat.Defense.FormulaID == "draconic-resilience" && !(class.Index == "sorcerer" && request.Identity.Subclass != nil && request.Identity.Subclass.Index == "draconic") {
			return []string{"Draconic Resilience is unavailable"}
		}
	}
	raceIndex, subraceIndex := canonicalRaceAndSubrace(request.Identity.Race)
	subclassIndex := ""
	if request.Identity.Subclass != nil && request.Identity.Subclass.Source == "srd" {
		subclassIndex = request.Identity.Subclass.Index
	}
	creation, _ := rules.LoadCharacterCreation()
	for _, feature := range request.Features {
		if feature.Source == "srd" {
			if _, _, _, _, ok := resolveV2Feature(levelData, creation, feature.Index, raceIndex, subraceIndex, class.Index, subclassIndex, request.Identity.Level); !ok {
				return []string{"canonical feature is not owned by the selected character"}
			}
		}
	}
	return nil
}

func inferV1ExpectedValues(raw json.RawMessage) (characterSheetExpectedValues, error) {
	var value struct {
		Identity struct {
			Name       string `json:"name"`
			Ancestry   string `json:"ancestry"`
			Background string `json:"background"`
			Classes    []struct {
				Name     string  `json:"name"`
				Level    int     `json:"level"`
				Subclass *string `json:"subclass"`
			} `json:"classes"`
		} `json:"identity"`
		Abilities struct {
			Scores AbilityScores `json:"scores"`
		} `json:"abilities"`
		Combat struct {
			HitPoints  HitPoints `json:"hitPoints"`
			ArmorClass struct {
				Value int `json:"value"`
			} `json:"armorClass"`
			Speed []struct {
				Feet int `json:"feet"`
			} `json:"speed"`
		} `json:"combat"`
	}
	if err := json.Unmarshal(raw, &value); err != nil || len(value.Identity.Classes) < 1 || len(value.Combat.Speed) != 1 {
		return characterSheetExpectedValues{}, fmt.Errorf("cannot infer V1 expected values")
	}
	class := value.Identity.Classes[0]
	totalLevel := 0
	for _, entry := range value.Identity.Classes {
		totalLevel += entry.Level
	}
	return characterSheetExpectedValues{
		Name: value.Identity.Name, Ancestry: value.Identity.Ancestry, Background: value.Identity.Background,
		ClassName: class.Name, SubclassName: class.Subclass, Level: totalLevel, AbilityScores: value.Abilities.Scores,
		HitPoints: value.Combat.HitPoints, ArmorClass: value.Combat.ArmorClass.Value, SpeedFt: value.Combat.Speed[0].Feet,
	}, nil
}

func strictDecodeJSON(raw []byte, destination any) error {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		return err
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return fmt.Errorf("expected one JSON value")
	}
	return nil
}

var v2RequestFields = []string{"schemaVersion", "creationSource", "identity", "abilityScores", "proficiencies", "hitPointProgression", "combat", "ruleChoices", "attacks", "spellcasting", "features", "equipment", "other"}
var v2SheetFields = []string{"schemaVersion", "ruleset", "creationSource", "identity", "abilityScores", "proficiencies", "hitPointProgression", "combat", "ruleChoices", "attacks", "spellcasting", "features", "equipment", "other", "summary"}

func validateCreateV2RawKeys(raw []byte) bool {
	var root map[string]any
	if json.Unmarshal(raw, &root) != nil {
		return false
	}
	identity, ok := rawObject(root["identity"])
	if !ok || !rawExact(identity, []string{"name", "gender", "race", "background", "class", "level", "subclass"}, nil) || !rawSelection(identity["race"]) || !rawSelection(identity["class"]) || identity["subclass"] != nil && !rawSelection(identity["subclass"]) {
		return false
	}
	ability, ok := rawObject(root["abilityScores"])
	if !ok || !(rawExact(ability, []string{"mode", "base"}, nil) || rawExact(ability, []string{"mode", "values", "reason"}, nil)) {
		return false
	}
	hp, ok := rawObject(root["hitPointProgression"])
	if !ok || !rawExact(hp, []string{"levelGains"}, []string{"maximumOverride"}) {
		return false
	}
	for _, item := range rawArray(hp["levelGains"]) {
		gain, ok := rawObject(item)
		if !ok || !(rawExact(gain, []string{"level", "mode"}, nil) || rawExact(gain, []string{"level", "mode", "roll"}, nil)) {
			return false
		}
	}
	combat, ok := rawObject(root["combat"])
	if !ok || !rawExact(combat, []string{"defense"}, []string{"initiativeOverride", "passivePerceptionOverride", "speedOverride"}) || !rawDefense(combat["defense"]) {
		return false
	}
	for _, item := range rawArray(root["ruleChoices"]) {
		value, ok := rawObject(item)
		if !ok || !rawExact(value, []string{"ruleId", "optionIds"}, []string{"manualNote"}) {
			return false
		}
	}
	for _, item := range rawArray(root["attacks"]) {
		value, ok := rawObject(item)
		if !ok || !rawExact(value, []string{"id", "name", "attackBonus", "damage"}, nil) {
			return false
		}
		bonus, ok := rawObject(value["attackBonus"])
		if !ok || !(rawExact(bonus, []string{"mode", "ability", "proficient"}, nil) || rawExact(bonus, []string{"mode", "value", "reason"}, nil)) {
			return false
		}
		for _, damageItem := range rawArray(value["damage"]) {
			damage, ok := rawObject(damageItem)
			if !ok || !rawExact(damage, []string{"dice", "bonus", "type"}, nil) {
				return false
			}
		}
	}
	if root["spellcasting"] != nil {
		value, ok := rawObject(root["spellcasting"])
		if !ok || !rawExact(value, []string{"spells", "preparedSpellIds"}, []string{"slotOverride"}) {
			return false
		}
		for _, item := range rawArray(value["spells"]) {
			spell, ok := rawObject(item)
			if !ok || !(rawExact(spell, []string{"id", "source", "index", "state"}, nil) || rawExact(spell, []string{"id", "source", "name", "level", "school", "castingTime", "range", "components", "duration", "concentration", "ritual", "description", "state"}, []string{"materialComponent", "higherLevelText"})) {
				return false
			}
		}
		for _, item := range rawArray(value["slotOverride"]) {
			slot, ok := rawObject(item)
			if !ok || !rawExact(slot, []string{"level", "max", "reason"}, nil) {
				return false
			}
		}
	}
	for _, item := range rawArray(root["features"]) {
		value, ok := rawObject(item)
		if !ok || !(rawExact(value, []string{"source", "index"}, nil) || rawExact(value, []string{"source", "id", "name", "category", "description"}, nil)) {
			return false
		}
	}
	for _, item := range rawArray(root["equipment"]) {
		value, ok := rawObject(item)
		if !ok || !(rawExact(value, []string{"source", "index", "quantity", "equipped"}, nil) || rawExact(value, []string{"source", "id", "name", "category", "quantity", "equipped"}, nil)) {
			return false
		}
	}
	return true
}

func validateSheetV2RawKeys(raw []byte) bool {
	var root map[string]any
	if json.Unmarshal(raw, &root) != nil {
		return false
	}
	identity, ok := rawObject(root["identity"])
	if !ok || !rawExact(identity, []string{"name", "gender", "race", "background", "class", "level", "subclass"}, nil) || !rawSelection(identity["race"]) || !rawSelection(identity["class"]) || identity["subclass"] != nil && !rawSelection(identity["subclass"]) {
		return false
	}
	ability, ok := rawObject(root["abilityScores"])
	if !ok || !rawExact(ability, []string{"input", "scores", "modifiers"}, nil) {
		return false
	}
	input, ok := rawObject(ability["input"])
	if !ok || !(rawExact(input, []string{"mode", "base"}, nil) || rawExact(input, []string{"mode", "values", "reason"}, nil)) {
		return false
	}
	scores, ok := rawObject(ability["scores"])
	if !ok || !rawExact(scores, []string{"strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"}, nil) {
		return false
	}
	for _, value := range scores {
		if !rawResolved(value) {
			return false
		}
	}
	hp, ok := rawObject(root["hitPointProgression"])
	if !ok || !rawExact(hp, []string{"levelGains", "maximum"}, []string{"maximumOverride"}) || !rawResolved(hp["maximum"]) {
		return false
	}
	for _, item := range rawArray(hp["levelGains"]) {
		gain, ok := rawObject(item)
		if !ok || !(rawExact(gain, []string{"level", "mode"}, nil) || rawExact(gain, []string{"level", "mode", "roll"}, nil)) {
			return false
		}
	}
	for _, item := range rawArray(root["ruleChoices"]) {
		value, ok := rawObject(item)
		if !ok || !rawExact(value, []string{"ruleId", "optionIds"}, []string{"manualNote"}) {
			return false
		}
	}
	for _, item := range rawArray(root["equipment"]) {
		value, ok := rawObject(item)
		if !ok || !(rawExact(value, []string{"source", "index", "quantity", "equipped"}, nil) || rawExact(value, []string{"source", "id", "name", "category", "quantity", "equipped"}, nil)) {
			return false
		}
	}
	combat, ok := rawObject(root["combat"])
	if !ok || !rawExact(combat, []string{"defense", "proficiencyBonus", "initiative", "passivePerception", "speedFt", "armorClass"}, nil) || !rawDefense(combat["defense"]) {
		return false
	}
	for _, key := range []string{"proficiencyBonus", "initiative", "passivePerception", "speedFt", "armorClass"} {
		if !rawResolved(combat[key]) {
			return false
		}
	}
	for _, item := range rawArray(root["attacks"]) {
		value, ok := rawObject(item)
		if !ok || !rawExact(value, []string{"id", "name", "attackBonus", "attackBonusInput", "damage"}, nil) || !rawResolved(value["attackBonus"]) {
			return false
		}
		if value["attackBonusInput"] != nil {
			input, ok := rawObject(value["attackBonusInput"])
			if !ok || !rawExact(input, []string{"ability", "proficient"}, nil) {
				return false
			}
		}
	}
	if root["spellcasting"] != nil {
		value, ok := rawObject(root["spellcasting"])
		if !ok || !rawExact(value, []string{"ability", "spellSaveDC", "spellAttackBonus", "slots", "availableSpellLevels", "spells", "preparedSpellIds"}, nil) {
			return false
		}
		for _, item := range rawArray(value["spells"]) {
			spell, ok := rawObject(item)
			if !ok || !rawExact(spell, []string{"id", "canonicalIndex", "name", "level", "school", "castingTime", "range", "components", "materialComponent", "duration", "concentration", "ritual", "description", "higherLevelText", "state", "provenance"}, nil) || !rawProvenance(spell["provenance"]) {
				return false
			}
		}
	}
	for _, item := range rawArray(root["features"]) {
		feature, ok := rawObject(item)
		if !ok || feature["source"] == "srd" && !rawExact(feature, []string{"id", "source", "canonicalIndex", "ownerKind", "name", "category", "description", "provenance"}, nil) ||
			feature["source"] == "manual" && !rawExact(feature, []string{"id", "source", "canonicalIndex", "name", "category", "description", "provenance"}, nil) ||
			feature["source"] != "srd" && feature["source"] != "manual" || !rawProvenance(feature["provenance"]) {
			return false
		}
	}
	return true
}

func rawSelection(value any) bool {
	object, ok := rawObject(value)
	return ok && (rawExact(object, []string{"source", "index"}, nil) || rawExact(object, []string{"source", "name"}, nil))
}
func rawDefense(value any) bool {
	object, ok := rawObject(value)
	return ok && (rawExact(object, []string{"mode", "armorIndex"}, []string{"shieldIndex"}) || rawExact(object, []string{"mode", "formulaId"}, []string{"shieldIndex"}) || rawExact(object, []string{"mode", "armorClass", "reason"}, nil))
}
func rawResolved(value any) bool {
	object, ok := rawObject(value)
	return ok && rawExact(object, []string{"value", "provenance"}, nil) && rawProvenance(object["provenance"])
}
func rawProvenance(value any) bool {
	object, ok := rawObject(value)
	return ok && (rawExact(object, []string{"kind", "ruleId"}, nil) || rawExact(object, []string{"kind", "reason"}, nil) || rawExact(object, []string{"kind"}, []string{"note"}))
}
func rawObject(value any) (map[string]any, bool) {
	object, ok := value.(map[string]any)
	return object, ok
}
func rawArray(value any) []any { array, _ := value.([]any); return array }
func rawExact(value map[string]any, required, optional []string) bool {
	if len(value) < len(required) || len(value) > len(required)+len(optional) {
		return false
	}
	allowed := map[string]bool{}
	for _, key := range required {
		allowed[key] = true
		if _, ok := value[key]; !ok {
			return false
		}
	}
	for _, key := range optional {
		allowed[key] = true
	}
	for key := range value {
		if !allowed[key] {
			return false
		}
	}
	return true
}

func hasExactRequiredJSONFields(raw []byte, required []string) bool {
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil || len(fields) != len(required) {
		return false
	}
	for _, field := range required {
		if _, ok := fields[field]; !ok {
			return false
		}
	}
	return true
}

func canonicalRaceAndSubrace(selection RuleSelection) (string, string) {
	if selection.Source != "srd" {
		return "", ""
	}
	creation, _ := rules.LoadCharacterCreation()
	if _, ok := creation.FindRace(selection.Index); ok {
		return selection.Index, ""
	}
	if subrace, ok := findSubrace(creation.Subraces, selection.Index); ok {
		return subrace.RaceIndex, subrace.Index
	}
	return "", ""
}

func validRuleSelection(selection RuleSelection) bool {
	return selection.Source == "srd" && v2Identifier.MatchString(selection.Index) && selection.Name == "" ||
		selection.Source == "manual" && selection.Index == "" && boundedText(selection.Name, 200)
}

func validAbilityScores(scores AbilityScoresDTO) bool {
	return scores.Strength >= 1 && scores.Strength <= 30 && scores.Dexterity >= 1 && scores.Dexterity <= 30 &&
		scores.Constitution >= 1 && scores.Constitution <= 30 && scores.Intelligence >= 1 && scores.Intelligence <= 30 &&
		scores.Wisdom >= 1 && scores.Wisdom <= 30 && scores.Charisma >= 1 && scores.Charisma <= 30
}

func validProvenance(value ValueProvenance) bool {
	return value.Kind == "calculated" && v2Identifier.MatchString(value.RuleID) && value.Reason == "" ||
		value.Kind == "manual-override" && boundedText(value.Reason, 1000) && value.RuleID == "" ||
		value.Kind == "imported" && value.RuleID == "" && value.Reason == "" && (value.Note == "" || boundedText(value.Note, 1000))
}

func boundedText(value string, maximum int) bool {
	return strings.TrimSpace(value) != "" && utf8.RuneCountInString(strings.TrimSpace(value)) <= maximum
}

func oneOf(value string, allowed ...string) bool {
	for _, candidate := range allowed {
		if value == candidate {
			return true
		}
	}
	return false
}

func hasDuplicateStrings(values []string) bool {
	seen := map[string]bool{}
	for _, value := range values {
		if seen[value] {
			return true
		}
		seen[value] = true
	}
	return false
}

func hasDuplicateRuleChoices(values []RuleChoiceInput) bool {
	return hasDuplicateStrings(ruleChoiceIDs(values))
}
func hasRuleChoice(values []RuleChoiceInput, id string) bool {
	for _, value := range values {
		if value.RuleID == id {
			return true
		}
	}
	return false
}
func ruleChoiceIDs(values []RuleChoiceInput) []string {
	result := make([]string, len(values))
	for i, value := range values {
		result[i] = value.RuleID
	}
	return result
}
func skillNames(values []CharacterSkillInput) []string {
	result := make([]string, len(values))
	for i, value := range values {
		result[i] = value.Name
	}
	return result
}
func attackIDs(values []CharacterAttackInput) []string {
	result := make([]string, len(values))
	for i, value := range values {
		result[i] = value.ID
	}
	return result
}
func spellIDs(values []CharacterSpellInput) []string {
	result := make([]string, len(values))
	for i, value := range values {
		if value.Source == "srd" {
			result[i] = value.Index
		} else {
			result[i] = value.ID
		}
	}
	return result
}
func featureIDs(values []CharacterFeatureInput) []string {
	result := make([]string, len(values))
	for i, value := range values {
		if value.Source == "srd" {
			result[i] = value.Index
		} else {
			result[i] = value.ID
		}
	}
	return result
}
func v2SheetFeatureIDs(values []CharacterSheetV2Feature) []string {
	result := make([]string, len(values))
	for i, value := range values {
		result[i] = value.ID
	}
	return result
}
func equipmentIDs(values []CharacterEquipmentInput) []string {
	result := make([]string, len(values))
	for i, value := range values {
		if value.Source == "srd" {
			result[i] = value.Index
		} else {
			result[i] = value.ID
		}
	}
	return result
}
func otherIDs(values []CharacterOtherInput) []string {
	result := make([]string, len(values))
	for i, value := range values {
		result[i] = value.ID
	}
	return result
}
func v2SheetAttackIDs(values []CharacterSheetV2Attack) []string {
	result := make([]string, len(values))
	for index, value := range values {
		result[index] = value.ID
	}
	return result
}
func missingPrerequisite(required []string, active map[string]bool) bool {
	for _, value := range required {
		if !active[value] {
			return true
		}
	}
	return false
}
func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
