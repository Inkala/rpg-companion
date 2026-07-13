package characters

import (
	"fmt"
	"strings"
	"testing"
)

func TestCharacterSheetActionCollectionLimitsAndIDs(t *testing.T) {
	for _, field := range []string{"actions", "features"} {
		t.Run(field+" null", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			envelope[field] = nil
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
	t.Run("32 actions", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		envelope["actions"] = repeatedTestActions(32)
		assertValidCharacterSheetPayload(t, envelope)
	})
	t.Run("33 actions", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		envelope["actions"] = repeatedTestActions(33)
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})
	t.Run("duplicate action id", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		envelope["actions"] = []any{validTestAction("longbow"), validTestAction("longbow")}
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})

	t.Run("64 features", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		envelope["features"] = repeatedTestFeatures(64)
		assertValidCharacterSheetPayload(t, envelope)
	})
	t.Run("65 features", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		envelope["features"] = repeatedTestFeatures(65)
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})
	t.Run("duplicate feature id", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		envelope["features"] = []any{validTestFeature("archery"), validTestFeature("archery")}
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})
}

func TestCharacterSheetActionStrictFields(t *testing.T) {
	required := []string{"id", "name", "kind", "section", "actionType", "summary", "meta"}
	for _, field := range required {
		t.Run("missing "+field, func(t *testing.T) {
			action := validTestAction("longbow")
			delete(action, field)
			assertInvalidTestAction(t, action)
		})
	}

	for _, field := range []struct{ exact, variant string }{
		{exact: "id", variant: "ID"},
		{exact: "name", variant: "Name"},
		{exact: "kind", variant: "Kind"},
		{exact: "section", variant: "Section"},
		{exact: "actionType", variant: "ActionType"},
		{exact: "summary", variant: "Summary"},
		{exact: "meta", variant: "Meta"},
		{exact: "attackBonus", variant: "AttackBonus"},
		{exact: "damage", variant: "Damage"},
		{exact: "range", variant: "Range"},
		{exact: "quickReference", variant: "QuickReference"},
	} {
		t.Run("wrong-case "+field.exact, func(t *testing.T) {
			action := validTestAction("longbow")
			addOptionalActionField(action, field.exact)
			action[field.variant] = action[field.exact]
			delete(action, field.exact)
			assertInvalidTestAction(t, action)
		})
	}

	for _, tt := range []struct {
		name  string
		value any
	}{
		{name: "unknown field", value: map[string]any{"unknown": true}},
		{name: "null entry", value: nil},
		{name: "string entry", value: "longbow"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			if fields, ok := tt.value.(map[string]any); ok {
				action := validTestAction("longbow")
				for key, value := range fields {
					action[key] = value
				}
				assertInvalidTestAction(t, action)
				return
			}
			envelope := testCharacterSheetEnvelope()
			envelope["actions"] = []any{tt.value}
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetFeatureStrictFields(t *testing.T) {
	required := []string{"id", "name", "category", "source", "tags", "summary", "includeInReference"}
	for _, field := range required {
		t.Run("missing "+field, func(t *testing.T) {
			feature := validTestFeature("archery")
			delete(feature, field)
			assertInvalidTestFeature(t, feature)
		})
	}

	for _, field := range []struct{ exact, variant string }{
		{exact: "id", variant: "ID"},
		{exact: "name", variant: "Name"},
		{exact: "category", variant: "Category"},
		{exact: "source", variant: "Source"},
		{exact: "tags", variant: "Tags"},
		{exact: "summary", variant: "Summary"},
		{exact: "includeInReference", variant: "IncludeInReference"},
		{exact: "quickReference", variant: "QuickReference"},
	} {
		t.Run("wrong-case "+field.exact, func(t *testing.T) {
			feature := validTestFeature("archery")
			if field.exact == "quickReference" {
				feature[field.exact] = validTestQuickReference()
			}
			feature[field.variant] = feature[field.exact]
			delete(feature, field.exact)
			assertInvalidTestFeature(t, feature)
		})
	}

	t.Run("unknown", func(t *testing.T) {
		feature := validTestFeature("archery")
		feature["unknown"] = true
		assertInvalidTestFeature(t, feature)
	})
	for _, value := range []any{nil, "archery"} {
		t.Run("malformed entry", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			envelope["features"] = []any{value}
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetActionAndFeatureRejectWrongFieldTypes(t *testing.T) {
	for _, tt := range []struct {
		field string
		value any
	}{
		{field: "id", value: nil},
		{field: "name", value: 1},
		{field: "kind", value: nil},
		{field: "section", value: true},
		{field: "actionType", value: nil},
		{field: "summary", value: false},
		{field: "meta", value: nil},
	} {
		t.Run("action "+tt.field, func(t *testing.T) {
			action := validTestAction("item")
			action[tt.field] = tt.value
			assertInvalidTestAction(t, action)
		})
	}
	for _, tt := range []struct {
		field string
		value any
	}{
		{field: "id", value: nil},
		{field: "name", value: 1},
		{field: "category", value: nil},
		{field: "source", value: []any{}},
		{field: "tags", value: nil},
		{field: "summary", value: 1},
		{field: "includeInReference", value: "true"},
	} {
		t.Run("feature "+tt.field, func(t *testing.T) {
			feature := validTestFeature("item")
			feature[tt.field] = tt.value
			assertInvalidTestFeature(t, feature)
		})
	}
}

func TestCharacterSheetReferenceItemIdentifierRules(t *testing.T) {
	for _, value := range []string{"a", strings.Repeat("a", 128)} {
		t.Run("valid action id", func(t *testing.T) { assertValidTestAction(t, validTestAction(value)) })
		t.Run("valid feature id", func(t *testing.T) { assertValidTestFeature(t, validTestFeature(value)) })
	}
	for _, value := range []string{"", "Upper", "under_score", "slash/id", strings.Repeat("a", 129)} {
		t.Run("invalid action id", func(t *testing.T) { assertInvalidTestAction(t, validTestAction(value)) })
		t.Run("invalid feature id", func(t *testing.T) { assertInvalidTestFeature(t, validTestFeature(value)) })
	}
}

func TestCharacterSheetReferenceItemStringBoundaries(t *testing.T) {
	for _, tt := range []struct {
		name     string
		maximum  int
		mutate   func(map[string]any, string)
		validate func(*testing.T, map[string]any)
	}{
		{name: "action name", maximum: 200, mutate: func(item map[string]any, value string) { item["name"] = value }, validate: assertValidTestAction},
		{name: "action type", maximum: 200, mutate: func(item map[string]any, value string) { item["actionType"] = value }, validate: assertValidTestAction},
		{name: "action summary", maximum: 1000, mutate: func(item map[string]any, value string) { item["summary"] = value }, validate: assertValidTestAction},
		{name: "feature name", maximum: 200, mutate: func(item map[string]any, value string) { item["name"] = value }, validate: assertValidTestFeature},
		{name: "feature category", maximum: 200, mutate: func(item map[string]any, value string) { item["category"] = value }, validate: assertValidTestFeature},
		{name: "feature summary", maximum: 1000, mutate: func(item map[string]any, value string) { item["summary"] = value }, validate: assertValidTestFeature},
	} {
		t.Run(tt.name+" exact", func(t *testing.T) {
			item := validTestAction("item")
			if strings.HasPrefix(tt.name, "feature") {
				item = validTestFeature("item")
			}
			tt.mutate(item, "  "+strings.Repeat("界", tt.maximum)+"  ")
			tt.validate(t, item)
		})
		for _, value := range []string{"  ", strings.Repeat("界", tt.maximum+1)} {
			t.Run(tt.name+" invalid", func(t *testing.T) {
				item := validTestAction("item")
				if strings.HasPrefix(tt.name, "feature") {
					item = validTestFeature("item")
				}
				tt.mutate(item, value)
				if strings.HasPrefix(tt.name, "feature") {
					assertInvalidTestFeature(t, item)
				} else {
					assertInvalidTestAction(t, item)
				}
			})
		}
	}
}

func TestCharacterSheetActionEnumsMetaAndAttackBonus(t *testing.T) {
	for _, kind := range []string{"attack", "ability", "spell"} {
		t.Run(kind, func(t *testing.T) {
			action := validTestAction("item")
			action["kind"] = kind
			assertValidTestAction(t, action)
		})
	}
	for _, mutation := range []func(map[string]any){
		func(action map[string]any) { action["kind"] = "other" },
		func(action map[string]any) { action["section"] = "features" },
		func(action map[string]any) { action["kind"] = nil },
	} {
		action := validTestAction("item")
		mutation(action)
		assertInvalidTestAction(t, action)
	}

	for _, count := range []int{0, 16} {
		action := validTestAction("item")
		action["meta"] = repeatedSummaryStrings(count, "Meta")
		assertValidTestAction(t, action)
	}
	action := validTestAction("item")
	action["meta"] = repeatedSummaryStrings(17, "Meta")
	assertInvalidTestAction(t, action)
	for _, value := range []any{"  ", 1, strings.Repeat("界", 201)} {
		action := validTestAction("item")
		action["meta"] = []any{value}
		assertInvalidTestAction(t, action)
	}
	action = validTestAction("item")
	action["meta"] = []any{"  " + strings.Repeat("界", 200) + "  "}
	assertValidTestAction(t, action)

	for _, value := range []int{-100, 100} {
		action := validTestAction("item")
		action["attackBonus"] = value
		assertValidTestAction(t, action)
	}
	for _, value := range []any{-101, 101, 1.5, nil} {
		action := validTestAction("item")
		action["attackBonus"] = value
		assertInvalidTestAction(t, action)
	}
}

func TestCharacterSheetActionDamageValidation(t *testing.T) {
	for _, damageCollection := range []any{nil, map[string]any{}} {
		action := validTestAction("item")
		action["damage"] = damageCollection
		assertInvalidTestAction(t, action)
	}

	for _, count := range []int{0, 8} {
		action := validTestAction("item")
		action["damage"] = repeatedTestDamage(count)
		assertValidTestAction(t, action)
	}
	action := validTestAction("item")
	action["damage"] = repeatedTestDamage(9)
	assertInvalidTestAction(t, action)

	for _, field := range []string{"dice", "bonus", "type"} {
		damage := validTestDamage()
		delete(damage, field)
		action := validTestAction("item")
		action["damage"] = []any{damage}
		assertInvalidTestAction(t, action)
	}
	for _, damage := range []any{nil, "1d8", map[string]any{"dice": "1d8", "bonus": 3, "type": "piercing", "unknown": true}, map[string]any{"Dice": "1d8", "bonus": 3, "type": "piercing"}} {
		action := validTestAction("item")
		action["damage"] = []any{damage}
		assertInvalidTestAction(t, action)
	}
	for _, field := range []struct{ exact, variant string }{{"dice", "Dice"}, {"bonus", "Bonus"}, {"type", "Type"}} {
		damage := validTestDamage()
		damage[field.variant] = damage[field.exact]
		delete(damage, field.exact)
		action := validTestAction("item")
		action["damage"] = []any{damage}
		assertInvalidTestAction(t, action)
	}
	for _, field := range []string{"dice", "type"} {
		damage := validTestDamage()
		damage[field] = "  " + strings.Repeat("界", 200) + "  "
		action := validTestAction("item")
		action["damage"] = []any{damage}
		assertValidTestAction(t, action)
		for _, invalid := range []any{"  ", 1, strings.Repeat("界", 201)} {
			damage = validTestDamage()
			damage[field] = invalid
			action = validTestAction("item")
			action["damage"] = []any{damage}
			assertInvalidTestAction(t, action)
		}
	}
	for _, value := range []int{-100, 100} {
		damage := validTestDamage()
		damage["bonus"] = value
		action := validTestAction("item")
		action["damage"] = []any{damage}
		assertValidTestAction(t, action)
	}
	for _, value := range []any{-101, 101, 1.5, nil} {
		damage := validTestDamage()
		damage["bonus"] = value
		action := validTestAction("item")
		action["damage"] = []any{damage}
		assertInvalidTestAction(t, action)
	}
}

func TestCharacterSheetActionRangeValidation(t *testing.T) {
	for _, values := range [][2]int{{0, 0}, {10000, 10000}} {
		action := validTestAction("item")
		action["range"] = map[string]any{"normal": values[0], "long": values[1]}
		assertValidTestAction(t, action)
	}
	for _, invalidRange := range []any{
		nil,
		map[string]any{"normal": 30},
		map[string]any{"long": 60},
		map[string]any{"normal": 30, "long": 60, "unknown": true},
		map[string]any{"Normal": 30, "long": 60},
		map[string]any{"normal": 30, "Long": 60},
		map[string]any{"normal": -1, "long": 60},
		map[string]any{"normal": 30, "long": 10001},
		map[string]any{"normal": 30.5, "long": 60},
		map[string]any{"normal": 60, "long": 30},
	} {
		action := validTestAction("item")
		action["range"] = invalidRange
		assertInvalidTestAction(t, action)
	}
}

func TestCharacterSheetFeatureSourceTagsAndBoolean(t *testing.T) {
	for _, version := range []string{"2014", "2024", "mixed", "unknown"} {
		feature := validTestFeature("item")
		feature["source"].(map[string]any)["rulesVersion"] = version
		assertValidTestFeature(t, feature)
	}
	for _, status := range []string{"confirmed", "needs-confirmation", "deferred"} {
		feature := validTestFeature("item")
		feature["source"].(map[string]any)["status"] = status
		assertValidTestFeature(t, feature)
	}
	for _, source := range []any{
		nil,
		map[string]any{"status": "confirmed"},
		map[string]any{"rulesVersion": "2014"},
		map[string]any{"RulesVersion": "2014", "status": "confirmed"},
		map[string]any{"rulesVersion": "2014", "Status": "confirmed"},
		map[string]any{"rulesVersion": "2014", "status": "confirmed", "Note": "Review"},
		map[string]any{"rulesVersion": "2014", "status": "confirmed", "unknown": true},
		map[string]any{"rulesVersion": "2030", "status": "confirmed"},
		map[string]any{"rulesVersion": "2014", "status": "approved"},
	} {
		feature := validTestFeature("item")
		feature["source"] = source
		assertInvalidTestFeature(t, feature)
	}
	feature := validTestFeature("item")
	feature["source"].(map[string]any)["note"] = "  " + strings.Repeat("界", 1000) + "  "
	assertValidTestFeature(t, feature)
	for _, note := range []any{"  ", 1, nil, strings.Repeat("界", 1001)} {
		feature = validTestFeature("item")
		feature["source"].(map[string]any)["note"] = note
		assertInvalidTestFeature(t, feature)
	}

	for _, count := range []int{0, 16} {
		feature = validTestFeature("item")
		feature["tags"] = repeatedSummaryStrings(count, "Tag")
		assertValidTestFeature(t, feature)
	}
	feature = validTestFeature("item")
	feature["tags"] = repeatedSummaryStrings(17, "Tag")
	assertInvalidTestFeature(t, feature)
	feature = validTestFeature("item")
	feature["tags"] = []any{"  " + strings.Repeat("界", 200) + "  "}
	assertValidTestFeature(t, feature)
	for _, tag := range []any{"  ", 1, strings.Repeat("界", 201)} {
		feature = validTestFeature("item")
		feature["tags"] = []any{tag}
		assertInvalidTestFeature(t, feature)
	}
	for _, value := range []any{"true", nil} {
		feature = validTestFeature("item")
		feature["includeInReference"] = value
		assertInvalidTestFeature(t, feature)
	}
}

func TestCharacterSheetQuickReferenceValidation(t *testing.T) {
	for _, itemType := range []string{"action", "feature"} {
		t.Run(itemType, func(t *testing.T) {
			validateQuickReferenceCases(t, itemType)
		})
	}
}

func validateQuickReferenceCases(t *testing.T, itemType string) {
	t.Helper()
	assertItem := func(t *testing.T, quickReference any, valid bool) {
		t.Helper()
		if itemType == "action" {
			item := validTestAction("item")
			item["quickReference"] = quickReference
			if valid {
				assertValidTestAction(t, item)
			} else {
				assertInvalidTestAction(t, item)
			}
			return
		}
		item := validTestFeature("item")
		item["quickReference"] = quickReference
		if valid {
			assertValidTestFeature(t, item)
		} else {
			assertInvalidTestFeature(t, item)
		}
	}

	assertItem(t, validTestQuickReference(), true)
	for _, field := range []string{"title", "label", "summary", "metadata"} {
		quickReference := validTestQuickReference()
		delete(quickReference, field)
		assertItem(t, quickReference, false)
	}
	for _, quickReference := range []any{nil, "reference", map[string]any{"title": "Title", "label": "Label", "summary": "Summary", "metadata": []any{}, "unknown": true}, map[string]any{"Title": "Title", "label": "Label", "summary": "Summary", "metadata": []any{}}} {
		assertItem(t, quickReference, false)
	}
	for _, field := range []struct{ exact, variant string }{
		{"title", "Title"}, {"label", "Label"}, {"summary", "Summary"}, {"metadata", "Metadata"},
		{"reminder", "Reminder"}, {"details", "Details"},
	} {
		quickReference := validTestQuickReference()
		if field.exact == "reminder" {
			quickReference[field.exact] = map[string]any{"heading": "Remember", "text": "Text"}
		}
		if field.exact == "details" {
			quickReference[field.exact] = map[string]any{"collapsedLabel": "Show", "expandedLabel": "Hide", "text": "Text"}
		}
		quickReference[field.variant] = quickReference[field.exact]
		delete(quickReference, field.exact)
		assertItem(t, quickReference, false)
	}

	for _, field := range []struct {
		name    string
		maximum int
	}{{"title", 200}, {"label", 200}, {"summary", 1000}} {
		quickReference := validTestQuickReference()
		quickReference[field.name] = "  " + strings.Repeat("界", field.maximum) + "  "
		assertItem(t, quickReference, true)
		for _, value := range []any{"  ", 1, strings.Repeat("界", field.maximum+1)} {
			quickReference = validTestQuickReference()
			quickReference[field.name] = value
			assertItem(t, quickReference, false)
		}
	}

	quickReference := validTestQuickReference()
	quickReference["metadata"] = repeatedTestMetadata(16)
	assertItem(t, quickReference, true)
	quickReference = validTestQuickReference()
	quickReference["metadata"] = repeatedTestMetadata(17)
	assertItem(t, quickReference, false)
	for _, metadataCollection := range []any{nil, map[string]any{}} {
		quickReference = validTestQuickReference()
		quickReference["metadata"] = metadataCollection
		assertItem(t, quickReference, false)
	}
	for _, metadata := range []any{nil, "meta", map[string]any{"label": "Label"}, map[string]any{"value": "Value"}, map[string]any{"label": "Label", "value": "Value", "unknown": true}, map[string]any{"Label": "Label", "value": "Value"}} {
		quickReference = validTestQuickReference()
		quickReference["metadata"] = []any{metadata}
		assertItem(t, quickReference, false)
	}
	for _, field := range []struct{ exact, variant string }{{"label", "Label"}, {"value", "Value"}} {
		metadata := map[string]any{"label": "Label", "value": "Value"}
		metadata[field.variant] = metadata[field.exact]
		delete(metadata, field.exact)
		quickReference = validTestQuickReference()
		quickReference["metadata"] = []any{metadata}
		assertItem(t, quickReference, false)
	}
	for _, field := range []string{"label", "value"} {
		quickReference = validTestQuickReference()
		quickReference["metadata"] = []any{map[string]any{"label": "Label", "value": "Value"}}
		quickReference["metadata"].([]any)[0].(map[string]any)[field] = "  " + strings.Repeat("界", 200) + "  "
		assertItem(t, quickReference, true)
		quickReference["metadata"].([]any)[0].(map[string]any)[field] = strings.Repeat("界", 201)
		assertItem(t, quickReference, false)
		for _, invalid := range []any{"  ", 1} {
			quickReference = validTestQuickReference()
			quickReference["metadata"] = []any{map[string]any{"label": "Label", "value": "Value"}}
			quickReference["metadata"].([]any)[0].(map[string]any)[field] = invalid
			assertItem(t, quickReference, false)
		}
	}

	validateQuickReferenceNestedText(t, assertItem, "reminder", []struct {
		name    string
		maximum int
	}{{"heading", 200}, {"text", 1000}})
	validateQuickReferenceNestedText(t, assertItem, "details", []struct {
		name    string
		maximum int
	}{{"collapsedLabel", 200}, {"expandedLabel", 200}, {"text", 1000}})
}

func validateQuickReferenceNestedText(t *testing.T, assertItem func(*testing.T, any, bool), field string, fields []struct {
	name    string
	maximum int
}) {
	t.Helper()
	valid := map[string]any{}
	for _, nestedField := range fields {
		valid[nestedField.name] = "Text"
	}
	quickReference := validTestQuickReference()
	quickReference[field] = valid
	assertItem(t, quickReference, true)
	for _, nestedField := range fields {
		missing := cloneStringAnyMap(valid)
		delete(missing, nestedField.name)
		quickReference = validTestQuickReference()
		quickReference[field] = missing
		assertItem(t, quickReference, false)
		wrongCase := cloneStringAnyMap(valid)
		wrongCase[strings.ToUpper(nestedField.name[:1])+nestedField.name[1:]] = wrongCase[nestedField.name]
		delete(wrongCase, nestedField.name)
		quickReference = validTestQuickReference()
		quickReference[field] = wrongCase
		assertItem(t, quickReference, false)
		exact := cloneStringAnyMap(valid)
		exact[nestedField.name] = "  " + strings.Repeat("界", nestedField.maximum) + "  "
		quickReference = validTestQuickReference()
		quickReference[field] = exact
		assertItem(t, quickReference, true)
		for _, value := range []any{"  ", 1, strings.Repeat("界", nestedField.maximum+1)} {
			invalid := cloneStringAnyMap(valid)
			invalid[nestedField.name] = value
			quickReference = validTestQuickReference()
			quickReference[field] = invalid
			assertItem(t, quickReference, false)
		}
	}
	unknown := cloneStringAnyMap(valid)
	unknown["unknown"] = true
	quickReference = validTestQuickReference()
	quickReference[field] = unknown
	assertItem(t, quickReference, false)
	for _, malformed := range []any{nil, "text"} {
		quickReference = validTestQuickReference()
		quickReference[field] = malformed
		assertItem(t, quickReference, false)
	}
}

func validTestAction(id string) map[string]any {
	return map[string]any{"id": id, "name": "Longbow", "kind": "attack", "section": "actions", "actionType": "Action", "summary": "Reliable attack.", "meta": []any{}}
}

func validTestFeature(id string) map[string]any {
	return map[string]any{"id": id, "name": "Archery", "category": "Fighting Style", "source": map[string]any{"rulesVersion": "2014", "status": "confirmed"}, "tags": []any{}, "summary": "Ranged attacks improve.", "includeInReference": true}
}

func validTestQuickReference() map[string]any {
	return map[string]any{"title": "Title", "label": "Label", "summary": "Summary", "metadata": []any{}}
}

func validTestDamage() map[string]any {
	return map[string]any{"dice": "1d8", "bonus": 3, "type": "piercing"}
}

func repeatedTestActions(count int) []any {
	items := make([]any, count)
	for index := range items {
		items[index] = validTestAction(fmt.Sprintf("action-%d", index))
	}
	return items
}

func repeatedTestFeatures(count int) []any {
	items := make([]any, count)
	for index := range items {
		items[index] = validTestFeature(fmt.Sprintf("feature-%d", index))
	}
	return items
}

func repeatedTestDamage(count int) []any {
	items := make([]any, count)
	for index := range items {
		items[index] = validTestDamage()
	}
	return items
}

func repeatedTestMetadata(count int) []any {
	items := make([]any, count)
	for index := range items {
		items[index] = map[string]any{"label": "Label", "value": "Value"}
	}
	return items
}

func addOptionalActionField(action map[string]any, field string) {
	switch field {
	case "attackBonus":
		action[field] = 7
	case "damage":
		action[field] = []any{}
	case "range":
		action[field] = map[string]any{"normal": 30, "long": 60}
	case "quickReference":
		action[field] = validTestQuickReference()
	}
}

func cloneStringAnyMap(source map[string]any) map[string]any {
	clone := make(map[string]any, len(source))
	for key, value := range source {
		clone[key] = value
	}
	return clone
}

func assertValidTestAction(t *testing.T, action map[string]any) {
	t.Helper()
	envelope := testCharacterSheetEnvelope()
	envelope["actions"] = []any{action}
	assertValidCharacterSheetPayload(t, envelope)
}
func assertInvalidTestAction(t *testing.T, action map[string]any) {
	t.Helper()
	envelope := testCharacterSheetEnvelope()
	envelope["actions"] = []any{action}
	assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
}
func assertValidTestFeature(t *testing.T, feature map[string]any) {
	t.Helper()
	envelope := testCharacterSheetEnvelope()
	envelope["features"] = []any{feature}
	assertValidCharacterSheetPayload(t, envelope)
}
func assertInvalidTestFeature(t *testing.T, feature map[string]any) {
	t.Helper()
	envelope := testCharacterSheetEnvelope()
	envelope["features"] = []any{feature}
	assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
}
