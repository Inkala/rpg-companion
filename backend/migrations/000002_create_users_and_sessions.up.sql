CREATE TABLE users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL,
  username_canonical TEXT NOT NULL UNIQUE,
  email_canonical TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_hash_algorithm TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CHECK (username_canonical = lower(username_canonical)),
  CHECK (length(username_canonical) BETWEEN 3 AND 32),
  CHECK (username_canonical ~ '^[a-z0-9_-]+$'),
  CHECK (length(username) BETWEEN 3 AND 32),
  CHECK (lower(username) = username_canonical),
  CHECK (position('@' in username_canonical) = 0),
  CHECK (email_canonical = lower(email_canonical)),
  CHECK (length(email_canonical) BETWEEN 3 AND 254),
  CHECK (position('@' in email_canonical) > 1),
  CHECK (password_hash_algorithm = 'argon2id')
);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash BYTEA NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  CHECK (length(token_hash) = 32),
  CHECK (expires_at > created_at)
);

CREATE INDEX user_sessions_user_id_idx ON user_sessions (user_id);
CREATE INDEX user_sessions_active_expiry_idx ON user_sessions (expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE characters
  ADD CONSTRAINT characters_owner_subject_id_fkey
  FOREIGN KEY (owner_subject_id)
  REFERENCES users(id)
  ON DELETE RESTRICT;
