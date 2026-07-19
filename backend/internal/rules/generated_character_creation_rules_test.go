package rules

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"reflect"
	"testing"
)

func TestGeneratedCharacterCreationRulesParityAndMembership(t *testing.T) {
	var fixture CharacterCreationDataset
	if err := json.Unmarshal([]byte(CharacterCreationJSON), &fixture); err != nil {
		t.Fatalf("generated character creation JSON is invalid: %v", err)
	}
	if fixture.Metadata.SnapshotID != CharacterCreationSnapshotID {
		t.Fatalf("snapshot mismatch: JSON=%q Go=%q", fixture.Metadata.SnapshotID, CharacterCreationSnapshotID)
	}
	digest := sha256.Sum256([]byte(CharacterCreationJSON))
	if got := hex.EncodeToString(digest[:]); got != CharacterCreationProjectionChecksum {
		t.Fatalf("projection checksum mismatch: computed=%q generated=%q", got, CharacterCreationProjectionChecksum)
	}

	wantRaces := []string{"dragonborn", "dwarf", "elf", "gnome", "half-elf", "half-orc", "halfling", "human", "tiefling"}
	gotRaces := make([]string, 0, len(fixture.Races))
	for _, race := range fixture.Races {
		gotRaces = append(gotRaces, race.Index)
	}
	if !reflect.DeepEqual(gotRaces, wantRaces) {
		t.Fatalf("race membership=%v, want %v", gotRaces, wantRaces)
	}
	wantSubraces := []string{"high-elf", "hill-dwarf", "lightfoot-halfling", "rock-gnome"}
	gotSubraces := make([]string, 0, len(fixture.Subraces))
	for _, subrace := range fixture.Subraces {
		gotSubraces = append(gotSubraces, subrace.Index)
	}
	if !reflect.DeepEqual(gotSubraces, wantSubraces) {
		t.Fatalf("subrace membership=%v, want %v", gotSubraces, wantSubraces)
	}
	if len(fixture.Equipment) != 237 || len(fixture.Spells) != 169 {
		t.Fatalf("unexpected record counts: equipment=%d spells=%d", len(fixture.Equipment), len(fixture.Spells))
	}
	if len(fixture.RaceTraits) != 38 {
		t.Fatalf("unexpected Race trait count: %d", len(fixture.RaceTraits))
	}
}

func TestGeneratedCharacterCreationEquipmentAndSpellFidelity(t *testing.T) {
	dataset, err := LoadCharacterCreation()
	if err != nil {
		t.Fatal(err)
	}
	longsword, ok := dataset.FindEquipment("longsword")
	if !ok || longsword.Weapon == nil || longsword.Weapon.Damage.Dice != "1d8" || longsword.Weapon.Damage.Type != "slashing" {
		t.Fatalf("longsword fidelity failed: %#v", longsword)
	}
	leather, ok := dataset.FindEquipment("leather-armor")
	if !ok || leather.Armor == nil || leather.Armor.BaseArmorClass != 11 || !leather.Armor.DexterityBonus {
		t.Fatalf("leather armor fidelity failed: %#v", leather)
	}
	shield, ok := dataset.FindEquipment("shield")
	if !ok || shield.Armor == nil || shield.Armor.ShieldBonus != 2 {
		t.Fatalf("shield fidelity failed: %#v", shield)
	}
	acidArrow, ok := dataset.FindSpellDetail("acid-arrow")
	if !ok || acidArrow.Material == nil || len(acidArrow.Description) == 0 || acidArrow.HigherLevel == nil || len(*acidArrow.HigherLevel) == 0 {
		t.Fatalf("acid arrow details are incomplete: %#v", acidArrow)
	}
}

func TestGeneratedCharacterCreationChoicesAndDerivedModifiers(t *testing.T) {
	dataset, err := LoadCharacterCreation()
	if err != nil {
		t.Fatal(err)
	}
	if len(dataset.RaceChoices) != 8 {
		t.Fatalf("Race choice count=%d, want 8", len(dataset.RaceChoices))
	}
	if len(dataset.FeatureModifiers) != 19 {
		t.Fatalf("feature modifier count=%d, want 19", len(dataset.FeatureModifiers))
	}
	choices := make(map[string]RaceChoiceRule, len(dataset.RaceChoices))
	for _, choice := range dataset.RaceChoices {
		choices[choice.ID] = choice
	}
	halfElf := choices["half-elf-ability-bonuses"]
	if halfElf.SelectionCount != 2 || halfElf.OptionValue == nil || *halfElf.OptionValue != 1 ||
		!reflect.DeepEqual(halfElf.AllowedOptionIndexes, []string{"constitution", "dexterity", "intelligence", "strength", "wisdom"}) ||
		halfElf.ExclusivityConstraint == nil || *halfElf.ExclusivityConstraint != "distinct-options" {
		t.Fatalf("Half-Elf ability choice is not exact: %#v", halfElf)
	}
	modifiers := make(map[string]FeatureModifier, len(dataset.FeatureModifiers))
	for _, modifier := range dataset.FeatureModifiers {
		modifiers[modifier.ID] = modifier
	}
	barbarian := modifiers["barbarian-unarmored-defense-ac"]
	if !reflect.DeepEqual(barbarian.Conditions, []string{"not-wearing-armor"}) {
		t.Fatalf("Barbarian Unarmored Defense conditions=%v", barbarian.Conditions)
	}
	monk := modifiers["monk-unarmored-defense-ac"]
	if !reflect.DeepEqual(monk.Conditions, []string{"not-wearing-armor", "not-using-shield"}) {
		t.Fatalf("Monk Unarmored Defense conditions=%v", monk.Conditions)
	}
	for _, id := range []string{
		"barbarian-fast-movement-speed",
		"draconic-resilience-ac",
		"draconic-resilience-maximum-hit-points",
		"hill-dwarf-dwarven-toughness-maximum-hit-points",
		"bard-expertise-skills",
		"lore-bonus-proficiencies",
		"rogue-expertise-skills",
		"warlock-beguiling-influence-deception",
		"warlock-beguiling-influence-persuasion",
	} {
		if _, ok := modifiers[id]; !ok {
			t.Fatalf("required derived modifier %q is missing", id)
		}
	}
}
