package parties

import (
	"context"
	"errors"
	"os"
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
