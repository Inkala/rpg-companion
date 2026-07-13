package parties

import (
	"bytes"
	"context"
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/lib/pq"
)

const (
	testGMUserID      = "10000000-0000-0000-0000-000000000001"
	testOtherGMUserID = "10000000-0000-0000-0000-000000000002"
	testPlayerUserID  = "10000000-0000-0000-0000-000000000003"
	testOtherUserID   = "10000000-0000-0000-0000-000000000004"

	testCharacterID      = "20000000-0000-0000-0000-000000000001"
	testOtherCharacterID = "20000000-0000-0000-0000-000000000002"
	testThirdCharacterID = "20000000-0000-0000-0000-000000000003"

	testPartyID        = "30000000-0000-0000-0000-000000000001"
	testOtherPartyID   = "30000000-0000-0000-0000-000000000002"
	testEmptyPartyID   = "30000000-0000-0000-0000-000000000003"
	testCascadePartyID = "30000000-0000-0000-0000-000000000004"
)

var migrationTestNow = time.Date(2026, 7, 12, 12, 0, 0, 0, time.UTC)

func TestPartyMigrationLifecycleAndConstraints(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is not set; set it to a disposable PostgreSQL test database to run party migration tests")
	}

	migrator, pool := setupPartyMigrationTest(t, databaseURL)

	t.Run("migration up creates party tables", func(t *testing.T) {
		for _, relation := range []string{"parties", "party_memberships", "party_invites"} {
			requireRelationExists(t, pool, relation, true)
		}
	})

	seedPartyMigrationUsers(t, pool)
	seedPartyMigrationCharacters(t, pool)
	seedPartyMigrationParties(t, pool)
	seedPartyMigrationMemberships(t, pool)

	t.Run("party name must be trimmed", func(t *testing.T) {
		requireConstraintViolation(t, pool, "parties_name_trimmed_check", `
INSERT INTO parties (id, name, created_by_user_id, created_at, updated_at)
VALUES ('31000000-0000-0000-0000-000000000001', ' Padded Party ', $1::uuid, $2, $2)`,
			testGMUserID, migrationTestNow)
	})

	t.Run("party name must be nonempty", func(t *testing.T) {
		requireConstraintViolation(t, pool, "parties_name_length_check", `
INSERT INTO parties (id, name, created_by_user_id, created_at, updated_at)
VALUES ('31000000-0000-0000-0000-000000000002', '', $1::uuid, $2, $2)`,
			testGMUserID, migrationTestNow)
	})

	t.Run("party name has at most 80 characters", func(t *testing.T) {
		requireConstraintViolation(t, pool, "parties_name_length_check", `
INSERT INTO parties (id, name, created_by_user_id, created_at, updated_at)
VALUES ('31000000-0000-0000-0000-000000000003', $1, $2::uuid, $3, $3)`,
			strings.Repeat("界", 81), testGMUserID, migrationTestNow)
	})

	t.Run("party update cannot precede creation", func(t *testing.T) {
		requireConstraintViolation(t, pool, "parties_updated_at_order_check", `
INSERT INTO parties (id, name, created_by_user_id, created_at, updated_at)
VALUES ('31000000-0000-0000-0000-000000000004', 'Time Travellers', $1::uuid, $2, $3)`,
			testGMUserID, migrationTestNow, migrationTestNow.Add(-time.Second))
	})

	t.Run("membership is unique per party and user", func(t *testing.T) {
		requireConstraintViolation(t, pool, "party_memberships_party_id_user_id_key", `
INSERT INTO party_memberships (id, party_id, user_id, role, character_id, joined_at)
VALUES ('41000000-0000-0000-0000-000000000001', $1::uuid, $2::uuid, 'player', $3::uuid, $4)`,
			testPartyID, testPlayerUserID, testOtherCharacterID, migrationTestNow)
	})

	t.Run("character can appear in only one membership", func(t *testing.T) {
		requireConstraintViolation(t, pool, "party_memberships_character_id_key", `
INSERT INTO party_memberships (id, party_id, user_id, role, character_id, joined_at)
VALUES ('41000000-0000-0000-0000-000000000002', $1::uuid, $2::uuid, 'player', $3::uuid, $4)`,
			testOtherPartyID, testOtherUserID, testCharacterID, migrationTestNow)
	})

	t.Run("party can have only one GM", func(t *testing.T) {
		requireConstraintViolation(t, pool, "party_memberships_one_gm_per_party_idx", `
INSERT INTO party_memberships (id, party_id, user_id, role, character_id, joined_at)
VALUES ('41000000-0000-0000-0000-000000000003', $1::uuid, $2::uuid, 'gm', NULL, $3)`,
			testPartyID, testOtherGMUserID, migrationTestNow)
	})

	t.Run("GM membership cannot have a character", func(t *testing.T) {
		requireConstraintViolation(t, pool, "party_memberships_role_character_check", `
INSERT INTO party_memberships (id, party_id, user_id, role, character_id, joined_at)
VALUES ('41000000-0000-0000-0000-000000000004', $1::uuid, $2::uuid, 'gm', $3::uuid, $4)`,
			testEmptyPartyID, testGMUserID, testOtherCharacterID, migrationTestNow)
	})

	t.Run("player membership requires a character", func(t *testing.T) {
		requireConstraintViolation(t, pool, "party_memberships_role_character_check", `
INSERT INTO party_memberships (id, party_id, user_id, role, character_id, joined_at)
VALUES ('41000000-0000-0000-0000-000000000005', $1::uuid, $2::uuid, 'player', NULL, $3)`,
			testEmptyPartyID, testPlayerUserID, migrationTestNow)
	})

	t.Run("membership role must be GM or player", func(t *testing.T) {
		requireConstraintViolation(t, pool, "party_memberships_role_check", `
INSERT INTO party_memberships (id, party_id, user_id, role, character_id, joined_at)
VALUES ('41000000-0000-0000-0000-000000000006', $1::uuid, $2::uuid, 'observer', NULL, $3)`,
			testEmptyPartyID, testPlayerUserID, migrationTestNow)
	})

	t.Run("invite token hash must contain exactly 32 bytes", func(t *testing.T) {
		requireConstraintViolation(t, pool, "party_invites_token_hash_length_check", `
INSERT INTO party_invites (id, party_id, created_by_user_id, token_hash, created_at, expires_at, revoked_at)
VALUES ('51000000-0000-0000-0000-000000000001', $1::uuid, $2::uuid, $3, $4, $5, NULL)`,
			testPartyID, testGMUserID, bytes.Repeat([]byte{0x01}, 31), migrationTestNow, migrationTestNow.Add(7*24*time.Hour))
	})

	t.Run("invite expiry must follow creation", func(t *testing.T) {
		requireConstraintViolation(t, pool, "party_invites_expiry_order_check", `
INSERT INTO party_invites (id, party_id, created_by_user_id, token_hash, created_at, expires_at, revoked_at)
VALUES ('51000000-0000-0000-0000-000000000002', $1::uuid, $2::uuid, $3, $4, $4, NULL)`,
			testPartyID, testGMUserID, bytes.Repeat([]byte{0x02}, 32), migrationTestNow)
	})

	t.Run("invite revocation cannot precede creation", func(t *testing.T) {
		requireConstraintViolation(t, pool, "party_invites_revocation_order_check", `
INSERT INTO party_invites (id, party_id, created_by_user_id, token_hash, created_at, expires_at, revoked_at)
VALUES ('51000000-0000-0000-0000-000000000003', $1::uuid, $2::uuid, $3, $4, $5, $6)`,
			testPartyID, testGMUserID, bytes.Repeat([]byte{0x03}, 32), migrationTestNow,
			migrationTestNow.Add(7*24*time.Hour), migrationTestNow.Add(-time.Second))
	})

	insertTestInvite(t, pool, "50000000-0000-0000-0000-000000000001", testPartyID, testGMUserID, 0x10)

	t.Run("invite token hash is unique", func(t *testing.T) {
		requireConstraintViolation(t, pool, "party_invites_token_hash_key", `
INSERT INTO party_invites (id, party_id, created_by_user_id, token_hash, created_at, expires_at, revoked_at)
VALUES ('51000000-0000-0000-0000-000000000004', $1::uuid, $2::uuid, $3, $4, $5, NULL)`,
			testOtherPartyID, testOtherGMUserID, bytes.Repeat([]byte{0x10}, 32), migrationTestNow,
			migrationTestNow.Add(7*24*time.Hour))
	})

	t.Run("party can have only one non-revoked invite", func(t *testing.T) {
		requireConstraintViolation(t, pool, "party_invites_one_non_revoked_per_party_idx", `
INSERT INTO party_invites (id, party_id, created_by_user_id, token_hash, created_at, expires_at, revoked_at)
VALUES ('51000000-0000-0000-0000-000000000005', $1::uuid, $2::uuid, $3, $4, $5, NULL)`,
			testPartyID, testGMUserID, bytes.Repeat([]byte{0x11}, 32), migrationTestNow,
			migrationTestNow.Add(7*24*time.Hour))
	})

	t.Run("revoked invite permits a replacement", func(t *testing.T) {
		_, err := pool.Exec(context.Background(), `
UPDATE party_invites SET revoked_at = $1 WHERE id = '50000000-0000-0000-0000-000000000001'`, migrationTestNow.Add(time.Hour))
		if err != nil {
			t.Fatalf("revoke invite: %v", err)
		}
		insertTestInvite(t, pool, "50000000-0000-0000-0000-000000000002", testPartyID, testGMUserID, 0x12)
	})

	t.Run("character deletion is restricted while linked", func(t *testing.T) {
		requireConstraintViolation(t, pool, "party_memberships_character_id_fkey", `
DELETE FROM characters WHERE id = $1::uuid`, testCharacterID)
	})

	t.Run("party deletion cascades memberships and invites", func(t *testing.T) {
		insertTestParty(t, pool, testCascadePartyID, "Cascade Party", testOtherUserID)
		insertTestMembership(t, pool, "40000000-0000-0000-0000-000000000004", testCascadePartyID, testOtherUserID, "gm", nil)
		insertTestInvite(t, pool, "50000000-0000-0000-0000-000000000004", testCascadePartyID, testOtherUserID, 0x20)

		if _, err := pool.Exec(context.Background(), `DELETE FROM parties WHERE id = $1::uuid`, testCascadePartyID); err != nil {
			t.Fatalf("delete party: %v", err)
		}
		requireRowCount(t, pool, "party_memberships", "party_id", testCascadePartyID, 0)
		requireRowCount(t, pool, "party_invites", "party_id", testCascadePartyID, 0)
	})

	t.Run("migration down removes only party tables", func(t *testing.T) {
		if err := migrator.Steps(-1); err != nil {
			t.Fatalf("migrate party schema down: %v", err)
		}

		for _, relation := range []string{"party_invites", "party_memberships", "parties"} {
			requireRelationExists(t, pool, relation, false)
		}
		for _, relation := range []string{"users", "user_sessions", "characters"} {
			requireRelationExists(t, pool, relation, true)
		}
	})

	t.Run("migration up succeeds again after down", func(t *testing.T) {
		if err := migrator.Steps(1); err != nil {
			t.Fatalf("migrate party schema up again: %v", err)
		}
		for _, relation := range []string{"parties", "party_memberships", "party_invites"} {
			requireRelationExists(t, pool, relation, true)
		}
	})
}

func setupPartyMigrationTest(t *testing.T, databaseURL string) (*migrate.Migrate, *pgxpool.Pool) {
	t.Helper()

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if _, err := db.Exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"); err != nil {
		t.Fatalf("reset test database: %v", err)
	}

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		t.Fatalf("create migration driver: %v", err)
	}
	migrationsPath, err := findPartyMigrationsPath()
	if err != nil {
		t.Fatalf("find migrations path: %v", err)
	}
	migrator, err := migrate.NewWithDatabaseInstance("file://"+migrationsPath, "postgres", driver)
	if err != nil {
		t.Fatalf("create migrator: %v", err)
	}
	t.Cleanup(func() { _, _ = migrator.Close() })
	if err := migrator.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		t.Fatalf("migrate schema up: %v", err)
	}

	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		t.Fatalf("connect to test database: %v", err)
	}
	t.Cleanup(pool.Close)

	return migrator, pool
}

func findPartyMigrationsPath() (string, error) {
	workingDirectory, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for current := workingDirectory; ; current = filepath.Dir(current) {
		candidate := filepath.Join(current, "migrations")
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate, nil
		}
		parent := filepath.Dir(current)
		if parent == current {
			return "", os.ErrNotExist
		}
	}
}

func seedPartyMigrationUsers(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	users := []struct {
		id       string
		username string
	}{
		{id: testGMUserID, username: "gm-one"},
		{id: testOtherGMUserID, username: "gm-two"},
		{id: testPlayerUserID, username: "player-one"},
		{id: testOtherUserID, username: "player-two"},
	}
	for _, user := range users {
		_, err := pool.Exec(context.Background(), `
INSERT INTO users (
  id, username, username_canonical, email_canonical, password_hash, password_hash_algorithm, created_at, updated_at
) VALUES ($1::uuid, $2, $2, $2 || '@example.com', 'test-password-hash', 'argon2id', $3, $3)`,
			user.id, user.username, migrationTestNow)
		if err != nil {
			t.Fatalf("insert test user: %v", err)
		}
	}
}

func seedPartyMigrationCharacters(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	characters := []struct {
		id      string
		ownerID string
		name    string
	}{
		{id: testCharacterID, ownerID: testPlayerUserID, name: "Linked Hero"},
		{id: testOtherCharacterID, ownerID: testPlayerUserID, name: "Other Hero"},
		{id: testThirdCharacterID, ownerID: testOtherUserID, name: "Third Hero"},
	}
	for _, character := range characters {
		_, err := pool.Exec(context.Background(), `
INSERT INTO characters (
  id, owner_subject_id, name, class_name, subclass_name, level, ancestry, background,
  strength_score, dexterity_score, constitution_score, intelligence_score, wisdom_score, charisma_score,
  hp_current, hp_max, armor_class, speed_ft, reference_payload, created_at, updated_at
) VALUES (
  $1::uuid, $2::uuid, $3, 'Fighter', NULL, 1, 'Human', 'Soldier',
  10, 10, 10, 10, 10, 10, 10, 10, 10, 30, '{}'::jsonb, $4, $4
)`, character.id, character.ownerID, character.name, migrationTestNow)
		if err != nil {
			t.Fatalf("insert test character: %v", err)
		}
	}
}

func seedPartyMigrationParties(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	insertTestParty(t, pool, testPartyID, "Lantern Keep", testGMUserID)
	insertTestParty(t, pool, testOtherPartyID, "Moon Watch", testOtherGMUserID)
	insertTestParty(t, pool, testEmptyPartyID, "Empty Hall", testGMUserID)
}

func seedPartyMigrationMemberships(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	insertTestMembership(t, pool, "40000000-0000-0000-0000-000000000001", testPartyID, testGMUserID, "gm", nil)
	insertTestMembership(t, pool, "40000000-0000-0000-0000-000000000002", testOtherPartyID, testOtherGMUserID, "gm", nil)
	characterID := testCharacterID
	insertTestMembership(t, pool, "40000000-0000-0000-0000-000000000003", testPartyID, testPlayerUserID, "player", &characterID)
}

func insertTestParty(t *testing.T, pool *pgxpool.Pool, id string, name string, creatorID string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
INSERT INTO parties (id, name, created_by_user_id, created_at, updated_at)
VALUES ($1::uuid, $2, $3::uuid, $4, $4)`, id, name, creatorID, migrationTestNow)
	if err != nil {
		t.Fatalf("insert test party: %v", err)
	}
}

func insertTestMembership(t *testing.T, pool *pgxpool.Pool, id string, partyID string, userID string, role string, characterID *string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
INSERT INTO party_memberships (id, party_id, user_id, role, character_id, joined_at)
VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::uuid, $6)`, id, partyID, userID, role, characterID, migrationTestNow)
	if err != nil {
		t.Fatalf("insert test membership: %v", err)
	}
}

func insertTestInvite(t *testing.T, pool *pgxpool.Pool, id string, partyID string, creatorID string, tokenByte byte) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
INSERT INTO party_invites (id, party_id, created_by_user_id, token_hash, created_at, expires_at, revoked_at)
VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, NULL)`, id, partyID, creatorID,
		bytes.Repeat([]byte{tokenByte}, 32), migrationTestNow, migrationTestNow.Add(7*24*time.Hour))
	if err != nil {
		t.Fatalf("insert test invite: %v", err)
	}
}

func requireConstraintViolation(t *testing.T, pool *pgxpool.Pool, constraintName string, query string, args ...any) {
	t.Helper()
	_, err := pool.Exec(context.Background(), query, args...)
	if err == nil {
		t.Fatalf("expected constraint %s to reject the statement", constraintName)
	}
	var databaseError *pgconn.PgError
	if !errors.As(err, &databaseError) {
		t.Fatalf("expected PostgreSQL constraint error for %s, got %T", constraintName, err)
	}
	if databaseError.ConstraintName != constraintName {
		t.Fatalf("expected constraint %s, got %s", constraintName, databaseError.ConstraintName)
	}
}

func requireRelationExists(t *testing.T, pool *pgxpool.Pool, relation string, want bool) {
	t.Helper()
	var exists bool
	if err := pool.QueryRow(context.Background(), `SELECT to_regclass($1) IS NOT NULL`, "public."+relation).Scan(&exists); err != nil {
		t.Fatalf("inspect relation %s: %v", relation, err)
	}
	if exists != want {
		t.Fatalf("relation %s existence: expected %t, got %t", relation, want, exists)
	}
}

func requireRowCount(t *testing.T, pool *pgxpool.Pool, table string, column string, value string, want int) {
	t.Helper()
	allowed := map[string]bool{
		"party_memberships.party_id": true,
		"party_invites.party_id":     true,
	}
	if !allowed[table+"."+column] {
		t.Fatal("unsupported row-count query")
	}
	query := "SELECT count(*) FROM " + table + " WHERE " + column + " = $1::uuid"
	var count int
	if err := pool.QueryRow(context.Background(), query, value).Scan(&count); err != nil {
		t.Fatalf("count rows in %s: %v", table, err)
	}
	if count != want {
		t.Fatalf("expected %d rows in %s, got %d", want, table, count)
	}
}
