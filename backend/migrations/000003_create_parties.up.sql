CREATE TABLE parties (
  id UUID CONSTRAINT parties_pkey PRIMARY KEY,
  name TEXT NOT NULL,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT parties_name_trimmed_check CHECK (name = btrim(name)),
  CONSTRAINT parties_name_length_check CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT parties_updated_at_order_check CHECK (updated_at >= created_at),
  CONSTRAINT parties_created_by_user_id_fkey
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX parties_created_by_user_id_idx ON parties (created_by_user_id);

CREATE TABLE party_memberships (
  id UUID CONSTRAINT party_memberships_pkey PRIMARY KEY,
  party_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  character_id UUID NULL,
  joined_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT party_memberships_party_id_fkey
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE,
  CONSTRAINT party_memberships_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT party_memberships_character_id_fkey
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE RESTRICT,
  CONSTRAINT party_memberships_party_id_user_id_key UNIQUE (party_id, user_id),
  CONSTRAINT party_memberships_role_check CHECK (role IN ('gm', 'player')),
  CONSTRAINT party_memberships_role_character_check CHECK (
    (role <> 'gm' OR character_id IS NULL)
    AND (role <> 'player' OR character_id IS NOT NULL)
  )
);

CREATE INDEX party_memberships_user_id_idx ON party_memberships (user_id);

CREATE UNIQUE INDEX party_memberships_character_id_key
  ON party_memberships (character_id)
  WHERE character_id IS NOT NULL;

CREATE UNIQUE INDEX party_memberships_one_gm_per_party_idx
  ON party_memberships (party_id)
  WHERE role = 'gm';

CREATE TABLE party_invites (
  id UUID CONSTRAINT party_invites_pkey PRIMARY KEY,
  party_id UUID NOT NULL,
  created_by_user_id UUID NOT NULL,
  token_hash BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  CONSTRAINT party_invites_party_id_fkey
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE,
  CONSTRAINT party_invites_created_by_user_id_fkey
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT party_invites_token_hash_key UNIQUE (token_hash),
  CONSTRAINT party_invites_token_hash_length_check CHECK (octet_length(token_hash) = 32),
  CONSTRAINT party_invites_expiry_order_check CHECK (expires_at > created_at),
  CONSTRAINT party_invites_revocation_order_check CHECK (
    revoked_at IS NULL OR revoked_at >= created_at
  )
);

CREATE UNIQUE INDEX party_invites_one_non_revoked_per_party_idx
  ON party_invites (party_id)
  WHERE revoked_at IS NULL;
