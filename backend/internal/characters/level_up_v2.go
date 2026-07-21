package characters

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	levelrules "github.com/Inkala/rpg-companion/backend/internal/rules"
)

func buildLeveledCharacterV2(character Character, sheet CharacterSheetV2, request levelUpRequest) (Character, error) {
	if sheet.Identity.Class.Source != "srd" || sheet.Identity.Level != character.Level || character.Level < 1 || character.Level >= 5 || hasManualLevelUpOverrides(request.Overrides) {
		return Character{}, ErrLevelUpUnsupported
	}
	classRule, ok := levelrules.FindClass(sheet.Identity.Class.Index)
	if !ok || !strings.EqualFold(classRule.Name, character.ClassName) || !levelrules.SupportsTransition(character.Level, character.Level+1) {
		return Character{}, ErrLevelUpUnsupported
	}
	targetLevel := character.Level + 1
	targetRule := classRule.Levels[targetLevel-1]
	creationRequest := requestFromSheet(sheet)
	creationRequest.Identity.Level = targetLevel

	subclassIndex, err := applyV2LevelUpSubclass(&creationRequest, classRule, targetLevel, request.Subclass)
	if err != nil {
		return Character{}, fmt.Errorf("%w: subclass", err)
	}
	if err := applyV2LevelUpChoices(&creationRequest, classRule, targetLevel, request.PrerequisiteChoices, request.ClassChoices); err != nil {
		return Character{}, fmt.Errorf("%w: class choices", err)
	}
	if err := applyV2LevelUpASI(&creationRequest, classRule.Index, targetRule, request.AbilityScoreImprovement); err != nil {
		return Character{}, fmt.Errorf("%w: ability score improvement", err)
	}
	if err := applyV2LevelUpHP(&creationRequest, classRule, targetLevel, request.HP); err != nil {
		return Character{}, fmt.Errorf("%w: hit points", err)
	}
	appendV2CanonicalFeatures(&creationRequest, classRule, subclassIndex, targetLevel)
	if err := applyV2LevelUpSpellcasting(&creationRequest, classRule, subclassIndex, targetRule, request.Spells); err != nil {
		return Character{}, fmt.Errorf("%w: spellcasting: %v", ErrLevelUpUnsupported, err)
	}

	rebuilt, err := BuildCharacterSheetV2(creationRequest)
	if err != nil {
		return Character{}, fmt.Errorf("%w: rebuild CharacterSheetV2: %v", ErrLevelUpUnsupported, err)
	}
	preserveV2UsedSpellSlots(sheet.Spellcasting, rebuilt.Spellcasting)
	if validationErrors := ValidateCharacterSheetV2(rebuilt); len(validationErrors) > 0 {
		return Character{}, fmt.Errorf("%w: resulting CharacterSheetV2 validation: %s", ErrLevelUpUnsupported, validationErrors[0])
	}

	result := character
	result.Level = targetLevel
	result.AbilityScores = persistedAbilityScores(rebuilt)
	result.HitPoints.Max = rebuilt.HitPointProgression.Maximum.Value
	maxIncrease := result.HitPoints.Max - character.HitPoints.Max
	if maxIncrease < 1 {
		return Character{}, ErrLevelUpUnsupported
	}
	switch request.CurrentHP.Mode {
	case "increase-by-gain":
		result.HitPoints.Current = min(character.HitPoints.Current+maxIncrease, result.HitPoints.Max)
	case "retain":
		result.HitPoints.Current = min(character.HitPoints.Current, result.HitPoints.Max)
	case "manual":
		if request.CurrentHP.Value == nil || *request.CurrentHP.Value < 0 || *request.CurrentHP.Value > result.HitPoints.Max {
			return Character{}, ErrLevelUpUnsupported
		}
		result.HitPoints.Current = *request.CurrentHP.Value
	default:
		return Character{}, ErrLevelUpUnsupported
	}
	result.ArmorClass = rebuilt.Combat.ArmorClass.Value
	result.SpeedFt = rebuilt.Combat.SpeedFt.Value
	className, subclassName, raceName, err := resolvedV2IdentityNames(rebuilt.Identity)
	if err != nil || className != character.ClassName || raceName != character.Ancestry {
		return Character{}, ErrLevelUpUnsupported
	}
	result.SubclassName = subclassName
	payload, err := json.Marshal(rebuilt)
	if err != nil || len(payload) > maxV2StoredReferencePayloadBytes {
		return Character{}, ErrLevelUpUnsupported
	}
	result.ReferencePayload = payload
	if err := validateStoredV2Parity(result, rebuilt); err != nil {
		return Character{}, fmt.Errorf("%w: resulting CharacterSheetV2 top-level parity", ErrLevelUpUnsupported)
	}
	return result, nil
}

func applyV2LevelUpSubclass(request *CreateCharacterV2RequestDTO, classRule levelrules.Class, targetLevel int, input *levelUpSubclassInput) (string, error) {
	if request.Identity.Subclass != nil {
		if input != nil {
			return "", ErrLevelUpUnsupported
		}
		if request.Identity.Subclass.Source == "srd" {
			return request.Identity.Subclass.Index, nil
		}
		return "", nil
	}
	if targetLevel < classRule.SubclassDecisionLevel {
		if input != nil {
			return "", ErrLevelUpUnsupported
		}
		return "", nil
	}
	if input == nil {
		return "", ErrLevelUpUnsupported
	}
	switch input.Source {
	case "srd":
		if input.Name != "" {
			return "", ErrLevelUpUnsupported
		}
		for _, subclass := range classRule.Subclasses {
			if subclass.Index == input.Index {
				request.Identity.Subclass = &RuleSelection{Source: "srd", Index: subclass.Index}
				return subclass.Index, nil
			}
		}
	case "manual":
		name := strings.TrimSpace(input.Name)
		if input.Index == "" && boundedText(name, maxCharacterCoreRunes) {
			request.Identity.Subclass = &RuleSelection{Source: "manual", Name: name}
			return "", nil
		}
	}
	return "", ErrLevelUpUnsupported
}

func applyV2LevelUpChoices(request *CreateCharacterV2RequestDTO, classRule levelrules.Class, targetLevel int, groups ...[]levelUpClassChoiceInput) error {
	allowed := map[string]levelrules.Choice{}
	for _, choice := range classRule.Choices {
		if choice.FromLevel <= targetLevel {
			allowed[choice.ID] = choice
		}
	}
	creation, err := levelrules.LoadCharacterCreation()
	if err != nil {
		return ErrLevelUpUnsupported
	}
	for _, classChoice := range creation.ClassChoices {
		choice := classChoice.Choice
		if classChoice.ClassIndex == classRule.Index && choice.FromLevel <= targetLevel {
			allowed[choice.ID] = choice
		}
	}
	seen := map[string]bool{}
	for _, group := range groups {
		for _, input := range group {
			choice, ok := allowed[input.RuleID]
			if !ok || seen[input.RuleID] {
				return ErrLevelUpUnsupported
			}
			seen[input.RuleID] = true
			count := choice.SelectionCountByLevel[fmt.Sprint(targetLevel)]
			if err := validateV2LevelUpChoice(request, classRule, choice, input, count, targetLevel); err != nil {
				return err
			}
		}
	}
	return nil
}

func validateV2LevelUpChoice(request *CreateCharacterV2RequestDTO, classRule levelrules.Class, choice levelrules.Choice, input levelUpClassChoiceInput, count, targetLevel int) error {
	if err := validateUniqueChoiceOptionIDs(input.OptionIDs); err != nil {
		return err
	}
	manual := strings.TrimSpace(input.ManualNote)
	if manual != "" {
		if !choice.AllowManual || len(input.OptionIDs) != 0 {
			return ErrLevelUpUnsupported
		}
		upsertV2RuleChoice(&request.RuleChoices, RuleChoiceInput{RuleID: choice.ID, OptionIDs: []string{}, ManualNote: manual})
		appendUniqueV2Feature(&request.Features, CharacterFeatureInput{Source: "manual", ID: choice.ID, Name: classRule.Name + " choice", Category: "Class choice", Description: manual})
		return nil
	}
	if len(input.OptionIDs) != count {
		return ErrLevelUpUnsupported
	}
	if len(choice.Options) == 0 && choice.BoundedRule != "" {
		candidateChoices := append([]RuleChoiceInput(nil), request.RuleChoices...)
		upsertV2RuleChoice(&candidateChoices, RuleChoiceInput{RuleID: choice.ID, OptionIDs: append([]string(nil), input.OptionIDs...)})
		if errors := ValidateRuleChoices(RuleChoiceValidationContext{
			Choices: candidateChoices, RaceIndex: request.Identity.Race.Index, ClassIndex: classRule.Index,
			SubclassIndex: ruleSelectionIndex(request.Identity.Subclass), Level: targetLevel,
		}); len(errors) > 0 {
			return ErrLevelUpUnsupported
		}
		applyV2ChoiceProficiencies(request, choice, input.OptionIDs)
		upsertV2RuleChoice(&request.RuleChoices, RuleChoiceInput{RuleID: choice.ID, OptionIDs: append([]string(nil), input.OptionIDs...)})
		return nil
	}
	options := map[string]levelrules.ChoiceOption{}
	for _, option := range choice.Options {
		options[option.Index] = option
	}
	for _, optionID := range input.OptionIDs {
		option, ok := options[optionID]
		if !ok || option.MinimumLevel > targetLevel {
			return ErrLevelUpUnsupported
		}
		for _, required := range option.RequiredFeatureIndexes {
			if !v2FeatureInputPresent(request.Features, required) && !containsText(input.OptionIDs, required) {
				return ErrLevelUpUnsupported
			}
		}
		if canonicalFeatureExists(optionID) {
			appendUniqueV2Feature(&request.Features, CharacterFeatureInput{Source: "srd", Index: optionID})
		}
	}
	applyV2ChoiceProficiencies(request, choice, input.OptionIDs)
	upsertV2RuleChoice(&request.RuleChoices, RuleChoiceInput{RuleID: choice.ID, OptionIDs: append([]string(nil), input.OptionIDs...)})
	return nil
}

func applyV2ChoiceProficiencies(request *CreateCharacterV2RequestDTO, choice levelrules.Choice, optionIDs []string) {
	rank := "proficient"
	if strings.Contains(choice.ID, "expertise") {
		rank = "expertise"
	}
	for _, optionID := range optionIDs {
		if !strings.HasPrefix(optionID, "skill-") {
			continue
		}
		name := strings.TrimPrefix(optionID, "skill-")
		found := false
		for index := range request.Proficiencies.Skills {
			if strings.EqualFold(strings.ReplaceAll(request.Proficiencies.Skills[index].Name, " ", "-"), name) {
				if rank == "expertise" {
					request.Proficiencies.Skills[index].Rank = rank
				}
				found = true
			}
		}
		if !found {
			request.Proficiencies.Skills = append(request.Proficiencies.Skills, CharacterSkillInput{Name: name, Rank: rank})
		}
		if name == "perception" && (request.Proficiencies.Perception == "none" || rank == "expertise") {
			request.Proficiencies.Perception = rank
		}
	}
	sort.SliceStable(request.Proficiencies.Skills, func(left, right int) bool {
		return request.Proficiencies.Skills[left].Name < request.Proficiencies.Skills[right].Name
	})
}

func ruleSelectionIndex(selection *RuleSelection) string {
	if selection != nil && selection.Source == "srd" {
		return selection.Index
	}
	return ""
}

func applyV2LevelUpASI(request *CreateCharacterV2RequestDTO, classIndex string, target levelrules.Level, input *levelUpASIInput) error {
	if !target.AbilityScoreImprovement {
		if input != nil {
			return ErrLevelUpUnsupported
		}
		return nil
	}
	if input == nil || input.Mode != "ability-scores" || input.Increases == nil {
		return ErrLevelUpUnsupported
	}
	var scores *AbilityScoresDTO
	if request.AbilityScores.Mode == "calculated" {
		scores = request.AbilityScores.Base
	} else {
		scores = request.AbilityScores.Values
	}
	if scores == nil {
		return ErrLevelUpUnsupported
	}
	before := *scores
	legacy := AbilityScores{Strength: scores.Strength, Dexterity: scores.Dexterity, Constitution: scores.Constitution, Intelligence: scores.Intelligence, Wisdom: scores.Wisdom, Charisma: scores.Charisma}
	if err := applyASI(&legacy, input); err != nil {
		return err
	}
	scores.Strength, scores.Dexterity, scores.Constitution = legacy.Strength, legacy.Dexterity, legacy.Constitution
	scores.Intelligence, scores.Wisdom, scores.Charisma = legacy.Intelligence, legacy.Wisdom, legacy.Charisma
	optionID, ok := v2ASIOptionID(before, *scores)
	if !ok {
		return ErrLevelUpUnsupported
	}
	ruleID := classIndex + "-ability-score-improvement-1"
	upsertV2RuleChoice(&request.RuleChoices, RuleChoiceInput{RuleID: ruleID, OptionIDs: []string{optionID}})
	appendUniqueV2Feature(&request.Features, CharacterFeatureInput{Source: "srd", Index: ruleID})
	return nil
}

func v2ASIOptionID(before, after AbilityScoresDTO) (string, bool) {
	type gain struct {
		name   string
		amount int
	}
	gains := []gain{
		{"strength", after.Strength - before.Strength}, {"dexterity", after.Dexterity - before.Dexterity},
		{"constitution", after.Constitution - before.Constitution}, {"intelligence", after.Intelligence - before.Intelligence},
		{"wisdom", after.Wisdom - before.Wisdom}, {"charisma", after.Charisma - before.Charisma},
	}
	selected := []gain{}
	for _, candidate := range gains {
		if candidate.amount > 0 {
			selected = append(selected, candidate)
		}
	}
	if len(selected) == 1 && selected[0].amount == 2 {
		return "ability-score-increase-" + selected[0].name + "-2", true
	}
	if len(selected) == 2 && selected[0].amount == 1 && selected[1].amount == 1 {
		return "ability-score-increase-" + selected[0].name + "-" + selected[1].name + "-1", true
	}
	return "", false
}

func applyV2LevelUpHP(request *CreateCharacterV2RequestDTO, classRule levelrules.Class, targetLevel int, input *levelUpHPInput) error {
	if input == nil {
		return ErrLevelUpUnsupported
	}
	gain := HitPointLevelGain{Level: targetLevel, Mode: input.Mode}
	if input.Mode == "rolled" {
		if input.Roll == nil || *input.Roll < 1 || *input.Roll > classRule.HitDie {
			return ErrLevelUpUnsupported
		}
		gain.Roll = *input.Roll
	} else if input.Mode != "fixed-average" || input.Roll != nil {
		return ErrLevelUpUnsupported
	}
	request.HitPointProgression.LevelGains = append(request.HitPointProgression.LevelGains, gain)
	return nil
}

func appendV2CanonicalFeatures(request *CreateCharacterV2RequestDTO, classRule levelrules.Class, subclassIndex string, targetLevel int) {
	for _, level := range classRule.Levels {
		if level.Level > targetLevel {
			continue
		}
		for _, feature := range level.Features {
			appendUniqueV2Feature(&request.Features, CharacterFeatureInput{Source: "srd", Index: feature.Index})
		}
	}
	for _, subclass := range classRule.Subclasses {
		if subclass.Index != subclassIndex {
			continue
		}
		for _, featureLevel := range subclass.FeaturesByLevel {
			if featureLevel.Level <= targetLevel {
				for _, feature := range featureLevel.Features {
					appendUniqueV2Feature(&request.Features, CharacterFeatureInput{Source: "srd", Index: feature.Index})
				}
			}
		}
	}
}

func applyV2LevelUpSpellcasting(request *CreateCharacterV2RequestDTO, classRule levelrules.Class, subclassIndex string, target levelrules.Level, changes *levelUpSpellChangesInput) error {
	if target.Spellcasting == nil {
		if changes != nil {
			return ErrLevelUpUnsupported
		}
		return nil
	}
	if changes == nil || request.Spellcasting == nil {
		return ErrLevelUpUnsupported
	}
	if request.Spellcasting.Mode == "none" {
		request.Spellcasting = &CharacterSpellcastingInput{Mode: target.Spellcasting.Mode, Cantrips: []SpellSelectionInput{}}
	}
	if request.Spellcasting.Mode != target.Spellcasting.Mode {
		return ErrLevelUpUnsupported
	}
	input := request.Spellcasting
	newSelections := map[string]SpellSelectionInput{}
	makeSelection := func(choice levelUpSpellChoiceInput) (SpellSelectionInput, error) {
		spell, err := selectedSpell(classRule.Index, subclassIndex, target, choice)
		if err != nil {
			return SpellSelectionInput{}, err
		}
		selection := SpellSelectionInput{Source: "srd", Index: spell.Index, ID: fmt.Sprintf("level-%d-%s", target.Level, spell.Index)}
		newSelections[spell.Index] = selection
		return selection, nil
	}

	additions := []SpellSelectionInput{}
	for _, choice := range changes.Additions {
		selection, err := makeSelection(choice)
		if err != nil {
			return err
		}
		if spell, ok := levelrules.FindSpell(choice.Index); ok && spell.Level == 0 {
			input.Cantrips = append(input.Cantrips, selection)
		} else {
			additions = append(additions, selection)
		}
	}

	switch input.Mode {
	case "known", "pact-known":
		replacements := make([]SpellReplacementInput, 0, len(changes.Replacements))
		for _, replacement := range changes.Replacements {
			selection, err := makeSelection(replacement.Add)
			if err != nil {
				return err
			}
			replacements = append(replacements, SpellReplacementInput{RemoveSpellID: replacement.RemoveSpellID, Add: selection})
		}
		input.Levels = append(input.Levels, KnownSpellLevelInput{Level: target.Level, Learned: additions, Replacements: replacements})
		if len(changes.PreparedSpellIDs) != 0 || len(changes.WizardSpellbookAdditions) != 0 {
			return ErrLevelUpUnsupported
		}
	case "prepared":
		if len(changes.Replacements) != 0 || len(changes.WizardSpellbookAdditions) != 0 {
			return ErrLevelUpUnsupported
		}
		prepared, err := v2PreparedSelections(*input, changes.PreparedSpellIDs, newSelections)
		if err != nil {
			return err
		}
		input.Prepared = prepared
	case "spellbook-prepared":
		if len(changes.Replacements) != 0 || len(additions) != 0 {
			return ErrLevelUpUnsupported
		}
		spellbook := make([]SpellSelectionInput, 0, len(changes.WizardSpellbookAdditions))
		for _, choice := range changes.WizardSpellbookAdditions {
			selection, err := makeSelection(choice)
			if err != nil {
				return err
			}
			spellbook = append(spellbook, selection)
		}
		input.Additions = append(input.Additions, WizardSpellbookAdditionInput{Level: target.Level, Spells: spellbook})
		preparedIDs, err := v2PreparedSelectionIDs(*input, changes.PreparedSpellIDs, newSelections)
		if err != nil {
			return err
		}
		input.PreparedSpellIDs = preparedIDs
	default:
		return ErrLevelUpUnsupported
	}
	return nil
}

func v2PreparedSelections(input CharacterSpellcastingInput, ids []string, newSelections map[string]SpellSelectionInput) ([]SpellSelectionInput, error) {
	all := v2SpellSelectionsByID(input)
	result := make([]SpellSelectionInput, 0, len(ids))
	for _, id := range ids {
		selection, ok := all[id]
		if !ok {
			selection, ok = newSelections[id]
		}
		if !ok {
			return nil, ErrLevelUpUnsupported
		}
		result = append(result, selection)
	}
	return result, nil
}

func v2PreparedSelectionIDs(input CharacterSpellcastingInput, ids []string, newSelections map[string]SpellSelectionInput) ([]string, error) {
	all := v2SpellSelectionsByID(input)
	result := make([]string, 0, len(ids))
	for _, id := range ids {
		if selection, ok := all[id]; ok {
			result = append(result, selection.ID)
			continue
		}
		if selection, ok := newSelections[id]; ok {
			result = append(result, selection.ID)
			continue
		}
		return nil, ErrLevelUpUnsupported
	}
	return result, nil
}

func v2SpellSelectionsByID(input CharacterSpellcastingInput) map[string]SpellSelectionInput {
	result := map[string]SpellSelectionInput{}
	appendSelection := func(selection SpellSelectionInput) {
		result[selection.ID] = selection
		if selection.Index != "" {
			result[selection.Index] = selection
		}
	}
	for _, selection := range input.Cantrips {
		appendSelection(selection)
	}
	for _, selection := range input.Prepared {
		appendSelection(selection)
	}
	for _, selection := range input.InitialSpellbook {
		appendSelection(selection)
	}
	for _, level := range input.Levels {
		for _, selection := range level.Learned {
			appendSelection(selection)
		}
		for _, replacement := range level.Replacements {
			appendSelection(replacement.Add)
		}
	}
	for _, level := range input.Additions {
		for _, selection := range level.Spells {
			appendSelection(selection)
		}
	}
	return result
}

func preserveV2UsedSpellSlots(before, after *CharacterSheetV2Spellcasting) {
	if before == nil || after == nil {
		return
	}
	used := map[int]int{}
	for _, slot := range before.Slots {
		used[slot.Level] = slot.Used
	}
	for index := range after.Slots {
		after.Slots[index].Used = min(used[after.Slots[index].Level], after.Slots[index].Max)
	}
}

func appendUniqueV2Feature(features *[]CharacterFeatureInput, feature CharacterFeatureInput) {
	id := feature.Index
	if feature.Source == "manual" {
		id = feature.ID
	}
	for _, existing := range *features {
		existingID := existing.Index
		if existing.Source == "manual" {
			existingID = existing.ID
		}
		if existingID == id {
			return
		}
	}
	*features = append(*features, feature)
}

func v2FeatureInputPresent(features []CharacterFeatureInput, id string) bool {
	for _, feature := range features {
		if feature.Index == id || feature.ID == id {
			return true
		}
	}
	return false
}

func upsertV2RuleChoice(choices *[]RuleChoiceInput, choice RuleChoiceInput) {
	for index := range *choices {
		if (*choices)[index].RuleID == choice.RuleID {
			(*choices)[index] = choice
			sort.SliceStable(*choices, func(left, right int) bool { return (*choices)[left].RuleID < (*choices)[right].RuleID })
			return
		}
	}
	*choices = append(*choices, choice)
	sort.SliceStable(*choices, func(left, right int) bool { return (*choices)[left].RuleID < (*choices)[right].RuleID })
}
