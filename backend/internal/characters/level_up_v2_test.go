package characters

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strconv"
	"strings"
	"testing"
	"time"

	levelrules "github.com/Inkala/rpg-companion/backend/internal/rules"
	"github.com/google/uuid"
)

func TestSlice5V2LevelUpHandlerReturnsExactPrivateDTO(t *testing.T) {
	ownerID := uuid.New()
	character, err := characterFromV2Request(correctedFighterRequest(2), time.Date(2026, 7, 20, 10, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	character.ID = uuid.New()
	character.OwnerSubjectID = &ownerID
	handler := NewHandler(nil)
	handler.levelUpCharacter = func(_ context.Context, characterID, requesterID uuid.UUID, _ time.Time, _ levelUpRequest) (Character, error) {
		if characterID != character.ID || requesterID != ownerID {
			t.Fatal("level-up handler did not derive owner and character identity from the authenticated route")
		}
		return character, nil
	}

	request := levelUpHTTPRequest(ownerID, character.ID.String(), validLevelUpJSON(character.UpdatedAt))
	response := httptest.NewRecorder()
	handler.LevelUp(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("V2 level-up response status=%d body=%s", response.Code, response.Body.String())
	}
	assertExactV2CharacterResponse(t, response, character)
}

func TestSlice5V2LevelUpPreservesStructuredSectionsAndSchema(t *testing.T) {
	request := correctedFighterRequest(1)
	request.Other = []CharacterOtherInput{{ID: "oath", Title: "Oath", Description: "Protect the village."}}
	request.Features = append(request.Features, CharacterFeatureInput{
		Source: "manual", ID: "scar", Name: "Old scar", Category: "History", Description: "Won defending the eastern gate.",
	})
	character, err := characterFromV2Request(request, time.Date(2026, 7, 20, 10, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("build valid V2 fixture: %v", err)
	}
	character.ID = uuid.New()
	ownerID := uuid.New()
	character.OwnerSubjectID = &ownerID
	character.UpdatedAt = time.Date(2026, 7, 20, 10, 0, 0, 0, time.UTC)
	before, err := ParseCharacterSheetDocument(character.ReferencePayload)
	if err != nil || before.V2 == nil {
		t.Fatalf("parse V2 fixture: %v", err)
	}

	updated, err := buildLeveledCharacter(character, levelUpRequest{
		ExpectedUpdatedAt:   character.UpdatedAt.Format(time.RFC3339Nano),
		HP:                  &levelUpHPInput{Mode: "fixed-average"},
		CurrentHP:           &levelUpCurrentHPInput{Mode: "increase-by-gain"},
		PrerequisiteChoices: []levelUpClassChoiceInput{},
		ClassChoices:        []levelUpClassChoiceInput{},
		DecisionSummary:     []string{"Take the Fighter fixed-average HP gain."},
	})
	if err != nil {
		t.Fatalf("level up valid V2 Fighter: %v", err)
	}
	parsed, err := ParseCharacterSheetDocument(updated.ReferencePayload)
	if err != nil || parsed.V2 == nil {
		t.Fatalf("result was not strict CharacterSheetV2: %v", err)
	}
	sheet := *parsed.V2
	if sheet.SchemaVersion != "CharacterSheetV2" || sheet.Identity.Level != 2 || updated.Level != 2 {
		t.Fatalf("V2 schema/level changed incorrectly: schema=%q sheet=%d row=%d", sheet.SchemaVersion, sheet.Identity.Level, updated.Level)
	}
	if len(sheet.HitPointProgression.LevelGains) != 1 || sheet.HitPointProgression.LevelGains[0].Level != 2 {
		t.Fatalf("level-2 HP decision was not retained: %#v", sheet.HitPointProgression.LevelGains)
	}
	if !reflect.DeepEqual(sheet.Attacks, before.V2.Attacks) || !reflect.DeepEqual(sheet.Equipment, before.V2.Equipment) || !reflect.DeepEqual(sheet.Other, before.V2.Other) {
		t.Fatal("V2 structured attacks, equipment, or Other changed during level up")
	}
	levelFeatureFound := false
	for _, feature := range sheet.Features {
		levelFeatureFound = levelFeatureFound || feature.ID == "action-surge-1-use"
	}
	if !levelFeatureFound {
		t.Fatalf("canonical level-2 feature missing: %#v", sheet.Features)
	}
	manualFound := false
	for _, feature := range sheet.Features {
		if feature.ID == "scar" && feature.Source == "manual" && feature.Category == "History" && feature.Description == "Won defending the eastern gate." {
			manualFound = true
		}
	}
	if !manualFound {
		t.Fatal("manual feature identity, category, description, or provenance was lost")
	}
	if updated.ID != character.ID || updated.OwnerSubjectID == nil || *updated.OwnerSubjectID != ownerID {
		t.Fatal("character or owner identity changed")
	}
	if updated.HitPoints.Current != updated.HitPoints.Max {
		t.Fatalf("increase-by-gain did not preserve full HP: %#v", updated.HitPoints)
	}
	if len(updated.ReferencePayload) > maxV2StoredReferencePayloadBytes {
		t.Fatal("updated V2 payload exceeded the approved stored-document limit")
	}
	var raw map[string]any
	if err := json.Unmarshal(updated.ReferencePayload, &raw); err != nil || raw["schemaVersion"] != "CharacterSheetV2" {
		t.Fatal("serialized result was downgraded from V2")
	}
}

func TestSlice5V2LevelUpAcceptsRetainedAndManualCurrentHP(t *testing.T) {
	created, err := characterFromV2Request(correctedFighterRequest(1), time.Date(2026, 7, 20, 10, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	if created.HitPoints.Current != created.HitPoints.Max {
		t.Fatalf("V2 creation did not initialize full HP: %+v", created.HitPoints)
	}
	wounded := created
	wounded.HitPoints.Current = 3
	if parsed, err := parseStoredCharacter(wounded); err != nil || parsed.V2 == nil {
		t.Fatalf("strict stored V2 parsing rejected bounded wounded HP: %v", err)
	}
	retained, err := buildLeveledCharacter(wounded, levelUpRequest{
		ExpectedUpdatedAt: wounded.UpdatedAt.Format(time.RFC3339Nano), HP: &levelUpHPInput{Mode: "fixed-average"},
		CurrentHP: &levelUpCurrentHPInput{Mode: "retain"}, PrerequisiteChoices: []levelUpClassChoiceInput{}, ClassChoices: []levelUpClassChoiceInput{}, DecisionSummary: []string{"Retain wounded HP."},
	})
	if err != nil || retained.HitPoints.Current != 3 {
		t.Fatalf("retain did not preserve absolute wounded HP: hp=%+v err=%v", retained.HitPoints, err)
	}
	manualValue := 7
	manual, err := buildLeveledCharacter(wounded, levelUpRequest{
		ExpectedUpdatedAt: wounded.UpdatedAt.Format(time.RFC3339Nano), HP: &levelUpHPInput{Mode: "fixed-average"},
		CurrentHP: &levelUpCurrentHPInput{Mode: "manual", Value: &manualValue}, PrerequisiteChoices: []levelUpClassChoiceInput{}, ClassChoices: []levelUpClassChoiceInput{}, DecisionSummary: []string{"Set bounded current HP."},
	})
	if err != nil || manual.HitPoints.Current != manualValue {
		t.Fatalf("manual bounded current HP was not preserved: hp=%+v err=%v", manual.HitPoints, err)
	}
	for _, invalid := range []int{-1, manual.HitPoints.Max + 1} {
		value := invalid
		if _, err := buildLeveledCharacter(wounded, levelUpRequest{
			ExpectedUpdatedAt: wounded.UpdatedAt.Format(time.RFC3339Nano), HP: &levelUpHPInput{Mode: "fixed-average"},
			CurrentHP: &levelUpCurrentHPInput{Mode: "manual", Value: &value}, PrerequisiteChoices: []levelUpClassChoiceInput{}, ClassChoices: []levelUpClassChoiceInput{}, DecisionSummary: []string{"Reject invalid current HP."},
		}); err == nil {
			t.Fatalf("manual current HP %d was accepted", invalid)
		}
	}
	parsed := mustV2Sheet(t, manual)
	dto, err := characterV2DTOFromStored(manual, parsed)
	if err != nil || dto.HitPoints.Current != manualValue {
		t.Fatalf("owner/GM V2 mapper replaced actual current HP: dto=%+v err=%v", dto.HitPoints, err)
	}
	ownerID, requesterID, partyID := uuid.New(), uuid.New(), uuid.New()
	manual.ID = uuid.New()
	manual.OwnerSubjectID = &ownerID
	handler := Handler{
		repository:             &Repository{},
		getCharacterForOwner:   func(context.Context, uuid.UUID, uuid.UUID) (Character, error) { return manual, nil },
		getCharacterForPartyGM: func(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) (Character, error) { return manual, nil },
	}
	ownerRequest := httptest.NewRequest(http.MethodGet, "/characters/"+manual.ID.String(), nil)
	ownerRequest.SetPathValue("id", manual.ID.String())
	ownerRequest = withAuthenticatedUser(ownerRequest, ownerID)
	ownerResponse := httptest.NewRecorder()
	handler.GetByID(ownerResponse, ownerRequest)
	gmResponse := httptest.NewRecorder()
	handler.GetByIDForPartyGM(gmResponse, partyGMCharacterRequest(requesterID, partyID, manual.ID))
	for name, response := range map[string]*httptest.ResponseRecorder{"owner": ownerResponse, "Party GM": gmResponse} {
		var responseDTO CharacterV2DTO
		if response.Code != http.StatusOK || json.Unmarshal(response.Body.Bytes(), &responseDTO) != nil || responseDTO.HitPoints.Current != manualValue {
			t.Fatalf("%s response did not serialize actual Current HP: status=%d body=%s", name, response.Code, response.Body.String())
		}
	}
	for _, invalid := range []int{-1, manual.HitPoints.Max + 1} {
		unsafe := manual
		unsafe.HitPoints.Current = invalid
		handler.getCharacterForOwner = func(context.Context, uuid.UUID, uuid.UUID) (Character, error) { return unsafe, nil }
		response := httptest.NewRecorder()
		handler.GetByID(response, ownerRequest)
		assertSafeCharacterError(t, response, http.StatusInternalServerError, "could not load character")
	}

	t.Run("PostgreSQL round trip and atomic parity", func(t *testing.T) {
		pool := setupIntegrationDatabase(t)
		repository := NewRepository(pool)
		ownerID, gmID := uuid.New(), uuid.New()
		insertTestUser(t, pool, ownerID, "slice5-hp-owner")
		insertTestUser(t, pool, gmID, "slice5-hp-gm")
		persisted := created
		persisted.OwnerSubjectID = &ownerID
		persisted.HitPoints.Current = 3
		createdRow, err := repository.Create(context.Background(), persisted)
		if err != nil {
			t.Fatal(err)
		}
		partyID := uuid.New()
		insertCharacterRepositoryParty(t, pool, partyID, "Slice 5 HP Party", gmID)
		insertCharacterRepositoryMembership(t, pool, uuid.NewString(), partyID, gmID, "gm", nil)
		insertCharacterRepositoryMembership(t, pool, uuid.NewString(), partyID, ownerID, "player", &createdRow.ID)
		ownerLoaded, err := repository.GetByIDForOwner(context.Background(), createdRow.ID, ownerID)
		if err != nil || ownerLoaded.HitPoints.Current != 3 {
			t.Fatalf("owner wounded V2 round trip failed: hp=%+v err=%v", ownerLoaded.HitPoints, err)
		}
		gmLoaded, err := repository.GetByIDForPartyGM(context.Background(), createdRow.ID, partyID, gmID)
		if err != nil || gmLoaded.HitPoints.Current != 3 {
			t.Fatalf("Party-GM wounded V2 round trip failed: hp=%+v err=%v", gmLoaded.HitPoints, err)
		}
		updated, err := repository.LevelUp(context.Background(), createdRow.ID, ownerID, createdRow.UpdatedAt, levelUpRequest{
			ExpectedUpdatedAt: createdRow.UpdatedAt.Format(time.RFC3339Nano), HP: &levelUpHPInput{Mode: "fixed-average"},
			CurrentHP: &levelUpCurrentHPInput{Mode: "retain"}, PrerequisiteChoices: []levelUpClassChoiceInput{}, ClassChoices: []levelUpClassChoiceInput{}, DecisionSummary: []string{"Retain wounded HP."},
		})
		if err != nil {
			t.Fatal(err)
		}
		var currentHP, maximumHP int
		var payload json.RawMessage
		if err := pool.QueryRow(context.Background(), `SELECT hp_current,hp_max,reference_payload FROM characters WHERE id=$1`, createdRow.ID).Scan(&currentHP, &maximumHP, &payload); err != nil {
			t.Fatal(err)
		}
		if currentHP != 3 || currentHP != updated.HitPoints.Current || maximumHP != updated.HitPoints.Max {
			t.Fatalf("top-level Current HP parity failed: row=%d/%d result=%+v", currentHP, maximumHP, updated.HitPoints)
		}
		if parsed, err := ParseCharacterSheetDocument(payload); err != nil || parsed.V2 == nil || parsed.V2.HitPointProgression.Maximum.Value != maximumHP {
			t.Fatalf("strict V2 JSONB parsing or maximum-HP parity failed: %v", err)
		}
		var raw map[string]any
		if err := json.Unmarshal(payload, &raw); err != nil || raw["currentHp"] != nil || raw["hitPoints"] != nil {
			t.Fatal("mutable Current HP leaked into the approved V2 reference payload")
		}
	})
}

func TestSlice5RejectsTamperedGeneratedSummary(t *testing.T) {
	classRule, ok := levelrules.FindClass("fighter")
	if !ok {
		t.Fatal("Fighter rules unavailable")
	}
	base, err := BuildCharacterSheetV2(slice5MinimumV2Request(t, classRule, 2))
	if err != nil {
		t.Fatal(err)
	}
	if errors := ValidateCharacterSheetV2(base); len(errors) != 0 {
		t.Fatalf("untouched rebuilt summary failed validation: %v", errors)
	}
	serialized, err := json.Marshal(base)
	if err != nil {
		t.Fatal(err)
	}
	var jsonbOrder map[string]any
	if err := json.Unmarshal(serialized, &jsonbOrder); err != nil {
		t.Fatal(err)
	}
	jsonbNormalized, err := json.Marshal(jsonbOrder)
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := ParseCharacterSheetDocument(jsonbNormalized)
	if err != nil || parsed.V2 == nil {
		t.Fatalf("PostgreSQL-style object-key reordering rejected an untouched summary: %v", err)
	}
	tests := map[string]func(*CharacterSheetV2){
		"display line":     func(sheet *CharacterSheetV2) { sheet.Summary.DisplayLine = "Misrepresented hero" },
		"featured ability": func(sheet *CharacterSheetV2) { sheet.Summary.FeaturedAbilities[0] = "Invented feature" },
		"featured ability order": func(sheet *CharacterSheetV2) {
			sheet.Summary.FeaturedAbilities[0], sheet.Summary.FeaturedAbilities[1] = sheet.Summary.FeaturedAbilities[1], sheet.Summary.FeaturedAbilities[0]
		},
		"section label": func(sheet *CharacterSheetV2) { sheet.Summary.ReferenceSections[0].Label = "Invented section" },
		"section order": func(sheet *CharacterSheetV2) {
			sheet.Summary.ReferenceSections[0], sheet.Summary.ReferenceSections[1] = sheet.Summary.ReferenceSections[1], sheet.Summary.ReferenceSections[0]
		},
		"landing concept": func(sheet *CharacterSheetV2) { sheet.Summary.LandingConcept = "Invented concept" },
	}
	for name, tamper := range tests {
		t.Run(name, func(t *testing.T) {
			sheet := base
			sheet.Summary.FeaturedAbilities = append([]string(nil), base.Summary.FeaturedAbilities...)
			sheet.Summary.ReferenceSections = append([]CharacterReferenceSectionV2(nil), base.Summary.ReferenceSections...)
			tamper(&sheet)
			if errors := ValidateCharacterSheetV2(sheet); len(errors) == 0 {
				t.Fatal("tampered generated summary was accepted")
			}
		})
	}
}

func TestValidateCharacterSheetV2DoesNotMutateUsedSpellSlots(t *testing.T) {
	sheet, err := BuildCharacterSheetV2(correctedWizardRequest())
	if err != nil {
		t.Fatal(err)
	}
	if sheet.Spellcasting == nil || len(sheet.Spellcasting.Slots) < 2 || sheet.Spellcasting.Slots[0].Max < 1 {
		t.Fatal("Wizard fixture does not expose bounded spell slots")
	}
	sheet.Spellcasting.Slots[0].Used = 1
	before, err := json.Marshal(sheet)
	if err != nil {
		t.Fatal(err)
	}
	for iteration := 0; iteration < 3; iteration++ {
		if errors := ValidateCharacterSheetV2(sheet); len(errors) != 0 {
			t.Fatalf("valid nonzero used slot failed validation on iteration %d: %v", iteration, errors)
		}
		after, err := json.Marshal(sheet)
		if err != nil {
			t.Fatal(err)
		}
		if !reflect.DeepEqual(after, before) {
			t.Fatalf("validation mutated the input sheet on iteration %d: before=%s after=%s", iteration, before, after)
		}
	}

	usedOnly := cloneV2Sheet(t, sheet)
	usedOnly.Spellcasting.Slots[0].Used = usedOnly.Spellcasting.Slots[0].Max
	if errors := ValidateCharacterSheetV2(usedOnly); len(errors) != 0 {
		t.Fatalf("valid change limited to slot.used was rejected: %v", errors)
	}

	tests := map[string]func(*CharacterSheetV2){
		"level":   func(candidate *CharacterSheetV2) { candidate.Spellcasting.Slots[0].Level++ },
		"maximum": func(candidate *CharacterSheetV2) { candidate.Spellcasting.Slots[0].Max++ },
		"provenance": func(candidate *CharacterSheetV2) {
			candidate.Spellcasting.Slots[0].Provenance = ValueProvenance{Kind: "calculated", RuleID: "invented-slot-rule"}
		},
		"length": func(candidate *CharacterSheetV2) {
			candidate.Spellcasting.Slots = candidate.Spellcasting.Slots[:len(candidate.Spellcasting.Slots)-1]
		},
		"ordering": func(candidate *CharacterSheetV2) {
			candidate.Spellcasting.Slots[0], candidate.Spellcasting.Slots[1] = candidate.Spellcasting.Slots[1], candidate.Spellcasting.Slots[0]
		},
	}
	for name, tamper := range tests {
		t.Run(name, func(t *testing.T) {
			candidate := cloneV2Sheet(t, sheet)
			tamper(&candidate)
			if errors := ValidateCharacterSheetV2(candidate); len(errors) == 0 {
				t.Fatal("authoritative spell-slot tampering was accepted")
			}
		})
	}
}

func TestParseCharacterSheetDocumentPreservesUsedSpellSlots(t *testing.T) {
	sheet, err := BuildCharacterSheetV2(correctedWizardRequest())
	if err != nil {
		t.Fatal(err)
	}
	if sheet.Spellcasting == nil || len(sheet.Spellcasting.Slots) == 0 || sheet.Spellcasting.Slots[0].Max < 1 {
		t.Fatal("Wizard fixture does not expose bounded spell slots")
	}
	sheet.Spellcasting.Slots[0].Used = 1
	raw, err := json.Marshal(sheet)
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := ParseCharacterSheetDocument(raw)
	if err != nil || parsed.V2 == nil {
		t.Fatalf("parse valid V2 spell slots: %v", err)
	}
	if parsed.V2.Spellcasting == nil || parsed.V2.Spellcasting.Slots[0].Used != 1 {
		t.Fatalf("parser lost nonzero used slots: %+v", parsed.V2.Spellcasting)
	}
	parsedBefore, err := json.Marshal(parsed.V2)
	if err != nil {
		t.Fatal(err)
	}
	for iteration := 0; iteration < 3; iteration++ {
		if errors := ValidateCharacterSheetV2(*parsed.V2); len(errors) != 0 {
			t.Fatalf("parsed V2 failed repeated validation on iteration %d: %v", iteration, errors)
		}
	}
	parsedAfter, err := json.Marshal(parsed.V2)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(parsedAfter, parsedBefore) || !reflect.DeepEqual(parsedAfter, raw) {
		t.Fatalf("parsing or repeated validation mutated used slots: original=%s parsed=%s", raw, parsedAfter)
	}
}

func cloneV2Sheet(t *testing.T, sheet CharacterSheetV2) CharacterSheetV2 {
	t.Helper()
	raw, err := json.Marshal(sheet)
	if err != nil {
		t.Fatal(err)
	}
	var clone CharacterSheetV2
	if err := json.Unmarshal(raw, &clone); err != nil {
		t.Fatal(err)
	}
	return clone
}

func TestSlice5V2LevelUpCoversEveryCanonicalClassAndTransition(t *testing.T) {
	dataset, err := levelrules.Load()
	if err != nil {
		t.Fatal(err)
	}
	for _, classRule := range dataset.Classes {
		for fromLevel := 1; fromLevel <= 4; fromLevel++ {
			t.Run(fmt.Sprintf("%s-%d-to-%d", classRule.Index, fromLevel, fromLevel+1), func(t *testing.T) {
				currentRequest := slice5MinimumV2Request(t, classRule, fromLevel)
				character, err := characterFromV2Request(currentRequest, time.Date(2026, 7, 20, 10, 0, 0, 0, time.UTC))
				if err != nil {
					t.Fatalf("build level-%d fixture: %v", fromLevel, err)
				}
				character.ID = uuid.New()
				ownerID := uuid.New()
				character.OwnerSubjectID = &ownerID
				character.UpdatedAt = time.Date(2026, 7, 20, 10, 0, 0, 0, time.UTC)
				targetRequest := slice5MinimumV2Request(t, classRule, fromLevel+1)
				decision := slice5LevelUpDecision(character, classRule, currentRequest, targetRequest)

				updated, err := buildLeveledCharacter(character, decision)
				if err != nil {
					t.Fatalf("level up: %v", err)
				}
				parsed, err := ParseCharacterSheetDocument(updated.ReferencePayload)
				if err != nil || parsed.V2 == nil {
					var sheet CharacterSheetV2
					_ = json.Unmarshal(updated.ReferencePayload, &sheet)
					t.Fatalf("strict V2 parse: %v; required=%v raw=%v decode=%v validation=%v", err, hasExactRequiredJSONFields(updated.ReferencePayload, v2SheetFields), validateSheetV2RawKeys(updated.ReferencePayload), strictDecodeJSON(updated.ReferencePayload, &sheet), ValidateCharacterSheetV2(sheet))
				}
				if updated.Level != fromLevel+1 || parsed.V2.Identity.Level != fromLevel+1 || updated.ID != character.ID || updated.OwnerSubjectID == nil || *updated.OwnerSubjectID != ownerID {
					t.Fatalf("identity or exact level transition changed: row=%d sheet=%d", updated.Level, parsed.V2.Identity.Level)
				}
				if !reflect.DeepEqual(parsed.V2.Attacks, mustV2Sheet(t, character).Attacks) || !reflect.DeepEqual(parsed.V2.Equipment, mustV2Sheet(t, character).Equipment) || !reflect.DeepEqual(parsed.V2.Other, mustV2Sheet(t, character).Other) {
					t.Fatal("structured sections were not preserved")
				}
			})
		}
	}
}

func TestSlice5V2LevelUpAppliesCanonicalSkillChoicesAuthoritatively(t *testing.T) {
	classRule, ok := levelrules.FindClass("bard")
	if !ok {
		t.Fatal("Bard rules unavailable")
	}
	currentRequest := slice5MinimumV2Request(t, classRule, 2)
	character, err := characterFromV2Request(currentRequest, time.Date(2026, 7, 20, 10, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	character.UpdatedAt = time.Date(2026, 7, 20, 10, 0, 0, 0, time.UTC)
	targetRequest := slice5MinimumV2Request(t, classRule, 3)
	updated, err := buildLeveledCharacter(character, slice5LevelUpDecision(character, classRule, currentRequest, targetRequest))
	if err != nil {
		t.Fatal(err)
	}
	sheet := mustV2Sheet(t, updated)
	ranks := map[string]string{}
	for _, skill := range sheet.Proficiencies.Skills {
		ranks[skill.Name] = skill.Rank
	}
	if ranks["acrobatics"] != "expertise" || ranks["animal-handling"] != "expertise" || ranks["arcana"] != "proficient" {
		t.Fatalf("Bard Expertise or College of Lore proficiency choices were not applied: %#v", ranks)
	}
}

func TestSlice5V2LevelUpPreservesManualRaceAndRejectsManualClass(t *testing.T) {
	manualRaceRequest := finalManualRaceRequest()
	manualRaceCharacter, err := characterFromV2Request(manualRaceRequest, time.Date(2026, 7, 20, 10, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	manualRaceCharacter.UpdatedAt = time.Date(2026, 7, 20, 10, 0, 0, 0, time.UTC)
	updated, err := buildLeveledCharacter(manualRaceCharacter, levelUpRequest{
		ExpectedUpdatedAt: manualRaceCharacter.UpdatedAt.Format(time.RFC3339Nano), HP: &levelUpHPInput{Mode: "fixed-average"},
		CurrentHP: &levelUpCurrentHPInput{Mode: "increase-by-gain"}, PrerequisiteChoices: []levelUpClassChoiceInput{}, ClassChoices: []levelUpClassChoiceInput{}, DecisionSummary: []string{"Advance the transferred character."},
	})
	if err != nil {
		t.Fatalf("manual Race with canonical Class should remain levelable: %v", err)
	}
	if sheet := mustV2Sheet(t, updated); sheet.Identity.Race.Source != "manual" || sheet.Identity.Race.Name != "Custom lineage" || sheet.Combat.SpeedFt.Value != 35 {
		t.Fatalf("manual Race identity or explicit Speed was not preserved: %+v %+v", sheet.Identity.Race, sheet.Combat.SpeedFt)
	}

	manualClassRequest := finalManualClassRequest(1)
	manualClassCharacter, err := characterFromV2Request(manualClassRequest, time.Date(2026, 7, 20, 10, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	before := append(json.RawMessage(nil), manualClassCharacter.ReferencePayload...)
	if _, err := buildLeveledCharacter(manualClassCharacter, levelUpRequest{
		ExpectedUpdatedAt: manualClassCharacter.UpdatedAt.Format(time.RFC3339Nano), HP: &levelUpHPInput{Mode: "fixed-average"}, CurrentHP: &levelUpCurrentHPInput{Mode: "retain"},
		PrerequisiteChoices: []levelUpClassChoiceInput{}, ClassChoices: []levelUpClassChoiceInput{}, DecisionSummary: []string{"Attempt unsupported manual Class."},
	}); err == nil || !reflect.DeepEqual(before, manualClassCharacter.ReferencePayload) {
		t.Fatal("manual Class did not fail safely without mutating the stored V2 document")
	}
}

func TestSlice5V2LevelUpPreservesManualSpellIdentityAndProvenance(t *testing.T) {
	classRule, _ := levelrules.FindClass("bard")
	request := slice5MinimumV2Request(t, classRule, 1)
	request.Spellcasting.Levels[0].Learned[0] = SpellSelectionInput{
		ID: "transferred-echo", Source: "manual", Name: "Transferred Echo", Level: 1, School: "Evocation",
		CastingTime: "1 action", Range: "30 feet", Components: []string{"V", "S"}, Duration: "Instantaneous",
		Description: "A bounded transferred spell with exact source text.", ImportReason: "Transferred from the signed paper sheet.",
	}
	if validation := ValidateCreateCharacterV2Request(request); len(validation) > 0 {
		t.Fatalf("manual-spell fixture invalid: %v", validation)
	}
	character, err := characterFromV2Request(request, time.Date(2026, 7, 20, 10, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	character.UpdatedAt = time.Date(2026, 7, 20, 10, 0, 0, 0, time.UTC)
	target := slice5MinimumV2Request(t, classRule, 2)
	updated, err := buildLeveledCharacter(character, slice5LevelUpDecision(character, classRule, request, target))
	if err != nil {
		t.Fatal(err)
	}
	manualFound := false
	for _, spell := range mustV2Sheet(t, updated).Spellcasting.Spells {
		if spell.ID == "transferred-echo" && spell.CanonicalIndex == nil && spell.Name == "Transferred Echo" && spell.Description == "A bounded transferred spell with exact source text." && spell.Provenance.Kind == "imported" && spell.Provenance.Note == "Transferred from the signed paper sheet." {
			manualFound = true
		}
	}
	if !manualFound {
		t.Fatal("manual spell identity, content, or imported provenance was lost")
	}
}

func TestSlice5SpellDecisionJSONPreservesRequiredEmptyArrays(t *testing.T) {
	inputs := []CharacterSpellcastingInput{
		{Mode: "prepared", Cantrips: []SpellSelectionInput{}, Prepared: []SpellSelectionInput{}},
		{Mode: "known", Cantrips: []SpellSelectionInput{}, Levels: []KnownSpellLevelInput{}},
		{Mode: "spellbook-prepared", Cantrips: []SpellSelectionInput{}, InitialSpellbook: []SpellSelectionInput{}, Additions: []WizardSpellbookAdditionInput{}, PreparedSpellIDs: []string{}},
	}
	for _, input := range inputs {
		raw, err := json.Marshal(input)
		if err != nil || !rawSpellcastingDecision(mustJSONValue(t, raw)) {
			t.Fatalf("%s decision lost required empty arrays: %v %s", input.Mode, err, raw)
		}
	}
}

func TestSlice5V2LevelUpRepositoryCommitsJSONBParityAndPreservesPartyLink(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	repository := NewRepository(pool)
	ownerID, gmID := uuid.New(), uuid.New()
	insertTestUser(t, pool, ownerID, "slice5-v2-owner")
	insertTestUser(t, pool, gmID, "slice5-v2-gm")
	character, err := characterFromV2Request(correctedFighterRequest(1), time.Date(2026, 7, 20, 10, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	character.OwnerSubjectID = &ownerID
	created, err := repository.Create(context.Background(), character)
	if err != nil {
		t.Fatal(err)
	}
	partyID := uuid.New()
	insertCharacterRepositoryParty(t, pool, partyID, "Slice 5 V2 Party", gmID)
	insertCharacterRepositoryMembership(t, pool, uuid.NewString(), partyID, gmID, "gm", nil)
	insertCharacterRepositoryMembership(t, pool, uuid.NewString(), partyID, ownerID, "player", &created.ID)
	request := levelUpRequest{
		ExpectedUpdatedAt: created.UpdatedAt.Format(time.RFC3339Nano), HP: &levelUpHPInput{Mode: "fixed-average"},
		CurrentHP: &levelUpCurrentHPInput{Mode: "increase-by-gain"}, PrerequisiteChoices: []levelUpClassChoiceInput{}, ClassChoices: []levelUpClassChoiceInput{}, DecisionSummary: []string{"Advance the V2 Fighter."},
	}
	if _, err := repository.LevelUp(context.Background(), created.ID, gmID, created.UpdatedAt, request); !errors.Is(err, ErrNotFound) {
		t.Fatalf("Party GM did not remain read-only: %v", err)
	}
	updated, err := repository.LevelUp(context.Background(), created.ID, ownerID, created.UpdatedAt, request)
	if err != nil {
		t.Fatal(err)
	}
	var level, hpCurrent, hpMax, armorClass, speedFt int
	var payload json.RawMessage
	if err := pool.QueryRow(context.Background(), `SELECT level,hp_current,hp_max,armor_class,speed_ft,reference_payload FROM characters WHERE id=$1`, created.ID).Scan(
		&level, &hpCurrent, &hpMax, &armorClass, &speedFt, &payload,
	); err != nil {
		t.Fatal(err)
	}
	if level != 2 || hpCurrent != updated.HitPoints.Current || hpMax != updated.HitPoints.Max || armorClass != updated.ArmorClass || speedFt != updated.SpeedFt || !jsonSemanticallyEqual(payload, updated.ReferencePayload) {
		t.Fatal("V2 top-level columns and JSONB document did not commit atomically with exact parity")
	}
	if parsed, err := ParseCharacterSheetDocument(payload); err != nil || parsed.V2 == nil || parsed.V2.Identity.Level != 2 {
		t.Fatalf("persisted V2 document failed strict parsing: %v", err)
	}
	var linkedCharacterID uuid.UUID
	if err := pool.QueryRow(context.Background(), `SELECT character_id FROM party_memberships WHERE party_id=$1 AND user_id=$2`, partyID, ownerID).Scan(&linkedCharacterID); err != nil || linkedCharacterID != created.ID {
		t.Fatalf("V2 Level Up changed the Party membership link: %v", err)
	}
}

func mustJSONValue(t *testing.T, raw []byte) any {
	t.Helper()
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		t.Fatal(err)
	}
	return value
}

func slice5MinimumV2Request(t *testing.T, classRule levelrules.Class, level int) CreateCharacterV2RequestDTO {
	t.Helper()
	scores := AbilityScoresDTO{Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10}
	request := CreateCharacterV2RequestDTO{
		SchemaVersion: "CharacterSheetV2", CreationSource: "guided",
		Identity: CharacterIdentityV2Input{
			Name: "Matrix Hero", Gender: "Other", Race: RuleSelection{Source: "srd", Index: "human"},
			Background: "Sage", Class: RuleSelection{Source: "srd", Index: classRule.Index}, Level: level,
		},
		AbilityScores:       AbilityScoreInput{Mode: "imported", Values: &scores, Reason: "Matrix fixture final values."},
		Proficiencies:       CharacterProficienciesInput{Perception: "none", Skills: []CharacterSkillInput{}},
		HitPointProgression: HitPointProgressionInput{LevelGains: []HitPointLevelGain{}},
		Combat:              CharacterCombatInput{Defense: DefenseInput{Mode: "manual", ArmorClass: 12, Reason: "Matrix fixture armor class."}},
		RuleChoices:         []RuleChoiceInput{{RuleID: "human-extra-language", OptionIDs: []string{"dwarvish"}}},
		Attacks:             []CharacterAttackInput{}, Features: []CharacterFeatureInput{}, Equipment: []CharacterEquipmentInput{}, Other: []CharacterOtherInput{},
	}
	for current := 2; current <= level; current++ {
		request.HitPointProgression.LevelGains = append(request.HitPointProgression.LevelGains, HitPointLevelGain{Level: current, Mode: "fixed-average"})
	}
	if level >= classRule.SubclassDecisionLevel {
		request.Identity.Subclass = &RuleSelection{Source: "srd", Index: classRule.Subclasses[0].Index}
	}
	creation, err := levelrules.LoadCharacterCreation()
	if err != nil {
		t.Fatal(err)
	}
	choices := append([]levelrules.Choice{}, classRule.Choices...)
	for _, choice := range creation.ClassChoices {
		if choice.ClassIndex == classRule.Index {
			choices = append(choices, choice.Choice)
		}
	}
	seenChoices := map[string]bool{}
	for _, choice := range choices {
		if seenChoices[choice.ID] || choice.FromLevel > level || choice.RequiredSubclassIndex != "" && (request.Identity.Subclass == nil || request.Identity.Subclass.Index != choice.RequiredSubclassIndex) {
			continue
		}
		seenChoices[choice.ID] = true
		count := choice.SelectionCountByLevel[strconv.Itoa(level)]
		if count == 0 {
			continue
		}
		selection := RuleChoiceInput{RuleID: choice.ID, OptionIDs: []string{}}
		if choice.BoundedRule == "ability-score-improvement-or-srd-feat" {
			selection.OptionIDs = []string{"ability-score-increase-strength-2"}
		} else if choice.BoundedRule == "any-srd-skill-proficiency" {
			selection.OptionIDs = append([]string(nil), v2SkillOptions[:count]...)
		} else if choice.ID == "circle-of-the-land-bonus-cantrip" {
			selection.OptionIDs = []string{choice.Options[len(choice.Options)-1].Index}
		} else {
			for _, option := range choice.Options {
				if option.MinimumLevel <= level && len(option.RequiredFeatureIndexes) == 0 && len(selection.OptionIDs) < count {
					selection.OptionIDs = append(selection.OptionIDs, option.Index)
				}
			}
		}
		if len(selection.OptionIDs) != count {
			if choice.AllowManual {
				selection.ManualNote = "Explicit matrix choice."
			} else {
				t.Fatalf("cannot build %s level %d choice %s", classRule.Index, level, choice.ID)
			}
		}
		request.RuleChoices = append(request.RuleChoices, selection)
		if choice.SourceFeatureIndex != "" {
			appendUniqueV2Feature(&request.Features, CharacterFeatureInput{Source: "srd", Index: choice.SourceFeatureIndex})
		}
		for _, optionID := range selection.OptionIDs {
			if canonicalFeatureExists(optionID) {
				appendUniqueV2Feature(&request.Features, CharacterFeatureInput{Source: "srd", Index: optionID})
			}
		}
	}
	subclassIndex := ""
	if request.Identity.Subclass != nil && request.Identity.Subclass.Source == "srd" {
		subclassIndex = request.Identity.Subclass.Index
	}
	appendV2CanonicalFeatures(&request, classRule, subclassIndex, level)
	spellcasting := slice5MinimumSpellcasting(t, classRule, level, request)
	request.Spellcasting = &spellcasting
	if errors := ValidateCreateCharacterV2Request(request); len(errors) > 0 {
		t.Fatalf("minimum request %s level %d invalid: %v", classRule.Index, level, errors)
	}
	return request
}

func slice5MinimumSpellcasting(t *testing.T, classRule levelrules.Class, level int, request CreateCharacterV2RequestDTO) CharacterSpellcastingInput {
	t.Helper()
	target := classRule.Levels[level-1]
	if target.Spellcasting == nil {
		return CharacterSpellcastingInput{Mode: "none"}
	}
	input := minimumV2SpellcastingInput(t, classRule, level)
	excluded := map[string]bool{}
	for _, index := range v2RuleChoiceOptions(request.RuleChoices, "circle-of-the-land-bonus-cantrip") {
		excluded[index] = true
	}
	subclassIndex := ""
	if request.Identity.Subclass != nil && request.Identity.Subclass.Source == "srd" {
		subclassIndex = request.Identity.Subclass.Index
	}
	automatic, err := automaticV2Spells(SpellReconstructionInput{
		ClassIndex: classRule.Index, SubclassIndex: subclassIndex, Level: level,
		ActiveFeatureIDs: v2AllRuleChoiceOptions(request.RuleChoices),
	}, classRule)
	if err != nil {
		t.Fatal(err)
	}
	for _, spell := range automatic {
		if spell.CanonicalIndex != nil {
			excluded[*spell.CanonicalIndex] = true
		}
	}
	if target.Spellcasting.CantripsKnown != nil {
		input.Cantrips = spellSelections(firstAvailableV2Spells(t, classRule.Index, level, true, *target.Spellcasting.CantripsKnown, excluded)...)
	}
	if target.Spellcasting.Mode == "prepared" {
		wanted := preparedSpellCount(target.Spellcasting.PreparedFormula, 0, level)
		input.Prepared = spellSelections(firstAvailableV2Spells(t, classRule.Index, level, false, wanted, excluded)...)
	}
	if target.Spellcasting.Mode == "spellbook-prepared" {
		wanted := preparedSpellCount(target.Spellcasting.PreparedFormula, 0, level)
		all := append(append([]SpellSelectionInput{}, input.InitialSpellbook...), flattenWizardAdditions(input.Additions)...)
		input.PreparedSpellIDs = make([]string, 0, wanted)
		for _, spell := range all[:wanted] {
			input.PreparedSpellIDs = append(input.PreparedSpellIDs, spell.ID)
		}
	}
	return input
}

func firstAvailableV2Spells(t *testing.T, classIndex string, level int, cantrip bool, count int, excluded map[string]bool) []string {
	t.Helper()
	result := make([]string, 0, count)
	for _, index := range availableV2TestSpells(t, classIndex, level, cantrip) {
		if !excluded[index] {
			result = append(result, index)
		}
		if len(result) == count {
			return result
		}
	}
	t.Fatalf("cannot find %d distinct %s spells for %s level %d", count, map[bool]string{true: "cantrip", false: "leveled"}[cantrip], classIndex, level)
	return nil
}

func flattenWizardAdditions(additions []WizardSpellbookAdditionInput) []SpellSelectionInput {
	result := []SpellSelectionInput{}
	for _, addition := range additions {
		result = append(result, addition.Spells...)
	}
	return result
}

func slice5LevelUpDecision(character Character, classRule levelrules.Class, current, target CreateCharacterV2RequestDTO) levelUpRequest {
	decision := levelUpRequest{
		ExpectedUpdatedAt: character.UpdatedAt.Format(time.RFC3339Nano), HP: &levelUpHPInput{Mode: "fixed-average"},
		CurrentHP: &levelUpCurrentHPInput{Mode: "increase-by-gain"}, PrerequisiteChoices: []levelUpClassChoiceInput{}, ClassChoices: []levelUpClassChoiceInput{},
		DecisionSummary: []string{fmt.Sprintf("Advance %s to level %d.", classRule.Name, target.Identity.Level)},
	}
	if current.Identity.Subclass == nil && target.Identity.Subclass != nil {
		decision.Subclass = &levelUpSubclassInput{Source: target.Identity.Subclass.Source, Index: target.Identity.Subclass.Index, Name: target.Identity.Subclass.Name}
	}
	currentChoices := map[string]RuleChoiceInput{}
	for _, choice := range current.RuleChoices {
		currentChoices[choice.RuleID] = choice
	}
	for _, choice := range target.RuleChoices {
		if choice.RuleID == "human-extra-language" || reflect.DeepEqual(currentChoices[choice.RuleID], choice) || strings.Contains(choice.RuleID, "ability-score-improvement") {
			continue
		}
		decision.ClassChoices = append(decision.ClassChoices, levelUpClassChoiceInput{RuleID: choice.RuleID, OptionIDs: choice.OptionIDs, ManualNote: choice.ManualNote})
	}
	if classRule.Levels[target.Identity.Level-1].AbilityScoreImprovement {
		decision.AbilityScoreImprovement = &levelUpASIInput{Mode: "ability-scores", Increases: map[string]int{"strength": 2}}
	}
	decision.Spells = slice5SpellChanges(current, target)
	return decision
}

func slice5SpellChanges(current, target CreateCharacterV2RequestDTO) *levelUpSpellChangesInput {
	targetRule, _ := levelrules.FindClass(target.Identity.Class.Index)
	targetLevel := targetRule.Levels[target.Identity.Level-1]
	if targetLevel.Spellcasting == nil {
		return nil
	}
	changes := &levelUpSpellChangesInput{Additions: []levelUpSpellChoiceInput{}, Replacements: []levelUpSpellReplacementInput{}, PreparedSpellIDs: []string{}, WizardSpellbookAdditions: []levelUpSpellChoiceInput{}}
	currentIndexes := map[string]bool{}
	if current.Spellcasting != nil {
		for _, selection := range allV2SpellSelections(*current.Spellcasting) {
			currentIndexes[selection.Index] = true
		}
	}
	for _, selection := range target.Spellcasting.Cantrips {
		if !currentIndexes[selection.Index] {
			changes.Additions = append(changes.Additions, levelUpSpellChoiceInput{Source: "srd", Index: selection.Index})
		}
	}
	switch target.Spellcasting.Mode {
	case "known", "pact-known":
		last := target.Spellcasting.Levels[len(target.Spellcasting.Levels)-1]
		for _, selection := range last.Learned {
			changes.Additions = append(changes.Additions, levelUpSpellChoiceInput{Source: "srd", Index: selection.Index})
		}
	case "prepared":
		for _, selection := range target.Spellcasting.Prepared {
			if !currentIndexes[selection.Index] {
				changes.Additions = append(changes.Additions, levelUpSpellChoiceInput{Source: "srd", Index: selection.Index})
			}
			changes.PreparedSpellIDs = append(changes.PreparedSpellIDs, selection.Index)
		}
	case "spellbook-prepared":
		last := target.Spellcasting.Additions[len(target.Spellcasting.Additions)-1]
		for _, selection := range last.Spells {
			changes.WizardSpellbookAdditions = append(changes.WizardSpellbookAdditions, levelUpSpellChoiceInput{Source: "srd", Index: selection.Index})
		}
		for _, id := range target.Spellcasting.PreparedSpellIDs {
			selection := v2SpellSelectionsByID(*target.Spellcasting)[id]
			changes.PreparedSpellIDs = append(changes.PreparedSpellIDs, selection.Index)
		}
	}
	return changes
}

func mustV2Sheet(t *testing.T, character Character) CharacterSheetV2 {
	t.Helper()
	parsed, err := ParseCharacterSheetDocument(character.ReferencePayload)
	if err != nil || parsed.V2 == nil {
		t.Fatalf("parse V2: %v", err)
	}
	return *parsed.V2
}
