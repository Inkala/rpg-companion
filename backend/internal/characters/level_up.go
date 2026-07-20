package characters

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	levelrules "github.com/Inkala/rpg-companion/backend/internal/rules"
)

var (
	ErrLevelUpConflict    = errors.New("character level-up conflict")
	ErrLevelUpUnsupported = errors.New("character cannot be leveled up")
)

const (
	proficiencyOverrideAuditEntry = "Level-up proficiency bonus uses a player-confirmed manual override."
	initiativeOverrideAuditEntry  = "Level-up initiative uses a player-confirmed manual override."
)

var standardSkillAbilities = map[string]string{
	"acrobatics":      "dexterity",
	"animal handling": "wisdom",
	"arcana":          "intelligence",
	"athletics":       "strength",
	"deception":       "charisma",
	"history":         "intelligence",
	"insight":         "wisdom",
	"intimidation":    "charisma",
	"investigation":   "intelligence",
	"medicine":        "wisdom",
	"nature":          "intelligence",
	"perception":      "wisdom",
	"performance":     "charisma",
	"persuasion":      "charisma",
	"religion":        "intelligence",
	"sleight of hand": "dexterity",
	"stealth":         "dexterity",
	"survival":        "wisdom",
}

type levelUpRequest struct {
	ExpectedUpdatedAt       string                    `json:"expectedUpdatedAt"`
	HP                      *levelUpHPInput           `json:"hp"`
	CurrentHP               *levelUpCurrentHPInput    `json:"currentHp"`
	PrerequisiteChoices     []levelUpClassChoiceInput `json:"prerequisiteChoices"`
	Subclass                *levelUpSubclassInput     `json:"subclass"`
	AbilityScoreImprovement *levelUpASIInput          `json:"abilityScoreImprovement"`
	Spells                  *levelUpSpellChangesInput `json:"spells"`
	ClassChoices            []levelUpClassChoiceInput `json:"classChoices"`
	Overrides               *levelUpOverrideInput     `json:"overrides"`
	DecisionSummary         []string                  `json:"decisionSummary"`
}

type levelUpHPInput struct {
	Mode string `json:"mode"`
	Roll *int   `json:"roll"`
}

type levelUpCurrentHPInput struct {
	Mode  string `json:"mode"`
	Value *int   `json:"value"`
}

type levelUpSubclassInput struct {
	Source string `json:"source"`
	Index  string `json:"index"`
	Name   string `json:"name"`
}

type levelUpASIInput struct {
	Mode      string         `json:"mode"`
	Increases map[string]int `json:"increases"`
	Note      string         `json:"note"`
}

type levelUpClassChoiceInput struct {
	RuleID     string   `json:"ruleId"`
	OptionIDs  []string `json:"optionIds"`
	ManualNote string   `json:"manualNote"`
}

type levelUpSpellChoiceInput struct {
	Source string `json:"source"`
	Index  string `json:"index"`
}

type levelUpSpellReplacementInput struct {
	RemoveSpellID string                  `json:"removeSpellId"`
	Add           levelUpSpellChoiceInput `json:"add"`
}

type levelUpSpellChangesInput struct {
	Additions                []levelUpSpellChoiceInput      `json:"additions"`
	Replacements             []levelUpSpellReplacementInput `json:"replacements"`
	PreparedSpellIDs         []string                       `json:"preparedSpellIds"`
	WizardSpellbookAdditions []levelUpSpellChoiceInput      `json:"wizardSpellbookAdditions"`
}

type levelUpOverrideInput struct {
	ProficiencyBonus  *int `json:"proficiencyBonus"`
	Initiative        *int `json:"initiative"`
	PassivePerception *int `json:"passivePerception"`
	SpellSaveDC       *int `json:"spellSaveDC"`
	SpellAttackBonus  *int `json:"spellAttackBonus"`
}

func validateLevelUpRequest(request levelUpRequest) (time.Time, error) {
	expected, err := time.Parse(time.RFC3339Nano, request.ExpectedUpdatedAt)
	if err != nil || request.HP == nil || request.CurrentHP == nil || request.PrerequisiteChoices == nil || request.ClassChoices == nil || request.DecisionSummary == nil {
		return time.Time{}, ErrLevelUpUnsupported
	}
	if len(request.PrerequisiteChoices) > 16 || len(request.ClassChoices) > 16 || len(request.DecisionSummary) > 16 {
		return time.Time{}, ErrLevelUpUnsupported
	}
	for _, summary := range request.DecisionSummary {
		trimmed := strings.TrimSpace(summary)
		if trimmed == "" || utf8.RuneCountInString(trimmed) > 200 {
			return time.Time{}, ErrLevelUpUnsupported
		}
	}
	if request.HP.Mode == "fixed-average" {
		if request.HP.Roll != nil {
			return time.Time{}, ErrLevelUpUnsupported
		}
	} else if request.HP.Mode != "rolled" || request.HP.Roll == nil {
		return time.Time{}, ErrLevelUpUnsupported
	}
	if request.CurrentHP.Mode == "manual" {
		if request.CurrentHP.Value == nil || *request.CurrentHP.Value < 0 || *request.CurrentHP.Value > maxHitPoints {
			return time.Time{}, ErrLevelUpUnsupported
		}
	} else if (request.CurrentHP.Mode != "increase-by-gain" && request.CurrentHP.Mode != "retain") || request.CurrentHP.Value != nil {
		return time.Time{}, ErrLevelUpUnsupported
	}
	for _, choices := range [][]levelUpClassChoiceInput{request.PrerequisiteChoices, request.ClassChoices} {
		for _, choice := range choices {
			if !isValidPortraitAssetID(choice.RuleID) || len(choice.OptionIDs) > 8 || utf8.RuneCountInString(strings.TrimSpace(choice.ManualNote)) > 1000 {
				return time.Time{}, ErrLevelUpUnsupported
			}
			if len(choice.OptionIDs) == 0 && strings.TrimSpace(choice.ManualNote) == "" {
				return time.Time{}, ErrLevelUpUnsupported
			}
			if err := validateUniqueChoiceOptionIDs(choice.OptionIDs); err != nil {
				return time.Time{}, err
			}
		}
	}
	if request.Spells != nil {
		if request.Spells.Additions == nil || request.Spells.Replacements == nil || request.Spells.PreparedSpellIDs == nil || request.Spells.WizardSpellbookAdditions == nil ||
			len(request.Spells.Additions) > 16 || len(request.Spells.Replacements) > 16 || len(request.Spells.PreparedSpellIDs) > 32 || len(request.Spells.WizardSpellbookAdditions) > 2 {
			return time.Time{}, ErrLevelUpUnsupported
		}
		seenPrepared := map[string]struct{}{}
		for _, id := range request.Spells.PreparedSpellIDs {
			if !isValidPortraitAssetID(id) {
				return time.Time{}, ErrLevelUpUnsupported
			}
			if _, exists := seenPrepared[id]; exists {
				return time.Time{}, ErrLevelUpUnsupported
			}
			seenPrepared[id] = struct{}{}
		}
		for _, choice := range append(append([]levelUpSpellChoiceInput{}, request.Spells.Additions...), request.Spells.WizardSpellbookAdditions...) {
			if choice.Source != "srd" || !isValidPortraitAssetID(choice.Index) {
				return time.Time{}, ErrLevelUpUnsupported
			}
		}
		for _, replacement := range request.Spells.Replacements {
			if !isValidPortraitAssetID(replacement.RemoveSpellID) || replacement.Add.Source != "srd" || !isValidPortraitAssetID(replacement.Add.Index) {
				return time.Time{}, ErrLevelUpUnsupported
			}
		}
	}
	return expected.UTC(), nil
}

func validateUniqueChoiceOptionIDs(optionIDs []string) error {
	seen := make(map[string]struct{}, len(optionIDs))
	for _, optionID := range optionIDs {
		if !isValidPortraitAssetID(optionID) {
			return ErrLevelUpUnsupported
		}
		if _, exists := seen[optionID]; exists {
			return ErrLevelUpUnsupported
		}
		seen[optionID] = struct{}{}
	}
	return nil
}

func hasManualLevelUpOverrides(overrides *levelUpOverrideInput) bool {
	return overrides != nil && (overrides.ProficiencyBonus != nil || overrides.Initiative != nil || overrides.PassivePerception != nil || overrides.SpellSaveDC != nil || overrides.SpellAttackBonus != nil)
}

func buildLeveledCharacter(character Character, request levelUpRequest) (Character, error) {
	if validateStoredCharacterForPartyGM(character) != nil {
		return Character{}, ErrLevelUpUnsupported
	}
	parsed, err := parseStoredCharacter(character)
	if err != nil {
		return Character{}, ErrLevelUpUnsupported
	}
	if parsed.V2 != nil {
		return buildLeveledCharacterV2(character, *parsed.V2, request)
	}

	var sheet map[string]any
	if err := json.Unmarshal(character.ReferencePayload, &sheet); err != nil {
		return Character{}, ErrLevelUpUnsupported
	}
	identity, ok := objectField(sheet, "identity")
	if !ok {
		return Character{}, ErrLevelUpUnsupported
	}
	classes, ok := arrayField(identity, "classes")
	if !ok || len(classes) != 1 {
		return Character{}, ErrLevelUpUnsupported
	}
	classEntry, ok := classes[0].(map[string]any)
	if !ok {
		return Character{}, ErrLevelUpUnsupported
	}
	classRule, ok := levelrules.FindClass(character.ClassName)
	if !ok || !strings.EqualFold(stringField(classEntry, "name"), character.ClassName) {
		return Character{}, ErrLevelUpUnsupported
	}
	currentLevel, ok := intField(classEntry, "level")
	if !ok || currentLevel != character.Level || !levelrules.SupportsTransition(currentLevel, currentLevel+1) {
		return Character{}, ErrLevelUpUnsupported
	}
	targetLevel := currentLevel + 1
	targetRule := classRule.Levels[targetLevel-1]

	result := character
	result.ReferencePayload = append(json.RawMessage(nil), character.ReferencePayload...)
	if err := json.Unmarshal(result.ReferencePayload, &sheet); err != nil {
		return Character{}, ErrLevelUpUnsupported
	}
	identity, _ = objectField(sheet, "identity")
	classes, _ = arrayField(identity, "classes")
	classEntry = classes[0].(map[string]any)

	manualContent := hasManualLevelUpOverrides(request.Overrides)
	canonicalSubclass := ""
	recoveredCanonicalSubclass := false
	if result.SubclassName != nil {
		canonicalSubclass = matchingSubclassIndex(classRule, *result.SubclassName)
	}
	if targetLevel >= classRule.SubclassDecisionLevel && result.SubclassName == nil {
		if request.Subclass == nil {
			return Character{}, ErrLevelUpUnsupported
		}
		var subclassName string
		switch request.Subclass.Source {
		case "srd":
			if request.Subclass.Name != "" || len(classRule.Subclasses) != 1 || request.Subclass.Index != classRule.Subclasses[0].Index {
				return Character{}, ErrLevelUpUnsupported
			}
			subclassName = classRule.Subclasses[0].Name
			canonicalSubclass = classRule.Subclasses[0].Index
			recoveredCanonicalSubclass = true
		case "manual":
			subclassName = strings.TrimSpace(request.Subclass.Name)
			if request.Subclass.Index != "" || subclassName == "" || utf8.RuneCountInString(subclassName) > maxCharacterCoreRunes {
				return Character{}, ErrLevelUpUnsupported
			}
			manualContent = true
		default:
			return Character{}, ErrLevelUpUnsupported
		}
		result.SubclassName = &subclassName
		classEntry["subclass"] = subclassName
	} else if request.Subclass != nil {
		return Character{}, ErrLevelUpUnsupported
	}

	features, ok := arrayField(sheet, "features")
	if !ok {
		return Character{}, ErrLevelUpUnsupported
	}
	choiceInputs := append(append([]levelUpClassChoiceInput{}, request.PrerequisiteChoices...), request.ClassChoices...)
	choiceByID := map[string]levelUpClassChoiceInput{}
	for _, choice := range choiceInputs {
		if _, exists := choiceByID[choice.RuleID]; exists {
			return Character{}, ErrLevelUpUnsupported
		}
		choiceByID[choice.RuleID] = choice
	}
	applicableChoiceIDs := map[string]struct{}{}
	for _, choiceRule := range classRule.Choices {
		if choiceRule.FromLevel > targetLevel {
			continue
		}
		applicableChoiceIDs[choiceRule.ID] = struct{}{}
		count := choiceRule.SelectionCountByLevel[strconv.Itoa(targetLevel)]
		if featureChoiceAlreadyPresent(features, choiceRule, count) {
			continue
		}
		input, exists := choiceByID[choiceRule.ID]
		if !exists {
			return Character{}, ErrLevelUpUnsupported
		}
		if err := validateAndAppendClassChoice(&features, classRule, choiceRule, input, count, targetLevel); err != nil {
			return Character{}, ErrLevelUpUnsupported
		}
		if strings.TrimSpace(input.ManualNote) != "" {
			manualContent = true
		}
	}
	for ruleID := range choiceByID {
		if _, exists := applicableChoiceIDs[ruleID]; !exists {
			return Character{}, ErrLevelUpUnsupported
		}
	}

	priorConstitutionModifier := abilityModifier(result.AbilityScores.Constitution)
	if targetRule.AbilityScoreImprovement {
		if request.AbilityScoreImprovement == nil {
			return Character{}, ErrLevelUpUnsupported
		}
		if request.AbilityScoreImprovement.Mode == "ability-scores" {
			if err := applyASI(&result.AbilityScores, request.AbilityScoreImprovement); err != nil {
				return Character{}, ErrLevelUpUnsupported
			}
		} else if request.AbilityScoreImprovement.Mode == "feat-note" {
			note := strings.TrimSpace(request.AbilityScoreImprovement.Note)
			if request.AbilityScoreImprovement.Increases != nil || note == "" || utf8.RuneCountInString(note) > 1000 {
				return Character{}, ErrLevelUpUnsupported
			}
			features = appendUniqueFeature(features, manualFeature("level-4-feat-note", "Level 4 feat", note))
			manualContent = true
		} else {
			return Character{}, ErrLevelUpUnsupported
		}
	} else if request.AbilityScoreImprovement != nil {
		return Character{}, ErrLevelUpUnsupported
	}

	hitDieResult := classRule.FixedAverageHP
	if request.HP.Mode == "rolled" {
		if request.HP.Roll == nil || *request.HP.Roll < 1 || *request.HP.Roll > classRule.HitDie {
			return Character{}, ErrLevelUpUnsupported
		}
		hitDieResult = *request.HP.Roll
	}
	resultingConstitutionModifier := abilityModifier(result.AbilityScores.Constitution)
	newLevelGain := hitDieResult + resultingConstitutionModifier
	if newLevelGain < 1 {
		newLevelGain = 1
	}
	retroactiveConstitutionGain := (resultingConstitutionModifier - priorConstitutionModifier) * currentLevel
	completeHPIncrease := newLevelGain + retroactiveConstitutionGain
	newMax := result.HitPoints.Max + completeHPIncrease
	if completeHPIncrease < 1 || newMax > maxHitPoints {
		return Character{}, ErrLevelUpUnsupported
	}
	newCurrent := result.HitPoints.Current
	switch request.CurrentHP.Mode {
	case "increase-by-gain":
		newCurrent = min(result.HitPoints.Current+completeHPIncrease, newMax)
	case "retain":
		newCurrent = min(result.HitPoints.Current, newMax)
	case "manual":
		newCurrent = *request.CurrentHP.Value
	}
	if newCurrent > newMax {
		return Character{}, ErrLevelUpUnsupported
	}
	result.HitPoints = HitPoints{Current: newCurrent, Max: newMax}

	for _, feature := range targetRule.Features {
		features = appendUniqueFeature(features, canonicalFeature(classRule.Name+" feature", feature))
	}
	if canonicalSubclass != "" {
		for _, subclass := range classRule.Subclasses {
			if subclass.Index != canonicalSubclass {
				continue
			}
			for _, featureLevel := range subclass.FeaturesByLevel {
				if featureLevel.Level == targetLevel || (recoveredCanonicalSubclass && featureLevel.Level <= targetLevel) {
					for _, feature := range featureLevel.Features {
						features = appendUniqueFeature(features, canonicalFeature(subclass.Name+" feature", feature))
					}
				}
			}
		}
	}
	if len(features) > 64 {
		return Character{}, ErrLevelUpUnsupported
	}
	sheet["features"] = features

	classEntry["level"] = targetLevel
	result.Level = targetLevel
	if err := syncSheetCore(sheet, &result, character, classRule.Levels[currentLevel-1].ProficiencyBonus, targetRule, request.Overrides); err != nil {
		return Character{}, ErrLevelUpUnsupported
	}
	if err := applyLevelUpSpellcasting(sheet, &result, classRule, targetRule, canonicalSubclass, request.Spells, request.Overrides); err != nil {
		return Character{}, fmt.Errorf("%w: spellcasting: %v", ErrLevelUpUnsupported, err)
	}
	if manualContent {
		ruleset, _ := objectField(sheet, "ruleset")
		ruleset["sourceStatus"] = "needs-audit"
	}
	if err := appendLevelUpAudit(sheet, currentLevel, targetLevel, request.DecisionSummary); err != nil {
		return Character{}, ErrLevelUpUnsupported
	}
	updatedPayload, err := json.Marshal(sheet)
	if err != nil || len(updatedPayload) > maxV1ReferencePayloadBytes {
		return Character{}, ErrLevelUpUnsupported
	}
	result.ReferencePayload = updatedPayload
	if validateStoredCharacterForPartyGM(result) != nil {
		return Character{}, fmt.Errorf("%w: resulting CharacterSheetV1 validation", ErrLevelUpUnsupported)
	}
	return result, nil
}

func syncSheetCore(sheet map[string]any, result *Character, prior Character, priorCanonicalProficiency int, target levelrules.Level, overrides *levelUpOverrideInput) error {
	abilities, ok := objectField(sheet, "abilities")
	if !ok {
		return ErrLevelUpUnsupported
	}
	scores, ok := objectField(abilities, "scores")
	if !ok {
		return ErrLevelUpUnsupported
	}
	combat, ok := objectField(sheet, "combat")
	if !ok {
		return ErrLevelUpUnsupported
	}
	priorProficiency, ok := intField(combat, "proficiencyBonus")
	if !ok {
		return ErrLevelUpUnsupported
	}
	hitPoints, ok := objectField(combat, "hitPoints")
	if !ok {
		return ErrLevelUpUnsupported
	}
	hitPoints["current"] = result.HitPoints.Current
	hitPoints["max"] = result.HitPoints.Max
	proficiency := target.ProficiencyBonus
	initiative := abilityModifier(result.AbilityScores.Dexterity)
	if overrides != nil {
		if overrides.ProficiencyBonus != nil {
			proficiency = *overrides.ProficiencyBonus
		}
		if overrides.Initiative != nil {
			initiative = *overrides.Initiative
		}
	}
	if proficiency < 0 || proficiency > 20 || initiative < -100 || initiative > 100 {
		return ErrLevelUpUnsupported
	}
	perceptionModifier, reliablePerception, err := recalculateReliableSkills(
		sheet, prior.AbilityScores, result.AbilityScores, priorProficiency, priorProficiency == priorCanonicalProficiency, proficiency,
	)
	if err != nil {
		return err
	}
	if overrides != nil && overrides.PassivePerception != nil {
		combat["passivePerception"] = auditedNumber(*overrides.PassivePerception, true, "Player-confirmed level-up override.")
	} else if reliablePerception {
		passivePerception := 10 + perceptionModifier
		if passivePerception < 0 || passivePerception > 100 {
			return ErrLevelUpUnsupported
		}
		combat["passivePerception"] = auditedNumber(passivePerception, false, "Derived from reliable Perception modifier.")
	}
	confirmationEntries := []string{}
	if overrides != nil && overrides.ProficiencyBonus != nil {
		confirmationEntries = append(confirmationEntries, proficiencyOverrideAuditEntry)
	}
	if overrides != nil && overrides.Initiative != nil {
		confirmationEntries = append(confirmationEntries, initiativeOverrideAuditEntry)
	}
	if err := appendAuditNeedsConfirmation(sheet, confirmationEntries); err != nil {
		return err
	}
	combat["proficiencyBonus"] = proficiency
	combat["initiative"] = initiative
	scores["strength"] = result.AbilityScores.Strength
	scores["dexterity"] = result.AbilityScores.Dexterity
	scores["constitution"] = result.AbilityScores.Constitution
	scores["intelligence"] = result.AbilityScores.Intelligence
	scores["wisdom"] = result.AbilityScores.Wisdom
	scores["charisma"] = result.AbilityScores.Charisma

	summary, ok := objectField(sheet, "summary")
	if !ok {
		return ErrLevelUpUnsupported
	}
	summary["displayLine"] = fmt.Sprintf("%s %s - Level %d", result.Ancestry, result.ClassName, result.Level)
	featured, ok := arrayField(summary, "featuredAbilities")
	if !ok {
		return ErrLevelUpUnsupported
	}
	for _, feature := range target.Features {
		if !containsString(featured, feature.Name) {
			featured = append(featured, feature.Name)
		}
	}
	if len(featured) > 16 {
		return ErrLevelUpUnsupported
	}
	summary["featuredAbilities"] = featured
	return nil
}

func applyLevelUpSpellcasting(sheet map[string]any, result *Character, classRule levelrules.Class, targetRule levelrules.Level, subclassIndex string, changes *levelUpSpellChangesInput, overrides *levelUpOverrideInput) error {
	if targetRule.Spellcasting == nil {
		if changes != nil || (overrides != nil && (overrides.SpellSaveDC != nil || overrides.SpellAttackBonus != nil)) {
			return ErrLevelUpUnsupported
		}
		return nil
	}
	if changes == nil {
		return ErrLevelUpUnsupported
	}
	currentRule := classRule.Levels[result.Level-2]
	spellcasting, exists := objectField(sheet, "spellcasting")
	if !exists {
		if currentRule.Spellcasting != nil {
			return ErrLevelUpUnsupported
		}
		spellcasting = map[string]any{"spells": []any{}}
		sheet["spellcasting"] = spellcasting
	}
	spellcasting["ability"] = targetRule.Spellcasting.Ability
	proficiency := targetRule.ProficiencyBonus
	if overrides != nil && overrides.ProficiencyBonus != nil {
		proficiency = *overrides.ProficiencyBonus
	}
	abilityScore := abilityScoreForName(result.AbilityScores, targetRule.Spellcasting.Ability)
	saveDC := 8 + proficiency + abilityModifier(abilityScore)
	attackBonus := proficiency + abilityModifier(abilityScore)
	if overrides != nil && overrides.SpellSaveDC != nil {
		saveDC = *overrides.SpellSaveDC
	}
	if overrides != nil && overrides.SpellAttackBonus != nil {
		attackBonus = *overrides.SpellAttackBonus
	}
	if saveDC < 0 || saveDC > 100 || attackBonus < -100 || attackBonus > 100 {
		return ErrLevelUpUnsupported
	}
	spellcasting["spellSaveDC"] = auditedNumber(saveDC, overrides != nil && overrides.SpellSaveDC != nil, "Level-up spellcasting calculation.")
	spellcasting["spellAttackBonus"] = auditedNumber(attackBonus, overrides != nil && overrides.SpellAttackBonus != nil, "Level-up spellcasting calculation.")
	spellcasting["slots"] = updatedSpellSlots(spellcasting["slots"], targetRule.Spellcasting)

	spells, ok := arrayField(spellcasting, "spells")
	if !ok {
		return ErrLevelUpUnsupported
	}
	if len(changes.Replacements) > targetRule.Spellcasting.ReplacementLimit {
		return ErrLevelUpUnsupported
	}
	for _, replacement := range changes.Replacements {
		index := spellIndexByID(spells, replacement.RemoveSpellID)
		if index < 0 {
			return ErrLevelUpUnsupported
		}
		spell, err := selectedSpell(classRule.Index, subclassIndex, targetRule, replacement.Add)
		if err != nil || spellIndexByID(spells, spell.Index) >= 0 {
			return ErrLevelUpUnsupported
		}
		spells[index] = characterSheetSpellFromRule(spell, "known")
	}
	for _, addition := range changes.Additions {
		spell, err := selectedSpell(classRule.Index, subclassIndex, targetRule, addition)
		if err != nil || spellIndexByID(spells, spell.Index) >= 0 {
			return ErrLevelUpUnsupported
		}
		spells = append(spells, characterSheetSpellFromRule(spell, "known"))
	}
	if len(changes.WizardSpellbookAdditions) != targetRule.Spellcasting.WizardSpellbookAdditions {
		return ErrLevelUpUnsupported
	}
	for _, addition := range changes.WizardSpellbookAdditions {
		spell, err := selectedSpell(classRule.Index, subclassIndex, targetRule, addition)
		if err != nil || spell.Level == 0 || spellIndexByID(spells, spell.Index) >= 0 {
			return ErrLevelUpUnsupported
		}
		spells = append(spells, characterSheetSpellFromRule(spell, "known"))
	}
	alwaysPrepared := map[string]struct{}{}
	if targetRule.Spellcasting.Mode == "prepared" {
		features, _ := arrayField(sheet, "features")
		dataset, err := levelrules.Load()
		if err != nil {
			return ErrLevelUpUnsupported
		}
		for _, spell := range dataset.Spells {
			for _, membership := range spell.SubclassMemberships {
				if membership.SubclassIndex != subclassIndex || membership.Kind != "always-prepared" || membership.ClassLevel > targetRule.Level ||
					(spell.Level > 0 && !containsInt(targetRule.Spellcasting.AvailableSpellLevels, spell.Level)) || !allFeatureIDsPresent(features, membership.RequiredFeatureIndexes) {
					continue
				}
				alwaysPrepared[spell.Index] = struct{}{}
				if spellIndexByID(spells, spell.Index) < 0 {
					spells = append(spells, characterSheetSpellFromRule(spell, "prepared"))
				}
			}
		}
	}

	if targetRule.Spellcasting.Mode == "known" || targetRule.Spellcasting.Mode == "pact-known" {
		if len(changes.PreparedSpellIDs) != 0 || countSpellsAtLevel(spells, 0) != dereferenceInt(targetRule.Spellcasting.CantripsKnown) || countLeveledSpells(spells) != dereferenceInt(targetRule.Spellcasting.SpellsKnown) {
			return fmt.Errorf("known spell counts: cantrips=%d/%d leveled=%d/%d prepared=%d", countSpellsAtLevel(spells, 0), dereferenceInt(targetRule.Spellcasting.CantripsKnown), countLeveledSpells(spells), dereferenceInt(targetRule.Spellcasting.SpellsKnown), len(changes.PreparedSpellIDs))
		}
	} else {
		if targetRule.Spellcasting.CantripsKnown != nil && countSpellsAtLevel(spells, 0) != *targetRule.Spellcasting.CantripsKnown {
			return fmt.Errorf("prepared cantrip count: %d/%d", countSpellsAtLevel(spells, 0), *targetRule.Spellcasting.CantripsKnown)
		}
		prepared := map[string]struct{}{}
		for _, id := range changes.PreparedSpellIDs {
			if spellIndexByID(spells, id) < 0 {
				return ErrLevelUpUnsupported
			}
			if _, isAlwaysPrepared := alwaysPrepared[id]; isAlwaysPrepared {
				return ErrLevelUpUnsupported
			}
			prepared[id] = struct{}{}
		}
		preparedRequired := preparedSpellCount(targetRule.Spellcasting.PreparedFormula, abilityModifier(abilityScore), result.Level)
		if len(prepared) != preparedRequired {
			return fmt.Errorf("prepared spell count: %d/%d", len(prepared), preparedRequired)
		}
		for _, value := range spells {
			spell, ok := value.(map[string]any)
			if !ok {
				return ErrLevelUpUnsupported
			}
			id := stringField(spell, "id")
			_, isAlwaysPrepared := alwaysPrepared[id]
			if _, isPrepared := prepared[id]; isPrepared || isAlwaysPrepared {
				spell["preparedOrKnown"] = "prepared"
			} else {
				spell["preparedOrKnown"] = "known"
			}
		}
	}
	if len(spells) > 128 {
		return ErrLevelUpUnsupported
	}
	spellcasting["spells"] = spells
	return nil
}

func updatedSpellSlots(existing any, progression *levelrules.Spellcasting) []any {
	usedByLevel := map[int]int{}
	if values, ok := existing.([]any); ok {
		for _, value := range values {
			if slot, ok := value.(map[string]any); ok {
				level, levelOK := intField(slot, "level")
				used, usedOK := intField(slot, "used")
				if levelOK && usedOK {
					usedByLevel[level] = used
				}
			}
		}
	}
	if progression.Mode == "pact-known" {
		used := 0
		for _, value := range usedByLevel {
			used = max(used, value)
		}
		return []any{map[string]any{"level": progression.PactSlotLevel, "max": progression.PactSlots, "used": min(used, progression.PactSlots)}}
	}
	result := make([]any, 0, len(progression.Slots))
	for index, maximum := range progression.Slots {
		result = append(result, map[string]any{"level": index + 1, "max": maximum, "used": min(usedByLevel[index+1], maximum)})
	}
	return result
}

func selectedSpell(classIndex, subclassIndex string, target levelrules.Level, choice levelUpSpellChoiceInput) (levelrules.Spell, error) {
	if choice.Source != "srd" {
		return levelrules.Spell{}, ErrLevelUpUnsupported
	}
	spell, ok := levelrules.FindSpell(choice.Index)
	if !ok || (spell.Level > 0 && !containsInt(target.Spellcasting.AvailableSpellLevels, spell.Level)) {
		return levelrules.Spell{}, ErrLevelUpUnsupported
	}
	if containsText(spell.ClassIndexes, classIndex) {
		return spell, nil
	}
	for _, membership := range spell.SubclassMemberships {
		if membership.SubclassIndex == subclassIndex && membership.ClassLevel <= target.Level && membership.Kind == "expanded" {
			return spell, nil
		}
	}
	return levelrules.Spell{}, ErrLevelUpUnsupported
}

func characterSheetSpellFromRule(spell levelrules.Spell, preparedOrKnown string) map[string]any {
	meta := append([]string{}, spell.Components...)
	meta = append(meta, spell.School, spell.Range)
	if spell.Ritual {
		meta = append(meta, "Ritual")
	}
	return map[string]any{
		"id": spell.Index, "name": spell.Name, "level": spell.Level, "actionType": spell.ActionType,
		"castingTime": spell.CastingTime, "duration": spell.Duration, "concentration": spell.Concentration,
		"summary": spell.Summary, "meta": meta, "preparedOrKnown": preparedOrKnown,
		"source": map[string]any{"rulesVersion": "2014", "status": "confirmed", "note": "SRD 5.1 level-up snapshot " + levelrules.Snapshot() + "."},
	}
}

func recalculateReliableSkills(
	sheet map[string]any,
	priorScores AbilityScores,
	resultingScores AbilityScores,
	priorProficiency int,
	priorProficiencyReliable bool,
	resultingProficiency int,
) (int, bool, error) {
	proficiencies, ok := objectField(sheet, "proficiencies")
	if !ok {
		return 0, false, ErrLevelUpUnsupported
	}
	skills, ok := arrayField(proficiencies, "skills")
	if !ok {
		return 0, false, ErrLevelUpUnsupported
	}
	perceptionEntries := 0
	reliablePerception := false
	perceptionModifier := 0
	for _, value := range skills {
		skill, ok := value.(map[string]any)
		if !ok {
			return 0, false, ErrLevelUpUnsupported
		}
		name := strings.ToLower(strings.TrimSpace(stringField(skill, "name")))
		if name == "perception" {
			perceptionEntries++
		}
		ability, standard := standardSkillAbilities[name]
		if !standard || skillHasManualException(skill) {
			continue
		}
		proficient, ok := boolField(skill, "proficient")
		if !ok {
			return 0, false, ErrLevelUpUnsupported
		}
		modifier, ok := intField(skill, "modifier")
		if !ok {
			return 0, false, ErrLevelUpUnsupported
		}
		priorExpected := abilityModifier(abilityScoreForName(priorScores, ability))
		if proficient {
			if !priorProficiencyReliable {
				continue
			}
			priorExpected += priorProficiency
		}
		if modifier != priorExpected {
			continue
		}
		resultingModifier := abilityModifier(abilityScoreForName(resultingScores, ability))
		if proficient {
			resultingModifier += resultingProficiency
		}
		if resultingModifier < -100 || resultingModifier > 100 {
			return 0, false, ErrLevelUpUnsupported
		}
		skill["modifier"] = resultingModifier
		if name == "perception" {
			reliablePerception = true
			perceptionModifier = resultingModifier
		}
	}
	return perceptionModifier, perceptionEntries == 1 && reliablePerception, nil
}

func skillHasManualException(skill map[string]any) bool {
	if raw, exists := skill["needsConfirmation"]; exists {
		needsConfirmation, ok := raw.(bool)
		if !ok || needsConfirmation {
			return true
		}
	}
	if raw, exists := skill["note"]; exists {
		note, ok := raw.(string)
		if !ok || strings.TrimSpace(note) != "" {
			return true
		}
	}
	return false
}

func appendAuditNeedsConfirmation(sheet map[string]any, additions []string) error {
	if len(additions) == 0 {
		return nil
	}
	audit, ok := objectField(sheet, "audit")
	if !ok {
		return ErrLevelUpUnsupported
	}
	entries, ok := arrayField(audit, "needsConfirmation")
	if !ok {
		return ErrLevelUpUnsupported
	}
	seen := make(map[string]struct{}, len(entries))
	for _, value := range entries {
		entry, ok := value.(string)
		if !ok {
			return ErrLevelUpUnsupported
		}
		seen[strings.TrimSpace(entry)] = struct{}{}
	}
	for _, addition := range additions {
		if utf8.RuneCountInString(addition) > 1000 {
			return ErrLevelUpUnsupported
		}
		if _, exists := seen[addition]; exists {
			continue
		}
		if len(entries) >= 64 {
			return ErrLevelUpUnsupported
		}
		entries = append(entries, addition)
		seen[addition] = struct{}{}
	}
	audit["needsConfirmation"] = entries
	return nil
}

func appendLevelUpAudit(sheet map[string]any, from, to int, decisions []string) error {
	audit, ok := objectField(sheet, "audit")
	if !ok {
		return ErrLevelUpUnsupported
	}
	entry := fmt.Sprintf("Level up %d to %d using %s.", from, to, levelrules.Snapshot())
	if len(decisions) > 0 {
		trimmed := make([]string, 0, len(decisions))
		for _, decision := range decisions {
			trimmed = append(trimmed, strings.TrimSpace(decision))
		}
		entry += " Decisions: " + strings.Join(trimmed, "; ")
	}
	prior := strings.TrimSpace(stringField(audit, "source"))
	combined := prior + " " + entry
	if utf8.RuneCountInString(combined) > 1000 {
		return ErrLevelUpUnsupported
	}
	audit["source"] = combined
	return nil
}

func validateAndAppendClassChoice(features *[]any, classRule levelrules.Class, rule levelrules.Choice, input levelUpClassChoiceInput, count, targetLevel int) error {
	if err := validateUniqueChoiceOptionIDs(input.OptionIDs); err != nil {
		return err
	}
	manual := strings.TrimSpace(input.ManualNote)
	if manual != "" {
		if !rule.AllowManual || len(input.OptionIDs) != 0 {
			return ErrLevelUpUnsupported
		}
		*features = appendUniqueFeature(*features, manualFeature(rule.ID, classRule.Name+" choice", manual))
		return nil
	}
	if len(input.OptionIDs) != count {
		return ErrLevelUpUnsupported
	}
	options := map[string]levelrules.ChoiceOption{}
	for _, option := range rule.Options {
		options[option.Index] = option
	}
	for _, optionID := range input.OptionIDs {
		option, exists := options[optionID]
		if !exists || (option.MinimumLevel > 0 && option.MinimumLevel > targetLevel) {
			return ErrLevelUpUnsupported
		}
		for _, prerequisite := range option.RequiredFeatureIndexes {
			if !featureIDPresent(*features, prerequisite) && !containsText(input.OptionIDs, prerequisite) {
				return ErrLevelUpUnsupported
			}
		}
		*features = appendUniqueFeature(*features, canonicalFeature(classRule.Name+" choice", levelrules.Feature{Index: option.Index, Name: option.Name, Summary: "Player-selected canonical class choice."}))
	}
	return nil
}

func featureChoiceAlreadyPresent(features []any, choice levelrules.Choice, count int) bool {
	matched := 0
	for _, value := range features {
		feature, ok := value.(map[string]any)
		if !ok {
			continue
		}
		id := stringField(feature, "id")
		if id == choice.ID {
			return true
		}
		for _, option := range choice.Options {
			if id == option.Index || featureMatchesCanonicalChoiceOption(feature, option) {
				matched++
			}
		}
	}
	return matched >= count
}

func featureMatchesCanonicalChoiceOption(feature map[string]any, option levelrules.ChoiceOption) bool {
	labelParts := strings.SplitN(option.Name, ":", 2)
	if len(labelParts) != 2 || !strings.EqualFold(strings.TrimSpace(stringField(feature, "category")), strings.TrimSpace(labelParts[0])) ||
		!strings.EqualFold(strings.TrimSpace(stringField(feature, "name")), strings.TrimSpace(labelParts[1])) {
		return false
	}
	source, ok := objectField(feature, "source")
	return ok && stringField(source, "rulesVersion") == "2014" && stringField(source, "status") == "confirmed"
}

func featureIDPresent(features []any, expected string) bool {
	for _, value := range features {
		if feature, ok := value.(map[string]any); ok && stringField(feature, "id") == expected {
			return true
		}
	}
	return false
}

func allFeatureIDsPresent(features []any, expected []string) bool {
	for _, id := range expected {
		if !featureIDPresent(features, id) {
			return false
		}
	}
	return true
}

func matchingSubclassIndex(classRule levelrules.Class, name string) string {
	for _, subclass := range classRule.Subclasses {
		if strings.EqualFold(subclass.Name, strings.TrimSpace(name)) {
			return subclass.Index
		}
	}
	return ""
}

func canonicalFeature(category string, feature levelrules.Feature) map[string]any {
	return map[string]any{
		"id": feature.Index, "name": feature.Name, "category": category,
		"source": map[string]any{"rulesVersion": "2014", "status": "confirmed", "note": "SRD 5.1 level-up snapshot " + levelrules.Snapshot() + "."},
		"tags":   []any{"level-up"}, "summary": feature.Summary, "includeInReference": true,
	}
}

func manualFeature(id, name, note string) map[string]any {
	return map[string]any{
		"id": id, "name": name, "category": "Manual level-up choice",
		"source": map[string]any{"rulesVersion": "2014", "status": "needs-confirmation", "note": note},
		"tags":   []any{"level-up", "manual"}, "summary": note, "includeInReference": true,
	}
}

func appendUniqueFeature(features []any, candidate map[string]any) []any {
	id := stringField(candidate, "id")
	for _, existing := range features {
		if object, ok := existing.(map[string]any); ok && stringField(object, "id") == id {
			return features
		}
	}
	return append(features, candidate)
}

func applyASI(scores *AbilityScores, asi *levelUpASIInput) error {
	if asi.Increases == nil || strings.TrimSpace(asi.Note) != "" {
		return ErrLevelUpUnsupported
	}
	total := 0
	for ability, increase := range asi.Increases {
		if increase != 1 && increase != 2 {
			return ErrLevelUpUnsupported
		}
		total += increase
		value := abilityScorePointer(scores, ability)
		if value == nil || *value+increase > 20 {
			return ErrLevelUpUnsupported
		}
		*value += increase
	}
	if total != 2 {
		return ErrLevelUpUnsupported
	}
	return nil
}

func abilityScorePointer(scores *AbilityScores, ability string) *int {
	switch ability {
	case "strength":
		return &scores.Strength
	case "dexterity":
		return &scores.Dexterity
	case "constitution":
		return &scores.Constitution
	case "intelligence":
		return &scores.Intelligence
	case "wisdom":
		return &scores.Wisdom
	case "charisma":
		return &scores.Charisma
	default:
		return nil
	}
}

func abilityScoreForName(scores AbilityScores, ability string) int {
	value := abilityScorePointer(&scores, ability)
	if value == nil {
		return 10
	}
	return *value
}

func abilityModifier(score int) int {
	return int(math.Floor(float64(score-10) / 2))
}

func auditedNumber(value int, overridden bool, note string) map[string]any {
	return map[string]any{"value": value, "needsConfirmation": overridden, "note": note}
}

func preparedSpellCount(formula *string, modifier, level int) int {
	if formula == nil {
		return 0
	}
	if strings.Contains(*formula, "floor(classLevel/2)") {
		return max(1, modifier+level/2)
	}
	return max(1, modifier+level)
}

func objectField(parent map[string]any, field string) (map[string]any, bool) {
	value, ok := parent[field]
	if !ok || value == nil {
		return nil, false
	}
	object, ok := value.(map[string]any)
	return object, ok
}

func arrayField(parent map[string]any, field string) ([]any, bool) {
	value, ok := parent[field]
	if !ok {
		return nil, false
	}
	array, ok := value.([]any)
	return array, ok
}

func stringField(parent map[string]any, field string) string {
	value, _ := parent[field].(string)
	return value
}

func intField(parent map[string]any, field string) (int, bool) {
	switch value := parent[field].(type) {
	case int:
		return value, true
	case float64:
		if value == math.Trunc(value) {
			return int(value), true
		}
	}
	return 0, false
}

func boolField(parent map[string]any, field string) (bool, bool) {
	value, ok := parent[field].(bool)
	return value, ok
}

func containsString(values []any, expected string) bool {
	for _, value := range values {
		if text, ok := value.(string); ok && text == expected {
			return true
		}
	}
	return false
}

func containsText(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}

func containsInt(values []int, expected int) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}

func spellIndexByID(spells []any, id string) int {
	for index, value := range spells {
		if spell, ok := value.(map[string]any); ok && stringField(spell, "id") == id {
			return index
		}
	}
	return -1
}

func countSpellsAtLevel(spells []any, level int) int {
	count := 0
	for _, value := range spells {
		if spell, ok := value.(map[string]any); ok {
			if spellLevel, valid := intField(spell, "level"); valid && spellLevel == level {
				count++
			}
		}
	}
	return count
}

func countLeveledSpells(spells []any) int {
	count := 0
	for _, value := range spells {
		if spell, ok := value.(map[string]any); ok {
			if spellLevel, valid := intField(spell, "level"); valid && spellLevel > 0 {
				count++
			}
		}
	}
	return count
}

func dereferenceInt(value *int) int {
	if value == nil {
		return 0
	}
	return *value
}
