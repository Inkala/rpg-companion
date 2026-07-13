package characters

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"
)

func TestCharacterFromRequestValidatesRequiredFields(t *testing.T) {
	request := validCreateCharacterRequest()
	request.Name = " "
	request.ClassName = ""
	request.Level = 21
	request.HitPoints.Current = intPtr(12)
	request.HitPoints.Max = intPtr(10)
	request.ArmorClass = intPtr(-1)
	request.SpeedFt = intPtr(-5)

	_, err := characterFromRequest(request, time.Now())

	validationErr, ok := isValidationError(err)
	if !ok {
		t.Fatalf("expected validation error, got %v", err)
	}

	expectedMessages := []string{
		"name is required",
		"className is required",
		"level must be between 1 and 20",
		"hitPoints.current must be less than or equal to hitPoints.max",
		"armorClass must be non-negative",
		"speedFt must be non-negative",
	}

	for _, expected := range expectedMessages {
		if !contains(validationErr.Messages, expected) {
			t.Errorf("expected validation message %q in %v", expected, validationErr.Messages)
		}
	}
}

func TestCharacterFromRequestDoesNotAssignOwnerFromRequest(t *testing.T) {
	request := validCreateCharacterRequest()
	request.OwnerSubjectID = stringPtr("not-a-uuid")

	character, err := characterFromRequest(request, time.Now())
	if err != nil {
		t.Fatalf("expected owner field to be ignored by request validation, got %v", err)
	}
	if character.OwnerSubjectID != nil {
		t.Fatalf("expected nil owner from request validation, got %v", character.OwnerSubjectID)
	}
}

func TestCharacterFromRequestRejectsNonObjectReferencePayload(t *testing.T) {
	request := validCreateCharacterRequest()
	payload := json.RawMessage(`[]`)
	request.ReferencePayload = &payload

	_, err := characterFromRequest(request, time.Now())

	validationErr, ok := isValidationError(err)
	if !ok {
		t.Fatalf("expected validation error, got %v", err)
	}
	if !contains(validationErr.Messages, "referencePayload must be a JSON object") {
		t.Fatalf("expected referencePayload validation message, got %v", validationErr.Messages)
	}
}

func TestValidateStoredCharacterForPartyGMRequiresStrictConsistentPayload(t *testing.T) {
	valid := validStoredPartyGMCharacter(t)
	if err := validateStoredCharacterForPartyGM(valid); err != nil {
		t.Fatalf("expected valid stored Party character to pass validation: %v", err)
	}

	tests := []struct {
		name   string
		mutate func(Character) Character
	}{
		{
			name: "missing payload",
			mutate: func(character Character) Character {
				character.ReferencePayload = nil
				return character
			},
		},
		{
			name: "non-object payload",
			mutate: func(character Character) Character {
				character.ReferencePayload = json.RawMessage(`[]`)
				return character
			},
		},
		{
			name: "malformed object",
			mutate: func(character Character) Character {
				character.ReferencePayload = json.RawMessage(`{"secret":"private-malformed-payload"`)
				return character
			},
		},
		{
			name: "unsupported schema",
			mutate: func(character Character) Character {
				character.ReferencePayload = json.RawMessage(strings.Replace(
					string(character.ReferencePayload),
					"CharacterSheetV1",
					"CharacterSheetV2",
					1,
				))
				return character
			},
		},
		{
			name: "oversized payload",
			mutate: func(character Character) Character {
				character.ReferencePayload = json.RawMessage(`{"padding":"` + strings.Repeat("x", maxReferencePayloadBytes) + `"}`)
				return character
			},
		},
		{
			name: "core-inconsistent payload",
			mutate: func(character Character) Character {
				character.ReferencePayload = json.RawMessage(strings.Replace(
					string(character.ReferencePayload),
					character.Name,
					"Different Name",
					1,
				))
				return character
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := validateStoredCharacterForPartyGM(tt.mutate(valid)); !errors.Is(err, errInvalidStoredCharacter) {
				t.Fatal("expected stored cross-user character validation to fail closed")
			}
		})
	}
}

func TestCharacterFromRequestValidatesMissingNestedFields(t *testing.T) {
	request := validCreateCharacterRequest()
	request.Ancestry = " "
	request.Background = ""
	request.AbilityScores = requiredAbilityScores{}
	request.HitPoints = requiredHitPoints{}
	request.ArmorClass = nil
	request.SpeedFt = nil
	request.ReferencePayload = nil

	_, err := characterFromRequest(request, time.Now())

	validationErr, ok := isValidationError(err)
	if !ok {
		t.Fatalf("expected validation error, got %v", err)
	}

	expectedMessages := []string{
		"ancestry is required",
		"background is required",
		"abilityScores.strength is required",
		"abilityScores.dexterity is required",
		"abilityScores.constitution is required",
		"abilityScores.intelligence is required",
		"abilityScores.wisdom is required",
		"abilityScores.charisma is required",
		"hitPoints.current is required",
		"hitPoints.max is required",
		"armorClass is required",
		"speedFt is required",
		"referencePayload is required",
	}

	for _, expected := range expectedMessages {
		if !contains(validationErr.Messages, expected) {
			t.Errorf("expected validation message %q in %v", expected, validationErr.Messages)
		}
	}
}

func TestCharacterFromRequestValidatesInvalidHitPoints(t *testing.T) {
	request := validCreateCharacterRequest()
	request.HitPoints.Current = intPtr(-1)
	request.HitPoints.Max = intPtr(-5)

	_, err := characterFromRequest(request, time.Now())

	validationErr, ok := isValidationError(err)
	if !ok {
		t.Fatalf("expected validation error, got %v", err)
	}

	expectedMessages := []string{
		"hitPoints.current must be non-negative",
		"hitPoints.max must be non-negative",
		"hitPoints.current must be less than or equal to hitPoints.max",
	}

	for _, expected := range expectedMessages {
		if !contains(validationErr.Messages, expected) {
			t.Errorf("expected validation message %q in %v", expected, validationErr.Messages)
		}
	}
}

func TestCharacterFromRequestTrimsOptionalSubclass(t *testing.T) {
	request := validCreateCharacterRequest()
	request.SubclassName = stringPtr("  Hunter  ")
	syncCharacterSheetPayloadWithRequest(t, &request)

	character, err := characterFromRequest(request, time.Now())
	if err != nil {
		t.Fatalf("expected valid character, got %v", err)
	}
	if character.SubclassName == nil || *character.SubclassName != "Hunter" {
		t.Fatalf("expected trimmed subclass Hunter, got %v", character.SubclassName)
	}
}

func TestCharacterFromRequestTreatsBlankSubclassAsNil(t *testing.T) {
	request := validCreateCharacterRequest()
	request.SubclassName = stringPtr("  ")
	syncCharacterSheetPayloadWithRequest(t, &request)

	character, err := characterFromRequest(request, time.Now())
	if err != nil {
		t.Fatalf("expected valid character, got %v", err)
	}
	if character.SubclassName != nil {
		t.Fatalf("expected nil subclass, got %v", *character.SubclassName)
	}
}

func TestCharacterFromRequestAcceptsExistingValidCreation(t *testing.T) {
	character, err := characterFromRequest(validCreateCharacterRequest(), time.Now())
	if err != nil {
		t.Fatalf("expected existing valid creation request to remain accepted, got %v", err)
	}
	if character.Name != "Mara Velard" || character.Level != 3 {
		t.Fatalf("expected existing character values to be preserved, got %q at level %d", character.Name, character.Level)
	}
}

func TestCharacterFromRequestAcceptsExactCoreNumericBoundaries(t *testing.T) {
	tests := []struct {
		name      string
		configure func(*createCharacterRequest)
	}{
		{
			name: "minimums",
			configure: func(request *createCharacterRequest) {
				request.Name = " 界 "
				request.ClassName = " 界 "
				request.SubclassName = stringPtr(" 界 ")
				request.Ancestry = " 界 "
				request.Background = " 界 "
				request.Level = 1
				setAllAbilityScores(request, 1)
				request.HitPoints.Current = intPtr(0)
				request.HitPoints.Max = intPtr(0)
				request.ArmorClass = intPtr(0)
				request.SpeedFt = intPtr(0)
			},
		},
		{
			name: "maximums",
			configure: func(request *createCharacterRequest) {
				request.Level = 20
				setAllAbilityScores(request, 30)
				request.HitPoints.Current = intPtr(9999)
				request.HitPoints.Max = intPtr(9999)
				request.ArmorClass = intPtr(100)
				request.SpeedFt = intPtr(1000)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := validCreateCharacterRequest()
			tt.configure(&request)
			syncCharacterSheetPayloadWithRequest(t, &request)
			if _, err := characterFromRequest(request, time.Now()); err != nil {
				t.Fatalf("expected exact %s to be accepted, got %v", tt.name, err)
			}
		})
	}
}

func TestCharacterFromRequestUsesTrimmedRuneLimitsForCoreStrings(t *testing.T) {
	tests := []struct {
		name  string
		field string
		limit int
		set   func(*createCharacterRequest, string)
	}{
		{name: "name", field: "name", limit: 80, set: func(request *createCharacterRequest, value string) { request.Name = value }},
		{name: "class", field: "className", limit: 64, set: func(request *createCharacterRequest, value string) { request.ClassName = value }},
		{name: "subclass", field: "subclassName", limit: 64, set: func(request *createCharacterRequest, value string) { request.SubclassName = stringPtr(value) }},
		{name: "ancestry", field: "ancestry", limit: 64, set: func(request *createCharacterRequest, value string) { request.Ancestry = value }},
		{name: "background", field: "background", limit: 64, set: func(request *createCharacterRequest, value string) { request.Background = value }},
	}

	for _, tt := range tests {
		t.Run(tt.name+" exact multibyte rune limit", func(t *testing.T) {
			request := validCreateCharacterRequest()
			tt.set(&request, "  "+strings.Repeat("界", tt.limit)+"  ")
			syncCharacterSheetPayloadWithRequest(t, &request)
			character, err := characterFromRequest(request, time.Now())
			if err != nil {
				t.Fatalf("expected exactly %d multibyte runes to be accepted, got %v", tt.limit, err)
			}
			if tt.field == "name" && character.Name != strings.Repeat("界", tt.limit) {
				t.Fatal("expected validation to retain the trimmed name")
			}
		})

		t.Run(tt.name+" one-rune overflow", func(t *testing.T) {
			request := validCreateCharacterRequest()
			tt.set(&request, strings.Repeat("界", tt.limit+1))
			assertCharacterValidationMessage(
				t,
				request,
				fmt.Sprintf("%s must be at most %d characters", tt.field, tt.limit),
			)
		})
	}
}

func TestCharacterFromRequestRejectsOneBelowAndAboveEveryNumericBound(t *testing.T) {
	tests := []struct {
		name    string
		minimum int
		maximum int
		message string
		set     func(*createCharacterRequest, int)
	}{
		{name: "level", minimum: 1, maximum: 20, message: "level must be between 1 and 20", set: func(request *createCharacterRequest, value int) { request.Level = value }},
		{name: "strength", minimum: 1, maximum: 30, message: "abilityScores.strength must be between 1 and 30", set: func(request *createCharacterRequest, value int) { request.AbilityScores.Strength = intPtr(value) }},
		{name: "dexterity", minimum: 1, maximum: 30, message: "abilityScores.dexterity must be between 1 and 30", set: func(request *createCharacterRequest, value int) { request.AbilityScores.Dexterity = intPtr(value) }},
		{name: "constitution", minimum: 1, maximum: 30, message: "abilityScores.constitution must be between 1 and 30", set: func(request *createCharacterRequest, value int) { request.AbilityScores.Constitution = intPtr(value) }},
		{name: "intelligence", minimum: 1, maximum: 30, message: "abilityScores.intelligence must be between 1 and 30", set: func(request *createCharacterRequest, value int) { request.AbilityScores.Intelligence = intPtr(value) }},
		{name: "wisdom", minimum: 1, maximum: 30, message: "abilityScores.wisdom must be between 1 and 30", set: func(request *createCharacterRequest, value int) { request.AbilityScores.Wisdom = intPtr(value) }},
		{name: "charisma", minimum: 1, maximum: 30, message: "abilityScores.charisma must be between 1 and 30", set: func(request *createCharacterRequest, value int) { request.AbilityScores.Charisma = intPtr(value) }},
		{name: "hit points current", minimum: 0, maximum: 9999, message: "hitPoints.current must be at most 9999", set: func(request *createCharacterRequest, value int) {
			request.HitPoints.Current = intPtr(value)
			if value >= 9999 {
				request.HitPoints.Max = intPtr(9999)
			}
		}},
		{name: "hit points max", minimum: 0, maximum: 9999, message: "hitPoints.max must be at most 9999", set: func(request *createCharacterRequest, value int) {
			request.HitPoints.Max = intPtr(value)
			if value < 26 {
				request.HitPoints.Current = intPtr(0)
			}
		}},
		{name: "armor class", minimum: 0, maximum: 100, message: "armorClass must be at most 100", set: func(request *createCharacterRequest, value int) { request.ArmorClass = intPtr(value) }},
		{name: "speed", minimum: 0, maximum: 1000, message: "speedFt must be at most 1000", set: func(request *createCharacterRequest, value int) { request.SpeedFt = intPtr(value) }},
	}

	for _, tt := range tests {
		t.Run(tt.name+" exact minimum", func(t *testing.T) {
			request := validCreateCharacterRequest()
			tt.set(&request, tt.minimum)
			syncCharacterSheetPayloadWithRequest(t, &request)
			if _, err := characterFromRequest(request, time.Now()); err != nil {
				t.Fatalf("expected minimum %d to be accepted, got %v", tt.minimum, err)
			}
		})
		t.Run(tt.name+" exact maximum", func(t *testing.T) {
			request := validCreateCharacterRequest()
			tt.set(&request, tt.maximum)
			syncCharacterSheetPayloadWithRequest(t, &request)
			if _, err := characterFromRequest(request, time.Now()); err != nil {
				t.Fatalf("expected maximum %d to be accepted, got %v", tt.maximum, err)
			}
		})
		t.Run(tt.name+" below minimum", func(t *testing.T) {
			request := validCreateCharacterRequest()
			tt.set(&request, tt.minimum-1)
			expected := tt.message
			if tt.minimum == 0 {
				expected = numericNonNegativeMessage(tt.name)
			}
			assertCharacterValidationMessage(t, request, expected)
		})
		t.Run(tt.name+" above maximum", func(t *testing.T) {
			request := validCreateCharacterRequest()
			tt.set(&request, tt.maximum+1)
			assertCharacterValidationMessage(t, request, tt.message)
		})
	}
}

func TestCharacterFromRequestAllowsNilSubclass(t *testing.T) {
	request := validCreateCharacterRequest()
	request.SubclassName = nil
	syncCharacterSheetPayloadWithRequest(t, &request)

	character, err := characterFromRequest(request, time.Now())
	if err != nil {
		t.Fatalf("expected nil subclass to remain valid, got %v", err)
	}
	if character.SubclassName != nil {
		t.Fatalf("expected nil subclass, got %v", character.SubclassName)
	}
}

func TestCharacterFromRequestEnforcesExactReferencePayloadSize(t *testing.T) {
	tests := []struct {
		name      string
		size      int
		wantError bool
	}{
		{name: "exactly 65536 bytes", size: 65536},
		{name: "65537 bytes", size: 65537, wantError: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := validCreateCharacterRequest()
			payload := referencePayloadWithSize(t, tt.size)
			request.ReferencePayload = &payload

			character, err := characterFromRequest(request, time.Now())
			if tt.wantError {
				validationErr, ok := isValidationError(err)
				if !ok || !contains(validationErr.Messages, "referencePayload must be at most 65536 bytes") {
					t.Fatalf("expected payload-size validation error, got %v", err)
				}
				return
			}
			if err != nil {
				t.Fatalf("expected exact payload boundary to be accepted, got %v", err)
			}
			if len(character.ReferencePayload) != tt.size {
				t.Fatalf("expected stored payload size %d, got %d", tt.size, len(character.ReferencePayload))
			}
		})
	}
}

func setAllAbilityScores(request *createCharacterRequest, value int) {
	request.AbilityScores = requiredAbilityScores{
		Strength:     intPtr(value),
		Dexterity:    intPtr(value),
		Constitution: intPtr(value),
		Intelligence: intPtr(value),
		Wisdom:       intPtr(value),
		Charisma:     intPtr(value),
	}
}

func assertCharacterValidationMessage(t *testing.T, request createCharacterRequest, expected string) {
	t.Helper()
	_, err := characterFromRequest(request, time.Now())
	validationErr, ok := isValidationError(err)
	if !ok || !contains(validationErr.Messages, expected) {
		t.Fatalf("expected validation message %q, got %v", expected, err)
	}
}

func numericNonNegativeMessage(name string) string {
	switch name {
	case "hit points current":
		return "hitPoints.current must be non-negative"
	case "hit points max":
		return "hitPoints.max must be non-negative"
	case "armor class":
		return "armorClass must be non-negative"
	default:
		return "speedFt must be non-negative"
	}
}

func referencePayloadWithSize(t *testing.T, size int) json.RawMessage {
	t.Helper()
	var envelope map[string]any
	if err := json.Unmarshal(minimalCharacterSheetPayload(), &envelope); err != nil {
		t.Fatalf("decode minimal character sheet: %v", err)
	}
	audit := envelope["audit"].(map[string]any)
	arrayFields := []string{"needsConfirmation", "rulesVersionWarnings", "deferredCorrections"}

	payload := marshalCharacterSheetPayload(t, envelope)
	for fieldIndex := 0; len(payload) < size; {
		remaining := size - len(payload)
		if remaining <= 3 {
			audit["source"] = audit["source"].(string) + strings.Repeat("a", remaining)
			payload = marshalCharacterSheetPayload(t, envelope)
			continue
		}
		if fieldIndex >= len(arrayFields) {
			t.Fatalf("payload size %d exceeds valid audit padding capacity", size)
		}
		field := arrayFields[fieldIndex]
		entries := audit[field].([]any)
		if len(entries) == 64 {
			fieldIndex++
			continue
		}
		overhead := 3
		if len(entries) == 0 {
			overhead = 2
		}
		entryLength := remaining - overhead
		if entryLength > 1000 {
			entryLength = 1000
		}
		if entryLength < 1 {
			t.Fatalf("cannot construct exact valid payload size %d", size)
		}
		audit[field] = append(entries, strings.Repeat("a", entryLength))
		payload = marshalCharacterSheetPayload(t, envelope)
	}
	if len(payload) != size {
		t.Fatalf("expected generated payload size %d, got %d", size, len(payload))
	}
	return payload
}

func validCreateCharacterRequest() createCharacterRequest {
	payload := minimalCharacterSheetPayload()
	return createCharacterRequest{
		Name:         "Mara Velard",
		ClassName:    "Ranger",
		SubclassName: stringPtr("Hunter"),
		Level:        3,
		Ancestry:     "Human",
		Background:   "Outlander",
		AbilityScores: requiredAbilityScores{
			Strength:     intPtr(10),
			Dexterity:    intPtr(16),
			Constitution: intPtr(14),
			Intelligence: intPtr(10),
			Wisdom:       intPtr(14),
			Charisma:     intPtr(8),
		},
		HitPoints: requiredHitPoints{
			Current: intPtr(26),
			Max:     intPtr(26),
		},
		ArmorClass:       intPtr(14),
		SpeedFt:          intPtr(30),
		ReferencePayload: &payload,
	}
}

func minimalCharacterSheetPayload() json.RawMessage {
	return json.RawMessage(`{
		"schemaVersion":"CharacterSheetV1",
		"ruleset":{"system":"dnd5e","version":"2014","sourceStatus":"draft"},
		"identity":{"name":"Mara Velard","ancestry":"Human","background":"Outlander","classes":[{"name":"Ranger","level":3,"subclass":"Hunter"}]},
		"summary":{"displayLine":"Human Ranger - Level 3","landingConcept":"A steady wilderness scout.","featuredAbilities":[],"referenceSections":[]},
		"abilities":{"scores":{"strength":10,"dexterity":16,"constitution":14,"intelligence":10,"wisdom":14,"charisma":8}},
		"combat":{"hitPoints":{"current":26,"max":26,"temporary":0},"armorClass":{"value":14},"initiative":3,"speed":[{"type":"walk","feet":30}],"proficiencyBonus":2,"passivePerception":{},"concentration":null},
		"proficiencies":{"savingThrows":{"values":[]},"skills":[],"weapons":{"values":[]},"armor":{"values":[]},"tools":{"values":[]},"languages":{"values":[]}},
		"actions":[],
		"features":[],
		"spellcasting":null,
		"equipment":{"armor":{"values":[]},"weapons":[],"packsAndGear":{"values":[]},"tools":{"values":[]},"languages":{"values":[]},"currency":null},
		"personality":{"traits":[],"ideals":[],"bonds":[],"flaws":[],"notes":[]},
		"audit":{"source":"Manual character sheet","needsConfirmation":[],"rulesVersionWarnings":[],"deferredCorrections":[]}
	}`)
}

func syncCharacterSheetPayloadWithRequest(t *testing.T, request *createCharacterRequest) {
	t.Helper()
	envelope := testCharacterSheetEnvelope()
	identity := envelope["identity"].(map[string]any)
	identity["name"] = strings.TrimSpace(request.Name)
	identity["ancestry"] = strings.TrimSpace(request.Ancestry)
	identity["background"] = strings.TrimSpace(request.Background)
	class := map[string]any{
		"name":  strings.TrimSpace(request.ClassName),
		"level": request.Level,
	}
	if subclass := trimmedOptionalString(request.SubclassName); subclass != nil {
		class["subclass"] = *subclass
	}
	identity["classes"] = []any{class}

	scores := testScores(envelope)
	scores["strength"] = *request.AbilityScores.Strength
	scores["dexterity"] = *request.AbilityScores.Dexterity
	scores["constitution"] = *request.AbilityScores.Constitution
	scores["intelligence"] = *request.AbilityScores.Intelligence
	scores["wisdom"] = *request.AbilityScores.Wisdom
	scores["charisma"] = *request.AbilityScores.Charisma
	combat := testCombat(envelope)
	combat["hitPoints"] = map[string]any{
		"current":   *request.HitPoints.Current,
		"max":       *request.HitPoints.Max,
		"temporary": 0,
	}
	combat["armorClass"] = map[string]any{"value": *request.ArmorClass}
	combat["speed"] = []any{testWalkSpeed(*request.SpeedFt)}
	payload := marshalCharacterSheetPayload(t, envelope)
	request.ReferencePayload = &payload
}

func intPtr(value int) *int {
	return &value
}

func stringPtr(value string) *string {
	return &value
}

func contains(values []string, expected string) bool {
	for _, value := range values {
		if strings.EqualFold(value, expected) {
			return true
		}
	}
	return false
}
