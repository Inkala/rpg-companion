package characters

import (
	"fmt"
	"reflect"
	"sort"
	"testing"
	"time"

	levelrules "github.com/Inkala/rpg-companion/backend/internal/rules"
)

type slice5TransitionOracle struct {
	classIndex             string
	fromLevel, toLevel     int
	proficiencyBonus       int
	requiresSubclass       bool
	requiresASI            bool
	spellcastingMode       string
	slots                  []int
	introducedChoices      map[string]int
	newCanonicalFeatureIDs []string
}

// slice5TransitionOracleTable is hand-audited against the approved local SRD 5.1/2014 dataset:
// rules-data/srd-5.1-2014-levels-1-5.json, checksum
// cd02323779e76ccd65d0e41d07dc3fa23a91456f738e35d4b3cb083cc316494b.
// These expectations are intentionally static. Tests must not derive or regenerate them from the
// canonical JSON or production rule helpers.
var slice5TransitionOracleTable = []slice5TransitionOracle{
	oracle("barbarian", 1, 2, 2, false, false, "none", nil, nil, "danger-sense", "reckless-attack"),
	oracle("barbarian", 2, 3, 2, true, false, "none", nil, nil, "frenzy", "primal-path"),
	oracle("barbarian", 3, 4, 2, false, true, "none", nil, choices("barbarian-ability-score-improvement-1", 1), "barbarian-ability-score-improvement-1"),
	oracle("barbarian", 4, 5, 3, false, false, "none", nil, nil, "barbarian-extra-attack", "fast-movement"),
	oracle("bard", 1, 2, 2, false, false, "known", []int{3, 0, 0}, nil, "jack-of-all-trades", "song-of-rest-d6"),
	oracle("bard", 2, 3, 2, true, false, "known", []int{4, 2, 0}, choices("bard-expertise", 2, "college-of-lore-bonus-proficiencies", 3), "bard-college", "bard-expertise-1", "bonus-proficiencies", "cutting-words"),
	oracle("bard", 3, 4, 2, false, true, "known", []int{4, 3, 0}, choices("bard-ability-score-improvement-1", 1), "bard-ability-score-improvement-1"),
	oracle("bard", 4, 5, 3, false, false, "known", []int{4, 3, 2}, nil, "bardic-inspiration-d8", "font-of-inspiration"),
	oracle("cleric", 1, 2, 2, false, false, "prepared", []int{3, 0, 0}, nil, "channel-divinity-1-rest", "channel-divinity-preserve-life", "channel-divinity-turn-undead", "divine-domain-improvement-1"),
	oracle("cleric", 2, 3, 2, false, false, "prepared", []int{4, 2, 0}, nil, "domain-spells-2"),
	oracle("cleric", 3, 4, 2, false, true, "prepared", []int{4, 3, 0}, choices("cleric-ability-score-improvement-1", 1), "cleric-ability-score-improvement-1"),
	oracle("cleric", 4, 5, 3, false, false, "prepared", []int{4, 3, 2}, nil, "destroy-undead-cr-1-2-or-below", "domain-spells-3"),
	oracle("druid", 1, 2, 2, true, false, "prepared", []int{3, 0, 0}, choices("circle-of-the-land-bonus-cantrip", 1), "bonus-cantrip", "druid-circle", "natural-recovery", "wild-shape-cr-1-4-or-below-no-flying-or-swim-speed"),
	oracle("druid", 2, 3, 2, false, false, "prepared", []int{4, 2, 0}, choices("druid-land-circle", 1)),
	oracle("druid", 3, 4, 2, false, true, "prepared", []int{4, 3, 0}, choices("druid-ability-score-improvement-1", 1), "druid-ability-score-improvement-1", "wild-shape-cr-1-2-or-below-no-flying-speed"),
	oracle("druid", 4, 5, 3, false, false, "prepared", []int{4, 3, 2}, nil),
	oracle("fighter", 1, 2, 2, false, false, "none", nil, nil, "action-surge-1-use"),
	oracle("fighter", 2, 3, 2, true, false, "none", nil, nil, "improved-critical", "martial-archetype"),
	oracle("fighter", 3, 4, 2, false, true, "none", nil, choices("fighter-ability-score-improvement-1", 1), "fighter-ability-score-improvement-1"),
	oracle("fighter", 4, 5, 3, false, false, "none", nil, nil, "extra-attack-1"),
	oracle("monk", 1, 2, 2, false, false, "none", nil, nil, "flurry-of-blows", "ki", "patient-defense", "step-of-the-wind", "unarmored-movement-1"),
	oracle("monk", 2, 3, 2, true, false, "none", nil, nil, "deflect-missiles", "monastic-tradition", "open-hand-technique"),
	oracle("monk", 3, 4, 2, false, true, "none", nil, choices("monk-ability-score-improvement-1", 1), "monk-ability-score-improvement-1", "slow-fall"),
	oracle("monk", 4, 5, 3, false, false, "none", nil, nil, "monk-extra-attack", "stunning-strike"),
	oracle("paladin", 1, 2, 2, false, false, "prepared", []int{2, 0, 0}, choices("paladin-fighting-style", 1), "divine-smite", "paladin-fighting-style", "spellcasting-paladin"),
	oracle("paladin", 2, 3, 2, true, false, "prepared", []int{3, 0, 0}, nil, "channel-divinity", "channel-divinity-sacred-weapon", "channel-divinity-turn-the-unholy", "divine-health", "oath-spells", "sacred-oath"),
	oracle("paladin", 3, 4, 2, false, true, "prepared", []int{3, 0, 0}, choices("paladin-ability-score-improvement-1", 1), "paladin-ability-score-improvement-1"),
	oracle("paladin", 4, 5, 3, false, false, "prepared", []int{4, 2, 0}, nil, "paladin-extra-attack"),
	oracle("ranger", 1, 2, 2, false, false, "known", []int{2, 0, 0}, choices("ranger-fighting-style", 1), "ranger-fighting-style", "spellcasting-ranger"),
	oracle("ranger", 2, 3, 2, true, false, "known", []int{3, 0, 0}, choices("hunter-hunters-prey", 1), "hunters-prey", "primeval-awareness", "ranger-archetype"),
	oracle("ranger", 3, 4, 2, false, true, "known", []int{3, 0, 0}, choices("ranger-ability-score-improvement-1", 1), "ranger-ability-score-improvement-1"),
	oracle("ranger", 4, 5, 3, false, false, "known", []int{4, 2, 0}, nil, "ranger-extra-attack"),
	oracle("rogue", 1, 2, 2, false, false, "none", nil, nil, "cunning-action"),
	oracle("rogue", 2, 3, 2, true, false, "none", nil, nil, "fast-hands", "roguish-archetype", "second-story-work"),
	oracle("rogue", 3, 4, 2, false, true, "none", nil, choices("rogue-ability-score-improvement-1", 1), "rogue-ability-score-improvement-1"),
	oracle("rogue", 4, 5, 3, false, false, "none", nil, nil, "uncanny-dodge"),
	oracle("sorcerer", 1, 2, 2, false, false, "known", []int{3, 0, 0}, nil, "flexible-casting-converting-spell-slot", "flexible-casting-creating-spell-slots", "font-of-magic"),
	oracle("sorcerer", 2, 3, 2, false, false, "known", []int{4, 2, 0}, choices("sorcerer-metamagic", 2), "metamagic-1"),
	oracle("sorcerer", 3, 4, 2, false, true, "known", []int{4, 3, 0}, choices("sorcerer-ability-score-improvement-1", 1), "sorcerer-ability-score-improvement-1"),
	oracle("sorcerer", 4, 5, 3, false, false, "known", []int{4, 3, 2}, nil),
	oracle("warlock", 1, 2, 2, false, false, "pact-known", []int{2, 0, 0}, choices("warlock-eldritch-invocations", 2), "eldritch-invocations"),
	oracle("warlock", 2, 3, 2, false, false, "pact-known", []int{0, 2, 0}, choices("warlock-pact-boon", 1), "pact-boon"),
	oracle("warlock", 3, 4, 2, false, true, "pact-known", []int{0, 2, 0}, choices("warlock-ability-score-improvement-1", 1), "warlock-ability-score-improvement-1"),
	oracle("warlock", 4, 5, 3, false, false, "pact-known", []int{0, 0, 2}, choices("warlock-eldritch-invocations", 1)),
	oracle("wizard", 1, 2, 2, true, false, "spellbook-prepared", []int{3, 0, 0}, nil, "arcane-tradition", "evocation-savant", "sculpt-spells"),
	oracle("wizard", 2, 3, 2, false, false, "spellbook-prepared", []int{4, 2, 0}, nil),
	oracle("wizard", 3, 4, 2, false, true, "spellbook-prepared", []int{4, 3, 0}, choices("wizard-ability-score-improvement-1", 1), "wizard-ability-score-improvement-1"),
	oracle("wizard", 4, 5, 3, false, false, "spellbook-prepared", []int{4, 3, 2}, nil),
}

func TestSlice5V2LevelUpMatchesIndependent48TransitionOracle(t *testing.T) {
	if len(slice5TransitionOracleTable) != 48 {
		t.Fatalf("oracle has %d transitions, want 48", len(slice5TransitionOracleTable))
	}
	seen := map[string]bool{}
	for _, expected := range slice5TransitionOracleTable {
		key := fmt.Sprintf("%s:%d-%d", expected.classIndex, expected.fromLevel, expected.toLevel)
		if seen[key] {
			t.Fatalf("duplicate oracle transition %s", key)
		}
		seen[key] = true
		t.Run(key, func(t *testing.T) {
			classRule, ok := levelrules.FindClass(expected.classIndex)
			if !ok {
				t.Fatalf("production Class %q unavailable", expected.classIndex)
			}
			currentRequest := slice5MinimumV2Request(t, classRule, expected.fromLevel)
			character, err := characterFromV2Request(currentRequest, time.Date(2026, 7, 20, 10, 0, 0, 0, time.UTC))
			if err != nil {
				t.Fatal(err)
			}
			targetRequest := slice5MinimumV2Request(t, classRule, expected.toLevel)
			decision := slice5LevelUpDecision(character, classRule, currentRequest, targetRequest)
			updated, err := buildLeveledCharacter(character, decision)
			if err != nil {
				t.Fatal(err)
			}
			before, after := mustV2Sheet(t, character), mustV2Sheet(t, updated)
			if after.Combat.ProficiencyBonus.Value != expected.proficiencyBonus || (decision.Subclass != nil) != expected.requiresSubclass || (decision.AbilityScoreImprovement != nil) != expected.requiresASI {
				t.Fatalf("progression decision drift: proficiency=%d subclass=%t asi=%t", after.Combat.ProficiencyBonus.Value, decision.Subclass != nil, decision.AbilityScoreImprovement != nil)
			}
			mode, slots := "none", []int(nil)
			if after.Spellcasting != nil {
				mode = after.Spellcasting.DecisionHistory.Mode
				for _, slot := range after.Spellcasting.Slots {
					slots = append(slots, slot.Max)
				}
			}
			if mode != expected.spellcastingMode || !reflect.DeepEqual(slots, expected.slots) {
				t.Fatalf("spell progression drift: mode=%q slots=%v, want %q %v", mode, slots, expected.spellcastingMode, expected.slots)
			}
			if actual := introducedChoiceCounts(before.RuleChoices, after.RuleChoices); !reflect.DeepEqual(actual, expected.introducedChoices) {
				t.Fatalf("introduced choices drift: got %v want %v", actual, expected.introducedChoices)
			}
			if actual := introducedCanonicalFeatures(before.Features, after.Features); !reflect.DeepEqual(actual, expected.newCanonicalFeatureIDs) {
				t.Fatalf("new canonical features drift: got %v want %v", actual, expected.newCanonicalFeatureIDs)
			}
		})
	}
	for _, classIndex := range []string{"barbarian", "bard", "cleric", "druid", "fighter", "monk", "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard"} {
		for from := 1; from <= 4; from++ {
			if !seen[fmt.Sprintf("%s:%d-%d", classIndex, from, from+1)] {
				t.Fatalf("oracle is missing %s %d-%d", classIndex, from, from+1)
			}
		}
	}
}

func oracle(classIndex string, from, to, proficiency int, subclass, asi bool, mode string, slots []int, introduced map[string]int, features ...string) slice5TransitionOracle {
	return slice5TransitionOracle{classIndex: classIndex, fromLevel: from, toLevel: to, proficiencyBonus: proficiency, requiresSubclass: subclass, requiresASI: asi, spellcastingMode: mode, slots: slots, introducedChoices: introduced, newCanonicalFeatureIDs: features}
}

func choices(values ...any) map[string]int {
	result := map[string]int{}
	for index := 0; index < len(values); index += 2 {
		result[values[index].(string)] = values[index+1].(int)
	}
	return result
}

func introducedChoiceCounts(before, after []RuleChoiceInput) map[string]int {
	previous := map[string]int{}
	for _, choice := range before {
		previous[choice.RuleID] = selectedChoiceCount(choice)
	}
	result := map[string]int{}
	for _, choice := range after {
		if count := selectedChoiceCount(choice) - previous[choice.RuleID]; count > 0 {
			result[choice.RuleID] = count
		}
	}
	if len(result) == 0 {
		return nil
	}
	return result
}

func selectedChoiceCount(choice RuleChoiceInput) int {
	count := len(choice.OptionIDs)
	if choice.ManualNote != "" {
		count++
	}
	return count
}

func introducedCanonicalFeatures(before, after []CharacterSheetV2Feature) []string {
	previous := map[string]bool{}
	for _, feature := range before {
		if feature.Source == "srd" {
			previous[feature.ID] = true
		}
	}
	result := []string{}
	for _, feature := range after {
		if feature.Source == "srd" && !previous[feature.ID] {
			result = append(result, feature.ID)
		}
	}
	sort.Strings(result)
	if len(result) == 0 {
		return nil
	}
	return result
}
