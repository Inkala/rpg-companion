package characters

import (
	"strings"
	"testing"
)

var equipmentAuditedListFields = []string{"armor", "packsAndGear", "tools", "languages"}
var personalityFields = []string{"traits", "ideals", "bonds", "flaws", "notes"}
var auditArrayFields = []string{"needsConfirmation", "rulesVersionWarnings", "deferredCorrections"}

func TestCharacterSheetEquipmentStrictFields(t *testing.T) {
	for _, field := range []string{"armor", "weapons", "packsAndGear", "tools", "languages", "currency"} {
		t.Run("missing "+field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			delete(testEquipment(envelope), field)
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
		variant := strings.ToUpper(field[:1]) + field[1:]
		t.Run("wrong-case "+field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			equipment := testEquipment(envelope)
			equipment[variant] = equipment[field]
			delete(equipment, field)
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
	t.Run("unknown", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testEquipment(envelope)["unknown"] = true
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})
	for _, tt := range []struct {
		field string
		value any
	}{
		{"armor", nil}, {"weapons", map[string]any{}}, {"packsAndGear", []any{}}, {"tools", "tools"}, {"languages", true}, {"currency", []any{}},
	} {
		envelope := testCharacterSheetEnvelope()
		testEquipment(envelope)[tt.field] = tt.value
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}
}

func TestCharacterSheetEquipmentAuditedLists(t *testing.T) {
	for _, field := range equipmentAuditedListFields {
		t.Run(field+" strict fields", func(t *testing.T) {
			for _, mutation := range []func(map[string]any){
				func(list map[string]any) { delete(list, "values") },
				func(list map[string]any) { list["Values"] = list["values"]; delete(list, "values") },
				func(list map[string]any) { list["NeedsConfirmation"] = true },
				func(list map[string]any) { list["Note"] = "Review" },
				func(list map[string]any) { list["unknown"] = true },
			} {
				envelope := testCharacterSheetEnvelope()
				mutation(testEquipmentList(envelope, field))
				assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
			}
		})
	}

	for _, count := range []int{0, 64} {
		envelope := testCharacterSheetEnvelope()
		testEquipmentList(envelope, "armor")["values"] = repeatedSummaryStrings(count, "Armor")
		assertValidCharacterSheetPayload(t, envelope)
	}
	envelope := testCharacterSheetEnvelope()
	testEquipmentList(envelope, "armor")["values"] = repeatedSummaryStrings(65, "Armor")
	assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	envelope = testCharacterSheetEnvelope()
	testEquipmentList(envelope, "tools")["values"] = []any{"  " + strings.Repeat("界", 200) + "  "}
	assertValidCharacterSheetPayload(t, envelope)
	for _, value := range []any{"  ", 1, strings.Repeat("界", 201)} {
		envelope = testCharacterSheetEnvelope()
		testEquipmentList(envelope, "languages")["values"] = []any{value}
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}

	envelope = testCharacterSheetEnvelope()
	list := testEquipmentList(envelope, "packsAndGear")
	list["needsConfirmation"] = false
	list["note"] = "  " + strings.Repeat("界", 1000) + "  "
	assertValidCharacterSheetPayload(t, envelope)
	for _, tt := range []struct {
		field string
		value any
	}{
		{"needsConfirmation", "false"}, {"needsConfirmation", nil}, {"note", "  "}, {"note", 1}, {"note", nil}, {"note", strings.Repeat("界", 1001)},
	} {
		envelope = testCharacterSheetEnvelope()
		testEquipmentList(envelope, "packsAndGear")[tt.field] = tt.value
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}
}

func TestCharacterSheetEquipmentWeapons(t *testing.T) {
	for _, count := range []int{0, 64} {
		envelope := testCharacterSheetEnvelope()
		testEquipment(envelope)["weapons"] = repeatedSummaryStrings(count, "Weapon")
		assertValidCharacterSheetPayload(t, envelope)
	}
	envelope := testCharacterSheetEnvelope()
	testEquipment(envelope)["weapons"] = repeatedSummaryStrings(65, "Weapon")
	assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	envelope = testCharacterSheetEnvelope()
	testEquipment(envelope)["weapons"] = []any{"  " + strings.Repeat("界", 200) + "  "}
	assertValidCharacterSheetPayload(t, envelope)
	for _, value := range []any{"  ", 1, strings.Repeat("界", 201)} {
		envelope = testCharacterSheetEnvelope()
		testEquipment(envelope)["weapons"] = []any{value}
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}
}

func TestCharacterSheetEquipmentCurrency(t *testing.T) {
	for _, currency := range []any{nil, map[string]any{}} {
		envelope := testCharacterSheetEnvelope()
		testEquipment(envelope)["currency"] = currency
		assertValidCharacterSheetPayload(t, envelope)
	}
	for _, denomination := range []string{"cp", "sp", "ep", "gp", "pp"} {
		for _, value := range []int{0, 1000000} {
			envelope := testCharacterSheetEnvelope()
			testEquipment(envelope)["currency"] = map[string]any{denomination: value}
			assertValidCharacterSheetPayload(t, envelope)
		}
		for _, value := range []any{-1, 1000001, 1.5, nil} {
			envelope := testCharacterSheetEnvelope()
			testEquipment(envelope)["currency"] = map[string]any{denomination: value}
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		}
		variant := strings.ToUpper(denomination)
		envelope := testCharacterSheetEnvelope()
		testEquipment(envelope)["currency"] = map[string]any{variant: 1}
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}

	envelope := testCharacterSheetEnvelope()
	testEquipment(envelope)["currency"] = map[string]any{"needsConfirmation": true, "note": "  " + strings.Repeat("界", 1000) + "  "}
	assertValidCharacterSheetPayload(t, envelope)
	for _, currency := range []any{
		map[string]any{"NeedsConfirmation": true}, map[string]any{"Note": "Review"}, map[string]any{"unknown": true},
		map[string]any{"needsConfirmation": "true"}, map[string]any{"needsConfirmation": nil},
		map[string]any{"note": "  "}, map[string]any{"note": 1}, map[string]any{"note": nil}, map[string]any{"note": strings.Repeat("界", 1001)},
	} {
		envelope = testCharacterSheetEnvelope()
		testEquipment(envelope)["currency"] = currency
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}
}

func TestCharacterSheetPersonalityStrictFields(t *testing.T) {
	for _, field := range personalityFields {
		for _, mutation := range []func(map[string]any){
			func(personality map[string]any) { delete(personality, field) },
			func(personality map[string]any) {
				variant := strings.ToUpper(field[:1]) + field[1:]
				personality[variant] = personality[field]
				delete(personality, field)
			},
		} {
			envelope := testCharacterSheetEnvelope()
			mutation(testPersonality(envelope))
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		}
	}
	envelope := testCharacterSheetEnvelope()
	testPersonality(envelope)["unknown"] = true
	assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	for _, value := range []any{nil, map[string]any{}} {
		envelope = testCharacterSheetEnvelope()
		testPersonality(envelope)["traits"] = value
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}
}

func TestCharacterSheetPersonalityCollectionBoundaries(t *testing.T) {
	for _, field := range personalityFields {
		for _, count := range []int{0, 32} {
			envelope := testCharacterSheetEnvelope()
			testPersonality(envelope)[field] = repeatedSummaryStrings(count, "Text")
			assertValidCharacterSheetPayload(t, envelope)
		}
		envelope := testCharacterSheetEnvelope()
		testPersonality(envelope)[field] = repeatedSummaryStrings(33, "Text")
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}
	envelope := testCharacterSheetEnvelope()
	testPersonality(envelope)["notes"] = []any{"  " + strings.Repeat("界", 1000) + "  "}
	assertValidCharacterSheetPayload(t, envelope)
	for _, value := range []any{"  ", 1, strings.Repeat("界", 1001)} {
		envelope = testCharacterSheetEnvelope()
		testPersonality(envelope)["traits"] = []any{value}
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}
}

func TestCharacterSheetAuditStrictFields(t *testing.T) {
	for _, field := range append([]string{"source"}, auditArrayFields...) {
		envelope := testCharacterSheetEnvelope()
		delete(testAudit(envelope), field)
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		variant := strings.ToUpper(field[:1]) + field[1:]
		envelope = testCharacterSheetEnvelope()
		audit := testAudit(envelope)
		audit[variant] = audit[field]
		delete(audit, field)
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}
	envelope := testCharacterSheetEnvelope()
	testAudit(envelope)["unknown"] = true
	assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	for _, tt := range []struct {
		field string
		value any
	}{{"source", nil}, {"needsConfirmation", nil}, {"rulesVersionWarnings", map[string]any{}}, {"deferredCorrections", "none"}} {
		envelope = testCharacterSheetEnvelope()
		testAudit(envelope)[tt.field] = tt.value
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}
}

func TestCharacterSheetAuditBoundaries(t *testing.T) {
	envelope := testCharacterSheetEnvelope()
	testAudit(envelope)["source"] = "  " + strings.Repeat("界", 1000) + "  "
	assertValidCharacterSheetPayload(t, envelope)
	for _, source := range []any{"  ", 1, strings.Repeat("界", 1001)} {
		envelope = testCharacterSheetEnvelope()
		testAudit(envelope)["source"] = source
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}
	for _, field := range auditArrayFields {
		for _, count := range []int{0, 64} {
			envelope = testCharacterSheetEnvelope()
			testAudit(envelope)[field] = repeatedSummaryStrings(count, "Audit")
			assertValidCharacterSheetPayload(t, envelope)
		}
		envelope = testCharacterSheetEnvelope()
		testAudit(envelope)[field] = repeatedSummaryStrings(65, "Audit")
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}
	envelope = testCharacterSheetEnvelope()
	testAudit(envelope)["needsConfirmation"] = []any{"  " + strings.Repeat("界", 1000) + "  "}
	assertValidCharacterSheetPayload(t, envelope)
	for _, value := range []any{"  ", 1, strings.Repeat("界", 1001)} {
		envelope = testCharacterSheetEnvelope()
		testAudit(envelope)["deferredCorrections"] = []any{value}
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	}
}

func testEquipment(envelope map[string]any) map[string]any {
	return envelope["equipment"].(map[string]any)
}
func testEquipmentList(envelope map[string]any, field string) map[string]any {
	return testEquipment(envelope)[field].(map[string]any)
}
func testPersonality(envelope map[string]any) map[string]any {
	return envelope["personality"].(map[string]any)
}
func testAudit(envelope map[string]any) map[string]any { return envelope["audit"].(map[string]any) }
