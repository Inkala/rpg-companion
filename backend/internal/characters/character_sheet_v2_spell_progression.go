package characters

import (
	"fmt"

	"github.com/Inkala/rpg-companion/backend/internal/rules"
)

type SpellReconstructionInput struct {
	ClassIndex                 string
	SubclassIndex              string
	Level                      int
	AbilityModifier            int
	Input                      CharacterSpellcastingInput
	ActiveFeatureIDs           []string
	RaceGrantedCantripIndexes  []string
	ClassGrantedCantripIndexes []string
}

type SpellReconstructionResult struct {
	Spells                 []CharacterSheetV2Spell
	PreparedSpellIDs       []string
	AlwaysPreparedSpellIDs []string
}

func reconstructV2Spellcasting(context SpellReconstructionInput) (SpellReconstructionResult, error) {
	data, err := rules.Load()
	if err != nil {
		return SpellReconstructionResult{}, err
	}
	class, ok := findClass(data.Classes, context.ClassIndex)
	if !ok {
		return SpellReconstructionResult{}, fmt.Errorf("canonical Class is unavailable")
	}
	target, ok := findLevel(class, context.Level)
	if !ok {
		return SpellReconstructionResult{}, fmt.Errorf("canonical Class level is unavailable")
	}
	expectedMode := "none"
	if target.Spellcasting != nil {
		expectedMode = target.Spellcasting.Mode
	}
	if context.Input.Mode != expectedMode {
		return SpellReconstructionResult{}, fmt.Errorf("spellcasting mode must be %s", expectedMode)
	}
	raceGranted, err := raceGrantedV2Cantrips(context.RaceGrantedCantripIndexes)
	if err != nil {
		return SpellReconstructionResult{}, err
	}
	classGranted, err := classGrantedV2Cantrips(context)
	if err != nil {
		return SpellReconstructionResult{}, err
	}
	granted := append(raceGranted, classGranted...)
	if expectedMode == "none" {
		return SpellReconstructionResult{Spells: granted, PreparedSpellIDs: []string{}, AlwaysPreparedSpellIDs: []string{}}, nil
	}
	casting := target.Spellcasting
	for _, override := range context.Input.SlotOverride {
		if !v2ContainsInt(casting.AvailableSpellLevels, override.Level) {
			return SpellReconstructionResult{}, fmt.Errorf("spell slot override level is unavailable")
		}
	}
	cantrips, err := resolveDistinctSpells(context.Input.Cantrips, context, context.Level, true)
	if err != nil {
		return SpellReconstructionResult{}, err
	}
	cantripCount := 0
	if casting.CantripsKnown != nil {
		cantripCount = *casting.CantripsKnown
	}
	if len(cantrips) != cantripCount {
		return SpellReconstructionResult{}, fmt.Errorf("choose exactly %d cantrips", cantripCount)
	}
	for index := range cantrips {
		cantrips[index].State = "known"
	}

	ordinary := []CharacterSheetV2Spell{}
	preparedIDs := []string{}
	switch context.Input.Mode {
	case "known", "pact-known":
		ordinary, err = reconstructKnownSpells(context, class)
	case "prepared":
		ordinary, err = resolveDistinctSpells(context.Input.Prepared, context, context.Level, false)
		if err == nil {
			for index := range ordinary {
				ordinary[index].State = "prepared"
				preparedIDs = append(preparedIDs, ordinary[index].ID)
			}
			wanted, formulaErr := preparedSpellLimit(casting.PreparedFormula, context.AbilityModifier, context.Level)
			if formulaErr != nil {
				err = formulaErr
			} else if len(ordinary) != wanted {
				err = fmt.Errorf("choose exactly %d prepared spells", wanted)
			}
		}
	case "spellbook-prepared":
		ordinary, preparedIDs, err = reconstructWizardSpells(context, class)
	default:
		err = fmt.Errorf("unsupported spellcasting mode")
	}
	if err != nil {
		return SpellReconstructionResult{}, err
	}
	automatic, err := automaticV2Spells(context, class)
	if err != nil {
		return SpellReconstructionResult{}, err
	}
	seen := map[string]bool{}
	for _, spell := range append(append(append([]CharacterSheetV2Spell{}, granted...), cantrips...), ordinary...) {
		identity := v2SpellIdentity(spell)
		if seen[identity] {
			return SpellReconstructionResult{}, fmt.Errorf("duplicate spell selection %s", spell.ID)
		}
		seen[identity] = true
	}
	for _, spell := range automatic {
		identity := v2SpellIdentity(spell)
		if seen[identity] {
			return SpellReconstructionResult{}, fmt.Errorf("automatic spell duplicates a normal selection")
		}
		seen[identity] = true
	}
	spells := append(append(append(granted, cantrips...), ordinary...), automatic...)
	alwaysIDs := make([]string, 0, len(automatic))
	for _, spell := range automatic {
		alwaysIDs = append(alwaysIDs, spell.ID)
	}
	return SpellReconstructionResult{Spells: spells, PreparedSpellIDs: preparedIDs, AlwaysPreparedSpellIDs: alwaysIDs}, nil
}

func classGrantedV2Cantrips(context SpellReconstructionInput) ([]CharacterSheetV2Spell, error) {
	creation, _ := rules.LoadCharacterCreation()
	var choice *rules.CharacterCreationChoice
	for index := range creation.ClassChoices {
		candidate := &creation.ClassChoices[index]
		if candidate.ID == "circle-of-the-land-bonus-cantrip" && candidate.ClassIndex == context.ClassIndex && candidate.RequiredSubclassIndex == context.SubclassIndex {
			choice = candidate
		}
	}
	result := make([]CharacterSheetV2Spell, 0, len(context.ClassGrantedCantripIndexes))
	for _, index := range context.ClassGrantedCantripIndexes {
		spell, ok := creation.FindSpellDetail(index)
		allowed := false
		if choice != nil {
			for _, option := range choice.Options {
				allowed = allowed || option.Index == index
			}
		}
		if !ok || spell.Level != 0 || !allowed {
			return nil, fmt.Errorf("Class-granted cantrip is unavailable")
		}
		canonicalIndex := spell.Index
		result = append(result, CharacterSheetV2Spell{ID: "class-circle-of-the-land-cantrip-" + index, CanonicalIndex: &canonicalIndex, Name: spell.Name, Level: spell.Level, School: spell.School, CastingTime: spell.CastingTime, Range: spell.Range, Components: append([]string(nil), spell.Components...), MaterialComponent: spell.Material, Duration: spell.Duration, Concentration: spell.Concentration, Ritual: spell.Ritual, Description: spell.Description, HigherLevelText: spell.HigherLevel, State: "known", Provenance: ValueProvenance{Kind: "calculated", RuleID: "circle-of-the-land-bonus-cantrip"}})
	}
	return result, nil
}

func raceGrantedV2Cantrips(indexes []string) ([]CharacterSheetV2Spell, error) {
	creation, _ := rules.LoadCharacterCreation()
	var choice *rules.RaceChoiceRule
	for index := range creation.RaceChoices {
		if creation.RaceChoices[index].ID == "high-elf-cantrip" {
			choice = &creation.RaceChoices[index]
		}
	}
	result := make([]CharacterSheetV2Spell, 0, len(indexes))
	for _, index := range indexes {
		spell, ok := creation.FindSpellDetail(index)
		if !ok || spell.Level != 0 || choice == nil || !v2Contains(choice.AllowedOptionIndexes, index) {
			return nil, fmt.Errorf("Race-granted cantrip is unavailable")
		}
		canonicalIndex := spell.Index
		result = append(result, CharacterSheetV2Spell{ID: "race-high-elf-cantrip-" + index, CanonicalIndex: &canonicalIndex, Name: spell.Name, Level: spell.Level, School: spell.School, CastingTime: spell.CastingTime, Range: spell.Range, Components: append([]string(nil), spell.Components...), MaterialComponent: spell.Material, Duration: spell.Duration, Concentration: spell.Concentration, Ritual: spell.Ritual, Description: spell.Description, HigherLevelText: spell.HigherLevel, State: "known", Provenance: ValueProvenance{Kind: "calculated", RuleID: "high-elf-cantrip"}})
	}
	return result, nil
}

func reconstructKnownSpells(context SpellReconstructionInput, class rules.Class) ([]CharacterSheetV2Spell, error) {
	progression := []rules.Level{}
	for _, level := range class.Levels {
		if level.Level <= context.Level && level.Spellcasting != nil {
			progression = append(progression, level)
		}
	}
	if len(context.Input.Levels) != len(progression) {
		return nil, fmt.Errorf("known spell decisions must cover every spellcasting level")
	}
	result := []CharacterSheetV2Spell{}
	previousKnown := 0
	for index, level := range progression {
		decision := context.Input.Levels[index]
		if decision.Level != level.Level {
			return nil, fmt.Errorf("known spell decisions must be deterministically ordered")
		}
		known := 0
		if level.Spellcasting.SpellsKnown != nil {
			known = *level.Spellcasting.SpellsKnown
		}
		wanted := known - previousKnown
		if wanted < 0 {
			wanted = 0
		}
		if len(decision.Learned) != wanted || len(decision.Replacements) > level.Spellcasting.ReplacementLimit || index == 0 && len(decision.Replacements) > 0 {
			return nil, fmt.Errorf("level %d spell decision count is invalid", level.Level)
		}
		for _, replacement := range decision.Replacements {
			position := -1
			for candidateIndex, candidate := range result {
				if candidate.ID == replacement.RemoveSpellID {
					position = candidateIndex
				}
			}
			if position < 0 {
				return nil, fmt.Errorf("replacement removes an unknown spell")
			}
			added, resolveErr := resolveDistinctSpells([]SpellSelectionInput{replacement.Add}, context, level.Level, false)
			if resolveErr != nil {
				return nil, resolveErr
			}
			if added[0].ID == replacement.RemoveSpellID || containsResolvedSpellIdentity(result, added[0]) {
				return nil, fmt.Errorf("replacement must add a distinct new spell")
			}
			added[0].State = "known"
			result[position] = added[0]
		}
		learned, resolveErr := resolveDistinctSpells(decision.Learned, context, level.Level, false)
		if resolveErr != nil {
			return nil, resolveErr
		}
		for candidateIndex := range learned {
			learned[candidateIndex].State = "known"
			if containsResolvedSpellIdentity(result, learned[candidateIndex]) {
				return nil, fmt.Errorf("duplicate learned spell")
			}
			result = append(result, learned[candidateIndex])
		}
		previousKnown = known
	}
	return result, nil
}

func reconstructWizardSpells(context SpellReconstructionInput, class rules.Class) ([]CharacterSheetV2Spell, []string, error) {
	initial, err := resolveDistinctSpells(context.Input.InitialSpellbook, context, 1, false)
	if err != nil {
		return nil, nil, err
	}
	initialCount := 0
	if class.Levels[0].Spellcasting != nil {
		initialCount = class.Levels[0].Spellcasting.InitialSpellbookSpells
	}
	if len(initial) != initialCount {
		return nil, nil, fmt.Errorf("choose exactly %d initial spellbook spells", initialCount)
	}
	for _, spell := range initial {
		if spell.Level != 1 {
			return nil, nil, fmt.Errorf("initial Wizard spellbook spells must be level 1")
		}
	}
	if len(context.Input.Additions) != context.Level-1 {
		return nil, nil, fmt.Errorf("Wizard spellbook additions must cover every later level")
	}
	ordinary := append([]CharacterSheetV2Spell{}, initial...)
	for index, addition := range context.Input.Additions {
		if addition.Level != index+2 {
			return nil, nil, fmt.Errorf("Wizard spellbook additions must be deterministically ordered")
		}
		level, _ := findLevel(class, addition.Level)
		spells, resolveErr := resolveDistinctSpells(addition.Spells, context, addition.Level, false)
		if resolveErr != nil {
			return nil, nil, resolveErr
		}
		if level.Spellcasting == nil || len(spells) != level.Spellcasting.WizardSpellbookAdditions {
			return nil, nil, fmt.Errorf("Wizard level %d requires exactly two additions", addition.Level)
		}
		for _, spell := range spells {
			if containsResolvedSpellIdentity(ordinary, spell) {
				return nil, nil, fmt.Errorf("duplicate spellbook spell")
			}
			ordinary = append(ordinary, spell)
		}
	}
	for index := range ordinary {
		ordinary[index].State = "spellbook"
	}
	seenPrepared := map[string]bool{}
	for _, id := range context.Input.PreparedSpellIDs {
		if seenPrepared[id] || !containsResolvedSpell(ordinary, id) {
			return nil, nil, fmt.Errorf("Wizard prepared spells must be a distinct spellbook subset")
		}
		seenPrepared[id] = true
	}
	target, _ := findLevel(class, context.Level)
	wanted, err := preparedSpellLimit(target.Spellcasting.PreparedFormula, context.AbilityModifier, context.Level)
	if err != nil || len(context.Input.PreparedSpellIDs) != wanted {
		return nil, nil, fmt.Errorf("choose exactly %d prepared spells", wanted)
	}
	return ordinary, append([]string(nil), context.Input.PreparedSpellIDs...), nil
}

func resolveDistinctSpells(inputs []SpellSelectionInput, context SpellReconstructionInput, acquisitionLevel int, cantrip bool) ([]CharacterSheetV2Spell, error) {
	result := make([]CharacterSheetV2Spell, 0, len(inputs))
	seen := map[string]bool{}
	for _, input := range inputs {
		if seen[input.ID] {
			return nil, fmt.Errorf("spell selection IDs must be distinct")
		}
		seen[input.ID] = true
		spell, err := resolveV2Spell(input, context, acquisitionLevel, cantrip)
		if err != nil {
			return nil, err
		}
		result = append(result, spell)
	}
	return result, nil
}

func resolveV2Spell(input SpellSelectionInput, context SpellReconstructionInput, acquisitionLevel int, cantrip bool) (CharacterSheetV2Spell, error) {
	if input.Source == "manual" {
		if !boundedText(input.ImportReason, 1000) || (input.Level == 0) != cantrip || !legalV2SpellLevel(context.ClassIndex, acquisitionLevel, input.Level) {
			return CharacterSheetV2Spell{}, fmt.Errorf("manual spell is unavailable or lacks import reason")
		}
		entry := CharacterSheetV2Spell{ID: input.ID, Name: input.Name, Level: input.Level, School: input.School, CastingTime: input.CastingTime, Range: input.Range, Components: append([]string(nil), input.Components...), Duration: input.Duration, Concentration: input.Concentration, Ritual: input.Ritual, Description: input.Description, State: "known", Provenance: ValueProvenance{Kind: "imported", Note: input.ImportReason}}
		if input.MaterialComponent != "" {
			value := input.MaterialComponent
			entry.MaterialComponent = &value
		}
		if input.HigherLevelText != "" {
			value := input.HigherLevelText
			entry.HigherLevelText = &value
		}
		return entry, nil
	}
	creation, _ := rules.LoadCharacterCreation()
	spell, ok := creation.FindSpellDetail(input.Index)
	if !ok || (spell.Level == 0) != cantrip || !legalV2SpellLevel(context.ClassIndex, acquisitionLevel, spell.Level) || !eligibleV2Spell(spell, context, acquisitionLevel) {
		return CharacterSheetV2Spell{}, fmt.Errorf("%s is unavailable for %s level %d", input.Index, context.ClassIndex, acquisitionLevel)
	}
	index := spell.Index
	return CharacterSheetV2Spell{ID: input.ID, CanonicalIndex: &index, Name: spell.Name, Level: spell.Level, School: spell.School, CastingTime: spell.CastingTime, Range: spell.Range, Components: append([]string(nil), spell.Components...), MaterialComponent: spell.Material, Duration: spell.Duration, Concentration: spell.Concentration, Ritual: spell.Ritual, Description: spell.Description, HigherLevelText: spell.HigherLevel, State: "known", Provenance: ValueProvenance{Kind: "calculated", RuleID: "spell-canonical"}}, nil
}

func eligibleV2Spell(spell rules.SpellDetail, context SpellReconstructionInput, level int) bool {
	if v2Contains(spell.ClassIndexes, context.ClassIndex) {
		return true
	}
	for _, membership := range spell.SubclassMemberships {
		if membership.ClassIndex == context.ClassIndex && membership.SubclassIndex == context.SubclassIndex && membership.ClassLevel <= level && membership.Kind == "expanded" {
			return true
		}
	}
	return false
}

func automaticV2Spells(context SpellReconstructionInput, class rules.Class) ([]CharacterSheetV2Spell, error) {
	activeFeatures := map[string]bool{}
	for _, featureID := range context.ActiveFeatureIDs {
		activeFeatures[featureID] = true
	}
	for _, level := range class.Levels {
		if level.Level <= context.Level {
			for _, feature := range level.Features {
				activeFeatures[feature.Index] = true
			}
		}
	}
	for _, subclass := range class.Subclasses {
		if subclass.Index == context.SubclassIndex {
			for _, group := range subclass.FeaturesByLevel {
				if group.Level <= context.Level {
					for _, feature := range group.Features {
						activeFeatures[feature.Index] = true
					}
				}
			}
		}
	}
	creation, _ := rules.LoadCharacterCreation()
	result := []CharacterSheetV2Spell{}
	for _, spell := range creation.Spells {
		for _, membership := range spell.SubclassMemberships {
			if membership.ClassIndex != context.ClassIndex || membership.SubclassIndex != context.SubclassIndex || membership.ClassLevel > context.Level || membership.Kind != "always-prepared" || !allV2FeaturesActive(membership.RequiredFeatureIndexes, activeFeatures) {
				continue
			}
			entry := canonicalV2Spell(spell, "automatic-"+spell.Index)
			entry.State = "always-prepared"
			result = append(result, entry)
			break
		}
	}
	return result, nil
}

func legalV2SpellLevel(classIndex string, classLevel, spellLevel int) bool {
	if spellLevel == 0 {
		return true
	}
	data, _ := rules.Load()
	class, ok := findClass(data.Classes, classIndex)
	if !ok {
		return false
	}
	level, ok := findLevel(class, classLevel)
	return ok && level.Spellcasting != nil && v2ContainsInt(level.Spellcasting.AvailableSpellLevels, spellLevel)
}

func preparedSpellLimit(formula *string, abilityModifier, level int) (int, error) {
	if formula == nil {
		return 0, fmt.Errorf("prepared spell formula is unavailable")
	}
	value := abilityModifier + level
	if *formula == "max(1,abilityModifier+floor(classLevel/2))" {
		value = abilityModifier + level/2
	} else if *formula != "max(1,abilityModifier+classLevel)" {
		return 0, fmt.Errorf("prepared spell formula is unavailable")
	}
	if value < 1 {
		value = 1
	}
	return value, nil
}

func containsResolvedSpell(spells []CharacterSheetV2Spell, id string) bool {
	for _, spell := range spells {
		if spell.ID == id {
			return true
		}
	}
	return false
}

func containsResolvedSpellIdentity(spells []CharacterSheetV2Spell, candidate CharacterSheetV2Spell) bool {
	identity := v2SpellIdentity(candidate)
	for _, spell := range spells {
		if v2SpellIdentity(spell) == identity {
			return true
		}
	}
	return false
}

func v2SpellIdentity(spell CharacterSheetV2Spell) string {
	if spell.CanonicalIndex == nil {
		return "manual:" + spell.ID
	}
	return "srd:" + *spell.CanonicalIndex
}

func canonicalV2Spell(spell rules.SpellDetail, id string) CharacterSheetV2Spell {
	index := spell.Index
	return CharacterSheetV2Spell{ID: id, CanonicalIndex: &index, Name: spell.Name, Level: spell.Level, School: spell.School, CastingTime: spell.CastingTime, Range: spell.Range, Components: append([]string(nil), spell.Components...), MaterialComponent: spell.Material, Duration: spell.Duration, Concentration: spell.Concentration, Ritual: spell.Ritual, Description: spell.Description, HigherLevelText: spell.HigherLevel, State: "known", Provenance: ValueProvenance{Kind: "calculated", RuleID: "spell-canonical"}}
}

func allV2FeaturesActive(required []string, active map[string]bool) bool {
	for _, id := range required {
		if !active[id] {
			return false
		}
	}
	return true
}
