package parties

import (
	"context"
	"errors"
	"os"
	"reflect"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestRepositoryCreatePartyCreatesExactlyOneGMMembership(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	seedPartyMigrationUsers(t, pool)

	partyID := uuid.MustParse("32000000-0000-0000-0000-000000000001")
	membershipID := uuid.MustParse("42000000-0000-0000-0000-000000000001")
	createdAt := time.Date(2026, 7, 13, 9, 30, 0, 0, time.UTC)
	repository := newRepository(
		pool,
		sequentialPartyIDs(t, partyID, membershipID),
		func() time.Time { return createdAt },
	)

	party, err := repository.CreateParty(context.Background(), uuid.MustParse(testGMUserID), "  Lantern Keep  ")
	if err != nil {
		t.Fatalf("create party: %v", err)
	}
	if party.ID != partyID {
		t.Fatalf("expected party ID %s, got %s", partyID, party.ID)
	}
	if party.Name != "Lantern Keep" {
		t.Fatalf("expected normalized party name, got %q", party.Name)
	}
	if party.CreatedByUserID != uuid.MustParse(testGMUserID) {
		t.Fatalf("expected creator ID %s, got %s", testGMUserID, party.CreatedByUserID)
	}
	if !party.CreatedAt.Equal(createdAt) || !party.UpdatedAt.Equal(createdAt) {
		t.Fatalf("expected creation timestamps to equal injected time")
	}

	var membershipCount int
	var role string
	var characterID *string
	err = pool.QueryRow(context.Background(), `
SELECT count(*) OVER (), role, character_id::text
FROM party_memberships
WHERE party_id = $1::uuid`, partyID.String()).Scan(&membershipCount, &role, &characterID)
	if err != nil {
		t.Fatalf("load GM membership: %v", err)
	}
	if membershipCount != 1 {
		t.Fatalf("expected exactly one membership, got %d", membershipCount)
	}
	if role != RoleGM {
		t.Fatalf("expected GM role, got %q", role)
	}
	if characterID != nil {
		t.Fatal("expected GM membership to have no character")
	}

	if _, err := repository.CreateParty(context.Background(), uuid.MustParse(testGMUserID), "   "); !errors.Is(err, ErrInvalidPartyName) {
		t.Fatalf("expected invalid Party name to return ErrInvalidPartyName, got %v", err)
	}
	requirePartyCount(t, pool, 1)
}

func TestRepositoryCreatePartyRollsBackWhenGMMembershipFails(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	seedPartyMigrationUsers(t, pool)

	existingPartyID := "32000000-0000-0000-0000-000000000010"
	existingMembershipID := "42000000-0000-0000-0000-000000000010"
	insertTestParty(t, pool, existingPartyID, "Existing Party", testGMUserID)
	insertTestMembership(t, pool, existingMembershipID, existingPartyID, testGMUserID, RoleGM, nil)

	rolledBackPartyID := uuid.MustParse("32000000-0000-0000-0000-000000000011")
	repository := newRepository(
		pool,
		sequentialPartyIDs(t, rolledBackPartyID, uuid.MustParse(existingMembershipID)),
		func() time.Time { return migrationTestNow.Add(time.Hour) },
	)

	if _, err := repository.CreateParty(context.Background(), uuid.MustParse(testOtherGMUserID), "Rollback Party"); err == nil {
		t.Fatal("expected GM membership insertion to fail")
	}

	var count int
	if err := pool.QueryRow(context.Background(), `
SELECT count(*) FROM parties WHERE id = $1::uuid`, rolledBackPartyID.String()).Scan(&count); err != nil {
		t.Fatalf("count rolled-back party: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected Party insertion to roll back, found %d rows", count)
	}
}

func TestRepositoryListPartiesForUserIsOwnerScopedAndDeterministic(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	seedPartyMigrationUsers(t, pool)
	seedPartyMigrationCharacters(t, pool)

	oldPartyID := uuid.MustParse("32000000-0000-0000-0000-000000000101")
	newPartyID := uuid.MustParse("32000000-0000-0000-0000-000000000102")
	unrelatedPartyID := uuid.MustParse("32000000-0000-0000-0000-000000000103")
	oldCreatedAt := time.Date(2026, 7, 13, 8, 0, 0, 0, time.UTC)
	newCreatedAt := oldCreatedAt.Add(time.Hour)
	unrelatedCreatedAt := newCreatedAt.Add(time.Hour)

	repository := newRepository(
		pool,
		sequentialPartyIDs(t,
			oldPartyID, uuid.MustParse("42000000-0000-0000-0000-000000000101"),
			newPartyID, uuid.MustParse("42000000-0000-0000-0000-000000000102"),
			unrelatedPartyID, uuid.MustParse("42000000-0000-0000-0000-000000000103"),
		),
		sequentialPartyTimes(t, oldCreatedAt, newCreatedAt, unrelatedCreatedAt),
	)

	if _, err := repository.CreateParty(context.Background(), uuid.MustParse(testGMUserID), "Older Party"); err != nil {
		t.Fatalf("create older party: %v", err)
	}
	linkedCharacterID := testCharacterID
	insertTestMembership(t, pool, "42000000-0000-0000-0000-000000000104", oldPartyID.String(), testPlayerUserID, RolePlayer, &linkedCharacterID)
	if _, err := repository.CreateParty(context.Background(), uuid.MustParse(testPlayerUserID), "Newest Membership"); err != nil {
		t.Fatalf("create newest membership party: %v", err)
	}
	if _, err := repository.CreateParty(context.Background(), uuid.MustParse(testOtherGMUserID), "Unrelated Party"); err != nil {
		t.Fatalf("create unrelated party: %v", err)
	}

	summaries, err := repository.ListPartiesForUser(context.Background(), uuid.MustParse(testPlayerUserID))
	if err != nil {
		t.Fatalf("list parties for user: %v", err)
	}
	if len(summaries) != 2 {
		t.Fatalf("expected two scoped parties, got %d", len(summaries))
	}

	if summaries[0].ID != newPartyID || summaries[0].Name != "Newest Membership" || summaries[0].Role != RoleGM {
		t.Fatalf("unexpected first Party summary: %+v", summaries[0])
	}
	if !summaries[0].CreatedAt.Equal(newCreatedAt) || !summaries[0].UpdatedAt.Equal(newCreatedAt) {
		t.Fatalf("unexpected first Party timestamps")
	}
	if summaries[1].ID != oldPartyID || summaries[1].Name != "Older Party" || summaries[1].Role != RolePlayer {
		t.Fatalf("unexpected second Party summary: %+v", summaries[1])
	}
	if !summaries[1].CreatedAt.Equal(oldCreatedAt) || !summaries[1].UpdatedAt.Equal(oldCreatedAt) {
		t.Fatalf("unexpected second Party timestamps")
	}
	for _, summary := range summaries {
		if summary.ID == unrelatedPartyID {
			t.Fatal("list included an unrelated Party")
		}
	}

	empty, err := repository.ListPartiesForUser(context.Background(), uuid.MustParse(testOtherUserID))
	if err != nil {
		t.Fatalf("list parties for unrelated user: %v", err)
	}
	if len(empty) != 0 {
		t.Fatalf("expected unrelated user to see an empty list, got %d parties", len(empty))
	}
}

func TestPartyDetailModelsExposeOnlyBasicRosterFields(t *testing.T) {
	requireStructFields(t, PartyDetail{}, []string{"ID", "Name", "Role", "CreatedAt", "UpdatedAt", "Members"})
	requireStructFields(t, PartyMember{}, []string{"Username", "Role", "JoinedAt", "Character"})
	requireStructFields(t, PartyMemberCharacter{}, []string{"ID", "Name"})
}

func TestRepositoryGetPartyForMemberReturnsBasicRosterForGMAndPlayer(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	seedPartyMigrationUsers(t, pool)
	seedPartyMigrationCharacters(t, pool)

	partyID := uuid.MustParse("33000000-0000-0000-0000-000000000001")
	createdAt := time.Date(2026, 7, 13, 11, 0, 0, 0, time.UTC)
	updatedAt := createdAt.Add(30 * time.Minute)
	_, err := pool.Exec(context.Background(), `
INSERT INTO parties (id, name, created_by_user_id, created_at, updated_at)
VALUES ($1::uuid, 'Roster Party', $2::uuid, $3, $4)`, partyID.String(), testGMUserID, createdAt, updatedAt)
	if err != nil {
		t.Fatalf("insert roster Party: %v", err)
	}

	sharedJoinedAt := createdAt.Add(10 * time.Minute)
	gmJoinedAt := createdAt.Add(20 * time.Minute)
	insertRosterMembership(t, pool, "43000000-0000-0000-0000-000000000009", partyID.String(), testGMUserID, RoleGM, nil, gmJoinedAt)
	playerCharacterID := testCharacterID
	insertRosterMembership(t, pool, "43000000-0000-0000-0000-000000000002", partyID.String(), testPlayerUserID, RolePlayer, &playerCharacterID, sharedJoinedAt)
	otherCharacterID := testThirdCharacterID
	insertRosterMembership(t, pool, "43000000-0000-0000-0000-000000000003", partyID.String(), testOtherUserID, RolePlayer, &otherCharacterID, sharedJoinedAt)

	repository := NewRepository(pool)

	gmDetail, err := repository.GetPartyForMember(context.Background(), partyID, uuid.MustParse(testGMUserID))
	if err != nil {
		t.Fatalf("get Party for GM: %v", err)
	}
	assertPartyDetail(t, gmDetail, partyID, RoleGM, createdAt, updatedAt, sharedJoinedAt, gmJoinedAt)

	playerDetail, err := repository.GetPartyForMember(context.Background(), partyID, uuid.MustParse(testPlayerUserID))
	if err != nil {
		t.Fatalf("get Party for player: %v", err)
	}
	assertPartyDetail(t, playerDetail, partyID, RolePlayer, createdAt, updatedAt, sharedJoinedAt, gmJoinedAt)
}

func TestRepositoryGetPartyForMemberHidesUnknownAndNonMemberParties(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	seedPartyMigrationUsers(t, pool)

	partyID := "33000000-0000-0000-0000-000000000010"
	insertTestParty(t, pool, partyID, "Private Party", testGMUserID)
	insertTestMembership(t, pool, "43000000-0000-0000-0000-000000000010", partyID, testGMUserID, RoleGM, nil)

	repository := NewRepository(pool)
	tests := []struct {
		name      string
		partyID   uuid.UUID
		requester uuid.UUID
	}{
		{
			name:      "unknown Party",
			partyID:   uuid.MustParse("33000000-0000-0000-0000-000000000099"),
			requester: uuid.MustParse(testGMUserID),
		},
		{
			name:      "non-member",
			partyID:   uuid.MustParse(partyID),
			requester: uuid.MustParse(testOtherGMUserID),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := repository.GetPartyForMember(context.Background(), tt.partyID, tt.requester); !errors.Is(err, ErrPartyNotFound) {
				t.Fatalf("expected ErrPartyNotFound, got %v", err)
			}
		})
	}
}

func TestRepositoryGetPartyForMemberPreservesDatabaseErrors(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	repository := NewRepository(pool)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err := repository.GetPartyForMember(ctx, uuid.New(), uuid.New())
	if err == nil {
		t.Fatal("expected canceled query to fail")
	}
	if errors.Is(err, ErrPartyNotFound) {
		t.Fatal("database error must remain distinct from ErrPartyNotFound")
	}
}

func setupPartyRepositoryTest(t *testing.T) *pgxpool.Pool {
	t.Helper()
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is not set; set it to a disposable PostgreSQL test database to run Party repository tests")
	}
	_, pool := setupPartyMigrationTest(t, databaseURL)
	return pool
}

func sequentialPartyIDs(t *testing.T, ids ...uuid.UUID) func() uuid.UUID {
	t.Helper()
	index := 0
	return func() uuid.UUID {
		if index >= len(ids) {
			t.Fatal("Party repository requested an unexpected UUID")
		}
		id := ids[index]
		index++
		return id
	}
}

func sequentialPartyTimes(t *testing.T, times ...time.Time) func() time.Time {
	t.Helper()
	index := 0
	return func() time.Time {
		if index >= len(times) {
			t.Fatal("Party repository requested an unexpected time")
		}
		value := times[index]
		index++
		return value
	}
}

func requirePartyCount(t *testing.T, pool *pgxpool.Pool, want int) {
	t.Helper()
	var count int
	if err := pool.QueryRow(context.Background(), `SELECT count(*) FROM parties`).Scan(&count); err != nil {
		t.Fatalf("count parties: %v", err)
	}
	if count != want {
		t.Fatalf("expected %d parties, got %d", want, count)
	}
}

func insertRosterMembership(
	t *testing.T,
	pool *pgxpool.Pool,
	id string,
	partyID string,
	userID string,
	role string,
	characterID *string,
	joinedAt time.Time,
) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
INSERT INTO party_memberships (id, party_id, user_id, role, character_id, joined_at)
VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::uuid, $6)`, id, partyID, userID, role, characterID, joinedAt)
	if err != nil {
		t.Fatalf("insert roster membership: %v", err)
	}
}

func assertPartyDetail(
	t *testing.T,
	detail PartyDetail,
	partyID uuid.UUID,
	requesterRole string,
	createdAt time.Time,
	updatedAt time.Time,
	playerJoinedAt time.Time,
	gmJoinedAt time.Time,
) {
	t.Helper()
	if detail.ID != partyID || detail.Name != "Roster Party" || detail.Role != requesterRole {
		t.Fatalf("unexpected Party detail header: %+v", detail)
	}
	if !detail.CreatedAt.Equal(createdAt) || !detail.UpdatedAt.Equal(updatedAt) {
		t.Fatal("unexpected Party detail timestamps")
	}
	if len(detail.Members) != 3 {
		t.Fatalf("expected three roster members, got %d", len(detail.Members))
	}

	gm := detail.Members[0]
	if gm.Username != "gm-one" || gm.Role != RoleGM || !gm.JoinedAt.Equal(gmJoinedAt) {
		t.Fatalf("unexpected GM roster member: %+v", gm)
	}
	if gm.Character != nil {
		t.Fatal("expected GM character to be null")
	}

	firstPlayer := detail.Members[1]
	if firstPlayer.Username != "player-one" || firstPlayer.Role != RolePlayer || !firstPlayer.JoinedAt.Equal(playerJoinedAt) {
		t.Fatalf("unexpected first player roster member: %+v", firstPlayer)
	}
	if firstPlayer.Character == nil || firstPlayer.Character.ID != uuid.MustParse(testCharacterID) || firstPlayer.Character.Name != "Linked Hero" {
		t.Fatalf("unexpected first player character summary: %+v", firstPlayer.Character)
	}

	secondPlayer := detail.Members[2]
	if secondPlayer.Username != "player-two" || secondPlayer.Role != RolePlayer || !secondPlayer.JoinedAt.Equal(playerJoinedAt) {
		t.Fatalf("unexpected second player roster member: %+v", secondPlayer)
	}
	if secondPlayer.Character == nil || secondPlayer.Character.ID != uuid.MustParse(testThirdCharacterID) || secondPlayer.Character.Name != "Third Hero" {
		t.Fatalf("unexpected second player character summary: %+v", secondPlayer.Character)
	}
}

func requireStructFields(t *testing.T, value any, want []string) {
	t.Helper()
	typeOfValue := reflect.TypeOf(value)
	if typeOfValue.NumField() != len(want) {
		t.Fatalf("expected %d fields on %s, got %d", len(want), typeOfValue.Name(), typeOfValue.NumField())
	}
	for index, fieldName := range want {
		if typeOfValue.Field(index).Name != fieldName {
			t.Fatalf("expected field %d on %s to be %s, got %s", index, typeOfValue.Name(), fieldName, typeOfValue.Field(index).Name)
		}
	}
}
