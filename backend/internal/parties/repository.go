package parties

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrPartyNotFound = errors.New("party not found")

type Repository struct {
	pool  *pgxpool.Pool
	newID func() uuid.UUID
	now   func() time.Time
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return newRepository(
		pool,
		uuid.New,
		func() time.Time { return time.Now().UTC() },
	)
}

func newRepository(pool *pgxpool.Pool, newID func() uuid.UUID, now func() time.Time) *Repository {
	return &Repository{
		pool:  pool,
		newID: newID,
		now:   now,
	}
}

func (repository *Repository) CreateParty(ctx context.Context, creatorID uuid.UUID, requestedName string) (Party, error) {
	name, err := NormalizePartyName(requestedName)
	if err != nil {
		return Party{}, err
	}

	now := repository.now().UTC()
	party := Party{
		ID:              repository.newID(),
		Name:            name,
		CreatedByUserID: creatorID,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	membershipID := repository.newID()

	transaction, err := repository.pool.Begin(ctx)
	if err != nil {
		return Party{}, err
	}
	defer func() { _ = transaction.Rollback(ctx) }()

	const insertParty = `
INSERT INTO parties (id, name, created_by_user_id, created_at, updated_at)
VALUES ($1::uuid, $2, $3::uuid, $4, $5)`
	if _, err := transaction.Exec(ctx, insertParty,
		party.ID.String(),
		party.Name,
		party.CreatedByUserID.String(),
		party.CreatedAt,
		party.UpdatedAt,
	); err != nil {
		return Party{}, err
	}

	const insertMembership = `
INSERT INTO party_memberships (id, party_id, user_id, role, character_id, joined_at)
VALUES ($1::uuid, $2::uuid, $3::uuid, $4, NULL, $5)`
	if _, err := transaction.Exec(ctx, insertMembership,
		membershipID.String(),
		party.ID.String(),
		party.CreatedByUserID.String(),
		RoleGM,
		party.CreatedAt,
	); err != nil {
		return Party{}, err
	}

	if err := transaction.Commit(ctx); err != nil {
		return Party{}, err
	}

	return party, nil
}

func (repository *Repository) ListPartiesForUser(ctx context.Context, userID uuid.UUID) ([]PartySummary, error) {
	const query = `
SELECT
  p.id::text,
  p.name,
  m.role,
  p.created_at,
  p.updated_at
FROM party_memberships m
JOIN parties p ON p.id = m.party_id
WHERE m.user_id = $1::uuid
ORDER BY p.created_at DESC, p.id DESC`

	rows, err := repository.pool.Query(ctx, query, userID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	summaries := make([]PartySummary, 0)
	for rows.Next() {
		var id string
		var summary PartySummary
		if err := rows.Scan(
			&id,
			&summary.Name,
			&summary.Role,
			&summary.CreatedAt,
			&summary.UpdatedAt,
		); err != nil {
			return nil, err
		}

		parsedID, err := uuid.Parse(id)
		if err != nil {
			return nil, err
		}
		summary.ID = parsedID
		summaries = append(summaries, summary)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return summaries, nil
}

func (repository *Repository) GetPartyForMember(ctx context.Context, partyID uuid.UUID, requesterID uuid.UUID) (PartyDetail, error) {
	const query = `
SELECT
  p.id::text,
  p.name,
  requester.role,
  p.created_at,
  p.updated_at,
  u.username,
  roster.role,
  roster.joined_at,
  c.id::text,
  c.name
FROM parties p
JOIN party_memberships requester
  ON requester.party_id = p.id
 AND requester.user_id = $2::uuid
JOIN party_memberships roster ON roster.party_id = p.id
JOIN users u ON u.id = roster.user_id
LEFT JOIN characters c ON c.id = roster.character_id
WHERE p.id = $1::uuid
ORDER BY
  CASE WHEN roster.role = 'gm' THEN 0 ELSE 1 END,
  roster.joined_at,
  roster.id`

	rows, err := repository.pool.Query(ctx, query, partyID.String(), requesterID.String())
	if err != nil {
		return PartyDetail{}, err
	}
	defer rows.Close()

	detail := PartyDetail{Members: make([]PartyMember, 0)}
	found := false
	for rows.Next() {
		var loadedPartyID string
		var member PartyMember
		var characterID *string
		var characterName *string

		if err := rows.Scan(
			&loadedPartyID,
			&detail.Name,
			&detail.Role,
			&detail.CreatedAt,
			&detail.UpdatedAt,
			&member.Username,
			&member.Role,
			&member.JoinedAt,
			&characterID,
			&characterName,
		); err != nil {
			return PartyDetail{}, err
		}

		if !found {
			parsedPartyID, err := uuid.Parse(loadedPartyID)
			if err != nil {
				return PartyDetail{}, err
			}
			detail.ID = parsedPartyID
			found = true
		}

		if characterID != nil {
			parsedCharacterID, err := uuid.Parse(*characterID)
			if err != nil {
				return PartyDetail{}, err
			}
			if characterName == nil {
				return PartyDetail{}, errors.New("party roster character name is missing")
			}
			member.Character = &PartyMemberCharacter{
				ID:   parsedCharacterID,
				Name: *characterName,
			}
		}

		detail.Members = append(detail.Members, member)
	}
	if err := rows.Err(); err != nil {
		return PartyDetail{}, err
	}
	if !found {
		return PartyDetail{}, ErrPartyNotFound
	}

	return detail, nil
}
