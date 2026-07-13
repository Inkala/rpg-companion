package characters

import (
	"strings"
	"testing"
	"time"
)

func TestCharacterSheetIdentityAcceptsSingleAndMulticlassBoundaries(t *testing.T) {
	t.Run("one class", func(t *testing.T) {
		assertValidCharacterSheetPayload(t, testCharacterSheetEnvelope())
	})

	t.Run("multiclass", func(t *testing.T) {
		request := validCreateCharacterRequest()
		request.Level = 4
		envelope := testCharacterSheetEnvelope()
		envelope["identity"].(map[string]any)["classes"] = []any{
			map[string]any{"name": "Ranger", "level": 3, "subclass": "Hunter"},
			map[string]any{"name": "Fighter", "level": 1},
		}
		assertValidCharacterSheetForRequest(t, request, envelope)
	})

	t.Run("four classes", func(t *testing.T) {
		request := validCreateCharacterRequest()
		request.Level = 4
		envelope := testCharacterSheetEnvelope()
		envelope["identity"].(map[string]any)["classes"] = []any{
			map[string]any{"name": "Ranger", "level": 1, "subclass": "Hunter"},
			map[string]any{"name": "Fighter", "level": 1},
			map[string]any{"name": "Rogue", "level": 1},
			map[string]any{"name": "Wizard", "level": 1},
		}
		assertValidCharacterSheetForRequest(t, request, envelope)
	})
}

func TestCharacterSheetIdentityRejectsInvalidClassCountsAndLevelSum(t *testing.T) {
	tests := []struct {
		name    string
		classes []any
	}{
		{name: "empty classes", classes: []any{}},
		{name: "five classes", classes: []any{
			map[string]any{"name": "Ranger", "level": 1, "subclass": "Hunter"},
			map[string]any{"name": "Fighter", "level": 1},
			map[string]any{"name": "Rogue", "level": 1},
			map[string]any{"name": "Wizard", "level": 1},
			map[string]any{"name": "Cleric", "level": 1},
		}},
		{name: "level sum mismatch", classes: []any{map[string]any{"name": "Ranger", "level": 2, "subclass": "Hunter"}}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			envelope["identity"].(map[string]any)["classes"] = tt.classes
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetIdentityRejectsTopLevelInconsistency(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*createCharacterRequest, map[string]any)
	}{
		{name: "name", mutate: func(_ *createCharacterRequest, envelope map[string]any) {
			envelope["identity"].(map[string]any)["name"] = "Other"
		}},
		{name: "ancestry", mutate: func(_ *createCharacterRequest, envelope map[string]any) {
			envelope["identity"].(map[string]any)["ancestry"] = "Elf"
		}},
		{name: "background", mutate: func(_ *createCharacterRequest, envelope map[string]any) {
			envelope["identity"].(map[string]any)["background"] = "Sage"
		}},
		{name: "class name", mutate: func(_ *createCharacterRequest, envelope map[string]any) {
			envelope["identity"].(map[string]any)["classes"] = []any{map[string]any{"name": "Fighter", "level": 3}}
		}},
		{name: "missing matching subclass", mutate: func(_ *createCharacterRequest, envelope map[string]any) {
			envelope["identity"].(map[string]any)["classes"] = []any{map[string]any{"name": "Ranger", "level": 3}}
		}},
		{name: "different matching subclass", mutate: func(_ *createCharacterRequest, envelope map[string]any) {
			envelope["identity"].(map[string]any)["classes"] = []any{map[string]any{"name": "Ranger", "level": 3, "subclass": "Beast Master"}}
		}},
		{name: "invented subclass for nil top-level", mutate: func(request *createCharacterRequest, _ map[string]any) {
			request.SubclassName = nil
		}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := validCreateCharacterRequest()
			envelope := testCharacterSheetEnvelope()
			tt.mutate(&request, envelope)
			assertInvalidCharacterSheetForRequest(t, request, envelope)
		})
	}
}

func TestCharacterSheetIdentityAllowsMatchingNilSubclass(t *testing.T) {
	request := validCreateCharacterRequest()
	request.SubclassName = nil
	envelope := testCharacterSheetEnvelope()
	class := envelope["identity"].(map[string]any)["classes"].([]any)[0].(map[string]any)
	delete(class, "subclass")
	assertValidCharacterSheetForRequest(t, request, envelope)
}

func TestCharacterSheetIdentityRejectsMissingUnknownAndWrongCaseFields(t *testing.T) {
	for _, field := range []string{"name", "ancestry", "background", "classes"} {
		t.Run("missing identity "+field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			delete(envelope["identity"].(map[string]any), field)
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}

	t.Run("unknown identity field", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		envelope["identity"].(map[string]any)["unknown"] = true
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})

	t.Run("wrong-case identity field", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		identity := envelope["identity"].(map[string]any)
		identity["Name"] = identity["name"]
		delete(identity, "name")
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})

	for _, field := range []string{"name", "level"} {
		t.Run("missing class "+field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			class := firstTestClass(envelope)
			delete(class, field)
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}

	t.Run("unknown class field", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		firstTestClass(envelope)["unknown"] = true
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})

	t.Run("wrong-case class field", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		class := firstTestClass(envelope)
		class["Name"] = class["name"]
		delete(class, "name")
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})
}

func TestCharacterSheetIdentityRejectsEmptyRequiredStringsAndInvalidClassesShape(t *testing.T) {
	for _, field := range []string{"name", "ancestry", "background"} {
		t.Run("empty "+field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			envelope["identity"].(map[string]any)[field] = "   "
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}

	t.Run("classes object", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		envelope["identity"].(map[string]any)["classes"] = map[string]any{}
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})
}

func TestCharacterSheetIdentityOptionalTextBoundaries(t *testing.T) {
	tests := []struct {
		field string
		limit int
	}{
		{field: "alignment", limit: 200},
		{field: "concept", limit: 1000},
	}

	for _, tt := range tests {
		t.Run(tt.field+" exact limit", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			envelope["identity"].(map[string]any)[tt.field] = strings.Repeat("界", tt.limit)
			assertValidCharacterSheetPayload(t, envelope)
		})
		t.Run(tt.field+" overflow", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			envelope["identity"].(map[string]any)[tt.field] = strings.Repeat("界", tt.limit+1)
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
		t.Run(tt.field+" blank", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			envelope["identity"].(map[string]any)[tt.field] = "   "
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetClassEntryValueBoundaries(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(map[string]any)
	}{
		{name: "blank name", mutate: func(class map[string]any) { class["name"] = " " }},
		{name: "name overflow", mutate: func(class map[string]any) { class["name"] = strings.Repeat("界", 201) }},
		{name: "blank subclass", mutate: func(class map[string]any) { class["subclass"] = " " }},
		{name: "subclass overflow", mutate: func(class map[string]any) { class["subclass"] = strings.Repeat("界", 201) }},
		{name: "level zero", mutate: func(class map[string]any) { class["level"] = 0 }},
		{name: "level 21", mutate: func(class map[string]any) { class["level"] = 21 }},
		{name: "fractional level", mutate: func(class map[string]any) { class["level"] = 3.5 }},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			tt.mutate(firstTestClass(envelope))
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetClassEntryAcceptsExactMaximumBoundaries(t *testing.T) {
	t.Run("level 20", func(t *testing.T) {
		request := validCreateCharacterRequest()
		request.Level = 20
		envelope := testCharacterSheetEnvelope()
		firstTestClass(envelope)["level"] = 20
		assertValidCharacterSheetForRequest(t, request, envelope)
	})

	t.Run("200-rune name and subclass", func(t *testing.T) {
		request := validCreateCharacterRequest()
		request.Level = 4
		envelope := testCharacterSheetEnvelope()
		envelope["identity"].(map[string]any)["classes"] = []any{
			map[string]any{"name": "Ranger", "level": 3, "subclass": "Hunter"},
			map[string]any{
				"name":     strings.Repeat("界", 200),
				"level":    1,
				"subclass": strings.Repeat("界", 200),
			},
		}
		assertValidCharacterSheetForRequest(t, request, envelope)
	})
}

func TestCharacterSheetAbilitiesRejectEveryInvalidScoreCase(t *testing.T) {
	abilities := []struct {
		name      string
		wrongCase string
		expected  int
	}{
		{name: "strength", wrongCase: "Strength", expected: 10},
		{name: "dexterity", wrongCase: "Dexterity", expected: 16},
		{name: "constitution", wrongCase: "Constitution", expected: 14},
		{name: "intelligence", wrongCase: "Intelligence", expected: 10},
		{name: "wisdom", wrongCase: "Wisdom", expected: 14},
		{name: "charisma", wrongCase: "Charisma", expected: 8},
	}

	for _, ability := range abilities {
		t.Run(ability.name+" missing", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			delete(testScores(envelope), ability.name)
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
		t.Run(ability.name+" wrong case", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			scores := testScores(envelope)
			scores[ability.wrongCase] = scores[ability.name]
			delete(scores, ability.name)
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
		t.Run(ability.name+" fractional", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testScores(envelope)[ability.name] = 10.5
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
		for _, value := range []int{0, 31} {
			t.Run(ability.name+" out of range", func(t *testing.T) {
				envelope := testCharacterSheetEnvelope()
				testScores(envelope)[ability.name] = value
				assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
			})
		}
		t.Run(ability.name+" inconsistent", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testScores(envelope)[ability.name] = ability.expected + 1
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetAbilitiesRejectUnknownAndInvalidContainerFields(t *testing.T) {
	t.Run("unknown abilities field", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		envelope["abilities"].(map[string]any)["unknown"] = true
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})

	t.Run("missing scores", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		delete(envelope["abilities"].(map[string]any), "scores")
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})

	t.Run("wrong-case scores", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		abilities := envelope["abilities"].(map[string]any)
		abilities["Scores"] = abilities["scores"]
		delete(abilities, "scores")
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})

	t.Run("unknown score", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testScores(envelope)["luck"] = 10
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})

	t.Run("scores array", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		envelope["abilities"].(map[string]any)["scores"] = []any{}
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})
}

func firstTestClass(envelope map[string]any) map[string]any {
	return envelope["identity"].(map[string]any)["classes"].([]any)[0].(map[string]any)
}

func testScores(envelope map[string]any) map[string]any {
	return envelope["abilities"].(map[string]any)["scores"].(map[string]any)
}

func assertValidCharacterSheetForRequest(t *testing.T, request createCharacterRequest, envelope map[string]any) {
	t.Helper()
	payload := marshalCharacterSheetPayload(t, envelope)
	request.ReferencePayload = &payload
	if _, err := characterFromRequest(request, time.Now()); err != nil {
		t.Fatalf("expected identity and abilities to be accepted, got %v", err)
	}
}

func assertInvalidCharacterSheetForRequest(t *testing.T, request createCharacterRequest, envelope map[string]any) {
	t.Helper()
	payload := marshalCharacterSheetPayload(t, envelope)
	request.ReferencePayload = &payload
	_, err := characterFromRequest(request, time.Now())
	if _, ok := isValidationError(err); !ok {
		t.Fatalf("expected safe identity or ability validation error, got %v", err)
	}
}
