package characters

import (
	"fmt"
	"strings"
	"testing"
)

func TestCharacterSheetSpellcastingAcceptsNull(t *testing.T) {
	assertValidCharacterSheetPayload(t, testCharacterSheetEnvelope())
}

func TestCharacterSheetSpellcastingStrictFields(t *testing.T) {
	for _, field := range []string{"ability", "spellSaveDC", "spellAttackBonus", "slots", "spells"} {
		t.Run("missing "+field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			spellcasting := validTestSpellcasting()
			delete(spellcasting, field)
			envelope["spellcasting"] = spellcasting
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}

	for _, field := range []struct{ exact, variant string }{
		{"ability", "Ability"}, {"spellSaveDC", "SpellSaveDC"}, {"spellAttackBonus", "SpellAttackBonus"},
		{"slots", "Slots"}, {"spells", "Spells"},
	} {
		t.Run("wrong-case "+field.exact, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			spellcasting := validTestSpellcasting()
			spellcasting[field.variant] = spellcasting[field.exact]
			delete(spellcasting, field.exact)
			envelope["spellcasting"] = spellcasting
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}

	for _, value := range []any{
		[]any{}, "wizard", map[string]any{"ability": "wisdom", "spellSaveDC": nil, "spellAttackBonus": nil, "slots": []any{}, "spells": []any{}, "unknown": true},
	} {
		envelope := testCharacterSheetEnvelope()
		envelope["spellcasting"] = value
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}

	for _, tt := range []struct {
		field string
		value any
	}{
		{"ability", nil}, {"spellSaveDC", "12"}, {"spellAttackBonus", []any{}}, {"slots", nil}, {"slots", map[string]any{}}, {"spells", map[string]any{}},
	} {
		envelope := testCharacterSheetEnvelope()
		spellcasting := validTestSpellcasting()
		spellcasting[tt.field] = tt.value
		envelope["spellcasting"] = spellcasting
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}
}

func TestCharacterSheetSpellcastingAbilities(t *testing.T) {
	for _, ability := range []string{"wisdom", "intelligence", "charisma"} {
		t.Run(ability, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			spellcasting := validTestSpellcasting()
			spellcasting["ability"] = ability
			envelope["spellcasting"] = spellcasting
			assertValidCharacterSheetPayload(t, envelope)
		})
	}
	for _, ability := range []any{"strength", "Wisdom", 1, nil} {
		envelope := testCharacterSheetEnvelope()
		spellcasting := validTestSpellcasting()
		spellcasting["ability"] = ability
		envelope["spellcasting"] = spellcasting
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}
}

func TestCharacterSheetSpellcastingAuditedNumbers(t *testing.T) {
	t.Run("both null", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		envelope["spellcasting"] = validTestSpellcasting()
		assertValidCharacterSheetPayload(t, envelope)
	})
	t.Run("both empty audited objects", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		spellcasting := validTestSpellcasting()
		spellcasting["spellSaveDC"] = map[string]any{}
		spellcasting["spellAttackBonus"] = map[string]any{}
		envelope["spellcasting"] = spellcasting
		assertValidCharacterSheetPayload(t, envelope)
	})

	for _, tt := range []struct {
		field   string
		minimum int
		maximum int
	}{
		{field: "spellSaveDC", minimum: 0, maximum: 100},
		{field: "spellAttackBonus", minimum: -100, maximum: 100},
	} {
		for _, value := range []int{tt.minimum, tt.maximum} {
			envelope := testCharacterSheetEnvelope()
			spellcasting := validTestSpellcasting()
			spellcasting[tt.field] = map[string]any{"value": value, "needsConfirmation": false, "note": "  " + strings.Repeat("界", 1000) + "  "}
			envelope["spellcasting"] = spellcasting
			assertValidCharacterSheetPayload(t, envelope)
		}
		for _, value := range []any{tt.minimum - 1, tt.maximum + 1, 1.5, nil} {
			envelope := testCharacterSheetEnvelope()
			spellcasting := validTestSpellcasting()
			spellcasting[tt.field] = map[string]any{"value": value}
			envelope["spellcasting"] = spellcasting
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		}
		for _, audited := range []any{
			map[string]any{"Value": tt.minimum},
			map[string]any{"NeedsConfirmation": false},
			map[string]any{"Note": "Review"},
			map[string]any{"needsConfirmation": "false"},
			map[string]any{"needsConfirmation": nil},
			map[string]any{"note": "  "},
			map[string]any{"note": 1},
			map[string]any{"note": nil},
			map[string]any{"note": strings.Repeat("界", 1001)},
			map[string]any{"unknown": true},
		} {
			envelope := testCharacterSheetEnvelope()
			spellcasting := validTestSpellcasting()
			spellcasting[tt.field] = audited
			envelope["spellcasting"] = spellcasting
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		}
	}
}

func TestCharacterSheetSpellSlotCollectionAndStrictFields(t *testing.T) {
	for _, count := range []int{0, 9} {
		envelope := testCharacterSheetEnvelope()
		spellcasting := validTestSpellcasting()
		spellcasting["slots"] = repeatedTestSpellSlots(count)
		envelope["spellcasting"] = spellcasting
		assertValidCharacterSheetPayload(t, envelope)
	}
	envelope := testCharacterSheetEnvelope()
	spellcasting := validTestSpellcasting()
	spellcasting["slots"] = append(repeatedTestSpellSlots(9), validTestSpellSlot(9))
	envelope["spellcasting"] = spellcasting
	assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)

	spellcasting = validTestSpellcasting()
	spellcasting["slots"] = []any{validTestSpellSlot(1), validTestSpellSlot(1)}
	envelope = testCharacterSheetEnvelope()
	envelope["spellcasting"] = spellcasting
	assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)

	for _, field := range []string{"level", "max", "used"} {
		slot := validTestSpellSlot(1)
		delete(slot, field)
		assertInvalidTestSlot(t, slot)
		variant := strings.ToUpper(field[:1]) + field[1:]
		slot = validTestSpellSlot(1)
		slot[variant] = slot[field]
		delete(slot, field)
		assertInvalidTestSlot(t, slot)
	}
	for _, slot := range []any{nil, "slot", map[string]any{"level": 1, "max": 1, "used": 0, "unknown": true}} {
		assertInvalidTestSlot(t, slot)
	}
}

func TestCharacterSheetSpellSlotNumericBoundaries(t *testing.T) {
	for _, slot := range []map[string]any{
		{"level": 1, "max": 0, "used": 0},
		{"level": 9, "max": 99, "used": 99},
	} {
		assertValidTestSlot(t, slot)
	}
	for _, slot := range []map[string]any{
		{"level": 0, "max": 1, "used": 0},
		{"level": 10, "max": 1, "used": 0},
		{"level": 1.5, "max": 1, "used": 0},
		{"level": nil, "max": 1, "used": 0},
		{"level": 1, "max": -1, "used": 0},
		{"level": 1, "max": 100, "used": 0},
		{"level": 1, "max": 1.5, "used": 0},
		{"level": 1, "max": nil, "used": 0},
		{"level": 1, "max": 1, "used": -1},
		{"level": 1, "max": 1, "used": 100},
		{"level": 1, "max": 1, "used": 0.5},
		{"level": 1, "max": 1, "used": nil},
		{"level": 1, "max": 1, "used": 2},
	} {
		assertInvalidTestSlot(t, slot)
	}
}

func TestCharacterSheetSpellCollectionLimitsAndIDs(t *testing.T) {
	for _, count := range []int{0, 128} {
		envelope := testCharacterSheetEnvelope()
		spellcasting := validTestSpellcasting()
		spellcasting["spells"] = repeatedTestSpells(count)
		envelope["spellcasting"] = spellcasting
		assertValidCharacterSheetPayload(t, envelope)
	}
	envelope := testCharacterSheetEnvelope()
	spellcasting := validTestSpellcasting()
	spellcasting["spells"] = repeatedTestSpells(129)
	envelope["spellcasting"] = spellcasting
	assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)

	spellcasting = validTestSpellcasting()
	spellcasting["spells"] = []any{validTestSpell("fog-cloud"), validTestSpell("fog-cloud")}
	envelope = testCharacterSheetEnvelope()
	envelope["spellcasting"] = spellcasting
	assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)

	for _, id := range []string{"a", strings.Repeat("a", 128)} {
		assertValidTestSpell(t, validTestSpell(id))
	}
	for _, id := range []any{"", "Fog-Cloud", "fog_cloud", strings.Repeat("a", 129), 1, nil} {
		spell := validTestSpell("fog-cloud")
		spell["id"] = id
		assertInvalidTestSpell(t, spell)
	}
}

func TestCharacterSheetSpellStrictFields(t *testing.T) {
	required := []string{"id", "name", "level", "actionType", "castingTime", "duration", "concentration", "summary", "meta", "preparedOrKnown", "source"}
	for _, field := range required {
		spell := validTestSpell("fog-cloud")
		delete(spell, field)
		assertInvalidTestSpell(t, spell)
	}
	for _, field := range append(required, "quickReference") {
		spell := validTestSpell("fog-cloud")
		if field == "quickReference" {
			spell[field] = validTestQuickReference()
		}
		variant := strings.ToUpper(field[:1]) + field[1:]
		spell[variant] = spell[field]
		delete(spell, field)
		assertInvalidTestSpell(t, spell)
	}
	for _, spell := range []any{nil, "spell", map[string]any{"id": "fog-cloud", "unknown": true}} {
		assertInvalidTestSpell(t, spell)
	}
	for _, tt := range []struct {
		field string
		value any
	}{
		{"name", nil}, {"level", nil}, {"actionType", 1}, {"castingTime", nil}, {"duration", true},
		{"concentration", "true"}, {"summary", 1}, {"meta", nil}, {"preparedOrKnown", nil}, {"source", []any{}},
		{"quickReference", nil},
	} {
		spell := validTestSpell("fog-cloud")
		spell[tt.field] = tt.value
		assertInvalidTestSpell(t, spell)
	}
}

func TestCharacterSheetSpellValueBoundaries(t *testing.T) {
	for _, field := range []struct {
		name    string
		maximum int
	}{
		{"name", 200}, {"actionType", 200}, {"castingTime", 200}, {"duration", 200}, {"summary", 1000},
	} {
		spell := validTestSpell("fog-cloud")
		spell[field.name] = "  " + strings.Repeat("界", field.maximum) + "  "
		assertValidTestSpell(t, spell)
		for _, invalid := range []any{"  ", 1, strings.Repeat("界", field.maximum+1)} {
			spell = validTestSpell("fog-cloud")
			spell[field.name] = invalid
			assertInvalidTestSpell(t, spell)
		}
	}
	for _, level := range []int{0, 9} {
		spell := validTestSpell("fog-cloud")
		spell["level"] = level
		assertValidTestSpell(t, spell)
	}
	for _, level := range []any{-1, 10, 1.5, nil} {
		spell := validTestSpell("fog-cloud")
		spell["level"] = level
		assertInvalidTestSpell(t, spell)
	}
	for _, value := range []any{"true", nil} {
		spell := validTestSpell("fog-cloud")
		spell["concentration"] = value
		assertInvalidTestSpell(t, spell)
	}
	for _, value := range []string{"prepared", "known"} {
		spell := validTestSpell("fog-cloud")
		spell["preparedOrKnown"] = value
		assertValidTestSpell(t, spell)
	}
	for _, value := range []any{"unknown", "Prepared", 1, nil} {
		spell := validTestSpell("fog-cloud")
		spell["preparedOrKnown"] = value
		assertInvalidTestSpell(t, spell)
	}

	for _, count := range []int{0, 16} {
		spell := validTestSpell("fog-cloud")
		spell["meta"] = repeatedSummaryStrings(count, "Meta")
		assertValidTestSpell(t, spell)
	}
	spell := validTestSpell("fog-cloud")
	spell["meta"] = repeatedSummaryStrings(17, "Meta")
	assertInvalidTestSpell(t, spell)
	spell = validTestSpell("fog-cloud")
	spell["meta"] = []any{"  " + strings.Repeat("界", 200) + "  "}
	assertValidTestSpell(t, spell)
	for _, value := range []any{"  ", 1, strings.Repeat("界", 201)} {
		spell = validTestSpell("fog-cloud")
		spell["meta"] = []any{value}
		assertInvalidTestSpell(t, spell)
	}
}

func TestCharacterSheetSpellReusesSourceAndQuickReferenceValidation(t *testing.T) {
	spell := validTestSpell("fog-cloud")
	spell["source"] = map[string]any{"rulesVersion": "2024", "status": "needs-confirmation", "note": "Needs review"}
	spell["quickReference"] = validTestQuickReference()
	assertValidTestSpell(t, spell)

	spell = validTestSpell("fog-cloud")
	spell["source"] = map[string]any{"rulesVersion": "2030", "status": "confirmed"}
	assertInvalidTestSpell(t, spell)
	spell = validTestSpell("fog-cloud")
	quickReference := validTestQuickReference()
	delete(quickReference, "title")
	spell["quickReference"] = quickReference
	assertInvalidTestSpell(t, spell)
}

func validTestSpellcasting() map[string]any {
	return map[string]any{"ability": "wisdom", "spellSaveDC": nil, "spellAttackBonus": nil, "slots": []any{}, "spells": []any{}}
}

func validTestSpellSlot(level int) map[string]any {
	return map[string]any{"level": level, "max": 1, "used": 0}
}

func validTestSpell(id string) map[string]any {
	return map[string]any{
		"id": id, "name": "Fog Cloud", "level": 1, "actionType": "Action", "castingTime": "Action",
		"duration": "Up to 1 hour", "concentration": true, "summary": "Create obscuring fog.", "meta": []any{},
		"preparedOrKnown": "known", "source": map[string]any{"rulesVersion": "2014", "status": "confirmed"},
	}
}

func repeatedTestSpellSlots(count int) []any {
	items := make([]any, count)
	for index := range items {
		items[index] = validTestSpellSlot(index + 1)
	}
	return items
}

func repeatedTestSpells(count int) []any {
	items := make([]any, count)
	for index := range items {
		items[index] = validTestSpell(fmt.Sprintf("spell-%d", index))
	}
	return items
}

func assertValidTestSlot(t *testing.T, slot map[string]any) {
	t.Helper()
	envelope := testCharacterSheetEnvelope()
	spellcasting := validTestSpellcasting()
	spellcasting["slots"] = []any{slot}
	envelope["spellcasting"] = spellcasting
	assertValidCharacterSheetPayload(t, envelope)
}

func assertInvalidTestSlot(t *testing.T, slot any) {
	t.Helper()
	envelope := testCharacterSheetEnvelope()
	spellcasting := validTestSpellcasting()
	spellcasting["slots"] = []any{slot}
	envelope["spellcasting"] = spellcasting
	assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
}

func assertValidTestSpell(t *testing.T, spell map[string]any) {
	t.Helper()
	envelope := testCharacterSheetEnvelope()
	spellcasting := validTestSpellcasting()
	spellcasting["spells"] = []any{spell}
	envelope["spellcasting"] = spellcasting
	assertValidCharacterSheetPayload(t, envelope)
}

func assertInvalidTestSpell(t *testing.T, spell any) {
	t.Helper()
	envelope := testCharacterSheetEnvelope()
	spellcasting := validTestSpellcasting()
	spellcasting["spells"] = []any{spell}
	envelope["spellcasting"] = spellcasting
	assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
}
