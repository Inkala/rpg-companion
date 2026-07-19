package characters

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

func TestSlice3RepositoryV2RoundTripOwnerAndPartyGMPrivacy(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	repository := NewRepository(pool)
	ownerID := uuid.New()
	gmID := uuid.New()
	foreignID := uuid.New()
	insertTestUser(t, pool, ownerID, "v2-owner")
	insertTestUser(t, pool, gmID, "v2-gm")
	insertTestUser(t, pool, foreignID, "v2-foreign")

	character, err := characterFromV2Request(slice3V2Request(), time.Date(2026, 7, 19, 20, 30, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	character.OwnerSubjectID = &ownerID
	created, err := repository.Create(context.Background(), character)
	if err != nil {
		t.Fatalf("persist V2: %v", err)
	}
	loaded, err := repository.GetByIDForOwner(context.Background(), character.ID, ownerID)
	if err != nil {
		t.Fatalf("owner V2 read: %v", err)
	}
	var createdPayload, loadedPayload any
	if json.Unmarshal(created.ReferencePayload, &createdPayload) != nil || json.Unmarshal(loaded.ReferencePayload, &loadedPayload) != nil {
		t.Fatal("V2 PostgreSQL round-trip payload is not JSON")
	}
	createdComparable, loadedComparable := created, loaded
	createdComparable.ReferencePayload, loadedComparable.ReferencePayload = nil, nil
	createdComparable.CreatedAt, createdComparable.UpdatedAt = time.Time{}, time.Time{}
	loadedComparable.CreatedAt, loadedComparable.UpdatedAt = time.Time{}, time.Time{}
	if !reflect.DeepEqual(loadedComparable, createdComparable) || !reflect.DeepEqual(loadedPayload, createdPayload) ||
		!loaded.CreatedAt.Equal(created.CreatedAt) || !loaded.UpdatedAt.Equal(created.UpdatedAt) {
		t.Fatalf("V2 PostgreSQL round-trip changed fields\ncreated=%+v\nloaded=%+v", createdComparable, loadedComparable)
	}
	parsed, err := parseStoredCharacter(loaded)
	if err != nil || parsed.V2 == nil {
		t.Fatalf("round-tripped V2 failed strict validation: %v", err)
	}
	if loaded.HitPoints.Current != loaded.HitPoints.Max || loaded.HitPoints.Max != parsed.V2.HitPointProgression.Maximum.Value {
		t.Fatalf("current/max HP parity failed: %+v", loaded.HitPoints)
	}
	if _, err := repository.GetByIDForOwner(context.Background(), character.ID, foreignID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("foreign owner read was distinguishable: %v", err)
	}

	partyID := uuid.New()
	insertCharacterRepositoryParty(t, pool, partyID, "V2 Party", gmID)
	insertCharacterRepositoryMembership(t, pool, uuid.NewString(), partyID, gmID, "gm", nil)
	insertCharacterRepositoryMembership(t, pool, uuid.NewString(), partyID, ownerID, "player", &character.ID)
	gmLoaded, err := repository.GetByIDForPartyGM(context.Background(), character.ID, partyID, gmID)
	if err != nil || !reflect.DeepEqual(gmLoaded, loaded) {
		t.Fatalf("authorized Party-GM V2 read failed: %+v %v", gmLoaded, err)
	}
	if _, err := repository.GetByIDForPartyGM(context.Background(), character.ID, partyID, foreignID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("foreign Party-GM read was distinguishable: %v", err)
	}

	var dataType string
	if err := pool.QueryRow(context.Background(), `SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='characters' AND column_name='reference_payload'`).Scan(&dataType); err != nil {
		t.Fatal(err)
	}
	if dataType != "jsonb" {
		t.Fatalf("existing reference_payload column is %q, want jsonb", dataType)
	}
}

func TestSlice3RepositoryV2FailedInsertLeavesNoPartialRowOrMembership(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	repository := NewRepository(pool)
	validOwnerID := uuid.New()
	insertTestUser(t, pool, validOwnerID, "rollback-owner")
	character, err := characterFromV2Request(slice3V2Request(), time.Now())
	if err != nil {
		t.Fatal(err)
	}
	missingOwnerID := uuid.New()
	character.OwnerSubjectID = &missingOwnerID

	_, err = repository.Create(context.Background(), character)
	if err == nil || errors.Is(err, ErrInvalidCharacterData) {
		t.Fatalf("expected wrapped foreign-key database failure, got %v", err)
	}
	var postgresError *pgconn.PgError
	if !errors.As(err, &postgresError) || postgresError.Code != "23503" {
		t.Fatalf("expected inspectable PostgreSQL foreign-key error, got %v", err)
	}
	if !strings.Contains(err.Error(), "insert character") {
		t.Fatalf("repository error lost useful internal context: %v", err)
	}
	var rowCount, membershipCount int
	if err := pool.QueryRow(context.Background(), `SELECT count(*) FROM characters WHERE id=$1`, character.ID).Scan(&rowCount); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(context.Background(), `SELECT count(*) FROM party_memberships WHERE character_id=$1`, character.ID).Scan(&membershipCount); err != nil {
		t.Fatal(err)
	}
	if rowCount != 0 || membershipCount != 0 {
		t.Fatalf("failed V2 insert left partial persistence: rows=%d memberships=%d", rowCount, membershipCount)
	}
}

func TestSlice3RepositoryV2StoresTopLevelAndJSONBParity(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	repository := NewRepository(pool)
	ownerID := uuid.New()
	insertTestUser(t, pool, ownerID, "parity-owner")
	character, err := characterFromV2Request(slice3V2Request(), time.Now())
	if err != nil {
		t.Fatal(err)
	}
	character.OwnerSubjectID = &ownerID
	if _, err := repository.Create(context.Background(), character); err != nil {
		t.Fatal(err)
	}

	var name, className, raceName string
	var hpCurrent, hpMax, armorClass, speedFt int
	var payload []byte
	if err := pool.QueryRow(context.Background(), `SELECT name,class_name,ancestry,hp_current,hp_max,armor_class,speed_ft,reference_payload FROM characters WHERE id=$1`, character.ID).Scan(
		&name, &className, &raceName, &hpCurrent, &hpMax, &armorClass, &speedFt, &payload,
	); err != nil {
		t.Fatal(err)
	}
	var sheet CharacterSheetV2
	if err := json.Unmarshal(payload, &sheet); err != nil {
		t.Fatal(err)
	}
	if name != sheet.Identity.Name || className != character.ClassName || raceName != character.Ancestry ||
		hpCurrent != sheet.HitPointProgression.Maximum.Value || hpMax != sheet.HitPointProgression.Maximum.Value ||
		armorClass != sheet.Combat.ArmorClass.Value || speedFt != sheet.Combat.SpeedFt.Value {
		t.Fatal("top-level columns do not match authoritative V2 JSONB")
	}
}

func TestSlice3RepositoryV2RoundTripsPayloadAboveV1StoredLimit(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	repository := NewRepository(pool)
	ownerID := uuid.New()
	insertTestUser(t, pool, ownerID, "large-v2-owner")
	request := slice3LargeSemanticV2Request()
	requestPayload, err := json.Marshal(request)
	if err != nil {
		t.Fatal(err)
	}
	if len(requestPayload) > maxV2RequestPayloadBytes {
		t.Fatalf("large V2 request is %d bytes, above request limit %d", len(requestPayload), maxV2RequestPayloadBytes)
	}
	character, err := characterFromV2Request(request, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	character.OwnerSubjectID = &ownerID
	if len(character.ReferencePayload) <= maxV1ReferencePayloadBytes || len(character.ReferencePayload) > maxV2StoredReferencePayloadBytes {
		t.Fatalf("generated V2 payload is %d bytes, want (%d,%d]", len(character.ReferencePayload), maxV1ReferencePayloadBytes, maxV2StoredReferencePayloadBytes)
	}
	if _, err := parseStoredCharacter(character); err != nil {
		t.Fatalf("valid large V2 failed before persistence: %v", err)
	}
	if _, err := repository.Create(context.Background(), character); err != nil {
		t.Fatalf("persist valid large V2: %v", err)
	}
	loaded, err := repository.GetByIDForOwner(context.Background(), character.ID, ownerID)
	if err != nil {
		t.Fatalf("load valid large V2: %v", err)
	}
	if len(loaded.ReferencePayload) <= maxV1ReferencePayloadBytes {
		t.Fatalf("JSONB-normalized V2 payload is %d bytes, not above V1 limit %d", len(loaded.ReferencePayload), maxV1ReferencePayloadBytes)
	}
	parsed, err := parseStoredCharacter(loaded)
	if err != nil || parsed.V2 == nil {
		t.Fatalf("large V2 did not round-trip through PostgreSQL: %v", err)
	}
	if len(parsed.V2.Other) != len(request.Other) {
		t.Fatalf("large V2 Other entry count changed: got %d want %d", len(parsed.V2.Other), len(request.Other))
	}
	for index, want := range request.Other {
		if got := parsed.V2.Other[index]; got != want {
			t.Fatalf("large V2 semantic entry %d changed: got ID %q with %d description bytes, want ID %q with %d description bytes", index, got.ID, len(got.Description), want.ID, len(want.Description))
		}
	}
	if loaded.Name != character.Name || loaded.HitPoints != character.HitPoints || loaded.Ancestry != character.Ancestry {
		t.Fatal("large V2 PostgreSQL round-trip changed authoritative fields")
	}
	t.Logf("large V2 bytes: request=%d stored-before-insert=%d loaded-after-jsonb=%d semantic-entries=%d", len(requestPayload), len(character.ReferencePayload), len(loaded.ReferencePayload), len(request.Other))
}

func slice3LargeSemanticV2Request() CreateCharacterV2RequestDTO {
	request := slice3V2Request()
	request.Other = make([]CharacterOtherInput, 16)
	for index := range request.Other {
		id := fmt.Sprintf("large-note-%02d", index)
		marker := fmt.Sprintf("semantic-content-%02d:", index)
		request.Other[index] = CharacterOtherInput{
			ID:          id,
			Title:       fmt.Sprintf("Large semantic note %02d", index),
			Description: marker + strings.Repeat(string(rune('a'+index)), 4380),
		}
	}
	return request
}
