package auth

import (
	"time"

	"github.com/google/uuid"
)

const PasswordHashAlgorithm = "argon2id"

type User struct {
	ID                    uuid.UUID
	Username              string
	UsernameCanonical     string
	EmailCanonical        string
	PasswordHash          string
	PasswordHashAlgorithm string
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

type Session struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	TokenHash []byte
	CreatedAt time.Time
	ExpiresAt time.Time
	RevokedAt *time.Time
}

type PublicUser struct {
	ID                string `json:"id"`
	UsernameCanonical string `json:"usernameCanonical"`
	Username          string `json:"username"`
}

type sessionResponse struct {
	User PublicUser `json:"user"`
}

func PublicUserFromUser(user User) PublicUser {
	return PublicUser{
		ID:                user.ID.String(),
		UsernameCanonical: user.UsernameCanonical,
		Username:          user.Username,
	}
}
