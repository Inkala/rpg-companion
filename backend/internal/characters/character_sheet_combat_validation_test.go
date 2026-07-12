package characters

import (
	"strings"
	"testing"
)

func TestCharacterSheetCombatRejectsEveryMissingRequiredField(t *testing.T) {
	for _, field := range []string{
		"hitPoints", "armorClass", "initiative", "speed", "proficiencyBonus", "passivePerception", "concentration",
	} {
		t.Run(field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			delete(testCombat(envelope), field)
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetCombatRejectsUnknownAndWrongCaseFields(t *testing.T) {
	t.Run("unknown", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testCombat(envelope)["unknown"] = true
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})

	for _, field := range []struct {
		exact   string
		variant string
	}{
		{exact: "hitPoints", variant: "HitPoints"},
		{exact: "armorClass", variant: "ArmorClass"},
		{exact: "initiative", variant: "Initiative"},
		{exact: "speed", variant: "Speed"},
		{exact: "proficiencyBonus", variant: "ProficiencyBonus"},
		{exact: "passivePerception", variant: "PassivePerception"},
		{exact: "concentration", variant: "Concentration"},
	} {
		t.Run(field.variant, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			combat := testCombat(envelope)
			combat[field.variant] = combat[field.exact]
			delete(combat, field.exact)
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetCombatRejectsWrongFieldTypes(t *testing.T) {
	for _, tt := range []struct {
		field string
		value any
	}{
		{field: "hitPoints", value: []any{}},
		{field: "armorClass", value: []any{}},
		{field: "initiative", value: "3"},
		{field: "speed", value: map[string]any{}},
		{field: "proficiencyBonus", value: "2"},
		{field: "passivePerception", value: []any{}},
		{field: "concentration", value: 1},
	} {
		t.Run(tt.field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testCombat(envelope)[tt.field] = tt.value
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetCombatHitPointsStrictFields(t *testing.T) {
	for _, field := range []string{"current", "max", "temporary"} {
		t.Run("missing "+field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			delete(testCombatHitPoints(envelope), field)
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
		t.Run("wrong-case "+field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			hitPoints := testCombatHitPoints(envelope)
			variant := strings.ToUpper(field[:1]) + field[1:]
			hitPoints[variant] = hitPoints[field]
			delete(hitPoints, field)
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}

	t.Run("unknown", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testCombatHitPoints(envelope)["unknown"] = 1
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})
}

func TestCharacterSheetCombatHitPointBoundariesAndConsistency(t *testing.T) {
	t.Run("zero", func(t *testing.T) {
		request := validCreateCharacterRequest()
		request.HitPoints.Current = intPtr(0)
		request.HitPoints.Max = intPtr(0)
		envelope := testCharacterSheetEnvelope()
		hitPoints := testCombatHitPoints(envelope)
		hitPoints["current"], hitPoints["max"], hitPoints["temporary"] = 0, 0, 0
		assertValidCharacterSheetForRequest(t, request, envelope)
	})

	t.Run("9999", func(t *testing.T) {
		request := validCreateCharacterRequest()
		request.HitPoints.Current = intPtr(9999)
		request.HitPoints.Max = intPtr(9999)
		envelope := testCharacterSheetEnvelope()
		hitPoints := testCombatHitPoints(envelope)
		hitPoints["current"], hitPoints["max"], hitPoints["temporary"] = 9999, 9999, 9999
		assertValidCharacterSheetForRequest(t, request, envelope)
	})

	for _, tt := range []struct {
		name   string
		mutate func(map[string]any)
	}{
		{name: "null", mutate: func(hp map[string]any) { hp["temporary"] = nil }},
		{name: "fractional", mutate: func(hp map[string]any) { hp["temporary"] = 0.5 }},
		{name: "negative", mutate: func(hp map[string]any) { hp["temporary"] = -1 }},
		{name: "overflow", mutate: func(hp map[string]any) { hp["temporary"] = 10000 }},
		{name: "current over max", mutate: func(hp map[string]any) { hp["current"], hp["max"] = 27, 26 }},
	} {
		t.Run(tt.name, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			tt.mutate(testCombatHitPoints(envelope))
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}

	for _, field := range []string{"current", "max"} {
		t.Run(field+" top-level mismatch", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testCombatHitPoints(envelope)[field] = 25
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetCombatArmorClassBoundariesAndConsistency(t *testing.T) {
	t.Run("missing value", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testCombat(envelope)["armorClass"] = map[string]any{}
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})

	for _, value := range []int{0, 100} {
		t.Run("valid boundary", func(t *testing.T) {
			request := validCreateCharacterRequest()
			request.ArmorClass = intPtr(value)
			envelope := testCharacterSheetEnvelope()
			testCombat(envelope)["armorClass"] = map[string]any{"value": value}
			assertValidCharacterSheetForRequest(t, request, envelope)
		})
	}

	for _, value := range []any{nil, -1, 101, 14.5} {
		t.Run("invalid value", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testCombat(envelope)["armorClass"] = map[string]any{"value": value}
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}

	t.Run("top-level mismatch", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testCombat(envelope)["armorClass"] = map[string]any{"value": 15}
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})
}

func TestCharacterSheetCombatAuditedNumberStrictFields(t *testing.T) {
	for _, combatField := range []string{"armorClass", "passivePerception"} {
		t.Run(combatField, func(t *testing.T) {
			tests := []struct {
				name   string
				mutate func(map[string]any)
			}{
				{name: "unknown", mutate: func(value map[string]any) { value["unknown"] = true }},
				{name: "wrong-case value", mutate: func(value map[string]any) { value["Value"] = value["value"]; delete(value, "value") }},
				{name: "wrong-case confirmation", mutate: func(value map[string]any) { value["NeedsConfirmation"] = true }},
				{name: "wrong-case note", mutate: func(value map[string]any) { value["Note"] = "note" }},
				{name: "invalid confirmation", mutate: func(value map[string]any) { value["needsConfirmation"] = "true" }},
				{name: "blank note", mutate: func(value map[string]any) { value["note"] = "  " }},
				{name: "note overflow", mutate: func(value map[string]any) { value["note"] = strings.Repeat("界", 1001) }},
			}
			for _, tt := range tests {
				t.Run(tt.name, func(t *testing.T) {
					envelope := testCharacterSheetEnvelope()
					audited := testCombat(envelope)[combatField].(map[string]any)
					if combatField == "passivePerception" {
						audited["value"] = 14
					}
					tt.mutate(audited)
					assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
				})
			}
		})
	}

	t.Run("exact note limit", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testCombat(envelope)["armorClass"] = map[string]any{
			"value": 14,
			"note":  "  " + strings.Repeat("界", 1000) + "  ",
		}
		assertValidCharacterSheetPayload(t, envelope)
	})
}

func TestCharacterSheetCombatInitiativeBoundaries(t *testing.T) {
	for _, value := range []int{-100, 100} {
		t.Run("valid boundary", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testCombat(envelope)["initiative"] = value
			assertValidCharacterSheetPayload(t, envelope)
		})
	}
	for _, value := range []any{nil, -101, 101, 3.5} {
		t.Run("invalid", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testCombat(envelope)["initiative"] = value
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetCombatSpeedStructure(t *testing.T) {
	for _, tt := range []struct {
		name  string
		value any
	}{
		{name: "zero entries", value: []any{}},
		{name: "two entries", value: []any{testWalkSpeed(30), testWalkSpeed(30)}},
		{name: "duplicate entries", value: []any{testWalkSpeed(30), testWalkSpeed(30)}},
		{name: "unsupported type", value: []any{map[string]any{"type": "fly", "feet": 30}}},
		{name: "malformed entry", value: []any{"walk"}},
		{name: "missing type", value: []any{map[string]any{"feet": 30}}},
		{name: "missing feet", value: []any{map[string]any{"type": "walk"}}},
		{name: "unknown entry field", value: []any{map[string]any{"type": "walk", "feet": 30, "unknown": true}}},
		{name: "wrong-case type", value: []any{map[string]any{"Type": "walk", "feet": 30}}},
		{name: "wrong-case feet", value: []any{map[string]any{"type": "walk", "Feet": 30}}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testCombat(envelope)["speed"] = tt.value
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetCombatSpeedBoundariesAndConsistency(t *testing.T) {
	for _, value := range []int{0, 1000} {
		t.Run("valid boundary", func(t *testing.T) {
			request := validCreateCharacterRequest()
			request.SpeedFt = intPtr(value)
			envelope := testCharacterSheetEnvelope()
			testCombat(envelope)["speed"] = []any{testWalkSpeed(value)}
			assertValidCharacterSheetForRequest(t, request, envelope)
		})
	}
	for _, value := range []any{nil, -1, 1001, 30.5} {
		t.Run("invalid", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testCombat(envelope)["speed"] = []any{map[string]any{"type": "walk", "feet": value}}
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
	t.Run("top-level mismatch", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testCombat(envelope)["speed"] = []any{testWalkSpeed(35)}
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})
}

func TestCharacterSheetCombatProficiencyBonusBoundaries(t *testing.T) {
	for _, value := range []int{0, 20} {
		t.Run("valid boundary", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testCombat(envelope)["proficiencyBonus"] = value
			assertValidCharacterSheetPayload(t, envelope)
		})
	}
	for _, value := range []any{nil, -1, 21, 2.5} {
		t.Run("invalid", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testCombat(envelope)["proficiencyBonus"] = value
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetCombatPassivePerceptionValueRules(t *testing.T) {
	t.Run("value omitted", func(t *testing.T) {
		assertValidCharacterSheetPayload(t, testCharacterSheetEnvelope())
	})
	for _, value := range []int{0, 100} {
		t.Run("valid boundary", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testCombat(envelope)["passivePerception"] = map[string]any{"value": value}
			assertValidCharacterSheetPayload(t, envelope)
		})
	}
	for _, value := range []any{nil, -1, 101, 14.5} {
		t.Run("invalid", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testCombat(envelope)["passivePerception"] = map[string]any{"value": value}
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetCombatConcentrationRules(t *testing.T) {
	for _, value := range []any{nil, "Hunter's Mark", "  " + strings.Repeat("界", 200) + "  "} {
		t.Run("valid", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testCombat(envelope)["concentration"] = value
			assertValidCharacterSheetPayload(t, envelope)
		})
	}
	for _, value := range []any{"  ", true, strings.Repeat("界", 201)} {
		t.Run("invalid", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testCombat(envelope)["concentration"] = value
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func testCombat(envelope map[string]any) map[string]any {
	return envelope["combat"].(map[string]any)
}

func testCombatHitPoints(envelope map[string]any) map[string]any {
	return testCombat(envelope)["hitPoints"].(map[string]any)
}

func testWalkSpeed(feet int) map[string]any {
	return map[string]any{"type": "walk", "feet": feet}
}
