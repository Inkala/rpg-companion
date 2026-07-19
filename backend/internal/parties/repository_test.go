package parties

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"os"
	"reflect"
	"strings"
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

func TestRepositoryListPartiesForUserReturnsApprovedSummariesWithoutUnrelatedRosterData(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	seedPartyMigrationUsers(t, pool)
	seedPartyMigrationCharacters(t, pool)

	const (
		thirdPlayerUserID      = "10000000-0000-0000-0000-000000000005"
		otherGMCharacterID     = "20000000-0000-0000-0000-000000000004"
		thirdPlayerCharacterID = "20000000-0000-0000-0000-000000000005"
	)
	insertRepositoryTestUser(t, pool, thirdPlayerUserID, "player-three")
	insertRepositoryTestCharacter(t, pool, otherGMCharacterID, testOtherGMUserID, "First Scout")
	insertRepositoryTestCharacter(t, pool, thirdPlayerCharacterID, thirdPlayerUserID, "Second Scout")

	rosterPartyID := "32000000-0000-0000-0000-000000000201"
	newerLowPartyID := "32000000-0000-0000-0000-000000000204"
	newerHighPartyID := "32000000-0000-0000-0000-000000000205"
	unrelatedPartyID := "32000000-0000-0000-0000-000000000299"
	rosterCreatedAt := time.Date(2026, 7, 13, 8, 0, 0, 0, time.UTC)
	newerCreatedAt := rosterCreatedAt.Add(time.Hour)
	unrelatedCreatedAt := newerCreatedAt.Add(time.Hour)

	insertRepositoryTestPartyAt(t, pool, rosterPartyID, "Ash & Ivy Pact", testGMUserID, rosterCreatedAt)
	insertRepositoryTestPartyAt(t, pool, newerLowPartyID, "Newer Low ID", testPlayerUserID, newerCreatedAt)
	insertRepositoryTestPartyAt(t, pool, newerHighPartyID, "Newer High ID", testPlayerUserID, newerCreatedAt)
	insertRepositoryTestPartyAt(t, pool, unrelatedPartyID, "Invisible Party", testOtherGMUserID, unrelatedCreatedAt)

	insertRosterMembership(t, pool, "42000000-0000-0000-0000-000000000201", rosterPartyID, testGMUserID, RoleGM, nil, rosterCreatedAt)
	insertRosterMembership(t, pool, "42000000-0000-0000-0000-000000000204", newerLowPartyID, testPlayerUserID, RoleGM, nil, newerCreatedAt)
	insertRosterMembership(t, pool, "42000000-0000-0000-0000-000000000205", newerHighPartyID, testPlayerUserID, RoleGM, nil, newerCreatedAt)
	insertRosterMembership(t, pool, "42000000-0000-0000-0000-000000000299", unrelatedPartyID, testOtherGMUserID, RoleGM, nil, unrelatedCreatedAt)

	firstScoutID := otherGMCharacterID
	secondScoutID := thirdPlayerCharacterID
	requesterCharacterID := testCharacterID
	unrelatedCharacterID := testThirdCharacterID
	firstJoinedAt := rosterCreatedAt.Add(10 * time.Minute)
	sharedJoinedAt := rosterCreatedAt.Add(20 * time.Minute)
	insertRosterMembership(t, pool, "42000000-0000-0000-0000-000000000212", rosterPartyID, testOtherGMUserID, RolePlayer, &firstScoutID, firstJoinedAt)
	insertRosterMembership(t, pool, "42000000-0000-0000-0000-000000000210", rosterPartyID, testPlayerUserID, RolePlayer, &requesterCharacterID, sharedJoinedAt)
	insertRosterMembership(t, pool, "42000000-0000-0000-0000-000000000209", rosterPartyID, thirdPlayerUserID, RolePlayer, &secondScoutID, sharedJoinedAt)
	insertRosterMembership(t, pool, "42000000-0000-0000-0000-000000000298", unrelatedPartyID, testOtherUserID, RolePlayer, &unrelatedCharacterID, unrelatedCreatedAt.Add(time.Minute))

	summaries, err := newTestPartyRepository(pool).ListPartiesForUser(context.Background(), uuid.MustParse(testPlayerUserID))
	if err != nil {
		t.Fatalf("list approved Party summaries: %v", err)
	}
	if len(summaries) != 3 {
		t.Fatalf("expected three membership-scoped Parties, got %d", len(summaries))
	}

	if summaries[0].ID.String() != newerHighPartyID || summaries[1].ID.String() != newerLowPartyID || summaries[2].ID.String() != rosterPartyID {
		t.Fatalf("Parties were not ordered by created_at DESC, id DESC: %+v", summaries)
	}
	for index, expectedName := range []string{"Newer High ID", "Newer Low ID"} {
		summary := summaries[index]
		if summary.Name != expectedName || summary.Role != RoleGM || summary.GM.Username != "player-one" {
			t.Fatalf("unexpected characterless Party summary: %+v", summary)
		}
		if summary.LinkedCharacters == nil || len(summary.LinkedCharacters) != 0 {
			t.Fatal("Party without linked Player characters must return an initialized empty slice")
		}
	}

	rosterSummary := summaries[2]
	if rosterSummary.Name != "Ash & Ivy Pact" || rosterSummary.Role != RolePlayer || rosterSummary.GM.Username != "gm-one" {
		t.Fatalf("unexpected roster Party summary: %+v", rosterSummary)
	}
	wantLinkedCharacters := []PartySummaryLinkedCharacter{
		{CharacterName: "First Scout", Username: "gm-two"},
		{CharacterName: "Second Scout", Username: "player-three"},
		{CharacterName: "Linked Hero", Username: "player-one"},
	}
	if !reflect.DeepEqual(rosterSummary.LinkedCharacters, wantLinkedCharacters) {
		t.Fatalf("linked characters were not ordered by joined_at ASC, membership id ASC: got %+v", rosterSummary.LinkedCharacters)
	}

	for _, summary := range summaries {
		if summary.ID.String() == unrelatedPartyID || summary.Name == "Invisible Party" {
			t.Fatal("list included an unrelated Party")
		}
		for _, linkedCharacter := range summary.LinkedCharacters {
			if linkedCharacter.CharacterName == "Third Hero" || linkedCharacter.Username == "player-two" {
				t.Fatal("list exposed unrelated roster information")
			}
		}
	}
}

func TestRepositoryListPartiesForUserPreservesDatabaseErrors(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	repository := newTestPartyRepository(pool)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err := repository.ListPartiesForUser(ctx, uuid.New())
	if err == nil {
		t.Fatal("expected canceled list query to fail")
	}
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected wrapped database error to preserve context cancellation, got %v", err)
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

	repository := newTestPartyRepository(pool)

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

	repository := newTestPartyRepository(pool)
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
	repository := newTestPartyRepository(pool)

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

func TestPartyInviteModelCarriesOneCredentialPairInternally(t *testing.T) {
	requireStructFields(t, PartyInvite{}, []string{"Token", "Code", "CreatedAt", "ExpiresAt"})
}

func TestRepositoryCreateOrRegenerateInviteCreatesSevenDayInviteForGM(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	partyID := seedInviteRepositoryParty(t, pool)
	createdAt := time.Date(2026, 7, 13, 14, 0, 0, 0, time.UTC)
	rawToken := validInviteToken(0x31)
	rawCode := "ABCD2345"
	repository := newTestPartyRepository(pool)
	repository.now = func() time.Time { return createdAt }
	repository.newInviteToken = func() (string, error) { return rawToken, nil }
	repository.newInviteCode = func() (string, error) { return rawCode, nil }

	invite, err := repository.CreateOrRegenerateInvite(context.Background(), partyID, uuid.MustParse(testGMUserID))
	if err != nil {
		t.Fatalf("create Party invite: %v", err)
	}
	if invite.Token != rawToken {
		t.Fatal("repository did not return the generated raw token")
	}
	if invite.Code != "ABCD-2345" {
		t.Fatalf("repository did not return the formatted generated code: %q", invite.Code)
	}
	if !invite.CreatedAt.Equal(createdAt) {
		t.Fatal("invite creation time does not match the injected clock")
	}
	if !invite.ExpiresAt.Equal(createdAt.Add(7 * 24 * time.Hour)) {
		t.Fatal("invite expiration is not exactly seven days after creation")
	}

	var storedHash []byte
	var storedCodeHash []byte
	var storedCreatedAt time.Time
	var storedExpiresAt time.Time
	var revokedAt *time.Time
	if err := pool.QueryRow(context.Background(), `
SELECT token_hash, code_hash, created_at, expires_at, revoked_at
FROM party_invites
WHERE party_id = $1::uuid`, partyID.String()).Scan(&storedHash, &storedCodeHash, &storedCreatedAt, &storedExpiresAt, &revokedAt); err != nil {
		t.Fatalf("load stored Party invite: %v", err)
	}
	expectedHash := sha256.Sum256([]byte(rawToken))
	if !bytes.Equal(storedHash, expectedHash[:]) {
		t.Fatal("stored invite hash does not match SHA-256 of the generated token")
	}
	if bytes.Equal(storedHash, []byte(rawToken)) {
		t.Fatal("database stored the raw invite token")
	}
	expectedCodeHash, err := InviteCodeHash(testInviteCodeHashKey(), rawCode)
	if err != nil {
		t.Fatalf("hash expected invite code: %v", err)
	}
	if !bytes.Equal(storedCodeHash, expectedCodeHash) {
		t.Fatal("stored invite code hash does not match the approved HMAC")
	}
	if bytes.Equal(storedCodeHash, []byte(rawCode)) || bytes.Equal(storedCodeHash, []byte(invite.Code)) {
		t.Fatal("database stored a raw invite code representation")
	}
	if !storedCreatedAt.Equal(createdAt) || !storedExpiresAt.Equal(createdAt.Add(7*24*time.Hour)) {
		t.Fatal("stored invite timestamps do not match the repository result")
	}
	if revokedAt != nil {
		t.Fatal("new invite must not be revoked")
	}
}

func TestRepositoryCreateOrRegenerateInviteEnforcesGMPrivacyAndRole(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	partyID := seedInviteRepositoryParty(t, pool)
	repository := newTestPartyRepository(pool)
	tokenGenerationCalls := 0
	codeGenerationCalls := 0
	repository.newInviteToken = func() (string, error) {
		tokenGenerationCalls++
		return validInviteToken(0x32), nil
	}
	repository.newInviteCode = func() (string, error) {
		codeGenerationCalls++
		return "ABCD2345", nil
	}

	if _, err := repository.CreateOrRegenerateInvite(context.Background(), partyID, uuid.MustParse(testPlayerUserID)); !errors.Is(err, ErrPartyForbidden) {
		t.Fatalf("expected player access to return ErrPartyForbidden, got %v", err)
	}
	if _, err := repository.CreateOrRegenerateInvite(context.Background(), partyID, uuid.MustParse(testOtherGMUserID)); !errors.Is(err, ErrPartyNotFound) {
		t.Fatalf("expected non-member access to return ErrPartyNotFound, got %v", err)
	}
	if _, err := repository.CreateOrRegenerateInvite(
		context.Background(),
		uuid.MustParse("34000000-0000-0000-0000-000000000099"),
		uuid.MustParse(testGMUserID),
	); !errors.Is(err, ErrPartyNotFound) {
		t.Fatalf("expected unknown Party to return ErrPartyNotFound, got %v", err)
	}
	if tokenGenerationCalls != 0 {
		t.Fatalf("expected unauthorized requests not to generate tokens, got %d calls", tokenGenerationCalls)
	}
	if codeGenerationCalls != 0 {
		t.Fatalf("expected unauthorized requests not to generate codes, got %d calls", codeGenerationCalls)
	}
	requireInviteCounts(t, pool, partyID, 0, 0)
}

func TestRepositoryCreateOrRegenerateInviteRevokesPreviousInvite(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	partyID := seedInviteRepositoryParty(t, pool)
	firstCreatedAt := time.Date(2026, 7, 13, 15, 0, 0, 0, time.UTC)
	secondCreatedAt := firstCreatedAt.Add(time.Hour)
	firstToken := validInviteToken(0x41)
	secondToken := validInviteToken(0x42)
	repository := newTestPartyRepository(pool)
	repository.now = sequentialPartyTimes(t, firstCreatedAt, secondCreatedAt)
	repository.newInviteToken = sequentialInviteTokens(t, firstToken, secondToken)
	repository.newInviteCode = sequentialInviteCodes(t, "ABCD2345", "WXYZ6789")

	if _, err := repository.CreateOrRegenerateInvite(context.Background(), partyID, uuid.MustParse(testGMUserID)); err != nil {
		t.Fatalf("create first Party invite: %v", err)
	}
	if _, err := repository.CreateOrRegenerateInvite(context.Background(), partyID, uuid.MustParse(testGMUserID)); err != nil {
		t.Fatalf("regenerate Party invite: %v", err)
	}

	firstHash := sha256.Sum256([]byte(firstToken))
	var firstRevokedAt *time.Time
	if err := pool.QueryRow(context.Background(), `
SELECT revoked_at FROM party_invites WHERE token_hash = $1`, firstHash[:]).Scan(&firstRevokedAt); err != nil {
		t.Fatalf("load previous invite revocation: %v", err)
	}
	if firstRevokedAt == nil || !firstRevokedAt.Equal(secondCreatedAt) {
		t.Fatal("previous invite was not revoked at replacement creation time")
	}
	requireInviteCounts(t, pool, partyID, 2, 1)
}

func TestRepositoryCreateOrRegenerateInviteRollsBackFailedReplacement(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	partyID := seedInviteRepositoryParty(t, pool)
	createdAt := time.Date(2026, 7, 13, 16, 0, 0, 0, time.UTC)
	activeToken := validInviteToken(0x51)
	duplicateToken := validInviteToken(0x52)
	repository := newTestPartyRepository(pool)
	repository.now = func() time.Time { return createdAt }
	repository.newInviteToken = func() (string, error) { return activeToken, nil }
	repository.newInviteCode = func() (string, error) { return "ABCD2345", nil }
	if _, err := repository.CreateOrRegenerateInvite(context.Background(), partyID, uuid.MustParse(testGMUserID)); err != nil {
		t.Fatalf("create active Party invite: %v", err)
	}

	otherPartyID := uuid.MustParse("34000000-0000-0000-0000-000000000002")
	insertTestParty(t, pool, otherPartyID.String(), "Other Invite Party", testOtherGMUserID)
	insertTestMembership(t, pool, "44000000-0000-0000-0000-000000000002", otherPartyID.String(), testOtherGMUserID, RoleGM, nil)
	insertInviteForRepositoryTest(t, pool, otherPartyID, testOtherGMUserID, duplicateToken, createdAt)

	repository.now = func() time.Time { return createdAt.Add(time.Hour) }
	repository.newInviteToken = func() (string, error) { return duplicateToken, nil }
	repository.newInviteCode = func() (string, error) { return "WXYZ6789", nil }
	_, err := repository.CreateOrRegenerateInvite(context.Background(), partyID, uuid.MustParse(testGMUserID))
	if err == nil {
		t.Fatal("expected duplicate invite hash to fail replacement")
	}
	if strings.Contains(err.Error(), duplicateToken) {
		t.Fatal("replacement error exposed the raw invite token")
	}

	activeHash := sha256.Sum256([]byte(activeToken))
	var revokedAt *time.Time
	if err := pool.QueryRow(context.Background(), `
SELECT revoked_at FROM party_invites WHERE token_hash = $1`, activeHash[:]).Scan(&revokedAt); err != nil {
		t.Fatalf("load invite after failed replacement: %v", err)
	}
	if revokedAt != nil {
		t.Fatal("failed replacement did not roll back previous invite revocation")
	}
	requireInviteCounts(t, pool, partyID, 1, 1)
}

func TestRepositoryCreateOrRegenerateInviteRetriesCompletePairAfterCodeHashCollision(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	partyID := seedInviteRepositoryParty(t, pool)
	createdAt := time.Date(2026, 7, 13, 16, 30, 0, 0, time.UTC)
	collidingCode := "WXYZ6789"
	seedHistoricalInviteCodeCollision(t, pool, collidingCode, createdAt.Add(-time.Hour))

	firstToken := validInviteToken(0x53)
	secondToken := validInviteToken(0x54)
	repository := newTestPartyRepository(pool)
	repository.now = func() time.Time { return createdAt }
	repository.newInviteToken = sequentialInviteTokens(t, firstToken, secondToken)
	repository.newInviteCode = sequentialInviteCodes(t, collidingCode, "ABCD2345")

	invite, err := repository.CreateOrRegenerateInvite(context.Background(), partyID, uuid.MustParse(testGMUserID))
	if err != nil {
		t.Fatalf("create invite after code-hash collision: %v", err)
	}
	if invite.Token != secondToken || invite.Code != "ABCD-2345" {
		t.Fatalf("collision retry did not return the second complete credential pair: %+v", invite)
	}

	secondTokenHash := sha256.Sum256([]byte(secondToken))
	secondCodeHash, err := InviteCodeHash(testInviteCodeHashKey(), "ABCD2345")
	if err != nil {
		t.Fatalf("hash replacement code: %v", err)
	}
	var storedTokenHash []byte
	var storedCodeHash []byte
	if err := pool.QueryRow(context.Background(), `
SELECT token_hash, code_hash
FROM party_invites
WHERE party_id = $1::uuid
  AND revoked_at IS NULL`, partyID.String()).Scan(&storedTokenHash, &storedCodeHash); err != nil {
		t.Fatalf("load collision-retried invite: %v", err)
	}
	if !bytes.Equal(storedTokenHash, secondTokenHash[:]) || !bytes.Equal(storedCodeHash, secondCodeHash) {
		t.Fatal("database did not persist the second complete credential pair")
	}
}

func TestRepositoryCreateOrRegenerateInviteExhaustedCodeCollisionsRestorePreviousInvite(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	partyID := seedInviteRepositoryParty(t, pool)
	createdAt := time.Date(2026, 7, 13, 16, 45, 0, 0, time.UTC)
	activeToken := validInviteToken(0x55)
	repository := newTestPartyRepository(pool)
	repository.now = func() time.Time { return createdAt }
	repository.newInviteToken = func() (string, error) { return activeToken, nil }
	repository.newInviteCode = func() (string, error) { return "ABCD2345", nil }
	if _, err := repository.CreateOrRegenerateInvite(context.Background(), partyID, uuid.MustParse(testGMUserID)); err != nil {
		t.Fatalf("create active invite before collision exhaustion: %v", err)
	}

	collidingCode := "WXYZ6789"
	seedHistoricalInviteCodeCollision(t, pool, collidingCode, createdAt.Add(-time.Hour))
	repository.now = func() time.Time { return createdAt.Add(time.Hour) }
	tokenGenerationCalls := 0
	repository.newInviteToken = func() (string, error) {
		tokenGenerationCalls++
		return validInviteToken(byte(0x60 + tokenGenerationCalls)), nil
	}
	codeGenerationCalls := 0
	repository.newInviteCode = func() (string, error) {
		codeGenerationCalls++
		return collidingCode, nil
	}

	_, err := repository.CreateOrRegenerateInvite(context.Background(), partyID, uuid.MustParse(testGMUserID))
	if err == nil {
		t.Fatal("expected exhausted code-hash collision retries to fail")
	}
	if strings.Contains(err.Error(), collidingCode) {
		t.Fatal("collision exhaustion error exposed the raw invite code")
	}
	if tokenGenerationCalls != maxInviteCredentialAttempts || codeGenerationCalls != maxInviteCredentialAttempts {
		t.Fatalf("expected %d complete pair attempts, got %d tokens and %d codes",
			maxInviteCredentialAttempts, tokenGenerationCalls, codeGenerationCalls)
	}
	if _, inspectErr := repository.InspectInvite(context.Background(), activeToken); inspectErr != nil {
		t.Fatalf("previous strong invitation became unusable after collision exhaustion: %v", inspectErr)
	}
	requireInviteCounts(t, pool, partyID, 1, 1)
}

func TestRepositoryCreateOrRegenerateInviteSerializesConcurrentRegeneration(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	partyID := seedInviteRepositoryParty(t, pool)
	createdAt := time.Date(2026, 7, 13, 17, 0, 0, 0, time.UTC)
	firstToken := validInviteToken(0x61)
	secondToken := validInviteToken(0x62)
	firstRepository := newTestPartyRepository(pool)
	firstRepository.now = func() time.Time { return createdAt }
	firstRepository.newInviteToken = func() (string, error) { return firstToken, nil }
	firstRepository.newInviteCode = func() (string, error) { return "ABCD2345", nil }
	secondRepository := newTestPartyRepository(pool)
	secondRepository.now = func() time.Time { return createdAt }
	secondRepository.newInviteToken = func() (string, error) { return secondToken, nil }
	secondRepository.newInviteCode = func() (string, error) { return "WXYZ6789", nil }

	type inviteResult struct {
		invite PartyInvite
		err    error
	}
	start := make(chan struct{})
	results := make(chan inviteResult, 2)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	regenerate := func(repository *Repository) {
		<-start
		invite, err := repository.CreateOrRegenerateInvite(ctx, partyID, uuid.MustParse(testGMUserID))
		results <- inviteResult{invite: invite, err: err}
	}
	go regenerate(firstRepository)
	go regenerate(secondRepository)
	close(start)

	firstResult := <-results
	secondResult := <-results
	if firstResult.err != nil || secondResult.err != nil {
		t.Fatal("expected both serialized regenerations to succeed")
	}
	if firstResult.invite.Token == secondResult.invite.Token {
		t.Fatal("concurrent regeneration returned duplicate raw tokens")
	}
	if firstResult.invite.Code == secondResult.invite.Code {
		t.Fatal("concurrent regeneration returned duplicate raw codes")
	}
	requireInviteCounts(t, pool, partyID, 2, 1)

	var activeHash []byte
	if err := pool.QueryRow(context.Background(), `
SELECT token_hash FROM party_invites WHERE party_id = $1::uuid AND revoked_at IS NULL`, partyID.String()).Scan(&activeHash); err != nil {
		t.Fatalf("load active invite after concurrent regeneration: %v", err)
	}
	firstHash := sha256.Sum256([]byte(firstResult.invite.Token))
	secondHash := sha256.Sum256([]byte(secondResult.invite.Token))
	if !bytes.Equal(activeHash, firstHash[:]) && !bytes.Equal(activeHash, secondHash[:]) {
		t.Fatal("active invite does not match either serialized regeneration result")
	}
}

func TestInviteInspectionModelExposesOnlyPublicPartyFields(t *testing.T) {
	requireStructFields(t, InviteInspection{}, []string{"PartyID", "PartyName", "ExpiresAt"})
}

func TestRepositoryInspectInviteReturnsCurrentInviteWithoutSensitiveState(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	partyID := seedInviteRepositoryParty(t, pool)
	now := time.Date(2026, 7, 14, 9, 0, 0, 0, time.UTC)
	createdAt := now.Add(-24 * time.Hour)
	rawToken := validInviteToken(0x71)
	insertInviteForRepositoryTest(t, pool, partyID, testGMUserID, rawToken, createdAt)
	repository := newTestPartyRepository(pool)
	repository.now = func() time.Time { return now }

	inspection, err := repository.InspectInvite(context.Background(), rawToken)
	if err != nil {
		t.Fatalf("inspect current invite: %v", err)
	}
	if inspection.PartyID != partyID || inspection.PartyName != "Invite Party" {
		t.Fatal("invite inspection returned unexpected Party identity")
	}
	if !inspection.ExpiresAt.Equal(createdAt.Add(7 * 24 * time.Hour)) {
		t.Fatal("invite inspection returned unexpected expiration")
	}
}

func TestRepositoryInspectInviteMakesUnavailableStatesIndistinguishable(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	partyID := seedInviteRepositoryParty(t, pool)
	now := time.Date(2026, 7, 14, 10, 0, 0, 0, time.UTC)
	repository := newTestPartyRepository(pool)
	repository.now = func() time.Time { return now }

	tests := []struct {
		name    string
		token   string
		prepare func(t *testing.T)
	}{
		{
			name:  "malformed token",
			token: "private-malformed-invite-token",
		},
		{
			name:  "unknown token",
			token: validInviteToken(0x72),
		},
		{
			name:  "expired token",
			token: validInviteToken(0x73),
			prepare: func(t *testing.T) {
				insertInviteForRepositoryTest(t, pool, partyID, testGMUserID, validInviteToken(0x73), now.Add(-8*24*time.Hour))
			},
		},
		{
			name:  "token expiring exactly now",
			token: validInviteToken(0x74),
			prepare: func(t *testing.T) {
				insertInviteForRepositoryTest(t, pool, partyID, testGMUserID, validInviteToken(0x74), now.Add(-7*24*time.Hour))
			},
		},
		{
			name:  "revoked token",
			token: validInviteToken(0x75),
			prepare: func(t *testing.T) {
				token := validInviteToken(0x75)
				createdAt := now.Add(-time.Hour)
				insertInviteForRepositoryTest(t, pool, partyID, testGMUserID, token, createdAt)
				tokenHash := sha256.Sum256([]byte(token))
				if _, err := pool.Exec(context.Background(), `
UPDATE party_invites SET revoked_at = $1 WHERE token_hash = $2`, now.Add(-30*time.Minute), tokenHash[:]); err != nil {
					t.Fatalf("revoke invite fixture: %v", err)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := pool.Exec(context.Background(), `DELETE FROM party_invites`); err != nil {
				t.Fatalf("reset invite fixtures: %v", err)
			}
			if tt.prepare != nil {
				tt.prepare(t)
			}

			_, err := repository.InspectInvite(context.Background(), tt.token)
			if !errors.Is(err, ErrInviteUnavailable) {
				t.Fatalf("expected ErrInviteUnavailable, got %v", err)
			}
			if strings.Contains(err.Error(), tt.token) {
				t.Fatal("invite inspection error exposed the raw token")
			}
		})
	}
}

func TestRepositoryInspectInviteHidesTokenReplacedThroughRegeneration(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	partyID := seedInviteRepositoryParty(t, pool)
	currentTime := time.Date(2026, 7, 14, 11, 0, 0, 0, time.UTC)
	previousToken := validInviteToken(0x76)
	replacementToken := validInviteToken(0x77)
	repository := newTestPartyRepository(pool)
	repository.now = func() time.Time { return currentTime }
	repository.newInviteToken = sequentialInviteTokens(t, previousToken, replacementToken)
	repository.newInviteCode = sequentialInviteCodes(t, "ABCD2345", "WXYZ6789")

	if _, err := repository.CreateOrRegenerateInvite(context.Background(), partyID, uuid.MustParse(testGMUserID)); err != nil {
		t.Fatalf("create previous invite: %v", err)
	}
	currentTime = currentTime.Add(time.Hour)
	if _, err := repository.CreateOrRegenerateInvite(context.Background(), partyID, uuid.MustParse(testGMUserID)); err != nil {
		t.Fatalf("create replacement invite: %v", err)
	}

	_, err := repository.InspectInvite(context.Background(), previousToken)
	if !errors.Is(err, ErrInviteUnavailable) {
		t.Fatalf("expected replaced token to return ErrInviteUnavailable, got %v", err)
	}
	if strings.Contains(err.Error(), previousToken) {
		t.Fatal("replaced-token error exposed the raw token")
	}

	inspection, err := repository.InspectInvite(context.Background(), replacementToken)
	if err != nil {
		t.Fatalf("inspect replacement invite: %v", err)
	}
	if inspection.PartyID != partyID || inspection.PartyName != "Invite Party" {
		t.Fatal("replacement inspection returned unexpected Party identity")
	}
}

func TestRepositoryInspectInvitePreservesDatabaseErrors(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	repository := newTestPartyRepository(pool)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := repository.InspectInvite(ctx, validInviteToken(0x78))
	if err == nil {
		t.Fatal("expected canceled inspection query to fail")
	}
	if errors.Is(err, ErrInviteUnavailable) {
		t.Fatal("database error must remain distinct from ErrInviteUnavailable")
	}
}

func TestRepositoryInspectInviteByCodeNormalizesAndReturnsCurrentInvite(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	partyID := seedInviteRepositoryParty(t, pool)
	now := time.Date(2026, 7, 18, 9, 0, 0, 0, time.UTC)
	repository := newTestPartyRepository(pool)
	repository.now = func() time.Time { return now }
	repository.newInviteToken = func() (string, error) { return validInviteToken(0x79), nil }
	repository.newInviteCode = func() (string, error) { return "ABCD2345", nil }
	if _, err := repository.CreateOrRegenerateInvite(context.Background(), partyID, uuid.MustParse(testGMUserID)); err != nil {
		t.Fatalf("create code invitation: %v", err)
	}

	inspection, err := repository.InspectInviteByCode(context.Background(), " \t abcd - 2345 \r\n")
	if err != nil {
		t.Fatalf("inspect current invite by normalized code: %v", err)
	}
	if inspection.PartyID != partyID || inspection.PartyName != "Invite Party" || !inspection.ExpiresAt.Equal(now.Add(7*24*time.Hour)) {
		t.Fatal("code inspection returned unexpected public Party data")
	}
}

func TestRepositoryInspectInviteByCodeMakesUnavailableStatesIndistinguishable(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	partyID := seedInviteRepositoryParty(t, pool)
	now := time.Date(2026, 7, 18, 10, 0, 0, 0, time.UTC)
	repository := newTestPartyRepository(pool)
	repository.now = func() time.Time { return now }

	tests := []struct {
		name    string
		code    string
		prepare func(t *testing.T)
	}{
		{name: "missing code", code: ""},
		{name: "malformed code", code: "private-malformed-code-marker"},
		{name: "unknown code", code: "WXYZ6789"},
		{
			name: "expired code", code: "ABCD2345",
			prepare: func(t *testing.T) {
				insertCodeInviteForRepositoryTest(t, pool, partyID, "ABCD2345", now.Add(-8*24*time.Hour), nil)
			},
		},
		{
			name: "code expiring exactly now", code: "2345ABCD",
			prepare: func(t *testing.T) {
				insertCodeInviteForRepositoryTest(t, pool, partyID, "2345ABCD", now.Add(-7*24*time.Hour), nil)
			},
		},
		{
			name: "revoked code", code: "EFGH2345",
			prepare: func(t *testing.T) {
				revokedAt := now.Add(-time.Minute)
				insertCodeInviteForRepositoryTest(t, pool, partyID, "EFGH2345", now.Add(-time.Hour), &revokedAt)
			},
		},
		{
			name: "replaced code", code: "JKLM2345",
			prepare: func(t *testing.T) {
				replacedAt := now.Add(-30 * time.Minute)
				insertCodeInviteForRepositoryTest(t, pool, partyID, "JKLM2345", now.Add(-time.Hour), &replacedAt)
				insertCodeInviteForRepositoryTest(t, pool, partyID, "NPQR2345", replacedAt, nil)
			},
		},
	}

	var firstInspectError string
	var firstJoinError string
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := pool.Exec(context.Background(), `DELETE FROM party_invites`); err != nil {
				t.Fatalf("reset code invite fixtures: %v", err)
			}
			if tt.prepare != nil {
				tt.prepare(t)
			}
			_, err := repository.InspectInviteByCode(context.Background(), tt.code)
			if !errors.Is(err, ErrInviteUnavailable) {
				t.Fatalf("expected ErrInviteUnavailable, got %v", err)
			}
			if tt.code != "" && strings.Contains(err.Error(), tt.code) {
				t.Fatal("code inspection error exposed the submitted code")
			}
			if firstInspectError == "" {
				firstInspectError = err.Error()
			} else if err.Error() != firstInspectError {
				t.Fatal("unavailable code states returned distinguishable repository errors")
			}

			_, joinErr := repository.JoinPartyByCode(
				context.Background(),
				tt.code,
				uuid.MustParse(testOtherUserID),
				uuid.MustParse(testThirdCharacterID),
			)
			if !errors.Is(joinErr, ErrInviteUnavailable) {
				t.Fatalf("expected code join ErrInviteUnavailable, got %v", joinErr)
			}
			if tt.code != "" && strings.Contains(joinErr.Error(), tt.code) {
				t.Fatal("code join error exposed the submitted code")
			}
			if firstJoinError == "" {
				firstJoinError = joinErr.Error()
			} else if joinErr.Error() != firstJoinError {
				t.Fatal("unavailable code states returned distinguishable join errors")
			}
		})
	}
}

func TestRepositoryCodeOperationsWrapDatabaseErrorsWithoutCredentialExposure(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	repository := newTestPartyRepository(pool)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	rawCode := "ABCD-2345"

	_, inspectErr := repository.InspectInviteByCode(ctx, rawCode)
	if inspectErr == nil || !errors.Is(inspectErr, context.Canceled) || strings.Contains(inspectErr.Error(), rawCode) {
		t.Fatal("code inspection did not preserve a wrapped private database error safely")
	}
	_, joinErr := repository.JoinPartyByCode(ctx, rawCode, uuid.MustParse(testOtherUserID), uuid.MustParse(testThirdCharacterID))
	if joinErr == nil || !errors.Is(joinErr, context.Canceled) || strings.Contains(joinErr.Error(), rawCode) {
		t.Fatal("code join did not preserve a wrapped private database error safely")
	}
}

func TestPartyMembershipModelExposesJoinResultFields(t *testing.T) {
	requireStructFields(t, PartyMembership{}, []string{"ID", "PartyID", "Role", "CharacterID", "JoinedAt"})
	requireStructFields(t, JoinPartyResult{}, []string{"Membership", "Created"})
}

func TestRepositoryJoinPartyCreatesPlayerMembershipAtomically(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	now := time.Date(2026, 7, 14, 13, 0, 0, 0, time.UTC)
	rawToken := validInviteToken(0x81)
	partyID := seedJoinRepositoryParty(t, pool, rawToken, now.Add(-time.Hour))
	membershipID := uuid.MustParse("45000000-0000-0000-0000-000000000001")
	repository := newRepository(
		pool,
		sequentialPartyIDs(t, membershipID),
		func() time.Time { return now },
	)

	result, err := repository.JoinParty(
		context.Background(),
		rawToken,
		uuid.MustParse(testOtherUserID),
		uuid.MustParse(testThirdCharacterID),
	)
	if err != nil {
		t.Fatalf("join Party: %v", err)
	}
	if !result.Created {
		t.Fatal("new Party membership was not marked as created")
	}
	assertJoinedMembership(t, result.Membership, membershipID, partyID, uuid.MustParse(testThirdCharacterID), now)

	var storedRole string
	var storedCharacterID string
	var storedJoinedAt time.Time
	if err := pool.QueryRow(context.Background(), `
SELECT role, character_id::text, joined_at
FROM party_memberships
WHERE id = $1::uuid`, membershipID.String()).Scan(&storedRole, &storedCharacterID, &storedJoinedAt); err != nil {
		t.Fatalf("load joined membership: %v", err)
	}
	if storedRole != RolePlayer || storedCharacterID != testThirdCharacterID || !storedJoinedAt.Equal(now) {
		t.Fatal("stored membership does not match the join result")
	}
}

func TestRepositoryJoinPartyByCodePreservesCreationReplayAndAuthorization(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	partyID := seedInviteRepositoryParty(t, pool)
	now := time.Date(2026, 7, 18, 13, 0, 0, 0, time.UTC)
	repository := newTestPartyRepository(pool)
	repository.now = func() time.Time { return now }
	repository.newInviteToken = func() (string, error) { return validInviteToken(0x80), nil }
	repository.newInviteCode = func() (string, error) { return "ABCD2345", nil }
	if _, err := repository.CreateOrRegenerateInvite(context.Background(), partyID, uuid.MustParse(testGMUserID)); err != nil {
		t.Fatalf("create code join invitation: %v", err)
	}

	first, err := repository.JoinPartyByCode(context.Background(), "abcd-2345", uuid.MustParse(testOtherUserID), uuid.MustParse(testThirdCharacterID))
	if err != nil {
		t.Fatalf("join Party by code: %v", err)
	}
	second, err := repository.JoinPartyByCode(context.Background(), "ABCD2345", uuid.MustParse(testOtherUserID), uuid.MustParse(testThirdCharacterID))
	if err != nil {
		t.Fatalf("replay Party join by code: %v", err)
	}
	if !first.Created || second.Created || first.Membership != second.Membership {
		t.Fatal("code join did not preserve creation and idempotent replay semantics")
	}
	requireUserMembershipCount(t, pool, partyID, uuid.MustParse(testOtherUserID), 1)
}

func TestRepositoryJoinPartyMakesUnavailableInvitesIndistinguishable(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	partyID := seedInviteRepositoryParty(t, pool)
	now := time.Date(2026, 7, 14, 14, 0, 0, 0, time.UTC)
	repository := newTestPartyRepository(pool)
	repository.now = func() time.Time { return now }

	replacedToken := validInviteToken(0x86)
	tests := []struct {
		name    string
		token   string
		prepare func(t *testing.T)
	}{
		{name: "malformed token", token: "private-malformed-join-token"},
		{name: "unknown token", token: validInviteToken(0x82)},
		{
			name:  "expired token",
			token: validInviteToken(0x83),
			prepare: func(t *testing.T) {
				insertInviteForRepositoryTest(t, pool, partyID, testGMUserID, validInviteToken(0x83), now.Add(-8*24*time.Hour))
			},
		},
		{
			name:  "revoked token",
			token: validInviteToken(0x84),
			prepare: func(t *testing.T) {
				token := validInviteToken(0x84)
				createdAt := now.Add(-time.Hour)
				insertInviteForRepositoryTest(t, pool, partyID, testGMUserID, token, createdAt)
				tokenHash := sha256.Sum256([]byte(token))
				if _, err := pool.Exec(context.Background(), `
UPDATE party_invites SET revoked_at = $1 WHERE token_hash = $2`, now.Add(-30*time.Minute), tokenHash[:]); err != nil {
					t.Fatalf("revoke join invite fixture: %v", err)
				}
			},
		},
		{
			name:  "token expiring exactly now",
			token: validInviteToken(0x85),
			prepare: func(t *testing.T) {
				insertInviteForRepositoryTest(t, pool, partyID, testGMUserID, validInviteToken(0x85), now.Add(-7*24*time.Hour))
			},
		},
		{
			name:  "replaced token",
			token: replacedToken,
			prepare: func(t *testing.T) {
				creationRepository := newTestPartyRepository(pool)
				creationRepository.now = func() time.Time { return now.Add(-time.Hour) }
				creationRepository.newInviteToken = sequentialInviteTokens(t, replacedToken, validInviteToken(0x87))
				creationRepository.newInviteCode = sequentialInviteCodes(t, "ABCD2345", "WXYZ6789")
				if _, err := creationRepository.CreateOrRegenerateInvite(context.Background(), partyID, uuid.MustParse(testGMUserID)); err != nil {
					t.Fatalf("create replaced join invite: %v", err)
				}
				creationRepository.now = func() time.Time { return now }
				if _, err := creationRepository.CreateOrRegenerateInvite(context.Background(), partyID, uuid.MustParse(testGMUserID)); err != nil {
					t.Fatalf("replace join invite: %v", err)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := pool.Exec(context.Background(), `DELETE FROM party_invites`); err != nil {
				t.Fatalf("reset join invite fixtures: %v", err)
			}
			if tt.prepare != nil {
				tt.prepare(t)
			}

			_, err := repository.JoinParty(
				context.Background(),
				tt.token,
				uuid.MustParse(testOtherUserID),
				uuid.MustParse(testThirdCharacterID),
			)
			if !errors.Is(err, ErrInviteUnavailable) {
				t.Fatalf("expected ErrInviteUnavailable, got %v", err)
			}
			if strings.Contains(err.Error(), tt.token) {
				t.Fatal("join error exposed the raw invite token")
			}
			requireUserMembershipCount(t, pool, partyID, uuid.MustParse(testOtherUserID), 0)
		})
	}
}

func TestRepositoryJoinPartyHidesUnknownAndForeignCharacters(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	now := time.Date(2026, 7, 14, 15, 0, 0, 0, time.UTC)
	rawToken := validInviteToken(0x88)
	partyID := seedJoinRepositoryParty(t, pool, rawToken, now.Add(-time.Hour))
	repository := newTestPartyRepository(pool)
	repository.now = func() time.Time { return now }

	tests := []struct {
		name        string
		characterID uuid.UUID
	}{
		{name: "unknown character", characterID: uuid.MustParse("25000000-0000-0000-0000-000000000099")},
		{name: "foreign character", characterID: uuid.MustParse(testCharacterID)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := repository.JoinParty(context.Background(), rawToken, uuid.MustParse(testOtherUserID), tt.characterID)
			if !errors.Is(err, ErrCharacterNotFound) {
				t.Fatalf("expected ErrCharacterNotFound, got %v", err)
			}
			if strings.Contains(err.Error(), rawToken) {
				t.Fatal("character error exposed the raw invite token")
			}
			requireUserMembershipCount(t, pool, partyID, uuid.MustParse(testOtherUserID), 0)
		})
	}
}

func TestRepositoryJoinPartyIsIdempotentForIdenticalRequest(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	now := time.Date(2026, 7, 14, 16, 0, 0, 0, time.UTC)
	rawToken := validInviteToken(0x89)
	partyID := seedJoinRepositoryParty(t, pool, rawToken, now.Add(-time.Hour))
	membershipID := uuid.MustParse("45000000-0000-0000-0000-000000000010")
	repository := newRepository(pool, sequentialPartyIDs(t, membershipID), func() time.Time { return now })

	first, err := repository.JoinParty(context.Background(), rawToken, uuid.MustParse(testOtherUserID), uuid.MustParse(testThirdCharacterID))
	if err != nil {
		t.Fatalf("perform first identical join: %v", err)
	}
	second, err := repository.JoinParty(context.Background(), rawToken, uuid.MustParse(testOtherUserID), uuid.MustParse(testThirdCharacterID))
	if err != nil {
		t.Fatalf("repeat identical join: %v", err)
	}
	if !first.Created || second.Created {
		t.Fatal("identical join did not distinguish creation from replay")
	}
	if first.Membership != second.Membership {
		t.Fatal("identical join did not return the existing membership")
	}
	requireUserMembershipCount(t, pool, partyID, uuid.MustParse(testOtherUserID), 1)
}

func TestRepositoryJoinPartyRejectsDifferentJoinForExistingMember(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	now := time.Date(2026, 7, 14, 17, 0, 0, 0, time.UTC)
	rawToken := validInviteToken(0x8a)
	partyID := seedJoinRepositoryParty(t, pool, rawToken, now.Add(-time.Hour))
	repository := newTestPartyRepository(pool)
	repository.now = func() time.Time { return now }

	_, err := repository.JoinParty(
		context.Background(),
		rawToken,
		uuid.MustParse(testPlayerUserID),
		uuid.MustParse(testOtherCharacterID),
	)
	if !errors.Is(err, ErrAlreadyMember) {
		t.Fatalf("expected ErrAlreadyMember, got %v", err)
	}
	requireUserMembershipCount(t, pool, partyID, uuid.MustParse(testPlayerUserID), 1)
}

func TestRepositoryJoinPartyRejectsCharacterLinkedToAnotherParty(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	now := time.Date(2026, 7, 14, 18, 0, 0, 0, time.UTC)
	rawToken := validInviteToken(0x8b)
	partyID := seedJoinRepositoryParty(t, pool, rawToken, now.Add(-time.Hour))
	otherPartyID := "35000000-0000-0000-0000-000000000002"
	insertTestParty(t, pool, otherPartyID, "Character Link Party", testOtherGMUserID)
	insertTestMembership(t, pool, "45000000-0000-0000-0000-000000000020", otherPartyID, testOtherGMUserID, RoleGM, nil)
	characterID := testThirdCharacterID
	insertTestMembership(t, pool, "45000000-0000-0000-0000-000000000021", otherPartyID, testOtherUserID, RolePlayer, &characterID)
	repository := newTestPartyRepository(pool)
	repository.now = func() time.Time { return now }

	_, err := repository.JoinParty(context.Background(), rawToken, uuid.MustParse(testOtherUserID), uuid.MustParse(testThirdCharacterID))
	if !errors.Is(err, ErrCharacterAlreadyLinked) {
		t.Fatalf("expected ErrCharacterAlreadyLinked, got %v", err)
	}
	requireUserMembershipCount(t, pool, partyID, uuid.MustParse(testOtherUserID), 0)
}

func TestRepositoryJoinPartyRollsBackFailedMembershipInsertion(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	now := time.Date(2026, 7, 14, 19, 0, 0, 0, time.UTC)
	rawToken := validInviteToken(0x8c)
	partyID := seedJoinRepositoryParty(t, pool, rawToken, now.Add(-time.Hour))
	existingMembershipID := uuid.MustParse("44000000-0000-0000-0000-000000000001")
	repository := newRepository(pool, sequentialPartyIDs(t, existingMembershipID), func() time.Time { return now })

	_, err := repository.JoinParty(context.Background(), rawToken, uuid.MustParse(testOtherUserID), uuid.MustParse(testThirdCharacterID))
	if err == nil {
		t.Fatal("expected duplicate membership ID to fail join")
	}
	if strings.Contains(err.Error(), rawToken) {
		t.Fatal("failed join error exposed the raw invite token")
	}
	requireUserMembershipCount(t, pool, partyID, uuid.MustParse(testOtherUserID), 0)
	if _, inspectionErr := repository.InspectInvite(context.Background(), rawToken); inspectionErr != nil {
		t.Fatalf("invite became unavailable after rolled-back join: %v", inspectionErr)
	}
}

func TestRepositoryJoinPartySerializesConcurrentIdenticalJoins(t *testing.T) {
	pool := setupPartyRepositoryTest(t)
	now := time.Date(2026, 7, 14, 20, 0, 0, 0, time.UTC)
	rawToken := validInviteToken(0x8d)
	partyID := seedJoinRepositoryParty(t, pool, rawToken, now.Add(-time.Hour))
	firstMembershipID := uuid.MustParse("45000000-0000-0000-0000-000000000030")
	firstRepository := newRepository(
		pool,
		func() uuid.UUID { return firstMembershipID },
		func() time.Time { return now },
	)
	secondMembershipID := uuid.MustParse("45000000-0000-0000-0000-000000000031")
	secondRepository := newRepository(
		pool,
		func() uuid.UUID { return secondMembershipID },
		func() time.Time { return now },
	)

	type joinResult struct {
		result JoinPartyResult
		err    error
	}
	start := make(chan struct{})
	results := make(chan joinResult, 2)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	join := func(repository *Repository) {
		<-start
		result, err := repository.JoinParty(ctx, rawToken, uuid.MustParse(testOtherUserID), uuid.MustParse(testThirdCharacterID))
		results <- joinResult{result: result, err: err}
	}
	go join(firstRepository)
	go join(secondRepository)
	close(start)

	first := <-results
	second := <-results
	if first.err != nil || second.err != nil {
		t.Fatal("expected concurrent identical joins to succeed")
	}
	if first.result.Membership != second.result.Membership {
		t.Fatal("concurrent identical joins returned different memberships")
	}
	if first.result.Created == second.result.Created {
		t.Fatal("concurrent identical joins did not return one creation and one replay")
	}
	requireUserMembershipCount(t, pool, partyID, uuid.MustParse(testOtherUserID), 1)
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

func insertRepositoryTestUser(t *testing.T, pool *pgxpool.Pool, id string, username string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
INSERT INTO users (
  id, username, username_canonical, email_canonical, password_hash, password_hash_algorithm, created_at, updated_at
) VALUES ($1::uuid, $2, $2, $2 || '@example.com', 'test-password-hash', 'argon2id', $3, $3)`,
		id, username, migrationTestNow)
	if err != nil {
		t.Fatalf("insert repository test user: %v", err)
	}
}

func insertRepositoryTestCharacter(t *testing.T, pool *pgxpool.Pool, id string, ownerID string, name string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
INSERT INTO characters (
  id, owner_subject_id, name, class_name, subclass_name, level, ancestry, background,
  strength_score, dexterity_score, constitution_score, intelligence_score, wisdom_score, charisma_score,
  hp_current, hp_max, armor_class, speed_ft, reference_payload, created_at, updated_at
) VALUES (
  $1::uuid, $2::uuid, $3, 'Fighter', NULL, 1, 'Human', 'Soldier',
  10, 10, 10, 10, 10, 10, 10, 10, 10, 30, '{}'::jsonb, $4, $4
)`, id, ownerID, name, migrationTestNow)
	if err != nil {
		t.Fatalf("insert repository test character: %v", err)
	}
}

func insertRepositoryTestPartyAt(t *testing.T, pool *pgxpool.Pool, id string, name string, creatorID string, createdAt time.Time) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
INSERT INTO parties (id, name, created_by_user_id, created_at, updated_at)
VALUES ($1::uuid, $2, $3::uuid, $4, $4)`, id, name, creatorID, createdAt)
	if err != nil {
		t.Fatalf("insert repository test Party: %v", err)
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

func seedInviteRepositoryParty(t *testing.T, pool *pgxpool.Pool) uuid.UUID {
	t.Helper()
	seedPartyMigrationUsers(t, pool)
	seedPartyMigrationCharacters(t, pool)
	partyID := uuid.MustParse("34000000-0000-0000-0000-000000000001")
	insertTestParty(t, pool, partyID.String(), "Invite Party", testGMUserID)
	insertTestMembership(t, pool, "44000000-0000-0000-0000-000000000001", partyID.String(), testGMUserID, RoleGM, nil)
	characterID := testCharacterID
	insertTestMembership(t, pool, "44000000-0000-0000-0000-000000000003", partyID.String(), testPlayerUserID, RolePlayer, &characterID)
	return partyID
}

func validInviteToken(fill byte) string {
	return base64.RawURLEncoding.EncodeToString(bytes.Repeat([]byte{fill}, 32))
}

func testInviteCodeHashKey() InviteCodeHashKey {
	var keyBytes [32]byte
	for index := range keyBytes {
		keyBytes[index] = byte(index + 1)
	}
	return NewInviteCodeHashKey(keyBytes)
}

func newTestPartyRepository(pool *pgxpool.Pool) *Repository {
	return NewRepository(pool, testInviteCodeHashKey())
}

func sequentialInviteTokens(t *testing.T, tokens ...string) func() (string, error) {
	t.Helper()
	index := 0
	return func() (string, error) {
		if index >= len(tokens) {
			t.Fatal("Party repository requested an unexpected invite token")
		}
		token := tokens[index]
		index++
		return token, nil
	}
}

func sequentialInviteCodes(t *testing.T, codes ...string) func() (string, error) {
	t.Helper()
	index := 0
	return func() (string, error) {
		if index >= len(codes) {
			t.Fatal("Party repository requested an unexpected invite code")
		}
		code := codes[index]
		index++
		return code, nil
	}
}

func seedHistoricalInviteCodeCollision(t *testing.T, pool *pgxpool.Pool, code string, createdAt time.Time) {
	t.Helper()
	otherPartyID := "34000000-0000-0000-0000-000000000003"
	insertTestParty(t, pool, otherPartyID, "Historical Code Party", testOtherGMUserID)
	insertTestMembership(t, pool, "44000000-0000-0000-0000-000000000004", otherPartyID, testOtherGMUserID, RoleGM, nil)
	tokenHash := sha256.Sum256([]byte(validInviteToken(0x59)))
	codeHash, err := InviteCodeHash(testInviteCodeHashKey(), code)
	if err != nil {
		t.Fatalf("hash historical collision code: %v", err)
	}
	_, err = pool.Exec(context.Background(), `
INSERT INTO party_invites (
  id, party_id, created_by_user_id, token_hash, code_hash, created_at, expires_at, revoked_at
) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8)`,
		uuid.New().String(), otherPartyID, testOtherGMUserID, tokenHash[:], codeHash,
		createdAt, createdAt.Add(7*24*time.Hour), createdAt.Add(time.Minute))
	if err != nil {
		t.Fatalf("insert historical invite code collision: %v", err)
	}
}

func insertInviteForRepositoryTest(
	t *testing.T,
	pool *pgxpool.Pool,
	partyID uuid.UUID,
	creatorID string,
	rawToken string,
	createdAt time.Time,
) {
	t.Helper()
	tokenHash := sha256.Sum256([]byte(rawToken))
	_, err := pool.Exec(context.Background(), `
INSERT INTO party_invites (
  id, party_id, created_by_user_id, token_hash, created_at, expires_at, revoked_at
) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, NULL)`,
		uuid.New().String(), partyID.String(), creatorID, tokenHash[:], createdAt, createdAt.Add(7*24*time.Hour))
	if err != nil {
		t.Fatalf("insert Party invite fixture: %v", err)
	}
}

func insertCodeInviteForRepositoryTest(
	t *testing.T,
	pool *pgxpool.Pool,
	partyID uuid.UUID,
	rawCode string,
	createdAt time.Time,
	revokedAt *time.Time,
) {
	t.Helper()
	codeHash, err := InviteCodeHash(testInviteCodeHashKey(), rawCode)
	if err != nil {
		t.Fatalf("hash code invite fixture: %v", err)
	}
	tokenHash := sha256.Sum256([]byte(uuid.New().String()))
	_, err = pool.Exec(context.Background(), `
INSERT INTO party_invites (
  id, party_id, created_by_user_id, token_hash, code_hash, created_at, expires_at, revoked_at
) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8)`,
		uuid.New().String(), partyID.String(), testGMUserID, tokenHash[:], codeHash,
		createdAt, createdAt.Add(7*24*time.Hour), revokedAt)
	if err != nil {
		t.Fatalf("insert code invite fixture: %v", err)
	}
}

func requireInviteCounts(t *testing.T, pool *pgxpool.Pool, partyID uuid.UUID, totalWant int, activeWant int) {
	t.Helper()
	var total int
	var active int
	if err := pool.QueryRow(context.Background(), `
SELECT count(*), count(*) FILTER (WHERE revoked_at IS NULL)
FROM party_invites
WHERE party_id = $1::uuid`, partyID.String()).Scan(&total, &active); err != nil {
		t.Fatalf("count Party invites: %v", err)
	}
	if total != totalWant || active != activeWant {
		t.Fatalf("expected %d total and %d active invites, got %d total and %d active", totalWant, activeWant, total, active)
	}
}

func seedJoinRepositoryParty(t *testing.T, pool *pgxpool.Pool, rawToken string, createdAt time.Time) uuid.UUID {
	t.Helper()
	partyID := seedInviteRepositoryParty(t, pool)
	insertInviteForRepositoryTest(t, pool, partyID, testGMUserID, rawToken, createdAt)
	return partyID
}

func assertJoinedMembership(
	t *testing.T,
	membership PartyMembership,
	membershipID uuid.UUID,
	partyID uuid.UUID,
	characterID uuid.UUID,
	joinedAt time.Time,
) {
	t.Helper()
	if membership.ID != membershipID || membership.PartyID != partyID || membership.Role != RolePlayer || membership.CharacterID != characterID {
		t.Fatal("join returned unexpected membership identity")
	}
	if !membership.JoinedAt.Equal(joinedAt) {
		t.Fatal("join returned unexpected membership timestamp")
	}
}

func requireUserMembershipCount(t *testing.T, pool *pgxpool.Pool, partyID uuid.UUID, userID uuid.UUID, want int) {
	t.Helper()
	var count int
	if err := pool.QueryRow(context.Background(), `
SELECT count(*)
FROM party_memberships
WHERE party_id = $1::uuid
  AND user_id = $2::uuid`, partyID.String(), userID.String()).Scan(&count); err != nil {
		t.Fatalf("count user memberships: %v", err)
	}
	if count != want {
		t.Fatalf("expected %d user memberships, got %d", want, count)
	}
}
