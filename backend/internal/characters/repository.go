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
		return Character{}, mapCharacterCreateError(err)
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
		&summary.UpdatedAt,
	)
	if err != nil {
		return CharacterSummary{}, err
	}

	parsedID, err := uuid.Parse(id)
	if err != nil {
		return CharacterSummary{}, err
	}
	summary.ID = parsedID

	return summary, nil
}
