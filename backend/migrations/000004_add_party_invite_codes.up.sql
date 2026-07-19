ALTER TABLE party_invites
  ADD COLUMN code_hash BYTEA NULL;

ALTER TABLE party_invites
  ADD CONSTRAINT party_invites_code_hash_length_check
  CHECK (code_hash IS NULL OR octet_length(code_hash) = 32);

CREATE UNIQUE INDEX party_invites_code_hash_key
  ON party_invites (code_hash)
  WHERE code_hash IS NOT NULL;
