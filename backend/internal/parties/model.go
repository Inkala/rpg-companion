package parties

import (
	"time"

	"github.com/google/uuid"
)

const (
	RoleGM     = "gm"
	RolePlayer = "player"
)

type Party struct {
	ID              uuid.UUID
	Name            string
	CreatedByUserID uuid.UUID
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type PartySummary struct {
	ID               uuid.UUID
	Name             string
	Role             string
	CreatedAt        time.Time
	UpdatedAt        time.Time
	GM               PartySummaryPerson
	LinkedCharacters []PartySummaryLinkedCharacter
}

type PartySummaryPerson struct {
	Username string
}

type PartySummaryLinkedCharacter struct {
	CharacterName string
	Username      string
}

type PartyDetail struct {
	ID        uuid.UUID
	Name      string
	Role      string
	CreatedAt time.Time
	UpdatedAt time.Time
	Members   []PartyMember
}

type PartyMember struct {
	Username  string
	Role      string
	JoinedAt  time.Time
	Character *PartyMemberCharacter
}

type PartyMemberCharacter struct {
	ID   uuid.UUID
	Name string
}

type PartyInvite struct {
	Token     string
	Code      string
	CreatedAt time.Time
	ExpiresAt time.Time
}

type InviteInspection struct {
	PartyID   uuid.UUID
	PartyName string
	ExpiresAt time.Time
}

type PartyMembership struct {
	ID          uuid.UUID
	PartyID     uuid.UUID
	Role        string
	CharacterID uuid.UUID
	JoinedAt    time.Time
}

type JoinPartyResult struct {
	Membership PartyMembership
	Created    bool
}
