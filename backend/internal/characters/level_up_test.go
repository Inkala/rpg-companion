package characters

import (
	"bytes"
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

const (
	testProficiencyOverrideAuditEntry = "Level-up proficiency bonus uses a player-confirmed manual override."
	testInitiativeOverrideAuditEntry  = "Level-up initiative uses a player-confirmed manual override."
)

func TestLevelUpHandlerRequiresAuthenticationAndValidUUID(t *testing.T) {
	handler := NewHandler(nil)
	handler.levelUpCharacter = func(context.Context, uuid.UUID, uuid.UUID, time.Time, levelUpRequest) (Character, error) {
		t.Fatal("invalid request reached level-up persistence")
		return Character{}, nil
	}

	unauthenticated := httptest.NewRecorder()
	request := levelUpHTTPRequest(uuid.Nil, "00000000-0000-0000-0000-000000000001", validLevelUpJSON(time.Now().UTC()))
	handler.LevelUp(unauthenticated, request)
	assertSafeCharacterError(t, unauthenticated, http.StatusUnauthorized, "authentication required")

	malformed := httptest.NewRecorder()
	request = levelUpHTTPRequest(uuid.New(), "private-invalid-id", validLevelUpJSON(time.Now().UTC()))
	handler.LevelUp(malformed, request)
	assertSafeCharacterError(t, malformed, http.StatusBadRequest, "character id must be a valid UUID")
	if strings.Contains(malformed.Body.String(), "private-invalid-id") {
		t.Fatal("malformed UUID response echoed private input")
	}
}

func TestLevelUpHandlerRejectsForbiddenAndMalformedRequestFields(t *testing.T) {
	forbidden := []string{
		"fromLevel", "toLevel", "className", "character", "referencePayload", "ownerSubjectId",
		"id", "createdAt", "updatedAt", "partyId", "inviteToken", "returnUrl", "userId",
	}
	for _, field := range forbidden {
		t.Run(field, func(t *testing.T) {
			handler := NewHandler(nil)
			handler.levelUpCharacter = func(context.Context, uuid.UUID, uuid.UUID, time.Time, levelUpRequest) (Character, error) {
				t.Fatal("forbidden request reached persistence")
				return Character{}, nil
			}
			body := strings.TrimSuffix(validLevelUpJSON(time.Now().UTC()), "}") + fmt.Sprintf(",%q:%q}", field, "private-value")
			response := httptest.NewRecorder()
			handler.LevelUp(response, levelUpHTTPRequest(uuid.New(), uuid.New().String(), body))
			assertSafeCharacterError(t, response, http.StatusBadRequest, "level-up request validation failed")
			if strings.Contains(response.Body.String(), "private-value") {
				t.Fatal("validation response exposed a forbidden value")
			}
		})
	}

	tests := []string{"{", `{}`, `{"expectedUpdatedAt":"not-a-time"}`}
	for index, body := range tests {
		t.Run(fmt.Sprintf("malformed-%d", index), func(t *testing.T) {
			response := httptest.NewRecorder()
			handler := NewHandler(nil)
			handler.LevelUp(response, levelUpHTTPRequest(uuid.New(), uuid.New().String(), body))
			assertSafeCharacterError(t, response, http.StatusBadRequest, "level-up request validation failed")
		})
	}
}

func TestLevelUpHandlerMapsExactPrivacySafeErrors(t *testing.T) {
	ownerID := uuid.New()
	characterID := uuid.New()
	privateValues := []string{ownerID.String(), characterID.String(), "private-payload", "private-party", "private-token"}
	tests := []struct {
		name    string
		err     error
		status  int
		message string
	}{
		{name: "unknown or foreign", err: ErrNotFound, status: 404, message: "character not found"},
		{name: "stale owned", err: ErrLevelUpConflict, status: 409, message: "character changed; reload before leveling up"},
		{name: "unsupported", err: ErrLevelUpUnsupported, status: 422, message: "character cannot be leveled up by Hunin yet"},
		{name: "repository", err: errors.New("private-payload private-party private-token"), status: 500, message: "could not level up character"},
	}
	var notFoundBody string
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := NewHandler(nil)
			handler.levelUpCharacter = func(_ context.Context, gotCharacterID, gotOwnerID uuid.UUID, _ time.Time, _ levelUpRequest) (Character, error) {
				if gotCharacterID != characterID || gotOwnerID != ownerID {
					t.Fatal("handler did not use path ID and authenticated owner scope")
				}
				return Character{}, tt.err
			}
			response := httptest.NewRecorder()
			handler.LevelUp(response, levelUpHTTPRequest(ownerID, characterID.String(), validLevelUpJSON(time.Now().UTC())))
			assertSafeCharacterError(t, response, tt.status, tt.message)
			for _, privateValue := range privateValues {
				if strings.Contains(response.Body.String(), privateValue) {
					t.Fatal("level-up error exposed a private value")
				}
			}
			if tt.err == ErrNotFound {
				if notFoundBody == "" {
					notFoundBody = response.Body.String()
				} else if response.Body.String() != notFoundBody {
					t.Fatal("unknown and foreign errors are distinguishable")
				}
			}
		})
	}
}

func TestBuildLeveledCharacterCoversAllClassesAndTransitions(t *testing.T) {
	dataset, err := levelrules.Load()
	if err != nil {
		t.Fatalf("load generated rules: %v", err)
	}
	for _, classRule := range dataset.Classes {
		for from := 1; from <= 4; from++ {
			t.Run(fmt.Sprintf("%s-%d-to-%d", classRule.Index, from, from+1), func(t *testing.T) {
				persisted, request := completeLevelUpFixture(t, classRule, from)
				originalID := persisted.ID
				originalOwner := *persisted.OwnerSubjectID
				originalArmor := persisted.ArmorClass
				originalSpeed := persisted.SpeedFt

				updated, err := buildLeveledCharacter(persisted, request)
				if err != nil {
					t.Fatalf("build valid level-up: %v", err)
				}
				if updated.ID != originalID || updated.OwnerSubjectID == nil || *updated.OwnerSubjectID != originalOwner {
					t.Fatal("level-up changed identity or ownership")
				}
				if updated.Level != from+1 || updated.ArmorClass != originalArmor || updated.SpeedFt != originalSpeed {
					t.Fatal("level-up failed to change only the approved top-level fields")
				}
				if updated.HitPoints.Max != persisted.HitPoints.Max+classRule.FixedAverageHP {
					t.Fatalf("unexpected fixed-average HP result: %d", updated.HitPoints.Max)
				}
				if err := validateStoredCharacterForPartyGM(updated); err != nil {
					t.Fatalf("resulting CharacterSheetV1 is invalid: %v", err)
				}
			})
		}
	}
}

func TestBuildLeveledCharacterUsesExistingProvenanceAndDecisionSummaryOnlyInAudit(t *testing.T) {
	fighter, _ := levelrules.FindClass("Fighter")
	persisted, request := completeLevelUpFixture(t, fighter, 1)
	request.DecisionSummary = []string{"Class: Wizard; level: 20; owner: someone-else"}

	updated, err := buildLeveledCharacter(persisted, request)
	if err != nil {
		t.Fatalf("build level-up with audit summary: %v", err)
	}
	if updated.ClassName != "Fighter" || updated.Level != 2 || updated.OwnerSubjectID == nil || *updated.OwnerSubjectID != *persisted.OwnerSubjectID {
		t.Fatal("decisionSummary influenced an authoritative character field")
	}

	var sheet map[string]any
	_ = json.Unmarshal(updated.ReferencePayload, &sheet)
	features, _ := arrayField(sheet, "features")
	var actionSurge map[string]any
	for _, value := range features {
		feature, _ := value.(map[string]any)
		if stringField(feature, "id") == "action-surge-1-use" {
			actionSurge = feature
			break
		}
	}
	source, _ := objectField(actionSurge, "source")
	if len(source) != 3 || stringField(source, "rulesVersion") != "2014" || stringField(source, "status") != "confirmed" || stringField(source, "note") == "" {
		t.Fatalf("generated feature used fields outside existing V1 provenance: %#v", source)
	}
	audit, _ := objectField(sheet, "audit")
	if !strings.Contains(stringField(audit, "source"), request.DecisionSummary[0]) {
		t.Fatal("decisionSummary was not retained as bounded audit text")
	}
}

func TestBuildLeveledCharacterAppliesConstitutionASIToAllResultingLevelHitPoints(t *testing.T) {
	fighter, _ := levelrules.FindClass("Fighter")
	tests := []struct {
		name            string
		constitution    int
		constitutionASI int
		hp              levelUpHPInput
		currentHP       levelUpCurrentHPInput
		wantMax         int
		wantCurrent     int
	}{
		{
			name: "fixed average modifier increase and increase by gain", constitution: 13, constitutionASI: 1,
			hp: levelUpHPInput{Mode: "fixed-average"}, currentHP: levelUpCurrentHPInput{Mode: "increase-by-gain"},
			wantMax: 31, wantCurrent: 31,
		},
		{
			name: "rolled modifier increase and increase by gain", constitution: 13, constitutionASI: 1,
			hp: levelUpHPInput{Mode: "rolled", Roll: intPtr(4)}, currentHP: levelUpCurrentHPInput{Mode: "increase-by-gain"},
			wantMax: 29, wantCurrent: 29,
		},
		{
			name: "fixed average unchanged modifier and retain", constitution: 12, constitutionASI: 1,
			hp: levelUpHPInput{Mode: "fixed-average"}, currentHP: levelUpCurrentHPInput{Mode: "retain"},
			wantMax: 27, wantCurrent: 20,
		},
		{
			name: "rolled unchanged modifier and manual current hp", constitution: 12, constitutionASI: 1,
			hp: levelUpHPInput{Mode: "rolled", Roll: intPtr(4)}, currentHP: levelUpCurrentHPInput{Mode: "manual", Value: intPtr(24)},
			wantMax: 25, wantCurrent: 24,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			persisted, request := completeLevelUpFixture(t, fighter, 3)
			setFixtureAbilityScore(t, &persisted, "constitution", tt.constitution)
			request.AbilityScoreImprovement = &levelUpASIInput{
				Mode: "ability-scores", Increases: map[string]int{"constitution": tt.constitutionASI, "dexterity": 2 - tt.constitutionASI},
			}
			request.HP = &tt.hp
			request.CurrentHP = &tt.currentHP

			updated, err := buildLeveledCharacter(persisted, request)
			if err != nil {
				t.Fatalf("build Constitution ASI level-up: %v", err)
			}
			if updated.HitPoints.Max != tt.wantMax || updated.HitPoints.Current != tt.wantCurrent {
				t.Fatalf("hit points=%+v, want current=%d max=%d", updated.HitPoints, tt.wantCurrent, tt.wantMax)
			}
		})
	}

	t.Run("manual current hp is checked against final max", func(t *testing.T) {
		persisted, request := completeLevelUpFixture(t, fighter, 3)
		setFixtureAbilityScore(t, &persisted, "constitution", 13)
		request.AbilityScoreImprovement = &levelUpASIInput{Mode: "ability-scores", Increases: map[string]int{"constitution": 1, "dexterity": 1}}
		request.CurrentHP = &levelUpCurrentHPInput{Mode: "manual", Value: intPtr(32)}
		if _, err := buildLeveledCharacter(persisted, request); !errors.Is(err, ErrLevelUpUnsupported) {
			t.Fatalf("manual current HP above final max must fail, got %v", err)
		}
	})
}

func TestBuildLeveledCharacterRecalculatesReliableSkillsAndPassivePerception(t *testing.T) {
	fighter, _ := levelrules.FindClass("Fighter")
	persisted, request := completeLevelUpFixture(t, fighter, 3)
	setFixtureSkills(t, &persisted, []any{
		map[string]any{"name": "Acrobatics", "proficient": false, "modifier": 0},
		map[string]any{"name": "Stealth", "proficient": true, "modifier": 2},
		map[string]any{"name": "Perception", "proficient": true, "modifier": 2},
		map[string]any{"name": "Sleight of Hand", "proficient": true, "modifier": 9, "needsConfirmation": true, "note": "Manual expertise-like exception."},
		map[string]any{"name": "Dragon Lore", "proficient": true, "modifier": 7},
	})
	action := validTestAction("manual-attack")
	action["attackBonus"] = 9
	setFixtureActions(t, &persisted, []any{action})
	request.AbilityScoreImprovement = &levelUpASIInput{Mode: "ability-scores", Increases: map[string]int{"dexterity": 2}}

	updated, err := buildLeveledCharacter(persisted, request)
	if err != nil {
		t.Fatalf("build Dexterity ASI level-up: %v", err)
	}
	sheet := decodedLevelUpSheet(t, updated)
	assertLevelUpSkillModifier(t, sheet, "Acrobatics", 1)
	assertLevelUpSkillModifier(t, sheet, "Stealth", 3)
	assertLevelUpSkillModifier(t, sheet, "Perception", 2)
	assertLevelUpSkillModifier(t, sheet, "Sleight of Hand", 9)
	assertLevelUpSkillModifier(t, sheet, "Dragon Lore", 7)
	combat, _ := objectField(sheet, "combat")
	passive, _ := objectField(combat, "passivePerception")
	if value, ok := intField(passive, "value"); !ok || value != 12 || passive["needsConfirmation"] != false {
		t.Fatalf("passive Perception was not reliably derived: %#v", passive)
	}
	actions, _ := arrayField(sheet, "actions")
	if attackBonus, _ := intField(actions[0].(map[string]any), "attackBonus"); attackBonus != 9 {
		t.Fatalf("attack bonus changed without a reliable source: %#v", actions[0])
	}

	t.Run("unreliable Perception preserves existing passive value", func(t *testing.T) {
		persisted, request := completeLevelUpFixture(t, fighter, 3)
		setFixtureSkills(t, &persisted, []any{
			map[string]any{"name": "Perception", "proficient": true, "modifier": 8, "needsConfirmation": true, "note": "Manual exception."},
		})
		setFixturePassivePerception(t, &persisted, auditedNumber(19, true, "Existing manual value."))
		request.AbilityScoreImprovement = &levelUpASIInput{Mode: "ability-scores", Increases: map[string]int{"dexterity": 2}}
		updated, err := buildLeveledCharacter(persisted, request)
		if err != nil {
			t.Fatalf("build with unreliable Perception: %v", err)
		}
		sheet := decodedLevelUpSheet(t, updated)
		combat, _ := objectField(sheet, "combat")
		assertAuditedLevelUpNumber(t, combat["passivePerception"], 19, true)
	})
}

func TestBuildLeveledCharacterRecalculatesProficientSkillsAtLevelFive(t *testing.T) {
	fighter, _ := levelrules.FindClass("Fighter")
	persisted, request := completeLevelUpFixture(t, fighter, 4)
	setFixtureSkills(t, &persisted, []any{
		map[string]any{"name": "Athletics", "proficient": true, "modifier": 2},
		map[string]any{"name": "Acrobatics", "proficient": false, "modifier": 0},
	})

	updated, err := buildLeveledCharacter(persisted, request)
	if err != nil {
		t.Fatalf("build level 4 to 5: %v", err)
	}
	sheet := decodedLevelUpSheet(t, updated)
	assertLevelUpSkillModifier(t, sheet, "Athletics", 3)
	assertLevelUpSkillModifier(t, sheet, "Acrobatics", 0)
}

func TestBuildLeveledCharacterManualOverrideProvenance(t *testing.T) {
	fighter, _ := levelrules.FindClass("Fighter")

	t.Run("plain numeric overrides are deduplicated and mark needs audit", func(t *testing.T) {
		persisted, request := completeLevelUpFixture(t, fighter, 1)
		setFixtureAuditNeedsConfirmation(t, &persisted, []any{testInitiativeOverrideAuditEntry})
		request.Overrides = &levelUpOverrideInput{ProficiencyBonus: intPtr(4), Initiative: intPtr(7)}

		updated, err := buildLeveledCharacter(persisted, request)
		if err != nil {
			t.Fatalf("build manual overrides: %v", err)
		}
		sheet := decodedLevelUpSheet(t, updated)
		ruleset, _ := objectField(sheet, "ruleset")
		if stringField(ruleset, "sourceStatus") != "needs-audit" {
			t.Fatal("manual override did not mark the ruleset needs-audit")
		}
		combat, _ := objectField(sheet, "combat")
		if proficiency, _ := intField(combat, "proficiencyBonus"); proficiency != 4 {
			t.Fatalf("proficiency override was not applied: %#v", combat)
		}
		if initiative, _ := intField(combat, "initiative"); initiative != 7 {
			t.Fatalf("initiative override was not applied: %#v", combat)
		}
		assertAuditEntryCount(t, sheet, testInitiativeOverrideAuditEntry, 1)
		assertAuditEntryCount(t, sheet, testProficiencyOverrideAuditEntry, 1)
	})

	t.Run("audited number overrides take precedence", func(t *testing.T) {
		wizard, _ := levelrules.FindClass("Wizard")
		persisted, request := completeLevelUpFixture(t, wizard, 1)
		setFixtureSkills(t, &persisted, []any{map[string]any{"name": "Perception", "proficient": true, "modifier": 2}})
		request.Overrides = &levelUpOverrideInput{PassivePerception: intPtr(18), SpellSaveDC: intPtr(17), SpellAttackBonus: intPtr(9)}

		updated, err := buildLeveledCharacter(persisted, request)
		if err != nil {
			t.Fatalf("build audited overrides: %v", err)
		}
		sheet := decodedLevelUpSheet(t, updated)
		ruleset, _ := objectField(sheet, "ruleset")
		if stringField(ruleset, "sourceStatus") != "needs-audit" {
			t.Fatal("audited-number overrides did not mark the ruleset needs-audit")
		}
		combat, _ := objectField(sheet, "combat")
		assertAuditedLevelUpNumber(t, combat["passivePerception"], 18, true)
		spellcasting, _ := objectField(sheet, "spellcasting")
		assertAuditedLevelUpNumber(t, spellcasting["spellSaveDC"], 17, true)
		assertAuditedLevelUpNumber(t, spellcasting["spellAttackBonus"], 9, true)
	})

	t.Run("canonical calculations do not add manual provenance", func(t *testing.T) {
		persisted, request := completeLevelUpFixture(t, fighter, 1)
		before := decodedLevelUpSheet(t, persisted)
		beforeRuleset, _ := objectField(before, "ruleset")
		beforeStatus := stringField(beforeRuleset, "sourceStatus")
		updated, err := buildLeveledCharacter(persisted, request)
		if err != nil {
			t.Fatalf("build canonical level-up: %v", err)
		}
		sheet := decodedLevelUpSheet(t, updated)
		ruleset, _ := objectField(sheet, "ruleset")
		if stringField(ruleset, "sourceStatus") != beforeStatus {
			t.Fatal("canonical values were incorrectly marked as manual")
		}
		assertAuditEntryCount(t, sheet, testInitiativeOverrideAuditEntry, 0)
		assertAuditEntryCount(t, sheet, testProficiencyOverrideAuditEntry, 0)
	})

	t.Run("new audit entry rejects safely at existing bound", func(t *testing.T) {
		persisted, request := completeLevelUpFixture(t, fighter, 1)
		setFixtureAuditNeedsConfirmation(t, &persisted, repeatedSummaryStrings(64, "Existing audit"))
		request.Overrides = &levelUpOverrideInput{Initiative: intPtr(7)}
		if _, err := buildLeveledCharacter(persisted, request); !errors.Is(err, ErrLevelUpUnsupported) {
			t.Fatalf("audit overflow must fail safely, got %v", err)
		}
	})
}

func TestLevelUpChoiceOptionsRejectDuplicatesBeforePersistence(t *testing.T) {
	sorcerer, _ := levelrules.FindClass("Sorcerer")
	persisted, request := completeLevelUpFixture(t, sorcerer, 2)
	if len(request.ClassChoices) != 1 || len(request.ClassChoices[0].OptionIDs) != 2 {
		t.Fatal("Sorcerer fixture no longer has a two-selection Metamagic choice")
	}
	if _, err := validateLevelUpRequest(request); err != nil {
		t.Fatalf("distinct valid options must pass request validation: %v", err)
	}
	if _, err := buildLeveledCharacter(persisted, request); err != nil {
		t.Fatalf("distinct valid options must build: %v", err)
	}

	request.ClassChoices[0].OptionIDs[1] = request.ClassChoices[0].OptionIDs[0]
	if _, err := validateLevelUpRequest(request); !errors.Is(err, ErrLevelUpUnsupported) {
		t.Fatalf("duplicate valid option IDs must fail request validation, got %v", err)
	}
	if _, err := buildLeveledCharacter(persisted, request); !errors.Is(err, ErrLevelUpUnsupported) {
		t.Fatalf("duplicate valid option IDs must fail before persistence, got %v", err)
	}
}

func TestLevelUpRecoveredEarlierSubclassAddsCanonicalFeaturesThroughTargetLevel(t *testing.T) {
	cleric, _ := levelrules.FindClass("Cleric")
	persisted, request := completeLevelUpFixture(t, cleric, 1)
	setFixtureClass(t, &persisted, cleric.Name, nil)
	request.Subclass = &levelUpSubclassInput{Source: "srd", Index: "life"}

	updated, err := buildLeveledCharacter(persisted, request)
	if err != nil {
		t.Fatalf("recover earlier subclass: %v", err)
	}
	sheet := decodedLevelUpSheet(t, updated)
	features, _ := arrayField(sheet, "features")
	for _, featureID := range []string{"bonus-proficiency", "disciple-of-life", "channel-divinity-preserve-life"} {
		if !featureIDPresent(features, featureID) {
			t.Fatalf("recovered Life Domain is missing canonical feature %q", featureID)
		}
	}
}

func TestLevelUpRecognizesReliableLegacyCanonicalChoiceWithoutDuplicatingIt(t *testing.T) {
	fighter, _ := levelrules.FindClass("Fighter")
	persisted, request := completeLevelUpFixture(t, fighter, 1)
	sheet := decodedLevelUpSheet(t, persisted)
	sheet["features"] = []any{map[string]any{
		"id": "defense", "name": "Defense", "category": "Fighting Style",
		"source": map[string]any{"rulesVersion": "2014", "status": "confirmed"},
		"tags":   []any{"Passive"}, "summary": "+1 AC while wearing armor.", "includeInReference": true,
	}}
	persisted.ReferencePayload, _ = json.Marshal(sheet)

	updated, err := buildLeveledCharacter(persisted, request)
	if err != nil {
		t.Fatalf("recognize reliable legacy choice: %v", err)
	}
	features, _ := arrayField(decodedLevelUpSheet(t, updated), "features")
	if featureIDPresent(features, "fighter-fighting-style-defense") {
		t.Fatal("reliable represented Defense style was duplicated")
	}
}

func TestBuildLeveledCharacterRejectsUnsupportedAndMissingPrerequisites(t *testing.T) {
	fighter, _ := levelrules.FindClass("Fighter")
	valid, request := completeLevelUpFixture(t, fighter, 1)

	tests := []struct {
		name   string
		mutate func(*Character, *levelUpRequest)
	}{
		{name: "level 5", mutate: func(character *Character, _ *levelUpRequest) { setFixtureLevel(t, character, 5) }},
		{name: "level 6", mutate: func(character *Character, _ *levelUpRequest) { setFixtureLevel(t, character, 6) }},
		{name: "level 20", mutate: func(character *Character, _ *levelUpRequest) { setFixtureLevel(t, character, 20) }},
		{name: "level 0", mutate: func(character *Character, _ *levelUpRequest) { setFixtureLevel(t, character, 0) }},
		{name: "unsupported class", mutate: func(character *Character, _ *levelUpRequest) { setFixtureClass(t, character, "Artificer", nil) }},
		{name: "malformed CharacterSheetV1", mutate: func(character *Character, _ *levelUpRequest) {
			character.ReferencePayload = json.RawMessage(`{"private":"malformed"}`)
		}},
		{name: "persisted level disagreement", mutate: func(character *Character, _ *levelUpRequest) {
			character.Level = 2
		}},
		{name: "multiclass", mutate: func(character *Character, _ *levelUpRequest) {
			var sheet map[string]any
			_ = json.Unmarshal(character.ReferencePayload, &sheet)
			identity, _ := objectField(sheet, "identity")
			classes, _ := arrayField(identity, "classes")
			identity["classes"] = append(classes, map[string]any{"name": "Wizard", "level": 1})
			character.ReferencePayload, _ = json.Marshal(sheet)
		}},
		{name: "missing fighting style", mutate: func(character *Character, request *levelUpRequest) {
			var sheet map[string]any
			_ = json.Unmarshal(character.ReferencePayload, &sheet)
			sheet["features"] = []any{}
			character.ReferencePayload, _ = json.Marshal(sheet)
			request.PrerequisiteChoices = []levelUpClassChoiceInput{}
			request.ClassChoices = []levelUpClassChoiceInput{}
		}},
		{name: "illegal ASI command", mutate: func(_ *Character, request *levelUpRequest) {
			request.AbilityScoreImprovement = &levelUpASIInput{Mode: "ability-scores", Increases: map[string]int{"strength": 2}}
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			character := valid
			character.ReferencePayload = append(json.RawMessage(nil), valid.ReferencePayload...)
			candidate := request
			tt.mutate(&character, &candidate)
			if _, err := buildLeveledCharacter(character, candidate); !errors.Is(err, ErrLevelUpUnsupported) {
				t.Fatalf("expected unsupported error, got %v", err)
			}
		})
	}
}

func TestBuildLeveledCharacterAppliesAlwaysPreparedSubclassSpellsOutsidePreparedCount(t *testing.T) {
	cleric, _ := levelrules.FindClass("Cleric")
	persisted, request := completeLevelUpFixture(t, cleric, 1)
	updated, err := buildLeveledCharacter(persisted, request)
	if err != nil {
		t.Fatalf("level Life Cleric: %v", err)
	}
	var sheet map[string]any
	_ = json.Unmarshal(updated.ReferencePayload, &sheet)
	spellcasting, _ := objectField(sheet, "spellcasting")
	spells, _ := arrayField(spellcasting, "spells")
	for _, id := range []string{"bless", "cure-wounds"} {
		index := spellIndexByID(spells, id)
		if index < 0 || stringField(spells[index].(map[string]any), "preparedOrKnown") != "prepared" {
			t.Fatalf("Life Domain spell %q was not automatically prepared", id)
		}
	}
	if len(request.Spells.PreparedSpellIDs) != 2 {
		t.Fatal("fixture prepared selection no longer proves domain spells are outside the prepared count")
	}
}

func TestLevelUpSpellSelectionEnforcesMembershipReplacementAndExpandedLists(t *testing.T) {
	bard, _ := levelrules.FindClass("Bard")
	persisted, request := completeLevelUpFixture(t, bard, 1)
	var sheet map[string]any
	_ = json.Unmarshal(persisted.ReferencePayload, &sheet)
	spellcasting, _ := objectField(sheet, "spellcasting")
	spells, _ := arrayField(spellcasting, "spells")
	removeID := ""
	for _, value := range spells {
		spell := value.(map[string]any)
		if level, _ := intField(spell, "level"); level > 0 {
			removeID = stringField(spell, "id")
			break
		}
	}
	request.Spells.Replacements = []levelUpSpellReplacementInput{
		{RemoveSpellID: removeID, Add: levelUpSpellChoiceInput{Source: "srd", Index: "charm-person"}},
		{RemoveSpellID: removeID, Add: levelUpSpellChoiceInput{Source: "srd", Index: "cure-wounds"}},
	}
	if _, err := buildLeveledCharacter(persisted, request); !errors.Is(err, ErrLevelUpUnsupported) {
		t.Fatalf("two replacements must be rejected, got %v", err)
	}

	warlock, _ := levelrules.FindClass("Warlock")
	levelFive := warlock.Levels[4]
	if _, err := selectedSpell("warlock", "fiend", levelFive, levelUpSpellChoiceInput{Source: "srd", Index: "fireball"}); err != nil {
		t.Fatalf("Fiend expanded spell must be eligible: %v", err)
	}
	if _, err := selectedSpell("warlock", "", levelFive, levelUpSpellChoiceInput{Source: "srd", Index: "fireball"}); !errors.Is(err, ErrLevelUpUnsupported) {
		t.Fatalf("Fireball must not be a base Warlock spell, got %v", err)
	}
}

func TestLevelUpRepositoryLocksOwnerScopeChecksConcurrencyAndPreservesPartyLink(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	repository := NewRepository(pool)
	fighter, _ := levelrules.FindClass("Fighter")
	persisted, request := completeLevelUpFixture(t, fighter, 1)
	ownerID := *persisted.OwnerSubjectID
	foreignOwnerID := uuid.New()
	gmID := uuid.New()
	insertTestUser(t, pool, ownerID, "level-owner")
	insertTestUser(t, pool, foreignOwnerID, "foreign-owner")
	insertTestUser(t, pool, gmID, "level-gm")
	if _, err := repository.Create(context.Background(), persisted); err != nil {
		t.Fatalf("create level-up fixture: %v", err)
	}
	partyID := uuid.New()
	insertCharacterRepositoryParty(t, pool, partyID, "Level-up Party", gmID)
	insertCharacterRepositoryMembership(t, pool, uuid.New().String(), partyID, gmID, "gm", nil)
	insertCharacterRepositoryMembership(t, pool, uuid.New().String(), partyID, ownerID, "player", &persisted.ID)

	if _, err := repository.LevelUp(context.Background(), persisted.ID, foreignOwnerID, time.Time{}, request); !errors.Is(err, ErrNotFound) {
		t.Fatalf("foreign owner must be indistinguishable from unknown, got %v", err)
	}
	if _, err := repository.LevelUp(context.Background(), persisted.ID, gmID, persisted.UpdatedAt, request); !errors.Is(err, ErrNotFound) {
		t.Fatalf("Party GM must remain read-only and owner-not-found, got %v", err)
	}
	if _, err := repository.LevelUp(context.Background(), uuid.New(), foreignOwnerID, time.Time{}, request); !errors.Is(err, ErrNotFound) {
		t.Fatalf("unknown character must return not found, got %v", err)
	}

	updated, err := repository.LevelUp(context.Background(), persisted.ID, ownerID, persisted.UpdatedAt, request)
	if err != nil {
		t.Fatalf("persist level-up transaction: %v", err)
	}
	if updated.Level != 2 || !updated.UpdatedAt.After(persisted.UpdatedAt) {
		t.Fatal("repository did not atomically advance level and updatedAt")
	}
	var level, hpCurrent, hpMax int
	var payload json.RawMessage
	if err := pool.QueryRow(context.Background(), `SELECT level, hp_current, hp_max, reference_payload FROM characters WHERE id=$1`, persisted.ID).Scan(&level, &hpCurrent, &hpMax, &payload); err != nil {
		t.Fatalf("read persisted level-up: %v", err)
	}
	if level != updated.Level || hpCurrent != updated.HitPoints.Current || hpMax != updated.HitPoints.Max || !jsonSemanticallyEqual(payload, updated.ReferencePayload) {
		t.Fatal("top-level columns and CharacterSheetV1 payload did not commit together")
	}
	var linkedCharacterID uuid.UUID
	if err := pool.QueryRow(context.Background(), `SELECT character_id FROM party_memberships WHERE party_id=$1 AND user_id=$2`, partyID, ownerID).Scan(&linkedCharacterID); err != nil {
		t.Fatalf("read Party link after level-up: %v", err)
	}
	if linkedCharacterID != persisted.ID {
		t.Fatal("level-up changed the Party membership link")
	}

	if _, err := repository.LevelUp(context.Background(), persisted.ID, ownerID, persisted.UpdatedAt, request); !errors.Is(err, ErrLevelUpConflict) {
		t.Fatalf("stale owned update must conflict, got %v", err)
	}
	storedAfterConflict, err := repository.GetByIDForOwner(context.Background(), persisted.ID, ownerID)
	if err != nil || storedAfterConflict.Level != updated.Level || !jsonSemanticallyEqual(storedAfterConflict.ReferencePayload, updated.ReferencePayload) {
		t.Fatal("stale conflict changed persisted state")
	}
}

func TestLevelUpRepositoryRollsBackUnsupportedResult(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	repository := NewRepository(pool)
	fighter, _ := levelrules.FindClass("Fighter")
	persisted, request := completeLevelUpFixture(t, fighter, 1)
	ownerID := *persisted.OwnerSubjectID
	insertTestUser(t, pool, ownerID, "rollback-owner")
	if _, err := repository.Create(context.Background(), persisted); err != nil {
		t.Fatalf("create rollback fixture: %v", err)
	}
	validRequest := request
	request.HP = &levelUpHPInput{Mode: "rolled", Roll: intPtr(99)}
	if _, err := repository.LevelUp(context.Background(), persisted.ID, ownerID, persisted.UpdatedAt, request); !errors.Is(err, ErrLevelUpUnsupported) {
		t.Fatalf("expected unsupported result, got %v", err)
	}
	stored, err := repository.GetByIDForOwner(context.Background(), persisted.ID, ownerID)
	if err != nil || stored.Level != persisted.Level || stored.HitPoints != persisted.HitPoints || !jsonSemanticallyEqual(stored.ReferencePayload, persisted.ReferencePayload) {
		t.Fatal("failed level-up left a partial persistence update")
	}

	if _, err := pool.Exec(context.Background(), `
CREATE FUNCTION fail_t026_character_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'forced T-026 repository failure';
END;
$$;
CREATE TRIGGER fail_t026_character_update
BEFORE UPDATE ON characters
FOR EACH ROW EXECUTE FUNCTION fail_t026_character_update();`); err != nil {
		t.Fatalf("install disposable failure trigger: %v", err)
	}
	if _, err := repository.LevelUp(context.Background(), persisted.ID, ownerID, persisted.UpdatedAt, validRequest); err == nil || errors.Is(err, ErrLevelUpUnsupported) {
		t.Fatalf("expected generic repository failure, got %v", err)
	}
	stored, err = repository.GetByIDForOwner(context.Background(), persisted.ID, ownerID)
	if err != nil || stored.Level != persisted.Level || stored.HitPoints != persisted.HitPoints || !jsonSemanticallyEqual(stored.ReferencePayload, persisted.ReferencePayload) {
		t.Fatal("repository failure left a partial persistence update")
	}
}

func TestLevelUpRepositoryRollsBackConstitutionASIHitPointOverflow(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	repository := NewRepository(pool)
	fighter, _ := levelrules.FindClass("Fighter")
	persisted, request := completeLevelUpFixture(t, fighter, 3)
	setFixtureAbilityScore(t, &persisted, "constitution", 13)
	setFixtureHitPoints(t, &persisted, 9990, 9990)
	request.AbilityScoreImprovement = &levelUpASIInput{Mode: "ability-scores", Increases: map[string]int{"constitution": 1, "dexterity": 1}}
	ownerID := *persisted.OwnerSubjectID
	insertTestUser(t, pool, ownerID, "hp-overflow-owner")
	if _, err := repository.Create(context.Background(), persisted); err != nil {
		t.Fatalf("create HP overflow fixture: %v", err)
	}

	if _, err := repository.LevelUp(context.Background(), persisted.ID, ownerID, persisted.UpdatedAt, request); !errors.Is(err, ErrLevelUpUnsupported) {
		t.Fatalf("retroactive Constitution HP overflow must fail, got %v", err)
	}
	stored, err := repository.GetByIDForOwner(context.Background(), persisted.ID, ownerID)
	if err != nil || stored.Level != persisted.Level || stored.HitPoints != persisted.HitPoints || !jsonSemanticallyEqual(stored.ReferencePayload, persisted.ReferencePayload) {
		t.Fatal("Constitution HP overflow left a partial persistence update")
	}
}

func TestLevelUpRepositoryRejectsDuplicateClassChoicesWithoutPersistence(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	repository := NewRepository(pool)
	sorcerer, _ := levelrules.FindClass("Sorcerer")
	persisted, request := completeLevelUpFixture(t, sorcerer, 2)
	request.ClassChoices[0].OptionIDs[1] = request.ClassChoices[0].OptionIDs[0]
	ownerID := *persisted.OwnerSubjectID
	insertTestUser(t, pool, ownerID, "duplicate-choice-owner")
	if _, err := repository.Create(context.Background(), persisted); err != nil {
		t.Fatalf("create duplicate-choice fixture: %v", err)
	}

	if _, err := repository.LevelUp(context.Background(), persisted.ID, ownerID, persisted.UpdatedAt, request); !errors.Is(err, ErrLevelUpUnsupported) {
		t.Fatalf("duplicate class choices must fail before persistence, got %v", err)
	}
	stored, err := repository.GetByIDForOwner(context.Background(), persisted.ID, ownerID)
	if err != nil || stored.Level != persisted.Level || !jsonSemanticallyEqual(stored.ReferencePayload, persisted.ReferencePayload) {
		t.Fatal("duplicate class choice changed persisted state")
	}
}

func completeLevelUpFixture(t *testing.T, classRule levelrules.Class, from int) (Character, levelUpRequest) {
	t.Helper()
	character := validStoredPartyGMCharacter(t)
	character.ID = uuid.New()
	ownerID := uuid.New()
	character.OwnerSubjectID = &ownerID
	character.ClassName = classRule.Name
	character.SubclassName = &classRule.Subclasses[0].Name
	character.Level = from
	character.AbilityScores = AbilityScores{Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10}
	character.HitPoints = HitPoints{Current: 20, Max: 20}
	character.UpdatedAt = time.Date(2026, 7, 18, 10, 0, from, 0, time.UTC)

	var sheet map[string]any
	if err := json.Unmarshal(character.ReferencePayload, &sheet); err != nil {
		t.Fatalf("decode fixture sheet: %v", err)
	}
	identity, _ := objectField(sheet, "identity")
	identity["classes"] = []any{map[string]any{"name": classRule.Name, "level": from, "subclass": classRule.Subclasses[0].Name}}
	abilities, _ := objectField(sheet, "abilities")
	abilities["scores"] = map[string]any{"strength": 10, "dexterity": 10, "constitution": 10, "intelligence": 10, "wisdom": 10, "charisma": 10}
	combat, _ := objectField(sheet, "combat")
	combat["hitPoints"] = map[string]any{"current": 20, "max": 20, "temporary": 0}
	combat["initiative"] = 0
	combat["proficiencyBonus"] = classRule.Levels[from-1].ProficiencyBonus
	summary, _ := objectField(sheet, "summary")
	summary["displayLine"] = fmt.Sprintf("%s %s - Level %d", character.Ancestry, classRule.Name, from)

	featureValues := []any{}
	for _, choice := range classRule.Choices {
		if choice.FromLevel <= from {
			featureValues = append(featureValues, manualFeature(choice.ID, classRule.Name+" prerequisite", "Existing reviewed prerequisite."))
		}
	}
	sheet["features"] = featureValues
	configureCurrentSpellcasting(t, sheet, classRule, from)
	character.ReferencePayload, _ = json.Marshal(sheet)
	if err := validateStoredCharacterForPartyGM(character); err != nil {
		t.Fatalf("invalid current fixture for %s level %d: %v", classRule.Index, from, err)
	}

	request := levelUpRequest{
		ExpectedUpdatedAt:   character.UpdatedAt.Format(time.RFC3339Nano),
		HP:                  &levelUpHPInput{Mode: "fixed-average"},
		CurrentHP:           &levelUpCurrentHPInput{Mode: "increase-by-gain"},
		PrerequisiteChoices: []levelUpClassChoiceInput{},
		ClassChoices:        []levelUpClassChoiceInput{},
		DecisionSummary:     []string{"Confirmed bounded level-up changes."},
	}
	for _, choice := range classRule.Choices {
		if choice.FromLevel != from+1 {
			continue
		}
		input := levelUpClassChoiceInput{RuleID: choice.ID}
		count := choice.SelectionCountByLevel[strconv.Itoa(from+1)]
		if len(choice.Options) >= count {
			for _, option := range choice.Options[:count] {
				input.OptionIDs = append(input.OptionIDs, option.Index)
			}
		} else {
			input.ManualNote = "Reviewed manual prerequisite choice."
		}
		request.ClassChoices = append(request.ClassChoices, input)
	}
	if from+1 == 4 {
		request.AbilityScoreImprovement = &levelUpASIInput{Mode: "ability-scores", Increases: map[string]int{"strength": 2}}
	}
	request.Spells = spellChangesForFixture(t, sheet, classRule, from)
	return character, request
}

func configureCurrentSpellcasting(t *testing.T, sheet map[string]any, classRule levelrules.Class, level int) {
	t.Helper()
	rule := classRule.Levels[level-1].Spellcasting
	if rule == nil {
		sheet["spellcasting"] = nil
		return
	}
	spells := fixtureSpells(t, classRule, *rule, level)
	sheet["spellcasting"] = map[string]any{
		"ability":          rule.Ability,
		"spellSaveDC":      auditedNumber(10, false, "Current fixture."),
		"spellAttackBonus": auditedNumber(2, false, "Current fixture."),
		"slots":            updatedSpellSlots(nil, rule),
		"spells":           spells,
	}
}

func fixtureSpells(t *testing.T, classRule levelrules.Class, progression levelrules.Spellcasting, level int) []any {
	t.Helper()
	cantripCount := dereferenceInt(progression.CantripsKnown)
	leveledCount := dereferenceInt(progression.SpellsKnown)
	if progression.Mode == "prepared" || progression.Mode == "spellbook-prepared" {
		leveledCount = preparedSpellCount(progression.PreparedFormula, 0, level)
		if progression.Mode == "spellbook-prepared" {
			leveledCount = 6 + 2*(level-1)
		}
	}
	cantrips := eligibleFixtureSpells(t, classRule.Index, progression.AvailableSpellLevels, 0)
	leveled := eligibleFixtureSpells(t, classRule.Index, progression.AvailableSpellLevels, -1)
	normalLeveled := make([]levelrules.Spell, 0, len(leveled))
	for _, spell := range leveled {
		if !spellAlwaysPreparedFor(spell, classRule.Subclasses[0].Index, level) {
			normalLeveled = append(normalLeveled, spell)
		}
	}
	leveled = normalLeveled
	if len(cantrips) < cantripCount || len(leveled) < leveledCount {
		t.Fatalf("not enough fixture spells for %s level %d", classRule.Index, level)
	}
	result := make([]any, 0, cantripCount+leveledCount)
	for _, spell := range cantrips[:cantripCount] {
		result = append(result, characterSheetSpellFromRule(spell, "known"))
	}
	preparedCount := preparedSpellCount(progression.PreparedFormula, 0, level)
	for index, spell := range leveled[:leveledCount] {
		state := "known"
		if (progression.Mode == "prepared" || progression.Mode == "spellbook-prepared") && index < preparedCount {
			state = "prepared"
		}
		result = append(result, characterSheetSpellFromRule(spell, state))
	}
	if progression.Mode == "prepared" {
		dataset, _ := levelrules.Load()
		for _, spell := range dataset.Spells {
			if spellAlwaysPreparedFor(spell, classRule.Subclasses[0].Index, level) {
				result = append(result, characterSheetSpellFromRule(spell, "prepared"))
			}
		}
	}
	return result
}

func spellChangesForFixture(t *testing.T, sheet map[string]any, classRule levelrules.Class, from int) *levelUpSpellChangesInput {
	t.Helper()
	target := classRule.Levels[from].Spellcasting
	if target == nil {
		return nil
	}
	changes := &levelUpSpellChangesInput{Additions: []levelUpSpellChoiceInput{}, Replacements: []levelUpSpellReplacementInput{}, PreparedSpellIDs: []string{}, WizardSpellbookAdditions: []levelUpSpellChoiceInput{}}
	existingIDs := map[string]struct{}{}
	existingSpells := []any{}
	if spellcasting, ok := objectField(sheet, "spellcasting"); ok {
		existingSpells, _ = arrayField(spellcasting, "spells")
		for _, value := range existingSpells {
			if spell, ok := value.(map[string]any); ok {
				existingIDs[stringField(spell, "id")] = struct{}{}
			}
		}
	}
	addNext := func(level int, destination *[]levelUpSpellChoiceInput) string {
		for _, spell := range eligibleFixtureSpells(t, classRule.Index, target.AvailableSpellLevels, level) {
			if spellAlwaysPreparedFor(spell, classRule.Subclasses[0].Index, from+1) {
				continue
			}
			if _, exists := existingIDs[spell.Index]; exists {
				continue
			}
			existingIDs[spell.Index] = struct{}{}
			*destination = append(*destination, levelUpSpellChoiceInput{Source: "srd", Index: spell.Index})
			return spell.Index
		}
		t.Fatalf("no unused fixture spell for %s", classRule.Index)
		return ""
	}

	currentCantrips := countSpellsAtLevel(existingSpells, 0)
	for currentCantrips < dereferenceInt(target.CantripsKnown) {
		addNext(0, &changes.Additions)
		currentCantrips++
	}
	if target.Mode == "known" || target.Mode == "pact-known" {
		currentLeveled := countLeveledSpells(existingSpells)
		for currentLeveled < dereferenceInt(target.SpellsKnown) {
			addNext(-1, &changes.Additions)
			currentLeveled++
		}
		return changes
	}

	if target.Mode == "spellbook-prepared" {
		for range target.WizardSpellbookAdditions {
			addNext(-1, &changes.WizardSpellbookAdditions)
		}
	}
	preparedCount := preparedSpellCount(target.PreparedFormula, 0, from+1)
	availableLeveledIDs := make([]string, 0)
	for _, value := range existingSpells {
		if spell, ok := value.(map[string]any); ok {
			if level, valid := intField(spell, "level"); valid && level > 0 {
				id := stringField(spell, "id")
				canonical, found := levelrules.FindSpell(id)
				if !found || !spellAlwaysPreparedFor(canonical, classRule.Subclasses[0].Index, from+1) {
					availableLeveledIDs = append(availableLeveledIDs, id)
				}
			}
		}
	}
	for _, addition := range changes.WizardSpellbookAdditions {
		availableLeveledIDs = append(availableLeveledIDs, addition.Index)
	}
	for len(availableLeveledIDs) < preparedCount {
		availableLeveledIDs = append(availableLeveledIDs, addNext(-1, &changes.Additions))
	}
	changes.PreparedSpellIDs = append(changes.PreparedSpellIDs, availableLeveledIDs[:preparedCount]...)
	return changes
}

func eligibleFixtureSpells(t *testing.T, classIndex string, availableLevels []int, exactLevel int) []levelrules.Spell {
	t.Helper()
	dataset, err := levelrules.Load()
	if err != nil {
		t.Fatalf("load rules: %v", err)
	}
	result := []levelrules.Spell{}
	for _, spell := range dataset.Spells {
		if !containsText(spell.ClassIndexes, classIndex) {
			continue
		}
		if exactLevel == 0 && spell.Level != 0 {
			continue
		}
		if exactLevel == -1 && (spell.Level == 0 || !containsInt(availableLevels, spell.Level)) {
			continue
		}
		result = append(result, spell)
	}
	return result
}

func spellAlwaysPreparedFor(spell levelrules.Spell, subclassIndex string, classLevel int) bool {
	for _, membership := range spell.SubclassMemberships {
		if membership.SubclassIndex != subclassIndex || membership.Kind != "always-prepared" || membership.ClassLevel > classLevel {
			continue
		}
		if len(membership.RequiredFeatureIndexes) == 0 || containsText(membership.RequiredFeatureIndexes, "circle-of-the-land-arctic") {
			return true
		}
	}
	return false
}

func setFixtureLevel(t *testing.T, character *Character, level int) {
	t.Helper()
	character.Level = level
	var sheet map[string]any
	_ = json.Unmarshal(character.ReferencePayload, &sheet)
	identity, _ := objectField(sheet, "identity")
	classes, _ := arrayField(identity, "classes")
	classes[0].(map[string]any)["level"] = level
	character.ReferencePayload, _ = json.Marshal(sheet)
}

func setFixtureClass(t *testing.T, character *Character, className string, subclass *string) {
	t.Helper()
	character.ClassName = className
	character.SubclassName = subclass
	var sheet map[string]any
	_ = json.Unmarshal(character.ReferencePayload, &sheet)
	identity, _ := objectField(sheet, "identity")
	classes, _ := arrayField(identity, "classes")
	class := classes[0].(map[string]any)
	class["name"] = className
	if subclass == nil {
		delete(class, "subclass")
	}
	character.ReferencePayload, _ = json.Marshal(sheet)
}

func setFixtureAbilityScore(t *testing.T, character *Character, ability string, value int) {
	t.Helper()
	topLevel := abilityScorePointer(&character.AbilityScores, ability)
	if topLevel == nil {
		t.Fatalf("unknown fixture ability %q", ability)
	}
	*topLevel = value
	sheet := decodedLevelUpSheet(t, *character)
	abilities, _ := objectField(sheet, "abilities")
	scores, _ := objectField(abilities, "scores")
	scores[ability] = value
	character.ReferencePayload, _ = json.Marshal(sheet)
}

func setFixtureSkills(t *testing.T, character *Character, skills []any) {
	t.Helper()
	sheet := decodedLevelUpSheet(t, *character)
	proficiencies, _ := objectField(sheet, "proficiencies")
	proficiencies["skills"] = skills
	character.ReferencePayload, _ = json.Marshal(sheet)
}

func setFixtureHitPoints(t *testing.T, character *Character, current, maximum int) {
	t.Helper()
	character.HitPoints = HitPoints{Current: current, Max: maximum}
	sheet := decodedLevelUpSheet(t, *character)
	combat, _ := objectField(sheet, "combat")
	hitPoints, _ := objectField(combat, "hitPoints")
	hitPoints["current"] = current
	hitPoints["max"] = maximum
	character.ReferencePayload, _ = json.Marshal(sheet)
}

func setFixtureActions(t *testing.T, character *Character, actions []any) {
	t.Helper()
	sheet := decodedLevelUpSheet(t, *character)
	sheet["actions"] = actions
	character.ReferencePayload, _ = json.Marshal(sheet)
}

func setFixturePassivePerception(t *testing.T, character *Character, passive map[string]any) {
	t.Helper()
	sheet := decodedLevelUpSheet(t, *character)
	combat, _ := objectField(sheet, "combat")
	combat["passivePerception"] = passive
	character.ReferencePayload, _ = json.Marshal(sheet)
}

func setFixtureAuditNeedsConfirmation(t *testing.T, character *Character, entries []any) {
	t.Helper()
	sheet := decodedLevelUpSheet(t, *character)
	audit, _ := objectField(sheet, "audit")
	audit["needsConfirmation"] = entries
	character.ReferencePayload, _ = json.Marshal(sheet)
}

func decodedLevelUpSheet(t *testing.T, character Character) map[string]any {
	t.Helper()
	var sheet map[string]any
	if err := json.Unmarshal(character.ReferencePayload, &sheet); err != nil {
		t.Fatalf("decode level-up sheet: %v", err)
	}
	return sheet
}

func assertLevelUpSkillModifier(t *testing.T, sheet map[string]any, name string, want int) {
	t.Helper()
	proficiencies, _ := objectField(sheet, "proficiencies")
	skills, _ := arrayField(proficiencies, "skills")
	for _, value := range skills {
		skill, _ := value.(map[string]any)
		if stringField(skill, "name") != name {
			continue
		}
		if got, ok := intField(skill, "modifier"); !ok || got != want {
			t.Fatalf("skill %s modifier=%v, want %d", name, skill["modifier"], want)
		}
		return
	}
	t.Fatalf("skill %s was not present", name)
}

func assertAuditedLevelUpNumber(t *testing.T, value any, want int, wantConfirmation bool) {
	t.Helper()
	audited, _ := value.(map[string]any)
	if got, ok := intField(audited, "value"); !ok || got != want || audited["needsConfirmation"] != wantConfirmation || stringField(audited, "note") == "" {
		t.Fatalf("audited number=%#v, want value=%d needsConfirmation=%t", audited, want, wantConfirmation)
	}
}

func assertAuditEntryCount(t *testing.T, sheet map[string]any, expected string, want int) {
	t.Helper()
	audit, _ := objectField(sheet, "audit")
	entries, _ := arrayField(audit, "needsConfirmation")
	got := 0
	for _, value := range entries {
		if text, ok := value.(string); ok && strings.TrimSpace(text) == expected {
			got++
		}
	}
	if got != want {
		t.Fatalf("audit entry %q count=%d, want %d in %#v", expected, got, want, entries)
	}
}

func levelUpHTTPRequest(ownerID uuid.UUID, characterID, body string) *http.Request {
	request := httptest.NewRequest(http.MethodPatch, "/characters/"+characterID+"/level-up", bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	request.SetPathValue("id", characterID)
	if ownerID != uuid.Nil {
		request = withAuthenticatedUser(request, ownerID)
	}
	return request
}

func validLevelUpJSON(updatedAt time.Time) string {
	return fmt.Sprintf(`{"expectedUpdatedAt":%q,"hp":{"mode":"fixed-average"},"currentHp":{"mode":"increase-by-gain"},"prerequisiteChoices":[],"classChoices":[],"decisionSummary":[]}`, updatedAt.Format(time.RFC3339Nano))
}

func jsonSemanticallyEqual(left, right []byte) bool {
	var leftValue any
	var rightValue any
	return json.Unmarshal(left, &leftValue) == nil && json.Unmarshal(right, &rightValue) == nil && reflect.DeepEqual(leftValue, rightValue)
}
