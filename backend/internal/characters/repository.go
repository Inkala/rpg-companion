package characters

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("character not found")

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
		return Character{}, err
	}

	return character, nil
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
