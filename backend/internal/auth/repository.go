package auth

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrDuplicateUsername = errors.New("username already exists")
	ErrDuplicateEmail    = errors.New("email already exists")
	ErrNotFound          = errors.New("auth record not found")
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (repository *Repository) CreateUser(ctx context.Context, user User) (User, error) {
	const query = `
INSERT INTO users (
  id, username, username_canonical, email_canonical, password_hash, password_hash_algorithm, created_at, updated_at
) VALUES (
  $1::uuid, $2, $3, $4, $5, $6, $7, $8
)`

	_, err := repository.pool.Exec(ctx, query,
		user.ID.String(),
		user.Username,
		user.UsernameCanonical,
		user.EmailCanonical,
		user.PasswordHash,
		user.PasswordHashAlgorithm,
		user.CreatedAt,
		user.UpdatedAt,
	)
	if isUniqueViolationOn(err, "users_username_canonical_key") {
		return User{}, ErrDuplicateUsername
	}
	if isUniqueViolationOn(err, "users_email_canonical_key") {
		return User{}, ErrDuplicateEmail
	}
	if err != nil {
		return User{}, err
	}

	return user, nil
}

func (repository *Repository) FindUserByUsername(ctx context.Context, usernameCanonical string) (User, error) {
	const query = `
SELECT
  id::text,
  username,
  username_canonical,
  email_canonical,
  password_hash,
  password_hash_algorithm,
  created_at,
  updated_at
FROM users
WHERE username_canonical = $1`

	user, err := scanUser(repository.pool.QueryRow(ctx, query, usernameCanonical))
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	if err != nil {
		return User{}, err
	}
	return user, nil
}

func (repository *Repository) FindUserByEmail(ctx context.Context, emailCanonical string) (User, error) {
	const query = `
SELECT
  id::text,
  username,
  username_canonical,
  email_canonical,
  password_hash,
  password_hash_algorithm,
  created_at,
  updated_at
FROM users
WHERE email_canonical = $1`

	user, err := scanUser(repository.pool.QueryRow(ctx, query, emailCanonical))
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	if err != nil {
		return User{}, err
	}
	return user, nil
}

func (repository *Repository) CreateSession(ctx context.Context, session Session) (Session, error) {
	const query = `
INSERT INTO user_sessions (
  id, user_id, token_hash, created_at, expires_at, revoked_at
) VALUES (
  $1::uuid, $2::uuid, $3, $4, $5, $6
)`

	_, err := repository.pool.Exec(ctx, query,
		session.ID.String(),
		session.UserID.String(),
		session.TokenHash,
		session.CreatedAt,
		session.ExpiresAt,
		session.RevokedAt,
	)
	if err != nil {
		return Session{}, err
	}
	return session, nil
}

func (repository *Repository) FindActiveSession(ctx context.Context, tokenHash []byte, now time.Time) (Session, User, error) {
	const query = `
SELECT
  s.id::text,
  s.user_id::text,
  s.token_hash,
  s.created_at,
  s.expires_at,
  s.revoked_at,
  u.id::text,
  u.username,
  u.username_canonical,
  u.email_canonical,
  u.password_hash,
  u.password_hash_algorithm,
  u.created_at,
  u.updated_at
FROM user_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.token_hash = $1
  AND s.revoked_at IS NULL
  AND s.expires_at > $2`

	session, user, err := scanSessionAndUser(repository.pool.QueryRow(ctx, query, tokenHash, now))
	if errors.Is(err, pgx.ErrNoRows) {
		return Session{}, User{}, ErrNotFound
	}
	if err != nil {
		return Session{}, User{}, err
	}
	return session, user, nil
}

func (repository *Repository) RevokeSession(ctx context.Context, tokenHash []byte, revokedAt time.Time) error {
	const query = `
UPDATE user_sessions
SET revoked_at = $2
WHERE token_hash = $1
  AND revoked_at IS NULL`

	_, err := repository.pool.Exec(ctx, query, tokenHash, revokedAt)
	return err
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanUser(row rowScanner) (User, error) {
	var id string
	var user User
	err := row.Scan(
		&id,
		&user.Username,
		&user.UsernameCanonical,
		&user.EmailCanonical,
		&user.PasswordHash,
		&user.PasswordHashAlgorithm,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return User{}, err
	}

	parsedID, err := uuid.Parse(id)
	if err != nil {
		return User{}, err
	}
	user.ID = parsedID

	return user, nil
}

func scanSessionAndUser(row rowScanner) (Session, User, error) {
	var sessionID string
	var sessionUserID string
	var userID string
	var session Session
	var user User

	err := row.Scan(
		&sessionID,
		&sessionUserID,
		&session.TokenHash,
		&session.CreatedAt,
		&session.ExpiresAt,
		&session.RevokedAt,
		&userID,
		&user.Username,
		&user.UsernameCanonical,
		&user.EmailCanonical,
		&user.PasswordHash,
		&user.PasswordHashAlgorithm,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return Session{}, User{}, err
	}

	parsedSessionID, err := uuid.Parse(sessionID)
	if err != nil {
		return Session{}, User{}, err
	}
	parsedSessionUserID, err := uuid.Parse(sessionUserID)
	if err != nil {
		return Session{}, User{}, err
	}
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return Session{}, User{}, err
	}

	session.ID = parsedSessionID
	session.UserID = parsedSessionUserID
	user.ID = parsedUserID

	return session, user, nil
}

func isUniqueViolationOn(err error, constraintName string) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == constraintName
}
