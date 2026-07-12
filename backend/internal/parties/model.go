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
	ID        uuid.UUID
	Name      string
	Role      string
	CreatedAt time.Time
	UpdatedAt time.Time
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
