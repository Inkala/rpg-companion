package characters

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

func TestMapCharacterCreateErrorMapsKnownPostgresClientDataFailures(t *testing.T) {
	knownConstraints := []string{
		"characters_level_check",
		"characters_hp_current_check",
		"characters_hp_max_check",
		"characters_armor_class_check",
		"characters_speed_ft_check",
		"characters_reference_payload_check",
		"characters_check",
	}

	for _, constraintName := range knownConstraints {
		t.Run(constraintName, func(t *testing.T) {
			postgresError := &pgconn.PgError{
				Code:           "23514",
				ConstraintName: constraintName,
				Message:        "must-not-be-exposed",
				Detail:         "rejected-value-must-not-be-exposed",
			}

			mapped := mapCharacterCreateError(postgresError)

			if !errors.Is(mapped, ErrInvalidCharacterData) {
				t.Fatalf("expected %s to map to ErrInvalidCharacterData, got %v", constraintName, mapped)
			}
			var preserved *pgconn.PgError
			if !errors.As(mapped, &preserved) || preserved != postgresError {
				t.Fatalf("expected mapped error to preserve underlying PostgreSQL error, got %v", mapped)
			}
		})
	}

	postgresError := &pgconn.PgError{Code: "22003", Message: "numeric value out of range"}
	mapped := mapCharacterCreateError(postgresError)
	if !errors.Is(mapped, ErrInvalidCharacterData) {
		t.Fatalf("expected numeric out-of-range to map to ErrInvalidCharacterData, got %v", mapped)
	}
	var preserved *pgconn.PgError
	if !errors.As(mapped, &preserved) || preserved != postgresError {
		t.Fatalf("expected mapped error to preserve numeric PostgreSQL error, got %v", mapped)
	}
}

func TestMapCharacterCreateErrorRecognizesWrappedPostgresErrors(t *testing.T) {
	postgresError := &pgconn.PgError{Code: "23514", ConstraintName: "characters_level_check"}
	wrapper := fmt.Errorf("execute character insert: %w", postgresError)

	mapped := mapCharacterCreateError(wrapper)

	if !errors.Is(mapped, ErrInvalidCharacterData) {
		t.Fatalf("expected wrapped PostgreSQL error to map, got %v", mapped)
	}
	var preserved *pgconn.PgError
	if !errors.As(mapped, &preserved) || preserved != postgresError {
		t.Fatalf("expected wrapped PostgreSQL error to remain inspectable, got %v", mapped)
	}
}

func TestMapCharacterCreateErrorLeavesUnrelatedFailuresUnchanged(t *testing.T) {
	connectionError := &net.OpError{Op: "dial", Err: errors.New("connection unavailable")}
	arbitraryError := errors.New("arbitrary failure")
	tests := []struct {
		name  string
		input error
	}{
		{name: "unknown check constraint", input: &pgconn.PgError{Code: "23514", ConstraintName: "characters_future_check"}},
		{name: "foreign key", input: &pgconn.PgError{Code: "23503", ConstraintName: "characters_owner_subject_id_fkey"}},
		{name: "unique violation", input: &pgconn.PgError{Code: "23505", ConstraintName: "characters_pkey"}},
		{name: "connection error", input: connectionError},
		{name: "arbitrary error", input: arbitraryError},
		{name: "context cancellation", input: context.Canceled},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mapped := mapCharacterCreateError(tt.input)
			if errors.Is(mapped, ErrInvalidCharacterData) {
				t.Fatalf("expected unrelated error to remain unrelated, got %v", mapped)
			}
			if mapped != tt.input {
				t.Fatalf("expected unrelated error to be returned unchanged, got %v", mapped)
			}
		})
	}
}

func TestRepositoryCreateMapsOnlyKnownDatabaseFailures(t *testing.T) {
	tests := []struct {
		name           string
		mutate         func(*Character)
		wantInvalid    bool
		wantConstraint string
	}{
		{
			name: "known current HP constraint",
			mutate: func(character *Character) {
				character.HitPoints.Current = -1
			},
			wantInvalid: true, wantConstraint: "characters_hp_current_check",
		},
		{
			name: "known cross-field HP constraint",
			mutate: func(character *Character) {
				character.HitPoints.Current = 11
				character.HitPoints.Max = 10
			},
			wantInvalid: true, wantConstraint: "characters_check",
		},
		{
			name: "unrelated owner foreign key",
			mutate: func(character *Character) {
				ownerID := uuid.New()
				character.OwnerSubjectID = &ownerID
			},
			wantInvalid: false, wantConstraint: "characters_owner_subject_id_fkey",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pool := setupIntegrationDatabase(t)
			repository := NewRepository(pool)
			ownerID := uuid.New()
			insertTestUser(t, pool, ownerID, "repository-user")
			character := validRepositoryCharacter(ownerID)
			tt.mutate(&character)

			_, err := repository.Create(context.Background(), character)
			if err == nil {
				t.Fatal("expected repository creation to fail")
			}
			if errors.Is(err, ErrInvalidCharacterData) != tt.wantInvalid {
				t.Fatalf("expected invalid-data classification %t, got %v", tt.wantInvalid, err)
			}
			var postgresError *pgconn.PgError
			if !errors.As(err, &postgresError) {
				t.Fatalf("expected PostgreSQL error to remain inspectable, got %v", err)
			}
			if tt.wantConstraint != "" && postgresError.ConstraintName != tt.wantConstraint {
				t.Fatalf("expected constraint %q, got %q", tt.wantConstraint, postgresError.ConstraintName)
			}
		})
	}
}

func validRepositoryCharacter(ownerID uuid.UUID) Character {
	now := time.Date(2026, 7, 13, 12, 0, 0, 0, time.UTC)
	return Character{
		ID:             uuid.New(),
		OwnerSubjectID: &ownerID,
		Name:           "Repository Test",
		ClassName:      "Fighter",
		Level:          1,
		Ancestry:       "Human",
		Background:     "Soldier",
		AbilityScores: AbilityScores{
			Strength: 10, Dexterity: 10, Constitution: 10,
			Intelligence: 10, Wisdom: 10, Charisma: 10,
		},
		HitPoints:        HitPoints{Current: 10, Max: 10},
		ArmorClass:       10,
		SpeedFt:          30,
		ReferencePayload: json.RawMessage(`{"schemaVersion":"CharacterSheetV1"}`),
		CreatedAt:        now,
		UpdatedAt:        now,
	}
}
