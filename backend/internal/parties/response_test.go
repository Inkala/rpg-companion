package parties

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestPartySummaryModelsExposeOnlyApprovedListFields(t *testing.T) {
	requireStructFields(t, PartySummary{}, []string{
		"ID", "Name", "Role", "CreatedAt", "UpdatedAt", "GM", "LinkedCharacters",
	})
	requireStructFields(t, PartySummaryPerson{}, []string{"Username"})
	requireStructFields(t, PartySummaryLinkedCharacter{}, []string{"CharacterName", "Username"})
}

func TestPartySummaryListResponseMappingHasExactPrivacySafeKeys(t *testing.T) {
	partyID := uuid.MustParse("71000000-0000-0000-0000-000000000001")
	summary := PartySummary{
		ID:   partyID,
		Name: "Ash & Ivy Pact",
		Role: RolePlayer,
		GM:   PartySummaryPerson{Username: "nerea-sol"},
		LinkedCharacters: []PartySummaryLinkedCharacter{
			{CharacterName: "Nim", Username: "nim-player"},
			{CharacterName: "Aster", Username: "aster-player"},
		},
	}

	mappedSummary := responseFromPartySummary(summary)
	summaryJSON := marshalResponseMap(t, mappedSummary)
	requireJSONKeys(t, summaryJSON, "id", "name", "role", "gm", "linkedCharacters")
	if summaryJSON["id"] != partyID.String() || summaryJSON["name"] != "Ash & Ivy Pact" || summaryJSON["role"] != RolePlayer {
		t.Fatal("Party summary response does not match the frontend contract")
	}
	gm := requireJSONObject(t, summaryJSON["gm"])
	requireJSONKeys(t, gm, "username")
	if gm["username"] != "nerea-sol" {
		t.Fatal("Party summary response did not map the GM username")
	}
	linkedCharacters, ok := summaryJSON["linkedCharacters"].([]any)
	if !ok || len(linkedCharacters) != 2 {
		t.Fatal("Party summary response must contain the linked-character array")
	}
	firstLinkedCharacter := requireJSONObject(t, linkedCharacters[0])
	requireJSONKeys(t, firstLinkedCharacter, "characterName", "username")
	if firstLinkedCharacter["characterName"] != "Nim" || firstLinkedCharacter["username"] != "nim-player" {
		t.Fatal("Party summary response did not map the linked-character summary")
	}
	secondLinkedCharacter := requireJSONObject(t, linkedCharacters[1])
	requireJSONKeys(t, secondLinkedCharacter, "characterName", "username")
	if secondLinkedCharacter["characterName"] != "Aster" || secondLinkedCharacter["username"] != "aster-player" {
		t.Fatal("Party summary response changed linked-character order")
	}

	listJSON := marshalResponseMap(t, listResponseFromPartySummaries([]PartySummary{summary}))
	requireJSONKeys(t, listJSON, "parties")
	parties, ok := listJSON["parties"].([]any)
	if !ok || len(parties) != 1 {
		t.Fatal("Party list response must contain one parties array entry")
	}
	requireJSONKeys(t, requireJSONObject(t, parties[0]), "id", "name", "role", "gm", "linkedCharacters")

	serialized := marshalResponseString(t, listResponseFromPartySummaries([]PartySummary{summary}))
	for _, forbiddenKey := range []string{
		"email", "userId", "characterId", "ownerId", "ownerSubjectId", "characterSheet",
		"referencePayload", "invite", "inviteData", "token", "tokenHash", "members", "displayName",
	} {
		if strings.Contains(serialized, `"`+forbiddenKey+`"`) {
			t.Fatalf("Party list response exposed forbidden field %q", forbiddenKey)
		}
	}
}

func TestPartySummaryListResponseUsesEmptyLinkedCharacterArrays(t *testing.T) {
	summary := PartySummary{
		ID:   uuid.MustParse("71000000-0000-0000-0000-000000000002"),
		Name: "Quiet Hall",
		Role: RoleGM,
		GM:   PartySummaryPerson{Username: "quiet-gm"},
	}

	summaryJSON := marshalResponseMap(t, responseFromPartySummary(summary))
	linkedCharacters, ok := summaryJSON["linkedCharacters"].([]any)
	if !ok || len(linkedCharacters) != 0 {
		t.Fatal("Party with no linked characters must serialize linkedCharacters as []")
	}

	listJSON := marshalResponseMap(t, listResponseFromPartySummaries(nil))
	parties, ok := listJSON["parties"].([]any)
	if !ok || len(parties) != 0 {
		t.Fatal("empty Party list must serialize parties as []")
	}
}

func TestPartyCreateResponseMappingRemainsUnchanged(t *testing.T) {
	partyID := uuid.MustParse("71000000-0000-0000-0000-000000000003")
	ownerID := uuid.MustParse("70000000-0000-0000-0000-000000000001")

	createdParty := Party{ID: partyID, Name: "Lantern Keep", CreatedByUserID: ownerID}
	createJSON := marshalResponseMap(t, createResponseFromParty(createdParty))
	requireJSONKeys(t, createJSON, "id", "name", "role")
	if createJSON["role"] != RoleGM {
		t.Fatal("Party creation response must assign the GM role")
	}
	if strings.Contains(marshalResponseString(t, createResponseFromParty(createdParty)), ownerID.String()) {
		t.Fatal("Party creation response exposed the internal owner ID")
	}
}

func TestPartyDetailResponseMappingIsRosterScopedAndPrivacySafe(t *testing.T) {
	partyID := uuid.MustParse("71000000-0000-0000-0000-000000000002")
	characterID := uuid.MustParse("72000000-0000-0000-0000-000000000001")
	detail := PartyDetail{
		ID:   partyID,
		Name: "Moon Watch",
		Role: RoleGM,
		Members: []PartyMember{
			{Username: "gm-user", Role: RoleGM, JoinedAt: time.Now().UTC(), Character: nil},
			{
				Username: "player-user",
				Role:     RolePlayer,
				JoinedAt: time.Now().UTC(),
				Character: &PartyMemberCharacter{
					ID:   characterID,
					Name: "Mara Vale",
				},
			},
		},
	}

	response := responseFromPartyDetail(detail)
	responseJSON := marshalResponseMap(t, response)
	requireJSONKeys(t, responseJSON, "id", "name", "role", "members")
	members, ok := responseJSON["members"].([]any)
	if !ok || len(members) != 2 {
		t.Fatal("Party detail response must contain the basic roster")
	}

	gm := requireJSONObject(t, members[0])
	requireJSONKeys(t, gm, "username", "role", "character")
	if gm["character"] != nil {
		t.Fatal("GM roster character must be null")
	}

	player := requireJSONObject(t, members[1])
	requireJSONKeys(t, player, "username", "role", "character")
	character := requireJSONObject(t, player["character"])
	requireJSONKeys(t, character, "id", "name")
	if character["id"] != characterID.String() || character["name"] != "Mara Vale" {
		t.Fatal("roster character response does not match the frontend contract")
	}

	serialized := marshalResponseString(t, response)
	for _, forbidden := range []string{
		"userId", "email", "canonical", "invite", "token", "tokenHash", "referencePayload", "ownerSubjectId", "joinedAt",
	} {
		if strings.Contains(serialized, forbidden) {
			t.Fatalf("Party detail response exposed forbidden field %q", forbidden)
		}
	}
}

func TestInviteResponseMappingsUseCanonicalTimestampsAndLimitRawToken(t *testing.T) {
	rawToken := "raw-private-invite-token"
	partyID := uuid.MustParse("71000000-0000-0000-0000-000000000003")
	sourceTime := time.Date(2026, 7, 14, 15, 30, 0, 123, time.FixedZone("test-offset", 2*60*60))
	expiresAt := sourceTime.Add(7 * 24 * time.Hour)

	creationJSON := marshalResponseMap(t, responseFromPartyInvite(PartyInvite{
		Token:     rawToken,
		CreatedAt: sourceTime,
		ExpiresAt: expiresAt,
	}))
	requireJSONKeys(t, creationJSON, "token", "createdAt", "expiresAt")
	if creationJSON["token"] != rawToken {
		t.Fatal("invite creation response did not contain the one-time raw token")
	}
	if creationJSON["createdAt"] != "2026-07-14T13:30:00Z" || creationJSON["expiresAt"] != "2026-07-21T13:30:00Z" {
		t.Fatal("invite creation timestamps are not canonical UTC RFC3339")
	}

	inspectionResponse := responseFromInviteInspection(InviteInspection{
		PartyID:   partyID,
		PartyName: "Moon Watch",
		ExpiresAt: expiresAt,
	})
	inspectionJSON := marshalResponseMap(t, inspectionResponse)
	requireJSONKeys(t, inspectionJSON, "party", "expiresAt")
	party := requireJSONObject(t, inspectionJSON["party"])
	requireJSONKeys(t, party, "id", "name")
	if strings.Contains(marshalResponseString(t, inspectionResponse), rawToken) {
		t.Fatal("invite inspection response exposed the raw token")
	}
}

func TestJoinResponseMappingContainsNoInviteToken(t *testing.T) {
	membershipID := uuid.MustParse("73000000-0000-0000-0000-000000000001")
	partyID := uuid.MustParse("71000000-0000-0000-0000-000000000004")
	characterID := uuid.MustParse("72000000-0000-0000-0000-000000000004")
	joinedAt := time.Date(2026, 7, 14, 18, 45, 0, 0, time.FixedZone("test-offset", -3*60*60))
	rawToken := "raw-private-invite-token"

	response := responseFromPartyMembership(PartyMembership{
		ID:          membershipID,
		PartyID:     partyID,
		Role:        RolePlayer,
		CharacterID: characterID,
		JoinedAt:    joinedAt,
	})
	responseJSON := marshalResponseMap(t, response)
	requireJSONKeys(t, responseJSON, "partyId", "membershipId", "role", "characterId", "joinedAt")
	if responseJSON["partyId"] != partyID.String() || responseJSON["membershipId"] != membershipID.String() {
		t.Fatal("join response contains unexpected membership identity")
	}
	if responseJSON["role"] != RolePlayer || responseJSON["characterId"] != characterID.String() {
		t.Fatal("join response contains unexpected role or character")
	}
	if responseJSON["joinedAt"] != "2026-07-14T21:45:00Z" {
		t.Fatal("join timestamp is not canonical UTC RFC3339")
	}
	if strings.Contains(marshalResponseString(t, response), rawToken) {
		t.Fatal("join response exposed the raw invite token")
	}
}

func marshalResponseString(t *testing.T, value any) string {
	t.Helper()
	encoded, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}
	return string(encoded)
}

func marshalResponseMap(t *testing.T, value any) map[string]any {
	t.Helper()
	var decoded map[string]any
	if err := json.Unmarshal([]byte(marshalResponseString(t, value)), &decoded); err != nil {
		t.Fatalf("decode response JSON: %v", err)
	}
	return decoded
}

func requireJSONObject(t *testing.T, value any) map[string]any {
	t.Helper()
	object, ok := value.(map[string]any)
	if !ok {
		t.Fatalf("expected JSON object, got %T", value)
	}
	return object
}

func requireJSONKeys(t *testing.T, object map[string]any, want ...string) {
	t.Helper()
	if len(object) != len(want) {
		t.Fatalf("expected %d JSON fields, got %d", len(want), len(object))
	}
	for _, key := range want {
		if _, ok := object[key]; !ok {
			t.Fatalf("expected JSON field %q", key)
		}
	}
}
