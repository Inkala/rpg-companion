package characters

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound             = errors.New("character not found")
	ErrInvalidCharacterData = errors.New("invalid character data")
)

var knownCharacterCheckConstraints = map[string]struct{}{
	"characters_level_check":             {},
	"characters_hp_current_check":        {},
	"characters_hp_max_check":            {},
	"characters_armor_class_check":       {},
	"characters_speed_ft_check":          {},
	"characters_reference_payload_check": {},
	"characters_check":                   {},
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (repository *Repository) Create(ctx context.Context, character Character) (Character, error) {
	const query = `
INSERT INTO characters (
  id, owner_subject_id, name, class_name, subclass_name, level, ancestry, background,
  strength_score, dexterity_score, constitution_score, intelligence_score, wisdom_score, charisma_score,
  hp_current, hp_max, armor_class, speed_ft, reference_payload, created_at, updated_at
) VALUES (
  $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8,
  $9, $10, $11, $12, $13, $14,
  $15, $16, $17, $18, $19::jsonb, $20, $21
)`

	var ownerSubjectID *string
	if character.OwnerSubjectID != nil {
		value := character.OwnerSubjectID.String()
		ownerSubjectID = &value
	}

	_, err := repository.pool.Exec(ctx, query,
		character.ID.String(),
		ownerSubjectID,
		character.Name,
		character.ClassName,
		character.SubclassName,
		character.Level,
		character.Ancestry,
		character.Background,
		character.AbilityScores.Strength,
		character.AbilityScores.Dexterity,
		character.AbilityScores.Constitution,
		character.AbilityScores.Intelligence,
		character.AbilityScores.Wisdom,
		character.AbilityScores.Charisma,
		character.HitPoints.Current,
		character.HitPoints.Max,
		character.ArmorClass,
		character.SpeedFt,
		[]byte(character.ReferencePayload),
		character.CreatedAt,
		character.UpdatedAt,
	)
	if err != nil {
		return Character{}, fmt.Errorf("insert character: %w", mapCharacterCreateError(err))
	}

	return character, nil
}

func mapCharacterCreateError(err error) error {
	var postgresError *pgconn.PgError
	if !errors.As(err, &postgresError) {
		return err
	}

	isKnownClientDataFailure := postgresError.Code == "22003"
	if postgresError.Code == "23514" {
		_, isKnownClientDataFailure = knownCharacterCheckConstraints[postgresError.ConstraintName]
	}
	if !isKnownClientDataFailure {
		return err
	}

	return fmt.Errorf("%w: %w", ErrInvalidCharacterData, err)
}

func (repository *Repository) GetByID(ctx context.Context, id uuid.UUID) (Character, error) {
	const query = `
SELECT
  id::text,
  owner_subject_id::text,
  name,
  class_name,
  subclass_name,
  level,
  ancestry,
  background,
  strength_score,
  dexterity_score,
  constitution_score,
  intelligence_score,
  wisdom_score,
  charisma_score,
  hp_current,
  hp_max,
  armor_class,
  speed_ft,
  reference_payload,
  created_at,
  updated_at
FROM characters
WHERE id = $1::uuid`

	character, err := scanCharacter(repository.pool.QueryRow(ctx, query, id.String()))
	if errors.Is(err, pgx.ErrNoRows) {
		return Character{}, ErrNotFound
	}
	if err != nil {
		return Character{}, err
	}

	return character, nil
}

func (repository *Repository) GetByIDForOwner(ctx context.Context, id uuid.UUID, ownerID uuid.UUID) (Character, error) {
	const query = `
SELECT
  id::text,
  owner_subject_id::text,
  name,
  class_name,
  subclass_name,
  level,
  ancestry,
  background,
  strength_score,
  dexterity_score,
  constitution_score,
  intelligence_score,
  wisdom_score,
  charisma_score,
  hp_current,
  hp_max,
  armor_class,
  speed_ft,
  reference_payload,
  created_at,
  updated_at
FROM characters
WHERE id = $1::uuid
  AND owner_subject_id = $2::uuid`

	character, err := scanCharacter(repository.pool.QueryRow(ctx, query, id.String(), ownerID.String()))
	if errors.Is(err, pgx.ErrNoRows) {
		return Character{}, ErrNotFound
	}
	if err != nil {
		return Character{}, err
	}

	return character, nil
}

func (repository *Repository) LevelUp(
	ctx context.Context,
	id uuid.UUID,
	ownerID uuid.UUID,
	expectedUpdatedAt time.Time,
	request levelUpRequest,
) (Character, error) {
	tx, err := repository.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Character{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	const selectForUpdate = `
SELECT
  id::text,
  owner_subject_id::text,
  name,
  class_name,
  subclass_name,
  level,
  ancestry,
  background,
  strength_score,
  dexterity_score,
  constitution_score,
  intelligence_score,
  wisdom_score,
  charisma_score,
  hp_current,
  hp_max,
  armor_class,
  speed_ft,
  reference_payload,
  created_at,
  updated_at
FROM characters
WHERE id = $1::uuid
  AND owner_subject_id = $2::uuid
FOR UPDATE`

	persisted, err := scanCharacter(tx.QueryRow(ctx, selectForUpdate, id.String(), ownerID.String()))
	if errors.Is(err, pgx.ErrNoRows) {
		return Character{}, ErrNotFound
	}
	if err != nil {
		return Character{}, err
	}
	if !persisted.UpdatedAt.UTC().Equal(expectedUpdatedAt.UTC()) {
		return Character{}, ErrLevelUpConflict
	}

	updated, err := buildLeveledCharacter(persisted, request)
	if err != nil {
		return Character{}, err
	}
	updated.ID = persisted.ID
	updated.OwnerSubjectID = persisted.OwnerSubjectID
	updated.CreatedAt = persisted.CreatedAt
	updated.UpdatedAt = time.Now().UTC()
	if !updated.UpdatedAt.After(persisted.UpdatedAt) {
		updated.UpdatedAt = persisted.UpdatedAt.Add(time.Microsecond)
	}

	const update = `
UPDATE characters
SET
  class_name = $3,
  subclass_name = $4,
  level = $5,
  strength_score = $6,
  dexterity_score = $7,
  constitution_score = $8,
  intelligence_score = $9,
  wisdom_score = $10,
  charisma_score = $11,
  hp_current = $12,
  hp_max = $13,
  armor_class = $14,
  speed_ft = $15,
  reference_payload = $16::jsonb,
  updated_at = $17
WHERE id = $1::uuid
  AND owner_subject_id = $2::uuid
RETURNING updated_at`
	if err := tx.QueryRow(ctx, update,
		updated.ID.String(), ownerID.String(), updated.ClassName, updated.SubclassName, updated.Level,
		updated.AbilityScores.Strength, updated.AbilityScores.Dexterity, updated.AbilityScores.Constitution,
		updated.AbilityScores.Intelligence, updated.AbilityScores.Wisdom, updated.AbilityScores.Charisma,
		updated.HitPoints.Current, updated.HitPoints.Max, updated.ArmorClass, updated.SpeedFt,
		[]byte(updated.ReferencePayload), updated.UpdatedAt,
	).Scan(&updated.UpdatedAt); err != nil {
		return Character{}, mapCharacterCreateError(err)
	}
	if err := tx.Commit(ctx); err != nil {
		return Character{}, err
	}
	return updated, nil
}

func (repository *Repository) GetByIDForPartyGM(
	ctx context.Context,
	id uuid.UUID,
	partyID uuid.UUID,
	requesterID uuid.UUID,
) (Character, error) {
	const query = `
SELECT
  c.id::text,
  c.owner_subject_id::text,
  c.name,
  c.class_name,
  c.subclass_name,
  c.level,
  c.ancestry,
  c.background,
  c.strength_score,
  c.dexterity_score,
  c.constitution_score,
  c.intelligence_score,
  c.wisdom_score,
  c.charisma_score,
  c.hp_current,
  c.hp_max,
  c.armor_class,
  c.speed_ft,
  c.reference_payload,
  c.created_at,
  c.updated_at
FROM characters c
JOIN party_memberships linked_membership
  ON linked_membership.character_id = c.id
 AND linked_membership.party_id = $2::uuid
 AND linked_membership.role = 'player'
JOIN party_memberships requester_membership
  ON requester_membership.party_id = linked_membership.party_id
 AND requester_membership.user_id = $3::uuid
 AND requester_membership.role = 'gm'
WHERE c.id = $1::uuid`

	character, err := scanCharacter(repository.pool.QueryRow(
		ctx,
		query,
		id.String(),
		partyID.String(),
		requesterID.String(),
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return Character{}, ErrNotFound
	}
	if err != nil {
		return Character{}, err
	}

	return character, nil
}

func (repository *Repository) ListSummariesForOwner(ctx context.Context, ownerID uuid.UUID) ([]CharacterSummary, error) {
	const query = `
SELECT
  id::text,
  name,
  class_name,
  subclass_name,
  level,
  ancestry,
  background,
  hp_current,
  hp_max,
  armor_class,
  speed_ft,
  reference_payload #>> '{summary,portraitAssetId}',
  reference_payload #>> '{summary,portraitAlt}',
  COALESCE(reference_payload #> '{summary,featuredAbilities}', '[]'::jsonb),
  COALESCE(reference_payload #>> '{summary,landingConcept}', ''),
  updated_at
FROM characters
WHERE owner_subject_id = $1::uuid
ORDER BY updated_at DESC, id DESC`

	rows, err := repository.pool.Query(ctx, query, ownerID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var summaries []CharacterSummary
	for rows.Next() {
		summary, err := scanCharacterSummary(rows)
		if err != nil {
			return nil, err
		}
		summaries = append(summaries, summary)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return summaries, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanCharacter(row rowScanner) (Character, error) {
	var id string
	var ownerSubjectID *string
	var character Character
	var referencePayload []byte
	var createdAt time.Time
	var updatedAt time.Time

	err := row.Scan(
		&id,
		&ownerSubjectID,
		&character.Name,
		&character.ClassName,
		&character.SubclassName,
		&character.Level,
		&character.Ancestry,
		&character.Background,
		&character.AbilityScores.Strength,
		&character.AbilityScores.Dexterity,
		&character.AbilityScores.Constitution,
		&character.AbilityScores.Intelligence,
		&character.AbilityScores.Wisdom,
		&character.AbilityScores.Charisma,
		&character.HitPoints.Current,
		&character.HitPoints.Max,
		&character.ArmorClass,
		&character.SpeedFt,
		&referencePayload,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		return Character{}, err
	}

	parsedID, err := uuid.Parse(id)
	if err != nil {
		return Character{}, err
	}
	character.ID = parsedID

	if ownerSubjectID != nil {
		parsedOwnerSubjectID, err := uuid.Parse(*ownerSubjectID)
		if err != nil {
			return Character{}, err
		}
		character.OwnerSubjectID = &parsedOwnerSubjectID
	}

	character.ReferencePayload = append(json.RawMessage(nil), referencePayload...)
	character.CreatedAt = createdAt
	character.UpdatedAt = updatedAt

	return character, nil
}

func scanCharacterSummary(row rowScanner) (CharacterSummary, error) {
	var id string
	var summary CharacterSummary
	var featuredAbilities []byte

	err := row.Scan(
		&id,
		&summary.Name,
		&summary.ClassName,
		&summary.SubclassName,
		&summary.Level,
		&summary.Ancestry,
		&summary.Background,
		&summary.HitPoints.Current,
		&summary.HitPoints.Max,
		&summary.ArmorClass,
		&summary.SpeedFt,
		&summary.PortraitAssetID,
		&summary.PortraitAlt,
		&featuredAbilities,
		&summary.LandingConcept,
		&summary.UpdatedAt,
	)
	if err != nil {
		return CharacterSummary{}, err
	}

	if len(featuredAbilities) > 0 {
		if err := json.Unmarshal(featuredAbilities, &summary.FeaturedAbilities); err != nil {
			return CharacterSummary{}, err
		}
	}
	if summary.FeaturedAbilities == nil {
		summary.FeaturedAbilities = []string{}
	}

	parsedID, err := uuid.Parse(id)
	if err != nil {
		return CharacterSummary{}, err
	}
	summary.ID = parsedID

	return summary, nil
}
