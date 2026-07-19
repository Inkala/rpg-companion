package rules

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"testing"
)

type canonicalRulesFixture struct {
	Metadata struct {
		SnapshotID string `json:"snapshotId"`
	} `json:"metadata"`
	SupportedTransitions []struct {
		From int `json:"from"`
		To   int `json:"to"`
	} `json:"supportedTransitions"`
	Classes []struct {
		Index  string `json:"index"`
		Levels []struct {
			Level        int            `json:"level"`
			ProfBonus    int            `json:"proficiencyBonus"`
			Spellcasting map[string]any `json:"spellcasting"`
		} `json:"levels"`
		Choices []struct {
			ID        string `json:"id"`
			FromLevel int    `json:"fromLevel"`
		} `json:"choices"`
	} `json:"classes"`
	Spells []struct {
		Index        string   `json:"index"`
		Level        int      `json:"level"`
		ClassIndexes []string `json:"classIndexes"`
	} `json:"spells"`
}

func loadCanonicalFixture(t *testing.T) canonicalRulesFixture {
	t.Helper()
	var fixture canonicalRulesFixture
	if err := json.Unmarshal([]byte(CanonicalJSON), &fixture); err != nil {
		t.Fatalf("generated canonical JSON is invalid: %v", err)
	}
	return fixture
}

func TestGeneratedRulesSnapshotAndChecksumParity(t *testing.T) {
	fixture := loadCanonicalFixture(t)
	if fixture.Metadata.SnapshotID != SnapshotID {
		t.Fatalf("snapshot mismatch: JSON=%q Go=%q", fixture.Metadata.SnapshotID, SnapshotID)
	}
	digest := sha256.Sum256([]byte(CanonicalJSON))
	if got := hex.EncodeToString(digest[:]); got != ProjectionChecksum {
		t.Fatalf("projection checksum mismatch: computed=%q generated=%q", got, ProjectionChecksum)
	}
	if Checksum != CharacterCreationRulesChecksum {
		t.Fatalf("canonical checksum differs across projections: level-up=%q character-creation=%q", Checksum, CharacterCreationRulesChecksum)
	}
}

func TestGeneratedRulesCoverAllClassesAndSupportedTransitions(t *testing.T) {
	fixture := loadCanonicalFixture(t)
	if len(fixture.Classes) != 12 {
		t.Fatalf("expected 12 classes, got %d", len(fixture.Classes))
	}
	if len(fixture.SupportedTransitions) != 4 {
		t.Fatalf("expected four transitions, got %d", len(fixture.SupportedTransitions))
	}
	for index, transition := range fixture.SupportedTransitions {
		if transition.From != index+1 || transition.To != index+2 {
			t.Fatalf("unexpected transition at %d: %d to %d", index, transition.From, transition.To)
		}
		if transition.From == 5 || transition.To == 6 {
			t.Fatal("level 5 to 6 must be unsupported")
		}
	}
	for _, class := range fixture.Classes {
		if len(class.Levels) != 5 {
			t.Fatalf("class %s has %d levels, expected 5", class.Index, len(class.Levels))
		}
		for index, level := range class.Levels {
			if level.Level != index+1 {
				t.Fatalf("class %s level sequence is not exact", class.Index)
			}
			wantProf := 2
			if level.Level == 5 {
				wantProf = 3
			}
			if level.ProfBonus != wantProf {
				t.Fatalf("class %s level %d proficiency=%d, want %d", class.Index, level.Level, level.ProfBonus, wantProf)
			}
		}
	}
}

func TestGeneratedRulesSpellCountsMembershipsSlotsAndChoices(t *testing.T) {
	fixture := loadCanonicalFixture(t)
	wantByLevel := map[int]int{0: 24, 1: 49, 2: 54, 3: 42}
	wantByClass := map[string]int{
		"bard": 62, "cleric": 58, "druid": 52, "paladin": 25,
		"ranger": 31, "sorcerer": 72, "warlock": 35, "wizard": 100,
	}
	gotByLevel := map[int]int{}
	gotByClass := map[string]int{}
	for _, spell := range fixture.Spells {
		gotByLevel[spell.Level]++
		for _, classIndex := range spell.ClassIndexes {
			gotByClass[classIndex]++
		}
	}
	for level, want := range wantByLevel {
		if gotByLevel[level] != want {
			t.Fatalf("spell level %d count=%d, want %d", level, gotByLevel[level], want)
		}
	}
	for classIndex, want := range wantByClass {
		if gotByClass[classIndex] != want {
			t.Fatalf("class %s spell membership=%d, want %d", classIndex, gotByClass[classIndex], want)
		}
	}

	classes := map[string]canonicalRulesFixtureClass{}
	for _, class := range fixture.Classes {
		classes[class.Index] = canonicalRulesFixtureClass{Levels: class.Levels, Choices: class.Choices}
	}
	assertSlots(t, classes["wizard"].Levels[4].Spellcasting, []int{4, 3, 2})
	assertSlots(t, classes["paladin"].Levels[4].Spellcasting, []int{4, 2, 0})
	assertSlots(t, classes["ranger"].Levels[4].Spellcasting, []int{4, 2, 0})
	warlock := classes["warlock"].Levels[4].Spellcasting
	if int(warlock["pactSlots"].(float64)) != 2 || int(warlock["pactSlotLevel"].(float64)) != 3 {
		t.Fatalf("unexpected level-5 Pact Magic progression: %#v", warlock)
	}

	requiredChoiceIDs := map[string]bool{
		"fighter-fighting-style":       false,
		"bard-expertise":               false,
		"ranger-favored-enemy":         false,
		"ranger-natural-explorer":      false,
		"sorcerer-metamagic":           false,
		"warlock-eldritch-invocations": false,
		"warlock-pact-boon":            false,
	}
	for _, class := range classes {
		for _, choice := range class.Choices {
			if _, ok := requiredChoiceIDs[choice.ID]; ok {
				requiredChoiceIDs[choice.ID] = true
			}
		}
	}
	for id, found := range requiredChoiceIDs {
		if !found {
			t.Fatalf("missing canonical choice ID %q", id)
		}
	}
}

type canonicalRulesFixtureClass struct {
	Levels []struct {
		Level        int            `json:"level"`
		ProfBonus    int            `json:"proficiencyBonus"`
		Spellcasting map[string]any `json:"spellcasting"`
	}
	Choices []struct {
		ID        string `json:"id"`
		FromLevel int    `json:"fromLevel"`
	}
}

func assertSlots(t *testing.T, spellcasting map[string]any, want []int) {
	t.Helper()
	raw, ok := spellcasting["slots"].([]any)
	if !ok || len(raw) != len(want) {
		t.Fatalf("unexpected slots: %#v", spellcasting["slots"])
	}
	for index, value := range raw {
		if int(value.(float64)) != want[index] {
			t.Fatalf("slot level %d=%v, want %d", index+1, value, want[index])
		}
	}
}
