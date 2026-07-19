package parties

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrPartyNotFound = errors.New("party not found")
var ErrPartyForbidden = errors.New("party operation is forbidden")
var ErrInviteUnavailable = errors.New("invite is unavailable")
var ErrCharacterNotFound = errors.New("character not found")
var ErrAlreadyMember = errors.New("user is already a Party member")
var ErrCharacterAlreadyLinked = errors.New("character is already linked to a Party")

const maxInviteCredentialAttempts = 8

type Repository struct {
	pool              *pgxpool.Pool
	newID             func() uuid.UUID
	newInviteToken    func() (string, error)
	newInviteCode     func() (string, error)
	inviteCodeHashKey InviteCodeHashKey
	now               func() time.Time
}

func NewRepository(pool *pgxpool.Pool, inviteCodeHashKey InviteCodeHashKey) *Repository {
	repository := newRepository(
		pool,
		uuid.New,
		func() time.Time { return time.Now().UTC() },
	)
	repository.inviteCodeHashKey = inviteCodeHashKey
	return repository
}

func newRepository(pool *pgxpool.Pool, newID func() uuid.UUID, now func() time.Time) *Repository {
	return &Repository{
		pool:           pool,
		newID:          newID,
		newInviteToken: NewInviteToken,
		newInviteCode:  NewInviteCode,
		now:            now,
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
  requester.role,
  p.created_at,
  p.updated_at,
  gm_user.username,
  player_membership.id::text,
  linked_character.name,
  player_user.username
FROM party_memberships requester
JOIN parties p ON p.id = requester.party_id
JOIN party_memberships gm_membership
  ON gm_membership.party_id = p.id
 AND gm_membership.role = 'gm'
JOIN users gm_user ON gm_user.id = gm_membership.user_id
LEFT JOIN party_memberships player_membership
  ON player_membership.party_id = p.id
 AND player_membership.role = 'player'
 AND player_membership.character_id IS NOT NULL
LEFT JOIN characters linked_character ON linked_character.id = player_membership.character_id
LEFT JOIN users player_user ON player_user.id = player_membership.user_id
WHERE requester.user_id = $1::uuid
ORDER BY
  p.created_at DESC,
  p.id DESC,
  player_membership.joined_at ASC,
  player_membership.id ASC`

	rows, err := repository.pool.Query(ctx, query, userID.String())
	if err != nil {
		return nil, fmt.Errorf("query Party summaries: %w", err)
	}
	defer rows.Close()

	summaries := make([]PartySummary, 0)
	summaryIndexes := make(map[uuid.UUID]int)
	for rows.Next() {
		var id string
		var name string
		var role string
		var createdAt time.Time
		var updatedAt time.Time
		var gmUsername string
		var playerMembershipID *string
		var characterName *string
		var playerUsername *string
		if err := rows.Scan(
			&id,
			&name,
			&role,
			&createdAt,
			&updatedAt,
			&gmUsername,
			&playerMembershipID,
			&characterName,
			&playerUsername,
		); err != nil {
			return nil, fmt.Errorf("scan Party summary: %w", err)
		}

		parsedID, err := uuid.Parse(id)
		if err != nil {
			return nil, fmt.Errorf("parse Party summary ID: %w", err)
		}
		summaryIndex, exists := summaryIndexes[parsedID]
		if !exists {
			summaries = append(summaries, PartySummary{
				ID:               parsedID,
				Name:             name,
				Role:             role,
				CreatedAt:        createdAt,
				UpdatedAt:        updatedAt,
				GM:               PartySummaryPerson{Username: gmUsername},
				LinkedCharacters: make([]PartySummaryLinkedCharacter, 0),
			})
			summaryIndex = len(summaries) - 1
			summaryIndexes[parsedID] = summaryIndex
		}

		if playerMembershipID != nil {
			if characterName == nil || playerUsername == nil {
				return nil, errors.New("linked Party character summary is incomplete")
			}
			summaries[summaryIndex].LinkedCharacters = append(
				summaries[summaryIndex].LinkedCharacters,
				PartySummaryLinkedCharacter{
					CharacterName: *characterName,
					Username:      *playerUsername,
				},
			)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate Party summaries: %w", err)
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

func (repository *Repository) CreateOrRegenerateInvite(
	ctx context.Context,
	partyID uuid.UUID,
	requesterID uuid.UUID,
) (PartyInvite, error) {
	transaction, err := repository.pool.Begin(ctx)
	if err != nil {
		return PartyInvite{}, err
	}
	defer func() { _ = transaction.Rollback(ctx) }()

	const lockPartyAndLoadRole = `
SELECT membership.role
FROM parties p
JOIN party_memberships membership
  ON membership.party_id = p.id
 AND membership.user_id = $2::uuid
WHERE p.id = $1::uuid
FOR UPDATE OF p`

	var role string
	err = transaction.QueryRow(ctx, lockPartyAndLoadRole, partyID.String(), requesterID.String()).Scan(&role)
	if errors.Is(err, pgx.ErrNoRows) {
		return PartyInvite{}, ErrPartyNotFound
	}
	if err != nil {
		return PartyInvite{}, err
	}
	if role != RoleGM {
		return PartyInvite{}, ErrPartyForbidden
	}

	credentialPair, err := repository.newInviteCredentialPair()
	if err != nil {
		return PartyInvite{}, errors.New("could not generate invite credentials")
	}

	createdAt := repository.now().UTC()
	invite := PartyInvite{
		Token:     credentialPair.rawToken,
		Code:      credentialPair.formattedCode,
		CreatedAt: createdAt,
		ExpiresAt: createdAt.Add(7 * 24 * time.Hour),
	}

	const revokeActiveInvite = `
UPDATE party_invites
SET revoked_at = $2
WHERE party_id = $1::uuid
  AND revoked_at IS NULL`
	if _, err := transaction.Exec(ctx, revokeActiveInvite, partyID.String(), invite.CreatedAt); err != nil {
		return PartyInvite{}, err
	}

	const insertInvite = `
INSERT INTO party_invites (
  id, party_id, created_by_user_id, token_hash, code_hash, created_at, expires_at, revoked_at
) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, NULL)
ON CONFLICT (code_hash) WHERE code_hash IS NOT NULL DO NOTHING`
	for attempt := 0; attempt < maxInviteCredentialAttempts; attempt++ {
		if attempt > 0 {
			credentialPair, err = repository.newInviteCredentialPair()
			if err != nil {
				return PartyInvite{}, errors.New("could not generate invite credentials")
			}
			invite.Token = credentialPair.rawToken
			invite.Code = credentialPair.formattedCode
		}

		result, err := transaction.Exec(ctx, insertInvite,
			repository.newID().String(),
			partyID.String(),
			requesterID.String(),
			credentialPair.tokenHash,
			credentialPair.codeHash,
			invite.CreatedAt,
			invite.ExpiresAt,
		)
		if err != nil {
			return PartyInvite{}, err
		}
		if result.RowsAffected() == 1 {
			if err := transaction.Commit(ctx); err != nil {
				return PartyInvite{}, err
			}
			return invite, nil
		}
	}

	return PartyInvite{}, errors.New("could not create unique invite credentials")
}

type inviteCredentialPair struct {
	rawToken      string
	formattedCode string
	tokenHash     []byte
	codeHash      []byte
}

func (repository *Repository) newInviteCredentialPair() (inviteCredentialPair, error) {
	rawToken, err := repository.newInviteToken()
	if err != nil {
		return inviteCredentialPair{}, err
	}
	tokenHash, err := InviteTokenHash(rawToken)
	if err != nil {
		return inviteCredentialPair{}, err
	}

	rawCode, err := repository.newInviteCode()
	if err != nil {
		return inviteCredentialPair{}, err
	}
	formattedCode, err := FormatInviteCode(rawCode)
	if err != nil {
		return inviteCredentialPair{}, err
	}
	codeHash, err := InviteCodeHash(repository.inviteCodeHashKey, rawCode)
	if err != nil {
		return inviteCredentialPair{}, err
	}

	return inviteCredentialPair{
		rawToken:      rawToken,
		formattedCode: formattedCode,
		tokenHash:     tokenHash,
		codeHash:      codeHash,
	}, nil
}

func (repository *Repository) InspectInvite(ctx context.Context, rawToken string) (InviteInspection, error) {
	tokenHash, err := InviteTokenHash(rawToken)
	if err != nil {
		return InviteInspection{}, ErrInviteUnavailable
	}

	const query = `
SELECT
  p.id::text,
  p.name,
  invite.expires_at
FROM party_invites invite
JOIN parties p ON p.id = invite.party_id
WHERE invite.token_hash = $1
  AND invite.revoked_at IS NULL
  AND invite.expires_at > $2`

	var partyID string
	var inspection InviteInspection
	err = repository.pool.QueryRow(ctx, query, tokenHash, repository.now().UTC()).Scan(
		&partyID,
		&inspection.PartyName,
		&inspection.ExpiresAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return InviteInspection{}, ErrInviteUnavailable
	}
	if err != nil {
		return InviteInspection{}, err
	}

	parsedPartyID, err := uuid.Parse(partyID)
	if err != nil {
		return InviteInspection{}, err
	}
	inspection.PartyID = parsedPartyID

	return inspection, nil
}

func (repository *Repository) JoinParty(
	ctx context.Context,
	rawToken string,
	requesterID uuid.UUID,
	characterID uuid.UUID,
) (JoinPartyResult, error) {
	tokenHash, err := InviteTokenHash(rawToken)
	if err != nil {
		return JoinPartyResult{}, ErrInviteUnavailable
	}

	transaction, err := repository.pool.Begin(ctx)
	if err != nil {
		return JoinPartyResult{}, err
	}
	defer func() { _ = transaction.Rollback(ctx) }()

	const findInviteParty = `
SELECT party_id::text
FROM party_invites
WHERE token_hash = $1`
	var partyIDText string
	err = transaction.QueryRow(ctx, findInviteParty, tokenHash).Scan(&partyIDText)
	if errors.Is(err, pgx.ErrNoRows) {
		return JoinPartyResult{}, ErrInviteUnavailable
	}
	if err != nil {
		return JoinPartyResult{}, err
	}

	partyID, err := uuid.Parse(partyIDText)
	if err != nil {
		return JoinPartyResult{}, err
	}

	const lockParty = `
SELECT id::text
FROM parties
WHERE id = $1::uuid
FOR UPDATE`
	var lockedPartyID string
	err = transaction.QueryRow(ctx, lockParty, partyID.String()).Scan(&lockedPartyID)
	if errors.Is(err, pgx.ErrNoRows) {
		return JoinPartyResult{}, ErrInviteUnavailable
	}
	if err != nil {
		return JoinPartyResult{}, err
	}

	joinedAt := repository.now().UTC()
	const lockCurrentInvite = `
SELECT party_id::text
FROM party_invites
WHERE token_hash = $1
  AND party_id = $2::uuid
  AND revoked_at IS NULL
  AND expires_at > $3
FOR UPDATE`
	var currentInvitePartyID string
	err = transaction.QueryRow(ctx, lockCurrentInvite, tokenHash, partyID.String(), joinedAt).Scan(&currentInvitePartyID)
	if errors.Is(err, pgx.ErrNoRows) {
		return JoinPartyResult{}, ErrInviteUnavailable
	}
	if err != nil {
		return JoinPartyResult{}, err
	}

	const lockOwnedCharacter = `
SELECT id::text
FROM characters
WHERE id = $1::uuid
  AND owner_subject_id = $2::uuid
FOR UPDATE`
	var lockedCharacterID string
	err = transaction.QueryRow(ctx, lockOwnedCharacter, characterID.String(), requesterID.String()).Scan(&lockedCharacterID)
	if errors.Is(err, pgx.ErrNoRows) {
		return JoinPartyResult{}, ErrCharacterNotFound
	}
	if err != nil {
		return JoinPartyResult{}, err
	}

	existing, found, err := loadExistingPartyMembership(ctx, transaction, partyID, requesterID)
	if err != nil {
		return JoinPartyResult{}, err
	}
	if found {
		if existing.Role == RolePlayer && existing.CharacterID == characterID {
			return JoinPartyResult{Membership: existing, Created: false}, nil
		}
		return JoinPartyResult{}, ErrAlreadyMember
	}

	const findLinkedCharacter = `
SELECT id::text
FROM party_memberships
WHERE character_id = $1::uuid
FOR UPDATE`
	var linkedMembershipID string
	err = transaction.QueryRow(ctx, findLinkedCharacter, characterID.String()).Scan(&linkedMembershipID)
	if err == nil {
		return JoinPartyResult{}, ErrCharacterAlreadyLinked
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return JoinPartyResult{}, err
	}

	membership := PartyMembership{
		ID:          repository.newID(),
		PartyID:     partyID,
		Role:        RolePlayer,
		CharacterID: characterID,
		JoinedAt:    joinedAt,
	}
	const insertMembership = `
INSERT INTO party_memberships (id, party_id, user_id, role, character_id, joined_at)
VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::uuid, $6)`
	_, err = transaction.Exec(ctx, insertMembership,
		membership.ID.String(),
		membership.PartyID.String(),
		requesterID.String(),
		membership.Role,
		membership.CharacterID.String(),
		membership.JoinedAt,
	)
	if isPartyConstraint(err, "party_memberships_party_id_user_id_key") {
		return JoinPartyResult{}, ErrAlreadyMember
	}
	if isPartyConstraint(err, "party_memberships_character_id_key") {
		return JoinPartyResult{}, ErrCharacterAlreadyLinked
	}
	if err != nil {
		return JoinPartyResult{}, err
	}

	if err := transaction.Commit(ctx); err != nil {
		return JoinPartyResult{}, err
	}

	return JoinPartyResult{Membership: membership, Created: true}, nil
}

func loadExistingPartyMembership(
	ctx context.Context,
	transaction pgx.Tx,
	partyID uuid.UUID,
	requesterID uuid.UUID,
) (PartyMembership, bool, error) {
	const query = `
SELECT id::text, role, character_id::text, joined_at
FROM party_memberships
WHERE party_id = $1::uuid
  AND user_id = $2::uuid
FOR UPDATE`

	var membershipID string
	var characterID *string
	var membership PartyMembership
	err := transaction.QueryRow(ctx, query, partyID.String(), requesterID.String()).Scan(
		&membershipID,
		&membership.Role,
		&characterID,
		&membership.JoinedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return PartyMembership{}, false, nil
	}
	if err != nil {
		return PartyMembership{}, false, err
	}

	parsedMembershipID, err := uuid.Parse(membershipID)
	if err != nil {
		return PartyMembership{}, false, err
	}
	membership.ID = parsedMembershipID
	membership.PartyID = partyID
	membership.JoinedAt = membership.JoinedAt.UTC()
	if characterID != nil {
		parsedCharacterID, err := uuid.Parse(*characterID)
		if err != nil {
			return PartyMembership{}, false, err
		}
		membership.CharacterID = parsedCharacterID
	}

	return membership, true, nil
}

func isPartyConstraint(err error, constraintName string) bool {
	var databaseError *pgconn.PgError
	return errors.As(err, &databaseError) && databaseError.ConstraintName == constraintName
}
