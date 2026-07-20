package characters

import (
	"testing"

	"github.com/Inkala/rpg-companion/backend/internal/rules"
)

func TestReconstructWizardInitialSixSpellbookChoices(t *testing.T) {
	input := CharacterSpellcastingInput{
		Mode:             "spellbook-prepared",
		Cantrips:         spellSelections("fire-bolt", "light", "mage-hand"),
		InitialSpellbook: spellSelections("burning-hands", "charm-person", "detect-magic", "identify", "magic-missile", "sleep"),
		PreparedSpellIDs: []string{"spell-burning-hands", "spell-magic-missile", "spell-sleep", "spell-detect-magic"},
	}
	result, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "wizard", Level: 1, AbilityModifier: 3, Input: input})
	if err != nil || len(result.PreparedSpellIDs) != 4 || len(result.Spells) != 9 {
		t.Fatalf("unexpected Wizard reconstruction: result=%+v err=%v", result, err)
	}
}

func TestRejectSpellDecisionsForNonSpellcasters(t *testing.T) {
	if _, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "fighter", Level: 5, Input: CharacterSpellcastingInput{Mode: "none"}}); err != nil {
		t.Fatalf("none mode failed: %v", err)
	}
	if _, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "fighter", Level: 5, Input: CharacterSpellcastingInput{Mode: "known"}}); err == nil {
		t.Fatal("non-spellcaster accepted known decisions")
	}
}

func TestReconstructKnownSpellHistoryAndReplacement(t *testing.T) {
	input := CharacterSpellcastingInput{Mode: "known", Cantrips: spellSelections("dancing-lights", "light"), Levels: []KnownSpellLevelInput{
		{Level: 1, Learned: spellSelections("charm-person", "cure-wounds", "detect-magic", "thunderwave"), Replacements: []SpellReplacementInput{}},
		{Level: 2, Learned: spellSelections("heroism"), Replacements: []SpellReplacementInput{{RemoveSpellID: "spell-charm-person", Add: spellSelections("healing-word")[0]}}},
	}}
	result, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "bard", Level: 2, AbilityModifier: 3, Input: input})
	if err != nil || containsResolvedSpell(result.Spells, "spell-charm-person") || !containsResolvedSpell(result.Spells, "spell-healing-word") {
		t.Fatalf("known spell replacement history was not reconstructed: %+v err=%v", result, err)
	}
}

func TestPreparedModeSeparatesAutomaticSubclassSpells(t *testing.T) {
	input := CharacterSpellcastingInput{Mode: "prepared", Cantrips: spellSelections("guidance", "light", "sacred-flame"), Prepared: spellSelections("command", "detect-evil-and-good", "guiding-bolt", "healing-word")}
	result, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "cleric", SubclassIndex: "life", Level: 1, AbilityModifier: 3, Input: input})
	if err != nil || len(result.PreparedSpellIDs) != 4 || len(result.AlwaysPreparedSpellIDs) != 2 || !containsResolvedSpell(result.Spells, "automatic-bless") || !containsResolvedSpell(result.Spells, "automatic-cure-wounds") {
		t.Fatalf("prepared and automatic spell sets were not separated: %+v err=%v", result, err)
	}
}

func TestLifeDomainSpellsCannotBeOrdinaryPreparedSelections(t *testing.T) {
	input := CharacterSpellcastingInput{Mode: "prepared", Cantrips: spellSelections("guidance", "light", "sacred-flame"), Prepared: spellSelections("bless", "command", "guiding-bolt", "healing-word")}
	if _, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "cleric", SubclassIndex: "life", Level: 1, AbilityModifier: 3, Input: input}); err == nil {
		t.Fatal("Life Domain always-prepared spell was accepted as an ordinary prepared selection")
	}
}

func TestRaceGrantedCantripIsSeparateFromClassProgression(t *testing.T) {
	result, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "fighter", Level: 1, Input: CharacterSpellcastingInput{Mode: "none"}, RaceGrantedCantripIndexes: []string{"fire-bolt"}})
	if err != nil || len(result.Spells) != 1 || result.Spells[0].ID != "race-high-elf-cantrip-fire-bolt" || result.Spells[0].Provenance.RuleID != "high-elf-cantrip" {
		t.Fatalf("Race-granted cantrip was not reconstructed separately: %+v err=%v", result, err)
	}
}

func TestCanonicalSpellDuplicatesIgnoreClientChosenIDs(t *testing.T) {
	input := CharacterSpellcastingInput{Mode: "known", Cantrips: []SpellSelectionInput{{ID: "first-light", Source: "srd", Index: "light"}, {ID: "second-light", Source: "srd", Index: "light"}}, Levels: []KnownSpellLevelInput{{Level: 1, Learned: spellSelections("charm-person", "cure-wounds", "detect-magic", "thunderwave")}}}
	if _, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "bard", Level: 1, Input: input}); err == nil {
		t.Fatal("canonical duplicate spells with different client IDs were accepted")
	}
}

func TestClassSpellCannotDuplicateRaceGrantedCantrip(t *testing.T) {
	input := CharacterSpellcastingInput{Mode: "known", Cantrips: spellSelections("fire-bolt", "light", "mage-hand", "prestidigitation"), Levels: []KnownSpellLevelInput{{Level: 1, Learned: spellSelections("burning-hands", "charm-person")}}}
	if _, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "sorcerer", Level: 1, Input: input, RaceGrantedCantripIndexes: []string{"fire-bolt"}}); err == nil {
		t.Fatal("class cantrip duplicated a Race-granted canonical cantrip")
	}
}

func TestAlwaysPreparedSubclassSpellOutsideBaseClassList(t *testing.T) {
	input := CharacterSpellcastingInput{Mode: "prepared", Cantrips: spellSelections("druidcraft", "guidance"), Prepared: spellSelections("cure-wounds")}
	result, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "druid", SubclassIndex: "land", Level: 3, AbilityModifier: -3, Input: input, ActiveFeatureIDs: []string{"circle-of-the-land-swamp"}})
	if err != nil || !containsResolvedSpell(result.Spells, "automatic-acid-arrow") || !containsResolvedSpell(result.Spells, "automatic-darkness") {
		t.Fatalf("non-Druid land spells were not reconstructed as always prepared: %+v err=%v", result, err)
	}
}

func TestCircleOfTheLandBonusCantripIsASeparateCalculatedGrant(t *testing.T) {
	input := CharacterSpellcastingInput{
		Mode: "prepared", Cantrips: spellSelections("druidcraft", "guidance"),
		Prepared: spellSelections("cure-wounds"),
	}
	result, err := reconstructV2Spellcasting(SpellReconstructionInput{
		ClassIndex: "druid", SubclassIndex: "land", Level: 2, AbilityModifier: -3, Input: input,
		ClassGrantedCantripIndexes: []string{"produce-flame"},
	})
	if err != nil {
		t.Fatalf("reconstruct Circle of the Land bonus cantrip: %v", err)
	}
	if len(result.PreparedSpellIDs) != 1 || result.PreparedSpellIDs[0] != "spell-cure-wounds" {
		t.Fatalf("bonus cantrip changed prepared decisions: %#v", result.PreparedSpellIDs)
	}
	found := false
	for _, spell := range result.Spells {
		if spell.ID == "class-circle-of-the-land-cantrip-produce-flame" {
			found = spell.CanonicalIndex != nil && *spell.CanonicalIndex == "produce-flame" && spell.State == "known" && spell.Provenance.RuleID == "circle-of-the-land-bonus-cantrip"
		}
	}
	if !found {
		t.Fatalf("missing calculated Circle of the Land bonus cantrip: %#v", result.Spells)
	}
}

func TestMinimumValidSpellDecisionsForEveryCanonicalClassThroughLevelFive(t *testing.T) {
	data, err := rules.Load()
	if err != nil {
		t.Fatal(err)
	}
	checked := 0
	for _, class := range data.Classes {
		for _, level := range class.Levels {
			input := minimumV2SpellcastingInput(t, class, level.Level)
			if _, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: class.Index, Level: level.Level, AbilityModifier: -10, Input: input}); err != nil {
				t.Errorf("%s level %d minimum decisions failed: %v", class.Index, level.Level, err)
			}
			checked++
		}
	}
	if checked != len(data.Classes)*5 {
		t.Fatalf("checked %d class levels, want %d", checked, len(data.Classes)*5)
	}
}

func TestWizardCantripCountAndPreparedSubset(t *testing.T) {
	data, _ := rules.Load()
	class, _ := findClass(data.Classes, "wizard")
	valid := minimumV2SpellcastingInput(t, class, 1)
	tooFewCantrips := valid
	tooFewCantrips.Cantrips = tooFewCantrips.Cantrips[:2]
	if _, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "wizard", Level: 1, AbilityModifier: -10, Input: tooFewCantrips}); err == nil {
		t.Fatal("Wizard accepted too few cantrips")
	}
	unknownPrepared := valid
	unknownPrepared.PreparedSpellIDs = []string{"spell-not-in-spellbook"}
	if _, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "wizard", Level: 1, AbilityModifier: -10, Input: unknownPrepared}); err == nil {
		t.Fatal("Wizard accepted a prepared spell outside the reconstructed spellbook")
	}
}

func TestKnownSpellHistoryRejectsFutureWrongLevelWrongClassAndInvalidRemoval(t *testing.T) {
	base := CharacterSpellcastingInput{Mode: "known", Cantrips: spellSelections("dancing-lights", "light"), Levels: []KnownSpellLevelInput{
		{Level: 1, Learned: spellSelections("charm-person", "cure-wounds", "detect-magic", "thunderwave")},
		{Level: 2, Learned: spellSelections("heroism")},
	}}
	copyInput := func() CharacterSpellcastingInput {
		copy := base
		copy.Levels = append([]KnownSpellLevelInput(nil), base.Levels...)
		return copy
	}
	tests := map[string]func(*CharacterSpellcastingInput){
		"future level": func(input *CharacterSpellcastingInput) {
			input.Levels = append(input.Levels, KnownSpellLevelInput{Level: 3})
		},
		"wrong spell level": func(input *CharacterSpellcastingInput) { input.Levels[1].Learned = spellSelections("shatter") },
		"unknown removal": func(input *CharacterSpellcastingInput) {
			input.Levels[1].Replacements = []SpellReplacementInput{{RemoveSpellID: "spell-unknown", Add: spellSelections("healing-word")[0]}}
		},
		"wrong Class addition": func(input *CharacterSpellcastingInput) {
			input.Levels[1].Replacements = []SpellReplacementInput{{RemoveSpellID: "spell-charm-person", Add: spellSelections("magic-missile")[0]}}
		},
		"initial replacement": func(input *CharacterSpellcastingInput) {
			input.Levels[0].Replacements = []SpellReplacementInput{{RemoveSpellID: "spell-charm-person", Add: spellSelections("healing-word")[0]}}
		},
	}
	for name, mutate := range tests {
		t.Run(name, func(t *testing.T) {
			input := copyInput()
			mutate(&input)
			if _, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "bard", Level: 2, Input: input}); err == nil {
				t.Fatal("invalid known-spell history was accepted")
			}
		})
	}
}

func TestRejectsSameSpellReplacementInTypeScriptAndGo(t *testing.T) {
	input := CharacterSpellcastingInput{Mode: "known", Cantrips: spellSelections("dancing-lights", "light"), Levels: []KnownSpellLevelInput{
		{Level: 1, Learned: spellSelections("charm-person", "cure-wounds", "detect-magic", "thunderwave")},
		{Level: 2, Learned: spellSelections("heroism"), Replacements: []SpellReplacementInput{{RemoveSpellID: "spell-charm-person", Add: spellSelections("charm-person")[0]}}},
	}}
	if _, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "bard", Level: 2, Input: input}); err == nil || err.Error() != "replacement must add a distinct new spell" {
		t.Fatalf("same-spell replacement did not fail explicitly: %v", err)
	}
}

func TestSequentialReplacementsUseEarlierLevelResults(t *testing.T) {
	input := CharacterSpellcastingInput{Mode: "known", Cantrips: spellSelections("dancing-lights", "light"), Levels: []KnownSpellLevelInput{
		{Level: 1, Learned: spellSelections("charm-person", "cure-wounds", "detect-magic", "thunderwave")},
		{Level: 2, Learned: spellSelections("heroism"), Replacements: []SpellReplacementInput{{RemoveSpellID: "spell-charm-person", Add: spellSelections("healing-word")[0]}}},
		{Level: 3, Learned: spellSelections("shatter"), Replacements: []SpellReplacementInput{{RemoveSpellID: "spell-healing-word", Add: spellSelections("hold-person")[0]}}},
	}}
	result, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "bard", SubclassIndex: "lore", Level: 3, Input: input})
	if err != nil || !containsResolvedSpell(result.Spells, "spell-hold-person") || !containsResolvedSpell(result.Spells, "spell-shatter") || containsResolvedSpell(result.Spells, "spell-charm-person") || containsResolvedSpell(result.Spells, "spell-healing-word") {
		t.Fatalf("sequential replacements were not reconstructed: result=%+v err=%v", result, err)
	}
}

func TestPreparedFormulaAndManualSpellMetadataConsumeNormalLimits(t *testing.T) {
	prepared := CharacterSpellcastingInput{Mode: "prepared", Cantrips: spellSelections("guidance", "light", "sacred-flame"), Prepared: spellSelections("command", "guiding-bolt", "healing-word")}
	if _, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "cleric", Level: 1, AbilityModifier: 3, Input: prepared}); err == nil {
		t.Fatal("Cleric accepted fewer spells than the prepared formula")
	}
	manual := SpellSelectionInput{ID: "manual-one", Source: "manual", Name: "Transferred Spell", Level: 1, School: "Evocation", CastingTime: "1 action", Range: "30 feet", Components: []string{"V"}, Duration: "Instantaneous", Description: "A complete imported spell."}
	known := CharacterSpellcastingInput{Mode: "known", Cantrips: spellSelections("dancing-lights", "light"), Levels: []KnownSpellLevelInput{{Level: 1, Learned: append([]SpellSelectionInput{manual}, spellSelections("cure-wounds", "detect-magic", "thunderwave")...)}}}
	if _, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "bard", Level: 1, Input: known}); err == nil {
		t.Fatal("manual spell without import reason was accepted")
	}
	known.Levels[0].Learned[0].ImportReason = "Transferred from a paper sheet."
	result, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "bard", Level: 1, Input: known})
	if err != nil || !containsResolvedSpell(result.Spells, "manual-one") {
		t.Fatalf("complete manual spell did not consume one normal known-spell selection: %+v err=%v", result, err)
	}
}

func TestFiendExpandedSpellsUseWarlockKnownLimitsAndPactSlots(t *testing.T) {
	input := CharacterSpellcastingInput{Mode: "pact-known", Cantrips: spellSelections("eldritch-blast", "mage-hand"), Levels: []KnownSpellLevelInput{{Level: 1, Learned: spellSelections("burning-hands", "command")}}}
	result, err := reconstructV2Spellcasting(SpellReconstructionInput{ClassIndex: "warlock", SubclassIndex: "fiend", Level: 1, Input: input})
	if err != nil {
		t.Fatal(err)
	}
	known := 0
	for _, spell := range result.Spells {
		if spell.Level > 0 {
			known++
		}
	}
	data, _ := rules.Load()
	class, _ := findClass(data.Classes, "warlock")
	level, _ := findLevel(class, 1)
	if known != 2 || level.Spellcasting.PactSlots != 1 || level.Spellcasting.PactSlotLevel != 1 {
		t.Fatalf("Warlock expanded-known or Pact slot rules changed: known=%d casting=%+v", known, level.Spellcasting)
	}
}

func spellSelections(indexes ...string) []SpellSelectionInput {
	result := make([]SpellSelectionInput, 0, len(indexes))
	for _, index := range indexes {
		result = append(result, SpellSelectionInput{ID: "spell-" + index, Source: "srd", Index: index})
	}
	return result
}

func minimumV2SpellcastingInput(t *testing.T, class rules.Class, targetLevel int) CharacterSpellcastingInput {
	t.Helper()
	level, ok := findLevel(class, targetLevel)
	if !ok || level.Spellcasting == nil {
		return CharacterSpellcastingInput{Mode: "none"}
	}
	casting := level.Spellcasting
	cantripCount := 0
	if casting.CantripsKnown != nil {
		cantripCount = *casting.CantripsKnown
	}
	cantrips := spellSelections(availableV2TestSpells(t, class.Index, targetLevel, true)[:cantripCount]...)
	switch casting.Mode {
	case "prepared":
		return CharacterSpellcastingInput{Mode: "prepared", Cantrips: cantrips, Prepared: spellSelections(availableV2TestSpells(t, class.Index, targetLevel, false)[:1]...)}
	case "known", "pact-known":
		used := map[string]bool{}
		previousKnown := 0
		decisions := []KnownSpellLevelInput{}
		for _, levelRule := range class.Levels {
			if levelRule.Level > targetLevel || levelRule.Spellcasting == nil {
				continue
			}
			known := 0
			if levelRule.Spellcasting.SpellsKnown != nil {
				known = *levelRule.Spellcasting.SpellsKnown
			}
			wanted := known - previousKnown
			available := availableV2TestSpells(t, class.Index, levelRule.Level, false)
			learned := []string{}
			for _, index := range available {
				if !used[index] && len(learned) < wanted {
					used[index] = true
					learned = append(learned, index)
				}
			}
			decisions = append(decisions, KnownSpellLevelInput{Level: levelRule.Level, Learned: spellSelections(learned...), Replacements: []SpellReplacementInput{}})
			previousKnown = known
		}
		return CharacterSpellcastingInput{Mode: casting.Mode, Cantrips: cantrips, Levels: decisions}
	case "spellbook-prepared":
		initialIndexes := availableV2TestSpells(t, class.Index, 1, false)[:6]
		used := map[string]bool{}
		for _, index := range initialIndexes {
			used[index] = true
		}
		additions := []WizardSpellbookAdditionInput{}
		for classLevel := 2; classLevel <= targetLevel; classLevel++ {
			selected := []string{}
			for _, index := range availableV2TestSpells(t, class.Index, classLevel, false) {
				if !used[index] && len(selected) < 2 {
					used[index] = true
					selected = append(selected, index)
				}
			}
			additions = append(additions, WizardSpellbookAdditionInput{Level: classLevel, Spells: spellSelections(selected...)})
		}
		return CharacterSpellcastingInput{Mode: "spellbook-prepared", Cantrips: cantrips, InitialSpellbook: spellSelections(initialIndexes...), Additions: additions, PreparedSpellIDs: []string{"spell-" + initialIndexes[0]}}
	default:
		t.Fatalf("unsupported mode %s", casting.Mode)
		return CharacterSpellcastingInput{}
	}
}

func availableV2TestSpells(t *testing.T, classIndex string, classLevel int, cantrip bool) []string {
	t.Helper()
	creation, err := rules.LoadCharacterCreation()
	if err != nil {
		t.Fatal(err)
	}
	data, err := rules.Load()
	if err != nil {
		t.Fatal(err)
	}
	class, ok := findClass(data.Classes, classIndex)
	if !ok {
		t.Fatalf("class %s not found", classIndex)
	}
	level, ok := findLevel(class, classLevel)
	if !ok || level.Spellcasting == nil {
		return nil
	}
	result := []string{}
	for _, spell := range creation.Spells {
		if v2Contains(spell.ClassIndexes, classIndex) && (spell.Level == 0) == cantrip && (cantrip || v2ContainsInt(level.Spellcasting.AvailableSpellLevels, spell.Level)) {
			result = append(result, spell.Index)
		}
	}
	return result
}
