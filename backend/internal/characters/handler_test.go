package characters

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/lib/pq"
)

func TestCharacterHTTPPersistence(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := NewHandler(NewRepository(pool))
	mux := http.NewServeMux()
	mux.HandleFunc("POST /characters", handler.Create)
	mux.HandleFunc("GET /characters/{id}", handler.GetByID)

	createRecorder := httptest.NewRecorder()
	createRequest := httptest.NewRequest(http.MethodPost, "/characters", bytes.NewReader(validCharacterJSON()))
	mux.ServeHTTP(createRecorder, createRequest)

	if createRecorder.Code != http.StatusCreated {
		t.Fatalf("expected create status %d, got %d with body %s", http.StatusCreated, createRecorder.Code, createRecorder.Body.String())
	}

	var created characterResponse
	if err := json.NewDecoder(createRecorder.Body).Decode(&created); err != nil {
		t.Fatalf("decode create response: %v", err)
	}

	getRecorder := httptest.NewRecorder()
	getRequest := httptest.NewRequest(http.MethodGet, "/characters/"+created.ID, nil)
	mux.ServeHTTP(getRecorder, getRequest)

	if getRecorder.Code != http.StatusOK {
		t.Fatalf("expected get status %d, got %d with body %s", http.StatusOK, getRecorder.Code, getRecorder.Body.String())
	}

	var loaded characterResponse
	if err := json.NewDecoder(getRecorder.Body).Decode(&loaded); err != nil {
		t.Fatalf("decode get response: %v", err)
	}

	if loaded.ID != created.ID {
		t.Errorf("expected id %q, got %q", created.ID, loaded.ID)
	}
	if loaded.OwnerSubjectID != nil {
		t.Errorf("expected nil ownerSubjectId, got %v", *loaded.OwnerSubjectID)
	}
	if loaded.Name != "Mara Vale" {
		t.Errorf("expected name Mara Vale, got %q", loaded.Name)
	}
	if loaded.HitPoints.Current != 26 || loaded.HitPoints.Max != 26 {
		t.Errorf("expected HP 26/26, got %d/%d", loaded.HitPoints.Current, loaded.HitPoints.Max)
	}
	if string(loaded.ReferencePayload) == "" {
		t.Error("expected referencePayload to be present")
	}
}

func TestCharacterHTTPValidation(t *testing.T) {
	pool := setupIntegrationDatabase(t)
	handler := NewHandler(NewRepository(pool))
	mux := http.NewServeMux()
	mux.HandleFunc("POST /characters", handler.Create)
	mux.HandleFunc("GET /characters/{id}", handler.GetByID)

	tests := []struct {
		name   string
		method string
		path   string
		body   []byte
		want   int
	}{
		{
			name:   "malformed JSON",
			method: http.MethodPost,
			path:   "/characters",
			body:   []byte(`{"name":`),
			want:   http.StatusBadRequest,
		},
		{
			name:   "invalid character fields",
			method: http.MethodPost,
			path:   "/characters",
			body: []byte(`{
				"name": "",
				"className": "Ranger",
				"level": 0,
				"ancestry": "Human",
				"background": "Outlander",
				"abilityScores": {"strength":10,"dexterity":16,"constitution":14,"intelligence":10,"wisdom":14,"charisma":8},
				"hitPoints": {"current": 30, "max": 26},
				"armorClass": 14,
				"speedFt": 30,
				"referencePayload": {"actions":[]}
			}`),
			want: http.StatusBadRequest,
		},
		{
			name:   "malformed UUID path",
			method: http.MethodGet,
			path:   "/characters/not-a-uuid",
			want:   http.StatusBadRequest,
		},
		{
			name:   "missing character",
			method: http.MethodGet,
			path:   "/characters/00000000-0000-0000-0000-000000000000",
			want:   http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(tt.method, tt.path, bytes.NewReader(tt.body))
			mux.ServeHTTP(recorder, request)

			if recorder.Code != tt.want {
				t.Fatalf("expected status %d, got %d with body %s", tt.want, recorder.Code, recorder.Body.String())
			}
		})
	}
}

func setupIntegrationDatabase(t *testing.T) *pgxpool.Pool {
	t.Helper()

	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is not set; set it to a disposable PostgreSQL test database to run persistence integration tests")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	t.Cleanup(cancel)

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("connect to test database: %v", err)
	}
	t.Cleanup(pool.Close)

	if err := resetTestDatabase(ctx, pool); err != nil {
		t.Fatalf("reset test database: %v", err)
	}

	if err := runMigrations(databaseURL); err != nil {
		t.Fatalf("run migrations: %v", err)
	}

	return pool
}

func resetTestDatabase(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, "DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
	return err
}

func runMigrations(databaseURL string) error {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return err
	}
	defer db.Close()

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return err
	}

	migrationsPath, err := findMigrationsPath()
	if err != nil {
		return err
	}

	migrator, err := migrate.NewWithDatabaseInstance("file://"+migrationsPath, "postgres", driver)
	if err != nil {
		return err
	}
	defer migrator.Close()

	if err := migrator.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return err
	}
	return nil
}

func findMigrationsPath() (string, error) {
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

func validCharacterJSON() []byte {
	return []byte(`{
		"ownerSubjectId": null,
		"name": "Mara Vale",
		"className": "Ranger",
		"subclassName": "Hunter",
		"level": 3,
		"ancestry": "Human",
		"background": "Outlander",
		"abilityScores": {
			"strength": 10,
			"dexterity": 16,
			"constitution": 14,
			"intelligence": 10,
			"wisdom": 14,
			"charisma": 8
		},
		"hitPoints": {
			"current": 26,
			"max": 26
		},
		"armorClass": 14,
		"speedFt": 30,
		"referencePayload": {
			"actions": [{"name":"Longbow"}],
			"features": [{"name":"Colossus Slayer"}],
			"spells": [{"name":"Hunter's Mark"}]
		}
	}`)
}
