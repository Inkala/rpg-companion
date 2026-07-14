package characters

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"reflect"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestMapCharacterCreateErrorMapsKnownPostgresClientDataFailures(t *testing.T) {
	knownConstraints := []string{
		"characters_level_check",
		"characters_hp_current_check",
		"characters_hp_max_check",
		"characters_armor_class_check",
		"characters_speed_ft_check",
		"characters_reference_payload_check",
		"characters_check",
	}

	for _, constraintName := range knownConstraints {
		t.Run(constraintName, func(t *testing.T) {
			postgresError := &pgconn.PgError{
				Code:           "23514",
				ConstraintName: constraintName,
				Message:        "must-not-be-exposed",
				Detail:         "rejected-value-must-not-be-exposed",
			}

			mapped := mapCharacterCreateError(postgresError)

			if !errors.Is(mapped, ErrInvalidCharacterData) {
				t.Fatalf("expected %s to map to ErrInvalidCharacterData, got %v", constraintName, mapped)
			}
			var preserved *pgconn.PgError
			if !errors.As(mapped, &preserved) || preserved != postgresError {
				t.Fatalf("expected mapped error to preserve underlying PostgreSQL error, got %v", mapped)
			}
		})
	}

	postgresError := &pgconn.PgError{Code: "22003", Message: "numeric value out of range"}
	mapped := mapCharacterCreateError(postgresError)
	if !errors.Is(mapped, ErrInvalidCharacterData) {
		t.Fatalf("expected numeric out-of-range to map to ErrInvalidCharacterData, got %v", mapped)
	}
	var preserved *pgconn.PgError
	if !errors.As(mapped, &preserved) || preserved != postgresError {
		t.Fatalf("expected mapped error to preserve numeric PostgreSQL error, got %v", mapped)
	}
}

func TestMapCharacterCreateErrorRecognizesWrappedPostgresErrors(t *testing.T) {
	postgresError := &pgconn.PgError{Code: "23514", ConstraintName: "characters_level_check"}
	wrapper := fmt.Errorf("execute character insert: %w", postgresError)

	mapped := mapCharacterCreateError(wrapper)

	if !errors.Is(mapped, ErrInvalidCharacterData) {
		t.Fatalf("expected wrapped PostgreSQL error to map, got %v", mapped)
	}
	var preserved *pgconn.PgError
	if !errors.As(mapped, &preserved) || preserved != postgresError {
		t.Fatalf("expected wrapped PostgreSQL error to remain inspectable, got %v", mapped)
	}
}

func TestMapCharacterCreateErrorLeavesUnrelatedFailuresUnchanged(t *testing.T) {
	connectionError := &net.OpError{Op: "dial", Err: errors.New("connection unavailable")}
	arbitraryError := errors.New("arbitrary failure")
	tests := []struct {
		name  string
		input error
	}{
		{name: "unknown check constraint", input: &pgconn.PgError{Code: "23514", ConstraintName: "characters_future_check"}},
		{name: "foreign key", input: &pgconn.PgError{Code: "23503", ConstraintName: "characters_owner_subject_id_fkey"}},
		{name: "unique violation", input: &pgconn.PgError{Code: "23505", ConstraintName: "characters_pkey"}},
		{name: "connection error", input: connectionError},
		{name: "arbitrary error", input: arbitraryError},
		{name: "context cancellation", input: context.Canceled},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mapped := mapCharacterCreateError(tt.input)
			if errors.Is(mapped, ErrInvalidCharacterData) {
				t.Fatalf("expected unrelated error to remain unrelated, got %v", mapped)
			}
			if mapped != tt.input {
				t.Fatalf("expected unrelated error to be returned unchanged, got %v", mapped)
			}
		})
	}
}

func TestRepositoryCreateMapsOnlyKnownDatabaseFailures(t *testing.T) {
	tests := []struct {
		name           string
		mutate         func(*Character)
		wantInvalid    bool
		wantConstraint string
	}{
		{
			name: "known current HP constraint",
			mutate: func(character *Character) {
				character.HitPoints.Current = -1
			},
			wantInvalid: true, wantConstraint: "characters_hp_current_check",
		},
		{
			name: "known cross-field HP constraint",
			mutate: func(character *Character) {
				character.HitPoints.Current = 11
				character.HitPoints.Max = 10
			},
			wantInvalid: true, wantConstraint: "characters_check",
		},
		{
			name: "unrelated owner foreign key",
			mutate: func(character *Character) {
				ownerID := uuid.New()
				character.OwnerSubjectID = &ownerID
			},
			wantInvalid: false, wantConstraint: "characters_owner_subject_id_fkey",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pool := setupIntegrationDatabase(t)
			repository := NewRepository(pool)
			ownerID := uuid.New()
			insertTestUser(t, pool, ownerID, "repository-user")
			character := validRepositoryCharacter(ownerID)
			tt.mutate(&character)

			_, err := repository.Create(context.Background(), character)
			if err == nil {
				t.Fatal("expected repository creation to fail")
			}
			if errors.Is(err, ErrInvalidCharacterData) != tt.wantInvalid {
				t.Fatalf("expected invalid-data classification %t, got %v", tt.wantInvalid, err)
			}
			var postgresError *pgconn.PgError
			if !errors.As(err, &postgresError) {
				t.Fatalf("expected PostgreSQL error to remain inspectable, got %v", err)
			}
			if tt.wantConstraint != "" && postgresError.ConstraintName != tt.wantConstraint {
				t.Fatalf("expected constraint %q, got %q", tt.wantConstraint, postgresError.ConstraintName)
			}
		})
	}
}

func TestListSummariesForOwnerExtractsPresentationFields(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	repository := NewRepository(pool)
	ownerID := uuid.New()
	insertTestUser(t, pool, ownerID, "summary-owner")
	character := validRepositoryCharacter(ownerID)
	character.ReferencePayload = json.RawMessage(`{
		"schemaVersion":"CharacterSheetV1",
		"summary":{
			"landingConcept":"A sturdy beginner Fighter built to protect allies.",
			"portraitAssetId":"hero-portrait",
			"portraitAlt":"Portrait of a shield-bearing Fighter",
			"featuredAbilities":["Longsword","Second Wind"]
		}
	}`)

	if _, err := repository.Create(context.Background(), character); err != nil {
		t.Fatalf("create character with summary presentation fields: %v", err)
	}

	summaries, err := repository.ListSummariesForOwner(context.Background(), ownerID)
	if err != nil {
		t.Fatalf("list summaries: %v", err)
	}
	if len(summaries) != 1 {
		t.Fatalf("expected one summary, got %d", len(summaries))
	}
	summary := summaries[0]
	if summary.PortraitAssetID == nil || *summary.PortraitAssetID != "hero-portrait" {
		t.Fatalf("expected portrait asset ID, got %v", summary.PortraitAssetID)
	}
	if summary.PortraitAlt == nil || *summary.PortraitAlt != "Portrait of a shield-bearing Fighter" {
		t.Fatalf("expected portrait alt text, got %v", summary.PortraitAlt)
	}
	if !reflect.DeepEqual(summary.FeaturedAbilities, []string{"Longsword", "Second Wind"}) {
		t.Fatalf("expected featured abilities, got %v", summary.FeaturedAbilities)
	}
	if summary.LandingConcept != "A sturdy beginner Fighter built to protect allies." {
		t.Fatalf("expected landing concept, got %q", summary.LandingConcept)
	}
}

func validRepositoryCharacter(ownerID uuid.UUID) Character {
	now := time.Date(2026, 7, 13, 12, 0, 0, 0, time.UTC)
	return Character{
		ID:             uuid.New(),
		OwnerSubjectID: &ownerID,
		Name:           "Repository Test",
		ClassName:      "Fighter",
		Level:          1,
		Ancestry:       "Human",
		Background:     "Soldier",
		AbilityScores: AbilityScores{
			Strength: 10, Dexterity: 10, Constitution: 10,
			Intelligence: 10, Wisdom: 10, Charisma: 10,
		},
		HitPoints:        HitPoints{Current: 10, Max: 10},
		ArmorClass:       10,
		SpeedFt:          30,
		ReferencePayload: json.RawMessage(`{"schemaVersion":"CharacterSheetV1"}`),
		CreatedAt:        now,
		UpdatedAt:        now,
	}
}

func TestGetByIDForPartyGMReturnsCompleteLinkedCharacter(t *testing.T) {
	fixture := setupPartyGMCharacterFixture(t)

	character, err := fixture.repository.GetByIDForPartyGM(
		context.Background(),
		fixture.linkedCharacterID,
		fixture.partyAID,
		fixture.gmAID,
	)
	if err != nil {
		t.Fatalf("get linked character for Party GM: %v", err)
	}

	if character.ID != fixture.linkedCharacterID {
		t.Fatalf("expected linked character ID %s, got %s", fixture.linkedCharacterID, character.ID)
	}
	if character.OwnerSubjectID == nil || *character.OwnerSubjectID != fixture.targetPlayerID {
		t.Fatal("authorized character did not preserve its owner")
	}
	if character.Name != "Complete Hero" || character.ClassName != "Ranger" || character.Level != 7 {
		t.Fatal("authorized character did not preserve its identity fields")
	}
	if character.SubclassName == nil || *character.SubclassName != "Hunter" {
		t.Fatal("authorized character did not preserve its subclass")
	}
	if character.Ancestry != "Wood Elf" || character.Background != "Outlander" {
		t.Fatal("authorized character did not preserve its ancestry and background")
	}
	if character.AbilityScores != (AbilityScores{Strength: 10, Dexterity: 18, Constitution: 14, Intelligence: 11, Wisdom: 16, Charisma: 9}) {
		t.Fatal("authorized character did not preserve its ability scores")
	}
	if character.HitPoints != (HitPoints{Current: 41, Max: 52}) || character.ArmorClass != 16 || character.SpeedFt != 35 {
		t.Fatal("authorized character did not preserve its combat values")
	}
	var expectedReferencePayload any
	if err := json.Unmarshal(fixture.referencePayload, &expectedReferencePayload); err != nil {
		t.Fatalf("decode expected referencePayload: %v", err)
	}
	var actualReferencePayload any
	if err := json.Unmarshal(character.ReferencePayload, &actualReferencePayload); err != nil {
		t.Fatalf("decode actual referencePayload: %v", err)
	}
	if !reflect.DeepEqual(actualReferencePayload, expectedReferencePayload) {
		t.Fatal("authorized character did not preserve referencePayload")
	}
	if !character.CreatedAt.Equal(fixture.characterCreatedAt) || !character.UpdatedAt.Equal(fixture.characterUpdatedAt) {
		t.Fatal("authorized character did not preserve timestamps")
	}
}

func TestGetByIDForPartyGMEnforcesBrokenAccessControlMatrix(t *testing.T) {
	fixture := setupPartyGMCharacterFixture(t)

	tests := []struct {
		name        string
		characterID uuid.UUID
		partyID     uuid.UUID
		requesterID uuid.UUID
	}{
		{
			name:        "unknown Party",
			characterID: fixture.linkedCharacterID,
			partyID:     uuid.MustParse("61000000-0000-0000-0000-000000000099"),
			requesterID: fixture.gmAID,
		},
		{
			name:        "non-member requester",
			characterID: fixture.linkedCharacterID,
			partyID:     fixture.partyAID,
			requesterID: fixture.nonMemberID,
		},
		{
			name:        "Player requester",
			characterID: fixture.linkedCharacterID,
			partyID:     fixture.partyAID,
			requesterID: fixture.playerRequesterID,
		},
		{
			name:        "GM from another Party",
			characterID: fixture.linkedCharacterID,
			partyID:     fixture.partyAID,
			requesterID: fixture.gmBID,
		},
		{
			name:        "unknown character",
			characterID: uuid.MustParse("62000000-0000-0000-0000-000000000099"),
			partyID:     fixture.partyAID,
			requesterID: fixture.gmAID,
		},
		{
			name:        "foreign unlinked character",
			characterID: fixture.foreignCharacterID,
			partyID:     fixture.partyAID,
			requesterID: fixture.gmAID,
		},
		{
			name:        "requester-owned but unlinked character",
			characterID: fixture.gmOwnedUnlinkedCharacterID,
			partyID:     fixture.partyAID,
			requesterID: fixture.gmAID,
		},
		{
			name:        "character linked to another Party",
			characterID: fixture.otherPartyCharacterID,
			partyID:     fixture.partyAID,
			requesterID: fixture.gmAID,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := fixture.repository.GetByIDForPartyGM(context.Background(), tt.characterID, tt.partyID, tt.requesterID); !errors.Is(err, ErrNotFound) {
				t.Fatalf("expected ErrNotFound, got %v", err)
			}
		})
	}
}

func TestGetByIDForPartyGMPreservesDatabaseErrors(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	repository := NewRepository(pool)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := repository.GetByIDForPartyGM(ctx, uuid.New(), uuid.New(), uuid.New())
	if err == nil {
		t.Fatal("expected canceled authorization query to fail")
	}
	if errors.Is(err, ErrNotFound) {
		t.Fatal("database error must remain distinct from ErrNotFound")
	}
}

type partyGMCharacterFixture struct {
	repository                 *Repository
	partyAID                   uuid.UUID
	gmAID                      uuid.UUID
	gmBID                      uuid.UUID
	targetPlayerID             uuid.UUID
	playerRequesterID          uuid.UUID
	nonMemberID                uuid.UUID
	linkedCharacterID          uuid.UUID
	foreignCharacterID         uuid.UUID
	gmOwnedUnlinkedCharacterID uuid.UUID
	otherPartyCharacterID      uuid.UUID
	referencePayload           json.RawMessage
	characterCreatedAt         time.Time
	characterUpdatedAt         time.Time
}

func setupPartyGMCharacterFixture(t *testing.T) partyGMCharacterFixture {
	t.Helper()
	pool := setupIntegrationDatabase(t)
	repository := NewRepository(pool)

	fixture := partyGMCharacterFixture{
		repository:                 repository,
		partyAID:                   uuid.MustParse("61000000-0000-0000-0000-000000000001"),
		gmAID:                      uuid.MustParse("60000000-0000-0000-0000-000000000001"),
		gmBID:                      uuid.MustParse("60000000-0000-0000-0000-000000000002"),
		targetPlayerID:             uuid.MustParse("60000000-0000-0000-0000-000000000003"),
		playerRequesterID:          uuid.MustParse("60000000-0000-0000-0000-000000000004"),
		nonMemberID:                uuid.MustParse("60000000-0000-0000-0000-000000000005"),
		linkedCharacterID:          uuid.MustParse("62000000-0000-0000-0000-000000000001"),
		foreignCharacterID:         uuid.MustParse("62000000-0000-0000-0000-000000000002"),
		gmOwnedUnlinkedCharacterID: uuid.MustParse("62000000-0000-0000-0000-000000000003"),
		otherPartyCharacterID:      uuid.MustParse("62000000-0000-0000-0000-000000000004"),
		referencePayload:           json.RawMessage(`{"actions":[{"name":"Longbow","damage":"1d8+4"}],"features":[{"name":"Colossus Slayer"}],"spells":[{"name":"Hunter's Mark"}]}`),
		characterCreatedAt:         time.Date(2026, 7, 14, 8, 0, 0, 0, time.UTC),
		characterUpdatedAt:         time.Date(2026, 7, 14, 9, 0, 0, 0, time.UTC),
	}
	otherPartyID := uuid.MustParse("61000000-0000-0000-0000-000000000002")
	otherPartyPlayerID := uuid.MustParse("60000000-0000-0000-0000-000000000006")

	users := []struct {
		id       uuid.UUID
		username string
	}{
		{id: fixture.gmAID, username: "gm-a"},
		{id: fixture.gmBID, username: "gm-b"},
		{id: fixture.targetPlayerID, username: "target-player"},
		{id: fixture.playerRequesterID, username: "requester-player"},
		{id: fixture.nonMemberID, username: "non-member"},
		{id: otherPartyPlayerID, username: "other-party-player"},
	}
	for _, user := range users {
		insertTestUser(t, pool, user.id, user.username)
	}

	createPartyGMCharacter(t, repository, fixture.linkedCharacterID, fixture.targetPlayerID, "Complete Hero", fixture.referencePayload, fixture.characterCreatedAt, fixture.characterUpdatedAt)
	createPartyGMCharacter(t, repository, fixture.foreignCharacterID, fixture.nonMemberID, "Foreign Hero", json.RawMessage(`{"secret":"foreign"}`), fixture.characterCreatedAt, fixture.characterUpdatedAt)
	createPartyGMCharacter(t, repository, fixture.gmOwnedUnlinkedCharacterID, fixture.gmAID, "GM Hero", json.RawMessage(`{"secret":"gm-owned"}`), fixture.characterCreatedAt, fixture.characterUpdatedAt)
	createPartyGMCharacter(t, repository, fixture.otherPartyCharacterID, otherPartyPlayerID, "Other Party Hero", json.RawMessage(`{"secret":"other-party"}`), fixture.characterCreatedAt, fixture.characterUpdatedAt)
	playerRequesterCharacterID := uuid.MustParse("62000000-0000-0000-0000-000000000005")
	createPartyGMCharacter(t, repository, playerRequesterCharacterID, fixture.playerRequesterID, "Requester Hero", json.RawMessage(`{"secret":"requester"}`), fixture.characterCreatedAt, fixture.characterUpdatedAt)

	insertCharacterRepositoryParty(t, pool, fixture.partyAID, "Party A", fixture.gmAID)
	insertCharacterRepositoryParty(t, pool, otherPartyID, "Party B", fixture.gmBID)
	insertCharacterRepositoryMembership(t, pool, "63000000-0000-0000-0000-000000000001", fixture.partyAID, fixture.gmAID, "gm", nil)
	insertCharacterRepositoryMembership(t, pool, "63000000-0000-0000-0000-000000000002", fixture.partyAID, fixture.targetPlayerID, "player", &fixture.linkedCharacterID)
	insertCharacterRepositoryMembership(t, pool, "63000000-0000-0000-0000-000000000003", fixture.partyAID, fixture.playerRequesterID, "player", &playerRequesterCharacterID)
	insertCharacterRepositoryMembership(t, pool, "63000000-0000-0000-0000-000000000004", otherPartyID, fixture.gmBID, "gm", nil)
	insertCharacterRepositoryMembership(t, pool, "63000000-0000-0000-0000-000000000005", otherPartyID, otherPartyPlayerID, "player", &fixture.otherPartyCharacterID)

	return fixture
}

func createPartyGMCharacter(
	t *testing.T,
	repository *Repository,
	id uuid.UUID,
	ownerID uuid.UUID,
	name string,
	referencePayload json.RawMessage,
	createdAt time.Time,
	updatedAt time.Time,
) {
	t.Helper()
	subclass := "Hunter"
	_, err := repository.Create(context.Background(), Character{
		ID:             id,
		OwnerSubjectID: &ownerID,
		Name:           name,
		ClassName:      "Ranger",
		SubclassName:   &subclass,
		Level:          7,
		Ancestry:       "Wood Elf",
		Background:     "Outlander",
		AbilityScores: AbilityScores{
			Strength:     10,
			Dexterity:    18,
			Constitution: 14,
			Intelligence: 11,
			Wisdom:       16,
			Charisma:     9,
		},
		HitPoints:        HitPoints{Current: 41, Max: 52},
		ArmorClass:       16,
		SpeedFt:          35,
		ReferencePayload: referencePayload,
		CreatedAt:        createdAt,
		UpdatedAt:        updatedAt,
	})
	if err != nil {
		t.Fatalf("create Party GM character fixture: %v", err)
	}
}

func insertCharacterRepositoryParty(t *testing.T, pool *pgxpool.Pool, id uuid.UUID, name string, creatorID uuid.UUID) {
	t.Helper()
	now := time.Date(2026, 7, 14, 10, 0, 0, 0, time.UTC)
	_, err := pool.Exec(context.Background(), `
INSERT INTO parties (id, name, created_by_user_id, created_at, updated_at)
VALUES ($1::uuid, $2, $3::uuid, $4, $4)`, id.String(), name, creatorID.String(), now)
	if err != nil {
		t.Fatalf("insert character repository Party: %v", err)
	}
}

func insertCharacterRepositoryMembership(
	t *testing.T,
	pool *pgxpool.Pool,
	id string,
	partyID uuid.UUID,
	userID uuid.UUID,
	role string,
	characterID *uuid.UUID,
) {
	t.Helper()
	var characterIDText *string
	if characterID != nil {
		value := characterID.String()
		characterIDText = &value
	}
	_, err := pool.Exec(context.Background(), `
INSERT INTO party_memberships (id, party_id, user_id, role, character_id, joined_at)
VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::uuid, $6)`,
		id, partyID.String(), userID.String(), role, characterIDText, time.Date(2026, 7, 14, 10, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("insert character repository membership: %v", err)
	}
}
