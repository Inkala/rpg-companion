package characters

import (
	"strings"
	"testing"
)

func TestCharacterSheetSummaryRejectsEveryMissingRequiredField(t *testing.T) {
	for _, field := range []string{"displayLine", "landingConcept", "featuredAbilities", "referenceSections"} {
		t.Run(field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			delete(testSummary(envelope), field)
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetSummaryRejectsUnknownAndWrongCaseFields(t *testing.T) {
	t.Run("unknown field", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testSummary(envelope)["unknown"] = true
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})

	fields := []struct {
		exact   string
		variant string
		value   any
	}{
		{exact: "displayLine", variant: "DisplayLine", value: "Human Ranger - Level 3"},
		{exact: "supportingLine", variant: "SupportingLine", value: "Hunter - Outlander"},
		{exact: "landingConcept", variant: "LandingConcept", value: "Scout"},
		{exact: "portraitAssetId", variant: "PortraitAssetId", value: "mara-portrait"},
		{exact: "portraitAlt", variant: "PortraitAlt", value: "Portrait of Mara"},
		{exact: "featuredAbilities", variant: "FeaturedAbilities", value: []any{}},
		{exact: "referenceSections", variant: "ReferenceSections", value: []any{}},
	}
	for _, field := range fields {
		t.Run(field.variant, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			summary := testSummary(envelope)
			delete(summary, field.exact)
			summary[field.variant] = field.value
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetSummaryRejectsWrongFieldTypes(t *testing.T) {
	tests := []struct {
		field string
		value any
	}{
		{field: "displayLine", value: 3},
		{field: "supportingLine", value: []any{}},
		{field: "landingConcept", value: true},
		{field: "portraitAssetId", value: 4},
		{field: "portraitAlt", value: map[string]any{}},
		{field: "featuredAbilities", value: map[string]any{}},
		{field: "referenceSections", value: map[string]any{}},
	}

	for _, tt := range tests {
		t.Run(tt.field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testSummary(envelope)[tt.field] = tt.value
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetSummaryUserVisibleStringBoundaries(t *testing.T) {
	tests := []struct {
		field string
		limit int
	}{
		{field: "displayLine", limit: 200},
		{field: "supportingLine", limit: 1000},
		{field: "landingConcept", limit: 1000},
		{field: "portraitAlt", limit: 200},
	}

	for _, tt := range tests {
		t.Run(tt.field+" exact trimmed rune limit", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testSummary(envelope)[tt.field] = "  " + strings.Repeat("界", tt.limit) + "  "
			assertValidCharacterSheetPayload(t, envelope)
		})
		t.Run(tt.field+" blank", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testSummary(envelope)[tt.field] = "   "
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
		t.Run(tt.field+" overflow", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testSummary(envelope)[tt.field] = strings.Repeat("界", tt.limit+1)
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetSummaryPortraitAssetIDBoundaries(t *testing.T) {
	for _, value := range []string{"a", "mara-portrait-123", strings.Repeat("a", 128)} {
		t.Run("valid "+value[:1], func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testSummary(envelope)["portraitAssetId"] = value
			assertValidCharacterSheetPayload(t, envelope)
		})
	}

	for _, value := range []string{"", "Mara", "mara_portrait", "mara/portrait", strings.Repeat("a", 129)} {
		t.Run("invalid portrait asset id", func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testSummary(envelope)["portraitAssetId"] = value
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetSummaryFeaturedAbilitiesBoundaries(t *testing.T) {
	t.Run("entry exactly 200 Unicode runes", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testSummary(envelope)["featuredAbilities"] = []any{strings.Repeat("界", 200)}
		assertValidCharacterSheetPayload(t, envelope)
	})

	t.Run("16 entries", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testSummary(envelope)["featuredAbilities"] = repeatedSummaryStrings(16, "Feature")
		assertValidCharacterSheetPayload(t, envelope)
	})

	t.Run("17 entries", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testSummary(envelope)["featuredAbilities"] = repeatedSummaryStrings(17, "Feature")
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})

	tests := []struct {
		name  string
		value any
	}{
		{name: "non-string", value: 1},
		{name: "blank", value: "  "},
		{name: "overflow", value: strings.Repeat("界", 201)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			testSummary(envelope)["featuredAbilities"] = []any{tt.value}
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetSummaryReferenceSectionCountAndIDRules(t *testing.T) {
	t.Run("zero sections", func(t *testing.T) {
		assertValidCharacterSheetPayload(t, testCharacterSheetEnvelope())
	})

	t.Run("three sections", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testSummary(envelope)["referenceSections"] = []any{
			testReferenceSection("actions", "Actions", true),
			testReferenceSection("features", "Features", false),
			testReferenceSection("spells", "Spells", false),
		}
		assertValidCharacterSheetPayload(t, envelope)
	})

	t.Run("four sections", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testSummary(envelope)["referenceSections"] = []any{
			testReferenceSection("actions", "Actions", true),
			testReferenceSection("features", "Features", false),
			testReferenceSection("spells", "Spells", false),
			testReferenceSection("actions", "Again", false),
		}
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})

	t.Run("duplicate id", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testSummary(envelope)["referenceSections"] = []any{
			testReferenceSection("actions", "Actions", true),
			testReferenceSection("actions", "Actions again", false),
		}
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})

	t.Run("unsupported id", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testSummary(envelope)["referenceSections"] = []any{testReferenceSection("inventory", "Inventory", true)}
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})
}

func TestCharacterSheetSummaryReferenceSectionStrictFields(t *testing.T) {
	for _, field := range []string{"id", "label", "defaultOpen"} {
		t.Run("missing "+field, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			section := testReferenceSection("actions", "Actions", true)
			delete(section, field)
			testSummary(envelope)["referenceSections"] = []any{section}
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}

	t.Run("unknown field", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		section := testReferenceSection("actions", "Actions", true)
		section["unknown"] = true
		testSummary(envelope)["referenceSections"] = []any{section}
		assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
	})

	variants := []struct {
		exact   string
		variant string
	}{
		{exact: "id", variant: "ID"},
		{exact: "label", variant: "Label"},
		{exact: "defaultOpen", variant: "DefaultOpen"},
	}
	for _, tt := range variants {
		t.Run("wrong-case "+tt.exact, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			section := testReferenceSection("actions", "Actions", true)
			section[tt.variant] = section[tt.exact]
			delete(section, tt.exact)
			testSummary(envelope)["referenceSections"] = []any{section}
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}
}

func TestCharacterSheetSummaryReferenceSectionValueRules(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(map[string]any)
	}{
		{name: "non-string id", mutate: func(section map[string]any) { section["id"] = 1 }},
		{name: "blank label", mutate: func(section map[string]any) { section["label"] = "  " }},
		{name: "label overflow", mutate: func(section map[string]any) { section["label"] = strings.Repeat("界", 201) }},
		{name: "non-boolean defaultOpen", mutate: func(section map[string]any) { section["defaultOpen"] = "true" }},
		{name: "null defaultOpen", mutate: func(section map[string]any) { section["defaultOpen"] = nil }},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			envelope := testCharacterSheetEnvelope()
			section := testReferenceSection("actions", "Actions", true)
			tt.mutate(section)
			testSummary(envelope)["referenceSections"] = []any{section}
			assertInvalidCharacterSheetForRequest(t, validCreateCharacterRequest(), envelope)
		})
	}

	t.Run("exact 200-rune label", func(t *testing.T) {
		envelope := testCharacterSheetEnvelope()
		testSummary(envelope)["referenceSections"] = []any{
			testReferenceSection("actions", "  "+strings.Repeat("界", 200)+"  ", true),
		}
		assertValidCharacterSheetPayload(t, envelope)
	})
}

func testSummary(envelope map[string]any) map[string]any {
	return envelope["summary"].(map[string]any)
}

func testReferenceSection(id string, label string, defaultOpen bool) map[string]any {
	return map[string]any{
		"id":          id,
		"label":       label,
		"defaultOpen": defaultOpen,
	}
}

func repeatedSummaryStrings(count int, prefix string) []any {
	values := make([]any, count)
	for index := range values {
		values[index] = prefix
	}
	return values
}
