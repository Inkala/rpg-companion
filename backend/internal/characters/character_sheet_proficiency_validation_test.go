package characters

import (
	"strings"
	"testing"
)

var auditedProficiencyFields = []string{"savingThrows", "weapons", "armor", "tools", "languages"}

func TestCharacterSheetProficienciesRejectEveryMissingRequiredField(t *testing.T) {
	for _, field := range []string{"savingThrows", "skills", "weapons", "armor", "tools", "languages"} {
		t.Run(field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			delete(testProficiencies(envelope), field)
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetProficienciesRejectUnknownAndWrongCaseFields(t *testing.T) {
	t.Run("unknown", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testProficiencies(envelope)["unknown"] = true
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})

	for _, field := range []struct {
		exact   string
		variant string
	}{
		{exact: "savingThrows", variant: "SavingThrows"},
		{exact: "skills", variant: "Skills"},
		{exact: "weapons", variant: "Weapons"},
		{exact: "armor", variant: "Armor"},
		{exact: "tools", variant: "Tools"},
		{exact: "languages", variant: "Languages"},
	} {
		t.Run(field.variant, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			proficiencies := testProficiencies(envelope)
			proficiencies[field.variant] = proficiencies[field.exact]
			delete(proficiencies, field.exact)
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetProficienciesRejectWrongFieldTypes(t *testing.T) {
	for _, tt := range []struct {
		field string
		value any
	}{
		{field: "savingThrows", value: []any{}},
		{field: "skills", value: map[string]any{}},
		{field: "weapons", value: "Longbow"},
		{field: "armor", value: []any{}},
		{field: "tools", value: nil},
		{field: "languages", value: true},
	} {
		t.Run(tt.field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testProficiencies(envelope)[tt.field] = tt.value
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetAuditedProficiencyListsRequireExactValuesField(t *testing.T) {
	for _, field := range auditedProficiencyFields {
		t.Run(field+" missing values", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			delete(testAuditedProficiencyList(envelope, field), "values")
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
		t.Run(field+" wrong-case values", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			list := testAuditedProficiencyList(envelope, field)
			list["Values"] = list["values"]
			delete(list, "values")
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
		t.Run(field+" unknown", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testAuditedProficiencyList(envelope, field)["unknown"] = true
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
		t.Run(field+" wrong-case confirmation", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testAuditedProficiencyList(envelope, field)["NeedsConfirmation"] = true
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
		t.Run(field+" wrong-case note", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testAuditedProficiencyList(envelope, field)["Note"] = "Needs review"
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetAuditedProficiencyListValueBoundaries(t *testing.T) {
	t.Run("empty", func(t *testing.T) {
		assertValidCharacterSheetPayload(t, testCharacterSheetEnvelope())
	})
	t.Run("64 entries", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testAuditedProficiencyList(envelope, "weapons")["values"] = repeatedSummaryStrings(64, "Weapon")
		assertValidCharacterSheetPayload(t, envelope)
	})
	t.Run("65 entries", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testAuditedProficiencyList(envelope, "weapons")["values"] = repeatedSummaryStrings(65, "Weapon")
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})
	t.Run("exact 200-rune entry", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testAuditedProficiencyList(envelope, "languages")["values"] = []any{"  " + strings.Repeat("界", 200) + "  "}
		assertValidCharacterSheetPayload(t, envelope)
	})

	for _, tt := range []struct {
		name  string
		value any
	}{
		{name: "values object", value: map[string]any{}},
		{name: "values null", value: nil},
		{name: "blank", value: "  "},
		{name: "non-string", value: 1},
		{name: "201 runes", value: strings.Repeat("界", 201)},
	} {
		t.Run(tt.name, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			if strings.HasPrefix(tt.name, "values ") {
				testAuditedProficiencyList(envelope, "tools")["values"] = tt.value
			} else {
				testAuditedProficiencyList(envelope, "tools")["values"] = []any{tt.value}
			}
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetAuditedProficiencyListMetadata(t *testing.T) {
	t.Run("valid boolean and exact note boundary", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		list := testAuditedProficiencyList(envelope, "savingThrows")
		list["needsConfirmation"] = false
		list["note"] = "  " + strings.Repeat("界", 1000) + "  "
		assertValidCharacterSheetPayload(t, envelope)
	})

	for _, tt := range []struct {
		name  string
		field string
		value any
	}{
		{name: "non-boolean confirmation", field: "needsConfirmation", value: "true"},
		{name: "null confirmation", field: "needsConfirmation", value: nil},
		{name: "blank note", field: "note", value: "  "},
		{name: "null note", field: "note", value: nil},
		{name: "note overflow", field: "note", value: strings.Repeat("界", 1001)},
	} {
		t.Run(tt.name, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testAuditedProficiencyList(envelope, "armor")[tt.field] = tt.value
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetSkillsCountBoundaries(t *testing.T) {
	t.Run("empty", func(t *testing.T) {
		assertValidCharacterSheetPayload(t, testCharacterSheetEnvelope())
	})
	t.Run("30 entries", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testProficiencies(envelope)["skills"] = repeatedTestSkills(30)
		assertValidCharacterSheetPayload(t, envelope)
	})
	t.Run("31 entries", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testProficiencies(envelope)["skills"] = repeatedTestSkills(31)
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})
}

func TestCharacterSheetSkillStrictFields(t *testing.T) {
	for _, field := range []string{"name", "proficient", "modifier"} {
		t.Run("missing "+field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			skill := validTestSkill()
			delete(skill, field)
			testProficiencies(envelope)["skills"] = []any{skill}
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}

	for _, field := range []struct {
		exact   string
		variant string
	}{
		{exact: "name", variant: "Name"},
		{exact: "proficient", variant: "Proficient"},
		{exact: "modifier", variant: "Modifier"},
		{exact: "needsConfirmation", variant: "NeedsConfirmation"},
		{exact: "note", variant: "Note"},
	} {
		t.Run("wrong-case "+field.exact, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			skill := validTestSkill()
			if _, exists := skill[field.exact]; !exists {
				skill[field.exact] = optionalSkillValue(field.exact)
			}
			skill[field.variant] = skill[field.exact]
			delete(skill, field.exact)
			testProficiencies(envelope)["skills"] = []any{skill}
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}

	for _, tt := range []struct {
		name  string
		value any
	}{
		{name: "unknown", value: map[string]any{"name": "Perception", "proficient": true, "modifier": 4, "unknown": true}},
		{name: "string entry", value: "Perception"},
		{name: "null entry", value: nil},
	} {
		t.Run(tt.name, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testProficiencies(envelope)["skills"] = []any{tt.value}
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetSkillValueBoundaries(t *testing.T) {
	t.Run("exact name and note boundaries", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		skill := validTestSkill()
		skill["name"] = "  " + strings.Repeat("界", 200) + "  "
		skill["needsConfirmation"] = true
		skill["note"] = "  " + strings.Repeat("界", 1000) + "  "
		testProficiencies(envelope)["skills"] = []any{skill}
		assertValidCharacterSheetPayload(t, envelope)
	})

	for _, tt := range []struct {
		name  string
		field string
		value any
	}{
		{name: "blank name", field: "name", value: "  "},
		{name: "non-string name", field: "name", value: 1},
		{name: "name overflow", field: "name", value: strings.Repeat("界", 201)},
		{name: "non-boolean proficient", field: "proficient", value: "true"},
		{name: "null proficient", field: "proficient", value: nil},
		{name: "non-boolean confirmation", field: "needsConfirmation", value: "false"},
		{name: "null confirmation", field: "needsConfirmation", value: nil},
		{name: "blank note", field: "note", value: "  "},
		{name: "null note", field: "note", value: nil},
		{name: "note overflow", field: "note", value: strings.Repeat("界", 1001)},
	} {
		t.Run(tt.name, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			skill := validTestSkill()
			skill[tt.field] = tt.value
			testProficiencies(envelope)["skills"] = []any{skill}
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}

	for _, value := range []int{-100, 100} {
		t.Run("valid modifier boundary", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			skill := validTestSkill()
			skill["modifier"] = value
			testProficiencies(envelope)["skills"] = []any{skill}
			assertValidCharacterSheetPayload(t, envelope)
		})
	}
	for _, value := range []any{-101, 101, 4.5, nil} {
		t.Run("invalid modifier", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			skill := validTestSkill()
			skill["modifier"] = value
			testProficiencies(envelope)["skills"] = []any{skill}
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func testProficiencies(envelope map[string]any) map[string]any {
	return envelope["proficiencies"].(map[string]any)
}

func testAuditedProficiencyList(envelope map[string]any, field string) map[string]any {
	return testProficiencies(envelope)[field].(map[string]any)
}

func validTestSkill() map[string]any {
	return map[string]any{"name": "Perception", "proficient": true, "modifier": 4}
}

func repeatedTestSkills(count int) []any {
	values := make([]any, count)
	for index := range values {
		values[index] = validTestSkill()
	}
	return values
}

func optionalSkillValue(field string) any {
	if field == "needsConfirmation" {
		return true
	}
	return "Needs review"
}
